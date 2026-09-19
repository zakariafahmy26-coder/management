import {
  AutomationTrigger,
  AutomationRule,
  AutomationExecution,
  AutomationActionResult,
  AutomationExecutionStatus,
  AutomationCondition,
  AutomationAction,
} from '../../src/types';

export interface TriggerContext {
  companyId: string;
  trigger: AutomationTrigger;
  triggeredBy: string; // 'system' | userId
  eventTimestamp: string;
  entityId?: string;
  entityType?: 'task' | 'vehicle' | 'driver' | 'maintenance' | 'document' | 'schedule';
  data?: Record<string, any>;
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  executionId: string;
  status: AutomationExecutionStatus;
  conditionsPassed: boolean;
  actionResults: AutomationActionResult[];
  details: string;
  error?: string;
}
