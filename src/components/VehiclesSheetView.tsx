import {
  AlertCircle,
  AlertTriangle,
  Car,
  CheckCircle2,
  Edit2,
  Fuel,
  Gauge,
  Plus,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Driver, FuelRecord, MaintenanceAlert, MaintenanceRecord, TripRoute, Vehicle } from '../types';

interface VehiclesSheetViewProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  alerts?: MaintenanceAlert[];
  maintenance?: MaintenanceRecord[];
  fuelRecords?: FuelRecord[];
  trips?: TripRoute[];
  canEdit?: boolean;
  onOpenNewVehicleModal?: () => void;
  onOpenVehicleModal?: () => void;
  onEditVehicle: (veh: Vehicle) => void;
  onDeleteVehicle: (vehId: string) => void;
  onOpenMaintenanceModalForVehicle?: (vehId: string) => void;
}

export function getVehicleHealthStatus(veh: Vehicle): {
  key: 'ok' | 'maint_soon' | 'license_soon' | 'maint_due' | 'license_expired';
  label: string;
  badgeClass: string;
  dotColor: string;
  emoji: string;
} {
  const today = new Date();
  const expiry = new Date(veh.licenseExpiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const remainingKm = veh.nextOilChangeKm - veh.currentOdometer;

  if (diffDays < 0) {
    return {
      key: 'license_expired',
      label: 'ترخيص منتهي',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      dotColor: 'bg-rose-600',
      emoji: '🔴',
    };
  }
  if (remainingKm <= 0) {
    return {
      key: 'maint_due',
      label: 'صيانة مستحقة',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      dotColor: 'bg-rose-600',
      emoji: '🔴',
    };
  }
  if (diffDays <= 30) {
    return {
      key: 'license_soon',
      label: 'الترخيص قريب من الانتهاء',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
      dotColor: 'bg-orange-500',
      emoji: '🟠',
    };
  }
  if (remainingKm <= 500) {
    return {
      key: 'maint_soon',
      label: 'الصيانة قريبة',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      dotColor: 'bg-amber-500',
      emoji: '🟡',
    };
  }
  return {
    key: 'ok',
    label: 'سليمة',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotColor: 'bg-emerald-500',
    emoji: '🟢',
  };
}

export const VehiclesSheetView: React.FC<VehiclesSheetViewProps> = ({
  vehicles = [],
  drivers = [],
  alerts = [],
  maintenance = [],
  fuelRecords = [],
  trips = [],
  canEdit = true,
  onOpenNewVehicleModal,
  onOpenVehicleModal,
  onEditVehicle,
  onDeleteVehicle,
  onOpenMaintenanceModalForVehicle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [fuelFilter, setFuelFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');

  const handleOpenNewVehicle = onOpenNewVehicleModal || onOpenVehicleModal;

  const driverMap = useMemo(() => new Map((drivers || []).map((d) => [d.id, d])), [drivers]);
  const alertMap = useMemo(() => {
    const map = new Map<string, MaintenanceAlert[]>();
    (alerts || []).forEach((a) => {
      const list = map.get(a.vehicleId) || [];
      list.push(a);
      map.set(a.vehicleId, list);
    });
    return map;
  }, [alerts]);

  const filteredVehicles = useMemo(() => {
    return (vehicles || []).filter((v) => {
      const matchesFuel = fuelFilter === 'all' || v.fuelType === fuelFilter;
      const health = getVehicleHealthStatus(v);
      const matchesHealth = healthFilter === 'all' || health.key === healthFilter;
      const drv = v.assignedDriverId ? driverMap.get(v.assignedDriverId) : undefined;

      const terms = [
        v.plateNumber,
        v.code,
        v.model,
        v.fuelType,
        v.status,
        health.label,
        drv?.name || '',
      ].join(' ').toLowerCase();

      const matchesSearch = !searchQuery || terms.includes(searchQuery.toLowerCase());
      return matchesFuel && matchesHealth && matchesSearch;
    });
  }, [vehicles, fuelFilter, healthFilter, searchQuery, driverMap]);

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث برقم اللوحة، طراز السيارة، السائق..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <select
            value={fuelFilter}
            onChange={(e) => setFuelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">جميع أنواع الوقود</option>
            <option value="سولار">سولار (ديزل)</option>
            <option value="بنزين 92">بنزين 92</option>
            <option value="بنزين 95">بنزين 95</option>
            <option value="غاز طبيعي">غاز طبيعي</option>
          </select>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">جميع الحالات الفنية والتراخيص</option>
            <option value="ok">🟢 سليمة</option>
            <option value="maint_soon">🟡 الصيانة قريبة</option>
            <option value="license_soon">🟠 الترخيص قريب من الانتهاء</option>
            <option value="maint_due">🔴 صيانة مستحقة</option>
            <option value="license_expired">🔴 ترخيص منتهي</option>
          </select>
        </div>

        <button
          onClick={handleOpenNewVehicle}
          className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة سيارة للأسطول</span>
        </button>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold">
                <th className="p-3 whitespace-nowrap">اللوحة والكود</th>
                <th className="p-3 min-w-[180px]">النوع والطراز</th>
                <th className="p-3 whitespace-nowrap">الحالة الفنية والتراخيص</th>
                <th className="p-3 whitespace-nowrap">نوع وسعة الوقود</th>
                <th className="p-3 whitespace-nowrap">العداد الحالي</th>
                <th className="p-3 whitespace-nowrap">السائق المخصص</th>
                <th className="p-3 whitespace-nowrap">حالة تغيير الزيت</th>
                <th className="p-3 whitespace-nowrap">انتهاء الرخصة</th>
                <th className="p-3 whitespace-nowrap">الحالة التشغيلية</th>
                <th className="p-3 whitespace-nowrap text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    لا توجد سيارات مطابقة لبحثك.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((veh) => {
                  const drv = veh.assignedDriverId ? driverMap.get(veh.assignedDriverId) : undefined;
                  const vehAlerts = alertMap.get(veh.id) || [];
                  const remainingKm = veh.nextOilChangeKm - veh.currentOdometer;
                  const isOverdue = remainingKm <= 0;
                  const isDueSoon = remainingKm > 0 && remainingKm <= 500;
                  const health = getVehicleHealthStatus(veh);

                  return (
                    <tr key={veh.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-sm">{veh.plateNumber}</div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {veh.code}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{veh.model}</div>
                        <div className="text-[11px] text-slate-400">موديل {veh.year}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${health.badgeClass}`}
                        >
                          <span>{health.emoji}</span>
                          <span>{health.label}</span>
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Fuel className="w-3.5 h-3.5 text-blue-500" />
                          <span>{veh.fuelType}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          تانك {veh.tankCapacity} لتر • {veh.avgConsumptionPer100Km} لتر/100كم
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold font-mono text-slate-900 text-sm">
                          {veh.currentOdometer.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">كم</span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {drv ? (
                          <div>
                            <div className="font-semibold text-slate-900">{drv.name}</div>
                            <div className="text-[10px] text-slate-400">{drv.phone}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">غير مخصص</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isOverdue ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              متأخر بـ {Math.abs(remainingKm).toLocaleString()} كم!
                            </span>
                          ) : isDueSoon ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              متبقي {remainingKm.toLocaleString()} كم
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              متبقي {remainingKm.toLocaleString()} كم
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          الحد القادم: {veh.nextOilChangeKm.toLocaleString()} كم
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-slate-700">
                        {veh.licenseExpiryDate}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            veh.status === 'جاهزة للعمل'
                              ? 'bg-emerald-100 text-emerald-800'
                              : veh.status === 'في خط سير'
                              ? 'bg-blue-100 text-blue-800'
                              : veh.status === 'في الصيانة'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {veh.status}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenMaintenanceModalForVehicle?.(veh.id)}
                            title="تسجيل صيانة لهذه السيارة"
                            className="p-1 rounded text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditVehicle(veh)}
                            title="تعديل بيانات السيارة"
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteVehicle(veh.id)}
                            title="حذف السيارة"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
};
