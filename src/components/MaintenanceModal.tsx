import { AlertTriangle, CheckCircle2, Wrench, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { MaintenanceRecord, MaintenanceType, Vehicle } from '../types';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    record: MaintenanceRecord,
    updateVehicleTarget?: { vehicleId: string; nextOilKm: number; currentKm: number }
  ) => void;
  editingMaint?: MaintenanceRecord | null;
  vehicles: Vehicle[];
  presetVehicleId?: string | null;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMaint,
  vehicles,
  presetVehicleId,
}) => {
  const [recordCode, setRecordCode] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('تغيير زيت وفلتر');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometerAtService, setOdometerAtService] = useState<number>(0);
  const [nextDueOdometer, setNextDueOdometer] = useState<number>(0);
  const [cost, setCost] = useState<number>(1200);
  const [workshopName, setWorkshopName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [status, setStatus] = useState<MaintenanceRecord['status']>('مكتملة');
  const [notes, setNotes] = useState('');
  const [autoUpdateVehicle, setAutoUpdateVehicle] = useState(true);

  useEffect(() => {
    if (editingMaint) {
      setRecordCode(editingMaint.recordCode);
      setVehicleId(editingMaint.vehicleId);
      setMaintenanceType(editingMaint.maintenanceType);
      setDate(editingMaint.date);
      setOdometerAtService(editingMaint.odometerAtService);
      setNextDueOdometer(editingMaint.nextDueOdometer);
      setCost(editingMaint.cost);
      setWorkshopName(editingMaint.workshopName);
      setInvoiceNumber(editingMaint.invoiceNumber || '');
      setStatus(editingMaint.status);
      setNotes(editingMaint.notes || '');
    } else {
      const code = `M-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(100 + Math.random() * 900)}`;
      setRecordCode(code);
      setDate(new Date().toISOString().split('T')[0]);
      setMaintenanceType('تغيير زيت وفلتر');
      setCost(1400);
      setWorkshopName('مركز خدمة شل وقطع الغيار المعتمد');
      setInvoiceNumber(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
      setStatus('مكتملة');
      setNotes('صيانة دورية وقائية منتظمة');
      setAutoUpdateVehicle(true);

      const targetVeh = presetVehicleId
        ? vehicles.find((v) => v.id === presetVehicleId)
        : vehicles[0];

      if (targetVeh) {
        setVehicleId(targetVeh.id);
        setOdometerAtService(targetVeh.currentOdometer);
        setNextDueOdometer(targetVeh.currentOdometer + (targetVeh.oilChangeIntervalKm || 5000));
      }
    }
  }, [editingMaint, isOpen, presetVehicleId, vehicles]);

  const handleVehicleChange = (vId: string) => {
    setVehicleId(vId);
    const targetVeh = vehicles.find((v) => v.id === vId);
    if (targetVeh && !editingMaint) {
      setOdometerAtService(targetVeh.currentOdometer);
      setNextDueOdometer(targetVeh.currentOdometer + (targetVeh.oilChangeIntervalKm || 5000));
    }
  };

  const handleMaintenanceTypeChange = (type: MaintenanceType) => {
    setMaintenanceType(type);
    const targetVeh = vehicles.find((v) => v.id === vehicleId);
    const current = odometerAtService || (targetVeh?.currentOdometer ?? 50000);

    if (type === 'تغيير زيت وفلتر') {
      const interval = targetVeh?.oilChangeIntervalKm || 5000;
      setNextDueOdometer(current + interval);
      setCost(1400);
    } else if (type === 'إطارات وترصيص') {
      setNextDueOdometer(current + 40000);
      setCost(4500);
    } else if (type === 'تيل فرامل وتيل هواء') {
      setNextDueOdometer(current + 25000);
      setCost(2800);
    } else if (type === 'سيور وفلاتر دورية') {
      setNextDueOdometer(current + 20000);
      setCost(1800);
    } else if (type === 'عمرة وفحص دوري شامل') {
      setNextDueOdometer(current + 30000);
      setCost(6500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const record: MaintenanceRecord = {
      id: editingMaint ? editingMaint.id : `maint-${Date.now()}`,
      recordCode,
      vehicleId,
      maintenanceType,
      date,
      odometerAtService,
      nextDueOdometer,
      cost,
      workshopName,
      invoiceNumber,
      status,
      notes,
    };

    const updateVehicleTarget =
      autoUpdateVehicle && status === 'مكتملة' && maintenanceType === 'تغيير زيت وفلتر'
        ? {
            vehicleId,
            nextOilKm: nextDueOdometer,
            currentKm: odometerAtService,
          }
        : undefined;

    onSave(record, updateVehicleTarget);
    onClose();
  };

  if (!isOpen) return null;

  const currentVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingMaint ? 'تعديل سجل صيانة دورية' : 'تسجيل صيانة دورية جديدة للسيارة'}
              </h3>
              <p className="text-xs text-slate-500">
                تحديث عدادات الصيانة والتنبيهات وإضافة التكلفة لمصروفات المصنع
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
          {/* Row 1: Vehicle & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">السيارة</label>
              <select
                required
                value={vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} - {v.model}
                  </option>
                ))}
              </select>
              {currentVehicle && (
                <div className="text-[11px] text-slate-500 mt-1">
                  العداد الحالي: <strong className="text-slate-800">{currentVehicle.currentOdometer.toLocaleString()}</strong> كم
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">كود الصيانة والتاريخ</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={recordCode}
                  onChange={(e) => setRecordCode(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Maintenance Type */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">نوع وبند الصيانة</label>
            <select
              required
              value={maintenanceType}
              onChange={(e) => handleMaintenanceTypeChange(e.target.value as MaintenanceType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="تغيير زيت وفلتر">تغيير زيت وفلتر (محرك / فتيس)</option>
              <option value="إطارات وترصيص">استبدال إطارات وترصيص وضبط زوايا</option>
              <option value="تيل فرامل وتيل هواء">تيل فرامل وطنابير ودورة هواء</option>
              <option value="سيور وفلاتر دورية">سيور ماكينة وفلاتر جاز وهواء</option>
              <option value="صيانة كهرباء وبطارية">صيانة كهرباء ودينامو وبطارية</option>
              <option value="عمرة وفحص دوري شامل">عمرة وفحص دوري شامل للمحرك</option>
              <option value="تجديد فحص ورخصة">تجديد فحص فني وتراخيص</option>
            </select>
          </div>

          {/* Row 3: Odometer readings */}
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950">متابعة العدادات والهدف القادم</span>
              <span className="text-[10px] text-amber-800">لتحديث تنبيهات الصيانة تلقائياً</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">العداد عند الصيانة (كم)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={odometerAtService}
                  onChange={(e) => setOdometerAtService(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">العداد القادم المستهدف (كم)</label>
                <input
                  type="number"
                  min={odometerAtService}
                  required
                  value={nextDueOdometer}
                  onChange={(e) => setNextDueOdometer(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-emerald-800"
                />
              </div>
            </div>

            {maintenanceType === 'تغيير زيت وفلتر' && (
              <label className="flex items-center gap-2 text-[11px] text-amber-900 font-semibold cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={autoUpdateVehicle}
                  onChange={(e) => setAutoUpdateVehicle(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>تحديث عداد تغيير الزيت القادم للسيارة فوراً وإلغاء أي تنبيه صيانة متأخر لها</span>
              </label>
            )}
          </div>

          {/* Row 4: Cost, Workshop, Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">التكلفة (ج.م)</label>
              <input
                type="number"
                min={0}
                required
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">ورشة الصيانة / التوكيل</label>
              <input
                type="text"
                required
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                placeholder="مثال: شل سنتر، ورشة العامرية..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">رقم الفاتورة (اختياري)</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Notes & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">الملاحظات وقطع الغيار المستبدلة</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تم تركيب زيت 15W-40 وفلتر أصلي..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">الحالة</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MaintenanceRecord['status'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold cursor-pointer"
              >
                <option value="مكتملة">مكتملة</option>
                <option value="مجدولة">مجدولة</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
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
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-xs cursor-pointer"
            >
              {editingMaint ? 'حفظ التعديلات' : 'تسجيل الصيانة في الشيت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
