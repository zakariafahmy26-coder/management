import React, { useState } from 'react';
import {
  MapPin,
  Map,
  Building2,
  Navigation,
  Warehouse,
  Factory,
  Anchor,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  X,
  Layers,
} from 'lucide-react';
import { LocationPlace, RegionItem, AreaItem, BranchItem } from '../types';
import { LocationsMapView } from './LocationsMapView';

interface HierarchicalLocationsViewProps {
  locations: LocationPlace[];
  regions: RegionItem[];
  areas?: AreaItem[];
  branches?: BranchItem[];
  canEdit: boolean;
  onAddLocation: (loc: Partial<LocationPlace>) => void;
  onEditLocation?: (loc: LocationPlace) => void;
  onDeleteLocation?: (locId: string) => void;
}

export const HierarchicalLocationsView: React.FC<HierarchicalLocationsViewProps> = ({
  locations,
  regions,
  areas = [],
  branches = [],
  canEdit,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
}) => {
  const [levelTab, setLevelTab] = useState<'map' | 'locations' | 'branches' | 'areas' | 'regions'>('map');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newRegion, setNewRegion] = useState('الإسكندرية');
  const [newCategory, setNewCategory] = useState<LocationPlace['category']>('فرع وتوزيع');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Built-in default areas & branches if not passed
  const displayAreas = areas.length > 0 ? areas : [
    { id: 'area-1', code: 'AR-ALX-W', name: 'غرب الإسكندرية وبرج العرب', regionId: 'reg-alexandria', regionName: 'الإسكندرية', active: true },
    { id: 'area-2', code: 'AR-ALX-E', name: 'وسط وشرق الإسكندرية', regionId: 'reg-alexandria', regionName: 'الإسكندرية', active: true },
    { id: 'area-3', code: 'AR-NST-1', name: 'العلمين الجديدة ومارينا', regionId: 'reg-north-coast', regionName: 'الساحل الشمالي', active: true },
    { id: 'area-4', code: 'AR-NST-2', name: 'الضبعة ورأس الحكمة', regionId: 'reg-north-coast', regionName: 'الساحل الشمالي', active: true },
    { id: 'area-5', code: 'AR-BHR-1', name: 'شمال البحيرة وكفر الدوار', regionId: 'reg-beheira', regionName: 'البحيرة', active: true },
    { id: 'area-6', code: 'AR-BHR-2', name: 'دمنهور ووسط المحافظة', regionId: 'reg-beheira', regionName: 'البحيرة', active: true },
  ];

  const displayBranches = branches.length > 0 ? branches : [
    { id: 'br-1', code: 'BR-01', name: 'فرع ومستودع برج العرب الرئيسي', areaName: 'غرب الإسكندرية وبرج العرب', regionName: 'الإسكندرية', address: 'المنطقة الصناعية الثالثة', managerName: 'م. أحمد الشناوي', phone: '03-4592001', active: true },
    { id: 'br-2', code: 'BR-02', name: 'مركز شحن الدخيلة والميناء', areaName: 'غرب الإسكندرية وبرج العرب', regionName: 'الإسكندرية', address: 'طريق الميناء الجديد', managerName: 'كابتن حسام فرج', phone: '03-3450912', active: true },
    { id: 'br-3', code: 'BR-03', name: 'مستودع العلمين والساحل', areaName: 'العلمين الجديدة ومارينا', regionName: 'الساحل الشمالي', address: 'طريق الساحل الدولي كم 105', managerName: 'أ. طارق عبد الحميد', phone: '046-410022', active: true },
    { id: 'br-4', code: 'BR-04', name: 'فرع دمنهور اللوجستي', areaName: 'دمنهور ووسط المحافظة', regionName: 'البحيرة', address: 'مدخل دمنهور الزراعي', managerName: 'أ. محمود رضوان', phone: '045-331908', active: true },
  ];

  const filteredLocations = locations.filter((loc) => {
    if (regionFilter !== 'ALL' && loc.region !== regionFilter) return false;
    if (categoryFilter !== 'ALL' && loc.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        loc.name.toLowerCase().includes(q) ||
        loc.code.toLowerCase().includes(q) ||
        loc.address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const codeNum = String(locations.length + 1).padStart(2, '0');
    const prefix = newRegion === 'الساحل الشمالي' ? 'LOC-NST' : newRegion === 'البحيرة' ? 'LOC-BHR' : 'LOC-ALX';

    onAddLocation({
      code: `${prefix}-${codeNum}`,
      name: newName.trim(),
      region: newRegion,
      category: newCategory,
      address: newAddress.trim() || 'جمهورية مصر العربية',
      notes: newNotes.trim(),
    });

    setShowAddModal(false);
    setNewName('');
    setNewAddress('');
    setNewNotes('');
  };

  const getCategoryIcon = (category: LocationPlace['category']) => {
    switch (category) {
      case 'مصنع':
        return <Factory className="w-4 h-4 text-amber-500" />;
      case 'مستودع ومخزن':
        return <Warehouse className="w-4 h-4 text-blue-500" />;
      case 'ميناء':
        return <Anchor className="w-4 h-4 text-cyan-500" />;
      case 'فرع وتوزيع':
        return <Building2 className="w-4 h-4 text-emerald-500" />;
      case 'عميل رئيسي':
      default:
        return <MapPin className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Locations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              الهيكل الجغرافي والمواقع اللوجستية
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تسلسل هرمي مرن: المناطق اللوجستية → المناطق الفرعية → الفروع والمستودعات → نقاط التسليم
            </p>
          </div>
        </div>

        {/* Hierarchy Level Switcher */}
        <div className="flex flex-wrap items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold gap-1">
          <button
            onClick={() => setLevelTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              levelTab === 'map'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>خريطة المواقع التفاعلية (Leaflet)</span>
          </button>
          <button
            onClick={() => setLevelTab('locations')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              levelTab === 'locations'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            قائمة وبطاقات المواقع ({locations.length})
          </button>
          <button
            onClick={() => setLevelTab('branches')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              levelTab === 'branches'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            الفروع والمستودعات ({displayBranches.length})
          </button>
          <button
            onClick={() => setLevelTab('areas')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              levelTab === 'areas'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            المناطق الفرعية ({displayAreas.length})
          </button>
          <button
            onClick={() => setLevelTab('regions')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              levelTab === 'regions'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            المناطق اللوجستية (3)
          </button>
        </div>
      </div>

      {/* LEVEL 0: INTERACTIVE LEAFLET MAP */}
      {levelTab === 'map' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>خريطة المواقع الجغرافية التفاعلية</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    Leaflet Map Engine
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  عرض دبابيس جغرافية (Markers) لكل موقع ومستودع وميناء وفرع مسجل بناءً على إحداثياته الجغرافية الدقيقة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLevelTab('locations')}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                عرض البطاقات والجدول ({locations.length})
              </button>
              {canEdit && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة موقع جديد</span>
                </button>
              )}
            </div>
          </div>

          <LocationsMapView
            locations={locations}
            onEditLocation={onEditLocation}
            height="620px"
          />
        </div>
      )}

      {/* LEVEL 1: LOCATIONS */}
      {levelTab === 'locations' && (
        <div className="space-y-4">
          {/* Quick toggle bar to interactive map */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200 font-semibold">
              <Map className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>يتوفر عرض تفاعلي كامل على الخريطة الجغرافية بدبابيس Leaflet لكل موقع</span>
            </div>
            <button
              onClick={() => setLevelTab('map')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-2xs transition"
            >
              فتح الخريطة التفاعلية 🗺️
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="ابحث باسم الموقع، الكود، أو العنوان..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
              >
                <option value="ALL">جميع المحافظات والمناطق</option>
                <option value="الإسكندرية">الإسكندرية</option>
                <option value="الساحل الشمالي">الساحل الشمالي</option>
                <option value="البحيرة">البحيرة</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
              >
                <option value="ALL">جميع التصنيفات</option>
                <option value="مصنع">مصنع</option>
                <option value="مستودع ومخزن">مستودع ومخزن</option>
                <option value="ميناء">ميناء بحري</option>
                <option value="فرع وتوزيع">فرع وتوزيع</option>
                <option value="عميل رئيسي">عميل رئيسي</option>
              </select>

              {canEdit && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-900/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة موقع</span>
                </button>
              )}
            </div>
          </div>

          {/* Locations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((loc) => (
              <div
                key={loc.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-cyan-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {loc.code}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {getCategoryIcon(loc.category)}
                      <span>{loc.category}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                    {loc.name}
                  </h3>

                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span>{loc.region}</span>
                    </div>
                    {loc.address && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{loc.address}</span>
                      </div>
                    )}
                    {loc.coordinates && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <span className="text-blue-500">📍 GPS:</span>
                        <span>{loc.coordinates[0].toFixed(3)}, {loc.coordinates[1].toFixed(3)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {loc.notes && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 italic">
                    {loc.notes}
                  </div>
                )}

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setLevelTab('map')}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>عرض على خريطة Leaflet</span>
                  </button>
                  {loc.coordinates && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${loc.coordinates[0]},${loc.coordinates[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="فتح في Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEVEL 2: BRANCHES */}
      {levelTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayBranches.map((br) => (
            <div
              key={br.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                  {br.code}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  نشط
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">{br.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{br.areaName} • {br.regionName}</p>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div>المدير المسؤول: <span className="font-semibold">{br.managerName}</span></div>
                <div>الهاتف: <span className="font-mono">{br.phone}</span></div>
                <div>العنوان: <span className="text-slate-400">{br.address}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LEVEL 3: AREAS */}
      {levelTab === 'areas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayAreas.map((area) => (
            <div
              key={area.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-400">{area.code}</span>
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{area.regionName}</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{area.name}</h3>
            </div>
          ))}
        </div>
      )}

      {/* LEVEL 4: REGIONS */}
      {levelTab === 'regions' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {regions.map((reg) => (
            <div
              key={reg.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-cyan-500">{reg.code}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600">
                    محور رئيسي
                  </span>
                </div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white mb-2">{reg.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {reg.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-cyan-600 dark:text-cyan-400 font-semibold flex items-center justify-between">
                <span>تغطية شبكة النقل</span>
                <span>100% نشط</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD LOCATION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-500" />
                <span>إضافة نقطة تسليم أو موقع جديد</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم الموقع / نقطة التحميل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مخزن سموحة المركزي - بوابة 3"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المنطقة اللوجستية
                  </label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
                  >
                    <option value="الإسكندرية">الإسكندرية</option>
                    <option value="الساحل الشمالي">الساحل الشمالي</option>
                    <option value="البحيرة">البحيرة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تصنيف الموقع
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
                  >
                    <option value="فرع وتوزيع">فرع وتوزيع</option>
                    <option value="مستودع ومخزن">مستودع ومخزن</option>
                    <option value="مصنع">مصنع</option>
                    <option value="ميناء">ميناء</option>
                    <option value="عميل رئيسي">عميل رئيسي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  العنوان التفصيلي
                </label>
                <input
                  type="text"
                  placeholder="مثال: الكيلو 28 طريق مصر إسكندرية الصحراوي"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات وتعليمات الاستلام
                </label>
                <textarea
                  rows={2}
                  placeholder="تعليمات الدخول، أوقات التفريغ..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-900/20"
                >
                  حفظ الموقع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
