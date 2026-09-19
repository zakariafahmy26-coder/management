import { Building2, MapPin, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { LocationCategory, LocationPlace, MainRegion } from '../types';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loc: LocationPlace) => void;
  editingLocation?: LocationPlace | null;
  existingLocations: LocationPlace[];
  availableRegions: string[];
}

const CATEGORIES: LocationCategory[] = [
  'مصنع',
  'مستودع ومخزن',
  'ميناء بحري',
  'فرع وتوزيع',
  'عميل رئيسي',
  'أخرى',
];

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLocation,
  existingLocations,
  availableRegions,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState<string>('الإسكندرية');
  const [category, setCategory] = useState<LocationCategory>('فرع وتوزيع');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setErrorMessage('');
    if (editingLocation) {
      setName(editingLocation.name);
      setCode(editingLocation.code);
      setRegion(editingLocation.region);
      setCategory(editingLocation.category);
      setAddress(editingLocation.address || '');
      setNotes(editingLocation.notes || '');
      const initialLat =
        editingLocation.latitude ?? (editingLocation.coordinates ? editingLocation.coordinates[0] : '');
      const initialLng =
        editingLocation.longitude ?? (editingLocation.coordinates ? editingLocation.coordinates[1] : '');
      setLat(initialLat !== undefined && initialLat !== '' ? String(initialLat) : '');
      setLng(initialLng !== undefined && initialLng !== '' ? String(initialLng) : '');
    } else {
      const reg = availableRegions[0] || 'الإسكندرية';
      setRegion(reg);
      const prefix = reg.includes('ساحل') ? 'NST' : reg.includes('بحيرة') ? 'BHR' : 'ALX';
      const count = existingLocations.filter((l) => l.region === reg).length + 1;
      const genCode = `LOC-${prefix}-${count < 10 ? '0' + count : count}`;
      setCode(genCode);
      setName('');
      setCategory('فرع وتوزيع');
      setAddress('');
      setNotes('');
      // Default to Alexandria coords
      setLat('31.2000');
      setLng('29.9000');
    }
  }, [editingLocation, isOpen, availableRegions, existingLocations]);

  // When region changes in create mode, auto suggest code
  const handleRegionChange = (newReg: string) => {
    setRegion(newReg);
    if (!editingLocation) {
      const prefix = newReg.includes('ساحل') ? 'NST' : newReg.includes('بحيرة') ? 'BHR' : 'ALX';
      const count = existingLocations.filter((l) => l.region === newReg).length + 1;
      setCode(`LOC-${prefix}-${count < 10 ? '0' + count : count}`);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('يرجى كتابة اسم المكان أو المنشأة');
      return;
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const hasValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng);

    const newLoc: LocationPlace = {
      id: editingLocation ? editingLocation.id : `loc-${Date.now()}`,
      name: name.trim(),
      code: code.trim() || `LOC-${Date.now().toString().slice(-4)}`,
      region,
      category,
      address: address.trim(),
      notes: notes.trim(),
      latitude: hasValidCoords ? parsedLat : undefined,
      longitude: hasValidCoords ? parsedLng : undefined,
      coordinates: hasValidCoords ? [parsedLat, parsedLng] : undefined,
    };

    onSave(newLoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {editingLocation ? 'تعديل بيانات المكان' : 'إضافة مكان جديد لقاعدة البيانات'}
              </h3>
              <p className="text-xs text-slate-300">
                ربط المكان بالمنطقة لتسهيل اختياره في خطوط السير
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Region Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المنطقة التابع لها <span className="text-rose-500">*</span>
              </label>
              <select
                value={region}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden cursor-pointer"
              >
                {availableRegions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كود المكان
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="LOC-ALX-01"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Place Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم المكان / النقطة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: سموحة (نقطة التوزيع) أو ميناء الإسكندرية أو مارينا"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تصنيف المكان
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer text-center ${
                    category === cat
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              العنوان / تفاصيل الموقع
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="مثال: المنطقة الصناعية الثالثة، أمام مدخل البوابة الشرقية"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Geographic Coordinates for Leaflet Map */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>الإحداثيات الجغرافية (دبابيس الخريطة التفاعلية)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">GPS (WGS84)</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  خط العرض (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="31.2000"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  خط الطول (Longitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="29.9000"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
              تُستخدم هذه الإحداثيات لعرض الدبوس التفاعلي للموقع بدقة على خريطة Leaflet.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات إضافية
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مواعيد الاستلام، اسم مسؤول التنسيق، مواصفات مدخل الشاحنات..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4" />
              <span>{editingLocation ? 'حفظ التعديلات' : 'إضافة المكان'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
