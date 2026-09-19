import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Camera,
  CheckCircle2,
  Copy,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Fuel,
  Lightbulb,
  Loader2,
  MapPin,
  RefreshCw,
  Send,
  Sparkles,
  TrendingDown,
  Truck,
  UploadCloud,
  Wrench,
  Zap,
} from 'lucide-react';
import { AIChatMessage, aiService, ScannedReceiptResult } from '../services/aiService';
import {
  Driver,
  FuelRecord,
  MaintenanceRecord,
  MonthlyReportSummary,
  TripRoute,
  Vehicle,
} from '../types';

interface AIAssistantViewProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: TripRoute[];
  maintenance: MaintenanceRecord[];
  fuelRecords: FuelRecord[];
  monthlyReport?: MonthlyReportSummary;
  onAddFuelRecord?: (record: FuelRecord) => void;
  onNavigateTab?: (tab: any) => void;
  onShowToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  vehicles,
  drivers,
  trips,
  maintenance,
  fuelRecords,
  monthlyReport,
  onAddFuelRecord,
  onNavigateTab,
  onShowToast,
}) => {
  const [activeAIMode, setActiveAIMode] = useState<
    'chat' | 'ocr_receipt' | 'predictive_health' | 'executive_summary'
  >('chat');

  // Chat State
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('fleet_ai_chat_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `أهلاً بك في **المساعد الذكي لأسطول مصنعك** 🚚✨\n\nأنا جاهز لمساعدتك في:\n- تحليل استهلاك وسعر السولار والبنزين واقتراح سبل التوفير.\n- متابعة التنبيهات العاجلة للسيارات ومواعيد تغيير الزيت والتراخيص.\n- تقييم خطوط السير بين (الإسكندرية، الساحل الشمالي، البحيرة).\n- استخراج فواتير الوقود والصيانة تلقائياً عبر الكاميرا.\n\nكيف يمكنني دعمك اليوم؟`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('fleet_ai_chat_v1', JSON.stringify(chatMessages));
    } catch (e) {
      console.error(e);
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Context builder for Gemini
  const getFleetContextData = () => {
    const totalDistance = trips.reduce((acc, t) => acc + (Number(t.distanceKm) || 0), 0);
    const totalFuelCost = fuelRecords.reduce((acc, f) => acc + (Number(f.totalCost) || 0), 0);
    const totalMaintenanceCost = maintenance.reduce(
      (acc, m) => acc + (Number(m.totalCost) || 0),
      0
    );

    const urgentVehicles = vehicles
      .filter((v) => {
        const diff = (v.nextOilChangeOdometer || 0) - (v.currentOdometer || 0);
        return diff <= 500;
      })
      .map((v) => ({
        plate: v.plateNumber,
        model: v.model,
        diffKm: (v.nextOilChangeOdometer || 0) - (v.currentOdometer || 0),
      }));

    return {
      fleetSummary: {
        vehiclesCount: vehicles.length,
        driversCount: drivers.length,
        tripsCount: trips.length,
        fuelReceiptsCount: fuelRecords.length,
        totalDistanceKm: Math.round(totalDistance),
        totalFuelCostEGP: Math.round(totalFuelCost),
        totalMaintenanceCostEGP: Math.round(totalMaintenanceCost),
        urgentOilAlerts: urgentVehicles,
      },
      vehiclesSample: vehicles.slice(0, 10).map((v) => ({
        plate: v.plateNumber,
        driver: drivers.find((d) => d.id === v.assignedDriverId)?.name || 'غير مخصص',
        currentOdometer: v.currentOdometer,
        nextOilKm: v.nextOilChangeOdometer,
        licenseExpiry: v.licenseExpiryDate,
        inspectionExpiry: v.inspectionExpiryDate,
      })),
      recentFuelEntries: fuelRecords.slice(0, 5).map((f) => ({
        date: f.date,
        station: f.station,
        liters: f.quantity,
        cost: f.totalCost,
      })),
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputMessage).trim();
    if (!prompt || isSending) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const historyPayload = chatMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const contextData = getFleetContextData();
      const reply = await aiService.askFleetCopilot(prompt, contextData, historyPayload);

      const botMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      onShowToast('تعذر الرد', err.message || 'فشل الاتصال بخدمة الذكاء الاصطناعي', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = () => {
    localStorage.removeItem('fleet_ai_chat_v1');
    setChatMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'تم تصفير سجل المحادثة. يمكنك بدء استفسار جديد بخصوص أسطول المصنع الآن.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    onShowToast('تم تصفير المحادثة', 'سجل الشات الآن نظيف وجاهز لأسئلتك');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    onShowToast('تم النسخ', 'تم نسخ النص إلى الحافظة بنجاح');
  };

  // OCR Receipt Scanner State
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [extractedReceipt, setExtractedReceipt] = useState<ScannedReceiptResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setReceiptImage(base64);
      setExtractedReceipt(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunReceiptScan = async () => {
    if (!receiptImage || isScanningReceipt) return;
    setIsScanningReceipt(true);
    setExtractedReceipt(null);

    try {
      const res = await aiService.scanReceipt(receiptImage);
      setExtractedReceipt(res.data);
      onShowToast(
        'تم تحليل الإيصال بنجاح',
        `تم استخراج ${res.data.liters ? `${res.data.liters} لتر` : ''} بقيمة ${res.data.totalCost || 0} ج.م`
      );
    } catch (err: any) {
      console.error(err);
      onShowToast('فشل تحليل الإيصال', err.message || 'تأكد من وضوح الصورة وتوفر الاتصال', 'error');
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const handleSaveScannedToFuel = () => {
    if (!extractedReceipt || !onAddFuelRecord) return;

    // Match vehicle if possible
    let matchedVehicleId = vehicles[0]?.id || '';
    if (extractedReceipt.vehiclePlate) {
      const found = vehicles.find((v) =>
        v.plateNumber.includes(extractedReceipt.vehiclePlate!.trim())
      );
      if (found) matchedVehicleId = found.id;
    }

    const matchedVehicle = vehicles.find((v) => v.id === matchedVehicleId);
    const assignedDriverId = matchedVehicle?.assignedDriverId || drivers[0]?.id || '';

    const newRecord: FuelRecord = {
      id: `fuel-${Date.now()}`,
      vehicleId: matchedVehicleId,
      driverId: assignedDriverId,
      date: extractedReceipt.date || new Date().toISOString().split('T')[0],
      quantity: Number(extractedReceipt.liters) || 60,
      price: Number(extractedReceipt.pricePerLiter) || 13.5,
      totalCost:
        Number(extractedReceipt.totalCost) ||
        (Number(extractedReceipt.liters) || 60) * (Number(extractedReceipt.pricePerLiter) || 13.5),
      station: extractedReceipt.stationOrWorkshop || 'وطنية',
      odometer: matchedVehicle?.currentOdometer || 0,
      notes: extractedReceipt.notes
        ? `[تم الاستخراج آلياً بالذكاء الاصطناعي] ${extractedReceipt.notes}`
        : 'تم الإدخال عبر الماسح الذكي بالذكاء الاصطناعي',
      receiptImage: receiptImage || undefined,
    };

    onAddFuelRecord(newRecord);
    onShowToast('تمت إضافة الإيصال', 'تم تسجيل إيصال الوقود الجديد في شيت الوقود بنجاح!');
    if (onNavigateTab) {
      onNavigateTab('fuel');
    }
  };

  // Predictive Fleet Health State
  const [fleetInsights, setFleetInsights] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const handleGenerateInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const result = await aiService.getFleetInsights({
        vehicles,
        drivers,
        trips,
        maintenance,
        fuelRecords,
      });
      setFleetInsights(result);
      onShowToast('تم تحديث التوصيات', 'تم فحص أسطول المصنع وتوليد التقرير الذكي');
    } catch (err: any) {
      console.error(err);
      onShowToast('خطأ في التحليل', err.message || 'تعذر جلب التوصيات', 'error');
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Executive Report Generator State
  const [executiveReportText, setExecutiveReportText] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleGenerateExecutiveReport = async () => {
    setIsGeneratingReport(true);
    try {
      const dummySummary: MonthlyReportSummary = monthlyReport || {
        id: `rep-${Date.now()}`,
        month: new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
        monthYear: new Date().toISOString().slice(0, 7),
        totalDistanceKm: trips.reduce((acc, t) => acc + (Number(t.distanceKm) || 0), 0),
        totalTrips: trips.length,
        totalFuelCost: fuelRecords.reduce((acc, f) => acc + (Number(f.totalCost) || 0), 0),
        totalMaintenanceCost: maintenance.reduce(
          (acc, m) => acc + (Number(m.totalCost) || 0),
          0
        ),
        totalTollAndOtherCost: trips.reduce((acc, t) => acc + (Number(t.tollCost) || 0), 0),
        grandTotalCost: 0,
        avgCostPerKm: 0,
        regionsSummary: [],
        vehicleSummary: [],
      };

      const result = await aiService.generateExecutiveReport(dummySummary);
      setExecutiveReportText(result);
      onShowToast('تم توليد التقرير التنفيذي', 'التقرير جاهز الآن للعرض والطباعة');
    } catch (err: any) {
      console.error(err);
      onShowToast('خطأ', err.message || 'تعذر توليد التقرير', 'error');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Quick Prompt chips
  const quickPrompts = [
    {
      label: '⛽ أكثر السيارات استهلاكاً للوقود',
      prompt: 'ما هي أكثر السيارات استهلاكاً للوقود في الأسطول؟ وكيف يمكننا ترشيد استهلاكها؟',
    },
    {
      label: '⚠️ تنبيهات صيانة وتراخيص عاجلة',
      prompt: 'هل توجد سيارات اقتربت من تغيير الزيت أو رخص تنتهي خلال الـ 30 يوماً القادمة؟',
    },
    {
      label: '🗺️ تحليل خطوط السير والوفر',
      prompt: 'حلل كفاءة وتكلفة الرحلات بين قطاعات الإسكندرية والساحل والبحيرة واقترح طرق لتقليل التكلفة لكل كم.',
    },
    {
      label: '📋 خطة العمل الموصى بها اليوم',
      prompt: 'أعطني قائمة بالأولويات التشغيلية التي يجب على مشرف الحركة التركيز عليها اليوم.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-l from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>مدعوم بنموذج Google Gemini 3.8 Flash الذكي</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              مركز الذكاء الاصطناعي لأسطول المصنع
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              تحليل فوري لحركة الشاحنات، والتنبؤ بمواعيد الصيانة الدورية، واستخراج فواتير الوقود
              عبر الكاميرا بالرؤية الحاسوبية، وتقديم استشارات تشغيلية لإدارة المصنع.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/15 text-xs text-slate-200">
            <div className="text-center px-2">
              <span className="block text-lg font-black text-white">{vehicles.length}</span>
              <span className="text-[11px] text-emerald-300">سيارة بالأسطول</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2">
              <span className="block text-lg font-black text-white">{trips.length}</span>
              <span className="text-[11px] text-emerald-300">رحلة مسجلة</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2">
              <span className="block text-lg font-black text-white">{fuelRecords.length}</span>
              <span className="text-[11px] text-emerald-300">إيصال وقود</span>
            </div>
          </div>
        </div>

        {/* Feature Tabs */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveAIMode('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeAIMode === 'chat'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>المحادثة والاستشارة التشغيلية</span>
          </button>

          <button
            onClick={() => setActiveAIMode('ocr_receipt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeAIMode === 'ocr_receipt'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>الماسح الذكي للفواتير والإيصالات</span>
          </button>

          <button
            onClick={() => setActiveAIMode('predictive_health')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeAIMode === 'predictive_health'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>التنبؤ بالأعطال وصيانة الأسطول</span>
          </button>

          <button
            onClick={() => setActiveAIMode('executive_summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeAIMode === 'executive_summary'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>التقرير التنفيذي للإدارة</span>
          </button>
        </div>
      </div>

      {/* MODE 1: CHAT */}
      {activeAIMode === 'chat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          {/* Chat Header */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  مساعد أسطول المصنع (Fleet AI Copilot)
                </h3>
                <p className="text-[11px] text-emerald-600 font-medium">
                  متصل ومطلع على سجلات الوقود والرحلات والصيانة الحالية
                </p>
              </div>
            </div>

            <button
              onClick={handleClearChat}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2.5 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>تصفير المحادثة</span>
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-emerald-800 whitespace-nowrap flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>استفسارات سريعة:</span>
            </span>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                disabled={isSending}
                onClick={() => handleSendMessage(qp.prompt)}
                className="text-[11px] bg-white border border-emerald-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer hover:shadow-xs disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/30">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  msg.role === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                    msg.role === 'user'
                      ? 'bg-slate-800 text-white'
                      : 'bg-emerald-600 text-white shadow-sm'
                  }`}
                >
                  {msg.role === 'user' ? 'أنت' : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`relative p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-tr-none shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-line prose prose-sm max-w-none">
                    {msg.content}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopyText(msg.content)}
                        className="hover:text-emerald-600 transition flex items-center gap-1 cursor-pointer"
                        title="نسخ الإجابة"
                      >
                        <Copy className="w-3 h-3" />
                        <span>نسخ</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex gap-3 max-w-xl">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white shrink-0 flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 p-3.5 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>يقوم الذكاء الاصطناعي بدراسة أرقام الأسطول وتجهيز الرد...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="اكتب سؤالك هنا (مثال: ما هي مصاريف خط الساحل الشمالي مقارنة بالإسكندرية؟)..."
                disabled={isSending}
                className="flex-1 bg-slate-100 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm outline-none transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 rotate-180" />
                )}
                <span className="hidden sm:inline">إرسال</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODE 2: SMART RECEIPT SCANNER (OCR) */}
      {activeAIMode === 'ocr_receipt' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                رفع أو التقاط صورة الفاتورة / الإيصال
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              التقط صورة إيصال بنزينة (وطنية، موبيل، مصر للبترول، طاقة) أو فاتورة صيانة/زيت. يقوم
              Gemini Vision بقراءتها وتحويلها لأرقام في ثوانٍ.
            </p>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {!receiptImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-50 hover:bg-emerald-50/40 space-y-3"
              >
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    انقر لفتح الكاميرا أو اختيار صورة
                  </span>
                  <span className="text-xs text-slate-500">يدعم PNG, JPG, JPEG</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-72 bg-slate-900 flex items-center justify-center">
                  <img
                    src={receiptImage}
                    alt="Receipt preview"
                    className="max-h-72 object-contain"
                  />
                  <button
                    onClick={() => {
                      setReceiptImage(null);
                      setExtractedReceipt(null);
                    }}
                    className="absolute top-2 right-2 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-lg hover:bg-rose-600 transition"
                  >
                    تغيير الصورة
                  </button>
                </div>

                <button
                  onClick={handleRunReceiptScan}
                  disabled={isScanningReceipt}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isScanningReceipt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري المعالجة البصرية بالذكاء الاصطناعي...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>بدء الاستخراج والتحليل الذكي</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  البيانات المستخرجة آلياً
                </h3>
              </div>
              {extractedReceipt?.confidence && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  دقة القراءة: {extractedReceipt.confidence}
                </span>
              )}
            </div>

            {!extractedReceipt ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-medium">
                  لم يتم استخراج بيانات بعد. ارفع صورة الفاتورة واضغط "بدء الاستخراج الذكي".
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-bold block">التاريخ</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {extractedReceipt.date || 'غير محدد'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-bold block">
                      المحطة / المركز
                    </span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      {extractedReceipt.stationOrWorkshop || 'محطة وقود'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-bold block">نوع الوقود</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {extractedReceipt.fuelType || 'سولار'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-bold block">
                      الكمية (لتر)
                    </span>
                    <span className="text-base font-black text-slate-900">
                      {extractedReceipt.liters ? `${extractedReceipt.liters} لتر` : 'غير محدد'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-bold block">سعر اللتر</span>
                    <span className="text-sm font-bold text-slate-900">
                      {extractedReceipt.pricePerLiter
                        ? `${extractedReceipt.pricePerLiter} ج.م`
                        : 'غير محدد'}
                    </span>
                  </div>

                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <span className="text-[11px] text-emerald-800 font-bold block">
                      الإجمالي المدفوع
                    </span>
                    <span className="text-base font-black text-emerald-700">
                      {extractedReceipt.totalCost ? `${extractedReceipt.totalCost} ج.م` : '0 ج.م'}
                    </span>
                  </div>
                </div>

                {extractedReceipt.vehiclePlate && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                    <span>
                      رقم اللوحة المرصود: <strong>{extractedReceipt.vehiclePlate}</strong>
                    </span>
                    <span className="text-[11px] text-amber-700">تم التوفيق التلقائي مع الأسطول</span>
                  </div>
                )}

                {extractedReceipt.notes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                    <strong>ملاحظات الإيصال:</strong> {extractedReceipt.notes}
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleSaveScannedToFuel}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد وحفظ الإيصال في شيت الوقود</span>
                  </button>
                  <button
                    onClick={() => {
                      setReceiptImage(null);
                      setExtractedReceipt(null);
                    }}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
                  >
                    مسح صورة أخرى
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: PREDICTIVE FLEET HEALTH */}
      {activeAIMode === 'predictive_health' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  الفحص التنبؤي وصحة الأسطول بالذكاء الاصطناعي
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                فحص آلي لعدادات الكيلومتر، فترات تغيير الزيت، ومواعيد الفحص والتراخيص لكافة سيارات
                المصنع.
              </p>
            </div>

            <button
              onClick={handleGenerateInsights}
              disabled={isLoadingInsights}
              className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isLoadingInsights ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحليل...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>تحديث الفحص الآن</span>
                </>
              )}
            </button>
          </div>

          {!fleetInsights ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
              <Zap className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                جاهز لتحليل حالة سيارات المصنع الـ {vehicles.length}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                اضغط على زر "تحديث الفحص الآن" ليقوم الذكاء الاصطناعي بقراءة عدادات الأسطول والتنبؤ
                بالأعطال وتقديم خطة الصيانة الاستباقية لهذا الأسبوع.
              </p>
              <button
                onClick={handleGenerateInsights}
                disabled={isLoadingInsights}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                تشغيل الفحص
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-line font-medium">
                {fleetInsights}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleCopyText(fleetInsights)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ التقرير</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 4: EXECUTIVE MONTHLY REPORT */}
      {activeAIMode === 'executive_summary' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  صانع التقرير التنفيذي الشهري للإدارة
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                صياغة تقرير استراتيجي رفيع المستوى موجه للمدير التنفيذي ولمجلس إدارة المصنع يلخص
                المصروفات والأداء والوفر المحقق.
              </p>
            </div>

            <button
              onClick={handleGenerateExecutiveReport}
              disabled={isGeneratingReport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الصياغة بالذكاء الاصطناعي...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>توليد التقرير التنفيذي</span>
                </>
              )}
            </button>
          </div>

          {!executiveReportText ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                تلخيص مؤشرات {trips.length} رحلة و {fuelRecords.length} إيصال وقود
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                يقوم النموذج بتحليل أرقام الأقاليم (الإسكندرية، الساحل الشمالي، البحيرة)، ومتوسط
                تكلفة الكيلومتر، وصياغة 3 توصيات قابلة للتنفيذ لتوفير 10-15% من التكاليف.
              </p>
              <button
                onClick={handleGenerateExecutiveReport}
                disabled={isGeneratingReport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                توليد التقرير
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-900 text-sm leading-loose whitespace-pre-line font-medium shadow-xs">
                {executiveReportText}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleCopyText(executiveReportText)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ التقرير</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>طباعة / حفظ PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
