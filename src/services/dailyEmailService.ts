import { DailyEmailConfig, DailyEmailLog } from '../types';
import { DailyReportDataPayload, generateDailyEmailPlainText } from './dailyEmailTemplate';
import { auth } from './firebase';
import { getCompanySettings, saveCompanySettings, DEFAULT_COMPANY_ID } from './firestoreService';

const LOCAL_CACHE_KEY_CONFIG = 'fleet_daily_email_config_cache';
const LOCAL_CACHE_KEY_LOGS = 'fleet_daily_email_logs_cache';
const DEFAULT_FALLBACK_RECIPIENT = (import.meta.env.VITE_NOTIFICATION_EMAIL || '').trim() || 'operations@company.com';

export const DEFAULT_DAILY_EMAIL_CONFIG: DailyEmailConfig = {
  enabled: true,
  scheduleHour: 17, // 5:00 PM end of factory shift
  scheduleMinute: 0,
  recipients: [DEFAULT_FALLBACK_RECIPIENT],
  ccRecipients: [],
  includeAISummary: true,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpUser: '',
  status: 'active',
};

/**
 * Generates a direct web Gmail compose URL pre-populated with recipient and text summary
 */
export const generateGmailComposeLink = (
  payload: DailyReportDataPayload,
  recipients: string[]
): string => {
  const to = encodeURIComponent((recipients && recipients.length > 0 ? recipients : [DEFAULT_FALLBACK_RECIPIENT]).join(','));
  const dateStr = payload.reportDate || new Date().toISOString().split('T')[0];
  const subject = encodeURIComponent(`🚚 تقرير أسطول مصنع برج العرب اليومي المجمع - ${dateStr}`);
  const plainText = generateDailyEmailPlainText(payload);
  const body = encodeURIComponent(plainText);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
};

/**
 * Sync latest fleet data snapshot to server backend so background scheduler can dispatch even when client is closed
 */
export const syncFleetStateToServer = async (payload: DailyReportDataPayload): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    await fetch('/api/email/sync-state', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Non-blocking sync
  }
};

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
    console.warn('Notice getting auth token for email service:', e);
  }
  return headers;
}

/**
 * Returns cached or default daily email config synchronously
 */
export const getCachedDailyEmailConfig = (): DailyEmailConfig => {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      const hour = typeof parsed?.scheduleHour === 'number' && Number.isFinite(parsed.scheduleHour)
        ? parsed.scheduleHour
        : DEFAULT_DAILY_EMAIL_CONFIG.scheduleHour;
      const minute = typeof parsed?.scheduleMinute === 'number' && Number.isFinite(parsed.scheduleMinute)
        ? parsed.scheduleMinute
        : DEFAULT_DAILY_EMAIL_CONFIG.scheduleMinute;
      return {
        ...DEFAULT_DAILY_EMAIL_CONFIG,
        ...parsed,
        scheduleHour: hour,
        scheduleMinute: minute,
        recipients: Array.isArray(parsed?.recipients) && parsed.recipients.length > 0
          ? parsed.recipients
          : DEFAULT_DAILY_EMAIL_CONFIG.recipients,
      };
    }
  } catch {}
  return DEFAULT_DAILY_EMAIL_CONFIG;
};

/**
 * Loads Email Configuration authoritatively from Firestore (companies/{companyId}/settings/email)
 */
export const getStoredDailyEmailConfig = async (companyId: string = DEFAULT_COMPANY_ID): Promise<DailyEmailConfig> => {
  try {
    // 1. Try Firestore direct
    const cloudDoc = await getCompanySettings(companyId, 'email');
    if (cloudDoc) {
      const parsedHour = cloudDoc.sendTime ? parseInt(cloudDoc.sendTime.split(':')[0], 10) : 17;
      const parsedMinute = cloudDoc.sendTime ? parseInt(cloudDoc.sendTime.split(':')[1], 10) : 0;
      const merged: DailyEmailConfig = {
        enabled: cloudDoc.dailyReportEnabled ?? true,
        scheduleHour: Number.isFinite(parsedHour) ? parsedHour : 17,
        scheduleMinute: Number.isFinite(parsedMinute) ? parsedMinute : 0,
        recipients: Array.isArray(cloudDoc.recipientEmails) && cloudDoc.recipientEmails.length > 0
          ? cloudDoc.recipientEmails
          : [DEFAULT_FALLBACK_RECIPIENT],
        ccRecipients: Array.isArray(cloudDoc.ccRecipients) ? cloudDoc.ccRecipients : [],
        includeAISummary: cloudDoc.includeAISummary ?? true,
        smtpHost: cloudDoc.smtpHost || 'smtp.gmail.com',
        smtpPort: cloudDoc.smtpPort || 465,
        smtpUser: cloudDoc.smtpUser || '',
        status: cloudDoc.status || 'active',
        lastSentDate: cloudDoc.lastSentDate,
        lastSentTimestamp: cloudDoc.lastSentAt,
      };
      try {
        localStorage.setItem(LOCAL_CACHE_KEY_CONFIG, JSON.stringify(merged));
      } catch (e) {}
      return merged;
    }

    // 2. Try Backend API
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/config', { headers });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success && json.data) {
      const data = json.data;
      const parsedHour = data.sendTime ? parseInt(data.sendTime.split(':')[0], 10) : 17;
      const parsedMinute = data.sendTime ? parseInt(data.sendTime.split(':')[1], 10) : 0;
      const merged: DailyEmailConfig = {
        enabled: data.dailyReportEnabled ?? true,
        scheduleHour: Number.isFinite(parsedHour) ? parsedHour : 17,
        scheduleMinute: Number.isFinite(parsedMinute) ? parsedMinute : 0,
        recipients: Array.isArray(data.recipientEmails) && data.recipientEmails.length > 0
          ? data.recipientEmails
          : [DEFAULT_FALLBACK_RECIPIENT],
        ccRecipients: Array.isArray(data.ccRecipients) ? data.ccRecipients : [],
        includeAISummary: true,
        smtpHost: data.smtpHost || 'smtp.gmail.com',
        smtpPort: data.smtpPort || 465,
        smtpUser: data.smtpUser || '',
        status: data.status || 'active',
        lastSentDate: data.lastSentDate,
        lastSentTimestamp: data.lastSentAt,
      };
      try {
        localStorage.setItem(LOCAL_CACHE_KEY_CONFIG, JSON.stringify(merged));
      } catch (e) {}
      return merged;
    }
  } catch (e) {
    console.warn('Error loading email config from cloud:', e);
  }

  // Fallback to local cache or defaults
  return getCachedDailyEmailConfig();
};

