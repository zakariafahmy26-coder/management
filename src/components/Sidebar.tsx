import React from 'react';
import {
  LayoutDashboard,
  Route,
  Truck,
  Users,
  MapPin,
  Cpu,
  Bell,
  BarChart3,
  Bot,
  Settings,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  KeyRound,
} from 'lucide-react';
import { TabKey, UserRole } from '../types';

interface SidebarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  unreadNotificationsCount: number;
  delayedTasksCount: number;
  urgentMaintenanceCount: number;
  companyName: string;
  effectiveRole: UserRole;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenLoginModal?: () => void;
  currentUser?: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  unreadNotificationsCount,
  delayedTasksCount,
  urgentMaintenanceCount,
  companyName,
  effectiveRole,
  isCollapsed,
  onToggleCollapse,
  onOpenLoginModal,
  currentUser,
}) => {
  const navItems: {
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      key: 'sales',
      label: 'لوحة دعم المبيعات',
      icon: Briefcase,
    },
    {
      key: 'dashboard',
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
    },
    {
      key: 'operations',
      label: 'العمليات والمهام',
      icon: Route,
      badge: delayedTasksCount > 0 ? delayedTasksCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      key: 'fleet',
      label: 'أسطول المركبات',
      icon: Truck,
      badge: urgentMaintenanceCount > 0 ? urgentMaintenanceCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      key: 'people',
      label: 'السائقين والأفراد',
      icon: Users,
    },
    {
      key: 'locations',
      label: 'المناطق والمواقع',
      icon: MapPin,
    },
    {
      key: 'automation',
      label: 'قواعد الأتمتة',
      icon: Cpu,
    },
    {
      key: 'notifications',
      label: 'مركز التنبيهات',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      badgeColor: 'bg-indigo-600 text-white',
    },
    {
      key: 'reports',
      label: 'التقارير والمؤشرات',
      icon: BarChart3,
    },
    {
      key: 'ai_center',
      label: 'مساعد الذكاء الاصطناعي',
      icon: Bot,
    },
    {
      key: 'settings',
      label: 'الإعدادات والرقابة',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100 transition-all duration-300 z-30 shrink-0 select-none ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="h-20 px-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60">
        <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-black shadow-lg shadow-cyan-900/30 shrink-0">
            <Truck className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">FLEETOPS</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  INTEL
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[160px]" title={companyName}>
                {companyName}
              </p>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="طي القائمة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Role Indicator Banner */}
      {!isCollapsed && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>الدور الفعّال:</span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {effectiveRole}
          </span>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentTab === item.key ||
            (item.key === 'operations' && (currentTab === 'trips' || currentTab === 'driver_mode')) ||
            (item.key === 'fleet' && (currentTab === 'vehicles' || currentTab === 'maintenance' || currentTab === 'fuel')) ||
            (item.key === 'people' && currentTab === 'drivers') ||
            (item.key === 'ai_center' && currentTab === 'ai_assistant') ||
            (item.key === 'settings' && currentTab === 'users');

          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'
                }`}
              />

              {!isCollapsed && (
                <span className="truncate flex-1 text-right font-semibold">{item.label}</span>
              )}

              {item.badge !== undefined && (
                <span
                  className={`${item.badgeColor || 'bg-cyan-500 text-white'} text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-[20px] text-center shadow-sm ${
                    isCollapsed ? 'absolute -top-1 -right-1' : ''
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Login / Account Switcher & Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-400">
        {onOpenLoginModal && (
          <button
            id="sidebar-open-login-btn"
            onClick={onOpenLoginModal}
            className={`w-full mb-2 flex items-center gap-2 py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-cyan-400 hover:text-cyan-300 border border-slate-700/60 transition-all font-semibold text-xs shadow-xs ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="تسجيل الدخول / تبديل الحساب"
          >
            <KeyRound className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>{currentUser ? 'تبديل الحساب' : 'تسجيل الدخول'}</span>}
          </button>
        )}

        {!isCollapsed && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300">منظومة فليت أوبس</span>
              <span className="text-[10px] text-emerald-400 font-mono">v3.2 SaaS</span>
            </div>
            <p className="text-[11px] text-slate-400">الإسكندرية • الساحل • البحيرة</p>
          </div>
        )}
      </div>
    </aside>
  );
};
