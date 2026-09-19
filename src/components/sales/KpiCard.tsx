import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface KpiCardProps {
  id?: string;
  title: string;
  titleEn?: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    period: string;
    isPositive?: boolean;
  };
  icon: LucideIcon;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'cyan';
  badgeText?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  id,
  title,
  titleEn,
  value,
  subtitle,
  change,
  icon: Icon,
  accentColor = 'blue',
  badgeText,
}) => {
  const colorMap = {
    blue: {
      bgIcon: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      badge: 'bg-blue-950/80 text-blue-300 border-blue-800/60',
      glow: 'group-hover:border-blue-500/40',
    },
    emerald: {
      bgIcon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
      glow: 'group-hover:border-emerald-500/40',
    },
    amber: {
      bgIcon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      badge: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
      glow: 'group-hover:border-amber-500/40',
    },
    indigo: {
      bgIcon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
      glow: 'group-hover:border-indigo-500/40',
    },
    cyan: {
      bgIcon: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
      glow: 'group-hover:border-cyan-500/40',
    },
  };

  const selectedTheme = colorMap[accentColor] || colorMap.blue;

  return (
    <div
      id={id}
      className={`group relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 ${selectedTheme.glow}`}
    >
      {/* Top row: Titles & Icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-200 tracking-wide">{title}</h3>
            {badgeText && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${selectedTheme.badge}`}>
                {badgeText}
              </span>
            )}
          </div>
          {titleEn && (
            <p className="text-[11px] text-slate-400 font-mono tracking-wider">{titleEn}</p>
          )}
        </div>

        <div className={`p-2.5 rounded-xl border ${selectedTheme.bgIcon} transition-transform group-hover:scale-110 duration-200`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
          {value}
        </span>
      </div>

      {/* Footer: Trend and Subtitle */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        {change && (
          <div className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-0.5 font-bold ${
                change.isPositive !== false ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {change.isPositive !== false ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span dir="ltr">
                {change.isPositive !== false ? '+' : ''}
                {change.value}%
              </span>
            </span>
            <span className="text-slate-400 text-[11px]">{change.period}</span>
          </div>
        )}

        {subtitle && (
          <span className="text-[11px] text-slate-400 truncate max-w-[65%]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
