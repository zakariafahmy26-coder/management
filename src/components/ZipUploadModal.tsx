import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  UploadCloud,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Code,
  Database,
  Search,
  Download,
  Trash2,
  ArrowRight,
  RefreshCw,
  Folder,
  Layers,
  Truck,
  ExternalLink,
} from 'lucide-react';
import {
  parseZipFile,
  uploadZipFileToServer,
  fetchServerZipArchives,
  extractFleetBackupFromZip,
  extractZipFileDataUrl,
  formatBytes,
  ParsedZipData,
  ExtractedFleetData,
} from '../utils/zipHandler';
import { Vehicle, Driver, TripRoute, MaintenanceRecord, FuelRecord, VehicleDocument } from '../types';

interface ZipUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles?: Vehicle[];
  currentCompanyId?: string;
  onImportFleetData?: (data: ExtractedFleetData) => void;
  onImportDocuments?: (docs: Partial<VehicleDocument>[]) => void;
  onSuccessToast?: (title: string, message: string) => void;
}

export const ZipUploadModal: React.FC<ZipUploadModalProps> = ({
  isOpen,
  onClose,
  vehicles = [],
  currentCompanyId = 'company-01',
  onImportFleetData,
  onImportDocuments,
  onSuccessToast,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'server_archives'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingServer, setIsUploadingServer] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedZip, setParsedZip] = useState<ParsedZipData | null>(null);
  const [extractedFleetData, setExtractedFleetData] = useState<ExtractedFleetData | null>(null);
  const [serverUploadResult, setServerUploadResult] = useState<any | null>(null);

  // Filter inside the archive files
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'image' | 'document' | 'data' | 'code'>('all');

  // For assigning documents to vehicles
  const [selectedVehicleForDocs, setSelectedVehicleForDocs] = useState<string>('');

  // Server archives list
  const [serverArchives, setServerArchives] = useState<any[]>([]);
  const [isLoadingServerList, setIsLoadingServerList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'server_archives') {
      loadServerArchives();
    }
  }, [isOpen, activeTab]);

  const loadServerArchives = async () => {
    setIsLoadingServerList(true);
    try {
      const list = await fetchServerZipArchives();
      setServerArchives(list);
    } catch (e) {
      console.warn('Failed loading archives:', e);
    } finally {
      setIsLoadingServerList(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMsg('يرجى اختيار ملف بامتداد .zip فقط');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    setIsProcessing(true);
    setServerUploadResult(null);

    try {
      const parsed = await parseZipFile(file);
      setParsedZip(parsed);

      // Check if it contains fleet data backup
      const backupData = await extractFleetBackupFromZip(parsed.zipInstance);
      if (backupData) {
        setExtractedFleetData(backupData);
      } else {
        setExtractedFleetData(null);
      }
    } catch (err: any) {
      console.error('Error analyzing zip:', err);
      setErrorMsg(`تعذر فحص ملف الـ ZIP: ${err.message || 'الملف تالف أو غير صالح'}`);
      setParsedZip(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Upload the current ZIP file to the server
  const handleUploadToServer = async () => {
    if (!selectedFile) return;
    setIsUploadingServer(true);
    setErrorMsg(null);

    try {
      const uploadType: 'source_code' | 'backup' | 'documents' | 'general' =
        parsedZip?.detectedType === 'fleet_backup'
          ? 'backup'
          : parsedZip?.detectedType === 'documents_archive'
          ? 'documents'
          : parsedZip?.detectedType === 'source_code'
          ? 'source_code'
          : 'general';

      const result = await uploadZipFileToServer(
        selectedFile,
        uploadType
      );
      setServerUploadResult(result);
      onSuccessToast?.('تم رفع ملف الـ ZIP بنجاح', `تم حفظ الأرشيف (${result.fileName}) على الخادم وتأكيده.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرسال الملف إلى الخادم');
    } finally {
      setIsUploadingServer(false);
    }
  };

  // Apply fleet backup data into the application
  const handleApplyFleetBackup = () => {
    if (!extractedFleetData || !onImportFleetData) return;
    onImportFleetData(extractedFleetData);
    onSuccessToast?.(
      'تم استيراد بيانات الأسطول',
      'تم دمج وتحديث بيانات الشاحنات والسائقين والرحلات من النسخة الاحتياطية بنجاح.'
    );
    onClose();
  };

  // Convert files in ZIP into Vehicle Documents
  const handleImportAsDocuments = async () => {
    if (!parsedZip || !onImportDocuments) return;
    setIsProcessing(true);

    try {
      const targetVehicle = vehicles.find((v) => v.id === selectedVehicleForDocs);
      const docEntries = parsedZip.entries.filter(
        (e) => !e.isDirectory && (e.category === 'document' || e.category === 'image')
      );

      const generatedDocs: Partial<VehicleDocument>[] = [];

      for (const entry of docEntries.slice(0, 30)) {
        let fileDataUrl: string | undefined = undefined;
        try {
          if (entry.category === 'image') {
            fileDataUrl = await extractZipFileDataUrl(parsedZip.zipInstance, entry.path);
          }
        } catch (e) {
          // ignore
        }

        // Auto-detect document type from name
        const lower = entry.name.toLowerCase();
        let docType: VehicleDocument['documentType'] = 'COMMERCIAL_REGISTRATION';
        if (lower.includes('رخصة') || lower.includes('lic')) docType = 'LICENSE';
        else if (lower.includes('تأمين') || lower.includes('insur')) docType = 'INSURANCE';
        else if (lower.includes('فحص') || lower.includes('inspect')) docType = 'PERIODIC_INSPECTION';
        else if (lower.includes('تصريح') || lower.includes('permit')) docType = 'ENVIRONMENTAL_PERMIT';

        generatedDocs.push({
          id: `doc_zip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          companyId: currentCompanyId,
          vehicleId: targetVehicle ? targetVehicle.id : vehicles[0]?.id || 'veh-01',
          vehiclePlate: targetVehicle ? targetVehicle.plateNumber : vehicles[0]?.plateNumber || 'غير محددة',
          documentType: docType,
          title: entry.name.replace(/\.[^/.]+$/, ''),
          documentNumber: `ZIP-${Date.now().toString().slice(-4)}`,
          issueDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          status: 'VALID',
          issuer: 'أرشيف مرفوع من حزمة ZIP',
          notes: `تم الاستيراد تلقائياً من حزمة ${parsedZip.fileName} (${entry.path})`,
          fileUrl: fileDataUrl,
        });
      }

      onImportDocuments(generatedDocs);
      onSuccessToast?.(
        'تم استيراد وثائق المركبات',
        `تم تسجيل ${generatedDocs.length} وثيقة بنجاح وإلحاقها بأسطول المركبات.`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(`حدث خطأ أثناء استخراج الوثائق: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteServerArchive = async (fileName: string) => {
    try {
      await fetch(`/api/uploaded-zips/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
      setServerArchives((prev) => prev.filter((a) => a.fileName !== fileName));
      onSuccessToast?.('تم الحذف', 'تم حذف ملف الأرشيف من الخادم.');
    } catch (e) {
      // ignore
    }
  };

  const filteredEntries = useMemo(() => {
    if (!parsedZip) return [];
    return parsedZip.entries.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return entry.path.toLowerCase().includes(q) || entry.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [parsedZip, categoryFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>رفع واستعراض ملف مضغوط (Upload ZIP)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  .ZIP Archive
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                يدعم رفع حزم الكود، النسخ الاحتياطية للأسطول، وأرشيف وثائق وتراخيص المركبات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800/80 bg-slate-900/50 text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>رفع وفحص ملف جديد</span>
          </button>

          <button
            onClick={() => setActiveTab('server_archives')}
            className={`pb-2.5 px-3 font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'server_archives'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>الملفات المحفوظة على السيرفر ({serverArchives.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {activeTab === 'upload' ? (
            <>
              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/30 scale-[0.99]'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <h3 className="text-sm font-bold text-white">
                  {selectedFile ? selectedFile.name : 'اسحب وأفلت ملف الـ ZIP هنا، أو انقر للاختيار'}
                </h3>
                <p className="text-slate-400 mt-1">
                  {selectedFile
                    ? `الحجم المضغوط: ${formatBytes(selectedFile.size)}`
                    : 'يدعم كافة أنواع الملفات المضغوطة ZIP حتى حجم 100 ميجابايت'}
                </p>

                <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                  <span className="px-2 py-0.5 rounded bg-slate-800">حزم الكود البرمجي</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800">نسخ احتياطية للأسطول</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800">أرشيف رخص وتأمين</span>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <div className="font-bold">تنبيه</div>
                    <div className="text-[11px] mt-0.5">{errorMsg}</div>
                  </div>
                </div>
              )}

              {/* Processing Loader */}
              {isProcessing && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center gap-3 text-cyan-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="font-bold">جارٍ فك ضغط وفحص محتويات ملف الـ ZIP في المتصفح...</span>
                </div>
              )}

              {/* Parsed ZIP Details & Overview */}
              {parsedZip && !isProcessing && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block">نوع المحتوى المكتشف:</span>
                      <span className="font-bold text-cyan-400 mt-0.5 inline-flex items-center gap-1">
                        {parsedZip.detectedType === 'fleet_backup' && (
                          <>
                            <Database className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">نسخة احتياطية للأسطول</span>
                          </>
                        )}
                        {parsedZip.detectedType === 'documents_archive' && (
                          <>
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-indigo-400">أرشيف وثائق ورخص</span>
                          </>
                        )}
                        {parsedZip.detectedType === 'source_code' && (
                          <>
                            <Code className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-amber-400">كود مصدري للنظام</span>
                          </>
                        )}
                        {parsedZip.detectedType === 'mixed_archive' && (
                          <>
                            <Layers className="w-3.5 h-3.5 text-slate-300" />
                            <span>أرشيف ملفات متنوع</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">إجمالي الملفات:</span>
                      <span className="font-bold text-white text-sm mt-0.5">
                        {parsedZip.totalFiles} ملف
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">الحجم المضغوط:</span>
                      <span className="font-mono font-bold text-slate-300 text-xs mt-0.5">
                        {formatBytes(parsedZip.fileSize)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">حالة الرفع للسيرفر:</span>
                      <span className="mt-0.5 block">
                        {serverUploadResult ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مرفوع ومحفوظ</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">لم يُرفع بعد</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>الإجراءات المتاحة لهذا الملف:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Action 1: Upload to Server */}
                      <button
                        type="button"
                        onClick={handleUploadToServer}
                        disabled={isUploadingServer || Boolean(serverUploadResult)}
                        className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${
                          serverUploadResult
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/30'
                        } disabled:opacity-60`}
                      >
                        {isUploadingServer ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>جارٍ الرفع على السيرفر...</span>
                          </>
                        ) : serverUploadResult ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تم الحفظ على السيرفر بنجاح</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>رفع وحفظ على السيرفر (POST /api/upload-zip)</span>
                          </>
                        )}
                      </button>

                      {/* Action 2: Apply fleet data backup */}
                      {extractedFleetData && (
                        <button
                          type="button"
                          onClick={handleApplyFleetBackup}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-md shadow-emerald-900/30 transition cursor-pointer"
                        >
                          <Database className="w-4 h-4" />
                          <span>
                            استعادة وتطبيق بيانات الأسطول (
                            {extractedFleetData.vehicles?.length || 0} شاحنة،{' '}
                            {extractedFleetData.drivers?.length || 0} سائق)
                          </span>
                        </button>
                      )}

                      {/* Action 3: Convert extracted files into Vehicle Documents */}
                      {onImportDocuments && parsedZip.entries.some((e) => e.category === 'document' || e.category === 'image') && (
                        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-700">
                          <select
                            value={selectedVehicleForDocs}
                            onChange={(e) => setSelectedVehicleForDocs(e.target.value)}
                            className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                          >
                            <option value="">إلحاق بالمركبة (تلقائي)...</option>
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.plateNumber} ({v.model})
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={handleImportAsDocuments}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>استيراد كوثائق ورخص للمركبات</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Files Explorer inside ZIP */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                    <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900/60">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-white">مستكشف الملفات داخل الأرشيف ({filteredEntries.length})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Search in ZIP */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="بحث في أسماء الملفات..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-8 pl-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                          />
                        </div>

                        {/* Category filter */}
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value as any)}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                        >
                          <option value="all">كافة الأنواع</option>
                          <option value="document">وثائق (PDF/Word/TXT)</option>
                          <option value="image">صور (PNG/JPG)</option>
                          <option value="data">بيانات (JSON/Excel)</option>
                          <option value="code">كود برمجي</option>
                        </select>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                      {filteredEntries.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">لا توجد ملفات مطابقة للبحث داخل الأرشيف</div>
                      ) : (
                        filteredEntries.map((entry, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 px-3 flex items-center justify-between hover:bg-slate-900/60 text-xs transition"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {entry.isDirectory ? (
                                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                              ) : entry.category === 'image' ? (
                                <ImageIcon className="w-4 h-4 text-pink-400 shrink-0" />
                              ) : entry.category === 'document' ? (
                                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                              ) : entry.category === 'data' ? (
                                <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : entry.category === 'code' ? (
                                <Code className="w-4 h-4 text-cyan-400 shrink-0" />
                              ) : (
                                <FileArchive className="w-4 h-4 text-slate-400 shrink-0" />
                              )}

                              <div className="truncate">
                                <span className="font-mono text-slate-200">{entry.name}</span>
                                {entry.path !== entry.name && (
                                  <span className="text-[10px] text-slate-500 block truncate font-mono">
                                    {entry.path}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                                {entry.extension || (entry.isDirectory ? 'DIR' : 'FILE')}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Server Archives Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">حزم الـ ZIP المرفوعة على السيرفر</h3>
                  <p className="text-slate-400 text-xs">
                    الملفات المحفوظة سحابياً على مجلد الأرشيف بالخادم في مسار: <code className="text-cyan-400">/uploads/archives/</code>
                  </p>
                </div>

                <button
                  onClick={loadServerArchives}
                  disabled={isLoadingServerList}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServerList ? 'animate-spin' : ''}`} />
                  <span>تحديث القائمة</span>
                </button>
              </div>

              {isLoadingServerList ? (
                <div className="p-8 text-center text-slate-400">جارٍ جلب قائمة الأرشيفات من السيرفر...</div>
              ) : serverArchives.length === 0 ? (
                <div className="p-8 rounded-xl border border-slate-800 text-center text-slate-500 bg-slate-950/40">
                  <FileArchive className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>لا توجد ملفات ZIP مرفوعة على السيرفر حالياً.</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                  >
                    رفع أول ملف ZIP
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  {serverArchives.map((archive, i) => (
                    <div
                      key={i}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/60 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                          <FileArchive className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white font-mono text-xs">{archive.fileName}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>الحجم: {formatBytes(archive.fileSize)}</span>
                            <span>•</span>
                            <span>
                              التاريخ:{' '}
                              {archive.createdAt
                                ? new Date(archive.createdAt).toLocaleString('ar-EG')
                                : 'مؤخراً'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <a
                          href={archive.downloadUrl}
                          download={archive.fileName}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 transition"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>تحميل</span>
                        </a>

                        <button
                          onClick={() => handleDeleteServerArchive(archive.fileName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                          title="حذف الأرشيف من السيرفر"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            النظام يدعم التحليل الفوري، التوافق مع Firebase، واستعادة وثائق الأسطول.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
