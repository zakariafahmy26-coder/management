import React, { useState } from 'react';
import {
  Car,
  CheckCircle2,
  Clock,
  Fuel,
  Gauge,
  MapPin,
  Navigation,
  Play,
  Square,
  Upload,
  Camera as CameraIcon,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Driver, FuelRecord, TripRoute, Vehicle } from '../types';
import { captureAndCompressPhoto } from '../utils/platform';
import { formatBytes } from '../utils/imageCompression';

interface DriverModeViewProps {
  trips: TripRoute[];
  vehicles: Vehicle[];
  drivers: Driver[];
  currentDriverId?: string;
  isOnline: boolean;
  onUpdateTrip: (trip: TripRoute) => void;
  onAddFuel: (fuel: FuelRecord) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
}

export const DriverModeView: React.FC<DriverModeViewProps> = ({
  trips,
  vehicles,
  drivers,
  currentDriverId,
  isOnline,
  onUpdateTrip,
  onAddFuel,
  onUpdateVehicle,
}) => {
  // Select driver (default to passed prop or first driver)
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    currentDriverId || drivers[0]?.id || ''
  );
  const [odometerInput, setOdometerInput] = useState<string>('');
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null);
  const [odometerMetrics, setOdometerMetrics] = useState<{
    originalSize: number;
    compressedSize: number;
    savedPercentage: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'trips' | 'fuel'>('trips');

  // Fuel modal / form state
  const [fuelVehicleId, setFuelVehicleId] = useState<string>('');
  const [fuelQuantity, setFuelQuantity] = useState<string>('50');
  const [fuelPrice, setFuelPrice] = useState<string>('13.5');
  const [fuelStation, setFuelStation] = useState<string>('وطنية');
  const [fuelOdometer, setFuelOdometer] = useState<string>('');
  const [fuelReceiptPhoto, setFuelReceiptPhoto] = useState<string | null>(null);
  const [fuelReceiptMetrics, setFuelReceiptMetrics] = useState<{
    originalSize: number;
    compressedSize: number;
    savedPercentage: number;
  } | null>(null);
  const [fuelSuccess, setFuelSuccess] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const currentDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];
  const driverTrips = trips.filter((t) => t.driverId === currentDriver?.id);
  const activeTrip = driverTrips.find((t) => t.status === 'جارية' || t.status === 'جارية حالياً');
  const scheduledTrips = driverTrips.filter(
    (t) => t.status === 'مجدولة' || t.status === 'معلقة'
  );
  const completedTrips = driverTrips.filter((t) => t.status === 'مكتملة');

  // Start Trip
  const handleStartTrip = (trip: TripRoute) => {
    const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
    const startKm = vehicle ? vehicle.currentOdometer : trip.startOdometer || 0;
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);

    const updatedTrip: TripRoute = {
      ...trip,
      status: 'جارية',
      startTime: trip.startTime || timeStr,
      startOdometer: trip.startOdometer || startKm,
    };
    onUpdateTrip(updatedTrip);

    if (vehicle) {
      onUpdateVehicle({
        ...vehicle,
        status: 'في خط سير',
      });
    }
  };

  // Complete Trip
  const handleEndTrip = (trip: TripRoute) => {
    const endKm = Number(odometerInput) || trip.startOdometer + 50;
    if (endKm < trip.startOdometer) {
      alert('قراءة عداد النهاية لا يمكن أن تكون أقل من بداية الرحلة');
      return;
    }

    const dist = endKm - trip.startOdometer;
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);

    const updatedTrip: TripRoute = {
      ...trip,
      status: 'مكتملة',
      endTime: timeStr,
      endOdometer: endKm,
      distanceKm: dist,
      odometerPhoto: odometerPhoto || undefined,
    };
    onUpdateTrip(updatedTrip);

    const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
    if (vehicle) {
      onUpdateVehicle({
        ...vehicle,
        currentOdometer: endKm,
        status: 'جاهزة للعمل',
      });
    }

    setOdometerInput('');
    setOdometerPhoto(null);
    setOdometerMetrics(null);
  };

  // Take photo of odometer with automatic client-side compression
  const handleCaptureOdometerPhoto = async () => {
    const result = await captureAndCompressPhoto({ maxWidth: 1280, maxHeight: 1280, quality: 0.72 });
    if (result) {
      setOdometerPhoto(result.dataUrl);
      setOdometerMetrics({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savedPercentage: result.savedPercentage,
      });
    }
  };

  // Take photo of fuel receipt with automatic client-side compression
  const handleCaptureFuelReceipt = async () => {
    const result = await captureAndCompressPhoto({ maxWidth: 1280, maxHeight: 1280, quality: 0.72 });
    if (result) {
      setFuelReceiptPhoto(result.dataUrl);
      setFuelReceiptMetrics({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savedPercentage: result.savedPercentage,
      });
    }
  };

  // Save quick fuel record
  const handleSaveFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(fuelQuantity) || 0;
    const prc = parseFloat(fuelPrice) || 0;
    const odo = parseFloat(fuelOdometer) || 0;
    const vehId = fuelVehicleId || (activeTrip?.vehicleId || vehicles[0]?.id);

    const newFuel: FuelRecord = {
      id: `fuel-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      vehicleId: vehId,
      driverId: currentDriver?.id,
      quantity: qty,
      price: prc,
      totalCost: qty * prc,
      odometer: odo,
      station: fuelStation,
      receiptImage: fuelReceiptPhoto || undefined,
      notes: 'تم التسجيل عبر واجهة السائق الميدانية',
      createdAt: new Date().toISOString(),
      syncStatus: isOnline ? 'synced' : 'pending',
    };

    onAddFuel(newFuel);
    setFuelSuccess('تم تسجيل إيصال الوقود بنجاح!');
    setTimeout(() => setFuelSuccess(''), 3500);
    setFuelReceiptPhoto(null);
    setFuelReceiptMetrics(null);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12" dir="rtl">
      {/* Top Banner / Driver Selector */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg">
              {currentDriver?.name?.slice(0, 2) || 'س'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{currentDriver?.name || 'السائق'}</h2>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {currentDriver?.code || 'D-01'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                رخصة: {currentDriver?.licenseDegree} | {currentDriver?.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online/Offline Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'متصل بالسحابة' : 'وضع غير متصل (حفظ محلي)'}</span>
            </div>

            {/* Quick Driver Switcher */}
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mt-5 border-t border-slate-800 pt-4">
          <button
            onClick={() => setActiveTab('trips')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'trips'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>مهام الرحلات اليومية ({driverTrips.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('fuel')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'fuel'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Fuel className="w-4 h-4" />
            <span>تسجيل تموين وقود سريع</span>
          </button>
        </div>
      </div>

      {activeTab === 'trips' ? (
        <div className="space-y-5">
          {/* Active Trip Section */}
          {activeTrip ? (
            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 rounded-2xl p-6 border-2 border-emerald-500/50 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  رحلة جارية حالياً
                </span>
                <span className="text-sm font-semibold text-slate-300">{activeTrip.tripCode}</span>
              </div>

              <h3 className="text-xl font-black text-white mb-2">{activeTrip.routeName}</h3>
              <p className="text-sm text-slate-300 flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-emerald-400" />
                من: {activeTrip.startLocation || 'المصنع'} ➔ إلى: {activeTrip.destination || 'المستودع'}
              </p>

              {/* Vehicle info card */}
              {(() => {
                const veh = vehicles.find((v) => v.id === activeTrip.vehicleId);
                return (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-sm font-bold text-slate-100">{veh?.model || 'سيارة المصنع'}</div>
                        <div className="text-xs text-slate-400">{veh?.plateNumber} | الرمز: {veh?.code}</div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-slate-400">عداد البداية</div>
                      <div className="text-sm font-black text-emerald-400">{activeTrip.startOdometer} كم</div>
                    </div>
                  </div>
                );
              })()}

              {/* Completion Action Box */}
              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-4">
                <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  إنهاء الرحلة وتسجيل قراءة العداد النهائية
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      قراءة العداد الحالية (كم) *
                    </label>
                    <input
                      type="number"
                      placeholder={`أكبر من ${activeTrip.startOdometer}`}
                      value={odometerInput}
                      onChange={(e) => setOdometerInput(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">صورة العداد (اختياري)</label>
                    <button
                      type="button"
                      onClick={handleCaptureOdometerPhoto}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <CameraIcon className="w-4 h-4 text-emerald-400" />
                      {odometerPhoto ? 'تم التقاط الصورة ✓' : 'التقاط بالكاميرا'}
                    </button>
                  </div>
                </div>

                {odometerPhoto && (
                  <div className="space-y-1.5 mt-2">
                    <div className="relative inline-block">
                      <img
                        src={odometerPhoto}
                        alt="قراءة العداد"
                        onClick={() => setPreviewImage({ url: odometerPhoto, title: 'معاينة صورة عداد المسافات المضغوطة' })}
                        className="h-20 w-32 object-cover rounded-xl border-2 border-emerald-500 shadow-md cursor-pointer hover:opacity-90 transition"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setOdometerPhoto(null);
                          setOdometerMetrics(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow font-bold"
                        title="حذف الصورة"
                      >
                        ×
                      </button>
                    </div>
                    {odometerMetrics && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          تم الضغط تلقائياً: <strong>{formatBytes(odometerMetrics.compressedSize)}</strong> (وفر {odometerMetrics.savedPercentage}% لسرعة الرفع)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleEndTrip(activeTrip)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition active:scale-[0.99]"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span>تأكيد إنهاء الرحلة وتسجيل الكيلومترات</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-slate-200">لا توجد رحلة جارية حالياً</h3>
              <p className="text-xs text-slate-400 mt-1">اختر رحلة مجدولة من القائمة أدناه للبدء</p>
            </div>
          )}

          {/* Scheduled Trips */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              الرحلات المجدولة والمعلقة ({scheduledTrips.length})
            </h3>

            {scheduledTrips.length === 0 ? (
              <div className="bg-slate-900/30 rounded-xl p-4 text-center text-xs text-slate-500 border border-slate-800">
                لا توجد رحلات مجدولة أخرى مسندة لهذا السائق
              </div>
            ) : (
              scheduledTrips.map((trip) => {
                const veh = vehicles.find((v) => v.id === trip.vehicleId);
                return (
                  <div
                    key={trip.id}
                    className="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {trip.tripCode}
                          </span>
                          <span className="text-xs text-slate-400">{trip.date}</span>
                        </div>
                        <h4 className="text-base font-bold text-white mt-1">{trip.routeName}</h4>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        مجدولة
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mb-4 flex items-center gap-4">
                      <span>المركبة: {veh?.model || trip.vehicleId}</span>
                      <span>العداد المتوقع: {trip.startOdometer} كم</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartTrip(trip)}
                      disabled={!!activeTrip}
                      className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                        activeTrip
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 active:scale-[0.99]'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{activeTrip ? 'أنهِ الرحلة الجارية أولاً' : 'بدء الرحلة الآن'}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Completed Trips Summary */}
          {completedTrips.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-slate-400">
                الرحلات المكتملة حديثاً ({completedTrips.length})
              </h3>
              <div className="space-y-2">
                {completedTrips.slice(0, 3).map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-slate-900/50 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-200">{trip.routeName}</span>
                      <span className="text-slate-500 mr-2">({trip.tripCode})</span>
                    </div>
                    <div className="text-slate-400">
                      <span className="text-emerald-400 font-bold">{trip.distanceKm || 0} كم</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Quick Fuel Entry Form */
        <form
          onSubmit={handleSaveFuel}
          className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-5"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <Fuel className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold text-white">تسجيل تموين وقود للمركبة</h3>
              <p className="text-xs text-slate-400">قم بتسجيل اللترات والتكلفة وصورة الإيصال</p>
            </div>
          </div>

          {fuelSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{fuelSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                المركبة *
              </label>
              <select
                value={fuelVehicleId || (activeTrip?.vehicleId || vehicles[0]?.id)}
                onChange={(e) => setFuelVehicleId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} - {v.model} ({v.plateNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                محطة الوقود *
              </label>
              <input
                type="text"
                required
                value={fuelStation}
                onChange={(e) => setFuelStation(e.target.value)}
                placeholder="مثل: محطة وطنية، شل، موبيل"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كمية الوقود (لتر) *
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={fuelQuantity}
                onChange={(e) => setFuelQuantity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                سعر اللتر (جنيه/ريال) *
              </label>
              <input
                type="number"
                step="0.25"
                required
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                قراءة العداد عند التموين
              </label>
              <input
                type="number"
                value={fuelOdometer}
                onChange={(e) => setFuelOdometer(e.target.value)}
                placeholder="قراءة العداد الحالية"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                إجمالي التكلفة التقديرية
              </label>
              <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3.5 py-2.5 text-emerald-400 font-black text-sm">
                {(parseFloat(fuelQuantity || '0') * parseFloat(fuelPrice || '0')).toLocaleString()}{' '}
                جنيه
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              صورة فاتورة أو إيصال المحطة (اختياري)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCaptureFuelReceipt}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
              >
                <CameraIcon className="w-4 h-4 text-emerald-400" />
                <span>{fuelReceiptPhoto ? 'تغيير صورة الإيصال' : 'تصوير الإيصال بالكاميرا'}</span>
              </button>
              {fuelReceiptPhoto && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  تم إرفاق الإيصال
                </span>
              )}
            </div>
            {fuelReceiptPhoto && (
              <div className="mt-2 space-y-1.5">
                <div className="relative inline-block">
                  <img
                    src={fuelReceiptPhoto}
                    alt="إيصال الوقود"
                    onClick={() => setPreviewImage({ url: fuelReceiptPhoto, title: 'معاينة إيصال الوقود المضغوط' })}
                    className="h-24 w-36 object-cover rounded-xl border-2 border-emerald-500 shadow-md cursor-pointer hover:opacity-90 transition"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFuelReceiptPhoto(null);
                      setFuelReceiptMetrics(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow font-bold"
                    title="حذف الصورة"
                  >
                    ×
                  </button>
                </div>
                {fuelReceiptMetrics && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg max-w-sm">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      تم الضغط تلقائياً: <strong>{formatBytes(fuelReceiptMetrics.compressedSize)}</strong> (وفر {fuelReceiptMetrics.savedPercentage}% لسرعة الرفع)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition active:scale-[0.99]"
          >
            <Fuel className="w-5 h-5" />
            <span>حفظ سجل الوقود</span>
          </button>
        </form>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-4 space-y-3 text-right">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                {previewImage.title}
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center bg-black/40 rounded-xl p-2 max-h-[70vh] overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <span>الصورة معالجة ومضغوطة تلقائياً لقراءة الأرقام والتفاصيل بوضوح</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
