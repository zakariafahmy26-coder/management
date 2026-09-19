import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Bell,
  Mail,
  Truck,
  RotateCw,
  Sliders,
  X,
  Zap,
  Trash2,
  AlertCircle,
  Calendar,
  ShieldAlert,
  RefreshCw,
  FileText,
  UserCheck,
  Check,
  Search,
} from 'lucide-react';
import {
  AutomationRule,
  AutomationExecution,
  AutomationTrigger,
  AutomationActionType,
  AutomationOperator,
  AutomationCondition,
  AutomationAction,
  OperationTask,
  Vehicle,
  VehicleDocument,
} from '../types';
import { automationService } from '../services/automationService';

interface AutomationViewProps {
  rules: AutomationRule[];
  executions: AutomationExecution[];
  tasks: OperationTask[];
  vehicles: Vehicle[];
  documents: VehicleDocument[];
  canEdit: boolean;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onCreateRule: (rule: Partial<AutomationRule>) => void;
  onSimulateExecution: (ruleId: string) => void;
  onDeleteRule?: (ruleId: string) => void;
  onRetryExecution?: (executionId: string) => Promise<void> | void;
  onRefreshExecutions?: () => Promise<void> | void;
}

const TRIGGER_OPTIONS: Array<{ value: AutomationTrigger; label: string; category: string; description: string }> = [
  // Task Events
  { value: 'TASK_CREATED', label: 'إنشاء مهمة جديدة (Task Created)', category: 'المهام التشغيلية', description: 'يتم تشغيله فور تسجيل أي مهمة أو أمر نقل جديد' },
  { value: 'TASK_ASSIGNED', label: 'تعيين مهمة لسائق/مركبة (Task Assigned)', category: 'المهام التشغيلية', description: 'يتم تشغيله عند تخصيص المهمة لسائق أو شاحنة' },
  { value: 'TASK_STARTED', label: 'بدء تنفيذ المهمة (Task Started)', category: 'المهام التشغيلية', description: 'يتم تشغيله فور تحرك السائق أو بدء الرحلة الميدانية' },
  { value: 'TASK_COMPLETED', label: 'اكتمال المهمة بنجاح (Task Completed)', category: 'المهام التشغيلية', description: 'يتم تشغيله فور تأكيد التسليم وإغلاق المهمة' },
  { value: 'TASK_OVERDUE', label: 'تجاوز موعد التسليم (Task Overdue)', category: 'المهام التشغيلية', description: 'يتم تشغيله دورياً عند تخطي التاريخ المجدول للمهمة' },
  { value: 'TASK_DELAYED', label: 'تأخر في المسار التشغيلي (Task Delayed)', category: 'المهام التشغيلية', description: 'يتم تشغيله عند رصد تأخير يتجاوز 30 دقيقة' },
  { value: 'TASK_CANCELLED', label: 'إلغاء المهمة (Task Cancelled)', category: 'المهام التشغيلية', description: 'يتم تشغيله فور إلغاء أمر النقل أو المهمة' },

  // Maintenance & Fleet
  { value: 'VEHICLE_MAINTENANCE_DUE', label: 'اقتراب صيانة الشاحنة (Maintenance Due)', category: 'صيانة الأسطول', description: 'استحقاق غيار الزيت أو الفحص الدوري (<= 500 كم)' },
  { value: 'MAINTENANCE_DUE', label: 'استحقاق صيانة عامة (General Maintenance)', category: 'صيانة الأسطول', description: 'موعد فحص دوري أو إصلاح دوري مستحق' },

  // Documents & Licenses
  { value: 'VEHICLE_DOCUMENT_EXPIRING', label: 'اقتراب انتهاء وثيقة مركبة (Document Expiring)', category: 'الوثائق والتراخيص', description: 'رخصة تسيير، فحص دوري أو تأمين سينتهي قريباً (<= 30 يوماً)' },
  { value: 'DOCUMENT_EXPIRING', label: 'انتهاء وثيقة أو تصريح عام', category: 'الوثائق والتراخيص', description: 'وثيقة تشغيلية أو تصريح نقل على وشك الانتهاء' },
  { value: 'DRIVER_LICENSE_EXPIRING', label: 'اقتراب انتهاء رخصة سائق (Driver License Expiring)', category: 'الوثائق والتراخيص', description: 'رخصة قيادة سائق متبقي عليها أقل من 30 يوماً' },

  // Schedules
  { value: 'DAILY_SCHEDULE', label: 'جدول تشغيل يومي (Daily Schedule)', category: 'الجدولة التلقائية', description: 'تنفيذ تلقائي يومي في توقيت محدد (مثل تقارير نهاية اليوم)' },
  { value: 'WEEKLY_SCHEDULE', label: 'جدول تشغيل أسبوعي (Weekly Schedule)', category: 'الجدولة التلقائية', description: 'تنفيذ أسبوعي منتظم في يوم محدد' },
  { value: 'MONTHLY_SCHEDULE', label: 'جدول تشغيل شهري (Monthly Schedule)', category: 'الجدولة التلقائية', description: 'تنفيذ شهري في أول يوم من كل شهر' },
];

