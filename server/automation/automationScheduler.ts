import { getAdminDb, hasAdminServiceAccount } from '../firebaseAdmin';
import { automationEngine } from './automationEngine';

export class AutomationScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private hasWarnedMissingCreds: boolean = false;
  private readonly CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
  private lastMonthlyRun: Map<string, string> = new Map(); // companyId -> "YYYY-MM"

  public start() {
    if (this.timer) return;
    if (!hasAdminServiceAccount()) {
      console.log('[AutomationScheduler] Reactive mode active: Automation triggers are driven by user/client events.');
      return;
    }
    console.log('[AutomationScheduler] Starting background operational cron worker...');
    this.runCycle();
    this.timer = setInterval(() => this.runCycle(), this.CHECK_INTERVAL_MS);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[AutomationScheduler] Stopped background cron worker.');
    }
  }

  private async runCycle() {
    if (this.isRunning) return;
    if (!hasAdminServiceAccount()) return;
    this.isRunning = true;

    try {
      const db = getAdminDb();
      const companiesSnap = await db.collection('companies').get();
      const companyIds = companiesSnap.empty
        ? ['company-01']
        : companiesSnap.docs.map((d) => d.id);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      for (const companyId of companyIds) {
        // 1. Check for OVERDUE tasks
        try {
          const tasksSnap = await db
            .collection('companies')
            .doc(companyId)
            .collection('tasks')
            .where('status', 'in', ['PENDING', 'ASSIGNED', 'IN_PROGRESS'])
            .get();

          for (const doc of tasksSnap.docs) {
            const task = doc.data();
            if (task.scheduledDate && task.scheduledDate < todayStr) {
              await automationEngine.processEvent({
                companyId,
                trigger: 'TASK_OVERDUE',
                triggeredBy: 'system_scheduler',
                eventTimestamp: now.toISOString(),
                entityId: task.id,
                entityType: 'task',
                data: {
                  ...task,
                  title: `مهمة متأخرة: ${task.title}`,
                  delayDays: Math.floor((now.getTime() - new Date(task.scheduledDate).getTime()) / (1000 * 3600 * 24)),
                },
              });
            }
          }
        } catch (e) {
          // ignore index or query notice
        }

        // 2. Check for VEHICLES nearing maintenance / oil change
        try {
          const vehiclesSnap = await db
            .collection('companies')
            .doc(companyId)
            .collection('vehicles')
            .get();

          for (const doc of vehiclesSnap.docs) {
            const v = doc.data();
            const currentKm = Number(v.currentOdometer || 0);
            const nextOilKm = Number(v.nextOilChangeKm || 0);
            const remainingKm = nextOilKm - currentKm;

            if (nextOilKm > 0 && remainingKm <= 500) {
              await automationEngine.processEvent({
                companyId,
                trigger: 'VEHICLE_MAINTENANCE_DUE',
                triggeredBy: 'system_scheduler',
                eventTimestamp: now.toISOString(),
                entityId: v.id,
                entityType: 'vehicle',
                data: {
                  ...v,
                  vehicleId: v.id,
                  remainingKm,
                  currentOdometer: currentKm,
                  nextOilChangeKm: nextOilKm,
                  title: `صيانة دورية مستحقة للمركبة (${v.plateNumber || v.id})`,
                },
              });
            }
          }
        } catch (e) {
          // ignore
        }

        // 3. Check for EXPIRING vehicle documents
        try {
          const docsSnap = await db
            .collection('companies')
            .doc(companyId)
            .collection('vehicleDocuments')
            .get();

          for (const doc of docsSnap.docs) {
            const d = doc.data();
            if (d.expiryDate) {
              const diffDays = Math.ceil((new Date(d.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
              if (diffDays <= 30 && diffDays >= 0) {
                await automationEngine.processEvent({
                  companyId,
                  trigger: 'VEHICLE_DOCUMENT_EXPIRING',
                  triggeredBy: 'system_scheduler',
                  eventTimestamp: now.toISOString(),
                  entityId: d.id,
                  entityType: 'document',
                  data: {
                    ...d,
                    remainingDays: diffDays,
                    title: `وثيقة قريبة من الانتهاء (${d.title}) للمركبة ${d.vehiclePlate || ''}`,
                  },
                });
              }
            }
          }
        } catch (e) {
          // ignore
        }

        // 4. Check for DRIVER_LICENSE_EXPIRING
        try {
          const driversSnap = await db
            .collection('companies')
            .doc(companyId)
            .collection('drivers')
            .get();

          for (const doc of driversSnap.docs) {
            const driver = doc.data();
            const expDate = driver.licenseExpiryDate || driver.licenseExpiry;
            if (expDate) {
              const diffDays = Math.ceil((new Date(expDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
              if (diffDays <= 30 && diffDays >= 0) {
                await automationEngine.processEvent({
                  companyId,
                  trigger: 'DRIVER_LICENSE_EXPIRING',
                  triggeredBy: 'system_scheduler',
                  eventTimestamp: now.toISOString(),
                  entityId: driver.id,
                  entityType: 'driver',
                  data: {
                    ...driver,
                    driverId: driver.id,
                    driverName: driver.name,
                    remainingDays: diffDays,
                    licenseExpiryDate: expDate,
                    title: `رخصة السائق (${driver.name || driver.id}) تقترب من الانتهاء (${diffDays} يوماً)`,
                  },
                });
              }
            }
          }
        } catch (e) {
          // ignore
        }

        // 5. Periodic Schedules (DAILY, WEEKLY, MONTHLY)
        try {
          const currentHour = now.getHours();
          const currentDayOfWeek = now.getDay(); // 0 = Sun
          const currentDayOfMonth = now.getDate(); // 1-31

          // Daily Schedule (trigger once per day around matching hour or noon)
          await automationEngine.processEvent({
            companyId,
            trigger: 'DAILY_SCHEDULE',
            triggeredBy: 'system_scheduler',
            eventTimestamp: now.toISOString(),
            entityType: 'schedule',
            data: {
              currentHour,
              currentDayOfWeek,
              currentDayOfMonth,
              todayStr,
              title: `جدول التشغيل اليومي - ${todayStr}`,
            },
          });

          // Weekly Schedule
          if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
            await automationEngine.processEvent({
              companyId,
              trigger: 'WEEKLY_SCHEDULE',
              triggeredBy: 'system_scheduler',
              eventTimestamp: now.toISOString(),
              entityType: 'schedule',
              data: {
                currentHour,
                currentDayOfWeek,
                todayStr,
                title: `جدول التشغيل الأسبوعي - أسبوع ${todayStr}`,
              },
            });
          }

          // Monthly Schedule - Triggers on the 1st day of each Gregorian calendar month
          if (currentDayOfMonth === 1) {
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const lastRunKey = this.lastMonthlyRun.get(companyId);

            // Execute once per month on the 1st day (e.g. from 08:00 AM or upon first daytime check)
            if (lastRunKey !== currentMonthKey && currentHour >= 8) {
              this.lastMonthlyRun.set(companyId, currentMonthKey);
              console.log(
                `[AutomationScheduler] Triggering scheduled monthly executive report for company ${companyId} on day 1 of month ${currentMonthKey}...`
              );

              // Ensure the company has the monthly report automation rule in Firestore
              await this.ensureMonthlyReportRule(companyId);

              await automationEngine.processEvent({
                companyId,
                trigger: 'MONTHLY_SCHEDULE',
                triggeredBy: 'system_scheduler',
                eventTimestamp: now.toISOString(),
                entityType: 'schedule',
                data: {
                  currentHour,
                  currentDayOfMonth,
                  todayStr,
                  monthKey: currentMonthKey,
                  target: 'ALL_MANAGERS',
                  title: `جدول التقرير الشهري الآلي للإدارة - بداية شهر ${currentMonthKey}`,
                },
              });

              // Update company config with last sent month
              try {
                await db
                  .collection('companies')
                  .doc(companyId)
                  .collection('config')
                  .doc('email')
                  .set(
                    {
                      lastMonthlyReportSentMonth: currentMonthKey,
                      lastMonthlyReportSentTimestamp: now.toISOString(),
                    },
                    { merge: true }
                  );
              } catch (_) {}
            }
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (cycleErr) {
      console.warn('[AutomationScheduler] Cycle warning:', cycleErr);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Ensures the pre-configured monthly report rule exists in the company's automation rules collection
   */
  public async ensureMonthlyReportRule(companyId: string): Promise<void> {
    try {
      const db = getAdminDb();
      const rulesSnap = await db
        .collection('companies')
        .doc(companyId)
        .collection('automationRules')
        .where('trigger', '==', 'MONTHLY_SCHEDULE')
        .get();

      if (rulesSnap.empty) {
        const defaultMonthlyRule = {
          id: `rule-monthly-${companyId}`,
          companyId,
          name: 'التقرير الشهري التلقائي للإدارة في أول كل شهر',
          description:
            'توليد وإرسال تقرير الأداء الشامل للأسطول والعمليات تلقائياً في أول يوم من كل شهر ميلادي لجميع المديرين المسجلين',
          trigger: 'MONTHLY_SCHEDULE',
          conditions: [{ field: 'dayOfMonth', operator: 'equals', value: '1' }],
          scheduleConfig: {
            dayOfMonth: 1,
            scheduleHour: 8,
            scheduleMinute: 0,
          },
          actions: [
            {
              type: 'SEND_MONTHLY_REPORT',
              parameters: {
                target: 'ALL_MANAGERS',
                reportType: 'MONTHLY_EXECUTIVE_SUMMARY',
                title: 'التقرير التشغيلي والمالي الشهري الشامل لأسطول FleetOps',
              },
            },
          ],
          enabled: true,
          executionCount: 0,
          createdBy: 'النظام الآلي (System Auto)',
          createdAt: new Date().toISOString(),
        };

        await db
          .collection('companies')
          .doc(companyId)
          .collection('automationRules')
          .doc(defaultMonthlyRule.id)
          .set(defaultMonthlyRule);

        console.log(`[AutomationScheduler] Bootstrapped default monthly report rule for company ${companyId}`);
      }
    } catch (err) {
      console.warn(`[AutomationScheduler] Notice ensuring monthly report rule for ${companyId}:`, err);
    }
  }
}

export const automationScheduler = new AutomationScheduler();
