import { AutomationCondition } from '../../src/types';

function resolveFieldValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  if (path in obj) return obj[path];

  // Dot-notation resolution
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr == null) return undefined;
    curr = curr[p];
  }
  return curr;
}

export function evaluateSingleCondition(condition: AutomationCondition, data: Record<string, any>): boolean {
  const actualValue = resolveFieldValue(data, condition.field);
  const targetValue = condition.value;
  const op = String(condition.operator).toLowerCase().trim();

  switch (op) {
    case 'equals':
    case 'eq':
    case '==':
    case '===':
      return String(actualValue).toLowerCase() === String(targetValue).toLowerCase();

    case 'not equals':
    case 'neq':
    case '!=':
    case '!==':
      return String(actualValue).toLowerCase() !== String(targetValue).toLowerCase();

    case 'greater than':
    case 'greater_than':
    case 'gt':
    case '>':
      return Number(actualValue) > Number(targetValue);

    case 'less than':
    case 'less_than':
    case 'lt':
    case '<':
      return Number(actualValue) < Number(targetValue);

    case 'contains':
    case 'includes':
      if (Array.isArray(actualValue)) {
        return actualValue.includes(targetValue);
      }
      return String(actualValue || '').toLowerCase().includes(String(targetValue).toLowerCase());

    case 'in list':
    case 'in_list':
    case 'in':
      if (Array.isArray(targetValue)) {
        return targetValue.map(String).includes(String(actualValue));
      }
      if (typeof targetValue === 'string') {
        const list = targetValue.split(',').map((s) => s.trim().toLowerCase());
        return list.includes(String(actualValue).toLowerCase());
      }
      return false;

    case 'date before':
    case 'date_before':
    case 'before': {
      const actualTime = new Date(actualValue).getTime();
      const targetTime = targetValue === 'now' ? Date.now() : new Date(targetValue).getTime();
      return !isNaN(actualTime) && !isNaN(targetTime) && actualTime < targetTime;
    }

    case 'date after':
    case 'date_after':
    case 'after': {
      const actualTime = new Date(actualValue).getTime();
      const targetTime = targetValue === 'now' ? Date.now() : new Date(targetValue).getTime();
      return !isNaN(actualTime) && !isNaN(targetTime) && actualTime > targetTime;
    }

    default:
      // Fallback loose equality
      return String(actualValue) === String(targetValue);
  }
}

/**
 * Evaluates a set of conditions against contextual event data.
 * Supports AND or OR grouping.
 */
export function evaluateConditions(
  conditions: AutomationCondition[],
  data: Record<string, any>,
  groupType: 'AND' | 'OR' = 'AND'
): boolean {
  if (!conditions || conditions.length === 0) {
    return true; // No conditions means rule triggers unconditionally
  }

  if (groupType === 'OR') {
    return conditions.some((c) => evaluateSingleCondition(c, data));
  }

  // Default is AND
  return conditions.every((c) => evaluateSingleCondition(c, data));
}
