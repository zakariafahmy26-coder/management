import { Vehicle, UserProfile } from '../types';
import { saveNotificationToCloud } from './firestoreService';

export type NotificationType = 'oil' | 'reminder' | 'trip' | 'maintenance' | 'license';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: NotificationType;
  read: boolean;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  severity?: 'urgent' | 'warning' | 'normal';
  remainingKm?: number;
  currentOdometer?: number;
  targetKm?: number;
}

const STORAGE_KEY_SETTINGS = 'fleet_notification_settings_v2';
const STORAGE_KEY_LOGS = 'fleet_notification_logs_v2';

export interface NotificationSettings {
  enabled: boolean;
  dailyReminderHour: number; // 0-23
  dailyReminderMinute: number; // 0-59
  soundEnabled: boolean;
  remindTrips: boolean;
  remindMaintenance: boolean;
  lastFiredDate?: string;
  
  // Push Notification settings for Oil Change Limit
  oilAlertsEnabled: boolean;
  oilAlertThresholdKm: number; // e.g. 500 km
  oilSoundEnabled: boolean;
  oilVibrationEnabled: boolean;
  notifiedVehicles?: Record<
    string,
    {
      lastOdometerNotified: number;
      timestamp: string;
      isUrgent: boolean;
    }
  >;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  dailyReminderHour: 16, // 4:00 PM
  dailyReminderMinute: 0,
  soundEnabled: true,
  remindTrips: true,
  remindMaintenance: true,
  oilAlertsEnabled: true,
  oilAlertThresholdKm: 500, // 500 كم قبل موعد الزيت
  oilSoundEnabled: true,
  oilVibrationEnabled: true,
  notifiedVehicles: {},
};

export const getStoredNotificationSettings = (): NotificationSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Error loading notification settings:', e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
};

export const saveStoredNotificationSettings = (settings: NotificationSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving notification settings:', e);
  }
};

export const getStoredNotificationLogs = (): NotificationItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: 'notif-init-1',
      title: '🚚 نظام إشعارات أسطول المصنع جاهز',
      body: 'نظام تنبيهات دفع تغيير الزيت والرحلات مفعل لمدير الأسطول.',
      timestamp: new Date().toISOString(),
      type: 'oil',
      read: false,
    },
  ];
};

export const saveStoredNotificationLogs = (logs: NotificationItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs.slice(0, 60)));
  } catch (e) {
    console.error(e);
  }
};

/**
 * Request Push Notification permission from the browser / smartphone
 */
export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return 'default';
  }
};

/**
 * Synthesizer Sound generator: Audio chime or warning alarm
 */
export const playNotificationSound = (type: NotificationType = 'reminder', isUrgent: boolean = false) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'oil') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isUrgent) {
        // High-urgency alert siren: 900Hz -> 650Hz -> 900Hz
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.65);
      } else {
        // Proximity warning chime: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5)
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.55);
      }
    } else {
      // General reminder sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // Web Audio may be restricted until user interacts with document
  }
};

/**
 * Trigger Physical Vibration on Android Smartphones / Mobile Devices
 */
export const triggerDeviceVibration = (isUrgent: boolean = false) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (isUrgent) {
        // Urgent pattern: Vibrate 350ms, pause 100ms, vibrate 350ms, pause 100ms, vibrate 500ms
        navigator.vibrate([350, 100, 350, 100, 500]);
      } else {
        // Proximity warning pattern: Vibrate 200ms, pause 100ms, vibrate 200ms
        navigator.vibrate([250, 120, 250]);
      }
    } catch (e) {
      console.warn('Device vibration not permitted:', e);
    }
  }
};

/**
 * Dispatch Push Notification directly to manager's phone and browser
 */
