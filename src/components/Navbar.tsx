import { User } from 'firebase/auth';
import {
  AlertTriangle,
  Bell,
  Car,
  Cloud,
  Download,
  FileSpreadsheet,
  LogOut,
  Mail,
  PlusCircle,
  Shield,
  ShieldCheck,
  Truck,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { UserProfile } from '../types';

interface NavbarProps {
  user: User | null;
  userProfile?: UserProfile | null;
  isOnlineCloud?: boolean;
  onOpenUsersTab?: () => void;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onSyncGoogleSheets: () => void;
  isSyncingSheets: boolean;
  onExportLocalExcel: () => void;
  onOpenNewTripModal?: () => void;
  onOpenNewDriverModal?: () => void;
  onOpenNewMaintModal?: () => void;
  onOpenNotificationSettings?: () => void;
  onOpenDailyEmailModal?: () => void;
  vehicleCount?: number;
  driverCount?: number;
  urgentAlertsCount?: number;
  activeTripsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  userProfile,
  isOnlineCloud = true,
  onOpenUsersTab,
  isLoggingIn,
  onLogin,
  onLogout,
  onSyncGoogleSheets,
  isSyncingSheets,
  onExportLocalExcel,
  onOpenNewTripModal,
  onOpenNewDriverModal,
  onOpenNewMaintModal,
  onOpenNotificationSettings,
  onOpenDailyEmailModal,
  vehicleCount = 0,
  driverCount = 0,
  urgentAlertsCount = 0,
  activeTripsCount = 0,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  نظام إدارة خطوط سير وأسطول سيارات المصنع
                </h1>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-emerald-400 animate-pulse" />
                  {isOnlineCloud ? 'سحابي أونلاين' : 'محلي'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                مناطق الإسكندرية • الساحل الشمالي • البحيرة | إدارة متعددة الحسابات ومزامنة فورية
              </p>
            </div>
          </div>

          {/* Quick status counters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
              <Car className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300">الأسطول:</span>
              <span className="font-bold text-white">{vehicleCount}</span>
            </div>
            {onOpenNewDriverModal ? (
              <button
                type="button"
                onClick={onOpenNewDriverModal}
                title="إضافة سائق جديد للأسطول وتسجيل بياناته"
                className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 transition cursor-pointer group"
              >
                <Users className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition" />
                <span className="text-slate-300">السائقين:</span>
                <span className="font-bold text-white">{driverCount}</span>
                <span className="text-[10px] text-teal-300 font-bold bg-teal-950/60 px-1 rounded border border-teal-500/30 mr-0.5">
                  + إضافة
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-300">السائقين:</span>
                <span className="font-bold text-white">{driverCount}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300">رحلات جارية:</span>
              <span className="font-bold text-emerald-400">{activeTripsCount}</span>
            </div>
            {urgentAlertsCount > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-600/50 text-rose-300 px-2.5 py-1.5 rounded-lg font-semibold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>تنبيهات صيانة: {urgentAlertsCount}</span>
              </div>
            )}
          </div>

          {/* Actions & Integrations */}
          <div className="flex flex-wrap items-center gap-2">
            {/* PWA Mobile Install Button */}
            <PWAInstallButton />

            {/* Push Notifications Oil & Fleet Alerts Button */}
            <button
              id="btn-notifications-reminder"
              onClick={onOpenNotificationSettings}
              title="إشعارات دفع تغيير الزيت وتنبيهات الأسطول لهاتف المدير"
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-amber-500/40 hover:border-amber-400 text-xs font-semibold px-2.5 py-2 rounded-lg transition cursor-pointer shadow-xs"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">إشعارات الزيت والدفع</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            </button>

            {/* End-of-Day Automatic Email Button */}
            <button
              id="btn-daily-eod-email"
              onClick={onOpenDailyEmailModal}
              title="إرسال إيميل أوتوماتيك آخر اليوم بآخر تحديث لكافة الشيتات"
              className="inline-flex items-center gap-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 hover:border-emerald-400 text-xs font-semibold px-2.5 py-2 rounded-lg transition cursor-pointer shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">إيميل نهاية اليوم الآلي</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-bold">
                EOD
              </span>
            </button>

            {/* Add New Driver Button */}
            {onOpenNewDriverModal && (
              <button
                id="btn-new-driver"
                onClick={onOpenNewDriverModal}
                title="إضافة سائق جديد وتسجيل تفاصيل بياناته"
                className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer border border-teal-500/40"
              >
                <UserPlus className="w-4 h-4 text-teal-200" />
                <span>إضافة سائق</span>
              </button>
            )}

            {/* New Trip Button */}
            <button
              id="btn-new-trip"
              onClick={onOpenNewTripModal}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تسجيل رحلة</span>
            </button>

            {/* New Maintenance Button */}
            <button
              id="btn-new-maint"
              onClick={onOpenNewMaintModal}
              className="inline-flex items-center gap-1.5 bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>تسجيل صيانة</span>
            </button>

            {/* Export Local Excel (.xlsx) */}
            <button
              id="btn-export-excel"
              onClick={onExportLocalExcel}
              title="تحميل ملف إكسيل (.xlsx) فوري بكافة الشيتات"
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-medium px-2.5 py-2 rounded-lg transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Excel</span>
            </button>

            {/* Download Project ZIP Archive */}
            <a
              id="btn-download-project-zip"
              href="/api/download-zip"
              download="fleet-management-app.zip"
              title="تحميل الكود المصدري وملف البرنامج كاملاً (ZIP)"
              className="inline-flex items-center gap-1.5 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 hover:border-indigo-400 text-xs font-semibold px-2.5 py-2 rounded-lg transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>تحميل ZIP</span>
            </a>

            {/* Google Sheets Sync & Multi-Account Auth */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-slate-800 border border-emerald-500/40 rounded-lg p-1">
                <button
                  id="btn-sync-sheets"
                  onClick={onSyncGoogleSheets}
                  disabled={isSyncingSheets}
                  title="مزامنة شيتات Google Sheets الرسمية"
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded transition disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isSyncingSheets ? 'مزامنة...' : 'Google Sheets'}</span>
                </button>
                
                {/* User role and profile info */}
                <button
                  id="btn-user-profile-header"
                  onClick={onOpenUsersTab}
                  title="عرض الحسابات والصلاحيات"
                  className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-700/60 rounded text-slate-300 text-[11px] transition cursor-pointer"
                >
                  <img
                    src={user.photoURL || 'https://www.gravatar.com/avatar/?d=mp'}
                    alt="user"
                    className="w-5 h-5 rounded-full border border-emerald-500/40"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex flex-col items-start leading-none hidden sm:flex">
                    <span className="max-w-[85px] truncate font-bold text-white">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-semibold">
                      {userProfile?.role === 'admin'
                        ? 'مدير نظام'
                        : userProfile?.role === 'manager'
                        ? 'مشرف تشغيل'
                        : userProfile?.role === 'driver'
                        ? 'سائق أسطول'
                        : userProfile?.role === 'operation'
                        ? 'مسؤول حركة'
                        : userProfile?.role === 'maintenance'
                        ? 'فني صيانة'
                        : 'مستعرض'}
                    </span>
                  </div>
                </button>

                <button
                  id="btn-logout"
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-700/60 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-google-login"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm border border-slate-300 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{isLoggingIn ? 'جاري الاتصال...' : 'تسجيل الدخول وإدارة الحسابات'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
