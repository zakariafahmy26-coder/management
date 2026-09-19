import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Edit2,
  Filter,
  Plus,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { MaintenanceAlert, MaintenanceRecord, Vehicle } from '../types';

interface MaintenanceSheetViewProps {
  maintenance: MaintenanceRecord[];
  vehicles: Vehicle[];
  alerts?: MaintenanceAlert[];
  canEdit?: boolean;
  onOpenNewMaintModal?: () => void;
  onOpenMaintenanceModal?: () => void;
  onEditMaint?: (record: MaintenanceRecord) => void;
  onEditMaintenance?: (record: MaintenanceRecord) => void;
  onDeleteMaint?: (recordId: string) => void;
  onDeleteMaintenance?: (recordId: string) => void;
  onQuickServiceVehicle?: (vehicleId: string) => void;
}

export const MaintenanceSheetView: React.FC<MaintenanceSheetViewProps> = ({
  maintenance = [],
  vehicles = [],
  alerts = [],
  canEdit = true,
  onOpenNewMaintModal,
  onOpenMaintenanceModal,
  onEditMaint,
  onEditMaintenance,
  onDeleteMaint,
  onDeleteMaintenance,
  onQuickServiceVehicle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const handleOpenModal = onOpenNewMaintModal || onOpenMaintenanceModal;
  const handleEdit = onEditMaint || onEditMaintenance;
  const handleDelete = onDeleteMaint || onDeleteMaintenance;
  const handleQuickService = onQuickServiceVehicle || ((vId: string) => handleOpenModal?.());

  const vehicleMap = useMemo(() => new Map((vehicles || []).map((v) => [v.id, v])), [vehicles]);

  const filteredMaint = useMemo(() => {
    return (maintenance || []).filter((m) => {
      const matchesType = typeFilter === 'all' || m.maintenanceType === typeFilter;
      const veh = vehicleMap.get(m.vehicleId);

      const terms = [
        m.recordCode,
        m.maintenanceType,
        m.workshopName,
        m.invoiceNumber || '',
        veh?.plateNumber || '',
      ].join(' ').toLowerCase();

      const matchesSearch = !searchQuery || terms.includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [maintenance, typeFilter, searchQuery, vehicleMap]);

  const totalSpent = useMemo(() => {
    return filteredMaint.reduce((sum, m) => sum + m.cost, 0);
  }, [filteredMaint]);

  return (
    <div className="space-y-4">
      {/* Active Service Alerts Bar */}
      {(alerts || []).length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>سيارات تستوجب الصيانة أو تغيير الزيت فوراً أو قريباً ({(alerts || []).length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(alerts || []).map((al) => (
              <div
                key={al.id}
                className="bg-white p-3 rounded-lg border border-amber-200 flex items-center justify-between shadow-2xs text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{al.vehiclePlate}</div>
                  <div className="text-slate-600 text-[11px]">{al.title}</div>
                  <div className="text-[10px] text-amber-700 font-semibold">{al.metric}</div>
                </div>

                {al.vehicleId && (
                  <button
                    onClick={() => handleQuickService(al.vehicleId)}
                    className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>تسجيل صيانة</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث برقم الصيانة، السيارة، الورشة، الفاتورة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">جميع بنود الصيانة</option>
            <option value="تغيير زيت وفلتر">تغيير زيت وفلتر</option>
            <option value="إطارات وترصيص">إطارات وترصيص</option>
            <option value="تيل فرامل وتيل هواء">تيل فرامل وتيل هواء</option>
            <option value="سيور وفلاتر دورية">سيور وفلاتر دورية</option>
            <option value="عمرة وفحص دوري شامل">عمرة وفحص دوري شامل</option>
          </select>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل صيانة دورية</span>
        </button>
      </div>

      {/* Maintenance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold">
                <th className="p-3 whitespace-nowrap">كود الصيانة</th>
                <th className="p-3 whitespace-nowrap">السيارة</th>
                <th className="p-3 whitespace-nowrap">نوع الصيانة</th>
                <th className="p-3 whitespace-nowrap">التاريخ</th>
                <th className="p-3 whitespace-nowrap">العداد عند الصيانة</th>
                <th className="p-3 whitespace-nowrap">العداد القادم المستهدف</th>
                <th className="p-3 whitespace-nowrap">التكلفة الإجمالية</th>
                <th className="p-3 whitespace-nowrap">ورشة الصيانة / التوكيل</th>
                <th className="p-3 whitespace-nowrap">رقم الفاتورة</th>
                <th className="p-3 whitespace-nowrap">الحالة</th>
                <th className="p-3 whitespace-nowrap text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredMaint.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    لا توجد سجلات صيانة مسجلة.
                  </td>
                </tr>
              ) : (
                filteredMaint.map((item) => {
                  const veh = vehicleMap.get(item.vehicleId);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 whitespace-nowrap font-bold text-slate-900">
                        {item.recordCode}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{veh?.plateNumber || item.vehicleId}</div>
                        <div className="text-[10px] text-slate-400">{veh?.model?.split('(')[0]}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {item.maintenanceType}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600">
                        {item.date}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-slate-800">
                        {item.odometerAtService.toLocaleString()} كم
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono font-bold text-emerald-800">
                        {item.nextDueOdometer.toLocaleString()} كم
                      </td>
                      <td className="p-3 whitespace-nowrap font-bold text-slate-900 text-sm">
                        {item.cost.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">ج.م</span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-700">
                        {item.workshopName}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-slate-500">
                        {item.invoiceNumber || '-'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'مكتملة'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'متأخرة'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit?.(item)}
                            title="تعديل"
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete?.(item.id)}
                            title="حذف"
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

        {/* Footer Summary */}
        <div className="bg-slate-900 text-white p-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
          <span>عدد سجلات الصيانة: {filteredMaint.length}</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">إجمالي مصروفات الصيانة:</span>
            <strong className="text-amber-400 text-sm font-black">{totalSpent.toLocaleString()} ج.م</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
