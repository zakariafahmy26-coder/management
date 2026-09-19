import React, { useState } from 'react';
import { PieChart, Layers } from 'lucide-react';
import { Deal, DealStage } from '../../types/sales';

export interface PipelineChartProps {
  deals: Deal[];
  id?: string;
}

interface StageBreakdown {
  stage: DealStage;
  count: number;
  totalAmount: number;
  percentage: number;
  color: string;
  gradientStart: string;
  gradientEnd: string;
}

export const PipelineChart: React.FC<PipelineChartProps> = ({
  deals,
  id = 'pipeline-donut-chart',
}) => {
  const [hoveredStage, setHoveredStage] = useState<DealStage | null>(null);

  const STAGES_CONFIG: { stage: DealStage; color: string; gradientStart: string; gradientEnd: string }[] = [
    {
      stage: 'جاهز للإغلاق',
      color: '#10b981', // Emerald
      gradientStart: '#10b981',
      gradientEnd: '#059669',
    },
    {
      stage: 'مراجعة العقود',
      color: '#6366f1', // Indigo
      gradientStart: '#818cf8',
      gradientEnd: '#4f46e5',
    },
    {
      stage: 'المفاوضات',
      color: '#3b82f6', // Blue
      gradientStart: '#60a5fa',
      gradientEnd: '#2563eb',
    },
    {
      stage: 'تقديم العرض',
      color: '#f59e0b', // Amber
      gradientStart: '#fbbf24',
      gradientEnd: '#d97706',
    },
  ];

  const totalPipelineAmount = deals.reduce((acc, d) => acc + d.amount, 0);

  const breakdown: StageBreakdown[] = STAGES_CONFIG.map((cfg) => {
    const stageDeals = deals.filter((d) => d.stage === cfg.stage);
    const totalAmount = stageDeals.reduce((acc, d) => acc + d.amount, 0);
    const count = stageDeals.length;
    const percentage = totalPipelineAmount > 0 ? Math.round((totalAmount / totalPipelineAmount) * 100) : 0;
    return {
      stage: cfg.stage,
      count,
      totalAmount,
      percentage,
      color: cfg.color,
      gradientStart: cfg.gradientStart,
      gradientEnd: cfg.gradientEnd,
    };
  });

  // Calculate SVG donut segments
  const size = 190;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div
      id={id}
      className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg shadow-black/20 flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              توزيع خط الصفقات حسب المرحلة
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            Pipeline Distribution by Stage
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>{deals.length} صفقة نشطة</span>
        </div>
      </div>

      {/* Donut and breakdown */}
      <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-6">
        {/* Donut SVG */}
        <div className="relative flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 select-none"
            role="img"
            aria-label="مخطط دائري لمراحل الصفقات"
          >
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
            />

            {/* Stage segments */}
            {breakdown.map((item) => {
              const dashLength = (item.percentage / 100) * circumference;
              const dashOffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percentage;
              const isHovered = hoveredStage === item.stage;

              if (item.percentage <= 0) return null;

              return (
                <circle
                  key={item.stage}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredStage(item.stage)}
                  onMouseLeave={() => setHoveredStage(null)}
                />
              );
            })}
          </svg>

          {/* Center text inside Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
            {hoveredStage ? (
              <>
                <span className="text-[11px] text-slate-400 font-semibold truncate max-w-[120px]">
                  {hoveredStage}
                </span>
                <span className="text-base font-black text-white font-mono mt-0.5">
                  $
                  {(
                    breakdown.find((b) => b.stage === hoveredStage)?.totalAmount || 0
                  ).toLocaleString()}
                </span>
                <span className="text-[10px] text-indigo-300 font-bold">
                  {breakdown.find((b) => b.stage === hoveredStage)?.percentage}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  إجمالي الصفقات
                </span>
                <span className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                  ${totalPipelineAmount.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">
                  {deals.length} صفقة
                </span>
              </>
            )}
          </div>
        </div>

        {/* Breakdown Legend List */}
        <div className="w-full md:w-auto flex-1 space-y-2">
          {breakdown.map((item) => {
            const isHovered = hoveredStage === item.stage;
            return (
              <div
                key={item.stage}
                onMouseEnter={() => setHoveredStage(item.stage)}
                onMouseLeave={() => setHoveredStage(null)}
                className={`p-2 rounded-xl transition-all duration-200 cursor-pointer border ${
                  isHovered
                    ? 'bg-slate-800 border-slate-600 scale-[1.02]'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-slate-200">{item.stage}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({item.count})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs">
                      ${item.totalAmount.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 font-mono w-8 text-left">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-1.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-2.5 border-t border-slate-800/60 text-center text-[11px] text-slate-400">
        مرتبة حسب نضج مسار البيع من تقديم العروض وصولاً إلى مرحلة الإغلاق النهائي
      </div>
    </div>
  );
};