const ACTION_OPTIONS: Array<{ value: AutomationActionType; label: string; icon: any; description: string }> = [
  { value: 'CREATE_ALERT', label: 'إنشاء تحذير تشغيلي (Create Alert)', icon: AlertCircle, description: 'إدراج تنبيه رسمي في مركز الإشعارات والعمليات' },
  { value: 'SEND_NOTIFICATION', label: 'إرسال إشعار فوري (Send Notification)', icon: Bell, description: 'إرسال إشعار لغرفة المراقبة أو مستخدم محدد' },
  { value: 'SEND_EMAIL', label: 'إرسال بريد إلكتروني (Send Email)', icon: Mail, description: 'إرسال ملخص بالبريد عبر خادم SMTP المؤسسي' },
  { value: 'CREATE_TASK', label: 'إنشاء مهمة تشغيلية (Create Task)', icon: FileText, description: 'توليد مهمة عمل جديدة تلقائياً وتعيين أولويتها' },
  { value: 'UPDATE_TASK', label: 'تحديث مهمة قائمة (Update Task)', icon: Check, description: 'تغيير حالة المهمة أو أولوية تنفيذها' },
  { value: 'ASSIGN_DRIVER', label: 'تعيين سائق (Assign Driver)', icon: UserCheck, description: 'تخصيص سائق أو سائق احتياطي للمهمة' },
  { value: 'ASSIGN_VEHICLE', label: 'تعيين مركبة (Assign Vehicle)', icon: Truck, description: 'تخصيص شاحنة أو مركبة بديلة للرحلة' },
  { value: 'ESCALATE_TO_MANAGER', label: 'تصعيد لمدير العمليات (Escalate to Manager)', icon: ShieldAlert, description: 'إرسال إشعار عاجل ذو أولوية قصوى لمدير الحركة' },
  { value: 'GENERATE_REPORT', label: 'توليد تقرير تشغيلي (Generate Report)', icon: FileText, description: 'حفظ لقطة تقرير تشغيلي ومؤشرات أداء' },
  { value: 'SEND_MONTHLY_REPORT', label: 'إرسال التقرير الشهري للمديرين (Send Monthly Report)', icon: Calendar, description: 'توليد وإرسال التقرير الشامل في أول يوم من كل شهر ميلادي لجميع المديرين المسجلين' },
  { value: 'UPDATE_VEHICLE_STATUS', label: 'تحديث حالة المركبة (Update Vehicle Status)', icon: Truck, description: 'تغيير حالة المركبة (مثل: في الصيانة، متاحة، خارج الخدمة)' },
];

