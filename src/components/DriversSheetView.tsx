import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Edit2,
  Eye,
  FileText,
  HeartPulse,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Driver, Vehicle } from '../types';

interface DriversSheetViewProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onOpenNewDriverModal?: () => void;
  onOpenDriverModal?: () => void;
  onEditDriver: (driver: Driver) => void;
  onDeleteDriver: (driverId: string) => void;
  onDeleteMultipleDrivers?: (driverIds: string[]) => void;
  onClearAllDrivers?: () => void;
  onAddSampleDriver?: () => void;
  canEdit?: boolean;
}

export const DriversSheetView: React.FC<DriversSheetViewProps> = ({
  drivers,
  vehicles,
  onOpenNewDriverModal,
  onOpenDriverModal,
  onEditDriver,
  onDeleteDriver,
  onDeleteMultipleDrivers,
  onClearAllDrivers,
  onAddSampleDriver,
  canEdit = true,
}) => {
  const handleOpenNewDriver = onOpenNewDriverModal || onOpenDriverModal || (() => {});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [degreeFilter, setDegreeFilter] = useState('all');
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [inspectingDriver, setInspectingDriver] = useState<Driver | null>(null);

  const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const today = new Date().toISOString().split('T')[0];

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchesDegree = degreeFilter === 'all' || d.licenseDegree === degreeFilter;
      const veh = d.assignedVehicleId ? vehicleMap.get(d.assignedVehicleId) : undefined;

      const terms = [
        d.name,
        d.code,
        d.phone,
        d.nationalId,
        d.licenseDegree,
        d.licenseNumber || '',
        d.licenseIssuePlace || '',
        d.operatingZone || '',
        d.shift || '',
        d.address || '',
        veh?.plateNumber || '',
        veh?.model || '',
      ].join(' ').toLowerCase();

      const matchesSearch = !searchQuery || terms.includes(searchQuery.toLowerCase());
      return matchesStatus && matchesDegree && matchesSearch;
    });
  }, [drivers, statusFilter, degreeFilter, searchQuery, vehicleMap]);

  // Selection helpers
  const isAllSelected =
    filteredDrivers.length > 0 &&
    filteredDrivers.every((d) => selectedDriverIds.includes(d.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredDrivers.map((d) => d.id));
      setSelectedDriverIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const combined = new Set([...selectedDriverIds, ...filteredDrivers.map((d) => d.id)]);
      setSelectedDriverIds(Array.from(combined));
    }
  };

  const toggleSelectDriver = (id: string) => {
    setSelectedDriverIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (onDeleteMultipleDrivers && selectedDriverIds.length > 0) {
      onDeleteMultipleDrivers(selectedDriverIds);
      setSelectedDriverIds([]);
    }
  };

  // Helper to format clean WhatsApp link
  const getWhatsAppLink = (rawPhone: string) => {
    let clean = rawPhone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '2' + clean;
    }
    return `https://wa.me/${clean}`;
  };

  return (
    <div className="space-y-4 relative" dir="rtl">
      {/* Top Header Banner for Drivers */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                سجل سائقي وكوادر أسطول المصنع
              </h2>
              <span className="text-[11px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 rounded-full font-bold">
                {drivers.length} سائق مسجل
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              إدارة بيانات السائقين الكاملة: الصورة بالكاميرا، درجات الرخص وسريانها، الفحص الطبي، وتعيين الشاحنات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {drivers.length === 0 && onAddSampleDriver && (
            <button
              onClick={onAddSampleDriver}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-indigo-200 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 rounded-xl transition cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>إضافة سائق تجريبي</span>
            </button>
          )}

          <button
            onClick={onOpenNewDriverModal}
            className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-teal-900/40 cursor-pointer whitespace-nowrap border border-teal-400/40 active:scale-95"
            title="إضافة سائق جديد وكتابة كافة تفاصيل بياناته الشخصية والمهنية"
          >
            <UserPlus className="w-4 h-4 text-teal-100" />
            <span>+ إضافة سائق جديد بكامل تفاصيل بياناته</span>
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بالاسم، الكود، الهاتف، الرقم القومي، درجة الرخصة، جهة المرور، العنوان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
          >
            <option value="all">جميع الحالات ({drivers.length})</option>
            <option value="متاح للعمل">متاح للعمل</option>
            <option value="في رحلة">في رحلة</option>
            <option value="إجازة">إجازة</option>
            <option value="غير متاح">غير متاح</option>
          </select>

          <select
            value={degreeFilter}
            onChange={(e) => setDegreeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
          >
            <option value="all">كافة درجات الرخص</option>
            <option value="درجة أولى">درجة أولى (تريلات وثقيل)</option>
            <option value="درجة ثانية">درجة ثانية (حافلات وجامبو)</option>
            <option value="درجة ثالثة">درجة ثالثة (نقل خفيف)</option>
            <option value="معدات ثقيلة">معدات ثقيلة</option>
            <option value="خاصة">رخصة خاصة</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {drivers.length > 0 && onClearAllDrivers && (
            <button
              onClick={onClearAllDrivers}
              title="مسح جميع بيانات السائقين"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح كافة السائقين</span>
            </button>
          )}

          {drivers.length === 0 && onAddSampleDriver && (
            <button
              onClick={onAddSampleDriver}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>إضافة سائق تجريبي</span>
            </button>
          )}

          <button
            onClick={onOpenNewDriverModal}
            className="inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة سائق جديد بكامل بياناته</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedDriverIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">تم تحديد {selectedDriverIds.length} سائق</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف السائقين المحددين ({selectedDriverIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedDriverIds([])}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              title="إلغاء التحديد"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Drivers Table / Empty State */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {drivers.length === 0 ? (
          <div className="py-14 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Users className="w-8 h-8 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">سجل السائقين فارغ حالياً</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                يمكنك الآن تسجيل سائقي الأسطول بكامل بياناتهم (التراخيص، الهوية، الهاتف، جهات الطوارئ، الفحص الطبي، والورديات).
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              {onAddSampleDriver && (
                <button
                  onClick={onAddSampleDriver}
                  className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>إضافة سائق استرشادي</span>
                </button>
              )}
              <button
                onClick={onOpenNewDriverModal}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة أول سائق بكامل البيانات</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      title="تحديد الكل"
                    />
                  </th>
                  <th className="p-3 whitespace-nowrap">كود واسم السائق</th>
                  <th className="p-3 whitespace-nowrap">الاتصال والهاتف</th>
                  <th className="p-3 whitespace-nowrap">الرقم القومي</th>
                  <th className="p-3 whitespace-nowrap">درجة ورقم الرخصة</th>
                  <th className="p-3 whitespace-nowrap">صلاحية الرخصة والمرور</th>
                  <th className="p-3 whitespace-nowrap">السيارة والتشغيل</th>
                  <th className="p-3 whitespace-nowrap">التقييم</th>
                  <th className="p-3 whitespace-nowrap">الحالة</th>
                  <th className="p-3 whitespace-nowrap text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      لا يوجد سائقون مسجلون مطابقون للبحث الحالي.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => {
                    const veh = driver.assignedVehicleId ? vehicleMap.get(driver.assignedVehicleId) : undefined;
                    const expiry = new Date(driver.licenseExpiryDate);
                    const now = new Date(today);
                    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isExpired = diffDays <= 0;
                    const isExpiringSoon = diffDays > 0 && diffDays <= 45;
                    const isSelected = selectedDriverIds.includes(driver.id);

                    return (
                      <tr
                        key={driver.id}
                        className={`transition ${
                          isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDriver(driver.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {driver.photoURL ? (
                              <img
                                src={driver.photoURL}
                                alt={driver.name}
                                className="w-8 h-8 rounded-full object-cover border border-emerald-500/40 shrink-0 shadow-xs"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                                {driver.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div
                                onClick={() => setInspectingDriver(driver)}
                                className="font-bold text-slate-900 text-sm hover:text-emerald-600 transition cursor-pointer flex items-center gap-1.5"
                                title="انقر لعرض الملف الكامل للسائق"
                              >
                                <span>{driver.name}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                  {driver.code}
                                </span>
                                {driver.bloodType && (
                                  <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                                    {driver.bloodType}
                                  </span>
                                )}
                                {driver.shift && (
                                  <span className="text-[10px] text-slate-500">
                                    • {driver.shift}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${driver.phone}`}
                              className="flex items-center gap-1 text-slate-800 hover:text-emerald-600 font-mono font-semibold transition"
                              title="اتصال هاتفي بالسائق"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{driver.phone}</span>
                            </a>
                            <a
                              href={getWhatsAppLink(driver.phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                              title="مراسلة عبر واتساب"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          </div>
                          {driver.emergencyContactPhone && (
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                              <span className="text-slate-400">طوارئ:</span>
                              <span>{driver.emergencyContactPhone}</span>
                            </div>
                          )}
                        </td>

                        <td className="p-3 whitespace-nowrap font-mono text-slate-700 font-semibold">
                          {driver.nationalId}
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <div>
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold inline-block">
                              {driver.licenseDegree}
                            </span>
                            {driver.licenseNumber && (
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                رقم: {driver.licenseNumber}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <div className="font-mono text-slate-800 font-bold">{driver.licenseExpiryDate}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {isExpired ? (
                              <span className="text-rose-600 font-bold text-[10px] flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                منتهية!
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="text-amber-600 font-bold text-[10px] flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                متبقي {diffDays} يوم
                              </span>
                            ) : (
                              <span className="text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                سارية
                              </span>
                            )}
                            {driver.licenseIssuePlace && (
                              <span className="text-[10px] text-slate-400">
                                • {driver.licenseIssuePlace}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          {veh ? (
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1">
                                <Truck className="w-3 h-3 text-slate-400" />
                                <span>{veh.plateNumber}</span>
                              </div>
                              <div className="text-[10px] text-slate-500">{veh.model}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">متاح لجميع الشاحنات</span>
                          )}
                          {driver.operatingZone && (
                            <div className="text-[10px] text-emerald-800 font-medium mt-0.5">
                              {driver.operatingZone}
                            </div>
                          )}
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: driver.rating || 5 }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-current" />
                            ))}
                          </div>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              driver.status === 'متاح للعمل'
                                ? 'bg-emerald-100 text-emerald-800'
                                : driver.status === 'في رحلة'
                                ? 'bg-blue-100 text-blue-800'
                                : driver.status === 'إجازة'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {driver.status}
                          </span>
                        </td>

                        <td className="p-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setInspectingDriver(driver)}
                              title="عرض الملف والبيانات الكاملة"
                              className="px-2 py-1 rounded-md text-indigo-700 hover:bg-indigo-50 border border-indigo-200 transition cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <Eye className="w-3 h-3" />
                              <span>الملف الكامل</span>
                            </button>

                            <button
                              onClick={() => onEditDriver(driver)}
                              title="تعديل بيانات السائق"
                              className="p-1 rounded-md text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => onDeleteDriver(driver.id)}
                              title="حذف السائق"
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
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
        )}
      </div>

      {/* FULL DRIVER DOSSIER MODAL (بطاقة الملف الكامل للسائق) */}
      {inspectingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                {inspectingDriver.photoURL ? (
                  <img
                    src={inspectingDriver.photoURL}
                    alt={inspectingDriver.name}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-lg shrink-0">
                    {inspectingDriver.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{inspectingDriver.name}</h3>
                    <span className="text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded font-bold">
                      {inspectingDriver.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inspectingDriver.status === 'متاح للعمل'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : inspectingDriver.status === 'في رحلة'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {inspectingDriver.status}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: inspectingDriver.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectingDriver(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Section 1: Contact & Personal */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>البيانات الشخصية ووسائل الاتصال</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${inspectingDriver.phone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition cursor-pointer shadow-xs"
                    >
                      <Phone className="w-3 h-3" />
                      <span>اتصال</span>
                    </a>
                    <a
                      href={getWhatsAppLink(inspectingDriver.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-bold text-[11px] transition cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>واتساب</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[11px]">الهاتف المحمول:</span>
                    <span className="font-mono font-bold text-slate-900">{inspectingDriver.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">الرقم القومي (14 رقم):</span>
                    <span className="font-mono font-bold text-slate-900">{inspectingDriver.nationalId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">فصيلة الدم:</span>
                    <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded inline-block">
                      {inspectingDriver.bloodType || 'غير محدد'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">تاريخ الالتحاق:</span>
                    <span className="font-mono text-slate-800">{inspectingDriver.dateOfJoining || '2024-01-01'}</span>
                  </div>
                </div>

                {inspectingDriver.address && (
                  <div className="pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400 block text-[11px]">العنوان ومحل الإقامة:</span>
                    <div className="flex items-center gap-1 text-slate-800 font-medium mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{inspectingDriver.address}</span>
                    </div>
                  </div>
                )}

                {(inspectingDriver.emergencyContactName || inspectingDriver.emergencyContactPhone) && (
                  <div className="pt-2 border-t border-slate-200/60 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/50">
                    <div className="flex items-center gap-1 text-amber-900 font-bold mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>جهة الاتصال في الطوارئ (Emergency):</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-800">
                      <span>{inspectingDriver.emergencyContactName || 'الأسرة'}</span>
                      {inspectingDriver.emergencyContactPhone && (
                        <a
                          href={`tel:${inspectingDriver.emergencyContactPhone}`}
                          className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{inspectingDriver.emergencyContactPhone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Traffic & License */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>بيانات رخصة القيادة والمرور</span>
                  </div>
                  <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded text-xs">
                    {inspectingDriver.licenseDegree}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[11px]">رقم الرخصة:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {inspectingDriver.licenseNumber || 'غير مسجل'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">وحدة المرور الصادرة:</span>
                    <span className="font-semibold text-slate-900">
                      {inspectingDriver.licenseIssuePlace || 'مرور برج العرب'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">تاريخ الإصدار:</span>
                    <span className="font-mono text-slate-800">
                      {inspectingDriver.licenseIssueDate || '2023-01-10'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">تاريخ الانتهاء:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {inspectingDriver.licenseExpiryDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Fleet & Operations */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>التشغيل والأسطول والورديات</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[11px]">الشاحنة المخصصة:</span>
                    {inspectingDriver.assignedVehicleId && vehicleMap.get(inspectingDriver.assignedVehicleId) ? (
                      <span className="font-bold text-slate-900">
                        {vehicleMap.get(inspectingDriver.assignedVehicleId)?.plateNumber} (
                        {vehicleMap.get(inspectingDriver.assignedVehicleId)?.model})
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">متاح لجميع الشاحنات</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">الوردية:</span>
                    <span className="font-semibold text-slate-900">{inspectingDriver.shift || 'وردية صباحية'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">منطقة ومحور التشغيل:</span>
                    <span className="font-semibold text-slate-900">{inspectingDriver.operatingZone || 'كافة المحاور'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">إجمالي الرحلات المنجزة:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {inspectingDriver.totalCompletedTrips || 0} رحلة
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Medical Fitness & Notes */}
              {(inspectingDriver.medicalFitnessNotes || inspectingDriver.notes) && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-950">
                    <HeartPulse className="w-4 h-4 text-emerald-700" />
                    <span>الفحص الطبي والملاحظات المهنية</span>
                  </div>
                  {inspectingDriver.medicalFitnessNotes && (
                    <p className="text-slate-800 leading-relaxed bg-white p-2.5 rounded-lg border border-emerald-200/80">
                      {inspectingDriver.medicalFitnessNotes}
                    </p>
                  )}
                  {inspectingDriver.notes && (
                    <p className="text-slate-600 leading-relaxed italic">
                      ملاحظات: {inspectingDriver.notes}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  const driverToEdit = inspectingDriver;
                  setInspectingDriver(null);
                  onEditDriver(driverToEdit);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>تعديل بيانات السائق</span>
              </button>

              <button
                onClick={() => setInspectingDriver(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition cursor-pointer text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick Action Button for Adding Driver */}
      <div className="fixed bottom-6 left-6 z-30 print:hidden">
        <button
          onClick={onOpenNewDriverModal}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white px-5 py-3.5 rounded-full shadow-2xl shadow-teal-900/50 border border-teal-400/40 font-bold text-xs cursor-pointer transition active:scale-95 group"
          title="إضافة سائق جديد وتسجيل تفاصيل بياناته"
        >
          <UserPlus className="w-5 h-5 text-teal-100 group-hover:scale-110 transition" />
          <span className="font-extrabold tracking-wide">إضافة سائق جديد</span>
        </button>
      </div>
    </div>
  );
};
