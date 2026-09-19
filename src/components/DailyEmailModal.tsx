import React, { useState, useEffect } from 'react';
import {
  Mail,
  Clock,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  Settings,
  History,
  Loader2,
  X,
  Plus,
  Trash2,
  Key,
  Calendar,
  Play,
} from 'lucide-react';
import { automationService } from '../services/automationService';
import {
  Vehicle,
  Driver,
  TripRoute,
  MaintenanceRecord,
  FuelRecord,
  MaintenanceAlert,
  DailyEmailConfig,
  DailyEmailLog,
} from '../types';
import {
  getCachedDailyEmailConfig,
  getStoredDailyEmailConfig,
  saveStoredDailyEmailConfig,
  getStoredDailyEmailLogs,
  sendDailyEmailNow,
  generateGmailComposeLink,
  SendEmailResult,
} from '../services/dailyEmailService';
import { generateDailyEmailHtml } from '../services/dailyEmailTemplate';

interface DailyEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: TripRoute[];
  maintenance: MaintenanceRecord[];
  fuelRecords: FuelRecord[];
  alerts?: MaintenanceAlert[];
  onShowToast?: (title: string, message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const DailyEmailModal: React.FC<DailyEmailModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  drivers,
  trips,
  maintenance,
  fuelRecords,
  alerts,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'send_now' | 'preview' | 'settings' | 'history'>('send_now');
  const [config, setConfig] = useState<DailyEmailConfig>(getCachedDailyEmailConfig());
  const [logs, setLogs] = useState<DailyEmailLog[]>(getStoredDailyEmailLogs());
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendEmailResult | null>(null);
  const [newRecipient, setNewRecipient] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isSendingMonthlyReport, setIsSendingMonthlyReport] = useState(false);
  const [monthlyDispatchMsg, setMonthlyDispatchMsg] = useState<string | null>(null);

  const handleSendMonthlyReport = async () => {
    setIsSendingMonthlyReport(true);
    setMonthlyDispatchMsg(null);
    try {
      const res = await automationService.triggerMonthlyReport();
      const msg = res?.message || 'تم توليد وإرسال التقرير الشهري بنجاح لجميع المديرين المسجلين';
      setMonthlyDispatchMsg(msg);
      if (onShowToast) {
        onShowToast('التقرير الشهري للأتمتة', msg, 'success');
      }
    } catch (err: any) {
      const errMsg = err.message || 'فشل إرسال التقرير الشهري';
      setMonthlyDispatchMsg(errMsg);
      if (onShowToast) {
        onShowToast('خطأ', errMsg, 'error');
      }
    } finally {
      setIsSendingMonthlyReport(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      const initial = getCachedDailyEmailConfig();
      setConfig(initial);
      setLogs(getStoredDailyEmailLogs());
      setSendResult(null);

      getStoredDailyEmailConfig()
        .then((cloudConf) => {
          if (isMounted && cloudConf) {
            setConfig(cloudConf);
          }
        })
        .catch((e) => {
          console.warn('Notice loading cloud daily email config:', e);
        });

      // Prepare preview HTML
      const html = generateDailyEmailHtml({
        vehicles,
        drivers,
        trips,
        maintenance,
        fuelRecords,
        alerts,
      });
      setPreviewHtml(html);

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, vehicles, drivers, trips, maintenance, fuelRecords, alerts]);

  if (!isOpen) return null;

  const scheduleHour = typeof config?.scheduleHour === 'number' && Number.isFinite(config.scheduleHour) ? config.scheduleHour : 17;
  const scheduleMinute = typeof config?.scheduleMinute === 'number' && Number.isFinite(config.scheduleMinute) ? config.scheduleMinute : 0;
  const defaultRecipient = (import.meta.env.VITE_NOTIFICATION_EMAIL || '').trim() || 'operations@company.com';
  const recipients = Array.isArray(config?.recipients) && config.recipients.length > 0 ? config.recipients : [defaultRecipient];

  const handleSaveConfig = (updated: DailyEmailConfig) => {
    setConfig(updated);
    saveStoredDailyEmailConfig(updated);
    if (onShowToast) {
      onShowToast('تم حفظ الإعدادات', 'تم تحديث جدول إرسال إيميل نهاية اليوم الآلي بنجاح', 'success');
    }
  };

  const handleAddRecipient = () => {
    if (!newRecipient.trim() || !newRecipient.includes('@')) return;
    const updated = {
      ...config,
      recipients: Array.from(new Set([...recipients, newRecipient.trim().toLowerCase()])),
    };
    handleSaveConfig(updated);
    setNewRecipient('');
  };

  const handleRemoveRecipient = (email: string) => {
    if (recipients.length <= 1) {
      if (onShowToast) {
        onShowToast('تنبيه', 'يجب الإبقاء على بريد إلكتروني واحد على الأقل للمستلم الرئيسي', 'warning');
      }
      return;
    }
    const updated = {
      ...config,
      recipients: recipients.filter((r) => r !== email),
    };
    handleSaveConfig(updated);
  };

  const handleSendNow = async () => {
    setIsSending(true);
    setSendResult(null);
    try {
      const result = await sendDailyEmailNow({
        vehicles,
        drivers,
        trips,
        maintenance,
        fuelRecords,
        alerts,
      });
      setSendResult(result);
      setLogs(getStoredDailyEmailLogs());

      if (result.success) {
        if (onShowToast) {
          onShowToast(
            'تم إرسال الإيميل بنجاح',
            `تم إرسال تقرير نهاية اليوم المجمع إلى: ${result.recipients.join(', ')}`,
            'success'
          );
        }
      } else {
        if (onShowToast) {
          onShowToast('تعذر الإرسال المباشر', result.error || 'يرجى مراجعة إعدادات البريد', 'error');
        }
      }
    } catch (err: any) {
      console.error(err);
      if (onShowToast) {
        onShowToast('خطأ في الإرسال', err.message || 'حدث خطأ أثناء الاتصال بالخادم', 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const gmailComposeUrl = generateGmailComposeLink(
    { vehicles, drivers, trips, maintenance, fuelRecords, alerts },
    recipients
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
              <Mail className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  إرسال إيميل أوتوماتيك آخر اليوم لجميع الشيتات
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {config?.enabled ? 'مفعل تلقائياً' : 'متوقف'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تقرير يومي شامل بمخرجات شيتات الرحلات، السيارات، السائقين، السولار، والصيانة الدورية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 gap-2 text-xs font-bold text-slate-400">
          <button
            onClick={() => setActiveTab('send_now')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'send_now'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>إرسال تقرير اليوم الآن</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'preview'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>معاينة الإيميل الحية (HTML)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>جدولة الإرسال التلقائي والمستلمين</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل الإيميلات المرسلة ({logs.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: Send Now & Status */}
          {activeTab === 'send_now' && (
            <div className="space-y-6">
              
              {/* Daily Schedule Banner */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      مجدول الإرسال التلقائي لنهاية اليوم: {scheduleHour.toString().padStart(2, '0')}:
                      {scheduleMinute.toString().padStart(2, '0')} مساءً
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      يتم إرسال التقرير الشامل آلياً في موعد انتهاء وردية المصنع إلى:{' '}
                      <span className="text-emerald-400 font-semibold">{recipients.join(', ')}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-medium">الإرسال التلقائي:</span>
                  <button
                    onClick={() => handleSaveConfig({ ...config, enabled: !config?.enabled })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config?.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        config?.enabled ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Data Summary Quick Cards */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  محتويات التقرير المجمع الجاهز للإرسال لجميع الشيتات:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-white">{trips.length}</div>
                    <div className="text-[11px] text-slate-400 font-medium">شيت الرحلات وخطوط السير</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-white">{vehicles.length}</div>
                    <div className="text-[11px] text-slate-400 font-medium">شيت سيارات وشاحنات الأسطول</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-white">{drivers.length}</div>
                    <div className="text-[11px] text-slate-400 font-medium">شيت السائقين والورديات</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-emerald-400">
                      {(
                        fuelRecords.reduce((a, b) => a + (Number(b.totalCost) || 0), 0) +
                        maintenance.reduce((a, b) => a + (Number(b.cost) || 0), 0)
                      ).toLocaleString('ar-EG')}{' '}
                      ج.م
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">شيتات الوقود والصيانة والمصاريف</div>
                  </div>
                </div>
              </div>

              {/* Dispatch Action Area */}
              <div className="bg-gradient-to-l from-emerald-950/40 via-slate-800/90 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>إرسال تقرير نهاية اليوم المجمع الآن</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    المستلم: <span className="text-white font-mono">{recipients[0]}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  سيقوم النظام بجمع كافة الإحصائيات لليوم الحالي، وتوليد تقرير HTML فاخر ومعتمد لجميع الشيتات مدعوماً بتحليل Gemini AI، وإرساله فوراً إلى بريد الإدارة.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleSendNow}
                    disabled={isSending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري تجميع الشيتات وتوليد التقرير والإرسال...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>إرسال التقرير فوراً عبر الخادم</span>
                      </>
                    )}
                  </button>

                  <a
                    href={gmailComposeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-rose-400" />
                    <span>فتح مسودة جاهزة في Gmail</span>
                  </a>

                  <button
                    onClick={() => setActiveTab('preview')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span>معاينة شكل الإيميل</span>
                  </button>
                </div>

                {/* Send Result Feedback */}
                {sendResult && (
                  <div
                    className={`mt-4 p-4 rounded-xl text-xs flex items-start gap-3 border ${
                      sendResult.success
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {sendResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-sm">
                        {sendResult.success
                          ? '✅ تم إرسال تقرير اليوم بنجاح!'
                          : 'تعذر الإرسال المباشر من الخادم'}
                      </div>
                      <p className="mt-1 leading-relaxed">
                        {sendResult.success
                          ? `تم توجيه التقرير لجميع المستلمين: ${sendResult.recipients.join(', ')}`
                          : sendResult.error}
                      </p>

                      {!sendResult.success && (
                        <div className="mt-3 pt-3 border-t border-rose-800/40 space-y-3">
                          <div className="bg-slate-900/90 rounded-xl p-3.5 border border-amber-500/30 text-amber-200">
                            <p className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                              <Key className="w-4 h-4" />
                              <span>كيفية تصحيح كلمة المرور في متغير البيئة (SMTP_PASS):</span>
                            </p>
                            <ol className="list-decimal list-inside space-y-1.5 mt-2 text-[11px] text-slate-300">
                              <li>افتح أمان حساب Google: <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-mono">myaccount.google.com/security</a></li>
                              <li>تأكد من تفعيل <strong>التحقق بخطوتين</strong> (2-Step Verification).</li>
                              <li>ابحث عن <strong>كلمات مرور التطبيقات (App Passwords)</strong> وأنشئ كلمة مرور جديدة باسم التطبيق.</li>
                              <li>انسخ الـ 16 حرفاً الناتجة وضعها في متغير البيئة <strong>SMTP_PASS</strong> في لوحة Settings بدلاً من كلمة المرور العادية.</li>
                            </ol>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <a
                              href={gmailComposeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-md"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>إرسال التقرير فوراً عبر بريد Gmail (مسودة مجهزة بالكامل)</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {sendResult.previewUrl && (
                        <div className="mt-2.5">
                          <a
                            href={sendResult.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-emerald-300 font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>عرض الإيميل المرسل حياً عبر Ethereal Preview</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 2: Live HTML Email Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">معاينة حية للإيميل (Live HTML Email Preview)</h4>
                  <p className="text-xs text-slate-400">
                    هذا هو التصميم الدقيق والكامل الذي سيصل في صندوق بريد المستلم ({recipients.join(', ')})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={gmailComposeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح في Gmail</span>
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden border border-slate-700 shadow-inner max-h-[600px] overflow-y-auto">
                <iframe
                  title="Daily Email Preview"
                  srcDoc={previewHtml}
                  className="w-full min-h-[600px] border-0"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Settings & Recipients */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              {/* Timing */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>توقيت الإرسال التلقائي اليومي</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 font-bold mb-1.5">
                      ساعة الإرسال اليومية (نهاية الوردية):
                    </label>
                    <select
                      value={scheduleHour}
                      onChange={(e) =>
                        handleSaveConfig({ ...config, scheduleHour: Number(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value={15}>03:00 مساءً (15:00)</option>
                      <option value={16}>04:00 مساءً (16:00)</option>
                      <option value={17}>05:00 مساءً (17:00 - افتراضي للمصنع)</option>
                      <option value={18}>06:00 مساءً (18:00)</option>
                      <option value={19}>07:00 مساءً (19:00)</option>
                      <option value={20}>08:00 مساءً (20:00)</option>
                      <option value={21}>09:00 مساءً (21:00)</option>
                      <option value={22}>10:00 مساءً (22:00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-bold mb-1.5">
                      الدقيقة:
                    </label>
                    <select
                      value={scheduleMinute}
                      onChange={(e) =>
                        handleSaveConfig({ ...config, scheduleMinute: Number(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value={0}>00 دقيقة (رأس الساعة)</option>
                      <option value={15}>15 دقيقة</option>
                      <option value={30}>30 دقيقة (النصف)</option>
                      <option value={45}>45 دقيقة</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="includeAI"
                    checked={config?.includeAISummary ?? true}
                    onChange={(e) =>
                      handleSaveConfig({ ...config, includeAISummary: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="includeAI" className="text-xs text-slate-300 font-medium cursor-pointer">
                    توليد وتضمين التحليل التنفيذي وتوصيات الذكاء الاصطناعي (Gemini AI) في الإيميل
                  </label>
                </div>
              </div>

              {/* Monthly Report Automation Scheduling */}
              <div className="bg-slate-800/60 border border-blue-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>جدولة التقارير الشهرية التلقائية للمديرين</span>
                  </h4>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                    محرك الأتمتة المدمج (Automation Engine)
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  خاصية الجدولة التلقائية لإرسال التقرير التشغيلي والمالي الشامل في <strong>أول يوم من كل شهر ميلادي</strong> (الساعة 08:00 صباحاً) لجميع المديرين ومسؤولي العمليات المسجلين بالنظام.
                </p>

                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="monthlyReportEnabled"
                      checked={config?.monthlyReportEnabled ?? true}
                      onChange={(e) =>
                        handleSaveConfig({ ...config, monthlyReportEnabled: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                    />
                    <label htmlFor="monthlyReportEnabled" className="text-xs text-white font-medium cursor-pointer">
                      تفعيل الجدولة التلقائية في أول يوم من كل شهر ميلادي (Day 1 of Month)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sendToAllManagers"
                      checked={config?.sendToAllManagers ?? true}
                      onChange={(e) =>
                        handleSaveConfig({ ...config, sendToAllManagers: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                    />
                    <label htmlFor="sendToAllManagers" className="text-xs text-slate-300 font-medium cursor-pointer">
                      الإرسال التلقائي لكافة المديرين المسجلين في النظام (Company Admins & Operations Managers)
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    آخر إرسال شهري مجدول: {config?.lastMonthlyReportSentMonth || 'بداية الشهر الميلادي الحالي'}
                  </span>
                  <button
                    onClick={handleSendMonthlyReport}
                    disabled={isSendingMonthlyReport}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
                  >
                    {isSendingMonthlyReport ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جارٍ إرسال التقرير الشهري...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>إرسال التقرير الشهري الآن للمديرين (اختبار فوري)</span>
                      </>
                    )}
                  </button>
                </div>

                {monthlyDispatchMsg && (
                  <div className="text-xs font-semibold text-blue-300 bg-blue-900/30 p-2.5 rounded-lg border border-blue-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{monthlyDispatchMsg}</span>
                  </div>
                )}
              </div>

              {/* Recipients List */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>قائمة مستلمي التقرير اليومي</span>
                </h4>

                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="أدخل بريد إلكتروني إضافي (مثال: manager@factory.com)"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    onClick={handleAddRecipient}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة مستلم</span>
                  </button>
                </div>

                <div className="space-y-2 mt-3">
                  {recipients.map((rec, idx) => (
                    <div
                      key={rec}
                      className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px]">
                          {idx + 1}
                        </span>
                        <span className="text-white font-mono">{rec}</span>
                        {idx === 0 && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                            المستلم الرئيسي
                          </span>
                        )}
                      </div>

                      {recipients.length > 1 && (
                        <button
                          onClick={() => handleRemoveRecipient(rec)}
                          className="text-slate-400 hover:text-rose-400 p-1 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: History Logs */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">سجل إيميلات نهاية اليوم المرسلة</h4>
                <span className="text-xs text-slate-400">آخر 30 عملية إرسال</span>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  لم يتم إرسال أي إيميلات بعد. سيتم تسجيل كل إرسال تلقائي أو يدوي هنا.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              log.status === 'sent' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          <span className="font-bold text-white">{log.subject}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleString('ar-EG')}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          المستلمون:{' '}
                          <span className="text-slate-200 font-mono">{log.recipients.join(', ')}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {log.summaryStats.totalTrips} رحلة • {log.summaryStats.totalDailyExpenses.toLocaleString('ar-EG')} ج.م منصرفات
                        </div>
                      </div>

                      {log.previewUrl && (
                        <a
                          href={log.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>معاينة Ethereal</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            الجدولة: <span className="text-emerald-400 font-semibold">{config?.enabled ? `يومياً الساعة ${scheduleHour}:00` : 'معطلة'}</span>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
