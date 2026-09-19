import React, { useState } from 'react';
import {
  Settings,
  Shield,
  FileSpreadsheet,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  History,
  Lock,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  FolderArchive,
  FileCode,
  Terminal,
  UploadCloud,
} from 'lucide-react';
import { Company, UserRole, AuditLog, UserProfile } from '../types';
import { UsersManagementView } from './UsersManagementView';

interface SettingsViewProps {
  currentCompany: Company;
  auditLogs: AuditLog[];
  userProfiles: UserProfile[];
  currentUserProfile: UserProfile | null;
  effectiveRole: UserRole;
  canManageUsers: boolean;
  onUpdateCompany: (company: Partial<Company>) => void;
  onUpdateUserRole: (uid: string, role: UserRole, status?: any) => Promise<void>;
  onInviteUser: (email: string, displayName: string, role: UserRole) => Promise<void>;
  onDeleteUser: (uid: string) => Promise<void>;
  onDownloadZip?: () => void;
  isDownloadingZip?: boolean;
  onOpenZipUploadModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentCompany,
  auditLogs = [],
  userProfiles = [],
  currentUserProfile,
  effectiveRole,
  canManageUsers,
  onUpdateCompany,
  onUpdateUserRole,
  onInviteUser,
  onDeleteUser,
  onDownloadZip,
  isDownloadingZip = false,
  onOpenZipUploadModal,
}) => {
  const [subTab, setSubTab] = useState<'profile' | 'rbac' | 'audit' | 'users'>('profile');
  const [auditSearch, setAuditSearch] = useState('');

  // Editable company state
  const [compNameAr, setCompNameAr] = useState(currentCompany.nameAr || currentCompany.name);
  const [compTax, setCompTax] = useState(currentCompany.taxNumber || '741-920-334');
  const [compCommercial, setCompCommercial] = useState(currentCompany.commercialRegister || 'CR-88219-ALX');
  const [compPhone, setCompPhone] = useState(currentCompany.phone || '+20 3 459 2000');
  const [compEmail, setCompEmail] = useState(currentCompany.email || 'info@fleetops.eg');
  const [compAddress, setCompAddress] = useState(currentCompany.address || 'المنطقة الصناعية الثالثة، برج العرب الجديدة، الإسكندرية');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompany({
      nameAr: compNameAr,
      taxNumber: compTax,
      commercialRegister: compCommercial,
      phone: compPhone,
      email: compEmail,
      address: compAddress,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // RBAC Matrix Permissions list
  const permissionsList = [
    { code: 'dashboard.view', label: 'عرض لوحة التحكم والمؤشرات' },
    { code: 'tasks.view', label: 'استعراض المهام التشغيلية' },
    { code: 'tasks.create', label: 'إصدار مهام جديدة' },
    { code: 'tasks.edit', label: 'تعديل المهام وتحديث الحالات' },
    { code: 'tasks.delete', label: 'حذف وإلغاء المهام' },
    { code: 'fleet.view', label: 'استعراض أسطول المركبات والوثائق' },
    { code: 'fleet.create', label: 'إضافة شاحنات جديدة' },
    { code: 'fleet.edit', label: 'تعديل بيانات الشاحنات' },
    { code: 'maintenance.view', label: 'سجلات الصيانة الوقائية' },
    { code: 'maintenance.create', label: 'تسجيل أوامر صيانة' },
    { code: 'drivers.view', label: 'استعراض بيانات السائقين' },
    { code: 'drivers.edit', label: 'تعديل وتقييم السائقين' },
    { code: 'locations.manage', label: 'إدارة المناطق والمواقع والفروع' },
    { code: 'automation.view', label: 'استعراض قواعد الأتمتة' },
    { code: 'automation.edit', label: 'إنشاء وتعديل قواعد الأتمتة' },
    { code: 'reports.view', label: 'استعراض التقارير والمؤشرات' },
    { code: 'reports.export', label: 'تصدير التقارير (Excel / PDF)' },
    { code: 'ai.use', label: 'استخدام مساعد الذكاء الاصطناعي' },
    { code: 'users.manage', label: 'إدارة حسابات المستخدمين ودعواتهم' },
    { code: 'settings.manage', label: 'إعدادات الشركة والتراخيص' },
    { code: 'audit.view', label: 'استعراض سجلات التدقيق والمراقبة' },
  ];

  // RBAC mapping check helper
  const roleHasPermission = (role: UserRole, permCode: string): boolean => {
    if (role === 'SUPER_ADMIN') return true;
    if (role === 'COMPANY_ADMIN') {
      return true;
    }
    if (role === 'OPERATIONS_MANAGER') {
      return !['users.manage', 'settings.manage'].includes(permCode);
    }
    if (role === 'SUPERVISOR') {
      return [
        'dashboard.view',
        'tasks.view',
        'tasks.create',
        'tasks.edit',
        'fleet.view',
        'maintenance.view',
        'drivers.view',
        'automation.view',
        'reports.view',
        'ai.use',
      ].includes(permCode);
    }
    if (role === 'DISPATCHER') {
      return [
        'dashboard.view',
        'tasks.view',
        'tasks.create',
        'tasks.edit',
        'fleet.view',
        'drivers.view',
        'ai.use',
      ].includes(permCode);
    }
    if (role === 'DRIVER') {
      return ['dashboard.view', 'tasks.view', 'fleet.view'].includes(permCode);
    }
    if (role === 'VIEWER') {
      return ['dashboard.view', 'tasks.view', 'fleet.view', 'reports.view'].includes(permCode);
    }
    return false;
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              إعدادات المؤسسة والأمان والرقابة
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ملف المنشأة، مصفوفة الصلاحيات (RBAC)، سجل التدقيق والرقابة، وإدارة المستخدمين
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
          <button
            onClick={() => setSubTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'profile'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ملف الشركة
          </button>
          <button
            onClick={() => setSubTab('rbac')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'rbac'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            مصفوفة الصلاحيات (RBAC)
          </button>
          <button
            onClick={() => setSubTab('users')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'users'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            المستخدمين ({userProfiles.length})
          </button>
          <button
            onClick={() => setSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'audit'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            سجل التدقيق ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: COMPANY PROFILE */}
      {subTab === 'profile' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveCompany} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-600" />
              <span>البيانات القانونية والتشغيلية للمنشأة</span>
            </h2>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
              كود الشركة: {currentCompany.code}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الاسم التجاري الرسمي *
              </label>
              <input
                type="text"
                required
                value={compNameAr}
                onChange={(e) => setCompNameAr(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الرقم الضريبي للمنشأة
              </label>
              <input
                type="text"
                value={compTax}
                onChange={(e) => setCompTax(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم السجل التجاري
              </label>
              <input
                type="text"
                value={compCommercial}
                onChange={(e) => setCompCommercial(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الهاتف وخط الطوارئ
              </label>
              <input
                type="text"
                value={compPhone}
                onChange={(e) => setCompPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                البريد الإلكتروني للإشعارات الرسمية
              </label>
              <input
                type="email"
                value={compEmail}
                onChange={(e) => setCompEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المقر الرئيسي والمستودع المركزي
              </label>
              <input
                type="text"
                value={compAddress}
                onChange={(e) => setCompAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم تحديث بيانات المنشأة بنجاح</span>
              </span>
            )}
            <button
              type="submit"
              className="px-6 py-2 text-xs font-bold rounded-xl text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-900/20"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>

        {/* Direct Code & Archive ZIP Section */}
        <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>إدارة الحزم والملفات المضغوطة (ZIP Archives)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ZIP Archive
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  تصدير الكود المصدري الكامل للمشروع، أو رفع واستيراد ملفات ZIP تشمل نسخ احتياطية للأسطول أو وثائق ورخص وتراخيص المركبات.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {onOpenZipUploadModal && (
                <button
                  type="button"
                  onClick={onOpenZipUploadModal}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-cyan-900/20 cursor-pointer"
                  title="رفع واستعراض ملف مضغوط ZIP وفحص محتوياته"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>رفع واستيراد ملف (ZIP)</span>
                </button>
              )}

              <a
                href="/api/download-zip"
                download="fleetops-project.zip"
                onClick={(e) => {
                  if (onDownloadZip) {
                    e.preventDefault();
                    onDownloadZip();
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-amber-900/20 cursor-pointer"
              >
                <Download className={`w-4 h-4 ${isDownloadingZip ? 'animate-bounce' : ''}`} />
                <span>{isDownloadingZip ? 'جارٍ الضغط والتجهيز...' : 'تحميل كود البرنامج (ZIP)'}</span>
              </a>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>طريقة التشغيل محلياً:</span>
              <code className="text-slate-200 bg-slate-800 px-2 py-1 rounded">npm install && npm run dev</code>
            </div>
            <div className="text-[11px] text-slate-500 font-sans">
              يشمل كافة ملفات TypeScript والمكتبات وقواعد الحماية.
            </div>
          </div>
        </div>
      </div>
      )}

      {/* SUB-TAB 2: RBAC MATRIX */}
      {subTab === 'rbac' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <span>مصفوفة الأدوار والصلاحيات (Role-Based Access Control)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                توزيع صلاحيات الوصول بحسب المسميات الوظيفية لحماية بيانات الشركة وعملياتها
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 min-w-[200px]">الصلاحية الوظيفية</th>
                  <th className="py-3 px-3 text-center">مدير أعلى<br/><span className="text-[10px] text-slate-400 font-normal">SUPER_ADMIN</span></th>
                  <th className="py-3 px-3 text-center">مدير شركة<br/><span className="text-[10px] text-slate-400 font-normal">COMPANY_ADMIN</span></th>
                  <th className="py-3 px-3 text-center">مدير عمليات<br/><span className="text-[10px] text-slate-400 font-normal">OPERATIONS_MGR</span></th>
                  <th className="py-3 px-3 text-center">مشرف<br/><span className="text-[10px] text-slate-400 font-normal">SUPERVISOR</span></th>
                  <th className="py-3 px-3 text-center">ديسباتشر<br/><span className="text-[10px] text-slate-400 font-normal">DISPATCHER</span></th>
                  <th className="py-3 px-3 text-center">سائق<br/><span className="text-[10px] text-slate-400 font-normal">DRIVER</span></th>
                  <th className="py-3 px-3 text-center">مشاهد<br/><span className="text-[10px] text-slate-400 font-normal">VIEWER</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {permissionsList.map((perm) => (
                  <tr key={perm.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{perm.label}</div>
                      <div className="text-[10px] font-mono text-slate-400">{perm.code}</div>
                    </td>
                    {(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'DISPATCHER', 'DRIVER', 'VIEWER'] as UserRole[]).map((r) => {
                      const allowed = roleHasPermission(r, perm.code);
                      return (
                        <td key={r} className="py-3 px-3 text-center">
                          {allowed ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600">
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: USERS MANAGEMENT */}
      {subTab === 'users' && (
        <UsersManagementView
          users={userProfiles || []}
          userProfiles={userProfiles || []}
          currentUserProfile={currentUserProfile}
          effectiveRole={effectiveRole}
          canManageUsers={canManageUsers}
          onUpdateUserRole={onUpdateUserRole}
          onInviteUser={onInviteUser}
          onDeleteUser={onDeleteUser}
        />
      )}

      {/* SUB-TAB 4: AUDIT LOGS */}
      {subTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                سجل التدقيق والرقابة التشغيلية (Audit Trail)
              </h2>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="ابحث في سجل التدقيق..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">التاريخ والوقت</th>
                  <th className="py-3 px-4">المستخدم</th>
                  <th className="py-3 px-4">الإجراء</th>
                  <th className="py-3 px-4">الكيان المتأثر</th>
                  <th className="py-3 px-4">التفاصيل والتغييرات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleString('ar-EG')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {log.userName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {log.entity} #{log.entityId}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {log.details}
                    </td>
                  </tr>
                ))}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      لا توجد سجلات تدقيق تطابق البحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