export const dispatchNotification = async (
  title: string,
  body: string,
  type: NotificationType = 'reminder',
  onInAppBanner?: (title: string, body: string, vehicleId?: string) => void,
  meta?: {
    vehicleId?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    severity?: 'urgent' | 'warning' | 'normal';
    remainingKm?: number;
    currentOdometer?: number;
    targetKm?: number;
  }
): Promise<NotificationItem> => {
  const settings = getStoredNotificationSettings();
  const isUrgent = meta?.severity === 'urgent';

  const newItem: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    body,
    timestamp: new Date().toISOString(),
    type,
    read: false,
    vehicleId: meta?.vehicleId,
    vehiclePlate: meta?.vehiclePlate,
    vehicleModel: meta?.vehicleModel,
    severity: meta?.severity || 'normal',
    remainingKm: meta?.remainingKm,
    currentOdometer: meta?.currentOdometer,
    targetKm: meta?.targetKm,
  };

  // 1. Trigger Sound
  if (type === 'oil' ? settings.oilSoundEnabled : settings.soundEnabled) {
    playNotificationSound(type, isUrgent);
  }

  // 2. Physical Smartphone Vibration
  if (type === 'oil' ? settings.oilVibrationEnabled : true) {
    triggerDeviceVibration(isUrgent);
  }

  // 3. Web Push / ServiceWorker native mobile notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      // Check if Service Worker registration is active (best for mobile PWA push)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready.catch(() => null);
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/favicon.ico',
            tag: meta?.vehicleId ? `oil-alert-${meta.vehicleId}` : `fleet-notif-${Date.now()}`,
            vibrate: isUrgent ? [350, 100, 350, 100, 500] : [250, 120, 250],
            data: {
              vehicleId: meta?.vehicleId,
              type,
              url: '/',
            },
            requireInteraction: isUrgent,
          });
        } else {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
            tag: meta?.vehicleId ? `oil-alert-${meta.vehicleId}` : `fleet-notif-${Date.now()}`,
          });
        }
      } else {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          tag: meta?.vehicleId ? `oil-alert-${meta.vehicleId}` : `fleet-notif-${Date.now()}`,
        });
      }
    } catch (e) {
      console.warn('Native notification failed or restricted:', e);
    }
  }

  // 4. Trigger In-App Banner for immediate screen display
  if (onInAppBanner) {
    onInAppBanner(title, body, meta?.vehicleId);
  }

  // 5. Save in local notification logs
  const logs = getStoredNotificationLogs();
  saveStoredNotificationLogs([newItem, ...logs]);

  // 6. Save in Cloud Firestore so all fleet managers receive it across devices
  try {
    await saveNotificationToCloud(newItem);
  } catch (err) {
    // Cloud sync optional
  }

  return newItem;
};

/**
 * Scan all fleet vehicles and dispatch push notifications for trucks approaching oil limit
 */
