import { Calculator, Clock, MapPin, Navigation, Truck, X, PenTool, RotateCcw, CheckCircle2, ShieldCheck, UserCheck, FileCheck } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Driver, LocationPlace, MainRegion, Region, TripRoute, Vehicle } from '../types';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trip: TripRoute) => void;
  editingTrip?: TripRoute | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  locations: LocationPlace[];
  presetPlace?: { name: string; region: string } | null;
  onOpenNewDriverModal?: () => void;
}

export const TripModal: React.FC<TripModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTrip,
  vehicles,
  drivers,
  locations,
  presetPlace,
  onOpenNewDriverModal,
}) => {
  const [tripCode, setTripCode] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:30');
  const [region, setRegion] = useState<Region>('الإسكندرية');
  const [routeName, setRouteName] = useState('');
  const [startLocation, setStartLocation] = useState('مصنع برج العرب (المصنع الرئيسي)');
  const [destination, setDestination] = useState('');
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [startOdometer, setStartOdometer] = useState<number>(0);
  const [endOdometer, setEndOdometer] = useState<number>(0);
  const [fuelLiters, setFuelLiters] = useState<number>(0);
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<number>(13.5);
  const [tollTaxes, setTollTaxes] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<number>(0);
  const [cargoType, setCargoType] = useState('بضائع وتوريدات المصنع');
  const [status, setStatus] = useState<TripRoute['status']>('مكتملة');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Digital Signature state for Proof of Delivery (POD)
  const [deliverySignature, setDeliverySignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState<string>('');
  const [signerRole, setSignerRole] = useState<'driver' | 'receiver' | 'supervisor'>('driver');
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [isSigningActive, setIsSigningActive] = useState<boolean>(false);
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);

  // Filter locations strictly based on the selected region
  const regionPlaces = useMemo(() => {
    // If a shared route is chosen, include multiple or matched
    if (region === 'خط مشترك (إسكندرية - بحيرة)') {
      return locations.filter((l) => l.region === 'الإسكندرية' || l.region === 'البحيرة');
    }
    if (region === 'خط مشترك (إسكندرية - الساحل)') {
      return locations.filter((l) => l.region === 'الإسكندرية' || l.region === 'الساحل الشمالي');
    }
    return locations.filter((l) => l.region === region);
  }, [locations, region]);

  // When opening or editingTrip changes
  useEffect(() => {
    setErrorMessage('');
    if (editingTrip) {
      setTripCode(editingTrip.tripCode);
      setDate(editingTrip.date);
      setStartTime(editingTrip.startTime || '08:00');
      setEndTime(editingTrip.endTime || '12:30');
      setRegion(editingTrip.region);
      setRouteName(editingTrip.routeName);
      setStartLocation(editingTrip.startLocation || 'مصنع برج العرب (المصنع الرئيسي)');
      setDestination(editingTrip.destination || '');
      setSelectedStops(editingTrip.destinationStops || []);
      setVehicleId(editingTrip.vehicleId);
      setDriverId(editingTrip.driverId);
      setStartOdometer(editingTrip.startOdometer);
      setEndOdometer(editingTrip.endOdometer);
      setFuelLiters(editingTrip.fuelLiters);
      setFuelPricePerLiter(editingTrip.fuelPricePerLiter);
      setTollTaxes(editingTrip.tollTaxes || 0);
      setOtherExpenses(editingTrip.otherExpenses || 0);
      setCargoType(editingTrip.cargoType || 'بضائع وتوريدات المصنع');
      setStatus(editingTrip.status);
      setNotes(editingTrip.notes || '');
      setDeliverySignature(editingTrip.deliverySignature || null);
      setSignerName(editingTrip.signerName || '');
      setSignedAt(editingTrip.signedAt || null);
      setIsSigningActive(!editingTrip.deliverySignature);
    } else {
      const randomCode = `TRIP-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(
        100 + Math.random() * 900
      )}`;
      setTripCode(randomCode);
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('08:00');
      setEndTime('13:00');

      const initialRegion = (presetPlace?.region as Region) || 'الإسكندرية';
      setRegion(initialRegion);

      const availableInRegion = locations.filter((l) => l.region === initialRegion);
      const defaultStart =
        locations.find((l) => l.name.includes('مصنع برج العرب'))?.name ||
        availableInRegion[0]?.name ||
        'مصنع برج العرب (المصنع الرئيسي)';
      setStartLocation(defaultStart);

      const defaultDest =
        presetPlace?.name ||
        availableInRegion.find((l) => l.name !== defaultStart)?.name ||
        availableInRegion[0]?.name ||
        '';
      setDestination(defaultDest);
      setSelectedStops(defaultDest ? [defaultDest] : []);
      setRouteName(`${defaultStart} -> ${defaultDest || 'خط السير'}`);

      const defaultVeh = vehicles[0];
      if (defaultVeh) {
        setVehicleId(defaultVeh.id);
        setStartOdometer(defaultVeh.currentOdometer);
        setEndOdometer(defaultVeh.currentOdometer + 140);
        const assignedDrvId = defaultVeh.assignedDriverId || (drivers[0]?.id ?? '');
        setDriverId(assignedDrvId);
        const assignedDrv = drivers.find((d) => d.id === assignedDrvId) || drivers[0];
        setSignerName(assignedDrv?.name || '');
        const price = defaultVeh.fuelType === 'بنزين 92' ? 15.25 : 13.5;
        setFuelPricePerLiter(price);
        const estLiters = Math.round((140 * defaultVeh.avgConsumptionPer100Km) / 100);
        setFuelLiters(estLiters);
      } else {
        setVehicleId('');
        const firstDrvId = drivers[0]?.id ?? '';
        setDriverId(firstDrvId);
        setSignerName(drivers[0]?.name || '');
        setStartOdometer(0);
        setEndOdometer(120);
        setFuelLiters(15);
        setFuelPricePerLiter(13.5);
      }
      setTollTaxes(30);
      setOtherExpenses(0);
      setCargoType('بضائع وتوريدات المصنع');
      setStatus('مكتملة');
      setNotes('');
      setDeliverySignature(null);
      setSignedAt(null);
      setIsSigningActive(true);
    }
  }, [editingTrip, isOpen, vehicles, drivers, locations, presetPlace]);

  // Handle clearing the signature canvas
  const handleClearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
    setDeliverySignature(null);
    setSignedAt(null);
  };

  // Handle signature stroke completion
  const handleSignatureEnd = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      try {
        const trimmed = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
        setDeliverySignature(trimmed);
        if (!signedAt) {
          setSignedAt(new Date().toISOString());
        }
      } catch {
        const raw = sigCanvasRef.current.toDataURL('image/png');
        setDeliverySignature(raw);
        if (!signedAt) {
          setSignedAt(new Date().toISOString());
        }
      }
    }
  };

  // Handle driver change and sync signer name if role is driver
  const handleDriverChange = (selectedDriverId: string) => {
    setDriverId(selectedDriverId);
    if (signerRole === 'driver') {
      const drv = drivers.find((d) => d.id === selectedDriverId);
      if (drv) {
        setSignerName(drv.name);
      }
    }
  };

  // Handle region change: automatically filter and update places
  const handleRegionChange = (newRegion: Region) => {
    setRegion(newRegion);
    let matchedPlaces: LocationPlace[] = [];
    if (newRegion === 'خط مشترك (إسكندرية - بحيرة)') {
      matchedPlaces = locations.filter((l) => l.region === 'الإسكندرية' || l.region === 'البحيرة');
    } else if (newRegion === 'خط مشترك (إسكندرية - الساحل)') {
      matchedPlaces = locations.filter(
        (l) => l.region === 'الإسكندرية' || l.region === 'الساحل الشمالي'
      );
    } else {
      matchedPlaces = locations.filter((l) => l.region === newRegion);
    }

    if (matchedPlaces.length > 0) {
      // Keep factory as start if in Alexandria or shared, otherwise pick first place of region
      const factoryPlace = matchedPlaces.find((l) => l.name.includes('مصنع برج العرب'));
      const newStart = factoryPlace ? factoryPlace.name : matchedPlaces[0].name;
      const newDest = matchedPlaces.find((l) => l.name !== newStart)?.name || matchedPlaces[0].name;

      setStartLocation(newStart);
      setDestination(newDest);
      setSelectedStops([newDest]);
      setRouteName(`${newStart} -> ${newDest}`);
    }
  };

  // When start location changes
  const handleStartLocationChange = (val: string) => {
    setStartLocation(val);
    setRouteName(`${val} -> ${destination || '...'}`);
  };

  // When destination changes
  const handleDestinationChange = (val: string) => {
    setDestination(val);
    if (!selectedStops.includes(val) && val) {
      setSelectedStops([...selectedStops, val]);
    }
    setRouteName(`${startLocation || '...'} -> ${val}`);
  };

  // When selected vehicle changes, adjust start odometer and fuel defaults
  const handleVehicleChange = (selectedVehId: string) => {
    setVehicleId(selectedVehId);
    const veh = vehicles.find((v) => v.id === selectedVehId);
    if (veh) {
      if (!editingTrip) {
        setStartOdometer(veh.currentOdometer);
        setEndOdometer(veh.currentOdometer + 140);
        if (veh.assignedDriverId) {
          setDriverId(veh.assignedDriverId);
        }
        const price = veh.fuelType === 'بنزين 92' ? 15.25 : 13.5;
        setFuelPricePerLiter(price);
        const estLiters = Math.round((140 * veh.avgConsumptionPer100Km) / 100);
        setFuelLiters(estLiters);
      }
    }
  };

  const distanceKm = Math.max(0, endOdometer - startOdometer);
  const fuelTotalCost = Math.round(fuelLiters * fuelPricePerLiter * 100) / 100;
  const tripCostTotal = Math.round((fuelTotalCost + tollTaxes + otherExpenses) * 100) / 100;

  // Auto calculate fuel estimation based on vehicle rate
  const autoEstimateFuel = () => {
    const veh = vehicles.find((v) => v.id === vehicleId);
    if (veh && distanceKm > 0) {
      const est = Math.round(((distanceKm * veh.avgConsumptionPer100Km) / 100) * 10) / 10;
      setFuelLiters(est);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startLocation.trim()) {
      setErrorMessage('يرجى تحديد أو إدخال نقطة الانطلاق');
      return;
    }
    if (!destination.trim()) {
      setErrorMessage('يرجى تحديد أو إدخال الوجهة الرئيسية');
      return;
    }

    const finalRoute = routeName.trim() || `${startLocation} -> ${destination}`;

    // Extract signature data if drawn on canvas
    let finalSignature = deliverySignature;
    if (isSigningActive && sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      try {
        finalSignature = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
      } catch {
        finalSignature = sigCanvasRef.current.toDataURL('image/png');
      }
    }

    const currentDriver = drivers.find((d) => d.id === (driverId || (drivers[0]?.id ?? 'drv-1')));
    const finalSignerName = finalSignature
      ? signerName.trim() || currentDriver?.name || 'السائق المسؤول'
      : undefined;
    const finalSignedAt = finalSignature ? (signedAt || new Date().toISOString()) : undefined;

    const trip: TripRoute = {
      id: editingTrip ? editingTrip.id : `trip-${Date.now()}`,
      tripCode,
      date,
      startTime,
      endTime,
      region,
      routeName: finalRoute,
      startLocation: startLocation.trim(),
      destination: destination.trim(),
      destinationStops: selectedStops.length > 0 ? selectedStops : [destination.trim()],
      vehicleId: vehicleId || (vehicles[0]?.id ?? 'V-01'),
      driverId: driverId || (drivers[0]?.id ?? 'drv-1'),
      startOdometer,
      endOdometer,
      distanceKm,
      fuelLiters,
      fuelPricePerLiter,
      fuelTotalCost,
      tollTaxes,
      otherExpenses,
      tripCostTotal,
      status,
      cargoType,
      notes,
      deliverySignature: finalSignature || undefined,
      signerName: finalSignerName,
      signedAt: finalSignedAt,
    };

    onSave(trip);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 my-6 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingTrip ? 'تعديل بيانات رحلة خط سير' : 'تسجيل رحلة خط سير جديدة لأسطول المصنع'}
              </h3>
              <p className="text-xs text-slate-300">
                ربط الرحلة بالمنطقة والأماكن التابعة مع احتساب المسافات والتكاليف آلياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Row 1: Code, Date, Start & End Time */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
            <div>
              <label className="block text-slate-700 font-bold mb-1">كود الرحلة</label>
              <input
                type="text"
                required
                value={tripCode}
                onChange={(e) => setTripCode(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">تاريخ الرحلة</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>وقت البداية</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>وقت النهاية</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Row 2: Region Selection & Cascading Places */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-emerald-950 font-bold">
                1. اختيار المنطقة الرئيسية للرحلة <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-emerald-800">
                (تظهر فقط الأماكن التابعة للمنطقة المختارة)
              </span>
            </div>

            {/* Region Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {(['الإسكندرية', 'الساحل الشمالي', 'البحيرة'] as Region[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => handleRegionChange(r)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                    region === r
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Start Location and Destination Dropdowns Filtered by Region */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>نقطة الانطلاق (أماكن {region})</span>
                </label>
                <select
                  value={startLocation}
                  onChange={(e) => handleStartLocationChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
                >
                  {regionPlaces.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                  <option value="نقطة أخرى مخصصة">نقطة أخرى مخصصة...</option>
                </select>
                {startLocation === 'نقطة أخرى مخصصة' && (
                  <input
                    type="text"
                    placeholder="اكتب اسم نقطة الانطلاق..."
                    onChange={(e) => handleStartLocationChange(e.target.value)}
                    className="mt-1.5 w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-900"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>الوجهة الرئيسية (أماكن {region})</span>
                </label>
                <select
                  value={destination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
                >
                  <option value="">اختر الوجهة من أماكن {region}...</option>
                  {regionPlaces.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                  <option value="وجهة أخرى مخصصة">وجهة أخرى مخصصة...</option>
                </select>
                {destination === 'وجهة أخرى مخصصة' && (
                  <input
                    type="text"
                    placeholder="اكتب اسم الوجهة..."
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    className="mt-1.5 w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-900"
                  />
                )}
              </div>
            </div>

            {/* Route Name Summary */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                مسار خط السير المتكامل (تحديث تلقائي)
              </label>
              <input
                type="text"
                required
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="مثال: مصنع برج العرب -> سموحة (نقطة التوزيع)"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Row 3: Vehicle & Driver Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 font-bold mb-1">
                السيارة من أسطول المصنع <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
              >
                {vehicles.length === 0 ? (
                  <option value="">لا توجد سيارات مسجلة</option>
                ) : (
                  vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} - {v.model} ({v.currentOdometer.toLocaleString('en-US')} كم)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-800 font-bold">
                  السائق المسؤول <span className="text-rose-500">*</span>
                </label>
                {onOpenNewDriverModal && (
                  <button
                    type="button"
                    onClick={onOpenNewDriverModal}
                    className="text-[11px] text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ إضافة سائق جديد</span>
                  </button>
                )}
              </div>
              <select
                required
                value={driverId}
                onChange={(e) => handleDriverChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
              >
                {drivers.length === 0 ? (
                  <option value="">لا يوجد سائقين مسجلين</option>
                ) : (
                  drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.licenseDegree}) - {d.status}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Row 4: Start & End Odometer with automatic distance calculation */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">قراءات العداد والمسافة المقطوعة</span>
              <span className="text-[11px] text-slate-500">تحسب تلقائياً من فرق القراءتين</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">قراءة البداية (كم)</label>
                <input
                  type="number"
                  min={0}
                  value={startOdometer}
                  onChange={(e) => setStartOdometer(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">قراءة النهاية (كم)</label>
                <input
                  type="number"
                  min={startOdometer}
                  value={endOdometer}
                  onChange={(e) => setEndOdometer(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">صافي المسافة (كم)</label>
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg font-mono font-black text-emerald-800 text-sm flex items-center justify-between">
                  <span>{distanceKm}</span>
                  <span className="text-xs">كم</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 5: Fuel & Expenses Calculations */}
          <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900">تكاليف الوقود والمصروفات الإدارية</span>
              <button
                type="button"
                onClick={autoEstimateFuel}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded-md border border-blue-200"
              >
                <Calculator className="w-3 h-3 text-blue-600" />
                تقدير الاستهلاك حسب معدل السيارة
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">لترات الوقود</label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">سعر اللتر (ج.م)</label>
                <input
                  type="number"
                  step="0.25"
                  min={0}
                  value={fuelPricePerLiter}
                  onChange={(e) => setFuelPricePerLiter(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">كارتات وبوابات (ج.م)</label>
                <input
                  type="number"
                  min={0}
                  value={tollTaxes}
                  onChange={(e) => setTollTaxes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">إكراميات ومصاريف (ج.م)</label>
                <input
                  type="number"
                  min={0}
                  value={otherExpenses}
                  onChange={(e) => setOtherExpenses(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Total display box */}
            <div className="bg-white p-3 rounded-lg border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500">تكلفة الوقود: </span>
                <strong className="text-blue-900 font-mono">{fuelTotalCost} ج.م</strong>
                <span className="text-slate-400 mx-1.5">+</span>
                <span className="text-slate-500">المصروفات: </span>
                <strong className="text-slate-800 font-mono">{tollTaxes + otherExpenses} ج.م</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 ml-2">الإجمالي للرحلة:</span>
                <strong className="text-emerald-700 text-base font-black font-mono">
                  {tripCostTotal} ج.م
                </strong>
              </div>
            </div>
          </div>

          {/* Row 6: Cargo & Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">طبيعة الحمولة / البضاعة</label>
              <input
                type="text"
                value={cargoType}
                onChange={(e) => setCargoType(e.target.value)}
                placeholder="مثال: كراتين مواد غذائية، مجمدات، مواد خام..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">حالة الرحلة</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TripRoute['status'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
              >
                <option value="مكتملة">مكتملة (تم الوصول وتحديث العداد آلياً)</option>
                <option value="جارية حالياً">جارية حالياً على الطريق</option>
                <option value="مجدولة">مجدولة لاحقاً</option>
                <option value="ملغاة">ملغاة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">ملاحظات خط السير (اختياري)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات تخص حالة الطريق، الفواتير أو التسليم..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Row 7: Digital Signature for Cargo Handover & Delivery (react-signature-canvas) */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <span>التوقيع الرقمي لتسليم الحمولة وإتمام الرحلة</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-mono">Digital POD</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    توقيع إلكتروني حي موثق يثبت استلام وتسليم البضاعة وتأكيد إتمام خط السير
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                {deliverySignature ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم توثيق التوقيع</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>في انتظار توقيع التسليم</span>
                  </span>
                )}
              </div>
            </div>

            {/* Signer Details: Role & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-700 font-bold mb-1">صفة الموقّع</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSignerRole('driver');
                      const drv = drivers.find((d) => d.id === driverId);
                      if (drv) setSignerName(drv.name);
                    }}
                    className={`py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                      signerRole === 'driver'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    السائق
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignerRole('receiver');
                      setSignerName('');
                    }}
                    className={`py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                      signerRole === 'receiver'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    المستلم
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignerRole('supervisor');
                      setSignerName('مشرف الحركة');
                    }}
                    className={`py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                      signerRole === 'supervisor'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    المشرف
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span>اسم الشخص الموقّع</span>
                  {signedAt && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      التوقيت: {new Date(signedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder={
                    signerRole === 'driver'
                      ? 'اسم السائق المسلم...'
                      : signerRole === 'receiver'
                      ? 'اسم مسؤول الاستلام في الوجهة...'
                      : 'اسم المشرف المسؤول...'
                  }
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            {/* Signature Canvas / Preview Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 font-bold flex items-center gap-1">
                  <span>مساحة التوقيع الرقمي (باللمس أو القلم / الماوس)</span>
                  <span className="text-slate-400 text-[11px] font-normal">(مطلوب لتأكيد التسليم)</span>
                </label>

                <div className="flex items-center gap-2">
                  {deliverySignature && !isSigningActive ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSigningActive(true);
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 cursor-pointer"
                    >
                      <PenTool className="w-3 h-3" />
                      <span>تعديل أو إعادة التوقيع</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClearSignature}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-rose-200 hover:bg-rose-50 cursor-pointer transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>مسح التوقيع</span>
                    </button>
                  )}
                </div>
              </div>

              {deliverySignature && !isSigningActive ? (
                <div className="relative bg-white border border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center min-h-[160px] shadow-inner">
                  <img
                    src={deliverySignature}
                    alt="توقيع تسليم الحمولة"
                    className="max-h-32 max-w-full object-contain filter drop-shadow-sm"
                  />
                  <div className="w-full mt-2 pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>الموقّع: <strong className="text-slate-800">{signerName || 'غير محدد'}</strong></span>
                    </span>
                    {signedAt && (
                      <span className="font-mono text-[10px]">
                        {new Date(signedAt).toLocaleDateString('ar-EG')} - {new Date(signedAt).toLocaleTimeString('ar-EG')}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden shadow-inner">
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="#0f172a"
                    velocityFilterWeight={0.7}
                    minWidth={1.5}
                    maxWidth={3.5}
                    canvasProps={{
                      className: 'w-full h-40 touch-none cursor-crosshair bg-white',
                      style: { width: '100%', height: '160px' },
                    }}
                    onEnd={handleSignatureEnd}
                  />

                  {/* Guide text & dotted line */}
                  <div className="absolute inset-x-0 bottom-4 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-3/4 border-b border-dashed border-slate-300 mb-1" />
                    <span className="text-[10px] text-slate-400 font-medium">
                      وقع هنا باللمس أو القلم لتأكيد استلام وتسليم البضاعة
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Truck className="w-4 h-4" />
              <span>{editingTrip ? 'حفظ التعديلات' : 'تسجيل وحفظ الرحلة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
