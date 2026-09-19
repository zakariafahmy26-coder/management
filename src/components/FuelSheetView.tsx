import React, { useState } from 'react';
import {
  DollarSign,
  Droplet,
  Fuel,
  Plus,
  Search,
  Trash2,
  Calendar,
  Car,
  User,
  Image as ImageIcon,
  CheckCircle2,
  FileSpreadsheet,
  Camera,
  Zap,
  Sparkles,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Driver, FuelRecord, Vehicle } from '../types';
import { captureAndCompressPhoto } from '../utils/platform';
import { formatBytes } from '../utils/imageCompression';
import { aiService } from '../services/aiService';

interface FuelSheetViewProps {
  fuelRecords: FuelRecord[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onAddFuel?: (record: FuelRecord) => void;
  onOpenFuelModal?: () => void;
  onEditFuel?: (record: FuelRecord) => void;
  onDeleteFuel: (id: string) => void;
  canEdit?: boolean;
}

export const FuelSheetView: React.FC<FuelSheetViewProps> = ({
  fuelRecords,
  vehicles,
  drivers,
  onAddFuel,
  onOpenFuelModal,
  onEditFuel,
  onDeleteFuel,
  canEdit = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // New fuel form state
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('60');
  const [price, setPrice] = useState('13.5');
  const [odometer, setOdometer] = useState('0');
  const [station, setStation] = useState('وطنية');
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptMetrics, setReceiptMetrics] = useState<{
    originalSize: number;
    compressedSize: number;
    savedPercentage: number;
  } | null>(null);

  const handleCaptureReceipt = async () => {
    const result = await captureAndCompressPhoto({ maxWidth: 1280, maxHeight: 1280, quality: 0.72 });
    if (result) {
      setReceiptImage(result.dataUrl);
      setReceiptMetrics({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savedPercentage: result.savedPercentage,
      });
    }
  };

  const [isScanningAI, setIsScanningAI] = useState(false);

  const handleScanReceiptAI = async (imgUrl?: string) => {
    const targetImage = imgUrl || receiptImage;
    if (!targetImage || isScanningAI) return;
    setIsScanningAI(true);
    try {
      const res = await aiService.scanReceipt(targetImage);
      if (res?.data) {
        if (res.data.stationOrWorkshop) setStation(res.data.stationOrWorkshop);
        if (res.data.liters) setQuantity(String(res.data.liters));
        if (res.data.pricePerLiter) setPrice(String(res.data.pricePerLiter));
        if (res.data.date) setDate(res.data.date);
        if (res.data.notes) setNotes(res.data.notes);
        if (res.data.vehiclePlate) {
          const matched = vehicles.find((v) =>
            v.plateNumber.includes(res.data.vehiclePlate!.trim())
          );
          if (matched) {
            setVehicleId(matched.id);
            if (matched.assignedDriverId) setDriverId(matched.assignedDriverId);
          }
        }
      }
    } catch (e) {
      console.error('AI Scan error:', e);
    } finally {
      setIsScanningAI(false);
    }
  };

  // Calculations
  const totalLiters = fuelRecords.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const totalCost = fuelRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);
  const avgPrice = totalLiters > 0 ? (totalCost / totalLiters).toFixed(2) : '0';

  const filteredRecords = fuelRecords.filter((rec) => {
    const veh = vehicles.find((v) => v.id === rec.vehicleId);
    const drv = drivers.find((d) => d.id === rec.driverId);
    const matchesSearch =
      !searchTerm ||
      (veh?.plateNumber || '').includes(searchTerm) ||
      (veh?.model || '').includes(searchTerm) ||
      (drv?.name || '').includes(searchTerm) ||
      rec.station.includes(searchTerm) ||
      (rec.notes || '').includes(searchTerm);

    const matchesVeh = selectedVehicle === 'all' || rec.vehicleId === selectedVehicle;
    return matchesSearch && matchesVeh;
  });

