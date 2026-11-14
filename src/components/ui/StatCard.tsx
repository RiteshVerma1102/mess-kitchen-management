import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  subtext?: string;
  badge?: string;
  color?: 'teal' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  subtext,
  badge,
  color = 'teal',
  className = '',
  onClick,
}: StatCardProps) {
  const colorMap = {
    teal: {
      iconBg: 'bg-teal-50 border-teal-100/80 text-teal-800',
      valueColor: 'text-slate-900',
    },
    emerald: {
      iconBg: 'bg-emerald-50 border-emerald-100/80 text-emerald-800',
      valueColor: 'text-slate-900',
    },
    amber: {
      iconBg: 'bg-amber-50 border-amber-100/80 text-amber-800',
      valueColor: 'text-slate-900',
    },
    rose: {
      iconBg: 'bg-rose-50 border-rose-100/80 text-rose-800',
      valueColor: 'text-rose-900',
    },
    sky: {
      iconBg: 'bg-sky-50 border-sky-100/80 text-sky-800',
      valueColor: 'text-slate-900',
    },
    slate: {
      iconBg: 'bg-slate-100 border-slate-200/80 text-slate-700',
      valueColor: 'text-slate-900',
    },
  };

  const scheme = colorMap[color] || colorMap.teal;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-100/90 bg-white p-5 shadow-xs transition duration-150 hover:shadow-sm hover:border-slate-200/80 ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-sm font-bold shadow-2xs ${scheme.iconBg}`}
            >
              {icon}
            </div>
          )}
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
        </div>
        {badge && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200/60">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className={`text-2xl font-black tracking-tight ${scheme.valueColor}`}>
          {value}
        </p>

        {trend && (
          <div
            className={`flex items-center gap-1 text-[11px] font-bold ${
              trend.isPositive ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
            {trend.label && (
              <span className="text-[10px] text-slate-400 font-normal">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-[11px] font-medium text-slate-400 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
}

