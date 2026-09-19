import React, { useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Shield,
  Eye,
  UserCheck,
  Clock,
  Trash2,
  RefreshCw,
  Mail,
  User as UserIcon,
  Cloud,
  CheckCircle2,
  UserPlus,
  Edit,
  Search,
  Filter,
  Phone,
  Briefcase,
  X,
  Lock,
  Truck,
  Wrench,
  AlertCircle,
  Check,
  Ban,
  DollarSign,
  Building2,
  MapPin,
  Sparkles,
  Layers,
  FileSpreadsheet,
  SlidersHorizontal,
} from 'lucide-react';
import { UserProfile, UserRole, UserStatus, Driver } from '../types';

interface UsersManagementViewProps {
  currentUser?: any;
  currentUserProfile?: UserProfile | null;
  users?: UserProfile[];
  userProfiles?: UserProfile[];
  onUpdateRole?: (userId: string, role: UserRole) => Promise<void>;
  onUpdateUserRole?: (userId: string, role: UserRole, status: any) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onRefresh?: () => void;
  showToast?: (title: string, message?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onGoogleLogin?: () => void;
  onInviteUser?: (email: string, displayName: string, role: UserRole) => Promise<void>;
  onAddUser?: (accountData: {
    email: string;
    displayName: string;
    role: UserRole;
    status?: UserStatus;
    jobTitle?: string;
    department?: string;
    assignedBranch?: string;
    phone?: string;
    assignedDriverId?: string;
    customPermissions?: string[];
  }) => Promise<void>;
  onUpdateUserDetails?: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  drivers?: Driver[];
  effectiveRole?: any;
  canManageUsers?: boolean;
}

const ROLES_INFO: {
  role: UserRole;
  title: string;
  shortTitle: string;
  badgeColor: string;
  icon: React.ElementType;
  description: string;
  permissions: string[];
}[] = [
  {
    role: 'admin',
    title: 'مدير نظام وأسطول (Admin)',
    shortTitle: 'مدير نظام',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    icon: ShieldCheck,
    description: 'صلاحيات إدارية كاملة لإدارة الأسطول، تعيين الصلاحيات، وإدارة الحسابات وحذف السجلات الحساسة.',
    permissions: ['إدارة كاملة للمستخدمين والصلاحيات', 'إضافة وتعديل وحذف الشاحنات والسائقين', 'حذف وتعديل الرحلات والصيانة', 'تصدير ومزامنة شيتات Google Sheets'],
  },
  {
    role: 'manager',
    title: 'مشرف تشغيل وحركة (Manager)',
    shortTitle: 'مشرف تشغيل',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    icon: Shield,
    description: 'إشراف يومي على خطوط السير وتوزيع الرحلات بين المصانع والمحافظات وإسناد الشاحنات.',
    permissions: ['إنهاء وجدولة الرحلات اليومية', 'إسناد السائقين للشاحنات ومتابعة توفرهم', 'تسجيل ومتابعة استهلاك الوقود العام', 'الاطلاع على تقارير الأداء الشهرية'],
  },
  {
    role: 'operation',
    title: 'مسؤول حركة ولوجستيات (Logistics)',
    shortTitle: 'مسؤول لوجستيات',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    icon: Briefcase,
    description: 'متابعة نقاط الوصول والمخازن وموانئ الإسكندرية والبحيرة والساحل الشمالي وتنسيق الشحنات.',
    permissions: ['إدارة وتسجيل الأماكن والمواقع الجغرافية', 'متابعة مسارات النقل بين الفروع والمصانع', 'تسجيل الرحلات النموذجية'],
  },
  {
    role: 'finance',
    title: 'محاسب مالي ومراقب تكاليف (Finance)',
    shortTitle: 'محاسب تكاليف',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: DollarSign,
    description: 'تدقيق فواتير الوقود، مراجعة تكاليف الصيانة وقطع الغيار، والتحليل المالي وتصدير التقارير.',
    permissions: ['مراجعة وتدقيق تكاليف السولار والوقود', 'مراجعة فواتير الصيانة والورش', 'تصدير التقارير المالية لشيتات Excel', 'متابعة نفقات الأسطول وحركة المركبات'],
  },
  {
    role: 'maintenance',
    title: 'فني صيانة وورشة (Maintenance)',
    shortTitle: 'فني صيانة',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    icon: Wrench,
    description: 'تسجيل أعمال الصيانة الدورية، متابعة عدادات الزيوت والفلاتر، وإصلاح الأعطال الطارئة للشاحنات.',
    permissions: ['إضافة وتحديث سجلات الصيانة السحابية', 'تحديث عداد الزيت القادم للسيارات', 'متابعة تنبيهات الصيانة العاجلة'],
  },
  {
    role: 'driver',
    title: 'سائق أسطول معتمد (Driver)',
    shortTitle: 'سائق أسطول',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Truck,
    description: 'مخصص لشاشة وضع السائق (Driver Mode)؛ بدء وإنهاء رحلاته، تسجيل الكيلومترات، وتدوين إيصالات الوقود.',
    permissions: ['الوصول لوضع السائق الخاص به (Driver Mode)', 'بدء وإنهاء الرحلات المسندة إليه فقط', 'تسجيل استهلاك السولار والبنزين للشاحنة', 'تحديث قراءة العداد (Odometer)'],
  },
  {
    role: 'viewer',
    title: 'مستعرض تقارير فقط (Viewer)',
    shortTitle: 'مستعرض تقارير',
    badgeColor: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    icon: Eye,
    description: 'صلاحية قراءة فقط للاطلاع على لوحات المتابعة ومؤشرات الأداء وتحميل التقارير دون تعديل.',
    permissions: ['عرض لوحة المتابعة المباشرة', 'قراءة سجلات الرحلات والسيارات', 'تصدير التقارير بصيغة Excel'],
  },
];

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  currentUser,
  currentUserProfile,
  users: propUsers = [],
  userProfiles = [],
  onUpdateRole,
  onUpdateUserRole,
  onDeleteUser,
  onRefresh,
  showToast,
  onAddUser,
  onInviteUser,
  onUpdateUserDetails,
  drivers = [],
  effectiveRole: propEffectiveRole,
  canManageUsers = true,
}) => {
  const users = useMemo(() => {
    if (Array.isArray(propUsers) && propUsers.length > 0) return propUsers;
    if (Array.isArray(userProfiles) && userProfiles.length > 0) return userProfiles;
    if (Array.isArray(propUsers)) return propUsers;
    if (Array.isArray(userProfiles)) return userProfiles;
    return [];
  }, [propUsers, userProfiles]);

  const safeUsers = Array.isArray(users) ? users : [];

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<UserProfile | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');

  // Form State for Adding / Editing
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    role: 'viewer' as UserRole,
    status: 'pending' as UserStatus,
    jobTitle: '',
    department: '',
    assignedBranch: '',
    phone: '',
    assignedDriverId: '',
    customPermissions: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPermissionsMatrix, setShowPermissionsMatrix] = useState(false);

  // Permission Verification
  const SUPER_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const effectiveUserEmail = (currentUserProfile?.email || currentUser?.email || '').trim().toLowerCase();
  const effectiveUserUid = currentUserProfile?.uid || currentUser?.uid || '';
  const effectiveRole = currentUserProfile?.role;
  const isSuperAdmin = effectiveRole === 'SUPER_ADMIN' || (SUPER_ADMIN_EMAIL !== '' && effectiveUserEmail === SUPER_ADMIN_EMAIL);
  const isAdmin = isSuperAdmin || effectiveRole === 'admin' || effectiveRole === 'COMPANY_ADMIN';

  const isTargetUserSuperAdmin = (targetUser?: { email?: string; role?: string } | null): boolean => {
    if (!targetUser) return false;
    if (targetUser.role === 'SUPER_ADMIN') return true;
    if (SUPER_ADMIN_EMAIL && targetUser.email && targetUser.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL) return true;
    return false;
  };

  const triggerToast = (
    title: string,
    message?: string,
    type: 'success' | 'warning' | 'info' | 'error' = 'info'
  ) => {
    if (showToast) {
      showToast(title, message, type);
    }
  };

  // Safe Guard: Check permissions before changing sensitive data
  const assertAdminPermission = (): boolean => {
    if (!isAdmin) {
      triggerToast(
        'تم رفض الإجراء أمنياً',
        'غير مصرح: يتطلب إجراء هذا التعديل صلاحية مدير نظام (Admin). تم منع التعديل لحماية البيانات الحساسة.',
        'error'
      );
      return false;
    }
    return true;
  };

  const handleRoleChange = async (targetUser: UserProfile, newRole: UserRole) => {
    if (!assertAdminPermission()) return;

    if (isTargetUserSuperAdmin(targetUser) && newRole !== 'SUPER_ADMIN' && newRole !== 'admin') {
      triggerToast('حماية الحساب الأساسي', 'لا يمكن سحب صلاحية الإدارة من حساب المالك الرئيسي للمشروع', 'warning');
      return;
    }

    setUpdatingId(targetUser.uid);
    try {
      const currentStatus = targetUser.status || (isTargetUserSuperAdmin(targetUser) ? 'active' : 'pending');
      const newStatus = currentStatus === 'pending' ? 'active' : currentStatus;
      if (onUpdateUserRole) {
        await onUpdateUserRole(targetUser.uid, newRole, newStatus);
      } else if (onUpdateRole) {
        await onUpdateRole(targetUser.uid, newRole);
      }
      triggerToast('تم تحديث الدور والصلاحية', `تم تعيين صلاحية (${getRoleShortTitle(newRole)}) للمستخدم ${targetUser.displayName}`, 'success');
    } catch (err: any) {
      triggerToast('خطأ في التحديث', err?.message || 'تعذر تغيير الصلاحيات في السحابة', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (targetUser: UserProfile, newStatus: UserStatus) => {
    if (!assertAdminPermission()) return;

    if (isTargetUserSuperAdmin(targetUser) && newStatus !== 'active') {
      triggerToast('حماية الحساب الأساسي', 'لا يمكن تعليق أو إيقاف حساب المالك الرئيسي للمشروع', 'warning');
      return;
    }

    setUpdatingId(targetUser.uid);
    try {
      if (onUpdateUserRole) {
        await onUpdateUserRole(targetUser.uid, targetUser.role, newStatus);
      } else if (onUpdateUserDetails) {
        await onUpdateUserDetails(targetUser.uid, { status: newStatus });
      }
      const label = newStatus === 'active' ? 'نشط ومصرح له' : newStatus === 'pending' ? 'معلق بانتظار الإذن' : 'موقوف';
      triggerToast('تم تعديل حالة الحساب', `تم تغيير حالة حساب ${targetUser.displayName} إلى (${label}) بنجاح`, 'success');
    } catch (err: any) {
      triggerToast('خطأ في التحديث', err?.message || 'تعذر تحديث حالة الحساب في السحابة', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // 1-Click Fast Activation
  const handleFastActivate = async (user: UserProfile) => {
    if (!assertAdminPermission()) return;
    setUpdatingId(user.uid);
    try {
      if (onUpdateUserRole) {
        await onUpdateUserRole(user.uid, user.role, 'active');
      } else if (onUpdateUserDetails) {
        await onUpdateUserDetails(user.uid, { status: 'active' });
      }
      triggerToast('تم اعتماد وتفعيل الحساب', `تم منح الإذن وتفعيل حساب ${user.displayName || user.name} فورياً بنجاح`, 'success');
    } catch (err: any) {
      triggerToast('خطأ في التفعيل', err?.message || 'تعذر تفعيل الحساب', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenAddModal = () => {
    if (!assertAdminPermission()) return;

    setFormData({
      displayName: '',
      email: '',
      role: 'viewer',
      status: 'pending', // Default to pending until given permission!
      jobTitle: '',
      department: '',
      assignedBranch: '',
      phone: '',
      assignedDriverId: '',
      customPermissions: [],
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: UserProfile) => {
    if (!assertAdminPermission()) return;

    setEditingUser(user);
    setFormData({
      displayName: user.displayName || user.name || '',
      email: user.email || '',
      role: user.role,
      status: user.status || (isTargetUserSuperAdmin(user) ? 'active' : 'pending'),
      jobTitle: user.jobTitle || '',
      department: user.department || '',
      assignedBranch: user.assignedBranch || '',
      phone: user.phone || '',
      assignedDriverId: user.assignedDriverId || '',
      customPermissions: user.customPermissions || [],
    });
    setFormError('');
  };

  const handleOpenApproveModal = (user: UserProfile) => {
    if (!assertAdminPermission()) return;

    setEditingUser(user);
    setFormData({
      displayName: user.displayName || user.name || '',
      email: user.email || '',
      role: user.role === 'viewer' ? 'manager' : user.role,
      status: 'active', // Pre-set to active so admin approves and grants permission
      jobTitle: user.jobTitle || '',
      department: user.department || '',
      assignedBranch: user.assignedBranch || '',
      phone: user.phone || '',
      assignedDriverId: user.assignedDriverId || '',
      customPermissions: user.customPermissions || [],
    });
    setFormError('');
  };

  const handleTogglePermission = (permKey: string) => {
    setFormData((prev) => {
      const exists = prev.customPermissions.includes(permKey);
      return {
        ...prev,
        customPermissions: exists
          ? prev.customPermissions.filter((p) => p !== permKey)
          : [...prev.customPermissions, permKey],
      };
    });
  };

  const applyPresetProfile = (preset: {
    title: string;
    role: UserRole;
    department: string;
    branch: string;
    jobTitle: string;
    permissions: string[];
  }) => {
    setFormData((prev) => ({
      ...prev,
      role: preset.role,
      department: preset.department,
      assignedBranch: preset.branch,
      jobTitle: preset.jobTitle,
      customPermissions: preset.permissions,
    }));
    triggerToast('تم تطبيق النموذج', `تم ضبط بيانات الوظيفة كـ: ${preset.title}`, 'info');
  };

  const handleSaveAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assertAdminPermission()) return;

    if (!formData.displayName.trim()) {
      setFormError('يرجى إدخال اسم الموظف أو المستخدم بالكامل');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('يرجى كتابة بريد إلكتروني صحيح ومعتمد للعمل');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingUser) {
        // Prevent demoting the Super Admin
        const roleToSave = isTargetUserSuperAdmin(editingUser) ? (editingUser?.role || 'SUPER_ADMIN') : formData.role;
        const statusToSave = isTargetUserSuperAdmin(editingUser) ? 'active' : formData.status;

        if (onUpdateUserDetails) {
          await onUpdateUserDetails(editingUser.uid, {
            displayName: formData.displayName.trim(),
            name: formData.displayName.trim(),
            role: roleToSave,
            status: statusToSave,
            jobTitle: formData.jobTitle.trim(),
            department: formData.department.trim(),
            assignedBranch: formData.assignedBranch.trim(),
            phone: formData.phone.trim(),
            assignedDriverId: formData.assignedDriverId,
            customPermissions: formData.customPermissions,
          });
        } else if (onUpdateUserRole) {
          await onUpdateUserRole(editingUser.uid, roleToSave, statusToSave);
        }
        const wasPendingNowActive = editingUser.status === 'pending' && statusToSave === 'active';
        triggerToast(
          wasPendingNowActive ? 'تم منح الإذن واعتماد الحساب' : 'تم تحديث بيانات الحساب',
          wasPendingNowActive
            ? `تم منح الإذن وتفعيل حساب ${formData.displayName} وتعيين مسؤوليته (${getRoleShortTitle(roleToSave)}) بنجاح`
            : `تم حفظ بيانات ${formData.displayName} وتحديث دوره بنجاح`,
          'success'
        );
        setEditingUser(null);
      } else {
        if (onAddUser) {
          await onAddUser({
            displayName: formData.displayName.trim(),
            email: formData.email.trim().toLowerCase(),
            role: formData.role,
            status: formData.status || 'pending',
            jobTitle: formData.jobTitle.trim(),
            department: formData.department.trim(),
            assignedBranch: formData.assignedBranch.trim(),
            phone: formData.phone.trim(),
            assignedDriverId: formData.assignedDriverId,
            customPermissions: formData.customPermissions,
          });
        } else if (onInviteUser) {
          await onInviteUser(formData.email.trim().toLowerCase(), formData.displayName.trim(), formData.role);
        } else {
          throw new Error('خدمة إضافة الحسابات غير متوفرة حالياً');
        }
        triggerToast(
          'تمت إضافة الحساب بنجاح',
          formData.status === 'pending'
            ? `تم حفظ حساب ${formData.displayName} في حالة (معلق) لحين إعطائه الإذن وتعيين مسؤوليته`
            : `تم إنشاء وتفعيل حساب ${formData.displayName} بنجاح`,
          'success'
        );
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء حفظ بيانات الحساب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModalUser) return;
    if (!assertAdminPermission()) return;

    if (deleteModalUser.uid === currentUser?.uid || (isTargetUserSuperAdmin(deleteModalUser) && (deleteModalUser.uid === effectiveUserUid || !deleteModalUser.uid.startsWith('user_')))) {
      triggerToast('تنبيه أمني', 'لا يمكن حذف الحساب الأساسي لمالك النظام النشط حالياً', 'error');
      setDeleteModalUser(null);
      return;
    }

    try {
      await onDeleteUser(deleteModalUser.uid);
      triggerToast('تم الحذف', `تم حذف حساب ${deleteModalUser.displayName} بنجاح من قاعدة البيانات`, 'info');
      setDeleteModalUser(null);
    } catch (err: any) {
      triggerToast('خطأ في الحذف', err?.message || 'تعذر حذف الحساب', 'error');
    }
  };

  const getRoleShortTitle = (role: UserRole) => {
    const found = ROLES_INFO.find((r) => r.role === role);
    return found ? found.shortTitle : role;
  };

  const getRoleBadge = (role: UserRole) => {
    const info = ROLES_INFO.find((r) => r.role === role) || ROLES_INFO[5];
    const IconComponent = info.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${info.badgeColor}`}>
        <IconComponent className="w-3.5 h-3.5" />
        {info.shortTitle}
      </span>
    );
  };

  const getStatusBadge = (status?: UserStatus, email?: string, role?: UserRole) => {
    const isSuper = isTargetUserSuperAdmin({ email, role });
    const effective = isSuper ? 'active' : (status || 'pending');

    if (effective === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-bold bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/35 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          معلق (بانتظار الإذن)
        </span>
      );
    }
    if (effective === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1.5 text-red-400 text-xs font-semibold bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
          <Ban className="w-3.5 h-3.5" />
          موقوف
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        نشط ومصرح له
      </span>
    );
  };

  // Counts
  const pendingUsers = useMemo(
    () => safeUsers.filter((u) => (u.status === 'pending' || (!u.status && !isTargetUserSuperAdmin(u)))),
    [safeUsers]
  );
  const pendingCount = pendingUsers.length;
  const activeCount = safeUsers.filter((u) => u.status === 'active' || (!u.status && isTargetUserSuperAdmin(u))).length;
  const suspendedCount = safeUsers.filter((u) => u.status === 'suspended').length;
  const adminCount = safeUsers.filter((u) => u.role === 'admin').length;
  const driverCount = safeUsers.filter((u) => u.role === 'driver').length;
  const managerCount = safeUsers.filter((u) => u.role === 'manager' || u.role === 'operation').length;
  const viewerCount = safeUsers.filter((u) => u.role === 'viewer').length;

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return safeUsers.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q));

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const isSuper = isTargetUserSuperAdmin(u);
      const effectiveStatus = isSuper ? 'active' : (u.status || 'pending');
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [safeUsers, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Security Status Banner for Non-Admins */}
      {!isAdmin && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-300">وضع الاستعراض الآمن (صلاحيات محدودة)</h4>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              أنت مسجل بصلاحية <span className="font-bold underline">{getRoleShortTitle(effectiveRole || 'viewer')}</span>. تم تفعيل نظام التحقق من الصلاحيات لحماية بيانات الأسطول؛ لا يمكن تعديل أدوار المستخدمين أو إنشاء حسابات جديدة إلا من قِبل مديري النظام (Admins).
            </p>
          </div>
        </div>
      )}

      {/* Header & Quick Stats */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-white">إدارة الحسابات وصلاحيات فريق العمل</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Cloud className="w-3.5 h-3.5 animate-pulse" />
                  مزامنة سحابية نشطة (Firestore)
                </span>
                {pendingCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {pendingCount} حساب جديد معلق بانتظار الإذن
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    كافة الحسابات معتمدة ومفعلة
                  </span>
                )}
              </div>
              <p className="text-neutral-400 text-sm mt-1">
                واجهة مركزية واضحة لإنشاء حسابات الموظفين، تعيين أدوارهم (Admin, Driver, Manager)، واعتماد الحسابات المعلقة ومنحها الإذن بالعمل.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <button
              id="btn-open-permissions-matrix"
              onClick={() => setShowPermissionsMatrix(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition font-medium text-sm cursor-pointer"
              title="عرض مصفوفة ودليل الصلاحيات الكاملة لكل رتبة"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>مصفوفة الصلاحيات</span>
            </button>

            {isAdmin ? (
              <button
                id="btn-open-add-user"
                onClick={handleOpenAddModal}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة حساب جديد (معلق)</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800/80 px-3 py-2 rounded-xl border border-neutral-700">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>إضافة الحسابات تتطلب رتبة مدير</span>
              </div>
            )}

            {onRefresh && (
              <button
                id="btn-refresh-users"
                onClick={onRefresh}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition font-medium text-sm cursor-pointer"
                title="تحديث البيانات من السحابة"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تحديث</span>
              </button>
            )}
          </div>
        </div>

        {/* Roles & Status Distribution Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-neutral-800">
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-neutral-900 border-emerald-500' : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
              <span>إجمالي الحسابات</span>
              <Users className="w-4 h-4 text-neutral-300" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{safeUsers.length}</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">مسجلين بالنظام</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                : pendingCount > 0
                ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500'
                : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
              <span>معلق (بانتظار الإذن)</span>
              <Clock className={`w-4 h-4 ${pendingCount > 0 ? 'text-amber-400 animate-pulse' : 'text-neutral-500'}`} />
            </div>
            <div className={`text-2xl font-black mt-1.5 ${pendingCount > 0 ? 'text-amber-400' : 'text-neutral-400'}`}>
              {pendingCount}
            </div>
            <div className="text-[11px] text-amber-300/80 mt-0.5">يتطلب الاعتماد والمسؤولية</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              statusFilter === 'active' ? 'bg-emerald-950/30 border-emerald-500' : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
              <span>نشط ومصرح له</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1.5">{activeCount}</div>
            <div className="text-[11px] text-emerald-300/80 mt-0.5">جاهزون للعمل فوراً</div>
          </div>

          <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
              <span>سائقو الأسطول</span>
              <Truck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1.5">{driverCount}</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">مفعلين بوضع السائق</div>
          </div>

          <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
              <span>مديرو النظام (Admins)</span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400 mt-1.5">{adminCount}</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">تحكم كامل بالنظام</div>
          </div>
        </div>
      </div>

      {/* Pending Accounts Alert Banner */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-neutral-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-amber-950/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-amber-200">
                  يوجد {pendingCount} حساب جديد معلق بانتظار منح الإذن وتعيين المسؤولية
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  إجراء إداري مطلوب
                </span>
              </div>
              <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                وفقاً لطلبك: يتم تعليق أي حساب جديد تلقائياً لحين قيامك بمراجعته، منحه إذن العمل، وتعيين مسؤوليته المحددة (سائق، مدير، عمليات، صيانة). لن يتمكن صاحب الحساب المعلق من إجراء تعديلات بالأسطول حتى اعتماده.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{statusFilter === 'pending' ? 'عرض كافة الحسابات' : 'عرض المعلقين فقط'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Role Explanations Grid */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          مستويات الصلاحيات المتاحة في النظام
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ROLES_INFO.map((info) => {
            const IconComponent = info.icon;
            return (
              <div
                key={info.role}
                className="bg-neutral-950/80 p-3.5 rounded-xl border border-neutral-800/90 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${info.badgeColor}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                      {info.shortTitle}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed mt-1">
                    {info.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-900 text-[11px] text-neutral-500">
                  <span className="font-semibold text-neutral-400">أبرز الصلاحيات: </span>
                  {info.permissions[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="users-search-input"
            type="text"
            placeholder="ابحث بالاسم، البريد الإلكتروني، المسمى الوظيفي، أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl pr-10 pl-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-700/80 rounded-xl px-3 py-1.5 flex-1 sm:flex-initial">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <select
              id="users-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs text-neutral-300 focus:outline-none cursor-pointer w-full"
            >
              <option value="all" className="bg-neutral-900 text-white">كل الحالات ({users.length})</option>
              <option value="pending" className="bg-neutral-900 text-amber-300">معلق بانتظار الإذن ({pendingCount})</option>
              <option value="active" className="bg-neutral-900 text-emerald-400">نشط ومصرح ({activeCount})</option>
              <option value="suspended" className="bg-neutral-900 text-red-400">موقوف ({suspendedCount})</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-700/80 rounded-xl px-3 py-1.5 flex-1 sm:flex-initial">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              id="users-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs text-neutral-300 focus:outline-none cursor-pointer w-full"
            >
              <option value="all" className="bg-neutral-900 text-white">كل الأدوار والوظائف</option>
              <option value="admin" className="bg-neutral-900 text-white">مدير نظام (Admin)</option>
              <option value="manager" className="bg-neutral-900 text-white">مشرف تشغيل (Manager)</option>
              <option value="operation" className="bg-neutral-900 text-white">مسؤول لوجستيات (Logistics)</option>
              <option value="finance" className="bg-neutral-900 text-emerald-300">محاسب مالي وتكاليف (Finance)</option>
              <option value="maintenance" className="bg-neutral-900 text-white">فني صيانة (Maintenance)</option>
              <option value="driver" className="bg-neutral-900 text-white">سائق أسطول (Driver)</option>
              <option value="viewer" className="bg-neutral-900 text-white">مستعرض فقط (Viewer)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-white text-lg">
              قائمة المستخدمين ({filteredUsers.length} من {users.length})
            </h2>
          </div>
          <div className="text-xs text-neutral-400">
            {isAdmin ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                لديك صلاحية التعديل والإدارة
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                عرض فقط — الحقول الحساسة محمية
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-neutral-950/80 text-neutral-400 text-xs border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4 font-semibold">المستخدم والبريد الإلكتروني</th>
                <th className="px-6 py-4 font-semibold">المسمى الوظيفي والقسم والفرع</th>
                <th className="px-6 py-4 font-semibold">الدور والصلاحية الحالية</th>
                <th className="px-6 py-4 font-semibold">حالة الحساب</th>
                <th className="px-6 py-4 font-semibold">تاريخ التسجيل</th>
                <th className="px-6 py-4 font-semibold text-center">التحكم وتعديل البيانات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    لا توجد حسابات تطابق خيارات البحث الحالية
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = (currentUser?.uid && currentUser?.uid === user.uid) || (effectiveUserEmail && effectiveUserEmail === user.email.toLowerCase());
                  const isThisUserSuperAdmin = isTargetUserSuperAdmin(user);
                  const isBusy = updatingId === user.uid;
                  const linkedDriver = user.assignedDriverId ? drivers.find((d) => d.id === user.assignedDriverId) : null;

                  return (
                    <tr
                      key={user.uid}
                      className={`hover:bg-neutral-800/40 transition ${
                        isCurrent ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              className="w-10 h-10 rounded-full border border-neutral-700 object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 font-bold shrink-0">
                              {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : <UserIcon className="w-5 h-5" />}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-base">
                                {user.displayName || user.name || 'عضو غير مسمى'}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  أنت (حسابك)
                                </span>
                              )}
                              {isThisUserSuperAdmin && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  المالك الرئيسي
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                              <Mail className="w-3.5 h-3.5 text-neutral-500" />
                              <span dir="ltr">{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Job Title, Department, Branch & Phone */}
                      <td className="px-6 py-4 text-xs">
                        {user.jobTitle ? (
                          <div className="font-medium text-white flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>{user.jobTitle}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-500">غير محدد</span>
                        )}
                        {user.department && (
                          <div className="text-emerald-400/90 mt-1 flex items-center gap-1 text-[11px]">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span>{user.department}</span>
                          </div>
                        )}
                        {user.assignedBranch && (
                          <div className="text-cyan-400/90 mt-0.5 flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{user.assignedBranch}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="text-neutral-400 mt-1 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span dir="ltr">{user.phone}</span>
                          </div>
                        )}
                        {linkedDriver && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <Truck className="w-3 h-3 shrink-0" />
                            <span>مرتبط بالسائق: {linkedDriver.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(user.status, user.email)}
                          {user.status === 'pending' && !isThisUserSuperAdmin && (
                            <span className="text-[10px] text-amber-400/90 font-medium">
                              بانتظار الإذن والمسؤولية
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 text-xs text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span>
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString('ar-EG', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'مسجل سابقاً'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {isAdmin ? (
                            <>
                              {/* 1-Click Fast Activate Button for Pending Users */}
                              {user.status === 'pending' && !isThisUserSuperAdmin && (
                                <button
                                  id={`fast-activate-btn-${user.uid}`}
                                  disabled={isBusy}
                                  onClick={() => handleFastActivate(user)}
                                  title="تفعيل واعتماد الحساب فوراً بنقرة واحدة"
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20 transition cursor-pointer shrink-0"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>تفعيل فوري</span>
                                </button>
                              )}

                              {/* Detailed Approve Button for Pending Users */}
                              {user.status === 'pending' && !isThisUserSuperAdmin && (
                                <button
                                  id={`approve-user-btn-${user.uid}`}
                                  disabled={isBusy}
                                  onClick={() => handleOpenApproveModal(user)}
                                  title="منح الإذن وتعيين المسؤولية وتفعيل الحساب بتفاصيل محددة"
                                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                                >
                                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                  <span>تعيين المسؤولية</span>
                                </button>
                              )}

                              {/* Quick Status Toggle */}
                              {!isThisUserSuperAdmin ? (
                                <select
                                  id={`select-status-${user.uid}`}
                                  disabled={isBusy}
                                  value={user.status || 'pending'}
                                  onChange={(e) =>
                                    handleStatusChange(user, e.target.value as UserStatus)
                                  }
                                  title="تغيير حالة الحساب فوراً"
                                  className={`border rounded-lg px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-emerald-500 transition cursor-pointer ${
                                    user.status === 'pending'
                                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                                      : user.status === 'suspended'
                                      ? 'bg-red-950/60 border-red-500/50 text-red-300'
                                      : 'bg-neutral-800 border-neutral-700 text-emerald-400'
                                  }`}
                                >
                                  <option value="pending" className="bg-neutral-900 text-amber-300">معلق</option>
                                  <option value="active" className="bg-neutral-900 text-emerald-400">نشط ومصرح</option>
                                  <option value="suspended" className="bg-neutral-900 text-red-400">موقوف</option>
                                </select>
                              ) : null}

                              {/* Quick Role Selector */}
                              {!isThisUserSuperAdmin ? (
                                <select
                                  id={`select-role-${user.uid}`}
                                  disabled={isBusy}
                                  value={user.role}
                                  onChange={(e) =>
                                    handleRoleChange(user, e.target.value as UserRole)
                                  }
                                  title="تغيير صلاحية المستخدم فوراً"
                                  className="bg-neutral-800 border border-neutral-700 text-white rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-emerald-500 transition cursor-pointer"
                                >
                                  <option value="admin">مدير نظام (Admin)</option>
                                  <option value="manager">مشرف تشغيل (Manager)</option>
                                  <option value="operation">مسؤول لوجستيات</option>
                                  <option value="finance">محاسب مالي (Finance)</option>
                                  <option value="maintenance">فني صيانة</option>
                                  <option value="driver">سائق أسطول (Driver)</option>
                                  <option value="viewer">مستعرض فقط</option>
                                </select>
                              ) : (
                                <span className="text-[11px] text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                                  مدير ثابت
                                </span>
                              )}

                              {/* Edit Modal Button */}
                              <button
                                id={`edit-user-btn-${user.uid}`}
                                disabled={isBusy}
                                onClick={() => handleOpenEditModal(user)}
                                title="تعديل بيانات الحساب"
                                className="p-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Delete User */}
                              {!isCurrent && !isThisUserSuperAdmin && (
                                <button
                                  id={`delete-user-btn-${user.uid}`}
                                  disabled={isBusy}
                                  onClick={() => setDeleteModalUser(user)}
                                  title="إزالة الحساب من فريق العمل"
                                  className="px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/15 hover:border-red-500/60 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>إزالة</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5 text-neutral-600" />
                              <span>بيانات محمية</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New User / Edit User Modal */}
      {(isAddModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl text-right animate-in fade-in zoom-in duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  {editingUser ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingUser ? 'تعديل بيانات الحساب والصلاحيات' : 'إنشاء حساب جديد وتعيين الصلاحيات'}
                  </h3>
                  <p className="text-neutral-400 text-xs mt-0.5">
                    {editingUser
                      ? 'تعديل الاسم والمسمى الوظيفي والدور المسند للموظف'
                      : 'إضافة عضو جديد إلى النظام مع تحديد أدواره وصلاحياته في الأسطول'}
                  </p>
                </div>
              </div>
              <button
                id="btn-close-user-modal"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Quick Role & Department Presets */}
            <div className="mb-4 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>نماذج وظيفية سريعة الإعداد (بنقرة واحدة):</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    applyPresetProfile({
                      title: 'محاسب تكاليف وماليات',
                      role: 'finance',
                      department: 'الإدارة المالية والتكاليف',
                      branch: 'المقر الرئيسي - الإسكندرية',
                      jobTitle: 'محاسب تكاليف وتشغيل أسطول',
                      permissions: ['manage_fuel', 'view_financials', 'export_sheets'],
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <DollarSign className="w-3 h-3" />
                  <span>محاسب مالي وتكاليف</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPresetProfile({
                      title: 'مشرف تشغيل وحركة أسطول',
                      role: 'manager',
                      department: 'إدارة الحركة والتشغيل',
                      branch: 'فرع برج العرب',
                      jobTitle: 'مشرف حركة أسطول ومسارات',
                      permissions: ['manage_trips', 'manage_trucks', 'manage_fuel'],
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <Shield className="w-3 h-3" />
                  <span>مشرف حركة وتشغيل</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPresetProfile({
                      title: 'مسؤول لوجستيات ومستودعات',
                      role: 'operation',
                      department: 'اللوجستيات وسلاسل الإمداد',
                      branch: 'مستودعات دمنهور والبحيرة',
                      jobTitle: 'منسق شحنات ومستودعات',
                      permissions: ['manage_trips', 'export_sheets'],
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <Briefcase className="w-3 h-3" />
                  <span>مسؤول لوجستيات</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPresetProfile({
                      title: 'سائق شاحنة أسطول',
                      role: 'driver',
                      department: 'سائقو النقل الثقيل',
                      branch: 'فرع الإسكندرية',
                      jobTitle: 'سائق نقل ثقيل درجة أولى',
                      permissions: ['manage_trips', 'manage_fuel'],
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <Truck className="w-3 h-3" />
                  <span>سائق أسطول</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPresetProfile({
                      title: 'مهندس / فني صيانة ورشة',
                      role: 'maintenance',
                      department: 'ورشة الصيانة والدعم الفني',
                      branch: 'ورشة برج العرب المركزية',
                      jobTitle: 'فني صيانة وميكانيكا أسطول',
                      permissions: ['manage_maintenance', 'manage_trucks'],
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  <span>فني صيانة ورشة</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveAddOrEdit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  اسم الموظف / المستخدم بالكامل <span className="text-red-400">*</span>
                </label>
                <input
                  id="input-user-displayname"
                  type="text"
                  required
                  placeholder="مثال: م. أحمد عبد العزيز أو السائق محمود حسن"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
                  <span>
                    البريد الإلكتروني للعمل <span className="text-red-400">*</span>
                  </span>
                  {editingUser && (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      محمي للربط بحساب Google
                    </span>
                  )}
                </label>
                <input
                  id="input-user-email"
                  type="email"
                  required
                  disabled={!!editingUser}
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full bg-neutral-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition ${
                    editingUser ? 'border-neutral-800 text-neutral-400 cursor-not-allowed' : 'border-neutral-700 focus:border-emerald-500'
                  }`}
                  dir="ltr"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  عند تسجيل الدخول بهذا البريد عبر Google، سيتعرف النظام عليه تلقائياً ويمنحه الدور المحدد فوراً.
                </p>
              </div>

              {/* Job Title & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    المسمى الوظيفي
                  </label>
                  <input
                    id="input-user-jobtitle"
                    type="text"
                    placeholder="مثال: مسؤول حركة الإسكندرية / سائق شاحنة"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    رقم الهاتف للتواصل
                  </label>
                  <input
                    id="input-user-phone"
                    type="text"
                    placeholder="010XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Department & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                    <span>القسم أو الإدارة التابع لها</span>
                  </label>
                  <input
                    id="input-user-department"
                    type="text"
                    placeholder="مثال: الإدارة المالية / الحركة والتشغيل / الورشة"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    <span>الفرع أو الموقع الميداني</span>
                  </label>
                  <input
                    id="input-user-branch"
                    type="text"
                    placeholder="مثال: المقر الرئيسي / فرع برج العرب / مستودع دمنهور"
                    value={formData.assignedBranch}
                    onChange={(e) => setFormData({ ...formData, assignedBranch: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Role Selection Cards */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  تعيين الدور والصلاحية الأساسية <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ROLES_INFO.map((r) => {
                    const isSelected = formData.role === r.role;
                    const IconComponent = r.icon;
                    const isSuperLocked = isTargetUserSuperAdmin(editingUser) && r.role !== 'SUPER_ADMIN' && r.role !== 'admin';

                    return (
                      <div
                        key={r.role}
                        onClick={() => {
                          if (!isSuperLocked) {
                            setFormData({ ...formData, role: r.role });
                          }
                        }}
                        className={`p-3 rounded-xl border text-right cursor-pointer transition ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                            : isSuperLocked
                            ? 'opacity-40 cursor-not-allowed border-neutral-800 bg-neutral-950/40'
                            : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-neutral-400'}`} />
                            <span className="font-bold text-xs">{r.shortTitle}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                          {r.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Granular Permissions */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <label className="block text-xs font-semibold text-neutral-200 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    صلاحيات تفصيلية مخصصة لهذا المستخدم
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    ({formData.customPermissions.length} محددة)
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'manage_users', label: 'إدارة الحسابات واعتماد الأذونات', desc: 'إضافة ومراجعة وتفعيل الحسابات المعلقة' },
                    { key: 'manage_drivers', label: 'إدارة ملفات السائقين كاملة', desc: 'إضافة وتعديل بيانات ورخص السائقين' },
                    { key: 'manage_trucks', label: 'إدارة أسطول الشاحنات', desc: 'إضافة وتحديث الشاحنات وقراءات العداد' },
                    { key: 'manage_trips', label: 'إنهاء وجدولة الرحلات', desc: 'تسجيل مسارات النقل وإسناد الرحلات' },
                    { key: 'manage_fuel', label: 'تسجيل واعتماد إيصالات الوقود', desc: 'تدقيق استهلاك وتكاليف السولار' },
                    { key: 'manage_maintenance', label: 'إدارة الصيانة وعداد الزيت', desc: 'تسجيل الصيانة الدورية وتنبيهات الزيت' },
                    { key: 'view_financials', label: 'الاطلاع على التكاليف المالية', desc: 'مراجعة الموازنات وتكاليف التشغيل' },
                    { key: 'export_sheets', label: 'تصدير ومزامنة شيتات Excel', desc: 'تصدير التقارير وجداول البيانات' },
                  ].map((perm) => {
                    const isChecked = formData.customPermissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-neutral-100'
                            : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(perm.key)}
                          className="mt-0.5 rounded border-neutral-700 text-emerald-600 focus:ring-0 focus:ring-offset-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs leading-snug text-neutral-200">
                            {perm.label}
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5 leading-tight">
                            {perm.desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Link to Driver Profile (Visible especially if role === 'driver') */}
              {(formData.role === 'driver' || drivers.length > 0) && (
                <div className={`p-3.5 rounded-xl border transition ${
                  formData.role === 'driver' ? 'bg-amber-500/5 border-amber-500/30' : 'bg-neutral-950 border-neutral-800'
                }`}>
                  <label className="block text-xs font-semibold text-neutral-200 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      ربط الحساب بملف سائق في الأسطول
                    </span>
                    {formData.role === 'driver' && (
                      <span className="text-[10px] text-amber-400 font-bold">موصى به لدور السائق</span>
                    )}
                  </label>
                  <select
                    id="select-user-driver"
                    value={formData.assignedDriverId}
                    onChange={(e) => setFormData({ ...formData, assignedDriverId: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition cursor-pointer mt-1"
                  >
                    <option value="">بدون ربط مباشر (اختياري)</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code}) - هاتف: {d.phone} - رخصة: {d.licenseDegree}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    عند تسجيل السائق الدخول، سيتعرف النظام على بيانات شاحنته ورحلاته مباشرة في واجهة وضع السائق (Driver Mode).
                  </p>
                </div>
              )}

              {/* Account Status and Authorization Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  حالة الحساب ومنح تصريح العمل <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Pending Option */}
                  <div
                    onClick={() => {
                      if (!isTargetUserSuperAdmin(editingUser)) {
                        setFormData({ ...formData, status: 'pending' });
                      }
                    }}
                    className={`p-3 rounded-xl border text-right cursor-pointer transition ${
                      formData.status === 'pending'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    } ${isTargetUserSuperAdmin(editingUser) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-4 h-4 ${formData.status === 'pending' ? 'text-amber-400' : 'text-neutral-400'}`} />
                        <span className="font-bold text-xs">معلق (Pending)</span>
                      </div>
                      {formData.status === 'pending' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-tight">
                      في انتظار إعطائه الإذن وتعيين مسؤوليته.
                    </p>
                  </div>

                  {/* Active Option */}
                  <div
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                    className={`p-3 rounded-xl border text-right cursor-pointer transition ${
                      formData.status === 'active'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className={`w-4 h-4 ${formData.status === 'active' ? 'text-emerald-400' : 'text-neutral-400'}`} />
                        <span className="font-bold text-xs">نشط ومصرح (Active)</span>
                      </div>
                      {formData.status === 'active' && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-tight">
                      مفعل ومصرح له بممارسة مسؤوليته فوراً.
                    </p>
                  </div>

                  {/* Suspended Option */}
                  <div
                    onClick={() => {
                      if (!isTargetUserSuperAdmin(editingUser)) {
                        setFormData({ ...formData, status: 'suspended' });
                      }
                    }}
                    className={`p-3 rounded-xl border text-right cursor-pointer transition ${
                      formData.status === 'suspended'
                        ? 'bg-red-500/15 border-red-500 text-white shadow-md shadow-red-500/10'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    } ${isTargetUserSuperAdmin(editingUser) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Ban className={`w-4 h-4 ${formData.status === 'suspended' ? 'text-red-400' : 'text-neutral-400'}`} />
                        <span className="font-bold text-xs">موقوف (Suspended)</span>
                      </div>
                      {formData.status === 'suspended' && <Check className="w-4 h-4 text-red-400" />}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-tight">
                      إيقاف مؤقت لصلاحيات الوصول للأسطول.
                    </p>
                  </div>
                </div>

                {!editingUser && formData.status === 'pending' && (
                  <p className="text-[11px] text-amber-300/90 mt-2 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>سيبقى الحساب معلقاً بعد إنشائه حتى يقوم المدير بمراجعته وتعيين مسؤوليته ومنحه إذن العمل.</span>
                  </p>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3 flex-wrap">
                {editingUser && !isTargetUserSuperAdmin(editingUser) && editingUser.email.toLowerCase() !== effectiveUserEmail ? (
                  <button
                    id="btn-modal-delete-user"
                    type="button"
                    onClick={() => {
                      const userToDelete = editingUser;
                      setIsAddModalOpen(false);
                      setEditingUser(null);
                      setDeleteModalUser(userToDelete);
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>إزالة هذا الحساب نهائياً</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-3 mr-auto">
                  <button
                    id="btn-cancel-user-modal"
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingUser(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-sm transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    id="btn-submit-user-modal"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      'جاري الحفظ...'
                    ) : editingUser ? (
                      editingUser.status === 'pending' && formData.status === 'active' ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>منح الإذن وتفعيل الحساب</span>
                        </>
                      ) : (
                        'حفظ التعديلات'
                      )
                    ) : formData.status === 'pending' ? (
                      'إضافة الحساب (في حالة معلق)'
                    ) : (
                      'إنشاء وتفعيل الحساب'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Matrix Modal */}
      {showPermissionsMatrix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl text-right animate-in fade-in zoom-in duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    دليل ومصفوفة الصلاحيات الشاملة لنظام إدارة الأسطول
                  </h3>
                  <p className="text-neutral-400 text-xs mt-0.5">
                    توضيح تفصيلي لمسؤوليات كل رتبة وظيفية ودورة اعتماد وتفعيل الحسابات الجديدة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPermissionsMatrix(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workflow Notice */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-neutral-900 border border-amber-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>نظام حماية الحسابات الجديدة (الحسابات المعلقة):</span>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                وفقاً للإعداد الأمني للنظام، فإن أي مستخدم جديد يُسجل أو يُضاف يتم حفظه في حالة <strong className="text-amber-300">معلق (Pending)</strong> تلقائياً، ولا يتمكن من إجراء أي تعديل أو الوصول للبيانات الحساسة حتى يقوم <strong className="text-white">مدير النظام (Admin)</strong> بمراجعته ومنحه الإذن وتعيين مسؤوليته المحددة (سائق، محاسب مالي، مشرف تشغيل، صيانة، إلخ).
              </p>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-neutral-800 mb-6">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-950 text-neutral-300 border-b border-neutral-800">
                  <tr>
                    <th className="p-3 font-bold">الصلاحية / الميزة</th>
                    <th className="p-3 font-bold text-purple-300">مدير نظام (Admin)</th>
                    <th className="p-3 font-bold text-blue-300">مشرف حركة (Manager)</th>
                    <th className="p-3 font-bold text-cyan-300">مسؤول لوجستيات (Logistics)</th>
                    <th className="p-3 font-bold text-emerald-300">محاسب مالي (Finance)</th>
                    <th className="p-3 font-bold text-orange-300">فني صيانة (Maintenance)</th>
                    <th className="p-3 font-bold text-amber-300">سائق أسطول (Driver)</th>
                    <th className="p-3 font-bold text-neutral-400">مستعرض (Viewer)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 bg-neutral-900/60">
                  {[
                    {
                      feature: 'إدارة الحسابات واعتماد الأذونات',
                      admin: 'نعم كاملة',
                      manager: 'لا',
                      operation: 'لا',
                      finance: 'لا',
                      maintenance: 'لا',
                      driver: 'لا',
                      viewer: 'لا',
                    },
                    {
                      feature: 'إضافة وتعديل وحذف السائقين بكامل بياناتهم',
                      admin: 'نعم كاملة',
                      manager: 'نعم كاملة',
                      operation: 'استعراض فقط',
                      finance: 'استعراض وتقارير',
                      maintenance: 'لا',
                      driver: 'ملفه الشخصي فقط',
                      viewer: 'استعراض فقط',
                    },
                    {
                      feature: 'إدارة الشاحنات وإسناد السائقين',
                      admin: 'نعم كاملة',
                      manager: 'نعم كاملة',
                      operation: 'استعراض وتنسيق',
                      finance: 'استعراض وتكاليف',
                      maintenance: 'استعراض وتحديث العداد',
                      driver: 'شاحنته فقط',
                      viewer: 'استعراض فقط',
                    },
                    {
                      feature: 'جدولة وإنهاء الرحلات',
                      admin: 'نعم كاملة',
                      manager: 'نعم كاملة',
                      operation: 'تسجيل وتنسيق',
                      finance: 'مراجعة وتدقيق',
                      maintenance: 'لا',
                      driver: 'بدء وإنهاء رحلته',
                      viewer: 'استعراض فقط',
                    },
                    {
                      feature: 'تسجيل الوقود واعتماد الفواتير',
                      admin: 'نعم كاملة',
                      manager: 'نعم ومتابعة',
                      operation: 'استعراض',
                      finance: 'تدقيق واعتماد مالي',
                      maintenance: 'لا',
                      driver: 'تسجيل إيصال شاحنته',
                      viewer: 'استعراض فقط',
                    },
                    {
                      feature: 'إدارة الصيانة وعداد الزيت',
                      admin: 'نعم كاملة',
                      manager: 'متابعة وتنبيهات',
                      operation: 'لا',
                      finance: 'مراجعة فواتير الصيانة',
                      maintenance: 'نعم كاملة',
                      driver: 'تبليغ أعطال',
                      viewer: 'استعراض فقط',
                    },
                    {
                      feature: 'شاشة وضع السائق (Driver Mode)',
                      admin: 'استعراض ومحاكاة',
                      manager: 'لا',
                      operation: 'لا',
                      finance: 'لا',
                      maintenance: 'لا',
                      driver: 'نعم مخصص له',
                      viewer: 'لا',
                    },
                    {
                      feature: 'التقارير المالية وتدقيق التكاليف',
                      admin: 'نعم',
                      manager: 'نعم',
                      operation: 'استعراض',
                      finance: 'نعم تدقيق وموازنات',
                      maintenance: 'تكاليف الورشة',
                      driver: 'لا',
                      viewer: 'استعراض فقط',
                    },
                    {
                      feature: 'تصدير ومزامنة Google Sheets و Excel',
                      admin: 'نعم',
                      manager: 'نعم',
                      operation: 'نعم',
                      finance: 'نعم مالي وتشغيلي',
                      maintenance: 'لا',
                      driver: 'لا',
                      viewer: 'Excel فقط',
                    },
                    {
                      feature: 'حذف السجلات وتصفير البيانات',
                      admin: 'نعم بحذر',
                      manager: 'لا',
                      operation: 'لا',
                      finance: 'لا',
                      maintenance: 'لا',
                      driver: 'لا',
                      viewer: 'لا',
                    },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-800/40">
                      <td className="p-3 font-semibold text-white">{row.feature}</td>
                      <td className="p-3 text-purple-300 font-medium">{row.admin}</td>
                      <td className="p-3 text-blue-300">{row.manager}</td>
                      <td className="p-3 text-cyan-300">{row.operation}</td>
                      <td className="p-3 text-emerald-300">{row.finance}</td>
                      <td className="p-3 text-orange-300">{row.maintenance}</td>
                      <td className="p-3 text-amber-300">{row.driver}</td>
                      <td className="p-3 text-neutral-400">{row.viewer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowPermissionsMatrix(false)}
                className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition cursor-pointer"
              >
                إغلاق المصفوفة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-right animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">تأكيد حذف الحساب نهائياً</h3>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              هل أنت متأكد من رغبتك في إزالة حساب <strong className="text-white">{deleteModalUser.displayName}</strong> ({deleteModalUser.email}) من فريق العمل؟
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                id="btn-cancel-delete-user"
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-sm transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                id="btn-confirm-delete-user"
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition shadow-lg shadow-red-600/20 cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