const OPERATOR_OPTIONS: Array<{ value: AutomationOperator; label: string }> = [
  { value: 'equals', label: 'يساوي (Equals)' },
  { value: 'not equals', label: 'لا يساوي (Not Equals)' },
  { value: 'greater than', label: 'أكبر من (Greater Than)' },
  { value: 'less than', label: 'أقل من (Less Than)' },
  { value: 'contains', label: 'يحتوي على (Contains)' },
  { value: 'in list', label: 'ضمن القائمة (In List)' },
  { value: 'date before', label: 'تاريخ قبل (Date Before)' },
  { value: 'date after', label: 'تاريخ بعد (Date After)' },
];

export const AutomationView: React.FC<AutomationViewProps> = ({
  rules,
  executions,
  tasks,
  vehicles,
  documents,
  canEdit,
  onToggleRule,
  onCreateRule,
  onSimulateExecution,
  onDeleteRule,
  onRetryExecution,
  onRefreshExecutions,
}) => {
  const [subTab, setSubTab] = useState<'rules' | 'logs' | 'builder' | 'simulator'>('rules');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [simulatingRuleId, setSimulatingRuleId] = useState<string | null>(null);
  const [retryingExecId, setRetryingExecId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'SKIPPED'>('ALL');

  // Builder state
  const [builderName, setBuilderName] = useState('');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderTrigger, setBuilderTrigger] = useState<AutomationTrigger>('TASK_DELAYED');
  const [builderConditions, setBuilderConditions] = useState<AutomationCondition[]>([
    { field: 'delayMinutes', operator: 'greater than', value: 30 },
  ]);
  const [builderActions, setBuilderActions] = useState<AutomationAction[]>([
    {
      type: 'SEND_NOTIFICATION',
      parameters: { title: 'تنبيه تأخير رحلة', message: 'تم رصد تأخير يتجاوز 30 دقيقة', severity: 'warning' },
    },
  ]);
  const [builderDedupMinutes, setBuilderDedupMinutes] = useState<number>(5);
  const [builderScheduleHour, setBuilderScheduleHour] = useState<number>(17);
  const [builderScheduleDay, setBuilderScheduleDay] = useState<number>(0);

  // Monthly Report Automation Trigger
  const [isTriggeringMonthlyReport, setIsTriggeringMonthlyReport] = useState(false);
  const [monthlyReportStatusMessage, setMonthlyReportStatusMessage] = useState<string | null>(null);

  const handleTriggerMonthlyReportNow = async () => {
    setIsTriggeringMonthlyReport(true);
    setMonthlyReportStatusMessage(null);
    try {
      const res = await automationService.triggerMonthlyReport();
      setMonthlyReportStatusMessage(
        res?.message || 'تم توليد وإرسال التقرير الشهري بنجاح لجميع المديرين المسجلين عبر محرك الأتمتة المدمج'
      );
      if (onRefreshExecutions) {
        await onRefreshExecutions();
      }
    } catch (err: any) {
      setMonthlyReportStatusMessage(err.message || 'حدث خطأ أثناء تشغيل التقرير الشهري الآلي');
    } finally {
      setIsTriggeringMonthlyReport(false);
    }
  };

  // Quick action testing
  const handleSimulate = async (ruleId: string) => {
    setSimulatingRuleId(ruleId);
    try {
      await onSimulateExecution(ruleId);
    } finally {
      setTimeout(() => setSimulatingRuleId(null), 500);
    }
  };

  const handleRetry = async (execId: string) => {
    if (!onRetryExecution) return;
    setRetryingExecId(execId);
    try {
      await onRetryExecution(execId);
    } finally {
      setRetryingExecId(null);
    }
  };

  const handleAddCondition = () => {
    setBuilderConditions([
      ...builderConditions,
      { field: 'status', operator: 'equals', value: 'PENDING' },
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setBuilderConditions(builderConditions.filter((_, i) => i !== index));
  };

  const handleUpdateCondition = (index: number, field: keyof AutomationCondition, value: any) => {
    const updated = [...builderConditions];
    updated[index] = { ...updated[index], [field]: value };
    setBuilderConditions(updated);
  };

  const handleAddAction = () => {
    setBuilderActions([
      ...builderActions,
      {
        type: 'SEND_EMAIL',
        parameters: { recipient: 'ops@company.com', subject: 'إشعار أتمتة جديد' },
      },
    ]);
  };

  const handleRemoveAction = (index: number) => {
    setBuilderActions(builderActions.filter((_, i) => i !== index));
  };

  const handleUpdateActionType = (index: number, newType: AutomationActionType) => {
    const updated = [...builderActions];
    updated[index] = {
      ...updated[index],
      type: newType,
      parameters: { ...updated[index].parameters },
    };
    setBuilderActions(updated);
  };

  const handleUpdateActionParam = (actionIndex: number, paramKey: string, val: any) => {
    const updated = [...builderActions];
    const currentParams = updated[actionIndex].parameters || {};
    updated[actionIndex] = {
      ...updated[actionIndex],
      parameters: { ...currentParams, [paramKey]: val },
    };
    setBuilderActions(updated);
  };

  const handleSaveBuilderRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderName.trim()) return;

    onCreateRule({
      name: builderName.trim(),
      description: builderDesc.trim() || 'قاعدة أتمتة ذكية V3 تم إنشاؤها عبر منشئ القواعد',
      trigger: builderTrigger,
      enabled: true,
      conditions: builderConditions,
      actions: builderActions,
      deduplicationWindowMinutes: builderDedupMinutes,
      scheduleConfig:
        builderTrigger === 'DAILY_SCHEDULE' || builderTrigger === 'WEEKLY_SCHEDULE' || builderTrigger === 'MONTHLY_SCHEDULE'
          ? {
              scheduleHour: builderScheduleHour,
              dayOfWeek: builderScheduleDay,
            }
          : undefined,
    });

    setShowCreateModal(false);
    setSubTab('rules');
    setBuilderName('');
    setBuilderDesc('');
  };

  // Filtered Rules
  const filteredRules = rules.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      r.trigger.toLowerCase().includes(term) ||
      (r.description && r.description.toLowerCase().includes(term))
    );
  });

  // Filtered Executions
  const filteredExecutions = executions.filter((exec) => {
    if (logFilter === 'ALL') return true;
    if (logFilter === 'SUCCESS') return exec.status === 'SUCCESS';
    if (logFilter === 'FAILED') return exec.status === 'FAILED' || exec.status === 'PARTIAL_SUCCESS';
    if (logFilter === 'SKIPPED') return exec.status === 'SKIPPED';
    return true;
  });

  // Stats
  const activeRulesCount = rules.filter((r) => r.enabled).length;
  const successfulExecs = executions.filter((e) => e.status === 'SUCCESS').length;
  const failedExecs = executions.filter((e) => e.status === 'FAILED' || e.status === 'PARTIAL_SUCCESS').length;
  const totalInvocations = rules.reduce((acc, r) => acc + (r.executionCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                مركز الأتمتة المتقدم (Automation V3)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                PRO ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              إدارة قواعد التشغيل الذاتية، منع التكرار، مراقبة المهام، وإعادة محاولة العمليات المتعثرة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub Navigation */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold">
            <button
              onClick={() => setSubTab('rules')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'rules'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              القواعد ({rules.length})
            </button>
            <button
              onClick={() => setSubTab('logs')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'logs'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              سجل التنفيذ ({executions.length})
            </button>
            <button
              onClick={() => setSubTab('builder')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'builder'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              منشئ القواعد
            </button>
            <button
              onClick={() => setSubTab('simulator')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'simulator'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              المحاكي
            </button>
          </div>

          {canEdit && (
            <button
              onClick={() => {
                setSubTab('builder');
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-900/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>قاعدة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Monthly Report Automation Banner */}
      <div className="bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-purple-900/10 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-blue-500/25 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                جدولة التقارير الشهرية الآلية للإدارة العامة
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ● مفعلة تلقائياً: 1 من كل شهر ميلادي (08:00 ص)
              </span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                محرك الأتمتة المدمج (Automation Engine)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              توليد وإرسال التقرير التشغيلي والمالي الشامل لحالة الأسطول والمهام والتكاليف تلقائياً في <strong>أول يوم من كل شهر ميلادي</strong> لجميع المديرين ومسؤولي العمليات المسجلين بالنظام.
            </p>
            {monthlyReportStatusMessage && (
              <div className="mt-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-900/40 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{monthlyReportStatusMessage}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <button
            onClick={handleTriggerMonthlyReportNow}
            disabled={isTriggeringMonthlyReport}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 shadow-md shadow-blue-900/20 transition-all cursor-pointer"
          >
            {isTriggeringMonthlyReport ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جارٍ توليد وإرسال التقرير للمديرين...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>إرسال التقرير الشهري الآن للمديرين</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400">إجمالي قواعد الأتمتة</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{rules.length}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-bold">
            <span>● {activeRulesCount} مفعلة</span>
            <span className="text-slate-400 font-normal">/ {rules.length - activeRulesCount} معطلة</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>التنفيذ الناجح</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {successfulExecs}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            معدل النجاح: {executions.length > 0 ? Math.round((successfulExecs / executions.length) * 100) : 100}%
          </div>
        </div>

        <div
          onClick={() => {
            setSubTab('logs');
            setLogFilter('FAILED');
          }}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-rose-400/50 transition-colors"
        >
          <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-between">
            <span>العمليات المتعثرة</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {failedExecs}
          </div>
          <div className="text-[10px] text-rose-500/80 mt-1 font-medium underline">
            انقر لمراجعة العمليات وإعادة المحاولة
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center justify-between">
            <span>المحرك المؤسسي V3</span>
            <RotateCw className="w-4 h-4 animate-spin text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
            {totalInvocations}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>مانع تكرار نشط (نافذة 5 دقائق)</span>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: RULES MANAGEMENT */}
      {subTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم أو الحدث المشغّل..."
                className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="text-xs text-slate-400">
              يتم تطبيق القواعد أوتوماتيكياً بواسطة خادم FleetOps الموثوق
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                  rule.enabled
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50">
                        {rule.trigger}
                      </span>
                      {rule.scheduleConfig?.scheduleHour !== undefined && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {rule.scheduleConfig.scheduleHour}:00
                        </span>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => canEdit && onToggleRule(rule.id, e.target.checked)}
                        disabled={!canEdit}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600" />
                    </label>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                    {rule.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    {rule.description || 'قاعدة مراقبة وتشغيل ذكية'}
                  </p>

                  {/* Conditions Summary */}
                  <div className="space-y-2 mb-4">
                    <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>الشروط ({rule.conditions?.length || 0}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rule.conditions && rule.conditions.length > 0 ? (
                        rule.conditions.map((cond, ci) => (
                          <span
                            key={ci}
                            className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                          >
                            {cond.field} {cond.operator} {String(cond.value)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">بدون شروط إضافية (تنفيذ فوري)</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Summary */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-purple-500 rotate-180" />
                      <span>الإجراءات المنفذة ({rule.actions?.length || 0}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rule.actions && rule.actions.map((act, ai) => (
                        <span
                          key={ai}
                          className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-purple-500" />
                          {act.type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="text-slate-400">
                      تم التنفيذ: <span className="font-bold text-slate-700 dark:text-slate-200">{rule.executionCount || 0} مرة</span>
                    </div>
                    {rule.lastExecutedAt && (
                      <div className="text-[10px] text-slate-400">
                        آخر تشغيل: {new Date(rule.lastExecutedAt).toLocaleTimeString('ar-EG')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canEdit && (
                      <button
                        onClick={() => handleSimulate(rule.id)}
                        disabled={simulatingRuleId === rule.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 transition-colors"
                        title="اختبار القاعدة فورياً"
                      >
                        <Play className={`w-3.5 h-3.5 ${simulatingRuleId === rule.id ? 'animate-spin' : ''}`} />
                        <span>{simulatingRuleId === rule.id ? 'جاري التشغيل...' : 'اختبار'}</span>
                      </button>
                    )}

                    {canEdit && onDeleteRule && (
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف قاعدة "${rule.name}"؟`)) {
                            onDeleteRule(rule.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="حذف القاعدة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EXECUTION LOGS & RETRY */}
      {subTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setLogFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  logFilter === 'ALL' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                الكل ({executions.length})
              </button>
              <button
                onClick={() => setLogFilter('SUCCESS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  logFilter === 'SUCCESS' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                الناجحة ({executions.filter((e) => e.status === 'SUCCESS').length})
              </button>
              <button
                onClick={() => setLogFilter('FAILED')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  logFilter === 'FAILED' ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                المتعثرة ({executions.filter((e) => e.status === 'FAILED' || e.status === 'PARTIAL_SUCCESS').length})
              </button>
              <button
                onClick={() => setLogFilter('SKIPPED')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  logFilter === 'SKIPPED' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                تم التخطي ({executions.filter((e) => e.status === 'SKIPPED').length})
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">وقت التنفيذ</th>
                    <th className="py-3 px-4">القاعدة والحدث</th>
                    <th className="py-3 px-4">الكيان المشغّل</th>
                    <th className="py-3 px-4">تفاصيل النتيجة</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExecutions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        لا توجد سجلات تطابق الفلتر المحدد
                      </td>
                    </tr>
                  ) : (
                    filteredExecutions.map((exec) => (
                      <tr key={exec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                          {exec.executionTime ? new Date(exec.executionTime).toLocaleString('ar-EG') : 'الآن'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{exec.ruleName}</div>
                          <div className="font-mono text-[10px] text-purple-600 dark:text-purple-400">{exec.trigger}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
                          {exec.triggeredBy || 'system'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {exec.details}
                          {exec.retryCount ? (
                            <span className="mr-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-600">
                              محاولات: {exec.retryCount}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4">
                          {exec.status === 'SUCCESS' && (
                            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              نجاح ✓
                            </span>
                          )}
                          {(exec.status === 'FAILED' || exec.status === 'PARTIAL_SUCCESS') && (
                            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              فشل / جزئي
                            </span>
                          )}
                          {exec.status === 'SKIPPED' && (
                            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              تخطي الشروط
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {(exec.status === 'FAILED' || exec.status === 'PARTIAL_SUCCESS' || exec.status === 'SKIPPED') && onRetryExecution && (
                            <button
                              onClick={() => handleRetry(exec.id)}
                              disabled={retryingExecId === exec.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all shadow-sm"
                            >
                              <RefreshCw className={`w-3 h-3 ${retryingExecId === exec.id ? 'animate-spin' : ''}`} />
                              <span>{retryingExecId === exec.id ? 'جاري...' : 'إعادة المحاولة'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ADVANCED VISUAL BUILDER */}
      {subTab === 'builder' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <form onSubmit={handleSaveBuilderRule} className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-500" />
                <span>منشئ قواعد الأتمتة المتقدم (Visual Automation V3 Studio)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                صمم قاعدة تشغيلية كاملة بربط الأحداث الميدانية بالشروط والإجراءات التلقائية بدون تعقيدات برمجية
              </p>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم القاعدة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تنبيه فوري عند تأخر شاحنات خط الساحل أو الإسكندرية"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نافذة منع تكرار التنفيذ (Deduplication Window)
                </label>
                <select
                  value={builderDedupMinutes}
                  onChange={(e) => setBuilderDedupMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option value={1}>دقيقة واحدة (1 min)</option>
                  <option value={5}>5 دقائق (موصى به للعمليات الحية)</option>
                  <option value={15}>15 دقيقة</option>
                  <option value={60}>ساعة كاملة (60 mins)</option>
                  <option value={1440}>24 ساعة (مرة يومياً فقط)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الوصف التشغيلي للقاعدة
                </label>
                <textarea
                  rows={2}
                  placeholder="اشرح الهدف من القاعدة للمشرفين والمديرين..."
                  value={builderDesc}
                  onChange={(e) => setBuilderDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Trigger Selector */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                1. اختيار الحدث المشغّل (Trigger) *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {TRIGGER_OPTIONS.map((opt) => {
                  const isSelected = builderTrigger === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setBuilderTrigger(opt.value)}
                      className={`p-3 rounded-xl border text-right cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-600'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {opt.category}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white mt-1.5">
                        {opt.label}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Schedule Extra Configuration */}
              {(builderTrigger === 'DAILY_SCHEDULE' ||
                builderTrigger === 'WEEKLY_SCHEDULE' ||
                builderTrigger === 'MONTHLY_SCHEDULE') && (
                <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ساعة التنفيذ (بتوقيت القاهرة)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={builderScheduleHour}
                      onChange={(e) => setBuilderScheduleHour(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold"
                    />
                  </div>
                  {builderTrigger === 'WEEKLY_SCHEDULE' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        يوم التنفيذ الأسبوعي
                      </label>
                      <select
                        value={builderScheduleDay}
                        onChange={(e) => setBuilderScheduleDay(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold"
                      >
                        <option value={0}>الأحد</option>
                        <option value={1}>الإثنين</option>
                        <option value={2}>الثلاثاء</option>
                        <option value={3}>الأربعاء</option>
                        <option value={4}>الخميس</option>
                        <option value={5}>الجمعة</option>
                        <option value={6}>السبت</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Conditions Builder */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  2. شروط التحقق (Conditions)
                </label>
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة شرط</span>
                </button>
              </div>

              <div className="space-y-2">
                {builderConditions.map((cond, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap sm:flex-nowrap"
                  >
                    <input
                      type="text"
                      placeholder="الحقل (مثال: status أو priority)"
                      value={cond.field}
                      onChange={(e) => handleUpdateCondition(index, 'field', e.target.value)}
                      className="flex-1 min-w-[120px] px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono"
                    />
                    <select
                      value={cond.operator}
                      onChange={(e) => handleUpdateCondition(index, 'operator', e.target.value as any)}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-semibold"
                    >
                      {OPERATOR_OPTIONS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="القيمة المقارنة"
                      value={String(cond.value)}
                      onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                      className="flex-1 min-w-[120px] px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Builder */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  3. الإجراءات التلقائية المستهدفة (Actions) *
                </label>
                <button
                  type="button"
                  onClick={handleAddAction}
                  className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة إجراء إضافي</span>
                </button>
              </div>

              <div className="space-y-3">
                {builderActions.map((action, index) => {
                  const ActionIcon = ACTION_OPTIONS.find((a) => a.value === action.type)?.icon || Check;
                  const params = action.parameters || {};

                  return (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ActionIcon className="w-4 h-4 text-purple-600" />
                          <select
                            value={action.type}
                            onChange={(e) => handleUpdateActionType(index, e.target.value as any)}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                          >
                            {ACTION_OPTIONS.map((ao) => (
                              <option key={ao.value} value={ao.value}>
                                {ao.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {builderActions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAction(index)}
                            className="text-xs text-rose-500 hover:underline"
                          >
                            حذف الإجراء
                          </button>
                        )}
                      </div>

                      {/* Parameters fields based on action type */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {(action.type === 'SEND_NOTIFICATION' || action.type === 'CREATE_ALERT' || action.type === 'ESCALATE_TO_MANAGER') && (
                          <>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">عنوان التنبيه</label>
                              <input
                                type="text"
                                placeholder="عنوان التنبيه أو الإشعار"
                                value={params.title || ''}
                                onChange={(e) => handleUpdateActionParam(index, 'title', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">الجهة / الدور المستهدف</label>
                              <select
                                value={params.targetRole || 'OPERATIONS_MANAGER'}
                                onChange={(e) => handleUpdateActionParam(index, 'targetRole', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                              >
                                <option value="OPERATIONS_MANAGER">مدير العمليات (Operations Manager)</option>
                                <option value="SUPERVISOR">مشرف الحركة الميداني (Supervisor)</option>
                                <option value="COMPANY_ADMIN">إدارة الشركة العليا (Company Admin)</option>
                                <option value="ALL">جميع أعضاء الفريق</option>
                              </select>
                            </div>
                          </>
                        )}

                        {action.type === 'SEND_EMAIL' && (
                          <>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">البريد الإلكتروني المستلم</label>
                              <input
                                type="email"
                                placeholder="ops-manager@fleetops.com"
                                value={params.recipient || ''}
                                onChange={(e) => handleUpdateActionParam(index, 'recipient', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">عنوان الرسالة (Subject)</label>
                              <input
                                type="text"
                                placeholder="تنبيه تلقائي من أسطول فليت أوبس"
                                value={params.subject || ''}
                                onChange={(e) => handleUpdateActionParam(index, 'subject', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                              />
                            </div>
                          </>
                        )}

                        {action.type === 'CREATE_TASK' && (
                          <>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">عنوان المهمة التلقائية</label>
                              <input
                                type="text"
                                placeholder="فحص فني للشاحنة"
                                value={params.title || ''}
                                onChange={(e) => handleUpdateActionParam(index, 'title', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">أولوية المهمة</label>
                              <select
                                value={params.priority || 'HIGH'}
                                onChange={(e) => handleUpdateActionParam(index, 'priority', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                              >
                                <option value="LOW">منخفضة</option>
                                <option value="MEDIUM">متوسطة</option>
                                <option value="HIGH">عالية</option>
                                <option value="CRITICAL">حرجة / طوارئ</option>
                              </select>
                            </div>
                          </>
                        )}

                        {action.type === 'UPDATE_VEHICLE_STATUS' && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">الحالة الجديدة للمركبة</label>
                            <select
                              value={params.status || 'IN_MAINTENANCE'}
                              onChange={(e) => handleUpdateActionParam(index, 'status', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"
                            >
                              <option value="IN_MAINTENANCE">في الصيانة (In Maintenance)</option>
                              <option value="AVAILABLE">متاحة للتشغيل (Available)</option>
                              <option value="OUT_OF_SERVICE">خارج الخدمة (Out of Service)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSubTab('rules')}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold rounded-xl text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-900/20"
              >
                حفظ ونشر قاعدة الأتمتة V3
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 4: QUICK SIMULATOR */}
      {subTab === 'simulator' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-purple-500" />
              <span>محاكي اختبار قواعد الأتمتة المباشر (Automation V3 Sandbox)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              اختر أي قاعدة نشطة لاختبار سريان الشروط وتنفيذ الإجراءات والتحقق من النتيجة دون انتظار الأحداث الميدانية
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{rule.name}</div>
                  <div className="text-[11px] font-mono text-purple-600 mt-0.5">{rule.trigger}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {rule.actions?.length || 0} إجراءات مبرمجة • تم التنفيذ {rule.executionCount || 0} مرة
                  </div>
                </div>

                <button
                  onClick={() => handleSimulate(rule.id)}
                  disabled={simulatingRuleId === rule.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all shadow-sm shrink-0"
                >
                  <Play className={`w-3.5 h-3.5 ${simulatingRuleId === rule.id ? 'animate-spin' : ''}`} />
                  <span>{simulatingRuleId === rule.id ? 'جاري المحاكاة...' : 'تشغيل الاختبار'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
