import {
  Building2,
  CheckCircle2,
  Edit2,
  Filter,
  Layers,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { LocationPlace, MainRegion, TripRoute } from '../types';

interface LocationsSheetViewProps {
  locations: LocationPlace[];
  trips: TripRoute[];
  availableRegions: string[];
  onOpenNewLocationModal: () => void;
  onEditLocation: (loc: LocationPlace) => void;
  onDeleteLocation: (locationId: string) => void;
  onResetDefaultLocations: () => void;
  onOpenTripModalWithPlace?: (placeName: string, region: string) => void;
}

export const LocationsSheetView: React.FC<LocationsSheetViewProps> = ({
  locations,
  trips,
  availableRegions,
  onOpenNewLocationModal,
  onEditLocation,
  onDeleteLocation,
  onResetDefaultLocations,
  onOpenTripModalWithPlace,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate trips count associated with each location
  const tripsCountByLocation = useMemo(() => {
    const counts: Record<string, number> = {};
    trips.forEach((t) => {
      if (t.startLocation) {
        counts[t.startLocation] = (counts[t.startLocation] || 0) + 1;
      }
      if (t.destination) {
        counts[t.destination] = (counts[t.destination] || 0) + 1;
      }
      if (t.destinationStops) {
        t.destinationStops.forEach((stop) => {
          counts[stop] = (counts[stop] || 0) + 1;
        });
      }
    });
    return counts;
  }, [trips]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchRegion = selectedRegion === 'all' || loc.region === selectedRegion;
      const matchCat = selectedCategory === 'all' || loc.category === selectedCategory;
      const search = searchQuery.trim().toLowerCase();
      const matchSearch =
        !search ||
        loc.name.toLowerCase().includes(search) ||
        loc.code.toLowerCase().includes(search) ||
        loc.region.toLowerCase().includes(search) ||
        (loc.address && loc.address.toLowerCase().includes(search)) ||
        (loc.notes && loc.notes.toLowerCase().includes(search));

      return matchRegion && matchCat && matchSearch;
    });
  }, [locations, selectedRegion, selectedCategory, searchQuery]);

  // Metrics summary
  const alexCount = locations.filter((l) => l.region === 'الإسكندرية').length;
  const nstCount = locations.filter((l) => l.region === 'الساحل الشمالي').length;
  const bhrCount = locations.filter((l) => l.region === 'البحيرة').length;

  const getRegionBadge = (regionName: string) => {
    if (regionName.includes('إسكندرية')) {
      return {
        bg: 'bg-blue-50 text-blue-800 border-blue-200',
        dot: 'bg-blue-500',
      };
    }
    if (regionName.includes('ساحل')) {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (regionName.includes('بحيرة')) {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    }
    return {
      bg: 'bg-purple-50 text-purple-800 border-purple-200',
      dot: 'bg-purple-500',
    };
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'مصنع':
        return 'bg-slate-900 text-white';
      case 'ميناء بحري':
        return 'bg-blue-700 text-white';
      case 'مستودع ومخزن':
        return 'bg-amber-700 text-white';
      case 'فرع وتوزيع':
        return 'bg-emerald-700 text-white';
      case 'عميل رئيسي':
        return 'bg-indigo-700 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
            <Layers className="w-3.5 h-3.5" />
            <span>البيانات الجغرافية الرئيسية للمصنع</span>
          </div>
          <h2 className="text-xl font-black text-white">
            دليل المناطق والأماكن ومراكز التوزيع
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            إدارة نقاط الانطلاق، الموانئ البحرية، المستودعات، وفروع العملاء بمحافظات الإسكندرية والساحل الشمالي والبحيرة، لتظهر تلقائياً عند تسجيل خطوط السير اليومية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onResetDefaultLocations}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition cursor-pointer"
            title="استعادة القائمة القياسية للمناطق والأماكن"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            onClick={onOpenNewLocationModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مكان جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Regions breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">إجمالي الأماكن المسجلة</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{locations.length} موقع</div>
            <span className="text-[11px] text-slate-500">جاهزة للاختيار في خطوط السير</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
            <MapPin className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-700">قطاع الإسكندرية</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{alexCount} أماكن</div>
            <span className="text-[11px] text-slate-500">المصنع، الموانئ، سموحة، العجمي</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700">قطاع الساحل الشمالي</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{nstCount} أماكن</div>
            <span className="text-[11px] text-slate-500">العلمين، مارينا، سيدي عبد الرحمن</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700">قطاع محافظة البحيرة</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{bhrCount} أماكن</div>
            <span className="text-[11px] text-slate-500">دمنهور، كفر الدوار، وادي النطرون</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Region Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              onClick={() => setSelectedRegion('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                selectedRegion === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              كافة المناطق ({locations.length})
            </button>
            {availableRegions.map((reg) => {
              const count = locations.filter((l) => l.region === reg).length;
              const isActive = selectedRegion === reg;
              return (
                <button
                  key={reg}
                  onClick={() => setSelectedRegion(reg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer border flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <span>{reg}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الكود، أو العنوان..."
              className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs text-slate-600 pt-1 border-t border-slate-100">
          <span className="font-semibold text-slate-500 pl-1 whitespace-nowrap">التصنيف:</span>
          {['all', 'مصنع', 'مستودع ومخزن', 'ميناء بحري', 'فرع وتوزيع', 'عميل رئيسي'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'الكل' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-4">كود المكان</th>
                <th className="py-3 px-4">اسم المكان / النقطة</th>
                <th className="py-3 px-4">المنطقة التابعة</th>
                <th className="py-3 px-4">نوع المنشأة</th>
                <th className="py-3 px-4">العنوان والتفاصيل</th>
                <th className="py-3 px-4 text-center">الرحلات المسجلة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm">لا توجد أماكن مطابقة لبحثك</p>
                    <p className="text-xs mt-1">
                      يمكنك إضافة مكان جديد أو مسح تصفيات البحث
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc) => {
                  const regBadge = getRegionBadge(loc.region);
                  const tripCount = tripsCountByLocation[loc.name] || 0;

                  return (
                    <tr
                      key={loc.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {loc.code}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{loc.name}</span>
                        </div>
                        {loc.notes && (
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">
                            {loc.notes}
                          </p>
                        )}
                      </td>

                      {/* Region */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${regBadge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${regBadge.dot}`}></span>
                          <span>{loc.region}</span>
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${getCategoryBadge(
                            loc.category
                          )}`}
                        >
                          {loc.category}
                        </span>
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4 text-slate-600 max-w-sm">
                        {loc.address || <span className="text-slate-400">-</span>}
                      </td>

                      {/* Trips Count */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            tripCount > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {tripCount} رحلة
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          {onOpenTripModalWithPlace && (
                            <button
                              onClick={() => onOpenTripModalWithPlace(loc.name, loc.region)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="تسجيل رحلة لهذا المكان"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onEditLocation(loc)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="تعديل بيانات المكان"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteLocation(loc.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="حذف المكان"
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
