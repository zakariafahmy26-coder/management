process.env.DISABLE_HMR = 'true';

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import nodemailer from 'nodemailer';
import {
  generateDailyEmailHtml,
  generateDailyEmailPlainText,
  DailyReportDataPayload,
} from './src/services/dailyEmailTemplate';
import { initFirebaseAdmin, getAdminDb, hasAdminServiceAccount } from './server/firebaseAdmin';
import {
  requireAuth,
  requirePermission,
  requireRole,
  requireCompanyAccess,
  logAuditEvent,
  invalidateUserProfileCache,
} from './server/middleware/authMiddleware';
import {
  aiChatSchema,
  aiCopilotSchema,
  scanReceiptSchema,
  emailConfigSchema,
  testEmailSchema,
  sendDailyReportSchema,
  userRoleUpdateSchema,
  userProfileUpdateSchema,
  userCreateSchema,
  migrationRunSchema,
  automationExecuteSchema,
} from './server/validation/schemas';
import { normalizeRole } from './src/auth/rbac';
import { automationEngine } from './server/automation/automationEngine';
import { automationScheduler } from './server/automation/automationScheduler';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin SDK & start background Automation Scheduler
  try {
    initFirebaseAdmin();
    console.log('✅ Firebase Admin SDK initialized successfully in server.');
    automationScheduler.start();
  } catch (initErr) {
    console.warn('⚠️ Notice initializing Firebase Admin / Scheduler:', initErr);
  }

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Helper response wrapper for Section 20: Standardized API response format
  function sendSuccess(res: Response, data: any, status: number = 200) {
    return res.status(status).json({
      success: true,
      data,
    });
  }

  function sendError(res: Response, code: string, message: string, status: number = 400) {
    return res.status(status).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  }

  // Lazy initialization of GoogleGenAI
  let aiClient: GoogleGenAI | null = null;
  function getAI(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('مفتاح GEMINI_API_KEY غير متوفر في بيئة العمل');
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiClient;
  }

  async function generateContentWithFallback(params: {
    model?: string;
    contents: any;
    config?: any;
  }) {
    const ai = getAI();
    const primary = params.model || 'gemini-3.8-flash';
    const candidateModels = Array.from(
      new Set([primary, 'gemini-3.1-flash-lite', 'gemini-flash-latest'])
    );

    let lastError: any = null;
    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      try {
        const modelConfig = {
          ...(params.config || {}),
          ...(model.startsWith('gemini-3') && !params.config?.thinkingConfig
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
        };

        const res = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: modelConfig,
        });
        return res;
      } catch (err: any) {
        lastError = err;
      }
    }
    throw lastError || new Error('فشلت جميع نماذج الذكاء الاصطناعي في الاستجابة حالياً، يرجى إعادة المحاولة');
  }

  // Company-scoped state maps to guarantee strict multi-tenant data isolation
  interface CompanyEmailConfig {
    dailyReportEnabled: boolean;
    recipientEmails: string[];
    sendTime: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    status: string;
    lastSentDate?: string;
    lastSentAt?: string;
  }

  const companyFleetSnapshots = new Map<string, DailyReportDataPayload>();
  const companyEmailConfigs = new Map<string, CompanyEmailConfig>();

  function getDefaultEmailConfig(): CompanyEmailConfig {
    const defaultRecipient = process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER || 'operations@company.local';
    return {
      dailyReportEnabled: false,
      recipientEmails: [defaultRecipient],
      sendTime: '17:00',
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
      status: 'active',
    };
  }

  async function getCompanyEmailConfig(companyId: string): Promise<CompanyEmailConfig> {
    if (hasAdminServiceAccount()) {
      try {
        const db = getAdminDb();
        const docSnap = await db
          .collection('companies')
          .doc(companyId)
          .collection('settings')
          .doc('email')
          .get();
        if (docSnap.exists) {
          const data = docSnap.data() as CompanyEmailConfig;
          companyEmailConfigs.set(companyId, data);
          return data;
        }
      } catch (_) {}
    }
    if (!companyEmailConfigs.has(companyId)) {
      companyEmailConfigs.set(companyId, getDefaultEmailConfig());
    }
    return companyEmailConfigs.get(companyId)!;
  }

  // Helper: Authoritatively load company fleet context server-side with strict tenant isolation
  async function loadCompanyFleetContext(companyId: string) {
    let vehicles: any[] = [];
    let drivers: any[] = [];
    let tasks: any[] = [];
    let maintenance: any[] = [];

    if (hasAdminServiceAccount()) {
      try {
        const db = getAdminDb();
        const companyRef = db.collection('companies').doc(companyId);

        const [vehiclesSnap, driversSnap, tasksSnap, maintSnap] = await Promise.all([
          companyRef.collection('vehicles').limit(30).get().catch(() => ({ docs: [] } as any)),
          companyRef.collection('drivers').limit(30).get().catch(() => ({ docs: [] } as any)),
          companyRef.collection('tasks').limit(30).get().catch(() => ({ docs: [] } as any)),
          companyRef.collection('maintenance').limit(20).get().catch(() => ({ docs: [] } as any)),
        ]);

        vehicles = vehiclesSnap.docs.map((d: any) => d.data());
        drivers = driversSnap.docs.map((d: any) => d.data());
        tasks = tasksSnap.docs.map((d: any) => d.data());
        maintenance = maintSnap.docs.map((d: any) => d.data());
      } catch (_) {}
    }

    // Fall back to verified company-scoped snapshot if database documents are not yet populated
    if (vehicles.length === 0 && companyFleetSnapshots.has(companyId)) {
      const snap = companyFleetSnapshots.get(companyId)!;
      vehicles = snap.vehicles || [];
      drivers = snap.drivers || [];
      maintenance = snap.maintenance || [];
    }

    // Calculate real operational statistics isolated strictly to companyId
    const delayedTasks = tasks.filter((t: any) => t.status === 'DELAYED');
    const inProgressTasks = tasks.filter((t: any) => t.status === 'IN_PROGRESS');
    const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED');
    const urgentOilVehicles = vehicles.filter((v: any) => {
      const next = Number(v.nextOilChangeKm || 0);
      const cur = Number(v.currentOdometer || 0);
      return next > 0 && next - cur <= 500;
    });

    return {
      companyId,
      summary: {
        totalVehicles: vehicles.length,
        totalDrivers: drivers.length,
        totalTasks: tasks.length,
        delayedTasksCount: delayedTasks.length,
        inProgressTasksCount: inProgressTasks.length,
        completedTasksCount: completedTasks.length,
        urgentOilCount: urgentOilVehicles.length,
      },
      vehicles: vehicles.slice(0, 10).map((v: any) => ({
        plate: v.plateNumber || v.plate,
        model: v.model,
        odometer: v.currentOdometer || v.odometer,
        nextOilKm: v.nextOilChangeKm,
        status: v.status,
      })),
      drivers: drivers.slice(0, 10).map((d: any) => ({
        code: d.code,
        name: d.name,
        phone: d.phone,
        status: d.status,
      })),
      delayedTasks: delayedTasks.slice(0, 5).map((t: any) => ({
        code: t.code,
        title: t.title,
        priority: t.priority,
      })),
    };
  }

  // =========================================================================
  // 1. PUBLIC ROUTES (Health & Source Export)
  // =========================================================================

  app.get('/api/health', (req, res) => {
    sendSuccess(res, {
      status: 'ok',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
      architecture: 'enterprise_multitenant_firestore',
    });
  });

  app.get('/api/download-zip', (req, res) => {
    const outputPath = path.join('/tmp', `fleetops-project-${Date.now()}.zip`);
    const scriptPath = path.join(process.cwd(), 'scripts', 'export_zip.py');

    execFile('python3', [scriptPath, outputPath, process.cwd()], (error, stdout, stderr) => {
      if (error || !fs.existsSync(outputPath)) {
        console.error('Error creating zip:', error, stderr);
        return sendError(res, 'ZIP_FAILED', 'فشل في إنشاء ملف المشروع المضغوط', 500);
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="fleetops-project.zip"');
      res.download(outputPath, 'fleetops-project.zip', (downloadErr) => {
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch (e) {}
      });
    });
  });

  // Upload ZIP archive endpoint (supporting raw binary up to 100MB and JSON base64)
  app.post(
    '/api/upload-zip',
    express.raw({
      type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
      limit: '100mb',
    }),
    async (req: Request, res: Response) => {
      try {
        let buffer: Buffer | null = null;
        let originalName = 'uploaded-archive.zip';
        let uploadType = 'general';

        if (Buffer.isBuffer(req.body) && req.body.length > 0) {
          buffer = req.body;
          const headerName = req.headers['x-file-name'];
          if (typeof headerName === 'string') {
            try {
              originalName = decodeURIComponent(headerName);
            } catch (e) {
              originalName = headerName;
            }
          }
          if (typeof req.headers['x-upload-type'] === 'string') {
            uploadType = req.headers['x-upload-type'];
          }
        } else if (req.body && req.body.fileData) {
          buffer = Buffer.from(req.body.fileData, 'base64');
          if (req.body.fileName) originalName = req.body.fileName;
          if (req.body.uploadType) uploadType = req.body.uploadType;
        }

        if (!buffer || buffer.length === 0) {
          return sendError(res, 'BAD_REQUEST', 'لم يتم استلام أي محتوى لملف الـ ZIP', 400);
        }

        // Validate ZIP magic bytes (PK\x03\x04 or PK\x05\x06 or PK\x07\x08)
        if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
          return sendError(res, 'INVALID_ZIP', 'الملف المرسل ليس ملف ZIP صالحاً (توقيع PK مفقود)', 400);
        }

        const uploadDir = path.join(process.cwd(), 'uploads', 'archives');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const safeBaseName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
        const archiveId = `zip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const savedFileName = `${archiveId}_${safeBaseName}`;
        const targetFilePath = path.join(uploadDir, savedFileName);

        fs.writeFileSync(targetFilePath, buffer);

        // Inspect content using JSZip
        const zip = await JSZip.loadAsync(buffer);
        const entries: Array<{
          path: string;
          name: string;
          isDirectory: boolean;
          date?: string;
          category?: string;
        }> = [];

        let codeFiles = 0;
        let docFiles = 0;
        let dataFiles = 0;
        let imageFiles = 0;

        zip.forEach((relPath, zipEntry) => {
          if (relPath.includes('__MACOSX') || relPath.endsWith('.DS_Store')) return;
          const isDir = zipEntry.dir;
          const name = relPath.split('/').filter(Boolean).pop() || relPath;
          const ext = isDir ? '' : name.split('.').pop()?.toLowerCase() || '';

          if (!isDir) {
            if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'html', 'css'].includes(ext)) codeFiles++;
            if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) docFiles++;
            if (['xlsx', 'xls', 'csv', 'sqlite', 'db'].includes(ext)) dataFiles++;
            if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) imageFiles++;
          }

          entries.push({
            path: relPath,
            name,
            isDirectory: isDir,
            date: zipEntry.date ? zipEntry.date.toISOString() : undefined,
          });
        });

        let detectedType = 'mixed_archive';
        if (codeFiles > 5) detectedType = 'source_code';
        else if (dataFiles > 0 || entries.some((e) => e.path.toLowerCase().includes('fleet') || e.path.toLowerCase().includes('backup'))) {
          detectedType = 'fleet_backup';
        } else if (docFiles > 0 || imageFiles > 0) {
          detectedType = 'documents_archive';
        }

        sendSuccess(res, {
          message: 'تم رفع وتأكيد ملف الـ ZIP بنجاح',
          archiveId,
          fileName: originalName,
          savedFileName,
          fileSize: buffer.length,
          totalFiles: entries.filter((e) => !e.isDirectory).length,
          totalDirectories: entries.filter((e) => e.isDirectory).length,
          entries: entries.slice(0, 150),
          detectedType,
          downloadUrl: `/api/uploaded-zips/${savedFileName}`,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error('Error handling zip upload:', err);
        sendError(res, 'ZIP_PROCESSING_FAILED', `فشل معالجة ملف الـ ZIP: ${err.message || err}`, 500);
      }
    }
  );

  // List previously uploaded ZIP archives
  app.get('/api/uploaded-zips', (req: Request, res: Response) => {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads', 'archives');
      if (!fs.existsSync(uploadDir)) {
        return sendSuccess(res, { archives: [] });
      }

      const files = fs.readdirSync(uploadDir);
      const archives = files
        .filter((f) => f.endsWith('.zip') || f.includes('.zip'))
        .map((f) => {
          const stats = fs.statSync(path.join(uploadDir, f));
          return {
            fileName: f,
            fileSize: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            downloadUrl: `/api/uploaded-zips/${f}`,
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      sendSuccess(res, { archives });
    } catch (err: any) {
      sendError(res, 'LIST_FAILED', 'تعذر قراءة قائمة الملفات المضغوطة المرفوعة', 500);
    }
  });

  // Download a previously uploaded ZIP archive
  app.get('/api/uploaded-zips/:filename', (req: Request, res: Response) => {
    try {
      const filename = path.basename(req.params.filename);
      const filePath = path.join(process.cwd(), 'uploads', 'archives', filename);

      if (!fs.existsSync(filePath)) {
        return sendError(res, 'NOT_FOUND', 'ملف الأرشيف غير موجود', 404);
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath);
    } catch (err: any) {
      sendError(res, 'SERVE_FAILED', 'تعذر تحميل الملف', 500);
    }
  });

  // Delete a previously uploaded ZIP archive
  app.delete('/api/uploaded-zips/:filename', (req: Request, res: Response) => {
    try {
      const filename = path.basename(req.params.filename);
      const filePath = path.join(process.cwd(), 'uploads', 'archives', filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      sendSuccess(res, { message: 'تم حذف ملف الأرشيف بنجاح' });
    } catch (err: any) {
      sendError(res, 'DELETE_FAILED', 'تعذر حذف الملف', 500);
    }
  });

  // =========================================================================
  // 2. AUTOMATION ENGINE ROUTES (Section 11-17)
  // =========================================================================

  // Trigger an automation event (e.g. TASK_COMPLETED, TASK_DELAYED, etc.)
  app.post(
    '/api/automation/trigger',
    requireAuth,
    requireCompanyAccess,
    requirePermission('automation.execute'),
    async (req, res) => {
      try {
        const { trigger, entityId, entityType, data } = req.body;
        if (!trigger) {
          return sendError(res, 'BAD_REQUEST', 'نوع المشغل (trigger) مطلوب');
        }

        const companyId = req.companyId || 'company-01';
        const results = await automationEngine.processEvent({
          companyId,
          trigger,
          triggeredBy: req.user?.uid || 'user',
          eventTimestamp: new Date().toISOString(),
          entityId,
          entityType,
          data,
        });

        sendSuccess(res, {
          executedRulesCount: results.length,
          results,
        });
      } catch (err: any) {
        console.error('Automation trigger error:', err);
        sendError(res, 'AUTOMATION_ERROR', err.message || 'فشل تشغيل محرك الأتمتة', 500);
      }
    }
  );

  // Execute or test a specific rule manually
  app.post(
    '/api/automation/execute-rule',
    requireAuth,
    requireCompanyAccess,
    requirePermission('automation.execute'),
    async (req, res) => {
      try {
        const { ruleId, contextData } = req.body;
        if (!ruleId) {
          return sendError(res, 'BAD_REQUEST', 'معرف القاعدة (ruleId) مطلوب');
        }

        const companyId = req.companyId || 'company-01';
        const db = getAdminDb();
        const ruleDoc = await db
          .collection('companies')
          .doc(companyId)
          .collection('automationRules')
          .doc(ruleId)
          .get();

        if (!ruleDoc.exists) {
          return sendError(res, 'NOT_FOUND', 'لم يتم العثور على قاعدة الأتمتة المحددة', 404);
        }

        const rule = ruleDoc.data() as any;
        const result = await automationEngine.executeRule(
          rule,
          {
            companyId,
            trigger: rule.trigger,
            triggeredBy: req.user?.uid || 'user',
            eventTimestamp: new Date().toISOString(),
            data: contextData || {},
          },
          true // manual test bypasses conditions
        );

        sendSuccess(res, { result });
      } catch (err: any) {
        console.error('Manual rule execution error:', err);
        sendError(res, 'RULE_EXECUTION_ERROR', err.message || 'فشل تنفيذ القاعدة', 500);
      }
    }
  );

  // Trigger or test the scheduled monthly report to all registered managers
  app.post(
    '/api/automation/trigger-monthly-report',
    requireAuth,
    requireCompanyAccess,
    requirePermission('automation.execute'),
    async (req, res) => {
      try {
        const companyId = req.companyId || 'company-01';
        await automationScheduler.ensureMonthlyReportRule(companyId);

        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const results = await automationEngine.processEvent({
          companyId,
          trigger: 'MONTHLY_SCHEDULE',
          triggeredBy: req.user?.uid || 'user_manual',
          eventTimestamp: now.toISOString(),
          entityType: 'schedule',
          data: {
            manualTrigger: true,
            monthKey,
            target: 'ALL_MANAGERS',
            title: `تشغيل فوري للتقرير الشهري للمديرين (${monthKey})`,
          },
        });

        sendSuccess(res, {
          message: 'تم تشغيل جدولة التقرير الشهري وإرساله بنجاح لجميع المديرين المسجلين عبر محرك الأتمتة المدمج',
          executedRulesCount: results.length,
          results,
        });
      } catch (err: any) {
        console.error('Trigger monthly report error:', err);
        sendError(res, 'MONTHLY_REPORT_ERROR', err.message || 'فشل تشغيل التقرير الشهري', 500);
      }
    }
  );

  // Get recent automation execution logs
  app.get(
    '/api/automation/executions',
    requireAuth,
    requireCompanyAccess,
    requirePermission('automation.view'),
    async (req, res) => {
      try {
        const companyId = req.companyId || 'company-01';
        const db = getAdminDb();
        const execsSnap = await db
          .collection('companies')
          .doc(companyId)
          .collection('automationExecutions')
          .orderBy('executionTime', 'desc')
          .limit(50)
          .get();

        const executions = execsSnap.docs.map((d) => d.data());
        sendSuccess(res, { executions });
      } catch (err: any) {
        console.error('Fetch executions error:', err);
        sendError(res, 'FETCH_FAILED', err.message || 'فشل جلب سجلات الأتمتة', 500);
      }
    }
  );

  // Retry a failed or partial automation execution
  app.post(
    '/api/automation/retry-execution',
    requireAuth,
    requireCompanyAccess,
    requirePermission('automation.execute'),
    async (req, res) => {
      try {
        const { executionId } = req.body;
        if (!executionId || typeof executionId !== 'string') {
          return sendError(res, 'BAD_REQUEST', 'معرف سجل التنفيذ (executionId) مطلوب');
        }

        const companyId = req.companyId || 'company-01';
        const userId = req.user?.uid || 'user';

        const result = await automationEngine.retryExecution(executionId, companyId, userId);
        sendSuccess(res, { result });
      } catch (err: any) {
        console.error('Retry execution error:', err);
        sendError(res, 'RETRY_FAILED', err.message || 'فشل إعادة محاولة التنفيذ', 500);
      }
    }
  );

  // =========================================================================
  // DATA MIGRATION ENGINE (Section 5: Legacy Firestore migration to tenant subcollections)
  // Strictly restricted to SUPER_ADMIN with dry-run support and idempotency
  // =========================================================================

  app.post(
    '/api/migration/run',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    async (req, res) => {
      try {
        const parseResult = migrationRunSchema.safeParse(req.body);
        if (!parseResult.success) {
          return sendError(res, 'VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'بيانات غير صالحة', 400);
        }

        const { dryRun = false, targetCompanyId = 'company-01' } = parseResult.data;
        const caller = req.user!;

        if (!hasAdminServiceAccount()) {
          return sendError(res, 'CONFIG_ERROR', 'خادم Firebase Admin غير مهيأ لتنفيذ عملية الترحيل', 500);
        }

        const db = getAdminDb();
        const legacyCollections = [
          'vehicles',
          'drivers',
          'tasks',
          'trips',
          'maintenance',
          'fuel',
          'expenses',
          'locations',
          'regions',
          'areas',
          'branches',
          'notifications',
          'fleet_notifications',
        ];

        const report: {
          timestamp: string;
          dryRun: boolean;
          targetCompanyId: string;
          totalProcessed: number;
          migratedCount: number;
          skippedCount: number;
          errorCount: number;
          details: Record<string, { total: number; migrated: string[]; skipped: string[]; errors: string[] }>;
        } = {
          timestamp: new Date().toISOString(),
          dryRun,
          targetCompanyId,
          totalProcessed: 0,
          migratedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          details: {},
        };

        for (const colName of legacyCollections) {
          report.details[colName] = { total: 0, migrated: [], skipped: [], errors: [] };
          try {
            const snap = await db.collection(colName).get();
            report.details[colName].total = snap.size;
            report.totalProcessed += snap.size;

            for (const doc of snap.docs) {
              const docId = doc.id;
              const data = doc.data() || {};
              const effectiveCompanyId = (data.companyId && typeof data.companyId === 'string' && data.companyId.trim())
                ? data.companyId.trim()
                : targetCompanyId;

              let targetColName = colName;
              if (colName === 'vehicle_documents') targetColName = 'vehicleDocuments';
              if (colName === 'fleet_notifications') targetColName = 'notifications';

              const destRef = db
                .collection('companies')
                .doc(effectiveCompanyId)
                .collection(targetColName)
                .doc(docId);

              // Check if destination document already exists
              const destDoc = await destRef.get();
              if (destDoc.exists) {
                const destData = destDoc.data() || {};
                const legacyUpdatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
                const destUpdatedAt = destData.updatedAt ? new Date(destData.updatedAt).getTime() : 0;

                // Idempotency rule: Do not overwrite newer tenant documents
                if (destUpdatedAt >= legacyUpdatedAt && destUpdatedAt > 0) {
                  report.details[colName].skipped.push(docId);
                  report.skippedCount++;
                  continue;
                }
              }

              if (!dryRun) {
                const payload = {
                  ...data,
                  companyId: effectiveCompanyId,
                  _migratedAt: new Date().toISOString(),
                  _migratedFrom: `legacy/${colName}/${docId}`,
                };
                await destRef.set(payload, { merge: true });
              }

              report.details[colName].migrated.push(docId);
              report.migratedCount++;
            }
          } catch (colErr: any) {
            console.error(`Migration error in ${colName}:`, colErr);
            report.details[colName].errors.push(colErr.message || 'Error processing collection');
            report.errorCount++;
          }
        }

        // Save migration audit record
        if (!dryRun) {
          try {
            await db
              .collection('companies')
              .doc(targetCompanyId)
              .collection('migration')
              .doc('latest')
              .set(report);
          } catch (_) {}
        }

        await logAuditEvent({
          companyId: targetCompanyId,
          userId: caller.uid,
          userEmail: caller.email,
          action: dryRun ? 'MIGRATION_DRY_RUN' : 'MIGRATION_EXECUTED',
          resource: `companies/${targetCompanyId}`,
          details: {
            migratedCount: report.migratedCount,
            skippedCount: report.skippedCount,
            totalProcessed: report.totalProcessed,
            dryRun,
          },
          status: 'SUCCESS',
        });

        sendSuccess(res, {
          message: dryRun ? 'تم فحص جاهزية الترحيل بنجاح (وضع التجربة - Dry Run)' : 'تم إتمام عملية ترحيل البيانات بنجاح إلى هياكل الشركات المعزولة',
          report,
        });
      } catch (err: any) {
        console.error('Data migration fatal error:', err);
        sendError(res, 'MIGRATION_FAILED', err.message || 'فشلت عملية ترحيل البيانات', 500);
      }
    }
  );

  // Check latest migration status
  app.get(
    '/api/migration/status',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    async (req, res) => {
      try {
        const companyId = (req.query.companyId as string) || 'company-01';
        if (!hasAdminServiceAccount()) {
          return sendSuccess(res, { status: 'idle', message: 'خادم Firebase Admin غير مهيأ' });
        }

        const db = getAdminDb();
        const doc = await db.collection('companies').doc(companyId).collection('migration').doc('latest').get();
        if (!doc.exists) {
          return sendSuccess(res, { status: 'not_run', message: 'لم يتم إجراء ترحيل سابق لهذه الشركة' });
        }

        sendSuccess(res, { status: 'completed', report: doc.data() });
      } catch (err: any) {
        sendError(res, 'STATUS_CHECK_FAILED', err.message, 500);
      }
    }
  );

  // =========================================================================
  // 3. AI FLEET COPILOT & INTELLIGENCE (Section 18)
  // Protected with requireAuth, requireCompanyAccess, and requirePermission('ai.use')
  // Server authoritatively loads fleet data from Firestore!
  // =========================================================================

  app.post(
    '/api/ai/chat',
    requireAuth,
    requireCompanyAccess,
    requirePermission('ai.use'),
    async (req, res) => {
      try {
        const parseResult = aiChatSchema.safeParse(req.body);
        if (!parseResult.success) {
          return sendError(res, 'VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'بيانات غير صالحة', 400);
        }
        const { message, conversationId = 'default', history = [] } = parseResult.data;

        const companyId = req.companyId || 'company-01';

        // Server-side authoritative data injection (Rule 18.3, 18.4, 18.7)
        const companyContext = await loadCompanyFleetContext(companyId);

        const systemInstruction = `أنت "المساعد الذكي لأسطول FleetOps Intelligence" (AI Fleet Copilot).
البيئة: مصنع صناعي وسلاسل إمداد تخدم أقاليم ومحاور (الإسكندرية، الساحل الشمالي، البحيرة).
قواعد صارمة (Section 18.10):
1. الحقائق (Facts): استند حصرياً إلى بيانات الأسطول الحقيقية المرفقة أدناه، ولا تخترع أية أرقام أو مركبات غير موجودة.
2. الحسابات (Calculations): قم بالعمليات الحسابية بدقة متناهية.
3. التوقعات (Predictions): اذكر دائماً إخلاء مسؤولية توضيحي عند التوقع.
4. التوصيات (Recommendations): قدم حلولاً تشغيلية واضحة وملموسة لترشيد الوقود، تفادي رسوم الطرق، وجدولة الصيانة.

بيانات الأسطول الحقيقية المعتمدة للشركة (${companyId}):
${JSON.stringify(companyContext, null, 2)}`;

        const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

        if (Array.isArray(history) && history.length > 0) {
          for (const item of history.slice(-6)) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: String(item.content || item.text || '') }],
            });
          }
        }

        contents.push({
          role: 'user',
          parts: [{ text: String(message) }],
        });

        const response = await generateContentWithFallback({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.5,
          },
        });

        const reply = response.text || 'لم يتم استخراج رد من النموذج.';

        // Log AI conversation to Firestore (Section 18.9)
        try {
          const db = getAdminDb();
          const convRef = db
            .collection('companies')
            .doc(companyId)
            .collection('aiConversations')
            .doc(conversationId);

          const msgId = `msg_${Date.now()}`;
          await convRef.collection('messages').doc(msgId).set({
            id: msgId,
            userId: req.user?.uid,
            query: message,
            reply,
            timestamp: new Date().toISOString(),
          });
        } catch (logErr) {
          console.warn('AI conversation logging notice:', logErr);
        }

        sendSuccess(res, {
          reply,
          conversationId,
        });
      } catch (error: any) {
        console.warn('Gemini Chat Notice:', error?.message || error);
        sendError(res, 'AI_CHAT_ERROR', error.message || 'حدث خطأ أثناء معالجة المحادثة بالذكاء الاصطناعي', 500);
      }
    }
  );

  // Dedicated Copilot Route
  app.post(
    '/api/ai/copilot',
    requireAuth,
    requireCompanyAccess,
    requirePermission('ai.use'),
    async (req, res) => {
      try {
        const parseResult = aiCopilotSchema.safeParse(req.body);
        if (!parseResult.success) {
          return sendError(res, 'VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'بيانات غير صالحة', 400);
        }
        const { query: userQuery, conversationHistory = [] } = parseResult.data;

        const companyId = req.companyId || 'company-01';
        // Server-side authoritative fleet context loading strictly isolated to companyId
        const fleetContext = await loadCompanyFleetContext(companyId);

        const prompt = `أنت المستشار الذكي والعملياتي لأسطول النقل وإدارة العمليات اللوجستية في مصانع مصر.
البيانات الحقيقية المعتمدة حصرياً للشركة (${companyId}):
${JSON.stringify(fleetContext, null, 2)}

استفسار المستخدم المصرح له:
${userQuery}`;

        const response = await generateContentWithFallback({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        sendSuccess(res, {
          reply: response.text || 'لا تتوفر إجابة حالياً.',
        });
      } catch (err: any) {
        sendError(res, 'COPILOT_ERROR', err.message || 'فشل تشغيل المساعد التشغيلي', 500);
      }
    }
  );

  // AI Receipt & Invoice OCR Scanner
  app.post(
    '/api/ai/scan-receipt',
    requireAuth,
    requirePermission('ai.use'),
    async (req, res) => {
      try {
        const parseResult = scanReceiptSchema.safeParse(req.body);
        if (!parseResult.success) {
          return sendError(res, 'VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'بيانات غير صالحة', 400);
        }
        const { imageBase64, mimeType = 'image/jpeg' } = parseResult.data;

        const cleanedBase64 = String(imageBase64).replace(/^data:image\/[a-zA-Z]+;base64,/, '');

        const prompt = `حلل صورة إيصال الوقود أو فاتورة الصيانة المرفقة لأسطول سيارات المصنع بدقة بالغة.
استخرج الحقول التالية حصراً بتنسيق JSON:
{
  "date": "YYYY-MM-DD (تاريخ الإيصال)",
  "stationOrWorkshop": "اسم محطة الوقود (مثل وطنية، مصر للبترول، طاقة، شل، موبيل) أو اسم مركز/ورشة الصيانة",
  "vehiclePlate": "رقم أو حروف لوحة السيارة إن وجدت بالإيصال، وإلا اتركه فارغاً",
  "fuelType": "نوع الوقود (سولار / بنزين 92 / بنزين 95 / زيت ومصنعية)",
  "liters": 0.0,
  "pricePerLiter": 0.0,
  "totalCost": 0.0,
  "receiptNumber": "رقم الفاتورة أو الإيصال إن وجد",
  "category": "وقود أو صيانة",
  "notes": "أي تفاصيل أو ملاحظات مثل قراءة العداد أو رقم المضخة",
  "confidence": "نسبة مئوية مثل 95%"
}

أعد كائن JSON فقط بدون نصوص إضافية.`;

        const response = await generateContentWithFallback({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanedBase64,
                  mimeType,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });

        let parsed = {};
        try {
          parsed = JSON.parse(response.text || '{}');
        } catch (err) {
          console.warn('Failed to parse JSON response:', response.text);
        }

        sendSuccess(res, {
          receiptData: parsed,
          rawText: response.text,
        });
      } catch (error: any) {
        console.warn('Receipt OCR Notice:', error?.message || error);
        sendError(res, 'OCR_ERROR', error.message || 'فشل قراءة الإيصال بالذكاء الاصطناعي', 500);
      }
    }
  );

  // AI Strategic Fleet Insights
  app.post(
    '/api/ai/fleet-insights',
    requireAuth,
    requireCompanyAccess,
    requirePermission('ai.use'),
    async (req, res) => {
      try {
        const companyId = req.companyId || 'company-01';
        const fleetContext = await loadCompanyFleetContext(companyId);

        const prompt = `قم بإجراء فحص استراتيجي ذكي وشامل لحالة أسطول سيارات المصنع بمناطق (الإسكندرية، الساحل الشمالي، والبحيرة).
بيانات الأسطول الحقيقية المعتمدة:
${JSON.stringify(fleetContext, null, 2)}

أعد تقريراً استراتيجياً باللغة العربية الفصحى منظم كالتالي:
1. ⚠️ **التنبيهات العاجلة للأمان والسلامة**: (سيارات تجاوزت أو اقتربت جداً من تغيير الزيت، رخص شارفت على الانتهاء).
2. ⛽ **تحليل كفاءة استهلاك الوقود والتكاليف**: (تقييم التكلفة لكل كيلومتر وفرص التوفير في خطوط الساحل والبحيرة والإسكندرية).
3. 🚚 **توصيات توزيع الشاحنات وجدولة السائقين**: (أفكار ذكية لدمج الرحلات وتقليل رحلات العودة الفارغة).
4. 🛠️ **خطة العمل الاستباقية المقترحة لهذا الأسبوع**.`;

        const response = await generateContentWithFallback({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: 'أنت خبير استشاري أول في إدارة سلاسل الإمداد وأساطيل النقل الثقيل والمتوسط في مصر.',
          },
        });

        sendSuccess(res, {
          insights: response.text || 'لا توجد توصيات متاحة حالياً.',
        });
      } catch (error: any) {
        sendError(res, 'INSIGHTS_ERROR', error.message || 'فشل توليد التوصيات الذكية', 500);
      }
    }
  );

  // AI Executive Monthly Report Generator
  app.post(
    '/api/ai/executive-report',
    requireAuth,
    requireCompanyAccess,
    requirePermission('ai.use'),
    async (req, res) => {
      try {
        const companyId = req.companyId || 'company-01';
        const fleetContext = await loadCompanyFleetContext(companyId);

        const prompt = `اكتب تقريراً تحليلياً تنفيذياً رفيع المستوى موجهاً لمجلس إدارة ومسؤولي المصنع باللغة العربية، بناءً على مؤشرات أسطول الشركة (${companyId}):
${JSON.stringify(fleetContext, null, 2)}

المحاور المطلوبة:
- **المؤشرات القياسية العامة**: قراءة تحليلية لحجم العمل (عدد المهام، سيارات الأسطول، التوزيع التشغيلي).
- **التحليل الجغرافي**: كفاءة وتكلفة التشغيل في قطاعات الإسكندرية والساحل الشمالي والبحيرة.
- **كفاءة سيارات الأسطول**: تمييز المركبات الأكثر كفاءة وملاحظات الصيانة الوقائية العاجلة.
- **خطة ترشيد النفقات**: 3 خطوات محددة وملموسة لتقليل تكاليف الوقود ورسوم الطرق والصيانة للشهر القادم بنسبة 10-15%.`;

        const response = await generateContentWithFallback({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        sendSuccess(res, {
          report: response.text || '',
        });
      } catch (error: any) {
        sendError(res, 'EXECUTIVE_REPORT_ERROR', error.message || 'فشل توليد التقرير التنفيذي', 500);
      }
    }
  );

  // =========================================================================
  // USER MANAGEMENT & SECURE RBAC ADMINISTRATION
  // Strictly validated via Zod, company-isolated, and audit-logged
  // =========================================================================

  // Update user role and status
  app.post(
    '/api/users/update-role',
    requireAuth,
    requireCompanyAccess,
    requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']),
    requirePermission('users.manage'),
    async (req, res) => {
      try {
        const parseResult = userRoleUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
          return sendError(res, 'VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'بيانات غير صالحة', 400);
        }

        const { targetUserId, role: requestedRole, status, customPermissions } = parseResult.data;
        const normalizedRole = normalizeRole(requestedRole);
        const caller = req.user!;
        const callerCompanyId = req.companyId || caller.companyId;

        if (!hasAdminServiceAccount()) {
          return sendError(res, 'CONFIG_ERROR', 'خادم Firebase Admin غير مهيأ لإجراء التعديلات الإدارية', 500);
        }

        const db = getAdminDb();
        const targetDocRef = db.collection('users').doc(targetUserId);
        const targetDoc = await targetDocRef.get();

        if (!targetDoc.exists) {
          return sendError(res, 'USER_NOT_FOUND', 'المستخدم غير موجود', 404);
        }

        const targetData = targetDoc.data() || {};
        const targetCompanyId = targetData.companyId;

        // Strict RBAC Tenant & Privilege Escalation Checks
        if (caller.role !== 'SUPER_ADMIN') {
          // Company Admin can only manage users within their own company
          if (targetCompanyId && targetCompanyId !== callerCompanyId) {
            await logAuditEvent({
              companyId: callerCompanyId,
              userId: caller.uid,
              userEmail: caller.email,
              action: 'USER_ROLE_UPDATE_BLOCKED',
              resource: `users/${targetUserId}`,
              details: { reason: 'Cross-tenant role update attempt', targetCompanyId },
              status: 'BLOCKED',
            });
            return sendError(res, 'FORBIDDEN', 'غير مصرح لك بتعديل مستخدم ينتمي لشركة أخرى', 403);
          }

          // Company Admin CANNOT promote anyone to SUPER_ADMIN
          if (normalizedRole === 'SUPER_ADMIN') {
            await logAuditEvent({
              companyId: callerCompanyId,
              userId: caller.uid,
              userEmail: caller.email,
              action: 'PRIVILEGE_ESCALATION_BLOCKED',
              resource: `users/${targetUserId}`,
              details: { reason: 'Attempt to grant SUPER_ADMIN role' },
              status: 'BLOCKED',
            });
            return sendError(res, 'FORBIDDEN', 'لا يمكن لمدير الشركة ترقية حساب إلى رتبة مدير عام النظام (SUPER_ADMIN)', 403);
          }

          // Company Admin cannot modify an existing SUPER_ADMIN
          if (targetData.role === 'SUPER_ADMIN' || targetData.isSuperAdmin === true) {
            return sendError(res, 'FORBIDDEN', 'لا يمكن لمدير الشركة تعديل حساب مدير عام النظام', 403);
          }
        }

        // Prevent demoting the last active SUPER_ADMIN
        if (targetUserId === caller.uid && caller.role === 'SUPER_ADMIN' && normalizedRole !== 'SUPER_ADMIN') {
          return sendError(res, 'FORBIDDEN', 'لا يمكنك تخفيض صلاحيات حسابك كمدير عام للنظام بنفسك لمنع الإغلاق العرضي', 400);
        }

        const updateData: any = {
          role: normalizedRole,
          updatedAt: new Date().toISOString(),
          updatedBy: caller.uid,
        };

        if (status) {
          updateData.status = status;
        }

        if (customPermissions !== undefined) {
          updateData.customPermissions = customPermissions;
        }

        if (normalizedRole === 'SUPER_ADMIN') {
          updateData.isSuperAdmin = true;
        } else if (targetData.isSuperAdmin) {
          updateData.isSuperAdmin = false;
        }

        await targetDocRef.set(updateData, { merge: true });

        // If target belongs to a company, sync to company subcollection
        const effectiveCompanyId = targetCompanyId || callerCompanyId;
        if (effectiveCompanyId) {
          try {
            await db
              .collection('companies')
              .doc(effectiveCompanyId)
              .collection('users')
              .doc(targetUserId)
              .set(updateData, { merge: true });
          } catch (_) {}
        }

        // Invalidate in-memory profile cache immediately
        invalidateUserProfileCache(targetUserId);

        // Audit Log entry
        await logAuditEvent({
          companyId: effectiveCompanyId,
          userId: caller.uid,
          userEmail: caller.email,
          action: 'USER_ROLE_UPDATED',
          resource: `users/${targetUserId}`,
          details: {
            previousRole: targetData.role,
            newRole: normalizedRole,
            previousStatus: targetData.status,
            newStatus: status || targetData.status,
          },
          status: 'SUCCESS',
        });

        return sendSuccess(res, {
          userId: targetUserId,
          role: normalizedRole,
          status: updateData.status || targetData.status || 'active',
          message: 'تم تحديث صلاحيات وحالة المستخدم بنجاح',
        });
      } catch (err: any) {
        console.error('Update user role error:', err);
        return sendError(res, 'USER_UPDATE_FAILED', err.message || 'فشل تحديث صلاحيات المستخدم', 500);
      }
    }
  );

  // Update user profile (safe attributes only: name, phone, job title, department, etc.)
  app.post(
    '/api/users/update-profile',
    requireAuth,
    requireCompanyAccess,
    async (req, res) => {
      try {
        const parseResult = userProfileUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
          return sendError(res, 'VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'بيانات غير صالحة', 400);
        }

        const { targetUserId, displayName, phone, jobTitle, department, assignedBranch, assignedDriverId, photoURL } = parseResult.data;
        const caller = req.user!;
        const callerCompanyId = req.companyId || caller.companyId;

        // If modifying another user's profile, caller must have 'users.manage' permission
        if (targetUserId !== caller.uid && !caller.permissions.includes('users.manage') && caller.role !== 'SUPER_ADMIN') {
          return sendError(res, 'FORBIDDEN', 'غير مصرح لك بتعديل الملف الشخصي لمستخدم آخر', 403);
        }

        if (!hasAdminServiceAccount()) {
          return sendError(res, 'CONFIG_ERROR', 'خادم Firebase Admin غير مهيأ', 500);
        }

        const db = getAdminDb();
        const targetDocRef = db.collection('users').doc(targetUserId);
        const targetDoc = await targetDocRef.get();

        if (!targetDoc.exists) {
          return sendError(res, 'USER_NOT_FOUND', 'المستخدم غير موجود', 404);
        }

        const targetData = targetDoc.data() || {};
        if (caller.role !== 'SUPER_ADMIN' && targetData.companyId && targetData.companyId !== callerCompanyId) {
          return sendError(res, 'FORBIDDEN', 'غير مصرح لك بتعديل بيانات مستخدم في شركة أخرى', 403);
        }

        const safeUpdates: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };
        if (displayName !== undefined) safeUpdates.displayName = displayName;
        if (phone !== undefined) safeUpdates.phone = phone;
        if (jobTitle !== undefined) safeUpdates.jobTitle = jobTitle;
        if (department !== undefined) safeUpdates.department = department;
        if (assignedBranch !== undefined) safeUpdates.assignedBranch = assignedBranch;
        if (assignedDriverId !== undefined) safeUpdates.assignedDriverId = assignedDriverId;
        if (photoURL !== undefined) safeUpdates.photoURL = photoURL;

        await targetDocRef.set(safeUpdates, { merge: true });

        const effectiveCompanyId = targetData.companyId || callerCompanyId;
        if (effectiveCompanyId) {
          try {
            await db
              .collection('companies')
              .doc(effectiveCompanyId)
              .collection('users')
              .doc(targetUserId)
              .set(safeUpdates, { merge: true });
          } catch (_) {}
        }

        invalidateUserProfileCache(targetUserId);

        await logAuditEvent({
          companyId: effectiveCompanyId,
          userId: caller.uid,
          userEmail: caller.email,
          action: 'USER_PROFILE_UPDATED',
          resource: `users/${targetUserId}`,
          details: { updatedFields: Object.keys(safeUpdates) },
          status: 'SUCCESS',
        });

        return sendSuccess(res, {
          userId: targetUserId,
          message: 'تم تحديث الملف الشخصي بنجاح',
        });
      } catch (err: any) {
        console.error('Update user profile error:', err);
        return sendError(res, 'PROFILE_UPDATE_FAILED', err.message || 'فشل تحديث الملف الشخصي', 500);
      }
    }
  );

  // Create new user record in Firestore
  app.post(
    '/api/users/create',
    requireAuth,
    requireCompanyAccess,
    requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']),
    requirePermission('users.manage'),
    async (req, res) => {
      try {
        const parseResult = userCreateSchema.safeParse(req.body);
        if (!parseResult.success) {
          return sendError(res, 'VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'بيانات غير صالحة', 400);
        }

        const caller = req.user!;
        const callerCompanyId = req.companyId || caller.companyId;
        const normalizedRole = normalizeRole(parseResult.data.role);

        let targetCompanyId = parseResult.data.companyId || callerCompanyId;

        if (caller.role !== 'SUPER_ADMIN') {
          targetCompanyId = callerCompanyId; // Force company admin to own tenant
          if (normalizedRole === 'SUPER_ADMIN') {
            return sendError(res, 'FORBIDDEN', 'لا يمكن لمدير الشركة إنشاء حساب مدير عام للنظام', 403);
          }
        }

        if (!hasAdminServiceAccount()) {
          return sendError(res, 'CONFIG_ERROR', 'خادم Firebase Admin غير مهيأ', 500);
        }

        const db = getAdminDb();
        const userDocId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const newUserData = {
          uid: userDocId,
          email: parseResult.data.email.toLowerCase().trim(),
          displayName: parseResult.data.displayName.trim(),
          role: normalizedRole,
          companyId: targetCompanyId,
          status: parseResult.data.status || 'active',
          jobTitle: parseResult.data.jobTitle || '',
          department: parseResult.data.department || '',
          assignedBranch: parseResult.data.assignedBranch || '',
          phone: parseResult.data.phone || '',
          assignedDriverId: parseResult.data.assignedDriverId || '',
          customPermissions: parseResult.data.customPermissions || [],
          isSuperAdmin: normalizedRole === 'SUPER_ADMIN',
          createdAt: now,
          updatedAt: now,
          createdBy: caller.uid,
        };

        await db.collection('users').doc(userDocId).set(newUserData);

        if (targetCompanyId) {
          try {
            await db
              .collection('companies')
              .doc(targetCompanyId)
              .collection('users')
              .doc(userDocId)
              .set(newUserData);
          } catch (_) {}
        }

        await logAuditEvent({
          companyId: targetCompanyId,
          userId: caller.uid,
          userEmail: caller.email,
          action: 'USER_CREATED',
          resource: `users/${userDocId}`,
          details: { email: newUserData.email, role: newUserData.role, companyId: targetCompanyId },
          status: 'SUCCESS',
        });

        return sendSuccess(res, {
          user: newUserData,
          message: 'تم إنشاء المستخدم بنجاح في قاعدة البيانات',
        }, 201);
      } catch (err: any) {
        console.error('Create user error:', err);
        return sendError(res, 'USER_CREATE_FAILED', err.message || 'فشل إنشاء المستخدم', 500);
      }
    }
  );

  // Delete user record
  app.delete(
    '/api/users/:targetUserId',
    requireAuth,
    requireCompanyAccess,
    requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']),
    requirePermission('users.manage'),
    async (req, res) => {
      try {
        const { targetUserId } = req.params;
        const caller = req.user!;
        const callerCompanyId = req.companyId || caller.companyId;

        if (targetUserId === caller.uid) {
          return sendError(res, 'FORBIDDEN', 'لا يمكنك حذف حسابك الحالي', 400);
        }

        if (!hasAdminServiceAccount()) {
          return sendError(res, 'CONFIG_ERROR', 'خادم Firebase Admin غير مهيأ', 500);
        }

        const db = getAdminDb();
        const userDocRef = db.collection('users').doc(targetUserId);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
          return sendError(res, 'USER_NOT_FOUND', 'المستخدم غير موجود', 404);
        }

        const userData = userDoc.data() || {};
        if (caller.role !== 'SUPER_ADMIN') {
          if (userData.companyId && userData.companyId !== callerCompanyId) {
            return sendError(res, 'FORBIDDEN', 'غير مصرح لك بحذف مستخدم في شركة أخرى', 403);
          }
          if (userData.role === 'SUPER_ADMIN' || userData.isSuperAdmin === true) {
            return sendError(res, 'FORBIDDEN', 'لا يمكن حذف حساب مدير عام للنظام', 403);
          }
        }

        await userDocRef.delete();
        if (userData.companyId) {
          try {
            await db
              .collection('companies')
              .doc(userData.companyId)
              .collection('users')
              .doc(targetUserId)
              .delete();
          } catch (_) {}
        }

        invalidateUserProfileCache(targetUserId);

        await logAuditEvent({
          companyId: userData.companyId || callerCompanyId,
          userId: caller.uid,
          userEmail: caller.email,
          action: 'USER_DELETED',
          resource: `users/${targetUserId}`,
          details: { email: userData.email, role: userData.role },
          status: 'SUCCESS',
        });

        return sendSuccess(res, {
          userId: targetUserId,
          message: 'تم حذف المستخدم بنجاح',
        });
      } catch (err: any) {
        console.error('Delete user error:', err);
        return sendError(res, 'USER_DELETE_FAILED', err.message || 'فشل حذف المستخدم', 500);
      }
    }
  );

  // =========================================================================
  // 4. EMAIL & NOTIFICATIONS CONFIGURATION (Section 19)
  // Strictly company-isolated in Map with Firestore persistence
  // =========================================================================

  // Sync client-side fleet data snapshot strictly scoped to authenticated company
  app.post(
    '/api/email/sync-state',
    requireAuth,
    requireCompanyAccess,
    async (req, res) => {
      try {
        const companyId = req.companyId || 'company-01';
        if (req.body && typeof req.body === 'object') {
          companyFleetSnapshots.set(companyId, {
            ...req.body,
            companyId,
          });

          // Persist snapshot under company settings in Firestore if admin db available
          if (hasAdminServiceAccount()) {
            try {
              const db = getAdminDb();
              await db
                .collection('companies')
                .doc(companyId)
                .collection('settings')
                .doc('fleetSnapshot')
                .set(
                  {
                    ...req.body,
                    companyId,
                    syncedAt: new Date().toISOString(),
                  },
                  { merge: true }
                );
            } catch (_) {}
          }
        }
        sendSuccess(res, { synced: true, companyId, timestamp: new Date().toISOString() });
      } catch (err: any) {
        sendError(res, 'SYNC_FAILED', err.message, 500);
      }
    }
  );

  app.get(
    '/api/email/config',
    requireAuth,
    requireCompanyAccess,
    async (req, res) => {
      try {
        const companyId = req.companyId || 'company-01';
        const data = await getCompanyEmailConfig(companyId);

        // Mask password for client security
        const responseData = { ...data };
        if (responseData.smtpPass) {
          responseData.smtpPass = '********';
        }

        sendSuccess(res, responseData);
      } catch (err: any) {
        sendError(res, 'FETCH_EMAIL_CONFIG_FAILED', err.message, 500);
      }
    }
  );

  app.post(
    '/api/email/config',
    requireAuth,
    requireCompanyAccess,
    requirePermission('settings.manage'),
    async (req, res) => {
      try {
        const parseResult = emailConfigSchema.safeParse(req.body);
        if (!parseResult.success) {
          return sendError(res, 'VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'بيانات غير صالحة', 400);
        }

        const companyId = req.companyId || 'company-01';
        const currentConfig = await getCompanyEmailConfig(companyId);
        const { dailyReportEnabled, recipientEmails, sendTime, smtpHost, smtpPort, smtpUser, smtpPass } = parseResult.data;

        const updates: Partial<CompanyEmailConfig> = {
          dailyReportEnabled: dailyReportEnabled !== undefined ? Boolean(dailyReportEnabled) : currentConfig.dailyReportEnabled,
          recipientEmails: Array.isArray(recipientEmails) ? recipientEmails : (recipientEmails ? [recipientEmails] : currentConfig.recipientEmails),
          sendTime: sendTime || currentConfig.sendTime || '17:00',
          smtpHost: smtpHost || currentConfig.smtpHost || 'smtp.gmail.com',
          smtpPort: Number(smtpPort) || currentConfig.smtpPort || 587,
          smtpUser: smtpUser !== undefined ? smtpUser : currentConfig.smtpUser,
          status: 'active',
        };

        if (smtpPass && smtpPass !== '********') {
          updates.smtpPass = smtpPass;
        }

        const merged: CompanyEmailConfig = {
          ...currentConfig,
          ...updates,
          smtpPass: updates.smtpPass || currentConfig.smtpPass,
        };

        companyEmailConfigs.set(companyId, merged);

        if (hasAdminServiceAccount()) {
          try {
            const db = getAdminDb();
            await db
              .collection('companies')
              .doc(companyId)
              .collection('settings')
              .doc('email')
              .set(
                {
                  ...merged,
                  companyId,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
          } catch (_) {}
        }

        sendSuccess(res, { message: 'تم حفظ إعدادات البريد بنجاح للشركة' });
      } catch (err: any) {
        sendError(res, 'SAVE_EMAIL_CONFIG_FAILED', err.message, 500);
      }
    }
  );

  // Send Test Email via real SMTP strictly scoped to the tenant's config
  app.post(
    '/api/email/test',
    requireAuth,
    requireCompanyAccess,
    requirePermission('settings.manage'),
    async (req, res) => {
      try {
        const parseResult = testEmailSchema.safeParse(req.body);
        if (!parseResult.success) {
          return sendError(res, 'VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'بيانات غير صالحة', 400);
        }

        const companyId = req.companyId || 'company-01';
        const config = await getCompanyEmailConfig(companyId);
        const { targetEmail } = parseResult.data;
        const recipient = targetEmail || req.user?.email || config.recipientEmails?.[0] || process.env.NOTIFICATION_EMAIL || '';

        const host = config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = Number(config.smtpPort || process.env.SMTP_PORT || 587);
        const user = config.smtpUser || process.env.SMTP_USER || '';
        const pass = config.smtpPass || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

        if (!user || !pass || !recipient) {
          return sendSuccess(res, {
            delivered: false,
            notice: 'بيانات SMTP أو عنوان المستلم غير مكتملة في إعدادات الشركة.',
            recipient: recipient || 'غير محدد',
          });
        }

        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          tls: { rejectUnauthorized: true },
        });

        const info = await transporter.sendMail({
          from: `"FleetOps Intelligence" <${user}>`,
          to: recipient,
          subject: `✅ تجربة إرسال بريد ناجحة من منصة FleetOps (${companyId})`,
          html: `<div style="direction:rtl; font-family:sans-serif; padding:20px; border:1px solid #e2e8f0; border-radius:8px;">
            <h2 style="color:#0f766e;">تجربة إرسال بريد إلكتروني ناجحة</h2>
            <p>تم تأكيد اتصال خادم البريد SMTP الخاص بشركتك (${companyId}) بنجاح من منصة FleetOps Intelligence.</p>
            <p style="color:#64748b; font-size:12px;">وقت الإرسال: ${new Date().toLocaleString('ar-EG')}</p>
          </div>`,
        });

        sendSuccess(res, {
          delivered: true,
          messageId: info.messageId,
          recipient,
        });
      } catch (err: any) {
        console.error('Test email dispatch error:', err);
        sendError(res, 'EMAIL_SEND_FAILED', err.message || 'فشل إرسال الإيميل التجريبي', 500);
      }
    }
  );

  // Send Daily EOD Report strictly isolated to requested company
  app.post(
    '/api/email/send-daily-report',
    requireAuth,
    requireCompanyAccess,
    async (req, res) => {
      try {
        const parseResult = sendDailyReportSchema.safeParse(req.body);
        if (!parseResult.success) {
          return sendError(res, 'VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'بيانات غير صالحة', 400);
        }

        const companyId = req.companyId || 'company-01';
        const { date = new Date().toISOString().split('T')[0], recipientsOverride, payload } = parseResult.data;

        const config = await getCompanyEmailConfig(companyId);
        const defaultRecipient = process.env.NOTIFICATION_EMAIL || config.smtpUser || '';
        const recipients = recipientsOverride || (config.recipientEmails && config.recipientEmails.length > 0 ? config.recipientEmails : [defaultRecipient]).filter(Boolean);
        const host = config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = Number(config.smtpPort || process.env.SMTP_PORT || 587);
        const user = config.smtpUser || process.env.SMTP_USER || '';
        const pass = config.smtpPass || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

        const effectivePayload = payload || companyFleetSnapshots.get(companyId);
        let htmlContent = '';
        let textContent = '';

        if (effectivePayload) {
          htmlContent = generateDailyEmailHtml({ ...(effectivePayload as any), companyId, reportDate: date });
          textContent = generateDailyEmailPlainText({ ...(effectivePayload as any), companyId, reportDate: date });
        } else {
          const context = await loadCompanyFleetContext(companyId);
          htmlContent = `<div style="direction:rtl; font-family:sans-serif; padding:20px;">
            <h2>ملخص تشغيل أسطول الشركة (${companyId}) اليومي (${date})</h2>
            <p>إجمالي المهام المسجلة: ${context.summary.totalTasks}</p>
            <p>المهام قيد التنفيذ: ${context.summary.inProgressTasksCount}</p>
            <p>المهام المتأخرة: ${context.summary.delayedTasksCount}</p>
            <p>المركبات التي تحتاج غيار زيت عاجل: ${context.summary.urgentOilCount}</p>
          </div>`;
          textContent = `تقرير تشغيل أسطول الشركة (${companyId}) اليومي: إجمالي المهام: ${context.summary.totalTasks}`;
        }

        let messageId = null;
        if (user && pass && recipients.length > 0) {
          const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            tls: { rejectUnauthorized: true },
          });

          const sendResult = await transporter.sendMail({
            from: `"FleetOps Daily Report" <${user}>`,
            to: recipients.join(', '),
            subject: `🚚 [تقرير نهاية اليوم المجمع] أسطول الشركة (${companyId}) - ${date}`,
            html: htmlContent,
            text: textContent,
          });
          messageId = sendResult.messageId;
        }

        // Record last sent in company-scoped config
        config.lastSentAt = new Date().toISOString();
        config.lastSentDate = date;
        companyEmailConfigs.set(companyId, config);

        // Update in Firestore if authorized
        if (hasAdminServiceAccount()) {
          try {
            const db = getAdminDb();
            await db
              .collection('companies')
              .doc(companyId)
              .collection('settings')
              .doc('email')
              .set(
                {
                  lastSentAt: new Date().toISOString(),
                  lastSentDate: date,
                },
                { merge: true }
              );
          } catch (_) {}
        }

        sendSuccess(res, {
          delivered: Boolean(user && pass),
          messageId,
          recipients,
          date,
          companyId,
        });
      } catch (err: any) {
        console.error('Daily report dispatch error:', err);
        sendError(res, 'REPORT_DISPATCH_FAILED', err.message || 'فشل إرسال التقرير اليومي', 500);
      }
    }
  );

  // Background timer for automated daily report email dispatch across all tenant companies
  setInterval(async () => {
    try {
      const activeCompanyIds = new Set<string>(companyEmailConfigs.keys());
      activeCompanyIds.add('company-01');

      if (hasAdminServiceAccount()) {
        try {
          const db = getAdminDb();
          const companiesSnap = await db.collection('companies').get();
          companiesSnap.docs.forEach((doc) => activeCompanyIds.add(doc.id));
        } catch (_) {}
      }

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      for (const companyId of activeCompanyIds) {
        try {
          const config = await getCompanyEmailConfig(companyId);
          if (!config.dailyReportEnabled) continue;

          const user = config.smtpUser || process.env.SMTP_USER;
          const pass = config.smtpPass || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
          if (!user || !pass) continue;

          if (config.lastSentDate === todayStr) continue;

          const [targetHourStr = '17', targetMinStr = '0'] = (config.sendTime || '17:00').split(':');
          const targetHour = parseInt(targetHourStr, 10);
          const targetMin = parseInt(targetMinStr, 10);

          const currentHour = now.getHours();
          const currentMin = now.getMinutes();

          if (currentHour > targetHour || (currentHour === targetHour && currentMin >= targetMin)) {
            console.log(`[AutoMailer] Scheduled time reached for company ${companyId} (${config.sendTime}). Dispatching daily report for ${todayStr}...`);
            config.lastSentDate = todayStr;
            config.lastSentAt = now.toISOString();
            companyEmailConfigs.set(companyId, config);

            const defaultRecipient = process.env.NOTIFICATION_EMAIL || user || '';
            const recipients = (config.recipientEmails && config.recipientEmails.length > 0 ? config.recipientEmails : [defaultRecipient]).filter(Boolean);
            if (recipients.length === 0) continue;

            const host = config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
            const port = Number(config.smtpPort || process.env.SMTP_PORT || 587);

            const payload = companyFleetSnapshots.get(companyId);
            let htmlContent = '';
            let textContent = '';
            if (payload) {
              htmlContent = generateDailyEmailHtml({ ...payload, companyId, reportDate: todayStr });
              textContent = generateDailyEmailPlainText({ ...payload, companyId, reportDate: todayStr });
            } else {
              const context = await loadCompanyFleetContext(companyId);
              htmlContent = `<div style="direction:rtl; font-family:sans-serif; padding:20px;">
                <h2>ملخص تشغيل أسطول الشركة (${companyId}) اليومي (${todayStr})</h2>
                <p>إجمالي المهام المسجلة: ${context.summary.totalTasks}</p>
                <p>المهام المتأخرة: ${context.summary.delayedTasksCount}</p>
                <p>المركبات التي تحتاج غيار زيت عاجل: ${context.summary.urgentOilCount}</p>
              </div>`;
              textContent = `تقرير تشغيل أسطول الشركة (${companyId}) اليومي (${todayStr})`;
            }

            const transporter = nodemailer.createTransport({
              host,
              port,
              secure: port === 465,
              auth: { user, pass },
              tls: { rejectUnauthorized: true },
            });

            await transporter.sendMail({
              from: `"FleetOps Daily Report" <${user}>`,
              to: recipients.join(', '),
              subject: `🚚 [تقرير نهاية اليوم المجمع] أسطول الشركة (${companyId}) - ${todayStr}`,
              html: htmlContent,
              text: textContent,
            });

            if (hasAdminServiceAccount()) {
              try {
                const db = getAdminDb();
                await db
                  .collection('companies')
                  .doc(companyId)
                  .collection('settings')
                  .doc('email')
                  .set(
                    {
                      lastSentAt: now.toISOString(),
                      lastSentDate: todayStr,
                    },
                    { merge: true }
                  );
              } catch (_) {}
            }

            console.log(`[AutoMailer] Successfully sent automated daily report for company ${companyId} to: ${recipients.join(', ')}`);
          }
        } catch (compErr) {
          console.error(`[AutoMailer] Error dispatching for company ${companyId}:`, compErr);
        }
      }
    } catch (autoErr) {
      console.warn('[AutoMailer] Background dispatch warning:', autoErr);
    }
  }, 60 * 1000);

  // =========================================================================
  // 5. VITE MIDDLEWARE & STATIC ASSETS
  // =========================================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FleetOps Intelligence Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
