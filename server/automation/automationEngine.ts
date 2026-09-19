import { getAdminDb } from '../firebaseAdmin';
import {
  AutomationRule,
  AutomationExecution,
  AutomationActionResult,
  AutomationExecutionStatus,
} from '../../src/types';
import { TriggerContext, RuleExecutionResult } from './automationTypes';
import { evaluateConditions } from './automationConditionEvaluator';
import { executeAutomationAction } from './automationActionExecutor';

// In-memory throttle cache to prevent duplicate triggers within a 5-minute window
const deduplicationCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function getDedupKey(context: TriggerContext, ruleId: string): string {
  const entity = context.entityId || 'general';
  return `${context.companyId}_${ruleId}_${context.trigger}_${entity}`;
}

export class AutomationEngine {
  private static instance: AutomationEngine;

  public static getInstance(): AutomationEngine {
    if (!AutomationEngine.instance) {
      AutomationEngine.instance = new AutomationEngine();
    }
    return AutomationEngine.instance;
  }

  /**
   * Dispatches an operational event to evaluate matching rules and trigger actions.
   */
  public async processEvent(context: TriggerContext): Promise<RuleExecutionResult[]> {
    const db = getAdminDb();
    const results: RuleExecutionResult[] = [];

    try {
      // 1. Fetch active automation rules for this company that match the trigger (including aliases)
      const triggerList = [context.trigger];
      if (context.trigger === 'MAINTENANCE_DUE') triggerList.push('VEHICLE_MAINTENANCE_DUE');
      if (context.trigger === 'VEHICLE_MAINTENANCE_DUE') triggerList.push('MAINTENANCE_DUE');
      if (context.trigger === 'DOCUMENT_EXPIRING') triggerList.push('VEHICLE_DOCUMENT_EXPIRING');
      if (context.trigger === 'VEHICLE_DOCUMENT_EXPIRING') triggerList.push('DOCUMENT_EXPIRING');

      const rulesSnap = await db
        .collection('companies')
        .doc(context.companyId)
        .collection('automationRules')
        .where('enabled', '==', true)
        .where('trigger', 'in', triggerList)
        .get();

      if (rulesSnap.empty) {
        return results;
      }

      for (const docSnap of rulesSnap.docs) {
        const rule = docSnap.data() as AutomationRule;
        const dedupKey = getDedupKey(context, rule.id);

        // Deduplication check with configurable window
        const windowMs = (rule.deduplicationWindowMinutes && rule.deduplicationWindowMinutes > 0
          ? rule.deduplicationWindowMinutes
          : 5) * 60 * 1000;
        const lastRun = deduplicationCache.get(dedupKey);
        const now = Date.now();
        if (lastRun && now - lastRun < windowMs) {
          console.log(`[AutomationEngine] Throttling duplicate trigger for rule "${rule.name}" (${rule.id}) within ${windowMs / 60000}m window`);
          continue;
        }

        const result = await this.executeRule(rule, context);
        deduplicationCache.set(dedupKey, now);
        results.push(result);
      }
    } catch (err) {
      console.error('[AutomationEngine] Error processing event:', err);
    }

    return results;
  }

  /**
   * Retries a previously failed or partial automation execution.
   */
  public async retryExecution(
    executionId: string,
    companyId: string,
    userId: string
  ): Promise<RuleExecutionResult> {
    const db = getAdminDb();
    const execDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('automationExecutions')
      .doc(executionId);
    const execSnap = await execDocRef.get();

    if (!execSnap.exists) {
      throw new Error(`سجل التنفيذ (${executionId}) غير موجود`);
    }

    const execData = execSnap.data() as AutomationExecution;
    const ruleSnap = await db
      .collection('companies')
      .doc(companyId)
      .collection('automationRules')
      .doc(execData.ruleId)
      .get();

    if (!ruleSnap.exists) {
      throw new Error(`قاعدة الأتمتة المقترنة (${execData.ruleId}) غير متوفرة في النظام`);
    }

    const rule = ruleSnap.data() as AutomationRule;
    const context: TriggerContext = {
      companyId,
      trigger: execData.trigger,
      triggeredBy: `retry_${userId || 'admin'}`,
      eventTimestamp: new Date().toISOString(),
      entityId: execData.affectedEntityId,
      data: {
        previousExecutionId: executionId,
        retryAttempt: (execData.retryCount || 0) + 1,
      },
    };

    // Re-execute rule
    const result = await this.executeRule(rule, context, true);

    // Update execution history
    await execDocRef.set(
      {
        status: result.status,
        details: `إعادة محاولة: ${result.details}`,
        actionResults: result.actionResults,
        retryCount: (execData.retryCount || 0) + 1,
        lastRetriedAt: new Date().toISOString(),
        lastRetriedBy: userId,
      },
      { merge: true }
    );

    return result;
  }