/**
 * Saves Email Configuration authoritatively to Firestore
 */
export const saveStoredDailyEmailConfig = async (
  config: DailyEmailConfig,
  companyId: string = DEFAULT_COMPANY_ID
): Promise<void> => {
  const sendTime = `${String(config.scheduleHour).padStart(2, '0')}:${String(config.scheduleMinute).padStart(2, '0')}`;
  const firestorePayload = {
    dailyReportEnabled: config.enabled,
    recipientEmails: config.recipients,
    ccRecipients: config.ccRecipients || [],
    sendTime,
    smtpHost: config.smtpHost || 'smtp.gmail.com',
    smtpPort: config.smtpPort || 465,
    smtpUser: config.smtpUser || '',
    smtpPass: config.smtpPass || undefined,
    status: config.status || 'active',
  };

  try {
    // 1. Save directly to Firestore
    await saveCompanySettings(companyId, 'email', firestorePayload);

    // 2. Also inform server API with auth headers
    const headers = await getAuthHeaders();
    await fetch('/api/email/config', {
      method: 'POST',
      headers,
      body: JSON.stringify(firestorePayload),
    }).catch(() => {});

    // 3. Update non-sensitive local cache
    try {
      const sanitized = { ...config, smtpPass: undefined };
      localStorage.setItem(LOCAL_CACHE_KEY_CONFIG, JSON.stringify(sanitized));
    } catch {}
  } catch (e) {
    console.error('Error saving email config to cloud:', e);
  }
};

export const getStoredDailyEmailLogs = (): DailyEmailLog[] => {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading daily email logs:', e);
  }
  return [];
};

export const saveStoredDailyEmailLog = (log: DailyEmailLog): void => {
  try {
    const logs = getStoredDailyEmailLogs();
    const updated = [log, ...logs.filter((l) => l.id !== log.id)].slice(0, 30);
    localStorage.setItem(LOCAL_CACHE_KEY_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving email log:', e);
  }
};

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  recipients: string[];
  date: string;
  error?: string;
  html?: string;
  provider?: string;
  isTest?: boolean;
}

export interface EmailTestResult {
  success: boolean;
  provider: string;
  messageId: string | null;
  timestamp: string;
  error: string | null;
}

/**
 * Trigger a real end-to-end email test to the recipient via server
 */
export const testEmailSend = async (targetEmail?: string): Promise<EmailTestResult> => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/test', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetEmail }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      return {
        success: false,
        provider: 'smtp',
        messageId: null,
        timestamp: new Date().toISOString(),
        error: json.error?.message || `فشل إرسال الإيميل التجريبي (HTTP ${res.status})`,
      };
    }

    return {
      success: true,
      provider: 'smtp',
      messageId: json.data?.messageId || 'sent',
      timestamp: new Date().toISOString(),
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      provider: 'network-error',
      messageId: null,
      timestamp: new Date().toISOString(),
      error: err?.message || 'تعذر الاتصال بالخادم لإجراء فحص الإرسال',
    };
  }
};

/**
 * Trigger immediate dispatch of the End-of-Day report email
 */
export const sendDailyEmailNow = async (
  payload: DailyReportDataPayload,
  recipientsOverride?: string[]
): Promise<SendEmailResult> => {
  const dateStr = payload.reportDate || new Date().toISOString().split('T')[0];

  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/send-daily-report', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        date: dateStr,
        recipientsOverride,
        payload,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      return {
        success: false,
        recipients: recipientsOverride || [DEFAULT_FALLBACK_RECIPIENT],
        date: dateStr,
        error: json.error?.message || 'فشل إرسال تقرير اليوم المجمع',
      };
    }

    return {
      success: true,
      messageId: json.data?.messageId,
      recipients: json.data?.recipients || recipientsOverride || [DEFAULT_FALLBACK_RECIPIENT],
      date: dateStr,
    };
  } catch (err: any) {
    return {
      success: false,
      recipients: recipientsOverride || [DEFAULT_FALLBACK_RECIPIENT],
      date: dateStr,
      error: err?.message || 'فشل الاتصال بالخادم لإرسال التقرير',
    };
  }
};
