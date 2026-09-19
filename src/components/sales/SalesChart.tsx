import React, { useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { MonthlySalesData } from '../../types/sales';

export interface SalesChartProps {
  data: MonthlySalesData[];
  id?: string;
}

export const SalesChart: React.FC<SalesChartProps> = ({ data, id = 'sales-bar-chart' }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxVal = Math.max(...data.map((d) => Math.max(d.actual, d.target)), 260000);
  const chartHeight = 220;
  const chartWidth = 560;
  const paddingX = 50;
  const paddingBottom = 40;
  const paddingTop = 25;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const usableWidth = chartWidth - paddingX * 2;
  const groupWidth = usableWidth / data.length;
  const barWidth = 16;
  const barGap = 4;

  const totalActual = data.reduce((acc, d) => acc + d.actual, 0);
  const totalTarget = data.reduce((acc, d) => acc + d.target, 0);
  const overallRate = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 100;

  // Grid ticks
  const yTicks = [0, 50000, 100000, 150000, 200000, 250000];

  return (
    <div
      id={id}
      className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg shadow-black/20 flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              المبيعات الفعلية مقابل المستهدف (يناير – يونيو 2026)
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            Monthly Actual vs. Target Quota (USD)
          </p>
        </div>

        {/* Legend and Rate badge */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block shadow-xs shadow-blue-500/50" />
            <span className="text-slate-300 font-medium text-[11px]">الفعلي (Actual)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-cyan-400/60 inline-block border border-cyan-400" />
            <span className="text-slate-300 font-medium text-[11px]">المستهدف (Target)</span>
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <TrendingUp className="w-3 h-3" />
            <span>تحقيق {overallRate}%</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative mt-4 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto select-none"
          style={{ minWidth: '420px', maxHeight: '250px' }}
          role="img"
          aria-label="رسم بياني للمبيعات الفعلية مقابل المستهدف للنصف الأول من 2026"
        >
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="highlightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y axis labels */}
          {yTicks.map((val) => {
            const y = chartHeight - paddingBottom - (val / maxVal) * usableHeight;
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - 20}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="3 3"
                  strokeOpacity="0.6"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ${val / 1000}k
                </text>
              </g>
            );
          })}

          {/* Data Bars */}
          {data.map((item, idx) => {
            const groupX = paddingX + idx * groupWidth + (groupWidth - (barWidth * 2 + barGap)) / 2;
            const actualH = (item.actual / maxVal) * usableHeight;
            const targetH = (item.target / maxVal) * usableHeight;
            const actualY = chartHeight - paddingBottom - actualH;
            const targetY = chartHeight - paddingBottom - targetH;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={item.month}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Highlight background column */}
                {isHovered && (
                  <rect
                    x={groupX - 8}
                    y={paddingTop}
                    width={barWidth * 2 + barGap + 16}
                    height={usableHeight + 10}
                    fill="#1e293b"
                    opacity="0.5"
                    rx="6"
                  />
                )}

                {/* Target Bar */}
                <rect
                  x={groupX}
                  y={targetY}
                  width={barWidth}
                  height={targetH}
                  fill="url(#targetGradient)"
                  stroke="#0891b2"
                  strokeWidth="1"
                  rx="3"
                  className="transition-all duration-300"
                />

                {/* Actual Bar */}
                <rect
                  x={groupX + barWidth + barGap}
                  y={actualY}
                  width={barWidth}
                  height={actualH}
                  fill={isHovered ? 'url(#highlightGradient)' : 'url(#actualGradient)'}
                  rx="3"
                  className="transition-all duration-300"
                />

                {/* Month label on X Axis */}
                <text
                  x={groupX + barWidth + barGap / 2}
                  y={chartHeight - paddingBottom + 18}
                  textAnchor="middle"
                  fill={isHovered ? '#93c5fd' : '#94a3b8'}
                  fontSize="11"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {item.shortMonth}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip on Hover */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="mt-2 p-2.5 rounded-xl bg-slate-800/95 border border-slate-700 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>{data[hoveredIndex].monthAr} ({data[hoveredIndex].month})</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div>
                <span className="text-slate-400">الفعلي: </span>
                <span className="font-bold text-blue-300 font-mono">
                  ${data[hoveredIndex].actual.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">المستهدف: </span>
                <span className="font-bold text-cyan-300 font-mono">
                  ${data[hoveredIndex].target.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">نسبة الإنجاز: </span>
                <span
                  className={`font-bold font-mono ${
                    data[hoveredIndex].actual >= data[hoveredIndex].target
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {Math.round((data[hoveredIndex].actual / data[hoveredIndex].target) * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>إجمالي الفعلي H1 2026: <strong className="text-white font-mono">${totalActual.toLocaleString()}</strong></span>
        <span>المستهدف الإجمالي: <strong className="text-cyan-300 font-mono">${totalTarget.toLocaleString()}</strong></span>
      </div>
    </div>
  );
};
