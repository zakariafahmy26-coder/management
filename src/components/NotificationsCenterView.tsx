import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Sliders,
  Mail,
  Trash2,
  CheckCheck,
  Send,
} from 'lucide-react';
import { AppNotification, UserNotificationPreferences } from '../types';

interface NotificationsCenterViewProps {
  notifications: AppNotification[];
  preferences: UserNotificationPreferences;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDeleteNotification: (id: string) => void;
  onSavePreferences: (prefs: UserNotificationPreferences) => void;
  onSendTestNotification: () => void;
}

export const NotificationsCenterView: React.FC<NotificationsCenterViewProps> = ({
  notifications,
  preferences,
  onMarkRead,
  onMarkAllRead,
  onDeleteNotification,
  onSavePreferences,
  onSendTestNotification,
}) => {
  const [subTab, setSubTab] = useState<'all' | 'preferences'>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const [localPrefs, setLocalPrefs] = useState<UserNotificationPreferences>(preferences);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD').length;

  const filteredNotifications = notifications.filter((n) => {
    if (filterSeverity === 'UNREAD') return n.status === 'UNREAD';
    if (filterSeverity === 'URGENT') return n.severity === 'urgent';
    if (filterSeverity === 'WARNING') return n.severity === 'warning';
    return true;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePreferences(localPrefs);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              مركز التنبيهات والإشعارات التشغيلية
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              إدارة التنبيهات الفورية لحركة الأسطول، غيار الزيوت، انتهاء الرخص، وتفضيلات الإرسال
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
            <button
              onClick={() => setSubTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              التنبيهات ({notifications.length})
            </button>
            <button
              onClick={() => setSubTab('preferences')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'preferences'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              تفضيلات وقنوات التنبيه
            </button>
          </div>

          {subTab === 'all' && unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-emerald-500" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: ALL NOTIFICATIONS */}
      {subTab === 'all' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                تصفية الإشعارات:
              </span>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
              >
                <option value="ALL">جميع الإشعارات ({notifications.length})</option>
                <option value="UNREAD">غير المقروءة ({unreadCount})</option>
                <option value="URGENT">حرجة وعاجلة فقط</option>
                <option value="WARNING">تحذيرات ومخاطر</option>
              </select>
            </div>

            <button
              onClick={onSendTestNotification}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال تنبيه تجريبي</span>
            </button>
          </div>

          {/* Notification Items */}
          <div className="space-y-2">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  n.status === 'UNREAD'
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {n.severity === 'urgent' ? (
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    ) : n.severity === 'warning' ? (
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                        <Info className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {n.title}
                      </h3>
                      {n.status === 'UNREAD' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(n.createdAt).toLocaleString('ar-EG')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {n.status === 'UNREAD' && (
                    <button
                      onClick={() => onMarkRead(n.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="تحديد كمقروء"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteNotification(n.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="حذف الإشعار"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredNotifications.length === 0 && (
              <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Bell className="w-8 h-8 mx-auto opacity-30 text-indigo-500 mb-2" />
                <p className="text-sm font-semibold">لا توجد إشعارات في هذا التصنيف حالياً</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PREFERENCES */}
      {subTab === 'preferences' && (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div className="max-w-xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Sliders className="w-5 h-5 text-indigo-500" />
              <span>إعدادات وتفضيلات قنوات التنبيهات</span>
            </h2>
            <p className="text-xs text-slate-500">
              حدد العتبات الرقمية والشروط التي يتم إرسال الإشعارات والرسائل الإلكترونية بناءً عليها.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                القنوات التشغيلية
              </span>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300">الإشعارات الفورية داخل المنصة</span>
                <input
                  type="checkbox"
                  checked={localPrefs.inAppAlerts}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, inAppAlerts: e.target.checked })}
                  className="rounded text-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300">رسائل البريد الإلكتروني العاجلة</span>
                <input
                  type="checkbox"
                  checked={localPrefs.emailAlerts}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, emailAlerts: e.target.checked })}
                  className="rounded text-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300">تنبيهات تأخر المهام والشحنات</span>
                <input
                  type="checkbox"
                  checked={localPrefs.notifyOnTaskDelay}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, notifyOnTaskDelay: e.target.checked })}
                  className="rounded text-indigo-600"
                />
              </label>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                العتبات الرقمية للتنبيه
              </span>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  عتبة التنبيه قبل موعد غيار الزيت (بالكيلومتر)
                </label>
                <input
                  type="number"
                  value={localPrefs.oilAlertThresholdKm}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, oilAlertThresholdKm: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  عتبة التنبيه قبل انتهاء الرخص والوثائق (بالأيام)
                </label>
                <input
                  type="number"
                  value={localPrefs.documentAlertDays}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, documentAlertDays: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم حفظ التفضيلات بنجاح</span>
              </span>
            )}
            <button
              type="submit"
              className="px-6 py-2 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-900/20"
            >
              حفظ التفضيلات
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
