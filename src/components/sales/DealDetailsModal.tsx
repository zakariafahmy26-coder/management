import React, { useState } from 'react';
import {
  X,
  DollarSign,
  User,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Trash2,
  Mail,
  Phone,
  Layers,
  History,
  Info,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Deal, DealStage, DealStatus, DealPriority } from '../../types/sales';
import { DealActivityLog } from './DealActivityLog';

export interface DealDetailsModalProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateDeal: (updatedDeal: Deal) => void;
  onDeleteDeal: (dealId: string) => void;
  companyId?: string;
  currentUser?: { name?: string; email?: string; uid?: string };
  canEdit?: boolean;
  canDelete?: boolean;
}

export const DealDetailsModal: React.FC<DealDetailsModalProps> = ({
  deal,
  isOpen,
  onClose,
  onUpdateDeal,
  onDeleteDeal,
  companyId = 'company-01',
  currentUser,
  canEdit = true,
  canDelete = true,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'ai'>('overview');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  if (!isOpen || !deal) return null;

  const STAGES_ORDER: DealStage[] = ['تقديم العرض', 'المفاوضات', 'مراجعة العقود', 'جاهز للإغلاق'];
  const currentStageIndex = STAGES_ORDER.indexOf(deal.stage);

  const handleCopyId = () => {
    navigator.clipboard.writeText(deal.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStageChange = (newStage: DealStage) => {
    if (!canEdit) return;
    const isReady = newStage === 'جاهز للإغلاق';
    onUpdateDeal({
      ...deal,
      stage: newStage,
      status: isReady ? 'success' : deal.status === 'success' ? 'in-progress' : deal.status,
      actualCloseDate: isReady ? new Date().toISOString().slice(0, 10) : deal.actualCloseDate,
    });
  };

  const handleStatusChange = (newStatus: DealStatus) => {
    if (!canEdit) return;
    onUpdateDeal({
      ...deal,
      status: newStatus,
      actualCloseDate: newStatus === 'success' ? new Date().toISOString().slice(0, 10) : deal.actualCloseDate,
    });
  };

  const handlePriorityChange = (newPriority: DealPriority) => {
    if (!canEdit) return;
    onUpdateDeal({
      ...deal,
      priority: newPriority,
    });
  };

  const handleSaveNotes = () => {
    onUpdateDeal({
      ...deal,
      notes: notesDraft,
    });
    setIsEditingNotes(false);
  };

  const getStatusBadge = (status: DealStatus) => {
    switch (status) {
      case 'success':
        return { text: 'مغلقة ومكتسبة (Success)', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-800' };
      case 'lost':
        return { text: 'صفقة خاسرة (Lost)', color: 'text-rose-400 bg-rose-950/80 border-rose-800' };
      case 'in-progress':
        return { text: 'قيد المتابعة والتفاوض (In-Progress)', color: 'text-blue-400 bg-blue-950/80 border-blue-800' };
      case 'pending':
      default:
        return { text: 'معلق بانتظار العميل (Pending)', color: 'text-amber-400 bg-amber-950/80 border-amber-800' };
    }
  };

  const statusBadge = getStatusBadge(deal.status);
  const winProbability = deal.winProbability ?? (deal.stage === 'جاهز للإغلاق' ? 95 : 50);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-detail-title"
    >
      <div
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-right overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-950 text-blue-400 border border-blue-800/80">
                {deal.id}
              </span>
              <button
                onClick={handleCopyId}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                title="نسخ معرف الصفقة"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {deal.category && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                  {deal.category}
                </span>
              )}

              {deal.priority && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                    deal.priority === 'حرجة'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : deal.priority === 'عالية'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  أولوية {deal.priority}
                </span>
              )}
            </div>

            <h2 id="deal-detail-title" className="text-lg sm:text-xl font-bold text-white">
              {deal.client}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Inside Modal */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>نظرة عامة والبيانات</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل الأنشطة والتدقيق</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'ai'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>تحليل واحتمالية الفوز (AI)</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Main KPI Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">القيمة الإجمالية للصفقة</span>
                  <span className="text-2xl font-black text-white font-mono">
                    ${deal.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-blue-400 block mt-1">بالدولار الأمريكي (USD)</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">المرحلة البيعية الحالية</span>
                  <span className="text-base font-bold text-indigo-300 block">
                    {deal.stage}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    المستوى {currentStageIndex + 1} من 4
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">الحالة التشغيلية</span>
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border mt-1 ${statusBadge.color}`}>
                    {statusBadge.text}
                  </span>
                </div>
              </div>

              {/* Interactive Pipeline Progression Stepper */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-300">مسار تقدم الصفقة (Pipeline Progression)</h4>
                  {canEdit && (
                    <span className="text-[11px] text-slate-400">انقر على أي مرحلة للنقل الفوري</span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STAGES_ORDER.map((st, idx) => {
                    const isActive = st === deal.stage;
                    const isPassed = idx < currentStageIndex;

                    return (
                      <button
                        key={st}
                        disabled={!canEdit}
                        onClick={() => handleStageChange(st)}
                        className={`p-2.5 rounded-xl border text-right transition cursor-pointer text-xs ${
                          isActive
                            ? 'bg-blue-600/30 border-blue-500 text-white font-bold ring-1 ring-blue-500 shadow-sm'
                            : isPassed
                            ? 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-600'
                            : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-slate-400">0{idx + 1}</span>
                          {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {isActive && <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
                        </div>
                        <div className="font-semibold text-[11px] leading-tight">{st}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Contact & Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block mb-0.5">مسؤول المبيعات (Owner):</span>
                  <div className="flex items-center gap-2 font-bold text-white">
                    <User className="w-4 h-4 text-blue-400" />
                    <span>{deal.owner}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">تاريخ الإضافة بالنظام:</span>
                  <div className="flex items-center gap-2 font-mono font-medium text-slate-200">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{deal.createdAt}</span>
                  </div>
                </div>

                {deal.expectedCloseDate && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">تاريخ الإغلاق المتوقع:</span>
                    <div className="flex items-center gap-2 font-mono font-medium text-slate-200">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>{deal.expectedCloseDate}</span>
                    </div>
                  </div>
                )}

                {deal.rfpNumber && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">رقم كراسة الشروط (RFP):</span>
                    <div className="flex items-center gap-2 font-mono font-medium text-slate-200">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>{deal.rfpNumber}</span>
                    </div>
                  </div>
                )}

                {deal.contactPerson && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">ممثل العميل المعتمد:</span>
                    <div className="font-bold text-slate-200">{deal.contactPerson}</div>
                  </div>
                )}

                {deal.contactPhone && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">هاتف التواصل:</span>
                    <div className="flex items-center gap-2 font-mono text-slate-200">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <a href={`tel:${deal.contactPhone}`} className="hover:underline">
                        {deal.contactPhone}
                      </a>
                    </div>
                  </div>
                )}

                {deal.contactEmail && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">البريد الإلكتروني للعميل:</span>
                    <div className="flex items-center gap-2 font-mono text-blue-400">
                      <Mail className="w-3.5 h-3.5" />
                      <a href={`mailto:${deal.contactEmail}`} className="hover:underline">
                        {deal.contactEmail}
                      </a>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 block mb-1">مستوى الأولوية:</span>
                  <div className="flex items-center gap-1.5">
                    {(['منخفضة', 'متوسطة', 'عالية', 'حرجة'] as DealPriority[]).map((p) => (
                      <button
                        key={p}
                        disabled={!canEdit}
                        onClick={() => handlePriorityChange(p)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          deal.priority === p
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes & Scope Section */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">الملاحظات والنطاق التعاقدي:</span>
                  {canEdit && !isEditingNotes && (
                    <button
                      onClick={() => {
                        setNotesDraft(deal.notes || '');
                        setIsEditingNotes(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer text-[11px]"
                    >
                      تعديل الملاحظات
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setIsEditingNotes(false)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1 rounded bg-blue-600 text-white font-bold text-xs"
                      >
                        حفظ الملاحظة
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {deal.notes || 'لا توجد ملاحظات تعاقدية مسجلة لهذه الفرصة.'}
                  </p>
                )}
              </div>

              {/* Quick Operational Status Toggles */}
              {canEdit && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-400">تحديث حالة الصفقة المباشرة:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleStatusChange('pending')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        deal.status === 'pending'
                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      معلق
                    </button>
                    <button
                      onClick={() => handleStatusChange('in-progress')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        deal.status === 'in-progress'
                          ? 'bg-blue-950 text-blue-300 border-blue-700'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      قيد التفاوض
                    </button>
                    <button
                      onClick={() => handleStatusChange('success')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        deal.status === 'success'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      مكتمل بنجاح (مكسوبة)
                    </button>
                    <button
                      onClick={() => handleStatusChange('lost')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        deal.status === 'lost'
                          ? 'bg-rose-950 text-rose-300 border-rose-700'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      خسارة الصفقة
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVITY LOG & AUDIT */}
          {activeTab === 'activity' && (
            <DealActivityLog
              companyId={companyId}
              dealId={deal.id}
              currentUser={currentUser}
              canEdit={canEdit}
            />
          )}

          {/* TAB 3: AI INSIGHTS & WIN PROBABILITY */}
          {activeTab === 'ai' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60">
                <div className="flex items-center gap-2.5 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h4 className="font-bold text-sm text-purple-200">
                    تقييم احتمالية الفوز بالصفقة (AI Win Probability)
                  </h4>
                </div>
                <p className="text-purple-300/80 leading-relaxed text-[11px]">
                  خوارزمية الذكاء الاصطناعي تحسب احتمالية الفوز بناءً على مرحلة الصفقة، حجم المناقصة، وتكرار التواصل.
                </p>

                <div className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">معدل الفوز المتوقع:</span>
                    <span className="text-xl font-black font-mono text-purple-300">{winProbability}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        winProbability >= 80
                          ? 'bg-emerald-500'
                          : winProbability >= 50
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${winProbability}%` }}
                    />
                  </div>

                  <div className="pt-2 text-[11px] text-slate-300 space-y-1.5">
                    <div className="font-bold text-slate-200">التوصيات الإجرائية المباشرة:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li>تحديد موعد جلسة توضيحية لأسئلة الـ RFP قبل موعد الإغلاق بـ 48 ساعة.</li>
                      <li>تأكيد جاهزية الضمانات البنكية أو مستندات الأسطول اللوجستي لدعم العرض الفني.</li>
                      <li>متابعة البريد الإلكتروني مع ممثل العميل {deal.contactPerson || ''}.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70 shrink-0">
          <div>
            {canDelete &&
              (showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400 font-semibold">تأكيد الحذف نهائياً؟</span>
                  <button
                    onClick={() => {
                      onDeleteDeal(deal.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    نعم، احذف
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 text-xs transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الصفقة</span>
                </button>
              ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
            >
              تم وحفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
