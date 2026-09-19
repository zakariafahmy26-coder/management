import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Droplet,
  Fuel,
  Gauge,
  MapPin,
  PieChart as PieChartIcon,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  Wrench,
  Sparkles,
  Activity,
  Layers,
} from 'lucide-react';
import {
  Driver,
  MaintenanceAlert,
  MaintenanceRecord,
  MonthlyReportSummary,
  TripRoute,
  Vehicle,
} from '../types';
import { TabId } from './TabsHeader';

interface DashboardViewProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: TripRoute[];
  maintenance: MaintenanceRecord[];
  alerts?: MaintenanceAlert[];
  monthlyReport?: MonthlyReportSummary;
  onNavigateTab: (tab: TabId) => void;
  onOpenNewTripModal: () => void;
  onOpenNewDriverModal?: () => void;
  onOpenNewMaintModal?: () => void;
  onOpenMaintenanceModal?: (vehicleId?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  vehicles = [],
  drivers = [],
  trips = [],
  maintenance = [],
  alerts = [],
  monthlyReport,
  onNavigateTab,
  onOpenNewTripModal,
  onOpenNewDriverModal,
  onOpenNewMaintModal,
  onOpenMaintenanceModal,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'regions' | 'expenses' | 'performance'>('all');

  const safeAlerts = alerts || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrips = (trips || []).filter((t) => t.date === todayStr);
  const activeTrips = (trips || []).filter((t) => t.status === 'جارية' || t.status === 'جارية حالياً');
  const completedTrips = (trips || []).filter((t) => t.status === 'مكتملة');
  const urgentAlerts = safeAlerts.filter((a) => a.severity === 'urgent');

  // Aggregated KPIs
  const totalDistanceKm = trips.reduce((s, t) => s + (t.distanceKm || 0), 0);
  const totalFuelLiters = trips.reduce((s, t) => s + (t.fuelLiters || 0), 0);
  const totalFuelCost = trips.reduce((s, t) => s + (t.fuelTotalCost || 0), 0);
  const totalMaintenanceCost = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
  const totalTollAndOtherCost = trips.reduce(
    (s, t) => s + (t.tollTaxes || 0) + (t.otherExpenses || 0),
    0
  );
  const grandTotalCost = totalFuelCost + totalMaintenanceCost + totalTollAndOtherCost;
  const avgCostPerKm = totalDistanceKm > 0 ? (grandTotalCost / totalDistanceKm).toFixed(2) : '0.00';

  // Chart 1: Trips by Region
  const regionNames = ['الإسكندرية', 'الساحل الشمالي', 'البحيرة'];
  const regionStats = regionNames.map((reg) => {
    const rTrips = trips.filter((t) => (t.region || '').includes(reg));
    const dist = rTrips.reduce((s, t) => s + (t.distanceKm || 0), 0);
    const cost = rTrips.reduce((s, t) => s + (t.tripCostTotal || 0), 0);
    return {
      name: reg,
      tripCount: rTrips.length,
      distanceKm: dist,
      cost,
    };
  });
  const maxRegionTrips = Math.max(...regionStats.map((r) => r.tripCount), 1);

  // Chart 2: Expenses breakdown
  const expenseCategories = [
    { label: 'الوقود والسولار', amount: totalFuelCost, color: 'bg-blue-500', text: 'text-blue-400' },
    { label: 'الصيانة وقطع الغيار', amount: totalMaintenanceCost, color: 'bg-amber-500', text: 'text-amber-400' },
    { label: 'كارتات وبوابات ورسوم', amount: totalTollAndOtherCost, color: 'bg-emerald-500', text: 'text-emerald-400' },
  ];
  const maxExpense = Math.max(...expenseCategories.map((c) => c.amount), 1);

  // Chart 3: Fuel consumption by vehicle
  const vehicleFuelStats = vehicles.map((v) => {
    const vTrips = trips.filter((t) => t.vehicleId === v.id);
    const fuelL = vTrips.reduce((s, t) => s + (t.fuelLiters || 0), 0);
    const cost = vTrips.reduce((s, t) => s + (t.fuelTotalCost || 0), 0);
    return {
      vehicle: v,
      liters: fuelL,
      cost,
    };
  });
  const maxFuelLiters = Math.max(...vehicleFuelStats.map((vf) => vf.liters), 1);

  // Chart 4: Maintenance costs by type
  const maintTypeMap: Record<string, number> = {};
  maintenance.forEach((m) => {
    const type = m.maintenanceType || 'صيانة دورية';
    maintTypeMap[type] = (maintTypeMap[type] || 0) + (m.cost || 0);
  });
  const maintEntries = Object.entries(maintTypeMap);
  const maxMaintCost = Math.max(...maintEntries.map(([, c]) => c), 1);

  // Chart 5: Vehicle performance & Km utilization
  const vehicleKmStats = vehicles.map((v) => {
    const vTrips = trips.filter((t) => t.vehicleId === v.id);
    const km = vTrips.reduce((s, t) => s + (t.distanceKm || 0), 0);
    return {
      code: v.code,
      model: v.model,
      plateNumber: v.plateNumber,
      km,
      tripCount: vTrips.length,
      currentOdometer: v.currentOdometer,
    };
  });
  const maxVehicleKm = Math.max(...vehicleKmStats.map((vk) => vk.km), 1);

  // Chart 6: Driver performance & ratings
  const driverPerformance = drivers.map((d) => {
    const dTrips = trips.filter((t) => t.driverId === d.id);
    const completed = dTrips.filter((t) => t.status === 'مكتملة').length;
    const km = dTrips.reduce((s, t) => s + (t.distanceKm || 0), 0);
    return {
      name: d.name,
      code: d.code,
      rating: d.rating || 5,
      completed,
      km,
    };
  });
  const maxDriverTrips = Math.max(...driverPerformance.map((dp) => dp.completed), 1);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Factory Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
            <Compass className="w-3.5 h-3.5" />
            <span>نظام إدارة أساطيل النقل وخطوط سير سيارات المصنع</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            لوحة المراقبة التشغيلية والتحليل المالي - قطاع غرب الدلتا والساحل
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            متابعة لحظية لحركة الشاحنات، استهلاك السولار، تكاليف الكيلومتر، وجداول الصيانة الدورية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenNewDriverModal && (
            <button
              onClick={onOpenNewDriverModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-900/40 transition active:scale-95 cursor-pointer border border-teal-400/30"
              title="إضافة سائق جديد وتسجيل تفاصيل بياناته"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ إضافة سائق جديد</span>
            </button>
          )}
          <button
            onClick={onOpenNewTripModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition active:scale-95 cursor-pointer"
          >
            <span>+ تسجيل رحلة جديدة</span>
          </button>
          <button
            onClick={() => onNavigateTab('driver_mode')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition cursor-pointer"
          >
            <Gauge className="w-4 h-4" />
            <span>واجهة السائق الميدانية</span>
          </button>
        </div>
      </div>

      {/* AI Quick Insights Banner */}
      <div className="bg-gradient-to-l from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                توصيات ومساعد الذكاء الاصطناعي اليومي (Fleet AI)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                Gemini 3.8
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              تحليل مباشر للبيانات، واستخراج فواتير الوقود بالرؤية البصرية، وتنبؤ بالأعطال ومواعيد الصيانة.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('ai_assistant')}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm whitespace-nowrap cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>فتح مساعد الأسطول الذكي</span>
        </button>
      </div>

      {/* 8 Core KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Vehicles */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>السيارات</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{vehicles.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">جاهزة للعمل</div>
        </div>

        {/* Drivers */}
        <div
          onClick={() => {
            if (onOpenNewDriverModal) onOpenNewDriverModal();
            else onNavigateTab('drivers');
          }}
          className="bg-slate-900/90 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-4 flex flex-col justify-between transition cursor-pointer group"
          title="انقر لإضافة سائق جديد أو استعراض السائقين"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>السائقين</span>
            <Users className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{drivers.length}</span>
            <span className="text-[10px] text-teal-300 font-bold bg-teal-950/70 border border-teal-500/40 px-1.5 py-0.5 rounded-md">
              + إضافة
            </span>
          </div>
          <div className="text-[10px] text-teal-400 mt-1">سائق معتمد</div>
        </div>

        {/* Active Trips */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>رحلات جارية</span>
            <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-400">{activeTrips.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">{todayTrips.length} اليوم</div>
        </div>

        {/* Completed Trips */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>المكتملة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{completedTrips.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">إجمالي: {trips.length}</div>
        </div>

        {/* Kilometers */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>الكيلومترات</span>
            <Gauge className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-xl font-black text-white">{totalDistanceKm.toLocaleString()}</div>
          <div className="text-[10px] text-indigo-400 mt-1">كم مسافة مقطوعة</div>
        </div>

        {/* Fuel Liters */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>استهلاك الوقود</span>
            <Droplet className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-xl font-black text-white">{totalFuelLiters.toLocaleString()}</div>
          <div className="text-[10px] text-sky-400 mt-1">لتر سولار/بنزين</div>
        </div>

        {/* Total Cost */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>المصروفات</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-black text-amber-400">
            {grandTotalCost.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">وقود + صيانة + كارتة</div>
        </div>

        {/* Cost Per Km */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>تكلفة الكيلومتر</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl font-black text-rose-400">{avgCostPerKm}</div>
          <div className="text-[10px] text-slate-400 mt-1">جنيه / كم</div>
        </div>
      </div>

      {/* 6 Interactive Performance & Analytics Charts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">الرسوم البيانية والتحليلات التفاعلية</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveChartTab('all')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeChartTab === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              جميع الرسوم (6)
            </button>
            <button
              onClick={() => setActiveChartTab('regions')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeChartTab === 'regions' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              المناطق والوقود
            </button>
            <button
              onClick={() => setActiveChartTab('performance')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeChartTab === 'performance' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              أداء السيارات والسائقين
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Chart 1: Trips by Region */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>1. الرحلات حسب المنطقة</span>
              </h4>
              <span className="text-[11px] text-slate-400">توزيع خطوط السير</span>
            </div>
            <div className="space-y-3 pt-2">
              {regionStats.map((reg) => {
                const pct = Math.round((reg.tripCount / maxRegionTrips) * 100);
                return (
                  <div key={reg.name} className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-semibold">{reg.name}</span>
                      <span className="text-emerald-400 font-bold">
                        {reg.tripCount} رحلة ({reg.distanceKm.toLocaleString()} كم)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Monthly Expenses Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-amber-400" />
                <span>2. توزيع المصروفات التشغيلية</span>
              </h4>
              <span className="text-[11px] text-slate-400">وقود وصيانة ورسوم</span>
            </div>
            <div className="space-y-3 pt-2">
              {expenseCategories.map((exp) => {
                const pct = grandTotalCost > 0 ? Math.round((exp.amount / grandTotalCost) * 100) : 0;
                return (
                  <div key={exp.label} className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>{exp.label}</span>
                      <span className={`font-bold ${exp.text}`}>
                        {exp.amount.toLocaleString()} ج.م ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${exp.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 3: Fuel Consumption by Vehicle */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Fuel className="w-4 h-4 text-blue-400" />
                <span>3. استهلاك الوقود بالمركبات</span>
              </h4>
              <span className="text-[11px] text-slate-400">لترات السولار المستهلكة</span>
            </div>
            <div className="space-y-2.5 pt-1">
              {vehicleFuelStats.slice(0, 4).map((vf) => {
                const pct = Math.round((vf.liters / maxFuelLiters) * 100);
                return (
                  <div key={vf.vehicle.id} className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-semibold">{vf.vehicle.code} - {vf.vehicle.model.slice(0, 18)}</span>
                      <span className="text-blue-400 font-bold">{vf.liters} لتر</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 4: Maintenance Costs by Type */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-rose-400" />
                <span>4. تكاليف الصيانة حسب النوع</span>
              </h4>
              <span className="text-[11px] text-slate-400">زيوت، إطارات، فلاتر</span>
            </div>
            <div className="space-y-2.5 pt-1">
              {maintEntries.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">لا توجد سجلات صيانة</div>
              ) : (
                maintEntries.slice(0, 4).map(([type, cost]) => {
                  const pct = Math.round((cost / maxMaintCost) * 100);
                  return (
                    <div key={type} className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span className="font-semibold">{type}</span>
                        <span className="text-rose-400 font-bold">{cost.toLocaleString()} ج.م</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chart 5: Vehicle Performance & Km Utilization */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-teal-400" />
                <span>5. أداء وتشغيل السيارات</span>
              </h4>
              <span className="text-[11px] text-slate-400">المسافة وعدد الرحلات</span>
            </div>
            <div className="space-y-2.5 pt-1">
              {vehicleKmStats.slice(0, 4).map((vk) => {
                const pct = Math.round((vk.km / maxVehicleKm) * 100);
                return (
                  <div key={vk.code} className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-semibold">{vk.code} ({vk.plateNumber})</span>
                      <span className="text-teal-400 font-bold">
                        {vk.km.toLocaleString()} كم ({vk.tripCount} رحلة)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 6: Driver Performance & Ratings */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>6. أداء السائقين والتقييم</span>
              </h4>
              <div className="flex items-center gap-2">
                {onOpenNewDriverModal && (
                  <button
                    onClick={onOpenNewDriverModal}
                    className="text-[11px] bg-teal-950/70 hover:bg-teal-900 border border-teal-500/40 text-teal-300 font-bold px-2 py-0.5 rounded-lg transition cursor-pointer"
                  >
                    + إضافة سائق جديد
                  </button>
                )}
                <span className="text-[11px] text-slate-400 hidden sm:inline">الرحلات المنفذة والتقييم</span>
              </div>
            </div>
            <div className="space-y-2.5 pt-1">
              {driverPerformance.slice(0, 4).map((dp) => {
                const pct = Math.round((dp.completed / maxDriverTrips) * 100);
                return (
                  <div key={dp.name} className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-semibold">{dp.name}</span>
                      <span className="text-purple-400 font-bold">
                        {dp.completed} مكتملة | ⭐ {dp.rating}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Immediate Maintenance Alerts & Overdue Notice */}
      {safeAlerts.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>تنبيهات الصيانة والتراخيص العاجلة ({safeAlerts.length})</span>
            </h3>
            <button
              onClick={() => onNavigateTab('maintenance')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              عرض جدول الصيانة الكامل
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {safeAlerts.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                  a.severity === 'urgent'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-white">
                    {a.vehiclePlate} ({a.vehicleModel})
                  </div>
                  <p className="text-[11px] text-slate-300">{a.message}</p>
                  <span className="text-[10px] font-bold text-amber-300">{a.dueDetail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
