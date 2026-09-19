import React, { useState, useEffect } from 'react';
import { Search, X, Route, Truck, Users, MapPin, Cpu, ArrowLeft } from 'lucide-react';
import { OperationTask, Vehicle, Driver, LocationPlace, AutomationRule, TabKey } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: OperationTask[];
  vehicles: Vehicle[];
  drivers: Driver[];
  locations: LocationPlace[];
  rules: AutomationRule[];
  onNavigateToTab?: (tab: TabKey) => void;
  onSelectTask?: (task: OperationTask) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onSelectDriver?: (driver: Driver) => void;
  onSelectLocation?: (location: LocationPlace) => void;
  onSelectRule?: (rule: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  tasks,
  vehicles,
  drivers,
  locations,
  rules,
  onNavigateToTab,
  onSelectTask,
  onSelectVehicle,
  onSelectDriver,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle or open
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = searchTerm.trim().toLowerCase();

  const filteredTasks = cleanQuery
    ? tasks.filter(
        (t) =>
          t.taskCode.toLowerCase().includes(cleanQuery) ||
          t.title.toLowerCase().includes(cleanQuery) ||
          t.driverName?.toLowerCase().includes(cleanQuery) ||
          t.vehiclePlate?.toLowerCase().includes(cleanQuery) ||
          t.regionName.toLowerCase().includes(cleanQuery)
      ).slice(0, 5)
    : [];

  const filteredVehicles = cleanQuery
    ? vehicles.filter(
        (v) =>
          v.plateNumber.toLowerCase().includes(cleanQuery) ||
          v.code.toLowerCase().includes(cleanQuery) ||
          v.model.toLowerCase().includes(cleanQuery)
      ).slice(0, 5)
    : [];

  const filteredDrivers = cleanQuery
    ? drivers.filter(
        (d) =>
          d.name.toLowerCase().includes(cleanQuery) ||
          d.code.toLowerCase().includes(cleanQuery) ||
          d.phone.includes(cleanQuery) ||
          d.nationalId.includes(cleanQuery)
      ).slice(0, 5)
    : [];

  const filteredLocations = cleanQuery
    ? locations.filter(
        (l) =>
          l.name.toLowerCase().includes(cleanQuery) ||
          l.code.toLowerCase().includes(cleanQuery) ||
          l.region.toLowerCase().includes(cleanQuery)
      ).slice(0, 5)
    : [];

  const totalResults =
    filteredTasks.length +
    filteredVehicles.length +
    filteredDrivers.length +
    filteredLocations.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <input
            type="text"
            placeholder="ابحث في المهام، المركبات، السائقين، المواقع (مثال: V-01، سموحة، كابتن أحمد)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Esc
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!cleanQuery ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-40 text-cyan-500" />
              <p className="text-sm">اكتب كلمة البحث للوصول الفوري لأي عنصر في منظومة فليت أوبس</p>
              <div className="flex justify-center gap-2 pt-2 text-xs">
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">س ف ر ٨٩٢٣</span>
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">مصنع برج العرب</span>
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">مهمة عاجلة</span>
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              لا توجد نتائج تطابق "{searchTerm}"
            </div>
          ) : (
            <>
              {/* Tasks Results */}
              {filteredTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
                    <Route className="w-3.5 h-3.5 text-cyan-500" />
                    <span>المهام التشغيلية ({filteredTasks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          onClose();
                          onNavigateToTab('operations');
                          if (onSelectTask) onSelectTask(task);
                        }}
                        className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                              {task.taskCode}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {task.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {task.regionName} • {task.driverName || 'بدون سائق'} • {task.status}
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-transform group-hover:-translate-x-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicles Results */}
              {filteredVehicles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
                    <Truck className="w-3.5 h-3.5 text-blue-500" />
                    <span>مركبات الأسطول ({filteredVehicles.length})</span>
                  </div>
                  <div className="space-y-1">
                    {filteredVehicles.map((veh) => (
                      <div
                        key={veh.id}
                        onClick={() => {
                          onClose();
                          onNavigateToTab('fleet');
                          if (onSelectVehicle) onSelectVehicle(veh);
                        }}
                        className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                              {veh.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {veh.plateNumber} - {veh.model}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            عداد: {veh.currentOdometer?.toLocaleString()} كم • الحالة: {veh.status}
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-transform group-hover:-translate-x-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drivers Results */}
              {filteredDrivers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span>السائقين ({filteredDrivers.length})</span>
                  </div>
                  <div className="space-y-1">
                    {filteredDrivers.map((drv) => (
                      <div
                        key={drv.id}
                        onClick={() => {
                          onClose();
                          onNavigateToTab('people');
                          if (onSelectDriver) onSelectDriver(drv);
                        }}
                        className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {drv.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {drv.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            هاتف: {drv.phone} • {drv.licenseDegree} • {drv.status}
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:-translate-x-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations Results */}
              {filteredLocations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span>المواقع والمستودعات ({filteredLocations.length})</span>
                  </div>
                  <div className="space-y-1">
                    {filteredLocations.map((loc) => (
                      <div
                        key={loc.id}
                        onClick={() => {
                          onClose();
                          onNavigateToTab('locations');
                        }}
                        className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                              {loc.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {loc.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {loc.region} • {loc.category}
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-transform group-hover:-translate-x-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
