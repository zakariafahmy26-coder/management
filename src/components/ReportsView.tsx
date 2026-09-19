import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Car,
  CheckCircle2,
  DollarSign,
  Download,
  Droplet,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  MapPin,
  Printer,
  Sparkles,
  TrendingUp,
  User,
  Wrench,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Driver, FuelRecord, MaintenanceRecord, TripRoute, Vehicle } from '../types';

interface ReportsViewProps {
  trips: TripRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  maintenance: MaintenanceRecord[];
  fuelRecords?: FuelRecord[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  trips,
  vehicles,
  drivers,
  maintenance,
  fuelRecords = [],
}) => {
  // Preset types
  const [reportType, setReportType] = useState<
    'all' | 'daily' | 'monthly' | 'yearly' | 'vehicle' | 'driver' | 'region'
  >('all');

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('all');
  const [selectedDriverId, setSelectedDriverId] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);
  const currentYearStr = todayStr.slice(0, 4);

  // Apply filters
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // Date filtering
      if (reportType === 'daily' && t.date !== todayStr) return false;
      if (reportType === 'monthly' && !t.date.startsWith(currentMonthStr)) return false;
      if (reportType === 'yearly' && !t.date.startsWith(currentYearStr)) return false;

      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;

      // Entity filtering
      if (selectedVehicleId !== 'all' && t.vehicleId !== selectedVehicleId) return false;
      if (selectedDriverId !== 'all' && t.driverId !== selectedDriverId) return false;
      if (selectedRegion !== 'all' && t.region !== selectedRegion) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;

      return true;
    });
  }, [
    trips,
    reportType,
    dateFrom,
    dateTo,
    selectedVehicleId,
    selectedDriverId,
    selectedRegion,
    selectedStatus,
    todayStr,
    currentMonthStr,
    currentYearStr,
  ]);

  // Aggregations
  const totalTrips = filteredTrips.length;
  const totalKm = filteredTrips.reduce((s, t) => s + (t.distanceKm || 0), 0);
  const totalFuelLiters = filteredTrips.reduce((s, t) => s + (t.fuelLiters || 0), 0);
  const totalFuelCost = filteredTrips.reduce((s, t) => s + (t.fuelTotalCost || 0), 0);
  const totalTolls = filteredTrips.reduce((s, t) => s + (t.tollTaxes || 0), 0);
  const totalOther = filteredTrips.reduce((s, t) => s + (t.otherExpenses || 0), 0);
  const totalTripCost = filteredTrips.reduce((s, t) => s + (t.tripCostTotal || 0), 0);

  // Maintenance cost for selected vehicle
  const relevantMaintCost = useMemo(() => {
    return maintenance
      .filter((m) => selectedVehicleId === 'all' || m.vehicleId === selectedVehicleId)
      .reduce((s, m) => s + (m.cost || 0), 0);
  }, [maintenance, selectedVehicleId]);

  const grandTotalCost = totalTripCost + relevantMaintCost;
  const avgCostPerKm = totalKm > 0 ? (grandTotalCost / totalKm).toFixed(2) : '0.00';

  // Excel Export
  const handleExportExcel = () => {
    const exportData = filteredTrips.map((t) => {
      const v = vehicles.find((x) => x.id === t.vehicleId);
      const d = drivers.find((x) => x.id === t.driverId);
      return {
        'كود الرحلة': t.tripCode,
        التاريخ: t.date,
        المنطقة: t.region,
        'خط السير': t.routeName,
        المركبة: v ? `${v.model} (${v.plateNumber})` : t.vehicleId,
        السائق: d ? d.name : t.driverId,
        'المسافة (كم)': t.distanceKm,
        'وقود (لتر)': t.fuelLiters,
        'تكلفة الوقود': t.fuelTotalCost,
        الكارتات: t.tollTaxes,
        'مصاريف أخرى': t.otherExpenses,
        'إجمالي الرحلة': t.tripCostTotal,
        الحالة: t.status,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير الرحلات والمصروفات');
    XLSX.writeFile(wb, `Fleet_Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Print Report (native print triggering optimized printable CSS)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>نظام التقارير والتحليل الإحصائي والمالي</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            استخراج وتصدير تقارير التشغيل اليومية والشهرية وتكاليف الوقود والصيانة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير PDF</span>
          </button>
        </div>
      </div>

      {/* Preset Report Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { id: 'all', label: 'التقرير الشامل' },
          { id: 'daily', label: 'تقرير اليوم' },
          { id: 'monthly', label: 'تقرير الشهر' },
          { id: 'yearly', label: 'تقرير السنة' },
          { id: 'vehicle', label: 'تقرير سيارة' },
          { id: 'driver', label: 'تقرير سائق' },
          { id: 'region', label: 'تقرير منطقة' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold text-center transition border ${
              reportType === tab.id
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/20'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comprehensive Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 pb-2 border-b border-slate-800">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span>تخصيص معايير التقرير والفلترة المتقدمة:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Date from */}
          <div>
            <label className="block text-slate-400 mb-1">من تاريخ:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-slate-400 mb-1">إلى تاريخ:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Vehicle */}
          <div>
            <label className="block text-slate-400 mb-1">المركبة:</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">جميع المركبات</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.code} - {v.model} ({v.plateNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Driver */}
          <div>
            <label className="block text-slate-400 mb-1">السائق:</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">جميع السائقين</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-slate-400 mb-1">المنطقة:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">جميع المناطق</option>
              <option value="الإسكندرية">الإسكندرية</option>
              <option value="الساحل الشمالي">الساحل الشمالي</option>
              <option value="البحيرة">البحيرة</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-400 mb-1">حالة الرحلة:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="مكتملة">مكتملة</option>
              <option value="جارية">جارية</option>
              <option value="مجدولة">مجدولة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Aggregated Executive Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-slate-400 text-xs">عدد الرحلات المنفذة</div>
          <div className="text-2xl font-black text-white mt-1">{totalTrips}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5">مطابقة للفلتر المحدد</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-slate-400 text-xs">إجمالي المسافة</div>
          <div className="text-2xl font-black text-indigo-400 mt-1">
            {totalKm.toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-normal">كم</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">مسافة حركة المركبات</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-slate-400 text-xs">استهلاك الوقود</div>
          <div className="text-2xl font-black text-blue-400 mt-1">
            {totalFuelLiters.toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-normal">لتر</span>
          </div>
          <div className="text-[11px] text-blue-400 mt-0.5">
            تكلفة: {totalFuelCost.toLocaleString()} ج.م
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-slate-400 text-xs">مصروفات الصيانة</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {relevantMaintCost.toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-normal">ج.م</span>
          </div>
          <div className="text-[11px] text-amber-400 mt-0.5">قطع غيار وزيوت</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-slate-400 text-xs">إجمالي المصروفات</div>
          <div className="text-2xl font-black text-white mt-1">
            {grandTotalCost.toLocaleString()}{' '}
            <span className="text-xs text-emerald-400 font-normal">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">شامل الكارتات والوقود</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-slate-400 text-xs">تكلفة الكيلومتر</div>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {avgCostPerKm}{' '}
            <span className="text-xs text-slate-400 font-normal">ج.م/كم</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">مؤشر كفاءة التشغيل</div>
        </div>
      </div>

      {/* Printable Report Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl print:border-none print:shadow-none">
        <div className="p-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
          <div className="font-bold text-white text-sm">
            تفاصيل الرحلات وسجلات التشغيل ({filteredTrips.length} سجل)
          </div>
          <div className="text-xs text-slate-400">
            تاريخ استخراج التقرير: {new Date().toLocaleDateString('ar-EG')}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-800 text-slate-300 font-bold border-b border-slate-700">
              <tr>
                <th className="p-3">كود الرحلة</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">المنطقة</th>
                <th className="p-3">المركبة</th>
                <th className="p-3">السائق</th>
                <th className="p-3">خط السير</th>
                <th className="p-3">المسافة</th>
                <th className="p-3">الوقود (لتر)</th>
                <th className="p-3">الكارتات</th>
                <th className="p-3">إجمالي التكلفة</th>
                <th className="p-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    لا توجد رحلات تطابق معايير التقرير المحددة
                  </td>
                </tr>
              ) : (
                filteredTrips.map((t) => {
                  const veh = vehicles.find((v) => v.id === t.vehicleId);
                  const drv = drivers.find((d) => d.id === t.driverId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-3 font-mono font-bold text-white">{t.tripCode}</td>
                      <td className="p-3 whitespace-nowrap">{t.date}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {t.region}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium text-white">
                        {veh ? `${veh.model} (${veh.plateNumber})` : t.vehicleId}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-300">
                        {drv ? drv.name : t.driverId}
                      </td>
                      <td className="p-3 max-w-[200px] truncate" title={t.routeName}>
                        {t.routeName}
                      </td>
                      <td className="p-3 whitespace-nowrap font-bold text-indigo-400">
                        {t.distanceKm} كم
                      </td>
                      <td className="p-3 whitespace-nowrap text-blue-400 font-semibold">
                        {t.fuelLiters} لتر ({t.fuelTotalCost} ج.م)
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-400">{t.tollTaxes} ج.م</td>
                      <td className="p-3 whitespace-nowrap font-black text-white">
                        {t.tripCostTotal.toLocaleString()} ج.م
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'مكتملة'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : t.status === 'جارية' || t.status === 'جارية حالياً'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
