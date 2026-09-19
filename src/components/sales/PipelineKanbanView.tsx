import React from 'react';
import {
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Plus,
  ArrowRight,
  MoreVertical,
  Layers,
} from 'lucide-react';
import { Deal, DealStage, DealStatus } from '../../types/sales';

export interface PipelineKanbanViewProps {
  deals: Deal[];
  onViewDetails: (deal: Deal) => void;
  onOpenCreateModal: () => void;
  onUpdateDealStage: (deal: Deal, newStage: DealStage) => void;
  canEdit?: boolean;
}

const STAGES: { key: DealStage; label: string; enLabel: string; color: string; badgeColor: string }[] = [
  {
    key: 'تقديم العرض',
    label: 'تقديم العرض والـ RFP',
    enLabel: 'Proposal Submission',
    color: 'border-amber-500/50 bg-amber-950/20 text-amber-300',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    key: 'المفاوضات',
    label: 'جلسات المفاوضات',
    enLabel: 'Active Negotiations',
    color: 'border-blue-500/50 bg-blue-950/20 text-blue-300',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    key: 'مراجعة العقود',
    label: 'مراجعة العقود والاعتماد',
    enLabel: 'Contract Review',
    color: 'border-indigo-500/50 bg-indigo-950/20 text-indigo-300',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  },
  {
    key: 'جاهز للإغلاق',
    label: 'جاهز للإغلاق والتعميد',
    enLabel: 'Ready to Close',
    color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
];

export const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({
  deals,
  onViewDetails,
  onOpenCreateModal,
  onUpdateDealStage,
  canEdit = true,
}) => {
  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(deal));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const deal: Deal = JSON.parse(rawData);
      if (deal.stage !== targetStage && canEdit) {
        onUpdateDealStage(deal, targetStage);
      }
    } catch (err) {
      console.warn('[Kanban] Drag-and-drop parsing error:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Notice for Kanban */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-white">خط أنابيب الصفقات التفاعلي (Interactive Kanban Pipeline)</span>
          <span className="text-slate-400 hidden sm:inline">
            — يمكنك سحب وإفلات بطاقة أي صفقة لنقلها فورياً بين المراحل البيعية
          </span>
        </div>
        {canEdit && (
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة صفقة جديدة</span>
          </button>
        )}
      </div>

      {/* 4 Stages Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAGES.map((stageInfo) => {
          const stageDeals = deals.filter((d) => d.stage === stageInfo.key);
          const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

          return (
            <div
              key={stageInfo.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stageInfo.key)}
              className="flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800/90 overflow-hidden min-h-[500px]"
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-slate-800/80 ${stageInfo.color}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">{stageInfo.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${stageInfo.badgeColor}`}>
                    {stageDeals.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300/80">
                  <span>{stageInfo.enLabel}</span>
                  <span className="font-mono font-bold text-white">${stageTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Column Deals List */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[700px]">
                {stageDeals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center p-4 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                    <Layers className="w-6 h-6 mb-2 opacity-40 text-slate-400" />
                    <span>لا توجد صفقات في هذه المرحلة</span>
                    <span className="text-[10px] text-slate-600 mt-0.5">اسحب صفقة إلى هنا لنقلها</span>
                  </div>
                ) : (
                  stageDeals.map((deal) => {
                    const isClosingSoon = deal.expectedCloseDate && new Date(deal.expectedCloseDate) < new Date();
                    const winProb = deal.winProbability ?? (stageInfo.key === 'جاهز للإغلاق' ? 95 : 50);

                    return (
                      <div
                        key={deal.id}
                        draggable={canEdit}
                        onDragStart={(e) => handleDragStart(e, deal)}
                        onClick={() => onViewDetails(deal)}
                        className={`group relative p-4 rounded-xl bg-slate-950/80 border transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:scale-[1.01] ${
                          deal.priority === 'حرجة'
                            ? 'border-rose-600/40 hover:border-rose-500'
                            : deal.priority === 'عالية'
                            ? 'border-amber-600/40 hover:border-amber-500'
                            : 'border-slate-800 hover:border-blue-500/60'
                        }`}
                      >
                        {/* Top Deal Meta */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                            {deal.id}
                          </span>
                          {deal.priority && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                deal.priority === 'حرجة'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : deal.priority === 'عالية'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              أولوية {deal.priority}
                            </span>
                          )}
                        </div>

                        {/* Client Name */}
                        <h4 className="font-bold text-sm text-white mb-1 group-hover:text-blue-400 transition leading-snug">
                          {deal.client}
                        </h4>

                        {/* Category or RFP */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3">
                          {deal.category && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {deal.category}
                            </span>
                          )}
                          {deal.rfpNumber && <span className="font-mono text-[10px]">{deal.rfpNumber}</span>}
                        </div>

                        {/* Amount & Probability Bar */}
                        <div className="pt-2.5 border-t border-slate-800/80 mb-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-slate-400 font-medium">القيمة المقدرة:</span>
                            <span className="text-base font-black text-white font-mono">
                              ${deal.amount.toLocaleString()}
                            </span>
                          </div>

                          {/* Probability Mini-progress */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>احتمال الفوز:</span>
                              <span className="font-bold font-mono text-blue-300">{winProb}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  winProb >= 80 ? 'bg-emerald-500' : winProb >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${winProb}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Footer: Owner & Dates */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/50">
                          <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{deal.owner}</span>
                          </div>

                          {deal.expectedCloseDate && (
                            <div
                              className={`flex items-center gap-1 font-mono text-[10px] ${
                                isClosingSoon ? 'text-rose-400 font-bold' : 'text-slate-400'
                              }`}
                              title="تاريخ الإغلاق المتوقع"
                            >
                              <Clock className="w-3 h-3" />
                              <span>{deal.expectedCloseDate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
