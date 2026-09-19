import { Car, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Driver, FuelType, Vehicle, VehicleStatus } from '../types';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: Vehicle) => void;
  editingVehicle?: Vehicle | null;
  drivers: Driver[];
  onOpenNewDriverModal?: () => void;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingVehicle,
  drivers,
  onOpenNewDriverModal,
}) => {
  const [code, setCode] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(2022);
  const [fuelType, setFuelType] = useState<FuelType>('سولار');
  const [tankCapacity, setTankCapacity] = useState<number>(100);
  const [avgConsumptionPer100Km, setAvgConsumptionPer100Km] = useState<number>(14);
  const [currentOdometer, setCurrentOdometer] = useState<number>(50000);
  const [assignedDriverId, setAssignedDriverId] = useState<string>('');
  const [status, setStatus] = useState<VehicleStatus>('جاهزة للعمل');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('2027-10-15');
  const [oilChangeIntervalKm, setOilChangeIntervalKm] = useState<number>(5000);
  const [nextOilChangeKm, setNextOilChangeKm] = useState<number>(55000);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingVehicle) {
      setCode(editingVehicle.code);
      setPlateNumber(editingVehicle.plateNumber);
      setModel(editingVehicle.model);
      setYear(editingVehicle.year);
      setFuelType(editingVehicle.fuelType);
      setTankCapacity(editingVehicle.tankCapacity);
      setAvgConsumptionPer100Km(editingVehicle.avgConsumptionPer100Km);
      setCurrentOdometer(editingVehicle.currentOdometer);
      setAssignedDriverId(editingVehicle.assignedDriverId || '');
      setStatus(editingVehicle.status);
      setLicenseExpiryDate(editingVehicle.licenseExpiryDate);
      setOilChangeIntervalKm(editingVehicle.oilChangeIntervalKm);
      setNextOilChangeKm(editingVehicle.nextOilChangeKm);
      setNotes(editingVehicle.notes || '');
    } else {
      setCode(`V-0${Math.floor(7 + Math.random() * 90)}`);
      setPlateNumber('س م ق ١٢٤٥');
      setModel('شيفروليه جامبو 7000 شاحنة نقل');
      setYear(2022);
      setFuelType('سولار');
      setTankCapacity(120);
      setAvgConsumptionPer100Km(16);
      setCurrentOdometer(60000);
      setAssignedDriverId(drivers[0]?.id || '');
      setStatus('جاهزة للعمل');
      setLicenseExpiryDate('2027-08-20');
      setOilChangeIntervalKm(5000);
      setNextOilChangeKm(65000);
      setNotes('حالة المركبة ممتازة');
    }
  }, [editingVehicle, isOpen, drivers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const veh: Vehicle = {
      id: editingVehicle ? editingVehicle.id : `veh-${Date.now()}`,
      code,
      plateNumber,
      model,
      year,
      fuelType,
      tankCapacity,
      avgConsumptionPer100Km,
      currentOdometer,
      assignedDriverId: assignedDriverId || undefined,
      status,
      licenseExpiryDate,
      oilChangeIntervalKm,
      lastOilChangeKm: nextOilChangeKm - oilChangeIntervalKm,
      nextOilChangeKm,
      lastComprehensiveCheckDate: '2026-03-01',
      nextComprehensiveCheckDate: '2026-11-01',
      notes,
    };

    onSave(veh);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingVehicle ? 'تعديل بيانات سيارة في الأسطول' : 'إضافة سيارة جديدة لأسطول المصنع'}
              </h3>
              <p className="text-xs text-slate-500">
                تسجيل البيانات الدورية للسيارة ومتابعة العداد ونوع الوقود
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">كود السيارة</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">رقم اللوحة (حروف وأرقام)</label>
              <input
                type="text"
                required
                placeholder="مثال: س ف ر ٨٩٢٣"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">النوع والموديل</label>
              <input
                type="text"
                required
                placeholder="مثال: شيفروليه جامبو 7000 / إيسوزو ديماكس مبرد"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">سنة الصنع</label>
              <input
                type="number"
                min={2000}
                max={2030}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">نوع الوقود</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as FuelType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold cursor-pointer"
              >
                <option value="سولار">سولار (ديزل)</option>
                <option value="بنزين 92">بنزين 92</option>
                <option value="بنزين 95">بنزين 95</option>
                <option value="غاز طبيعي">غاز طبيعي</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">سعة الخزان (لتر)</label>
              <input
                type="number"
                min={20}
                value={tankCapacity}
                onChange={(e) => setTankCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">الاستهلاك (لتر/100كم)</label>
              <input
                type="number"
                step="0.5"
                min={5}
                value={avgConsumptionPer100Km}
                onChange={(e) => setAvgConsumptionPer100Km(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">قراءة العداد الحالي (كم)</label>
              <input
                type="number"
                min={0}
                value={currentOdometer}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentOdometer(val);
                  setNextOilChangeKm(val + oilChangeIntervalKm);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">دورة تغيير الزيت (كم)</label>
              <input
                type="number"
                step={1000}
                value={oilChangeIntervalKm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setOilChangeIntervalKm(val);
                  setNextOilChangeKm(currentOdometer + val);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">عداد الزيت القادم (كم)</label>
              <input
                type="number"
                value={nextOilChangeKm}
                onChange={(e) => setNextOilChangeKm(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-emerald-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-semibold">السائق الافتراضي</label>
                {onOpenNewDriverModal && (
                  <button
                    type="button"
                    onClick={onOpenNewDriverModal}
                    className="text-[11px] text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ إضافة سائق</span>
                  </button>
                )}
              </div>
              <select
                value={assignedDriverId}
                onChange={(e) => setAssignedDriverId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 cursor-pointer"
              >
                <option value="">غير مخصص</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">انتهاء رخصة التسيير</label>
              <input
                type="date"
                value={licenseExpiryDate}
                onChange={(e) => setLicenseExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">الحالة التشغيلية</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold cursor-pointer"
              >
                <option value="جاهزة للعمل">جاهزة للعمل</option>
                <option value="في خط سير">في خط سير</option>
                <option value="في الصيانة">في الصيانة</option>
                <option value="خارج الخدمة">خارج الخدمة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">ملاحظات إضافية (اختياري)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="سجل أي تفاصيل عن السيارة..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold transition shadow-xs cursor-pointer"
            >
              {editingVehicle ? 'حفظ التعديلات' : 'إضافة السيارة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
