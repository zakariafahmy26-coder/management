import { auth } from './firebase';
import { AutomationTrigger, AutomationExecution } from '../types';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    console.warn('Could not get auth token for automation service:', e);
  }
  return headers;
}

export const automationService = {
  /**
   * Dispatches an event to the server-side automation engine
   */
  async triggerAutomation(params: {
    trigger: AutomationTrigger;
    entityId?: string;
    entityType?: 'task' | 'vehicle' | 'driver' | 'maintenance' | 'document' | 'schedule';
    data?: Record<string, any>;
  }): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/automation/trigger', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || 'فشل تشغيل الأتمتة على الخادم');
      }
      return json.data;
    } catch (err) {
      console.warn('Automation trigger error:', err);
      return null;
    }
  },

  /**
   * Executes a specific rule on the server (manual execution / test)
   */
  async executeRule(ruleId: string, contextData?: Record<string, any>): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/automation/execute-rule', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ruleId, contextData }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.error?.message || 'فشل تشغيل القاعدة على الخادم');
    }
    return json.data?.result;
  },

  /**
   * Retries a failed or partial automation execution on the server
   */
  async retryExecution(executionId: string): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/automation/retry-execution', {
      method: 'POST',
      headers,
      body: JSON.stringify({ executionId }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.error?.message || 'فشل إعادة محاولة تنفيذ الأتمتة على الخادم');
    }
    return json.data?.result;
  },

  /**
   * Triggers the automated monthly report dispatch to all registered managers
   */
  async triggerMonthlyReport(): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/automation/trigger-monthly-report', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.error?.message || 'فشل تشغيل التقرير الشهري الآلي للمديرين');
    }
    return json.data;
  },

  /**
   * Operational Trigger Helpers
   */
  async onTaskCreated(task: any) {
    return this.triggerAutomation({
      trigger: 'TASK_CREATED',
      entityId: task.id,
      entityType: 'task',
      data: { ...task, title: task.title, status: task.status, priority: task.priority },
    });
  },

  async onTaskAssigned(task: any, driverId?: string, vehicleId?: string) {
    return this.triggerAutomation({
      trigger: 'TASK_ASSIGNED',
      entityId: task.id,
      entityType: 'task',
      data: {
        ...task,
        assignedDriverId: driverId || task.assignedDriverId,
        assignedVehicleId: vehicleId || task.assignedVehicleId,
        driverId: driverId || task.assignedDriverId,
        vehicleId: vehicleId || task.assignedVehicleId,
      },
    });
  },

  async onTaskStarted(task: any) {
    return this.triggerAutomation({
      trigger: 'TASK_STARTED',
      entityId: task.id,
      entityType: 'task',
      data: { ...task, status: 'IN_PROGRESS' },
    });
  },

  async onTaskCompleted(task: any) {
    return this.triggerAutomation({
      trigger: 'TASK_COMPLETED',
      entityId: task.id,
      entityType: 'task',
      data: { ...task, status: 'COMPLETED' },
    });
  },

  async onTaskDelayed(task: any, delayMinutes: number = 30) {
    return this.triggerAutomation({
      trigger: 'TASK_DELAYED',
      entityId: task.id,
      entityType: 'task',
      data: { ...task, delayMinutes, isDelayed: true },
    });
  },

  async onTaskCancelled(task: any, reason?: string) {
    return this.triggerAutomation({
      trigger: 'TASK_CANCELLED',
      entityId: task.id,
      entityType: 'task',
      data: { ...task, status: 'CANCELLED', cancellationReason: reason || '' },
    });
  },

  async onVehicleMaintenanceDue(vehicle: any, remainingKm?: number) {
    return this.triggerAutomation({
      trigger: 'VEHICLE_MAINTENANCE_DUE',
      entityId: vehicle.id,
      entityType: 'vehicle',
      data: { ...vehicle, remainingKm, title: `صيانة دورية للمركبة ${vehicle.plateNumber || vehicle.id}` },
    });
  },

  async onDocumentExpiring(doc: any, remainingDays?: number) {
    return this.triggerAutomation({
      trigger: 'VEHICLE_DOCUMENT_EXPIRING',
      entityId: doc.id,
      entityType: 'document',
      data: { ...doc, remainingDays, title: `وثيقة قريبة من الانتهاء (${doc.title})` },
    });
  },

  async onDriverLicenseExpiring(driver: any, remainingDays?: number) {
    return this.triggerAutomation({
      trigger: 'DRIVER_LICENSE_EXPIRING',
      entityId: driver.id,
      entityType: 'driver',
      data: { ...driver, remainingDays, title: `رخصة قيادة قريبة من الانتهاء (${driver.name})` },
    });
  },

  /**
   * Fetches latest execution logs from server
   */
  async getExecutions(): Promise<AutomationExecution[]> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/automation/executions', {
        method: 'GET',
        headers,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        return [];
      }
      return json.data?.executions || [];
    } catch (e) {
      console.warn('Could not fetch automation executions:', e);
      return [];
    }
  },
};
