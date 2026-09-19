import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  User,
} from 'lucide-react';
import { DealActivity, ActivityType } from '../../types/sales';
import {
  listenToDealActivities,
  addDealActivity,
} from '../../services/salesService';

export interface DealActivityLogProps {
  companyId: string;
  dealId: string;
  currentUser?: { name?: string; email?: string; uid?: string };
  canEdit?: boolean;
}

export const DealActivityLog: React.FC<DealActivityLogProps> = ({
  companyId,
  dealId,
  currentUser,
  canEdit = true,
}) => {
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [selectedType, setSelectedType] = useState<ActivityType>('note');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!dealId) return;
    const unsub = listenToDealActivities(companyId, dealId, (list) => {
      setActivities(list);
    });
    return () => unsub();
  }, [companyId, dealId]);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const newAct: DealActivity = {
      id: `ACT-${Date.now()}`,
      dealId,
      companyId,
      type: selectedType,
      title: getActivityTypeTitle(selectedType),
      description: newNote.trim(),
      userName: currentUser?.name || currentUser?.email || 'مسؤول المبيعات',
      userEmail: currentUser?.email,
      timestamp: new Date().toISOString(),
    };

    try {
      await addDealActivity(companyId, dealId, newAct);
      setNewNote('');
    } catch (err) {
      console.warn('Error adding activity:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActivityTypeTitle = (type: ActivityType): string => {
    switch (type) {
      case 'call':
        return 'مكالمة هاتفية مع العميل';
      case 'meeting':
        return 'اجتماع عمل ومفاوضات';
      case 'email':
        return 'مراسلة بريد إلكتروني';
      case 'rfp_sent':
        return 'إرسال وثائق أو ملحق عرض';
      case 'note':
      default:
        return 'ملاحظة ومتابعة ميدانية';
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'call':
        return <Phone className="w-3.5 h-3.5 text-blue-400" />;
      case 'meeting':
        return <Calendar className="w-3.5 h-3.5 text-indigo-400" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-cyan-400" />;
      case 'stage_change':
        return <Layers className="w-3.5 h-3.5 text-amber-400" />;
      case 'status_change':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'note':
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Quick Entry Box */}
      {canEdit && (
        <form onSubmit={handleAddActivity} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300">تسجيل تحديث أو نشاط فوري:</span>
            {/* Activity Type Selector */}
            <div className="flex items-center gap-1">
              {[
                { type: 'note' as ActivityType, label: 'ملاحظة', icon: MessageSquare },
                { type: 'call' as ActivityType, label: 'مكالمة', icon: Phone },
                { type: 'meeting' as ActivityType, label: 'اجتماع', icon: Calendar },
                { type: 'email' as ActivityType, label: 'إيميل', icon: Mail },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setSelectedType(t.type)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      selectedType === t.type
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="اكتب خلاصة المكالمة أو الاجتماع أو الملاحظة هنا ليتم حفظها في سجل الصفقة..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newNote.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'تسجيل في السجل'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Activity Timeline List */}
      <div className="space-y-3">
        <h4 className="font-bold text-slate-300 flex items-center justify-between">
          <span>سجل الحركات والتدقيق الزمني:</span>
          <span className="text-[11px] font-normal text-slate-400">{activities.length} عملية مسجلة</span>
        </h4>

        {activities.length === 0 ? (
          <div className="text-center py-6 text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800">
            <Clock className="w-6 h-6 mx-auto mb-1 opacity-40" />
            <span>لا توجد أنشطة مسجلة لهذه الصفقة حتى الآن</span>
          </div>
        ) : (
          <div className="relative pr-4 space-y-4 before:absolute before:right-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {activities.map((act) => {
              const formattedDate = new Date(act.timestamp).toLocaleString('ar-EG', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={act.id} className="relative pr-3 group">
                  {/* Timeline Dot */}
                  <div className="absolute -right-4 top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center" />

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 group-hover:border-slate-700 transition">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded-md bg-slate-900 border border-slate-800">
                          {getActivityIcon(act.type)}
                        </span>
                        <span className="font-bold text-slate-200">{act.title}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">{formattedDate}</span>
                    </div>

                    <p className="text-slate-300 leading-relaxed mt-1 text-[11px] whitespace-pre-wrap">
                      {act.description}
                    </p>

                    <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-900 text-[10px] text-slate-400">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{act.userName}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
