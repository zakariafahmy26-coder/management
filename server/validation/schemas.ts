import { z } from 'zod';
import { CANONICAL_ROLES } from '../../src/auth/rbac';

export const canonicalRolesEnum = z.enum([
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'OPERATIONS_MANAGER',
  'SUPERVISOR',
  'DISPATCHER',
  'FINANCE',
  'MAINTENANCE',
  'DRIVER',
  'VIEWER',
  // legacy aliases
  'admin',
  'manager',
  'operation',
  'finance',
  'driver',
  'maintenance',
  'viewer',
]);

export const aiChatSchema = z.object({
  message: z.string().trim().min(1, 'نص الرسالة مطلوب').max(10000, 'الرسالة طويلة جداً'),
  conversationId: z.string().trim().max(128).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string().optional(),
        text: z.string().optional(),
      })
    )
    .optional(),
});

export const aiCopilotSchema = z.object({
  query: z.string().trim().min(1, 'الاستفسار مطلوب').max(10000, 'الاستفسار طويل جداً'),
  conversationHistory: z.array(z.any()).optional(),
});

export const scanReceiptSchema = z.object({
  imageBase64: z.string().min(10, 'صورة الإيصال مطلوبة'),
  mimeType: z.string().optional().default('image/jpeg'),
});

export const emailConfigSchema = z.object({
  dailyReportEnabled: z.boolean().optional(),
  recipientEmails: z.union([z.array(z.string().email()), z.string().email()]).optional(),
  sendTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'صيغة الوقت غير صالحة، يجب أن تكون HH:MM')
    .optional(),
  smtpHost: z.string().trim().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().trim().optional(),
  smtpPass: z.string().optional(),
});

export const testEmailSchema = z.object({
  targetEmail: z.string().email().optional(),
});

export const sendDailyReportSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ غير صالحة YYYY-MM-DD')
    .optional(),
  recipientsOverride: z.array(z.string().email()).optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

export const userRoleUpdateSchema = z.object({
  targetUserId: z.string().trim().min(1, 'معرف المستخدم مطلوب'),
  role: canonicalRolesEnum,
  status: z.enum(['active', 'pending', 'disabled', 'suspended']).optional(),
  customPermissions: z.array(z.string()).optional(),
});

export const userProfileUpdateSchema = z.object({
  targetUserId: z.string().trim().min(1, 'معرف المستخدم مطلوب'),
  displayName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  jobTitle: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  assignedBranch: z.string().trim().max(100).optional(),
  assignedDriverId: z.string().trim().max(100).optional(),
  photoURL: z.string().url().or(z.literal('')).optional(),
  // Explicitly disallow role/companyId/isSuperAdmin escalation via profile endpoint
  role: z.never().optional(),
  companyId: z.never().optional(),
  isSuperAdmin: z.never().optional(),
});

export const userCreateSchema = z.object({
  email: z.string().trim().email('صيغة البريد الإلكتروني غير صالحة'),
  displayName: z.string().trim().min(1, 'اسم المستخدم مطلوب').max(100),
  role: canonicalRolesEnum,
  companyId: z.string().trim().optional(),
  status: z.enum(['active', 'pending']).optional(),
  jobTitle: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  assignedBranch: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  assignedDriverId: z.string().trim().max(100).optional(),
  customPermissions: z.array(z.string()).optional(),
});

export const migrationRunSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  targetCompanyId: z.string().trim().optional(),
});

export const automationExecuteSchema = z.object({
  companyId: z.string().trim().optional(),
  ruleId: z.string().trim().optional(),
  eventType: z.string().trim().optional(),
  idempotencyKey: z.string().trim().optional(),
  context: z.record(z.string(), z.any()).optional(),
});
