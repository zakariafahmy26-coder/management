import {
  CheckCircle2,
  Edit2,
  Filter,
  Fuel,
  MapPin,
  Navigation,
  PenTool,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Driver, Region, TripRoute, Vehicle } from '../types';
import { TripMapView } from './TripMapView';

interface TripsSheetViewProps {
  trips: TripRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onOpenNewTripModal?: () => void;
  onOpenTripModal?: () => void;
  onEditTrip: (trip: TripRoute) => void;
  onDeleteTrip: (tripId: string) => void;
  onCompleteTrip?: (tripId: string) => void;
  onDeleteMultipleTrips?: (tripIds: string[]) => void;
  onClearAllTrips?: () => void;
  onAddSampleTrip?: () => void;
  onOpenDriverMode?: () => void;
  canEdit?: boolean;
}

export const TripsSheetView: React.FC<TripsSheetViewProps> = ({
  trips,
  vehicles,
  drivers,
  onOpenNewTripModal,
  onOpenTripModal,
  onEditTrip,
  onDeleteTrip,
  onCompleteTrip = () => {},
  onDeleteMultipleTrips,
  onClearAllTrips,
  onAddSampleTrip,
  onOpenDriverMode,
  canEdit = true,
}) => {
  const handleOpenNewTrip = onOpenNewTripModal || onOpenTripModal || (() => {});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(() => trips[0]?.id || null);
  const [showMap, setShowMap] = useState<boolean>(true);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);

  const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const driverMap = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const matchesRegion = selectedRegion === 'all' || trip.region === selectedRegion;
      const matchesStatus = selectedStatus === 'all' || trip.status === selectedStatus;

      const v = vehicleMap.get(trip.vehicleId);
      const d = driverMap.get(trip.driverId);

      const searchTerms = [
        trip.tripCode,
        trip.routeName,
        trip.startLocation || '',
        trip.destination || '',
        trip.region,
        v?.plateNumber || '',
        d?.name || '',
        trip.cargoType || '',
      ].join(' ').toLowerCase();

      const matchesSearch = !searchQuery || searchTerms.includes(searchQuery.toLowerCase());

      return matchesRegion && matchesStatus && matchesSearch;
    });
  }, [trips, selectedRegion, selectedStatus, searchQuery, vehicleMap, driverMap]);

  // Selection helpers
  const isAllSelected =
    filteredTrips.length > 0 &&
    filteredTrips.every((t) => selectedTripIds.includes(t.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredTrips.map((t) => t.id));
      setSelectedTripIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const combined = new Set([...selectedTripIds, ...filteredTrips.map((t) => t.id)]);
      setSelectedTripIds(Array.from(combined));
    }
  };

  const toggleSelectTrip = (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setSelectedTripIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (onDeleteMultipleTrips && selectedTripIds.length > 0) {
      onDeleteMultipleTrips(selectedTripIds);
      setSelectedTripIds([]);
    }
  };

  // Selected trip for map view
  const selectedTrip = useMemo(() => {
    if (!selectedTripId) return filteredTrips[0] || trips[0] || null;
    return trips.find((t) => t.id === selectedTripId) || filteredTrips[0] || trips[0] || null;
  }, [trips, filteredTrips, selectedTripId]);

  // Calculations for filtered rows
  const stats = useMemo(() => {
    let distance = 0;
    let fuelLiters = 0;
    let fuelCost = 0;
    let tolls = 0;
    let totalCost = 0;

    filteredTrips.forEach((t) => {
      distance += t.distanceKm;
      fuelLiters += t.fuelLiters;
      fuelCost += t.fuelTotalCost;
      tolls += (t.tollTaxes || 0) + (t.otherExpenses || 0);
      totalCost += t.tripCostTotal;
    });

    return {
      count: filteredTrips.length,
      distance,
      fuelLiters,
      fuelCost,
      tolls,
      totalCost,
      avgCostPerKm: distance > 0 ? totalCost / distance : 0,
    };
  }, [filteredTrips]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Control bar: Search, filters, map toggle, and action buttons */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بكود الرحلة، المسار، السائق، رقم اللوحة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition font-medium"
            />
          </div>

          {/* Region Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">جميع القطاعات الجغرافية</option>
              <option value="الإسكندرية">قطاع الإسكندرية والمصنع</option>
              <option value="الساحل الشمالي">قطاع الساحل الشمالي</option>
              <option value="البحيرة">قطاع محافظة البحيرة</option>
              <option value="خط مشترك (إسكندرية - بحيرة)">خط مشترك (إسكندرية - بحيرة)</option>
              <option value="خط مشترك (إسكندرية - الساحل)">خط مشترك (إسكندرية - الساحل)</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
          >
            <option value="all">جميع الحالات ({trips.length})</option>
            <option value="مكتملة">مكتملة</option>
            <option value="جارية حالياً">جارية حالياً</option>
            <option value="مجدولة">مجدولة</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Map View Toggle Button */}
          {trips.length > 0 && (
            <button
              onClick={() => setShowMap(!showMap)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                showMap
                  ? 'bg-slate-900 text-emerald-400 border-slate-800 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-500" />
              <span>{showMap ? 'إخفاء الخريطة' : 'عرض الخريطة'}</span>
            </button>
          )}

          {/* Clear All Trips button */}
          {trips.length > 0 && onClearAllTrips && (
            <button
              onClick={onClearAllTrips}
              title="مسح جميع سجلات الرحلات"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح كافة الرحلات</span>
            </button>
          )}

          {/* Add Sample Trip button (when empty) */}
          {trips.length === 0 && onAddSampleTrip && (
            <button
              onClick={onAddSampleTrip}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>إضافة رحلة تجريبية</span>
            </button>
          )}

          {/* Add Trip button */}
          <button
            onClick={handleOpenNewTrip}
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل رحلة جديدة</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (when trips are selected) */}
      {selectedTripIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">تم تحديد {selectedTripIds.length} رحلة</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف الرحلات المحددة ({selectedTripIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedTripIds([])}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              title="إلغاء التحديد"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Embedded Leaflet Map for Selected Trip */}
      {showMap && selectedTrip && trips.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="flex items-center gap-1 font-bold text-slate-900">
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span>مسار الرحلة المحددة على خريطة Leaflet:</span>
              </span>
              <span className="bg-slate-900 text-white font-mono px-2 py-0.5 rounded-md text-[11px] font-bold">
                {selectedTrip.tripCode}
              </span>
              <span className="text-slate-500 hidden sm:inline">
                ({selectedTrip.routeName})
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>انقر على أي صف في جدول الرحلات بالأسفل لتحديث مسار الخريطة فوراً</span>
            </div>
          </div>

          <TripMapView
            trip={selectedTrip}
            vehicle={vehicleMap.get(selectedTrip.vehicleId)}
            driver={driverMap.get(selectedTrip.driverId)}
            onClose={() => setShowMap(false)}
          />
        </div>
      )}

      {/* Spreadsheet Table / Empty State */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {trips.length === 0 ? (
          <div className="py-14 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <Navigation className="w-8 h-8 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">سجل الرحلات فارغ حالياً</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                تم مسح جميع بيانات الرحلات بنجاح. يمكنك تسجيل أول رحلة الآن لتتبع خطوط السير واستهلاك الوقود والتكاليف بدقة، أو إضافة رحلة استرشادية للتجربة.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              {onAddSampleTrip && (
                <button
                  onClick={onAddSampleTrip}
                  className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>إضافة رحلة استرشادية</span>
                </button>
              )}
              <button
                onClick={handleOpenNewTrip}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل أول رحلة</span>
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
                  <th className="p-3 whitespace-nowrap">كود الرحلة</th>
                  <th className="p-3 whitespace-nowrap">التاريخ</th>
                  <th className="p-3 whitespace-nowrap">المنطقة</th>
                  <th className="p-3 min-w-[200px]">خط السير والمحطات</th>
                  <th className="p-3 whitespace-nowrap">السيارة</th>
                  <th className="p-3 whitespace-nowrap">السائق</th>
                  <th className="p-3 whitespace-nowrap">العداد (ب/ن)</th>
                  <th className="p-3 whitespace-nowrap">المسافة (كم)</th>
                  <th className="p-3 whitespace-nowrap">الوقود (لتر)</th>
                  <th className="p-3 whitespace-nowrap">تكلفة الوقود</th>
                  <th className="p-3 whitespace-nowrap">كارتات وبوابات</th>
                  <th className="p-3 whitespace-nowrap">إجمالي الرحلة</th>
                  <th className="p-3 whitespace-nowrap">الحالة</th>
                  <th className="p-3 whitespace-nowrap text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="p-8 text-center text-slate-400">
                      لا توجد رحلات مسجلة تطابق الفلتر الحالي.
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => {
                    const veh = vehicleMap.get(trip.vehicleId);
                    const drv = driverMap.get(trip.driverId);
                    const isSelected = selectedTrip?.id === trip.id;
                    const isChecked = selectedTripIds.includes(trip.id);

                    return (
                      <tr
                        key={trip.id}
                        onClick={() => {
                          setSelectedTripId(trip.id);
                          setShowMap(true);
                        }}
                        className={`transition group cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50/70 border-r-4 border-r-emerald-600'
                            : isSelected
                            ? 'bg-emerald-50/40 border-r-4 border-r-emerald-500'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => toggleSelectTrip(trip.id, e)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                        </td>
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            )}
                            <span>{trip.tripCode}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 whitespace-nowrap font-mono">
                          {trip.date}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              trip.region === 'الإسكندرية'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : trip.region === 'الساحل الشمالي'
                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                : trip.region === 'البحيرة'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {trip.region}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{trip.routeName}</span>
                            {trip.deliverySignature && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-200 font-normal">
                                <PenTool className="w-2.5 h-2.5 text-emerald-600" />
                                <span>موقّع ({trip.signerName || 'السائق'})</span>
                              </span>
                            )}
                          </div>
                          {trip.startLocation && trip.destination && (
                            <div className="text-[10px] text-emerald-800 font-medium mt-0.5 flex items-center gap-1">
                              <span className="text-emerald-700">{trip.startLocation}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-rose-700">{trip.destination}</span>
                            </div>
                          )}
                          {trip.cargoType && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">
                              حمولة: {trip.cargoType}
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{veh?.plateNumber || trip.vehicleId}</div>
                          <div className="text-[10px] text-slate-400">{veh?.model?.split('(')[0]}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{drv?.name || trip.driverId}</div>
                          <div className="text-[10px] text-slate-400">{drv?.phone}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {trip.startOdometer.toLocaleString()} → {trip.endOdometer.toLocaleString()}
                        </td>
                        <td className="p-3 whitespace-nowrap font-bold text-slate-900">
                          {trip.distanceKm} <span className="font-normal text-[10px] text-slate-500">كم</span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-semibold text-blue-700">{trip.fuelLiters}</span>{' '}
                          <span className="text-[10px] text-slate-500">لتر</span>
                          <div className="text-[10px] text-slate-400 font-mono">
                            @{trip.fuelPricePerLiter} ج.م
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap font-bold text-slate-900">
                          {trip.fuelTotalCost.toLocaleString()}{' '}
                          <span className="font-normal text-[10px] text-slate-500">ج.م</span>
                        </td>
                        <td className="p-3 whitespace-nowrap text-slate-600">
                          {((trip.tollTaxes || 0) + (trip.otherExpenses || 0)).toLocaleString()}{' '}
                          <span className="text-[10px] text-slate-400">ج.م</span>
                        </td>
                        <td className="p-3 whitespace-nowrap font-black text-emerald-800 text-sm">
                          {trip.tripCostTotal.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal text-slate-500">ج.م</span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              trip.status === 'مكتملة'
                                ? 'bg-emerald-100 text-emerald-800'
                                : trip.status === 'جارية حالياً'
                                ? 'bg-blue-100 text-blue-800 animate-pulse'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {trip.status}
                          </span>
                        </td>
                        <td
                          className="p-3 whitespace-nowrap text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedTripId(trip.id);
                                setShowMap(true);
                              }}
                              title="عرض مسار الرحلة على خريطة Leaflet"
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              <Navigation className="w-3.5 h-3.5" />
                            </button>
                            {trip.status === 'جارية حالياً' && (
                              <button
                                onClick={() => onCompleteTrip(trip.id)}
                                title="إتمام وتأكيد وصول الرحلة"
                                className="px-2 py-1 rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>إتمام</span>
                              </button>
                            )}
                            <button
                              onClick={() => onEditTrip(trip)}
                              title="تعديل بيانات الرحلة"
                              className="px-2 py-1 rounded-md text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>تعديل</span>
                            </button>
                            <button
                              onClick={() => onDeleteTrip(trip.id)}
                              title="حذف الرحلة"
                              className="px-2 py-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
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

        {/* Live Calculation / Spreadsheet Summary Bar */}
        {trips.length > 0 && (
          <div className="bg-slate-900 text-white p-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-semibold">
                إجمالي النتائج: {stats.count} رحلة
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-medium">
              <div>
                <span className="text-slate-400 ml-1">إجمالي الكيلومترات:</span>
                <strong className="text-emerald-400">{stats.distance.toLocaleString()} كم</strong>
              </div>
              <div>
                <span className="text-slate-400 ml-1">إجمالي الوقود:</span>
                <strong className="text-blue-400">
                  {stats.fuelLiters.toLocaleString()} لتر ({stats.fuelCost.toLocaleString()} ج.م)
                </strong>
              </div>
              <div>
                <span className="text-slate-400 ml-1">الكارتات والبوابات:</span>
                <strong className="text-amber-400">{stats.tolls.toLocaleString()} ج.م</strong>
              </div>
              <div className="bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700">
                <span className="text-slate-300 ml-1">إجمالي تكاليف الرحلات:</span>
                <strong className="text-emerald-300 text-sm font-black">
                  {stats.totalCost.toLocaleString()} ج.م
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
