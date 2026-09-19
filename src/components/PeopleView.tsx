import React, { useState } from 'react';
import {
  Users,
  Award,
  Plus,
  Search,
  Star,
  Phone,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Shield,
  TrendingUp,
  Clock,
  ChevronLeft,
  X,
  UserCheck,
} from 'lucide-react';
import { Driver, Vehicle } from '../types';
import { DriversSheetView } from './DriversSheetView';

interface PeopleViewProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  canEdit: boolean;
  onOpenDriverModal: () => void;
  onEditDriver: (driver: Driver) => void;
  onDeleteDriver: (driverId: string) => void;
  onOpenDriverMode?: () => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({
  drivers,
  vehicles,
  canEdit,
  onOpenDriverModal,
  onEditDriver,
  onDeleteDriver,
  onOpenDriverMode,
}) => {
  const [subTab, setSubTab] = useState<'drivers' | 'employees' | 'analytics'>('drivers');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Employees List (Operations staff, dispatchers, supervisors)
  const [employees] = useState([
    {
      id: 'emp-01',
      name: 'م. أحمد الشناوي',
      role: 'مدير عمليات الأسطول (Operations Manager)',
      department: 'إدارة الحركة والعمليات',
      phone: '+20 100 452 8891',
      email: 'a.elshinawy@fleetops.eg',
      location: 'مقر إدارة برج العرب الرئيسي',
      status: 'نشط',
    },
    {
      id: 'emp-02',
      name: 'كابتن طارق عبد الحميد',
      role: 'مشرف حركة ومناوبة قطاع الساحل',
      department: 'المتابعة الميدانية',
      phone: '+20 122 891 0034',
      email: 't.abdelhamid@fleetops.eg',
      location: 'مستودع العلمين والساحل',
      status: 'نشط',
    },
    {
      id: 'emp-03',
      name: 'أ. محمود رضوان',
      role: 'مسؤول التوجيه والديسباتش (Senior Dispatcher)',
      department: 'غرفة التحكم المركزية',
      phone: '+20 111 672 3345',
      email: 'm.radwan@fleetops.eg',
      location: 'مركز التحكم اللوجستي - سموحة',
      status: 'نشط',
    },
    {
      id: 'emp-04',
      name: 'م. حسام البحيري',
      role: 'مهندس صيانة وجودة ميكانيكية',
      department: 'ورش الصيانة الوقائية',
      phone: '+20 106 554 9901',
      email: 'h.elbehairy@fleetops.eg',
      location: 'ورشة العامرية المركزية',
      status: 'نشط',
    },
  ]);

  // Driver Analytics Calculations
  const sortedDrivers = [...drivers].sort(
    (a, b) => (b.performance?.performanceScore || 90) - (a.performance?.performanceScore || 90)
  );

  const avgPerformance = Math.round(
    drivers.reduce((acc, d) => acc + (d.performance?.performanceScore || 90), 0) / (drivers.length || 1)
  );

  const avgOnTime = Math.round(
    drivers.reduce((acc, d) => acc + (d.performance?.onTimePercentage || 95), 0) / (drivers.length || 1)
  );

  const totalCompletedTrips = drivers.reduce(
    (acc, d) => acc + (d.performance?.completedTasks || d.totalCompletedTrips || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* People Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              السائقين وفرق العمليات الميدانية
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              إدارة الكوادر البشرية، كباتن الشاحنات، وتقييم مؤشرات الأداء والالتزام
            </p>
          </div>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
          <button
            onClick={() => setSubTab('drivers')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'drivers'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            السائقين ({drivers.length})
          </button>
          <button
            onClick={() => setSubTab('employees')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'employees'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            الموظفين والمشرفين ({employees.length})
          </button>
          <button
            onClick={() => setSubTab('analytics')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            تحليلات الأداء والتقييم
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400">إجمالي السائقين المعتمدين</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{drivers.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">درجة أولى، ثانية، وثالثة</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>متوسط درجة الأداء</span>
            <Award className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{avgPerformance} / 100</div>
          <div className="text-[10px] text-slate-400 mt-0.5">معدل قياسي ممتاز</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center justify-between">
            <span>نسبة الالتزام بالمواعيد</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1">{avgOnTime}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">وصول وتسليم في الوقت المحدد</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
            <span>إجمالي المهام المنجزة</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{totalCompletedTrips}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">بمختلف خطوط السير والمحافظات</div>
        </div>
      </div>

      {/* SUB-TAB 1: DRIVERS */}
      {subTab === 'drivers' && (
        <DriversSheetView
          drivers={drivers}
          vehicles={vehicles}
          onOpenDriverModal={onOpenDriverModal}
          onEditDriver={onEditDriver}
          onDeleteDriver={onDeleteDriver}
          canEdit={canEdit}
        />
      )}

      {/* SUB-TAB 2: EMPLOYEES */}
      {subTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-base text-slate-900 dark:text-white">
                    {emp.name}
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {emp.status}
                  </span>
                </div>

                <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
                  {emp.role}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  {emp.department} • {emp.location}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{emp.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{emp.email}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 3: DRIVER PERFORMANCE ANALYTICS */}
      {subTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-500" />
              <span>لوحة تميز وشرف السائقين (Driver Leaderboard)</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">الترتيب</th>
                    <th className="py-3 px-4">السائق</th>
                    <th className="py-3 px-4">درجة الأداء</th>
                    <th className="py-3 px-4">الالتزام بالمواعيد</th>
                    <th className="py-3 px-4">المهام المكتملة</th>
                    <th className="py-3 px-4">المهام المتأخرة</th>
                    <th className="py-3 px-4">مستوى التقييم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedDrivers.map((driver, index) => {
                    const perf = driver.performance || {
                      performanceScore: 90,
                      onTimePercentage: 95,
                      completedTasks: driver.totalCompletedTrips || 20,
                      delayedTasks: 1,
                      incidentCount: 0,
                    };

                    return (
                      <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-black">
                          {index === 0 ? (
                            <span className="text-amber-500 text-sm">🥇 #1</span>
                          ) : index === 1 ? (
                            <span className="text-slate-400 text-sm">🥈 #2</span>
                          ) : index === 2 ? (
                            <span className="text-amber-700 text-sm">🥉 #3</span>
                          ) : (
                            <span className="text-slate-400 font-mono">#{index + 1}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{driver.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({driver.code})</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{driver.operatingZone || 'كل المناطق'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                            {perf.performanceScore} / 100
                          </div>
                          <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${perf.performanceScore}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {perf.onTimePercentage}%
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {perf.completedTasks}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-rose-500 font-mono">
                          {perf.delayedTasks}
                        </td>
                        <td className="py-3.5 px-4">
                          {perf.performanceScore >= 92 ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              سائق نخبوي ⭐
                            </span>
                          ) : perf.performanceScore >= 85 ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              كفاءة عالية ✓
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              جيد
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
