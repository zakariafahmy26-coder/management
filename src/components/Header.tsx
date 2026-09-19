import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Building2,
  Shield,
  Clock,
  Sun,
  Moon,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User as UserIcon,
  KeyRound,
  LogIn,
} from 'lucide-react';
import { Company, UserRole, AppNotification, UserProfile } from '../types';

interface HeaderProps {
  companies: Company[];
  currentCompany: Company;
  onSelectCompany: (company: Company) => void;
  availableRoles: UserRole[];
  effectiveRole: UserRole;
  onChangeEffectiveRole: (role: UserRole) => void;
  onOpenSearch: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  notifications: AppNotification[];
  onOpenNotificationCenter: () => void;
  onMarkNotificationRead: (id: string) => void;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  onToggleMobileMenu: () => void;
  onOpenLoginModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  companies,
  currentCompany,
  onSelectCompany,
  availableRoles,
  effectiveRole,
  onChangeEffectiveRole,
  onOpenSearch,
  darkMode,
  onToggleDarkMode,
  notifications,
  onOpenNotificationCenter,
  onMarkNotificationRead,
  userProfile,
  onSignOut,
  onToggleMobileMenu,
  onOpenLoginModal,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const companyRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Live Alexandria / Cairo clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Africa/Cairo',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setShowCompanyMenu(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPopover(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter((n) => n.status === 'UNREAD');

  return (
    <header className="h-16 px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 sticky top-0 transition-colors">
      {/* Right Side (in RTL): Mobile Menu & Company Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 md:hidden rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Company Switcher Dropdown */}
        <div className="relative" ref={companyRef}>
          <button
            onClick={() => setShowCompanyMenu(!showCompanyMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="truncate max-w-[130px] md:max-w-[220px]">
              {currentCompany.nameAr || currentCompany.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {showCompanyMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                الشركات والمؤسسات المسجلة
              </div>
              {companies.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => {
                    onSelectCompany(comp);
                    setShowCompanyMenu(false);
                  }}
                  className={`w-full text-right px-3 py-2.5 text-xs transition-colors flex items-center justify-between ${
                    comp.id === currentCompany.id
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate font-semibold">{comp.nameAr || comp.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{comp.code}</div>
                  </div>
                  {comp.id === currentCompany.id && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Role Preview Switcher Dropdown (Fast RBAC Simulator) */}
        <div className="relative hidden sm:block" ref={roleRef}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors"
            title="معاينة النظام بدور وظيفي محدد"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>الدور: {effectiveRole}</span>
            <ChevronDown className="w-3 h-3 text-emerald-500" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                معاينة الصلاحيات (RBAC Preview)
              </div>
              {availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    onChangeEffectiveRole(role);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between ${
                    role === effectiveRole
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{role}</span>
                  {role === effectiveRole && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Global Search Trigger */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span>بحث شامل في المهام والمركبات والسائقين والمواقع...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-500">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Left Side (in RTL): Live Clock, Theme Toggle, Notification Bell, User */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search button on small screens */}
        <button
          onClick={onOpenSearch}
          className="p-2 lg:hidden rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="بحث"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Live Alexandria Time */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{currentTime || '00:00:00'}</span>
        </div>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Bell with Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifPopover(!showNotifPopover)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
            title="الإشعارات والتنبيهات"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {showNotifPopover && (
            <div className="absolute left-0 sm:right-auto sm:left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50">
              <div className="px-4 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    مركز التنبيهات
                  </span>
                  {unreadNotifications.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                      {unreadNotifications.length} جديد
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowNotifPopover(false);
                    onOpenNotificationCenter();
                  }}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                >
                  عرض الكل
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => onMarkNotificationRead(notif.id)}
                    className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                      notif.status === 'UNREAD' ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {notif.severity === 'urgent' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      ) : notif.severity === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {notifications.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    لا توجد تنبيهات جديدة حالياً
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Login / Switch Account Button */}
        {onOpenLoginModal && (
          <button
            id="header-open-login-btn"
            onClick={onOpenLoginModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
            title="تسجيل الدخول أو تبديل الحساب"
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{userProfile?.email ? 'تبديل الحساب' : 'تسجيل الدخول'}</span>
          </button>
        )}

        {/* User Profile Menu */}
        <div className="relative" ref={userRef}>
          <button
            id="header-user-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName || 'User'}
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-cyan-500/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
            )}
            <div className="hidden xl:block text-right">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[100px]">
                {userProfile?.displayName || userProfile?.email || 'مستخدم النظام'}
              </div>
              <div className="text-[10px] text-slate-400">{effectiveRole}</div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {userProfile?.displayName || 'حساب المشغل'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">{userProfile?.email || 'وضع المعاينة المحلي'}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    الدور: {effectiveRole}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                    {userProfile?.status === 'active' ? 'حساب نشط' : 'معلق'}
                  </span>
                </div>
              </div>

              {onOpenLoginModal && (
                <button
                  id="dropdown-switch-account-btn"
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenLoginModal();
                  }}
                  className="w-full text-right px-3 py-2.5 text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 flex items-center gap-2 transition-colors font-semibold border-b border-slate-100 dark:border-slate-800/60"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>تسجيل الدخول بحساب آخر</span>
                </button>
              )}

              <button
                id="dropdown-signout-btn"
                onClick={() => {
                  setShowUserMenu(false);
                  onSignOut();
                }}
                className="w-full text-right px-3 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج من المنصة</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