  const handleExportExcel = () => {
    const exportData = filteredRecords.map((r) => {
      const veh = vehicles.find((v) => v.id === r.vehicleId);
      const drv = drivers.find((d) => d.id === r.driverId);
      return {
        التاريخ: r.date,
        المركبة: veh ? `${veh.model} (${veh.plateNumber})` : r.vehicleId,
        السائق: drv ? drv.name : '-',
        المحطة: r.station,
        'الكمية (لتر)': r.quantity,
        'سعر اللتر': r.price,
        'التكلفة الإجمالية (جنيه)': r.totalCost,
        'قراءة العداد': r.odometer || '-',
        ملاحظات: r.notes || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجلات الوقود');
    XLSX.writeFile(wb, `Fuel_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || 0;
    const odo = parseFloat(odometer) || 0;

    const newRec: FuelRecord = {
      id: `fuel-${Date.now()}`,
      date,
      vehicleId,
      driverId: driverId || undefined,
      quantity: qty,
      price: prc,
      totalCost: qty * prc,
      odometer: odo,
      station,
      receiptImage: receiptImage || undefined,
      notes,
      createdAt: new Date().toISOString(),
      syncStatus: 'synced',
    };

    onAddFuel(newRec);
    setIsModalOpen(false);
    setNotes('');
    setReceiptImage(null);
    setReceiptMetrics(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Fuel className="w-7 h-7 text-emerald-400" />
            <span>إدارة استهلاك وتموين الوقود</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            سجل كميات وتكاليف الوقود ومحطات التموين وفواتير أسطول المصنع
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل تموين جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>إجمالي الوقود المستهلك</span>
            <Droplet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {totalLiters.toLocaleString()} <span className="text-xs text-emerald-400">لتر</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {fuelRecords.length} عملية تموين مسجلة
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>إجمالي تكاليف الوقود</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {totalCost.toLocaleString()} <span className="text-xs text-slate-400">جنيه</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">متوسط سعر اللتر: {avgPrice} جنيه</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>المركبات النشطة في التموين</span>
            <Car className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white">{vehicles.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">أسطول سيارات النقل والتوزيع</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالسيارة، السائق، المحطة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">تصفية بالمركبة:</label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">جميع المركبات ({vehicles.length})</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.code} - {v.model} ({v.plateNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">المركبة</th>
                <th className="p-3.5">السائق</th>
                <th className="p-3.5">محطة التموين</th>
                <th className="p-3.5">الكمية (لتر)</th>
                <th className="p-3.5">سعر اللتر</th>
                <th className="p-3.5">التكلفة الإجمالية</th>
                <th className="p-3.5">قراءة العداد</th>
                <th className="p-3.5 text-center">الإيصال</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    لا توجد سجلات وقود مطابقة
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const veh = vehicles.find((v) => v.id === rec.vehicleId);
                  const drv = drivers.find((d) => d.id === rec.driverId);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-semibold text-white whitespace-nowrap">{rec.date}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-white">{veh?.model || 'سيارة المصنع'}</div>
                        <div className="text-[11px] text-slate-400">
                          {veh?.plateNumber} | {veh?.code}
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {drv ? (
                          <div>
                            <div className="font-semibold text-slate-200">{drv.name}</div>
                            <div className="text-[10px] text-slate-400">{drv.code}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-medium text-slate-200">{rec.station}</td>
                      <td className="p-3.5 whitespace-nowrap font-black text-emerald-400">
                        {rec.quantity} لتر
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-slate-300">{rec.price} ج.م</td>
                      <td className="p-3.5 whitespace-nowrap font-black text-white">
                        {rec.totalCost.toLocaleString()} ج.م
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-slate-400">
                        {rec.odometer ? `${rec.odometer.toLocaleString()} كم` : '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        {rec.receiptImage ? (
                          <button
                            onClick={() => setSelectedReceipt(rec.receiptImage || null)}
                            className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition"
                            title="عرض إيصال المحطة"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                              onDeleteFuel(rec.id);
                            }
                          }}
                          className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Fuel Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Fuel className="w-5 h-5 text-emerald-400" />
                <span>تسجيل عملية تموين وقود</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">المركبة *</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.code} - {v.model} ({v.plateNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">السائق</label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">بدون سائق محدد</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">محطة التموين *</label>
                  <input
                    type="text"
                    required
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    placeholder="محطة وطنية، مصر للبترول..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الكمية (لتر) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">سعر اللتر *</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">قراءة العداد</label>
                  <input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/70 border border-slate-700 rounded-xl flex items-center justify-between">
                <span className="text-slate-400">التكلفة الإجمالية:</span>
                <span className="text-base font-black text-emerald-400">
                  {(parseFloat(quantity || '0') * parseFloat(price || '0')).toLocaleString()} جنيه
                </span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  صورة إيصال / فاتورة المحطة (اختياري)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCaptureReceipt}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>{receiptImage ? 'تغيير صورة الإيصال' : 'التقاط أو إرفاق الإيصال'}</span>
                  </button>
                  {receiptImage && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      تم إرفاق الإيصال
                    </span>
                  )}
                </div>
                {receiptImage && (
                  <div className="mt-2 space-y-1.5">
                    <div className="relative inline-block">
                      <img
                        src={receiptImage}
                        alt="إيصال الوقود"
                        onClick={() => setSelectedReceipt(receiptImage)}
                        className="h-20 w-32 object-cover rounded-xl border border-emerald-500 cursor-pointer shadow"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptImage(null);
                          setReceiptMetrics(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold"
                      >
                        ×
                      </button>
                    </div>
                    {receiptMetrics && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          تم الضغط تلقائياً: <strong>{formatBytes(receiptMetrics.compressedSize)}</strong> (وفر {receiptMetrics.savedPercentage}% لسرعة الرفع)
                        </span>
                      </div>
                    )}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleScanReceiptAI()}
                        disabled={isScanningAI}
                        className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow cursor-pointer disabled:opacity-50"
                      >
                        {isScanningAI ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري القراءة بالذكاء الاصطناعي...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>استخراج وتعبئة الحقول آلياً بالذكاء الاصطناعي (AI OCR)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">ملاحظات</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  حفظ السجل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Image Viewer Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">إيصال محطة الوقود</span>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <img
              src={selectedReceipt}
              alt="Receipt"
              className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
