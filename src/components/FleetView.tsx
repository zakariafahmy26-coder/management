import React, { useState } from 'react';
import {
  Truck,
  FileText,
  Wrench,
  Fuel,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Shield,
  ExternalLink,
  ChevronLeft,
  X,
  User,
  Gauge,
  Droplet,
  DollarSign,
  FolderArchive,
} from 'lucide-react';
import {
  Vehicle,
  VehicleDocument,
  MaintenanceRecord,
  FuelRecord,
  Driver,
  TripRoute,
  MaintenanceAlert,
} from '../types';
import { VehiclesSheetView } from './VehiclesSheetView';
import { MaintenanceSheetView } from './MaintenanceSheetView';
import { FuelSheetView } from './FuelSheetView';

interface FleetViewProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  alerts?: MaintenanceAlert[];
  documents: VehicleDocument[];
  maintenance: MaintenanceRecord[];
  fuelRecords: FuelRecord[];
  trips: TripRoute[];
  canEdit: boolean;
  onOpenVehicleModal: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onOpenMaintenanceModal: () => void;
  onEditMaintenance: (record: MaintenanceRecord) => void;
  onDeleteMaintenance: (recordId: string) => void;
  onOpenFuelModal: () => void;
  onEditFuel: (record: FuelRecord) => void;
  onDeleteFuel: (recordId: string) => void;
  onAddDocument: (doc: Partial<VehicleDocument>) => void;
  onUpdateVehicleStatus: (vehicleId: string, status: Vehicle['status']) => void;
  onOpenZipUploadModal?: () => void;
}

