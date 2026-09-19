import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Building,
  User,
  Calendar,
  FileText,
  Phone,
  Mail,
  Shield,
  Layers,
} from 'lucide-react';
import { Deal, DealStage, DealStatus, DealPriority } from '../../types/sales';
import { SALES_REPRESENTATIVES, DEAL_CATEGORIES } from '../../data/salesData';

export interface DealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDeal: (newDeal: Deal) => void;
  companyId?: string;
  currentUser?: { name?: string; email?: string };
}

export const DealFormModal: React.FC<DealFormModalProps> = ({
  isOpen,
  onClose,
  onAddDeal,
  companyId = 'company-01',
  currentUser,
}) => {
  const [client, setClient] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [owner, setOwner] = useState(currentUser?.name || SALES_REPRESENTATIVES[0]);
  const [stage, setStage] = useState<DealStage>('تقديم العرض');
  const [status, setStatus] = useState<DealStatus>('pending');
  const [priority, setPriority] = useState<DealPriority>('متوسطة');
  const [category, setCategory] = useState<'توريدات' | 'خدمات لوجستية' | 'عقود سنوية' | 'حلول تقنية'>('توريدات');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      setClient('');
      setAmount('');
      setOwner(currentUser?.name || SALES_REPRESENTATIVES[0]);
      setStage('تقديم العرض');
      setStatus('pending');
      setPriority('متوسطة');
      setCategory('توريدات');
      setContactPerson('');
      setContactPhone('');
      setContactEmail('');
      setExpectedCloseDate('');
      setNotes('');
      setErrors({});
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!client.trim()) {
      newErrors.client = 'يرجى إدخال اسم العميل أو المؤسسة';
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'يرجى إدخال قيمة رقمية صحيحة أكبر من الصفر ($)';
    }

    if (!owner.trim()) {
      newErrors.owner = 'يرجى اختيار أو إدخال مسؤول المبيعات';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const uniqueSuffix = Math.floor(100 + Math.random() * 900);
    const newId = `DEAL-2026-${uniqueSuffix}`;

    const newDeal: Deal = {
      id: newId,
      companyId,
      client: client.trim(),
      amount: parseFloat(amount),
      stage,
      owner: owner.trim(),
      status,
      priority,
      category,
      contactPerson: contactPerson.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      expectedCloseDate: expectedCloseDate || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
      rfpNumber: `RFP-2026-${Math.floor(100 + Math.random() * 900)}`,
      winProbability: stage === 'جاهز للإغلاق' ? 95 : stage === 'مراجعة العقود' ? 80 : stage === 'المفاوضات' ? 60 : 35,
    };

    onAddDeal(newDeal);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-right overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-base font-bold text-white">
                إضافة صفقة / طلب عرض أسعار جديد (RFP)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Create New Deal & Pipeline Opportunity
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Client Name */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              اسم العميل أو الجهة المستفيدة <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="مثال: شركة بتروجيت - قطاع الإسكندرية"
                className={`w-full bg-slate-950 border rounded-xl pr-9 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 transition ${
                  errors.client
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
            </div>
            {errors.client && (
              <p className="text-rose-400 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3 h-3" />
                {errors.client}
              </p>
            )}
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                القيمة الإجمالية التقديرية (USD) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                  className={`w-full bg-slate-950 border rounded-xl pr-9 pl-4 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-hidden focus:ring-1 transition ${
                    errors.amount
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="text-rose-400 text-[11px] mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                تصنيف الصفقة / الخدمة
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
              >
                {DEAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stage, Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                المرحلة في المسار <span className="text-rose-400">*</span>
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as DealStage)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500 font-semibold"
              >
                <option value="تقديم العرض">تقديم العرض</option>
                <option value="المفاوضات">المفاوضات</option>
                <option value="مراجعة العقود">مراجعة العقود</option>
                <option value="جاهز للإغلاق">جاهز للإغلاق</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                الحالة التشغيلية
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DealStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="pending">معلق (Pending)</option>
                <option value="in-progress">قيد التنفيذ (In-Progress)</option>
                <option value="success">مكتمل (Success)</option>
                <option value="lost">خاسر (Lost)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                درجة الأولوية
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DealPriority)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="منخفضة">منخفضة</option>
                <option value="متوسطة">متوسطة</option>
                <option value="عالية">عالية</option>
                <option value="حرجة">حرجة (Critical)</option>
              </select>
            </div>
          </div>

          {/* Owner (Sales Rep) & Expected Close Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                مسؤول المبيعات (Owner) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <select
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                >
                  {SALES_REPRESENTATIVES.map((rep) => (
                    <option key={rep} value={rep}>
                      {rep}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                تاريخ الإغلاق المتوقع
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Details (Person, Phone, Email) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                اسم ممثل العميل
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="م. طارق عبد الرحمن"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                هاتف التواصل
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+20 100 123 4567"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              الملاحظات والنطاق التعاقدي المبدئي
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تفاصيل التوريد أو متطلبات الأسطول أو أي شروط خاصة بالمناقصة..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ وإدراج الصفقة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
