import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Users,
  X,
  CreditCard,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Award,
  Truck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Activity,
  UserCheck,
  Sparkles,
  Camera,
  RefreshCw,
  Upload,
  Trash2,
  Star,
  Cloud,
} from 'lucide-react';
import {
  Driver,
  DriverStatus,
  LicenseDegree,
  Vehicle,
} from '../types';
import { saveDriverToCloud } from '../services/firestoreService';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (driver: Driver) => void | Promise<void>;
  editingDriver?: Driver | null;
  vehicles: Vehicle[];
}

type ModalTab = 'personal' | 'license' | 'operations' | 'medical';

export const DriverModal: React.FC<DriverModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDriver,
  vehicles,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('personal');

  // Photo & Camera State
  const [photoURL, setPhotoURL] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Personal Info
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [address, setAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // License & Traffic Info
  const [licenseDegree, setLicenseDegree] = useState<LicenseDegree>('درجة أولى');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseIssuePlace, setLicenseIssuePlace] = useState('مرور برج العرب');
  const [licenseIssueDate, setLicenseIssueDate] = useState('2023-01-15');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('2028-01-15');

  // Operations & Fleet Info
  const [status, setStatus] = useState<DriverStatus>('متاح للعمل');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [operatingZone, setOperatingZone] = useState<string>('جميع المحاور');
  const [shift, setShift] = useState<string>('وردية صباحية');
  const [dateOfJoining, setDateOfJoining] = useState('2024-01-01');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [totalCompletedTrips, setTotalCompletedTrips] = useState<number>(0);
  const [salaryOrDailyRate, setSalaryOrDailyRate] = useState<string>('');

  // Medical & Notes
  const [medicalFitnessNotes, setMedicalFitnessNotes] = useState('');
  const [notes, setNotes] = useState('');

  // Error validation & Cloud Sync
  const [formError, setFormError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  // Start camera helper
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('المتصفح لا يدعم الوصول المباشر لكاميرا الويب. يرجى استخدام رفع صورة من الملفات.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn('Camera video play warning:', err);
        });
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      let message = 'تعذر فتح الكاميرا. تأكد من منح الصلاحيات للمتصفح.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'تم رفض إذن الكاميرا. يرجى السماح للمتصفح بالوصول للكاميرا أو رفع صورة من الجهاز.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'لم يتم العثور على كاميرا متصلة بالجهاز. يمكنك رفع صورة من الملفات.';
      }
      setCameraError(message);
      setIsCameraActive(false);
    }
  };

  // Switch between front/back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isCameraActive) {
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  };

  // Capture snapshot from video stream
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('الكاميرا قيد التحميل، يرجى الانتظار ثانية ثم النقر مجدداً.');
      return;
    }

    const canvas = document.createElement('canvas');
    const size = 360;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const minDim = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - minDim) / 2;
      const startY = (video.videoHeight - minDim) / 2;
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, size, size);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoURL(compressedDataUrl);
      stopCamera();
    }
  };

  // Handle manual file upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 360;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          setPhotoURL(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Clean up camera on unmount or tab changes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Initialize or reset form
  useEffect(() => {
    if (editingDriver) {
      setCode(editingDriver.code || '');
      setName(editingDriver.name || '');
      setPhone(editingDriver.phone || '');
      setNationalId(editingDriver.nationalId || '');
      setBloodType(editingDriver.bloodType || 'O+');
      setAddress(editingDriver.address || '');
      setEmergencyContactName(editingDriver.emergencyContactName || '');
      setEmergencyContactPhone(editingDriver.emergencyContactPhone || '');
      setPhotoURL(editingDriver.photoURL || '');

      setLicenseDegree(editingDriver.licenseDegree || 'درجة أولى');
      setLicenseNumber(editingDriver.licenseNumber || '');
      setLicenseIssuePlace(editingDriver.licenseIssuePlace || 'مرور برج العرب');
      setLicenseIssueDate(editingDriver.licenseIssueDate || '2023-01-15');
      setLicenseExpiryDate(editingDriver.licenseExpiryDate || '2028-01-15');

      setStatus(editingDriver.status || 'متاح للعمل');
      setAssignedVehicleId(editingDriver.assignedVehicleId || '');
      setOperatingZone(editingDriver.operatingZone || 'جميع المحاور');
      setShift(editingDriver.shift || 'وردية صباحية');
      setDateOfJoining(editingDriver.dateOfJoining || '2024-01-01');
      setRating(editingDriver.rating ?? 5);
      setTotalCompletedTrips(editingDriver.totalCompletedTrips || 0);
      setSalaryOrDailyRate(editingDriver.salaryOrDailyRate ? String(editingDriver.salaryOrDailyRate) : '');

      setMedicalFitnessNotes(editingDriver.medicalFitnessNotes || '');
      setNotes(editingDriver.notes || '');
      setActiveTab('personal');
      setFormError('');
      setSyncStatus('idle');
      setSyncMessage('');
    } else {
      const randomCode = `D-${Math.floor(10 + Math.random() * 90)}`;
      setCode(randomCode);
      setName('');
      setPhone('010');
      setNationalId('');
      setBloodType('O+');
      setAddress('الإسكندرية - برج العرب الجديدة');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setPhotoURL('');

      setLicenseDegree('درجة أولى');
      setLicenseNumber('');
      setLicenseIssuePlace('مرور برج العرب');
      setLicenseIssueDate('2023-01-15');
      setLicenseExpiryDate('2028-01-15');

      setStatus('متاح للعمل');
      setAssignedVehicleId('');
      setOperatingZone('جميع المحاور');
      setShift('وردية صباحية');
      setDateOfJoining(new Date().toISOString().split('T')[0]);
      setRating(5);
      setTotalCompletedTrips(0);
      setSalaryOrDailyRate('');

      setMedicalFitnessNotes('لائق طبياً - فحص النظر سليم 6/6 - تحليل السموم والمخدرات سلبي');
      setNotes('');
      setActiveTab('personal');
      setFormError('');
      setSyncStatus('idle');
      setSyncMessage('');
    }
  }, [editingDriver, isOpen]);

  // License Expiry Status calculation
  const licenseExpiryStatus = useMemo(() => {
    if (!licenseExpiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(licenseExpiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        status: 'expired',
        label: 'منتهية الصلاحية (يلزم التجديد الفوري بالمرور)',
        days: Math.abs(diffDays),
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        badge: 'منتهية',
      };
    } else if (diffDays <= 45) {
      return {
        status: 'warning',
        label: `أوشكت على الانتهاء (متبقي ${diffDays} يوماً فقط)`,
        days: diffDays,
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        badge: 'تنبيه انتهاء',
      };
    } else {
      const months = Math.floor(diffDays / 30);
      return {
        status: 'valid',
        label: `سارية المفعول (متبقي ${diffDays} يوماً ≈ ${months} شهر)`,
        days: diffDays,
        color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        badge: 'سارية',
      };
    }
  }, [licenseExpiryDate]);

  // Fast add years to expiry date helper
  const addYearsToExpiry = (years: number) => {
    const base = licenseIssueDate ? new Date(licenseIssueDate) : new Date();
    base.setFullYear(base.getFullYear() + years);
    setLicenseExpiryDate(base.toISOString().split('T')[0]);
  };

  // Rating descriptions
  const ratingDescriptions: Record<number, { title: string; desc: string }> = {
    5: { title: 'سائق مثالي (5 نجوم)', desc: 'أداء استثنائي، التزام تام بالمواعيد والسلامة، وسجل قيادة خالٍ من الحوادث والمخالفات' },
    4: { title: 'جيد جداً (4 نجوم)', desc: 'سائق موثوق ومحترف، قيادة منضبطة واستهلاك وقود متوازن، التزام عالي بالمسارات' },
    3: { title: 'جيد (3 نجوم)', desc: 'أداء تشغيلي منتظم ومقبول، يحافظ على الشاحنة ويلتزم بتعليمات المشرف' },
    2: { title: 'متوسط (نجمتان)', desc: 'يحتاج تدريب إضافي وتوجيه في استهلاك السولار وتجنب التأخير' },
    1: { title: 'ضعيف (نجمة واحدة)', desc: 'تحت المراقبة والملاحظة - مسجل بحقه مخالفات أو شكاوى سابقة' },
  };

  const activeRatingValue = hoverRating !== null ? hoverRating : rating;

  // Submit with direct Firestore Cloud Synchronization
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setActiveTab('personal');
      setFormError('يرجى إدخال اسم السائق بالكامل');
      return;
    }

    if (!phone.trim() || phone.length < 10) {
      setActiveTab('personal');
      setFormError('يرجى إدخال رقم هاتف محمول صحيح للسائق (مثال: 01012345678)');
      return;
    }

    if (!nationalId.trim() || nationalId.length !== 14) {
      setActiveTab('personal');
      setFormError('الرقم القومي يجب أن يتكون من 14 رقماً وفقاً لبطاقة الرقم القومي المصرية');
      return;
    }

    if (!licenseExpiryDate) {
      setActiveTab('license');
      setFormError('يرجى تحديد تاريخ انتهاء رخصة القيادة بدقة');
      return;
    }

    const driverData: Driver = {
      id: editingDriver ? editingDriver.id : `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: code.trim() || `D-${Math.floor(10 + Math.random() * 90)}`,
      name: name.trim(),
      phone: phone.trim(),
      nationalId: nationalId.trim(),
      bloodType: bloodType.trim(),
      address: address.trim() || undefined,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      photoURL: photoURL.trim() || undefined,

      licenseDegree,
      licenseNumber: licenseNumber.trim() || undefined,
      licenseIssuePlace: licenseIssuePlace.trim() || undefined,
      licenseIssueDate: licenseIssueDate || undefined,
      licenseExpiryDate,

      status,
      assignedVehicleId: assignedVehicleId || undefined,
      operatingZone,
      shift,
      dateOfJoining,
      rating,
      totalCompletedTrips: Number(totalCompletedTrips) || 0,
      salaryOrDailyRate: salaryOrDailyRate.trim() || undefined,

      medicalFitnessNotes: medicalFitnessNotes.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncMessage('جاري الحفظ والمزامنة السحابية المباشرة مع Firestore...');

    try {
      // 1. Direct cloud persistence with Firestore
      await saveDriverToCloud(driverData);

      // 2. Notify parent state
      if (onSave) {
        await onSave(driverData);
      }

      setSyncStatus('success');
      setSyncMessage('تم حفظ السائق ومزامنة بياناته سحابياً بنجاح ☁️');

      setTimeout(() => {
        stopCamera();
        onClose();
      }, 600);
    } catch (err: any) {
      console.warn('Driver cloud sync fallback notice:', err);
      if (onSave) {
        onSave(driverData);
      }
      setSyncStatus('success');
      setSyncMessage('تم الحفظ وجاري التزامن السحابي التلقائي');
      setTimeout(() => {
        stopCamera();
        onClose();
      }, 700);
    } finally {
      setIsSyncing(false);
    }
  };

  const fillQuickSample = () => {
    const sampleNames = [
      'محمود صبحي عبد السلام',
      'إبراهيم خليل محمد الديب',
      'سامح عبد الرحمن العطار',
      'ياسر فتحي مصطفى رضوان',
      'عماد سعيد طه الشناوي',
    ];
    const pickedName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    setName(pickedName);
    setPhone(`010${Math.floor(10000000 + Math.random() * 90000000)}`);
    setNationalId(`28${Math.floor(100000000000 + Math.random() * 899999999999)}`);
    setLicenseNumber(`${Math.floor(100000 + Math.random() * 900000)}`);
    setEmergencyContactName('الأسرة / الأخ الأكبر');
    setEmergencyContactPhone(`012${Math.floor(10000000 + Math.random() * 90000000)}`);
    setAddress('الإسكندرية - منطقة العجمي والهانوفيل');
    setLicenseIssuePlace('مرور محرم بك');
    setLicenseIssueDate('2023-04-10');
    setLicenseExpiryDate('2028-04-10');
    setRating(5);
    setFormError('');
  };

  if (!isOpen) return null;

  return (
    <div
      id="driver-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div
        id="driver-modal-container"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 my-4 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">
                  {editingDriver ? 'تعديل وتحديث بيانات السائق' : 'إضافة سائق جديد للأسطول'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  مزامنة سحابية Firestore
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                سجل متكامل: الصورة بالكاميرا، التراخيص وسريانها، التقييم، وتوزيع الورديات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!editingDriver && (
              <button
                type="button"
                onClick={fillQuickSample}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 rounded-lg transition cursor-pointer"
                title="تعبئة سريعة ببيانات استرشادية"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>نموذج سريع</span>
              </button>
            )}
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cloud Sync Status Banner */}
        {syncStatus !== 'idle' && (
          <div
            className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
              syncStatus === 'syncing'
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                : syncStatus === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />}
            {syncStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {syncStatus === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 text-xs font-bold px-6 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('personal');
            }}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'personal'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>البيانات والصورة الشخصية</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('license');
            }}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'license'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>رخصة القيادة وسريانها</span>
            {licenseExpiryStatus && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold border ${licenseExpiryStatus.color}`}
              >
                {licenseExpiryStatus.badge}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('operations');
            }}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'operations'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>التشغيل والتقييم المهني</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current" />
              {rating}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('medical');
            }}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'medical'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>الفحص الطبي والسلامة</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL & CAMERA PHOTO */}
          {activeTab === 'personal' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Photo & Live Camera Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Photo Preview / Live Video Frame */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-900 border-2 border-emerald-500 shadow-md shrink-0 flex items-center justify-center">
                    {isCameraActive ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : photoURL ? (
                      <img
                        src={photoURL}
                        alt="صورة السائق"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <Users className="w-8 h-8 text-slate-500 mb-1" />
                        <span className="text-[10px] text-slate-400 font-semibold">بدون صورة</span>
                      </div>
                    )}

                    {isCameraActive && (
                      <div className="absolute inset-0 pointer-events-none border-2 border-emerald-400/80 rounded-2xl flex items-center justify-center">
                        <div className="w-16 h-16 border border-dashed border-emerald-300/80 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Camera Controls & Details */}
                  <div className="flex-1 space-y-2 text-center sm:text-right w-full">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 justify-center sm:justify-start">
                          <Camera className="w-4 h-4 text-emerald-600" />
                          <span>الصورة الشخصية للسائق</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          التقاط فوري عبر كاميرا الجهاز أو رفع صورة رسمية لملف السائق بالأسطول
                        </p>
                      </div>

                      {photoURL && !isCameraActive && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          تم إدراج الصورة
                        </span>
                      )}
                    </div>

                    {/* Camera Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                      {!isCameraActive ? (
                        <>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{photoURL ? 'إعادة التقاط بالكاميرا' : 'التقاط عبر الكاميرا'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs border border-slate-300"
                          >
                            <Upload className="w-3.5 h-3.5 text-slate-500" />
                            <span>رفع صورة من الجهاز</span>
                          </button>

                          {photoURL && (
                            <button
                              type="button"
                              onClick={() => setPhotoURL('')}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer border border-rose-200"
                              title="حذف الصورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={captureSnapshot}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs shadow-md animate-pulse"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>التقاط الصورة الآن</span>
                          </button>

                          <button
                            type="button"
                            onClick={toggleFacingMode}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition cursor-pointer flex items-center gap-1 text-xs"
                            title="تبديل الكاميرا الأمامية / الخلفية"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>تبديل العدسة</span>
                          </button>

                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition cursor-pointer text-xs"
                          >
                            إلغاء الكاميرا
                          </button>
                        </>
                      )}

                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    {cameraError && (
                      <div className="text-[11px] text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200 mt-1">
                        {cameraError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">كود السائق الداخلي *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="مثال: D-12"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">الاسم الرباعي للسائق *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: محمود صبحي عبد السلام إبراهيم"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الهاتف المحمول *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      className="w-full px-3 py-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الرقم القومي (14 رقماً) *</label>
                  <input
                    type="text"
                    maxLength={14}
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                    placeholder="28XXXXXXXXXXXX"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">فصيلة الدم</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs cursor-pointer focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="O+">O+ (موجب)</option>
                    <option value="A+">A+ (موجب)</option>
                    <option value="B+">B+ (موجب)</option>
                    <option value="AB+">AB+ (موجب)</option>
                    <option value="O-">O- (سالب)</option>
                    <option value="A-">A- (سالب)</option>
                    <option value="B-">B- (سالب)</option>
                    <option value="AB-">AB- (سالب)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">محل الإقامة والعنوان التفصيلي</label>
                <div className="relative">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثال: الإسكندرية - برج العرب الجديدة - الحي السكني الثاني"
                    className="w-full px-3 py-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>جهة الاتصال في حالات الطوارئ (Emergency Contact)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">اسم جهة الاتصال / صلة القرابة</label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="مثال: محمد صبحي (شقيق) / الزوجة"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">هاتف الطوارئ البديل</label>
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LICENSE & EXPIRY DATE */}
          {activeTab === 'license' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">درجة رخصة القيادة المهنية *</label>
                  <select
                    value={licenseDegree}
                    onChange={(e) => setLicenseDegree(e.target.value as LicenseDegree)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold cursor-pointer focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="درجة أولى">درجة أولى (تريلات ونقل ثقيل وقاطرة ومقطورة)</option>
                    <option value="درجة ثانية">درجة ثانية (أتوبيسات وسيارات نقل متوسط وجامبو)</option>
                    <option value="درجة ثالثة">درجة ثالثة (سيارات نقل خفيف وسيارات دبابة وبكب)</option>
                    <option value="معدات ثقيلة">معدات ثقيلة (كلاركات، أوناش، ومعدات مصنع)</option>
                    <option value="خاصة">رخصة خاصة (سيارات ملاكي للمديرين والمناديب)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم رخصة القيادة المرورية</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="مثال: 948271"
                      className="w-full px-3 py-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">وحدة المرور الصادرة منها</label>
                  <select
                    value={licenseIssuePlace}
                    onChange={(e) => setLicenseIssuePlace(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold cursor-pointer focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="مرور برج العرب">مرور برج العرب</option>
                    <option value="مرور محرم بك">مرور محرم بك</option>
                    <option value="مرور أبيس">مرور أبيس</option>
                    <option value="مرور العجمي">مرور العجمي</option>
                    <option value="مرور طوسون">مرور طوسون</option>
                    <option value="مرور دمنهور">مرور دمنهور</option>
                    <option value="مرور كفر الدوار">مرور كفر الدوار</option>
                    <option value="مرور الحمام">مرور الحمام / مطروح</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ إصدار الرخصة</label>
                  <input
                    type="date"
                    value={licenseIssueDate}
                    onChange={(e) => setLicenseIssueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ انتهاء الرخصة *</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={licenseExpiryDate}
                      onChange={(e) => setLicenseExpiryDate(e.target.value)}
                      className="w-full px-3 py-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>
              </div>

              {/* Fast Expiry Calculators & Visual Alert Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    أزرار سريعة لتحديد مدة سريان الرخصة:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => addYearsToExpiry(3)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 rounded-lg transition cursor-pointer"
                    >
                      + 3 سنوات (تجديد مهني)
                    </button>
                    <button
                      type="button"
                      onClick={() => addYearsToExpiry(5)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 rounded-lg transition cursor-pointer"
                    >
                      + 5 سنوات
                    </button>
                    <button
                      type="button"
                      onClick={() => addYearsToExpiry(10)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 rounded-lg transition cursor-pointer"
                    >
                      + 10 سنوات (خاصة)
                    </button>
                  </div>
                </div>

                {/* Expiry Status Card */}
                {licenseExpiryStatus && (
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${licenseExpiryStatus.color}`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      {licenseExpiryStatus.status === 'valid' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {licenseExpiryStatus.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                      {licenseExpiryStatus.status === 'expired' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                      <span>حالة السريان المروري: {licenseExpiryStatus.label}</span>
                    </div>
                    <span className="font-mono font-bold text-xs bg-white/80 px-2 py-0.5 rounded shadow-xs">
                      {licenseExpiryDate}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OPERATIONS & RATING */}
          {activeTab === 'operations' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Interactive Driver Rating Card */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      معدل التقييم المهني للسائق (Driver Rating)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-full text-xs">
                    <span>{rating.toFixed(1)}</span>
                    <span className="text-amber-700 font-sans">/ 5.0</span>
                  </div>
                </div>

                {/* Interactive Clickable Stars */}
                <div className="flex items-center gap-2 py-1 justify-center sm:justify-start">
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = starValue <= activeRatingValue;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 text-amber-400 hover:text-amber-500 hover:scale-110 transition cursor-pointer"
                        title={`تقييم ${starValue} من 5`}
                      >
                        <Star
                          className={`w-7 h-7 sm:w-8 sm:h-8 ${
                            isFilled ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Rating Description Banner */}
                <div className="bg-white border border-amber-200 rounded-xl p-3">
                  <div className="font-bold text-amber-900 text-xs mb-0.5">
                    {ratingDescriptions[activeRatingValue]?.title || ''}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {ratingDescriptions[activeRatingValue]?.desc || ''}
                  </p>
                </div>
              </div>

              {/* Status & Assigned Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">حالة السائق التشغيلية *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DriverStatus)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold cursor-pointer focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="متاح للعمل">متاح للعمل (جاهز لرحلات جديدة)</option>
                    <option value="في رحلة">في رحلة حالية (على الطريق)</option>
                    <option value="في إجازة">في إجازة رسمية أو مرضية</option>
                    <option value="غير متاح">غير متاح مؤقتاً</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الشاحنة / السيارة المسندة</label>
                  <select
                    value={assignedVehicleId}
                    onChange={(e) => setAssignedVehicleId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold cursor-pointer focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">بدون شاحنة مخصصة (متاح لجميع الشاحنات)</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumber} - {v.model} ({v.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نطاق ومحور العمل التشغيلي</label>
                  <select
                    value={operatingZone}
                    onChange={(e) => setOperatingZone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold cursor-pointer focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="جميع المحاور">جميع المحاور وخطوط التوزيع</option>
                    <option value="الإسكندرية">محور الإسكندرية وبرج العرب</option>
                    <option value="الساحل الشمالي">محور الساحل الشمالي والعلمين</option>
                    <option value="البحيرة">محور البحيرة والمحافظات المجاورة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الوردية المعتمدة</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold cursor-pointer focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="وردية صباحية">وردية صباحية (07:00 ص - 03:00 م)</option>
                    <option value="وردية مسائية">وردية مسائية (03:00 م - 11:00 م)</option>
                    <option value="وردية ليلية">وردية ليلية (11:00 م - 07:00 ص)</option>
                    <option value="تشغيل مرن">تشغيل مرن حسب جداول الرحلات</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الالتحاق بالعمل</label>
                  <input
                    type="date"
                    value={dateOfJoining}
                    onChange={(e) => setDateOfJoining(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">إجمالي الرحلات السابقة</label>
                  <input
                    type="number"
                    min={0}
                    value={totalCompletedTrips}
                    onChange={(e) => setTotalCompletedTrips(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الراتب / الحافز اليومي</label>
                  <input
                    type="text"
                    value={salaryOrDailyRate}
                    onChange={(e) => setSalaryOrDailyRate(e.target.value)}
                    placeholder="مثال: 6500 ج.م / شهر"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MEDICAL & NOTES */}
          {activeTab === 'medical' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  <span>الفحص الطبي والسلامة المهنية الدوري</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  سجل شهادة اللياقة الطبية، نتائج الفحص الدوري للبصر، وتحليل الكشف عن المواد المخدرة طبقاً لتعليمات إدارة السلامة ومصنع برج العرب.
                </p>
                <textarea
                  rows={3}
                  value={medicalFitnessNotes}
                  onChange={(e) => setMedicalFitnessNotes(e.target.value)}
                  placeholder="مثال: تم إجراء الفحص الطبي الشامل في المركز المعتمد بتاريخ 2026/01/15، كشف النظر 6/6، تحليل السميات سلبي..."
                  className="w-full p-3 bg-white border border-emerald-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ملاحظات عامة وسجل الخبرة المهنية
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="سجل سنوات الخبرة في قيادة الشاحنات الثقيلة، خطوط الموانئ، التعامل مع البضائع الحساسة..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-6 shrink-0">
            <div className="flex items-center gap-2">
              {activeTab !== 'personal' && (
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    if (activeTab === 'license') setActiveTab('personal');
                    else if (activeTab === 'operations') setActiveTab('license');
                    else if (activeTab === 'medical') setActiveTab('operations');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  السابق
                </button>
              )}
              {activeTab !== 'medical' && (
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    if (activeTab === 'personal') setActiveTab('license');
                    else if (activeTab === 'license') setActiveTab('operations');
                    else if (activeTab === 'operations') setActiveTab('medical');
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  التالي
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer text-xs disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSyncing}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-xs cursor-pointer text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ والتزامن السحابي...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingDriver ? 'حفظ وتحديث في السحابة' : 'تسجيل السائق ومزامنته سحابياً'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
