import React, { useState, useMemo, useEffect } from 'react';
import {
  Route,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  XCircle,
  Truck,
  User,
  MapPin,
  CheckSquare,
  Square,
  History,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Bell,
  BellRing,
  Flame,
  ShieldAlert,
  Zap,
  Radio,
} from 'lucide-react';
import {
  OperationTask,
  TaskStatus,
  TaskPriority,
  Vehicle,
  Driver,
  LocationPlace,
  RegionItem,
  TripRoute,
} from '../types';
import { TripsSheetView } from './TripsSheetView';

export interface TaskUrgencyInfo {
  isUrgent: boolean;
  isOverdue: boolean;
  isNearDue: boolean;
  minutesDiff: number;
  badgeText: string;
  formattedCountdown: string;
}

export const evaluateTaskDueUrgency = (
  task: OperationTask,
  currentSimulatedTime?: string,
  thresholdMinutes = 60
): TaskUrgencyInfo => {
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
    return {
      isUrgent: false,
      isOverdue: false,
      isNearDue: false,
      minutesDiff: 9999,
      badgeText: 'مكتملة',
      formattedCountdown: 'تم الانتهاء من المهمة',
    };
  }

  // If explicitly flagged DELAYED, always urgent
  if (task.status === 'DELAYED') {
    const delay = task.delayMinutes || 35;
    return {
      isUrgent: true,
      isOverdue: true,
      isNearDue: false,
      minutesDiff: -delay,
      badgeText: `متأخرة (+${delay} د)`,
      formattedCountdown: `متأخرة عن موعد التسليم بـ ${delay} دقيقة`,
    };
  }

  // Current time in minutes from midnight
  let currentMinutes: number;
  if (currentSimulatedTime && currentSimulatedTime !== 'live') {
    const [simH, simM] = currentSimulatedTime.split(':').map(Number);
    currentMinutes = (isNaN(simH) ? 12 : simH) * 60 + (isNaN(simM) ? 0 : simM);
  } else {
    const now = new Date();
    currentMinutes = now.getHours() * 60 + now.getMinutes();
  }

  const [dueH, dueM] = (task.dueTime || '14:00').split(':').map(Number);
  const dueMinutes = (isNaN(dueH) ? 14 : dueH) * 60 + (isNaN(dueM) ? 0 : dueM);
  const diff = dueMinutes - currentMinutes;

  if (diff <= 0) {
    const overdueMins = Math.abs(diff);
    return {
      isUrgent: true,
      isOverdue: true,
      isNearDue: false,
      minutesDiff: diff,
      badgeText: overdueMins === 0 ? 'انتهى الوقت الآن' : `تجاوزت الموعد (${overdueMins} د)`,
      formattedCountdown: overdueMins === 0 ? 'حان موعد انتهاء المهمة الآن' : `تجاوزت موعد الانتهاء بـ ${overdueMins} دقيقة`,
    };
  } else if (diff <= thresholdMinutes) {
    return {
      isUrgent: true,
      isOverdue: false,
      isNearDue: true,
      minutesDiff: diff,
      badgeText: `متبقي ${diff} دقيقة`,
      formattedCountdown: `اقترب موعد الانتهاء (متبقي ${diff} دقيقة)`,
    };
  }

  return {
    isUrgent: false,
    isOverdue: false,
    isNearDue: false,
    minutesDiff: diff,
    badgeText: 'في الموعد',
    formattedCountdown: `متبقي ${Math.floor(diff / 60)} س و ${diff % 60} د`,
  };
};

