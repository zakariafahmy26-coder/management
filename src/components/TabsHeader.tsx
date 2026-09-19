import {
  BarChart3,
  Car,
  FileSpreadsheet,
  FileText,
  Fuel,
  Gauge,
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  Briefcase,
} from 'lucide-react';
import React from 'react';
import { TabKey } from '../types';

export type TabId = TabKey;

interface TabsHeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tripsCount?: number;
  vehiclesCount?: number;
  driversCount?: number;
  alertsCount?: number;
  locationsCount?: number;
  usersCount?: number;
  counts?: {
    trips?: number;
    vehicles?: number;
    drivers?: number;
    locations?: number;
    maintenance?: number;
    alerts?: number;
    users?: number;
    fuel?: number;
    pendingUsers?: number;
  };
}

export const TabsHeader: React.FC<TabsHeaderProps> = ({
  activeTab,
  onTabChange,
  tripsCount,
  vehiclesCount,
  driversCount,
  alertsCount,
  locationsCount,
  usersCount,
  counts,
}) => {
  const actualTrips = counts?.trips ?? tripsCount ?? 0;
  const actualVehicles = counts?.vehicles ?? vehiclesCount ?? 0;
  const actualDrivers = counts?.drivers ?? driversCount ?? 0;
  const actualAlerts = counts?.alerts ?? alertsCount ?? 0;
  const actualLocations = counts?.locations ?? locationsCount ?? 0;
  const actualUsers = counts?.users ?? usersCount ?? 0;
  const pendingUsersCount = counts?.pendingUsers ?? 0;

  const tabs = [
    {
      id: 'sales' as TabId,
      name: 'لوحة دعم المبيعات وعروض الأسعار',
      icon: Briefcase,
      badge: 'جديد',
      badgeColor: 'blue',
      color: 'blue',
    },
    {
      id: 'dashboard' as TabId,
      name: 'لوحة المؤشرات العامة',
      icon: BarChart3,
      badge: null,
      color: 'emerald',
    },
    {
      id: 'ai_assistant' as TabId,
      name: 'مساعد الأسطول والذكاء الاصطناعي',
      icon: Sparkles,
      badge: 'Gemini',
      badgeColor: 'emerald',
      color: 'teal',
    },
    {
      id: 'trips' as TabId,
      name: 'شيت خطوط السير والوقود',
      icon: MapPin,
      badge: actualTrips,
      color: 'blue',
    },
    {
      id: 'driver_mode' as TabId,
      name: 'واجهة السائق الميدانية',
      icon: Gauge,
      badge: null,
      color: 'emerald',
    },
    {
      id: 'fuel' as TabId,
      name: 'استهلاك وتموين الوقود',
      icon: Fuel,
      badge: counts?.fuel ?? null,
      color: 'teal',
    },
    {
      id: 'locations' as TabId,
      name: 'المناطق والأماكن اللوجستية',
      icon: Layers,
      badge: actualLocations,
      color: 'emerald',
    },
    {
      id: 'vehicles' as TabId,
      name: 'أسطول سيارات المصنع',
      icon: Car,
      badge: actualVehicles,
      color: 'purple',
    },
    {
      id: 'drivers' as TabId,
      name: 'سجل السائقين والتراخيص',
      icon: Users,
      badge: actualDrivers,
      color: 'indigo',
    },
    {
      id: 'maintenance' as TabId,
      name: 'الصيانة والتنبيهات',
      icon: Wrench,
      badge: actualAlerts > 0 ? actualAlerts : null,
      badgeColor: 'rose',
      color: 'amber',
    },
    {
      id: 'reports' as TabId,
      name: 'التقارير والمصروفات الشهرية',
      icon: FileText,
      badge: null,
      color: 'teal',
    },
    {
      id: 'users' as TabId,
      name: 'الحسابات وفريق العمل',
      icon: ShieldCheck,
      badge: pendingUsersCount > 0 ? `${pendingUsersCount} معلق` : (actualUsers > 0 ? actualUsers : null),
      badgeColor: pendingUsersCount > 0 ? 'amber' : undefined,
      color: 'purple',
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200 sticky top-[73px] z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-reverse space-x-1 overflow-x-auto no-scrollbar py-2">
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 text-xs text-slate-500 font-semibold whitespace-nowrap">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>شيتات العمل:</span>
          </div>

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.name}</span>
                {tab.badge !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      tab.badgeColor === 'rose'
                        ? 'bg-rose-500 text-white'
                        : tab.badgeColor === 'amber'
                        ? 'bg-amber-500 text-slate-950 font-black animate-pulse'
                        : isActive
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
