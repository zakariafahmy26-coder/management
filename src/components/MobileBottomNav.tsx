import {
  AlertTriangle,
  Car,
  FileText,
  Fuel,
  Gauge,
  Layers,
  LayoutDashboard,
  Navigation,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import React from 'react';
import { TabKey } from '../types';

interface MobileBottomNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  urgentAlertsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  urgentAlertsCount,
}) => {
  const tabs = [
    {
      key: 'dashboard' as TabKey,
      label: 'الرئيسية',
      icon: LayoutDashboard,
    },
    {
      key: 'ai_assistant' as TabKey,
      label: 'الذكاء الاصطناعي',
      icon: Sparkles,
    },
    {
      key: 'driver_mode' as TabKey,
      label: 'السائق',
      icon: Gauge,
    },
    {
      key: 'trips' as TabKey,
      label: 'الرحلات',
      icon: Navigation,
    },
    {
      key: 'fuel' as TabKey,
      label: 'الوقود',
      icon: Fuel,
    },
    {
      key: 'vehicles' as TabKey,
      label: 'الأسطول',
      icon: Car,
    },
    {
      key: 'maintenance' as TabKey,
      label: 'الصيانة',
      icon: Wrench,
      badge: urgentAlertsCount > 0 ? urgentAlertsCount : null,
    },
    {
      key: 'reports' as TabKey,
      label: 'التقارير',
      icon: FileText,
    },
  ];

  return (
    <nav
      id="mobile-bottom-navbar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 shadow-2xl safe-area-bottom"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer relative ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-bold px-1 rounded-full animate-pulse min-w-[14px] text-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