  /**
   * Executes a single rule (either triggered by event or manual execution).
   */
  public async executeRule(
    rule: AutomationRule,
    context: TriggerContext,
    isManualTest: boolean = false
  ): Promise<RuleExecutionResult> {
    const db = getAdminDb();
    const execId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const startTime = new Date().toISOString();

    // Contextual evaluation data
    const evalData = {
      ...(context.data || {}),
      trigger: context.trigger,
      companyId: context.companyId,
      entityId: context.entityId,
      entityType: context.entityType,
      eventTimestamp: context.eventTimestamp,
    };

    // 1. Record initial RUNNING status
    const initialExecution: AutomationExecution = {
      id: execId,
      companyId: context.companyId,
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: context.trigger,
      triggeredBy: isManualTest ? `manual_${context.triggeredBy}` : context.triggeredBy,
      executionTime: startTime,
      status: 'RUNNING',
      details: `بدء فحص شروط القاعدة: ${rule.name}`,
      retryCount: 0,
      affectedEntityId: context.entityId,
    };

    const execDocRef = db
      .collection('companies')
      .doc(context.companyId)
      .collection('automationExecutions')
      .doc(execId);

    try {
      await execDocRef.set(initialExecution);
    } catch (e) {
      console.warn('Could not record initial execution start:', e);
    }

    // 2. Evaluate conditions
    const conditionsPassed = isManualTest
      ? true // When testing manually, execute actions directly
      : evaluateConditions(rule.conditions, evalData);

    if (!conditionsPassed) {
      const skippedStatus: AutomationExecutionStatus = 'SKIPPED';
      const updateData = {
        status: skippedStatus,
        details: `تم تخطي القاعدة: لم تتحقق الشروط المحددة (${rule.conditions.length} شروط)`,
        completedAt: new Date().toISOString(),
      };
      await execDocRef.set(updateData, { merge: true }).catch(() => {});

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        executionId: execId,
        status: skippedStatus,
        conditionsPassed: false,
        actionResults: [],
        details: updateData.details,
      };
    }

    // 3. Execute actions with controlled retry
    const actionResults: AutomationActionResult[] = [];
    let failureCount = 0;

    for (const action of rule.actions) {
      let result = await executeAutomationAction(action, context.companyId, evalData);

      // Max 1 retry immediately if failed
      if (result.status === 'FAILED') {
        console.warn(`Action ${action.type} failed, attempting immediate retry...`);
        result = await executeAutomationAction(action, context.companyId, evalData);
      }

      actionResults.push(result);
      if (result.status === 'FAILED') {
        failureCount++;
      }
    }

    // Determine overall status
    let finalStatus: AutomationExecutionStatus = 'SUCCESS';
    if (failureCount === rule.actions.length && rule.actions.length > 0) {
      finalStatus = 'FAILED';
    } else if (failureCount > 0) {
      finalStatus = 'PARTIAL_SUCCESS';
    }

    const completedAt = new Date().toISOString();
    const finalDetails =
      finalStatus === 'SUCCESS'
        ? `تم تنفيذ جميع الإجراءات (${actionResults.length}) بنجاح`
        : finalStatus === 'PARTIAL_SUCCESS'
        ? `تم تنفيذ بعض الإجراءات بنجاح، وفشل ${failureCount} إجراء`
        : `فشلت الإجراءات المنفذة`;

    // 4. Update Execution Record in Firestore
    await execDocRef
      .set(
        {
          status: finalStatus,
          details: finalDetails,
          actionResults,
          retryCount: failureCount > 0 ? 1 : 0,
          completedAt,
        },
        { merge: true }
      )
      .catch(() => {});

    // 5. Update Rule metrics in Firestore
    try {
      const ruleRef = db
        .collection('companies')
        .doc(context.companyId)
        .collection('automationRules')
        .doc(rule.id);

      await ruleRef.set(
        {
          executionCount: (rule.executionCount || 0) + 1,
          lastExecutedAt: completedAt,
          updatedAt: completedAt,
        },
        { merge: true }
      );
    } catch (e) {
      // ignore
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      executionId: execId,
      status: finalStatus,
      conditionsPassed: true,
      actionResults,
      details: finalDetails,
    };
  }
}

export const automationEngine = AutomationEngine.getInstance();