export const scanAndDispatchOilAlerts = async (
  vehicles: Vehicle[],
  userProfile?: UserProfile | null,
  onInAppBanner?: (title: string, body: string, vehicleId?: string) => void,
  forceCheck: boolean = false
): Promise<NotificationItem[]> => {
  const settings = getStoredNotificationSettings();
  if (!settings.enabled || !settings.oilAlertsEnabled) {
    return [];
  }

  // Fleet Managers & Administrators are the primary recipients
  const isManagerOrAdmin =
    !userProfile ||
    userProfile.role === 'admin' ||
    userProfile.role === 'manager' ||
    userProfile.role === 'operation' ||
    userProfile.role === 'maintenance';

  if (!isManagerOrAdmin) {
    return [];
  }

  const thresholdKm = settings.oilAlertThresholdKm || 500;
  const notifiedMap = { ...(settings.notifiedVehicles || {}) };
  const dispatchedNotifications: NotificationItem[] = [];
  let hasUpdatedMap = false;

  for (const veh of vehicles) {
    if (!veh.nextOilChangeKm || veh.nextOilChangeKm <= 0) continue;

    const remainingKm = veh.nextOilChangeKm - veh.currentOdometer;
    const isOverdue = remainingKm <= 0;
    const isApproaching = remainingKm > 0 && remainingKm <= thresholdKm;

    if (!isOverdue && !isApproaching) {
      // Vehicle is safely within oil limit; clear previous notification flag if odometer reset
      if (notifiedMap[veh.id] && remainingKm > thresholdKm + 500) {
        delete notifiedMap[veh.id];
        hasUpdatedMap = true;
      }
      continue;
    }

    const previousRecord = notifiedMap[veh.id];
    let shouldNotify = false;

    if (forceCheck) {
      shouldNotify = true;
    } else if (!previousRecord) {
      shouldNotify = true;
    } else {
      // Escalate from warning to overdue
      if (!previousRecord.isUrgent && isOverdue) {
        shouldNotify = true;
      }
      // Re-notify if truck has driven more than 150 km since last alert
      else if (Math.abs(veh.currentOdometer - previousRecord.lastOdometerNotified) >= 150) {
        shouldNotify = true;
      }
      // Re-notify if more than 24 hours passed for an overdue truck
      else if (isOverdue) {
        const lastDate = new Date(previousRecord.timestamp).getTime();
        const now = Date.now();
        if (now - lastDate > 24 * 60 * 60 * 1000) {
          shouldNotify = true;
        }
      }
    }

    if (shouldNotify) {
      let title = '';
      let body = '';

      if (isOverdue) {
        title = `🚨 تنبيه دفع عاجل لمدير الأسطول: تجاوز موعد تغيير الزيت (${veh.plateNumber})`;
        body = `شاحنة ${veh.model} (${veh.code || veh.plateNumber}) تجاوزت حد تغيير الزيت بـ ${Math.abs(
          remainingKm
        ).toLocaleString('ar-EG')} كم! (العداد الحالي: ${veh.currentOdometer.toLocaleString(
          'ar-EG'
        )} كم - المستهدف: ${veh.nextOilChangeKm.toLocaleString(
          'ar-EG'
        )} كم). يرجى التوجيه للصيانة فوراً.`;
      } else {
        title = `⚠️ تنبيه دفع لمدير الأسطول: اقتراب موعد تغيير الزيت (${veh.plateNumber})`;
        body = `شاحنة ${veh.model} (${veh.code || veh.plateNumber}) اقتربت من حد تغيير الزيت! متبقي فقط ${remainingKm.toLocaleString(
          'ar-EG'
        )} كم على موعد التغيير (العداد الحالي: ${veh.currentOdometer.toLocaleString(
          'ar-EG'
        )} كم - المستهدف: ${veh.nextOilChangeKm.toLocaleString('ar-EG')} كم).`;
      }

      const notif = await dispatchNotification(
        title,
        body,
        'oil',
        onInAppBanner,
        {
          vehicleId: veh.id,
          vehiclePlate: veh.plateNumber,
          vehicleModel: veh.model,
          severity: isOverdue ? 'urgent' : 'warning',
          remainingKm,
          currentOdometer: veh.currentOdometer,
          targetKm: veh.nextOilChangeKm,
        }
      );

      dispatchedNotifications.push(notif);

      notifiedMap[veh.id] = {
        lastOdometerNotified: veh.currentOdometer,
        timestamp: new Date().toISOString(),
        isUrgent: isOverdue,
      };
      hasUpdatedMap = true;
    }
  }

  if (hasUpdatedMap) {
    saveStoredNotificationSettings({
      ...settings,
      notifiedVehicles: notifiedMap,
    });
  }

  return dispatchedNotifications;
};

/**
 * Send an instant sample oil change push notification to test phone reception
 */
export const sendTestOilPushNotification = async (
  onInAppBanner?: (title: string, body: string, vehicleId?: string) => void,
  sampleVehicle?: Vehicle
): Promise<NotificationItem> => {
  const plate = sampleVehicle ? sampleVehicle.plateNumber : 'س ف ر 8923';
  const model = sampleVehicle ? sampleVehicle.model : 'شيفروليه جامبو 7000';
  const remaining = 240;

  const title = `⚠️ إشعار تجريبي لهاتف مدير الأسطول: اقتراب حد تغيير الزيت (${plate})`;
  const body = `تنبيه تجريبي: شاحنة ${model} (${plate}) تقترب من حد تغيير الزيت؛ متبقي لها ${remaining} كم فقط قبل الوصول للحد المحدد. تم التحقق من نجاح اهتزاز الهاتف والرنين.`;

  return await dispatchNotification(
    title,
    body,
    'oil',
    onInAppBanner,
    {
      vehicleId: sampleVehicle?.id || 'sample-veh-1',
      vehiclePlate: plate,
      vehicleModel: model,
      severity: 'warning',
      remainingKm: remaining,
      currentOdometer: sampleVehicle?.currentOdometer || 124760,
      targetKm: (sampleVehicle?.currentOdometer || 124760) + remaining,
    }
  );
};