interface OperationsViewProps {
  tasks: OperationTask[];
  vehicles: Vehicle[];
  drivers: Driver[];
  locations: LocationPlace[];
  regions: RegionItem[];
  trips: TripRoute[];
  onCreateTask: (taskData: Partial<OperationTask>) => void;
  onUpdateTask: (task: OperationTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onOpenTripModal?: () => void;
  onEditTrip?: (trip: TripRoute) => void;
  onDeleteTrip?: (tripId: string) => void;
  onOpenDriverMode?: () => void;
  canEdit: boolean;
  onSendInstantAlert?: (task: OperationTask, note?: string) => void;
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  tasks,
  vehicles,
  drivers,
  locations,
  regions,
  trips,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onOpenTripModal,
  onEditTrip,
  onDeleteTrip,
  onOpenDriverMode,
  canEdit,
  onSendInstantAlert,
}) => {
  const [subTab, setSubTab] = useState<'tasks' | 'trips' | 'calendar'>('tasks');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<OperationTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Smart Reminder (dueTime) states
  const [shiftTimeMode, setShiftTimeMode] = useState<'live' | '11:15' | '13:00' | '15:30'>('live');
  const [reminderThreshold, setReminderThreshold] = useState<number>(60);
  const [filterNearDueOnly, setFilterNearDueOnly] = useState<boolean>(false);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);
  const [alertedTaskIds, setAlertedTaskIds] = useState<Record<string, { timestamp: string; sent: boolean }>>(() => {
    try {
      const saved = localStorage.getItem('fleet_smart_reminder_alerts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Form State for creating task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskRegion, setNewTaskRegion] = useState('الإسكندرية');
  const [newTaskLocation, setNewTaskLocation] = useState('');
  const [newTaskVehicle, setNewTaskVehicle] = useState('');
  const [newTaskDriver, setNewTaskDriver] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('NORMAL');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskStartTime, setNewTaskStartTime] = useState('08:00');
  const [newTaskDueTime, setNewTaskDueTime] = useState('12:00');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  // Calendar month state
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Evaluate urgency for all tasks
  const urgentTasks = useMemo(() => {
    return tasks.filter((task) => {
      const urgency = evaluateTaskDueUrgency(
        task,
        shiftTimeMode === 'live' ? undefined : shiftTimeMode,
        reminderThreshold
      );
      return urgency.isUrgent;
    });
  }, [tasks, shiftTimeMode, reminderThreshold]);

  // Handler for sending instant alert to manager for a task
  const handleSendTaskInstantAlert = (task: OperationTask, customNote?: string) => {
    const urgency = evaluateTaskDueUrgency(
      task,
      shiftTimeMode === 'live' ? undefined : shiftTimeMode,
      reminderThreshold
    );

    const alertMessage =
      customNote ||
      `المهمة [${task.taskCode}] "${task.title}" لدى السائق (${task.driverName || 'غير معين'}) أوشكت على انتهاء موعد تنفيذها (${task.dueTime || '14:00'}). ${urgency.formattedCountdown}`;

    if (onSendInstantAlert) {
      onSendInstantAlert(task, alertMessage);
    } else {
      try {
        const savedNotifs = JSON.parse(localStorage.getItem('fleet_notifications') || '[]');
        const notif = {
          id: `notif-task-due-${task.id}-${Date.now()}`,
          companyId: task.companyId || 'company-01',
          type: 'TASK_OVERDUE',
          title: `🚨 تنبيه فوري للمسؤول: اقتراب موعد انتهاء المهمة ${task.taskCode}`,
          message: alertMessage,
          status: 'UNREAD',
          severity: 'urgent',
          entityType: 'task',
          entityId: task.id,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem('fleet_notifications', JSON.stringify([notif, ...savedNotifs]));
      } catch (e) {
        console.error(e);
      }
    }

    const updatedAlerts = {
      ...alertedTaskIds,
      [task.id]: { timestamp: new Date().toISOString(), sent: true },
    };
    setAlertedTaskIds(updatedAlerts);
    try {
      localStorage.setItem('fleet_smart_reminder_alerts', JSON.stringify(updatedAlerts));
    } catch {}

    // Add activity log to task history
    const updatedTask: OperationTask = {
      ...task,
      activityTimeline: [
        ...task.activityTimeline,
        {
          id: `act-smart-alert-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: 'نظام التذكير الذكي (Smart Reminder)',
          action: `تم إرسال تنبيه فوري لمدير الحركة والمسؤول لاقتراب موعد انتهاء التنفيذ (${task.dueTime || '14:00'})`,
          status: task.status,
        },
      ],
    };
    onUpdateTask(updatedTask);
    if (selectedTask?.id === task.id) {
      setSelectedTask(updatedTask);
    }

    setAlertFeedback(`تم إرسال تنبيه فوري للمسؤول عن المهمة ${task.taskCode} بنجاح 🚨`);
    setTimeout(() => setAlertFeedback(null), 4000);
  };

  // Bulk alert handler
  const handleAlertAllUrgentTasks = () => {
    if (urgentTasks.length === 0) return;
    urgentTasks.forEach((task) => {
      handleSendTaskInstantAlert(
        task,
        `تنبيه ذكي جماعي: المهمة [${task.taskCode}] أوشكت على انتهاء موعد التسليم (${task.dueTime})`
      );
    });
    setAlertFeedback(`تم إرسال تنبيهات فورية للمسؤولين لـ (${urgentTasks.length}) مهمة وشيكة ومتأخرة بنجاح!`);
    setTimeout(() => setAlertFeedback(null), 5000);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filterNearDueOnly) {
      const urgency = evaluateTaskDueUrgency(
        task,
        shiftTimeMode === 'live' ? undefined : shiftTimeMode,
        reminderThreshold
      );
      if (!urgency.isUrgent) return false;
    }
    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
    if (regionFilter !== 'ALL' && task.regionName !== regionFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        task.taskCode.toLowerCase().includes(q) ||
        task.title.toLowerCase().includes(q) ||
        task.driverName?.toLowerCase().includes(q) ||
        task.vehiclePlate?.toLowerCase().includes(q) ||
        task.locationName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const delayedTasks = tasks.filter((t) => t.status === 'DELAYED').length;
  const pendingTasks = tasks.filter((t) => t.status === 'PENDING' || t.status === 'ASSIGNED').length;

  // Task Status Handlers
  const handleStatusChange = (task: OperationTask, newStatus: TaskStatus, reason?: string) => {
    const updated: OperationTask = {
      ...task,
      status: newStatus,
      delayMinutes: newStatus === 'DELAYED' ? (task.delayMinutes || 30) : undefined,
      completedTime: newStatus === 'COMPLETED' ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : task.completedTime,
      activityTimeline: [
        ...task.activityTimeline,
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: 'مشغل العمليات',
          action:
            newStatus === 'IN_PROGRESS'
              ? 'بدء تحرك الشاحنة وبدء المهمة'
              : newStatus === 'COMPLETED'
              ? 'تأكيد استلام العميل واكتمال المهمة بنجاح'
              : newStatus === 'DELAYED'
              ? `تسجيل تأخير بالرحلة: ${reason || 'ازدحام مروري وتفتيش'}`
              : `تغيير حالة المهمة إلى ${newStatus}`,
          status: newStatus,
        },
      ],
    };
    onUpdateTask(updated);
    setSelectedTask(updated);
  };

  const handleToggleChecklist = (task: OperationTask, checkId: string) => {
    const updatedChecklist = (task.checklist || []).map((item) =>
      item.id === checkId ? { ...item, completed: !item.completed } : item
    );
    const updated = { ...task, checklist: updatedChecklist };
    onUpdateTask(updated);
    setSelectedTask(updated);
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const matchedVeh = vehicles.find((v) => v.id === newTaskVehicle);
    const matchedDrv = drivers.find((d) => d.id === newTaskDriver);
    const matchedLoc = locations.find((l) => l.name === newTaskLocation) || locations[0];

    const codeNum = String(tasks.length + 1).padStart(3, '0');

    const created: Partial<OperationTask> = {
      taskCode: `TASK-${codeNum}`,
      title: newTaskTitle.trim(),
      date: newTaskDate,
      regionId: newTaskRegion === 'الساحل الشمالي' ? 'reg-north-coast' : newTaskRegion === 'البحيرة' ? 'reg-beheira' : 'reg-alexandria',
      regionName: newTaskRegion,
      locationId: matchedLoc?.id || 'loc-01',
      locationName: newTaskLocation || matchedLoc?.name || 'مصنع برج العرب (المصنع الرئيسي)',
      vehicleId: matchedVeh?.id,
      vehiclePlate: matchedVeh?.plateNumber,
      driverId: matchedDrv?.id,
      driverName: matchedDrv?.name,
      priority: newTaskPriority,
      startTime: newTaskStartTime,
      dueTime: newTaskDueTime,
      status: matchedDrv ? 'ASSIGNED' : 'PENDING',
      notes: newTaskNotes.trim(),
      checklist: [
        { id: 'c1', text: 'فحص ضغط الإطارات والسوائل', completed: false },
        { id: 'c2', text: 'مطابقة بوليصة الشحن', completed: false },
        { id: 'c3', text: 'توثيق قراءة العداد', completed: false },
        { id: 'c4', text: 'توقيع إذن الاستلام من العميل', completed: false },
      ],
      activityTimeline: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: 'مشغل العمليات',
          action: 'إنشاء المهمة التشغيلية الجديدة',
          status: 'PENDING',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    onCreateTask(created);
    setShowCreateModal(false);
    setNewTaskTitle('');
    setNewTaskNotes('');
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 text-[11px] font-black rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-200 dark:bg-rose-950/80 border border-rose-500/30 dark:border-rose-500/60 shadow-2xs">
            حرجة ⚡
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-200 dark:bg-amber-950/80 border border-amber-500/30 dark:border-amber-500/60 shadow-2xs">
            عالية
          </span>
        );
      case 'NORMAL':
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-500/15 text-blue-800 dark:text-blue-200 dark:bg-blue-950/80 border border-blue-500/30 dark:border-blue-500/60 shadow-2xs">
            عادية
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-500/15 text-slate-800 dark:text-slate-200 dark:bg-slate-800 border border-slate-500/30 dark:border-slate-600 shadow-2xs">
            منخفضة
          </span>
        );
    }
  };

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 text-xs font-black rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 dark:bg-emerald-950/80 border border-emerald-500/30 dark:border-emerald-500/60 flex items-center gap-1 shadow-2xs">
            ✓ مكتملة
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-1 text-xs font-black rounded-full bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 dark:bg-cyan-950/80 border border-cyan-500/30 dark:border-cyan-500/60 flex items-center gap-1 animate-pulse shadow-2xs">
            🚚 قيد التنفيذ
          </span>
        );
      case 'DELAYED':
        return (
          <span className="px-2.5 py-1 text-xs font-black rounded-full bg-rose-500/15 text-rose-800 dark:text-rose-200 dark:bg-rose-950/80 border border-rose-500/30 dark:border-rose-500/60 flex items-center gap-1 shadow-2xs">
            ⚠️ متأخرة
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 dark:bg-indigo-950/80 border border-indigo-500/30 dark:border-indigo-500/60 flex items-center gap-1 shadow-2xs">
            تم التعيين
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-500/15 text-slate-800 dark:text-slate-200 dark:bg-slate-800 border border-slate-500/30 dark:border-slate-600 flex items-center gap-1 shadow-2xs">
            معلقة
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 dark:bg-zinc-800 border border-zinc-500/30 dark:border-zinc-700">
            ملغاة
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                إدارة العمليات والمهام اليومية
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                متابعة حركة الشاحنات والمهام اللوجستية بمحاور الإسكندرية، الساحل الشمالي، والبحيرة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
            <button
              onClick={() => setSubTab('tasks')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'tasks'
                  ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              المهام ({totalTasks})
            </button>
            <button
              onClick={() => setSubTab('trips')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'trips'
                  ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              الرحلات وخطوط السير ({trips.length})
            </button>
            <button
              onClick={() => setSubTab('calendar')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              التقويم التشغيلي
            </button>
          </div>

          {canEdit && subTab === 'tasks' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-900/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>مهمة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* METRIC CHIPS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setFilterNearDueOnly(false);
          }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'ALL' && !filterNearDueOnly
              ? 'bg-slate-900 text-white dark:bg-cyan-600 dark:text-white border-slate-700 dark:border-cyan-500 shadow-md ring-2 ring-cyan-400/30'
              : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:dark:border-slate-600'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-300">إجمالي المهام</div>
          <div className="text-xl font-black mt-1 text-slate-900 dark:text-white">{totalTasks}</div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('COMPLETED');
            setFilterNearDueOnly(false);
          }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'COMPLETED'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
              : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 hover:dark:border-emerald-500/50'
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-300 flex items-center justify-between">
            <span>مكتملة</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-300">{completedTasks}</div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('IN_PROGRESS');
            setFilterNearDueOnly(false);
          }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-cyan-600 text-white border-cyan-500 shadow-md ring-2 ring-cyan-400/30'
              : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-cyan-50/50 dark:hover:bg-slate-800/80 hover:dark:border-cyan-500/50'
          }`}
        >
          <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-300 flex items-center justify-between">
            <span>قيد التنفيذ</span>
            <PlayCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black mt-1 text-cyan-600 dark:text-cyan-300">{inProgressTasks}</div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('DELAYED');
            setFilterNearDueOnly(false);
          }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'DELAYED'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-2 ring-rose-400/30'
              : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-rose-50/50 dark:hover:bg-slate-800/80 hover:dark:border-rose-500/50'
          }`}
        >
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-300 flex items-center justify-between">
            <span>متأخرة</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black mt-1 text-rose-600 dark:text-rose-300">{delayedTasks}</div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('PENDING');
            setFilterNearDueOnly(false);
          }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'PENDING'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-400/30'
              : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-indigo-50/50 dark:hover:bg-slate-800/80 hover:dark:border-indigo-500/50'
          }`}
        >
          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 flex items-center justify-between">
            <span>معلقة / معينة</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black mt-1 text-indigo-600 dark:text-indigo-300">{pendingTasks}</div>
        </div>

        {/* 6th Chip: Smart Reminder (dueTime) */}
        <div
          onClick={() => setFilterNearDueOnly((prev) => !prev)}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            filterNearDueOnly
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500 ring-2 ring-red-400/60 shadow-lg shadow-red-500/30'
              : urgentTasks.length > 0
              ? 'bg-red-50/90 dark:bg-red-950/70 border-red-300 dark:border-red-500/70 text-red-700 dark:text-red-200 hover:bg-red-100/90 dark:hover:bg-red-900/60 ring-1 ring-red-400/40'
              : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:dark:border-slate-600'
          }`}
        >
          <div className="text-[11px] font-black text-red-600 dark:text-red-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BellRing className={`w-3.5 h-3.5 ${urgentTasks.length > 0 ? 'animate-bounce' : ''}`} />
              <span>التذكير الذكي</span>
            </span>
            {urgentTasks.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            )}
          </div>
          <div className="text-xl font-black mt-1 text-red-600 dark:text-red-300 flex items-center gap-1.5">
            <span>{urgentTasks.length}</span>
            <span className="text-[11px] font-normal opacity-90">وشيكة / متأخرة</span>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: TASKS LIST */}
      {subTab === 'tasks' && (
        <div className="space-y-4">
          {/* SMART REMINDER NOTIFICATION & CONTROL BANNER */}
          <div
            className={`p-4 rounded-2xl border transition-all duration-300 ${
              urgentTasks.length > 0
                ? 'bg-gradient-to-r from-red-500/10 via-rose-500/5 to-amber-500/10 border-red-500/40 shadow-lg shadow-red-500/10'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    urgentTasks.length > 0
                      ? 'bg-red-600 text-white shadow-red-500/30 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>ميزة التذكير الذكي للمهام الوشيكة</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                        Smart dueTime Reminder
                      </span>
                    </h2>
                    {urgentTasks.length > 0 && (
                      <span className="text-xs font-black text-red-600 dark:text-red-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                        {urgentTasks.length} مهام تتطلب تدخلاً فورياً من المسؤول
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    رصد حي لمواعيد التسليم (dueTime). المهام المقتربة تتوهج باللون الأحمر النابض مع إمكانية إرسال تنبيه فوري للمسؤول بنقرة واحدة.
                  </p>
                </div>
              </div>

              {/* Controls & Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Reference Time Mode */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                  <span className="text-slate-400 px-1.5 text-[11px] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">الوقت:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShiftTimeMode('live')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      shiftTimeMode === 'live'
                        ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    الوقت الحي ⏱️
                  </button>
                  <button
                    type="button"
                    onClick={() => setShiftTimeMode('11:15')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      shiftTimeMode === '11:15'
                        ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    11:15 ص
                  </button>
                  <button
                    type="button"
                    onClick={() => setShiftTimeMode('13:00')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      shiftTimeMode === '13:00'
                        ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    01:00 م
                  </button>
                </div>

                {/* Threshold */}
                <select
                  value={reminderThreshold}
                  onChange={(e) => setReminderThreshold(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
                  title="نافذة التنبيه المسبق قبل انتهاء الموعد"
                >
                  <option value={30}>تنبيه قبل 30 د</option>
                  <option value={45}>تنبيه قبل 45 د</option>
                  <option value={60}>تنبيه قبل 60 د</option>
                  <option value={90}>تنبيه قبل 90 د</option>
                </select>

                {/* Filter Near Due Only Button */}
                <button
                  type="button"
                  onClick={() => setFilterNearDueOnly((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    filterNearDueOnly
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-900/50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{filterNearDueOnly ? 'إلغاء تصفية الوشيكة' : `تصفية الوشيكة (${urgentTasks.length})`}</span>
                </button>

                {/* Bulk Alert Button */}
                {urgentTasks.length > 0 && canEdit && (
                  <button
                    type="button"
                    onClick={handleAlertAllUrgentTasks}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 active:scale-95 transition-all"
                  >
                    <BellRing className="w-3.5 h-3.5 animate-bounce" />
                    <span>تنبيه فوري للمسؤولين ({urgentTasks.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Alert Feedback Banner */}
            {alertFeedback && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-md shadow-emerald-600/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{alertFeedback}</span>
                </div>
                <button onClick={() => setAlertFeedback(null)} className="text-white/80 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/95 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="ابحث برقم المهمة، العنوان، السائق، اللوحة، أو الموقع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:dark:border-cyan-400 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Region Filter */}
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              >
                <option value="ALL">جميع المناطق</option>
                <option value="الإسكندرية">الإسكندرية</option>
                <option value="الساحل الشمالي">الساحل الشمالي</option>
                <option value="البحيرة">البحيرة</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              >
                <option value="ALL">جميع الأولويات</option>
                <option value="CRITICAL">حرجة</option>
                <option value="HIGH">عالية</option>
                <option value="NORMAL">عادية</option>
                <option value="LOW">منخفضة</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="PENDING">معلقة</option>
                <option value="ASSIGNED">تم التعيين</option>
                <option value="IN_PROGRESS">قيد التنفيذ</option>
                <option value="COMPLETED">مكتملة</option>
                <option value="DELAYED">متأخرة</option>
              </select>
            </div>
          </div>

          {/* Tasks Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => {
              const urgency = evaluateTaskDueUrgency(
                task,
                shiftTimeMode === 'live' ? undefined : shiftTimeMode,
                reminderThreshold
              );
              const isAlerted = !!alertedTaskIds[task.id]?.sent;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`rounded-2xl p-4.5 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                    urgency.isUrgent
                      ? 'bg-gradient-to-br from-red-50/95 via-white to-red-50/70 dark:from-slate-900 dark:via-red-950/60 dark:to-slate-900 border-2 border-red-500 dark:border-red-500 ring-4 ring-red-500/25 dark:ring-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.4)] dark:shadow-[0_0_35px_rgba(239,68,68,0.55)]'
                      : 'bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/90 hover:border-cyan-500/60 hover:dark:border-cyan-400 hover:shadow-xl hover:dark:shadow-cyan-950/50 hover:dark:bg-slate-850'
                  }`}
                >
                  {/* Subtle Top Industrial Accent for regular cards */}
                  {!urgency.isUrgent && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-slate-200 via-cyan-500/40 to-slate-200 dark:from-slate-800 dark:via-cyan-400 dark:to-slate-800 opacity-60 group-hover:opacity-100 transition-opacity" />
                  )}

                  <div>
                    {/* Glowing Red Smart Reminder Header Pill */}
                    {urgency.isUrgent && (
                      <div className="mb-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white flex items-center justify-between text-xs font-black shadow-md shadow-red-500/30 ring-1 ring-red-400/50 animate-pulse">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>تذكير ذكي: {urgency.badgeText}</span>
                        </div>
                        <span className="font-mono text-[11px] bg-red-950/70 text-red-100 border border-red-800 px-2 py-0.5 rounded font-black">
                          الموعد: {task.dueTime || '14:00'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
                          {task.taskCode}
                        </span>
                        {getPriorityBadge(task.priority)}
                      </div>
                      {getStatusBadge(task.status)}
                    </div>

                    <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-2 mb-3 leading-snug">
                      {task.title}
                    </h3>

                    <div className="space-y-2 text-xs py-2.5 px-3 rounded-xl bg-slate-50/90 dark:bg-slate-950/75 border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span className="truncate font-bold text-slate-900 dark:text-slate-100">
                          {task.locationName}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100/80 dark:bg-cyan-950/90 text-cyan-800 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-800/80">
                          {task.regionName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-amber-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                          {task.vehiclePlate || 'مركبة غير محددة'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {task.driverName || 'سائق غير معين'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {/* Time Indicator & Urgency Countdown */}
                    <div
                      className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
                        urgency.isUrgent
                          ? 'border-red-200 dark:border-red-900/70'
                          : 'border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock
                          className={`w-4 h-4 ${
                            urgency.isUrgent
                              ? 'text-red-600 dark:text-red-400 animate-spin'
                              : 'text-cyan-600 dark:text-cyan-400'
                          }`}
                        />
                        <span
                          className={
                            urgency.isUrgent
                              ? 'font-black text-red-600 dark:text-red-300'
                              : 'font-bold text-slate-700 dark:text-slate-200'
                          }
                        >
                          {task.startTime || '08:00'} - {task.dueTime || '14:00'}
                        </span>
                      </div>

                      {urgency.isUrgent ? (
                        <span className="text-[11px] font-black text-red-700 dark:text-red-200 bg-red-100/90 dark:bg-red-950/90 px-2 py-0.5 rounded-md border border-red-300 dark:border-red-700 flex items-center gap-1 shadow-2xs">
                          <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                          <span>{urgency.formattedCountdown}</span>
                        </span>
                      ) : task.delayMinutes && task.status === 'DELAYED' ? (
                        <span className="text-[11px] font-black text-rose-700 dark:text-rose-200 bg-rose-100/90 dark:bg-rose-950/90 px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-700">
                          تأخير: +{task.delayMinutes} د
                        </span>
                      ) : null}
                    </div>

                    {/* Instant Alert Action Button for Manager */}
                    {urgency.isUrgent && canEdit && (
                      <div className="mt-3 pt-2 border-t border-red-200 dark:border-red-900/40">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendTaskInstantAlert(task);
                          }}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                            isAlerted
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30 hover:shadow-red-600/50 ring-2 ring-red-400/40'
                          }`}
                        >
                          {isAlerted ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>تم إرسال التنبيه للمسؤول ✓</span>
                            </>
                          ) : (
                            <>
                              <BellRing className="w-4 h-4 animate-bounce" />
                              <span>إرسال تنبيه فوري للمسؤول 🚨</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Route className="w-10 h-10 mx-auto opacity-30 text-slate-400 mb-2" />
                <p className="text-sm font-semibold">لا توجد مهام تطابق معايير البحث والتصفية المحددة</p>
                {filterNearDueOnly && (
                  <button
                    onClick={() => setFilterNearDueOnly(false)}
                    className="mt-3 px-4 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold"
                  >
                    عرض كافة المهام
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TRIPS & ROUTES */}
      {subTab === 'trips' && (
        <TripsSheetView
          trips={trips}
          vehicles={vehicles}
          drivers={drivers}
          onOpenTripModal={onOpenTripModal || (() => {})}
          onEditTrip={onEditTrip || (() => {})}
          onDeleteTrip={onDeleteTrip || (() => {})}
          onOpenDriverMode={onOpenDriverMode}
          canEdit={canEdit}
        />
      )}

      {/* SUB-TAB 3: OPERATIONS CALENDAR */}
      {subTab === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/90 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>جدول العمليات والورديات الأسبوعي</span>
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-300 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border dark:border-slate-700">
              سبتمبر 2026 (قطاع الدلتا والإسكندرية)
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {['2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15'].map((dateStr) => {
              const dayTasks = tasks.filter((t) => t.date === dateStr);
              const isToday = dateStr === '2026-09-13';
              const delayedCount = dayTasks.filter((t) => t.status === 'DELAYED').length;

              return (
                <div
                  key={dateStr}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isToday
                      ? 'bg-cyan-50/70 dark:bg-cyan-950/40 border-cyan-500/70 ring-2 ring-cyan-500/30'
                      : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {dateStr}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-600 dark:bg-cyan-500 text-white shadow-2xs">
                          اليوم
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-3">
                      إجمالي: {dayTasks.length} مهام مجدولة
                    </div>

                    <div className="space-y-2">
                      {dayTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="p-2.5 rounded-lg bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 text-xs cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors shadow-2xs"
                        >
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {t.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-300 font-medium mt-1 flex items-center justify-between">
                            <span className="truncate font-semibold">{t.driverName}</span>
                            <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300">{t.startTime}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {delayedCount > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/90 text-[11px] font-black text-rose-600 dark:text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{delayedCount} مهام بها تأخير</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TASK DETAILS MODAL / DRAWER */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-cyan-300 border dark:border-slate-700 shadow-2xs">
                  {selectedTask.taskCode}
                </span>
                {getPriorityBadge(selectedTask.priority)}
                {getStatusBadge(selectedTask.status)}
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Smart Reminder Alert Box for Modal */}
              {(() => {
                const modalUrgency = evaluateTaskDueUrgency(
                  selectedTask,
                  shiftTimeMode === 'live' ? undefined : shiftTimeMode,
                  reminderThreshold
                );
                const isModalAlerted = !!alertedTaskIds[selectedTask.id]?.sent;

                if (!modalUrgency.isUrgent) return null;

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-500/5 dark:from-red-950/80 dark:via-slate-900 dark:to-red-950/60 border-2 border-red-500 ring-2 ring-red-500/30 dark:ring-red-500/50 shadow-lg shadow-red-500/15 animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-600/40">
                        <BellRing className="w-5 h-5 animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-red-600 dark:text-red-300">
                            تذكير ذكي: {modalUrgency.badgeText}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-600 text-white font-bold">
                            موعد التسليم: {selectedTask.dueTime || '14:00'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 font-medium">
                          {modalUrgency.formattedCountdown} — المهمة تتطلب متابعة فورية مع السائق ({selectedTask.driverName || 'غير معين'}).
                        </p>
                      </div>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleSendTaskInstantAlert(selectedTask)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0 ${
                          isModalAlerted
                            ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 hover:shadow-red-600/50 ring-2 ring-red-400/50'
                        }`}
                      >
                        {isModalAlerted ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تم إرسال التنبيه للمسؤول ✓</span>
                          </>
                        ) : (
                          <>
                            <BellRing className="w-4 h-4 animate-bounce" />
                            <span>إرسال تنبيه فوري للمسؤول 🚨</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}

              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedTask.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">{selectedTask.notes}</p>
              </div>

              {/* Assignment info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">المنطقة والموقع</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">
                    {selectedTask.locationName}
                  </span>
                  <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 block mt-0.5">
                    ({selectedTask.regionName})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">المركبة</span>
                  <span className="font-mono font-black text-slate-900 dark:text-amber-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border dark:border-slate-700 inline-block shadow-2xs">
                    {selectedTask.vehiclePlate || 'غير محددة'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">السائق المعين</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">
                    {selectedTask.driverName || 'غير معين'}
                  </span>
                </div>
              </div>

              {/* Action Buttons for dispatchers */}
              {canEdit && (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-full mb-1">
                    إجراءات سريعة لحالة المهمة:
                  </span>
                  <button
                    onClick={() => handleStatusChange(selectedTask, 'IN_PROGRESS')}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>بدء التحرك</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedTask, 'COMPLETED')}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>اكتمال التسليم</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedTask, 'DELAYED', 'كثافة مرورية بطريق الساحل')}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>تسجيل تأخير</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedTask, 'CANCELLED')}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors border dark:border-slate-600"
                  >
                    إلغاء
                  </button>
                </div>
              )}

              {/* Interactive Checklist */}
              <div>
                <h3 className="text-xs font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>قائمة مهام الفحص والتسليم (Checklist)</span>
                </h3>
                <div className="space-y-2">
                  {(selectedTask.checklist || []).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => canEdit && handleToggleChecklist(selectedTask, item.id)}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                        canEdit ? 'cursor-pointer' : ''
                      } ${
                        item.completed
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-medium'
                          : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold'
                      }`}
                    >
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0" />
                      )}
                      <span className={`text-xs ${item.completed ? 'line-through opacity-75' : ''}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h3 className="text-xs font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <span>سجل الأنشطة والمتابعة الزمنية</span>
                </h3>
                <div className="space-y-3.5 relative border-r-2 border-slate-200 dark:border-slate-700 pr-4 mr-2">
                  {(selectedTask.activityTimeline || []).map((act) => (
                    <div key={act.id} className="relative">
                      <div className="absolute -right-[23px] top-1 w-3 h-3 rounded-full bg-cyan-500 ring-4 ring-white dark:ring-slate-900" />
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {act.action}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>بواسطة: {act.actor}</span>
                        <span>•</span>
                        <span>{new Date(act.timestamp).toLocaleString('ar-EG')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-500" />
                <span>إصدار أمر مهمة تشغيلية جديدة</span>
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان المهمة والشحنة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: توريد 15 طن منتجات غذائية لمخزن سموحة"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المنطقة اللوجستية
                  </label>
                  <select
                    value={newTaskRegion}
                    onChange={(e) => setNewTaskRegion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
                  >
                    <option value="الإسكندرية">الإسكندرية</option>
                    <option value="الساحل الشمالي">الساحل الشمالي</option>
                    <option value="البحيرة">البحيرة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الأولوية
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
                  >
                    <option value="NORMAL">عادية</option>
                    <option value="HIGH">عالية</option>
                    <option value="CRITICAL">حرجة وعاجلة</option>
                    <option value="LOW">منخفضة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المركبة
                  </label>
                  <select
                    value={newTaskVehicle}
                    onChange={(e) => setNewTaskVehicle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">اختر مركبة من الأسطول...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.code} - {v.plateNumber} ({v.model})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    السائق
                  </label>
                  <select
                    value={newTaskDriver}
                    onChange={(e) => setNewTaskDriver(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">اختر سائق معتمد...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name} ({d.operatingZone || 'كل المحاور'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    وقت البدء
                  </label>
                  <input
                    type="time"
                    value={newTaskStartTime}
                    onChange={(e) => setNewTaskStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    وقت الوصول الأقصى
                  </label>
                  <input
                    type="time"
                    value={newTaskDueTime}
                    onChange={(e) => setNewTaskDueTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات وتعليمات التشغيل
                </label>
                <textarea
                  rows={2}
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="ملاحظات العميل، شروط التخزين، بوالص الشحن..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-900/20"
                >
                  حفظ وإصدار المهمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