export const FleetView: React.FC<FleetViewProps> = ({
  vehicles,
  drivers,
  alerts = [],
  documents,
  maintenance,
  fuelRecords,
  trips,
  canEdit,
  onOpenVehicleModal,
  onEditVehicle,
  onDeleteVehicle,
  onOpenMaintenanceModal,
  onEditMaintenance,
  onDeleteMaintenance,
  onOpenFuelModal,
  onEditFuel,
  onDeleteFuel,
  onAddDocument,
  onUpdateVehicleStatus,
  onOpenZipUploadModal,
}) => {
  const [subTab, setSubTab] = useState<'vehicles' | 'documents' | 'maintenance' | 'fuel'>('vehicles');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [docFilter, setDocFilter] = useState<string>('ALL');
  const [showAddDocModal, setShowAddDocModal] = useState<boolean>(false);

  // New Doc Form
  const [newDocVehicleId, setNewDocVehicleId] = useState('');
  const [newDocType, setNewDocType] = useState<VehicleDocument['documentType']>('LICENSE');
  const [newDocNumber, setNewDocNumber] = useState('');
  const [newDocIssueDate, setNewDocIssueDate] = useState('');
  const [newDocExpiryDate, setNewDocExpiryDate] = useState('');
  const [newDocIssuer, setNewDocIssuer] = useState('');

  // Metrics
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter((v) => v.status === 'متاح').length;
  const inTripVehicles = vehicles.filter((v) => v.status === 'في رحلة').length;
  const inMaintVehicles = vehicles.filter((v) => v.status === 'في الصيانة').length;

  const urgentOilVehicles = vehicles.filter((v) => {
    const diff = (v.nextOilChangeOdometer || 0) - (v.currentOdometer || 0);
    return diff <= 500;
  });

  const expiringDocs = documents.filter((d) => d.status === 'EXPIRING_SOON' || d.status === 'EXPIRED');

  const handleAddDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocVehicleId || !newDocExpiryDate) return;

    const matchedVeh = vehicles.find((v) => v.id === newDocVehicleId);
    const expDate = new Date(newDocExpiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const status: VehicleDocument['status'] =
      diffDays < 0 ? 'EXPIRED' : diffDays <= 30 ? 'EXPIRING_SOON' : 'VALID';

    onAddDocument({
      vehicleId: newDocVehicleId,
      vehiclePlate: matchedVeh?.plateNumber,
      documentType: newDocType,
      documentNumber: newDocNumber || `DOC-${Date.now().toString().slice(-4)}`,
      issueDate: newDocIssueDate || new Date().toISOString().split('T')[0],
      expiryDate: newDocExpiryDate,
      issuingAuthority: newDocIssuer || 'إدارة المرور',
      status,
      reminderDaysBefore: 30,
    });

    setShowAddDocModal(false);
  };

  const getDocStatusBadge = (status: VehicleDocument['status']) => {
    switch (status) {
      case 'VALID':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">سارية ✓</span>;
      case 'EXPIRING_SOON':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">تنتهي قريباً ⚠️</span>;
      case 'EXPIRED':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">منتهية ❌</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Fleet Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              إدارة أسطول المركبات والتراخيص
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              متابعة الشاحنات، وثائق المرور، جداول الصيانة، واستهلاك الوقود لجميع المحاور
            </p>
          </div>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
          <button
            onClick={() => setSubTab('vehicles')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'vehicles'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            المركبات ({totalVehicles})
          </button>
          <button
            onClick={() => setSubTab('documents')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'documents'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            الوثائق والتراخيص ({documents.length})
          </button>
          <button
            onClick={() => setSubTab('maintenance')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'maintenance'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            الصيانة ({maintenance.length})
          </button>
          <button
            onClick={() => setSubTab('fuel')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'fuel'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            الوقود ({fuelRecords.length})
          </button>
        </div>
      </div>

      {/* Fleet KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400">إجمالي شاحنات الأسطول</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalVehicles}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">نقل ثقيل، جامبو، ميني باص، فان</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>متاحة للتشغيل</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{availableVehicles}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">جاهزة للتحرك فوراً</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
            <span>في خطوط السير</span>
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{inTripVehicles}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">على محاور الإسكندرية والدلتا</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span>تنبيهات صيانة وتراخيص</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {urgentOilVehicles.length + expiringDocs.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {urgentOilVehicles.length} غيار زيت • {expiringDocs.length} تراخيص
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: VEHICLES */}
      {subTab === 'vehicles' && (
        <VehiclesSheetView
          vehicles={vehicles}
          drivers={drivers}
          alerts={alerts}
          maintenance={maintenance}
          fuelRecords={fuelRecords}
          trips={trips}
          onOpenVehicleModal={onOpenVehicleModal}
          onEditVehicle={onEditVehicle}
          onDeleteVehicle={onDeleteVehicle}
          onOpenMaintenanceModalForVehicle={() => onOpenMaintenanceModal()}
          canEdit={canEdit}
        />
      )}

      {/* SUB-TAB 2: VEHICLE DOCUMENTS */}
      {subTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                تصفية الوثائق:
              </span>
              <select
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
              >
                <option value="ALL">جميع الوثائق ({documents.length})</option>
                <option value="EXPIRING_SOON">تنتهي قريباً (30 يوماً)</option>
                <option value="EXPIRED">منتهية الصلاحية</option>
                <option value="LICENSE">رخص تسيير</option>
                <option value="INSURANCE">وثائق تأمين</option>
                <option value="INSPECTION">فحص فني وبيئي</option>
              </select>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2">
                {onOpenZipUploadModal && (
                  <button
                    onClick={onOpenZipUploadModal}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-900/20 transition-all cursor-pointer"
                    title="رفع أرشيف ZIP يحتوي على وثائق أو رخص متعددة"
                  >
                    <FolderArchive className="w-4 h-4" />
                    <span>رفع أرشيف وثائق (ZIP)</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAddDocModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة وثيقة أو رخصة</span>
                </button>
              </div>
            )}
          </div>

          {/* Documents Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">المركبة واللوحة</th>
                    <th className="py-3 px-4">نوع الوثيقة</th>
                    <th className="py-3 px-4">رقم الوثيقة</th>
                    <th className="py-3 px-4">جهة الإصدار</th>
                    <th className="py-3 px-4">تاريخ التجديد / الانتهاء</th>
                    <th className="py-3 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents
                    .filter((d) => {
                      if (docFilter === 'EXPIRING_SOON') return d.status === 'EXPIRING_SOON';
                      if (docFilter === 'EXPIRED') return d.status === 'EXPIRED';
                      if (docFilter === 'LICENSE') return d.documentType === 'LICENSE';
                      if (docFilter === 'INSURANCE') return d.documentType === 'INSURANCE';
                      if (docFilter === 'INSPECTION') return d.documentType === 'INSPECTION';
                      return true;
                    })
                    .map((doc) => {
                      const veh = vehicles.find((v) => v.id === doc.vehicleId);
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {doc.vehiclePlate || veh?.plateNumber || 'غير محددة'}
                            </div>
                            <div className="text-[11px] text-slate-400">{veh?.model || veh?.code}</div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {doc.documentType === 'LICENSE'
                              ? 'رخصة تسيير رسمية'
                              : doc.documentType === 'INSURANCE'
                              ? 'وثيقة تأمين إجباري / تجاري'
                              : doc.documentType === 'INSPECTION'
                              ? 'شهادة فحص فني وبيئي'
                              : 'تصريح نقل رسمي'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                            {doc.documentNumber}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            {doc.issuingAuthority}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {doc.expiryDate}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              إصدار: {doc.issueDate}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {getDocStatusBadge(doc.status)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MAINTENANCE */}
      {subTab === 'maintenance' && (
        <MaintenanceSheetView
          maintenance={maintenance}
          vehicles={vehicles}
          alerts={alerts}
          onOpenMaintenanceModal={onOpenMaintenanceModal}
          onEditMaintenance={onEditMaintenance}
          onDeleteMaintenance={onDeleteMaintenance}
          canEdit={canEdit}
        />
      )}

      {/* SUB-TAB 4: FUEL */}
      {subTab === 'fuel' && (
        <FuelSheetView
          fuelRecords={fuelRecords}
          vehicles={vehicles}
          drivers={drivers}
          onOpenFuelModal={onOpenFuelModal}
          onEditFuel={onEditFuel}
          onDeleteFuel={onDeleteFuel}
          canEdit={canEdit}
        />
      )}

      {/* ADD DOCUMENT MODAL */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span>إضافة وثيقة أو ترخيص شاحنة</span>
              </h2>
              <button
                onClick={() => setShowAddDocModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDocSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المركبة *
                </label>
                <select
                  required
                  value={newDocVehicleId}
                  onChange={(e) => setNewDocVehicleId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                >
                  <option value="">اختر مركبة من الأسطول...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} ({v.model}) - {v.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع الوثيقة
                  </label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
                  >
                    <option value="LICENSE">رخصة تسيير</option>
                    <option value="INSURANCE">وثيقة تأمين</option>
                    <option value="INSPECTION">فحص فني وبيئي</option>
                    <option value="ROAD_PERMIT">تصريح سير</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الوثيقة
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: LIC-2026-99"
                    value={newDocNumber}
                    onChange={(e) => setNewDocNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ الإصدار
                  </label>
                  <input
                    type="date"
                    value={newDocIssueDate}
                    onChange={(e) => setNewDocIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ الانتهاء *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDocExpiryDate}
                    onChange={(e) => setNewDocExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  جهة الإصدار
                </label>
                <input
                  type="text"
                  placeholder="مثال: إدارة مرور الإسكندرية / مصر للتأمين"
                  value={newDocIssuer}
                  onChange={(e) => setNewDocIssuer(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/20"
                >
                  حفظ الوثيقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
