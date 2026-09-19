import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Gauge,
  Info,
  Smartphone,
  Trash2,
  Truck,
  Vibrate,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  dispatchNotification,
  getStoredNotificationLogs,
  getStoredNotificationSettings,
  NotificationItem,
  NotificationSettings,
  playNotificationSound,
  requestPushPermission,
  saveStoredNotificationLogs,
  saveStoredNotificationSettings,
  scanAndDispatchOilAlerts,
  sendTestOilPushNotification,
  triggerDeviceVibration,
} from '../services/notificationService';
import { UserProfile, Vehicle } from '../types';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerBanner: (title: string, body: string, vehicleId?: string) => void;
  vehicles?: Vehicle[];
  userProfile?: UserProfile | null;
  onOpenMaintenanceModalForVehicle?: (vehicleId: string) => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  onTriggerBanner,
  vehicles = [],
  userProfile,
  onOpenMaintenanceModalForVehicle,
}) => {
  const [settings, setSettings] = useState<NotificationSettings>(getStoredNotificationSettings);
  const [logs, setLogs] = useState<NotificationItem[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'oil' | 'daily' | 'logs'>('oil');

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredNotificationSettings());
      setLogs(getStoredNotificationLogs());
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermissionStatus(Notification.permission);
      } else {
        setPermissionStatus('unsupported');
      }
    }
  }, [isOpen]);

  // Trucks currently approaching or exceeding the oil change limit
  const approachingVehicles = useMemo(() => {
    const threshold = settings.oilAlertThresholdKm || 500;
    return vehicles
      .filter((v) => v.nextOilChangeKm && v.nextOilChangeKm > 0)
      .map((v) => {
        const remainingKm = v.nextOilChangeKm - v.currentOdometer;
        const isOverdue = remainingKm <= 0;
        const isApproaching = remainingKm > 0 && remainingKm <= threshold;
        return {
          vehicle: v,
          remainingKm,
          isOverdue,
          isApproaching,
        };
      })
      .filter((item) => item.isOverdue || item.isApproaching)
      .sort((a, b) => a.remainingKm - b.remainingKm);
  }, [vehicles, settings.oilAlertThresholdKm]);

  if (!isOpen) return null;

  const showFeedback = (message: string, type: 'success' | 'info' = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => {
      setActionFeedback(null);
    }, 3500);
  };

  const handleRequestPermission = async () => {
    const res = await requestPushPermission();
    setPermissionStatus(res);
    if (res === 'granted') {
      const updated = { ...settings, enabled: true, oilAlertsEnabled: true };
      setSettings(updated);
      saveStoredNotificationSettings(updated);
      showFeedback('تم منح إذن الإشعارات بنجاح! تم تفعيل تنبيهات دفع تغيير الزيت للهاتف.');
      // Send a confirmation test push
      await sendTestOilPushNotification(onTriggerBanner);
      setLogs(getStoredNotificationLogs());
    } else if (res === 'denied') {
      showFeedback('تم حظر الإشعارات بالمتصفح. ستظهر التنبيهات داخل التطبيق فقط.', 'info');
    }
  };

  const handleToggleOilAlerts = () => {
    const updated = { ...settings, oilAlertsEnabled: !settings.oilAlertsEnabled };
    setSettings(updated);
    saveStoredNotificationSettings(updated);
    showFeedback(
      updated.oilAlertsEnabled
        ? 'تم تفعيل نظام إشعارات دفع الزيت لمدير الأسطول'
        : 'تم إيقاف إشعارات دفع الزيت مؤقتاً'
    );
  };

  const handleThresholdSelect = (thresholdKm: number) => {
    const updated = { ...settings, oilAlertThresholdKm: thresholdKm };
    setSettings(updated);
    saveStoredNotificationSettings(updated);
    showFeedback(`تم ضبط حد التنبيه على ${thresholdKm.toLocaleString('ar-EG')} كم قبل موعد الزيت`);
  };

  const handleToggleVibration = () => {
    const updated = { ...settings, oilVibrationEnabled: !settings.oilVibrationEnabled };
    setSettings(updated);
    saveStoredNotificationSettings(updated);
    if (updated.oilVibrationEnabled) {
      triggerDeviceVibration(false);
      showFeedback('تم تفعيل اهتزاز الهاتف عند التنبيه');
    } else {
      showFeedback('تم تعطيل اهتزاز الهاتف');
    }
  };

  const handleToggleOilSound = () => {
    const updated = { ...settings, oilSoundEnabled: !settings.oilSoundEnabled };
    setSettings(updated);
    saveStoredNotificationSettings(updated);
    if (updated.oilSoundEnabled) {
      playNotificationSound('oil', false);
      showFeedback('تم تفعيل نغمة الإنذار الصوتية للزيت');
    } else {
      showFeedback('تم تعطيل الصوت للزيت');
    }
  };

  const handleSendInstantTest = async () => {
    const sampleVeh = vehicles.length > 0 ? vehicles[0] : undefined;
    await sendTestOilPushNotification(onTriggerBanner, sampleVeh);
    setLogs(getStoredNotificationLogs());
    showFeedback('تم إرسال إشعار دفع تجريبي لهاتف مدير الأسطول مع نغمة التنبيه والاهتزاز!');
  };

  const handleScanFleetNow = async () => {
    const dispatched = await scanAndDispatchOilAlerts(vehicles, userProfile, onTriggerBanner, true);
    setLogs(getStoredNotificationLogs());
    if (dispatched.length > 0) {
      showFeedback(
        `تم فحص الأسطول بنجاح: تم إرسال ${dispatched.length} إشعار دفع فوري للشاحنات المستحقة!`
      );
    } else {
      showFeedback('كافة شاحنات وسيارات الأسطول تعمل بمسافات زيت آمنة حالياً دون تجاوز.', 'info');
    }
  };

  const handleToggleDailyEnabled = () => {
    const updated = { ...settings, enabled: !settings.enabled };
    setSettings(updated);
    saveStoredNotificationSettings(updated);
  };

  const handleTimeChange = (timeString: string) => {
    const [h, m] = timeString.split(':').map(Number);
    const updated = {
      ...settings,
      dailyReminderHour: isNaN(h) ? 16 : h,
      dailyReminderMinute: isNaN(m) ? 0 : m,
    };
    setSettings(updated);
    saveStoredNotificationSettings(updated);
  };

  const handleClearLogs = () => {
    saveStoredNotificationLogs([]);
    setLogs([]);
    showFeedback('تم مسح سجل التنبيهات');
  };

  const formattedTime = `${String(settings.dailyReminderHour).padStart(2, '0')}:${String(
    settings.dailyReminderMinute
  ).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-700/70 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600/30 via-slate-800 to-slate-900 border-b border-slate-700/80 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>نظام إشعارات الدفع (Push Notifications)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  خاص بمدير الأسطول
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                إرسال تنبيهات لحظية لهاتف المدير عند اقتراب أي شاحنة من حد الكيلومترات لتغيير الزيت
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action feedback toast */}
        {actionFeedback && (
          <div
            className={`px-4 py-2 text-xs font-bold flex items-center gap-2 transition-all ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-b border-emerald-800/60'
                : 'bg-blue-950/90 text-blue-300 border-b border-blue-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* Sub-tabs for switching between Oil Push alerts, Daily reminders, and Logs */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-2 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('oil')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'oil'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>تنبيهات دفع زيت الشاحنات</span>
            {approachingVehicles.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeSubTab === 'oil' ? 'bg-slate-950 text-amber-300' : 'bg-rose-600 text-white'
                }`}
              >
                {approachingVehicles.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('daily')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'daily'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>التذكير اليومي الروتيني</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>سجل الإشعارات ({logs.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Permission Status Banner */}
          <div className="p-3.5 rounded-xl border flex items-center justify-between bg-slate-800/70 border-slate-700">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block text-xs">
                  تصريح إشعارات الهاتف والمتصفح (Push Permission):
                </span>
                <span className="text-[11px] text-slate-400">
                  {permissionStatus === 'granted'
                    ? 'مفعل وجاهز لإرسال إشعارات الدفع لشاشة الهاتف والمتصفح'
                    : permissionStatus === 'denied'
                    ? 'محظور من إعدادات المتصفح (سيتم الاكتفاء بالتنبيه الصوتي والشاشة)'
                    : 'يتطلب النقر لتفعيل استقبال الإشعارات على الهاتف'}
                </span>
              </div>
            </div>

            {permissionStatus !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer shadow-sm shrink-0"
              >
                تفعيل الإذن بالهاتف
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-600/40 shrink-0">
                <Check className="w-3.5 h-3.5" />
                <span>مفعل وجاهز</span>
              </span>
            )}
          </div>

          {/* TAB 1: OIL PUSH ALERTS */}
          {activeSubTab === 'oil' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Main Toggle Card */}
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>نظام إرسال تنبيهات دفع زيت الشاحنات لمدير الأسطول</span>
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      يقوم النظام أوتوماتيكياً بفحص عدادات الشاحنات وإرسال إشعار دفع لهاتفك عند اقتراب موعد تغيير الزيت
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleOilAlerts}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      settings.oilAlertsEnabled ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-sm transition duration-200 ease-in-out ${
                        settings.oilAlertsEnabled ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {settings.oilAlertsEnabled && (
                  <div className="pt-3 border-t border-slate-700/60 space-y-3">
                    {/* Threshold selector */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-amber-400" />
                        <span>حد الكيلومترات للتنبيه قبل موعد تغيير الزيت:</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[300, 500, 800, 1000].map((threshold) => (
                          <button
                            key={threshold}
                            type="button"
                            onClick={() => handleThresholdSelect(threshold)}
                            className={`py-2 px-3 rounded-lg border font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center ${
                              settings.oilAlertThresholdKm === threshold
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span>{threshold.toLocaleString('ar-EG')} كم</span>
                            <span className="text-[10px] opacity-80">
                              {threshold === 500 ? '(الموصى به)' : 'قبل الموعد'}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        سيتم إرسال إشعار دفع عندما يتبقى للشاحنة {settings.oilAlertThresholdKm || 500} كم أو أقل للوصول لحد الزيت القادم.
                      </p>
                    </div>

                    {/* Sound and Vibration Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Vibration */}
                      <button
                        type="button"
                        onClick={handleToggleVibration}
                        className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          settings.oilVibrationEnabled
                            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Vibrate className="w-4 h-4 text-amber-400" />
                          <span>اهتزاز الهاتف عند التنبيه</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            settings.oilVibrationEnabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {settings.oilVibrationEnabled ? 'مفعل' : 'معطل'}
                        </span>
                      </button>

                      {/* Sound */}
                      <button
                        type="button"
                        onClick={handleToggleOilSound}
                        className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          settings.oilSoundEnabled
                            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {settings.oilSoundEnabled ? (
                            <Volume2 className="w-4 h-4 text-amber-400" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-slate-500" />
                          )}
                          <span>نغمة إنذار صوتية مميزة</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            settings.oilSoundEnabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {settings.oilSoundEnabled ? 'مفعل' : 'صامت'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Scan Now & Test Push */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleSendInstantTest}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer border border-slate-700 flex items-center justify-center gap-2 shadow-xs"
                >
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>تجربة إشعار فوري لهاتف المدير</span>
                </button>

                <button
                  type="button"
                  onClick={handleScanFleetNow}
                  className="p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
                >
                  <Zap className="w-4 h-4" />
                  <span>فحص شاحنات الأسطول الآن وإرسال التنبيهات</span>
                </button>
              </div>

              {/* Current Approaching Trucks List */}
              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span>
                      الشاحنات والسيارات التي تقترب من حد الزيت حالياً ({approachingVehicles.length})
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    الحد المستهدف: {settings.oilAlertThresholdKm || 500} كم
                  </span>
                </div>

                {approachingVehicles.length === 0 ? (
                  <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-700/40 text-center text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                    <span className="font-bold block">كافة شاحنات الأسطول في حالة آمنة</span>
                    <span className="text-[11px] opacity-80">
                      لا توجد أي شاحنة حالياً اقتربت من حد تغيير الزيت المحدد
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {approachingVehicles.map(({ vehicle: v, remainingKm, isOverdue }) => (
                      <div
                        key={v.id}
                        className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                          isOverdue
                            ? 'bg-rose-950/50 border-rose-600/70 text-rose-100'
                            : 'bg-amber-950/40 border-amber-600/60 text-amber-100'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs">{v.plateNumber}</span>
                            <span className="text-[11px] text-slate-300 truncate">({v.model})</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                isOverdue ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                              }`}
                            >
                              {isOverdue ? 'تجاوزت الحد (متأخر)' : 'تقترب من الحد'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 flex items-center gap-3">
                            <span>العداد الحالي: {v.currentOdometer.toLocaleString('ar-EG')} كم</span>
                            <span>المستهدف: {v.nextOilChangeKm.toLocaleString('ar-EG')} كم</span>
                            <span className="font-bold text-amber-300">
                              {isOverdue
                                ? `متأخر بـ ${Math.abs(remainingKm).toLocaleString('ar-EG')} كم`
                                : `متبقي ${remainingKm.toLocaleString('ar-EG')} كم`}
                            </span>
                          </div>
                        </div>

                        {onOpenMaintenanceModalForVehicle && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenMaintenanceModalForVehicle(v.id);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>تسجيل صيانة</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DAILY SCHEDULE REMINDERS */}
          {activeSubTab === 'daily' && (
            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">
                    التذكير اليومي الروتيني للورديات
                  </span>
                  <span className="text-[11px] text-slate-400">
                    إرسال إشعار تذكير يومي في موعد محدد لمراجعة المهام المسجلة وإدخال خطوط السير
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleDailyEnabled}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    settings.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                      settings.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {settings.enabled && (
                <div className="pt-3 border-t border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>توقيت التنبيه اليومي:</span>
                    </label>
                    <input
                      type="time"
                      value={formattedTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      الموعد المقترح: 16:00 (قبل انتهاء وردية النهار لمراجعة خطوط السير)
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>صوت الرنين:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settings, soundEnabled: !settings.soundEnabled };
                        setSettings(updated);
                        saveStoredNotificationSettings(updated);
                      }}
                      className={`w-full py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        settings.soundEnabled
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      <span>{settings.soundEnabled ? 'صوت الرنين مفعل' : 'صامت بدون رنين'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTIFICATION LOGS */}
          {activeSubTab === 'logs' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">سجل التنبيهات والإشعارات المرسلة ({logs.length})</span>
                {logs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="text-rose-400 hover:text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>مسح السجل</span>
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {logs.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 text-xs">لا توجد تنبيهات سابقة في السجل</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 ${
                        log.type === 'oil'
                          ? log.severity === 'urgent'
                            ? 'bg-rose-950/40 border-rose-700/60 text-rose-100'
                            : 'bg-amber-950/30 border-amber-600/50 text-amber-100'
                          : 'bg-slate-800/80 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {log.type === 'oil' ? (
                            <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          <span className="font-bold text-xs">{log.title}</span>
                        </div>
                        <p className="text-[11px] opacity-90 leading-relaxed">{log.body}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>نظام دفع إشعارات أسطول المصنع مفعل ومتصل تلقائياً</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer shadow-sm"
          >
            حفظ وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
