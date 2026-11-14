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
      iconBg: 'bg-[#DDF3F3] border-[#087E8B]/20 text-[#087E8B]',
      valueColor: 'text-[#253746]',
    },
    emerald: {
      iconBg: 'bg-[#E8F7F0] border-[#16A36A]/20 text-[#16A36A]',
      valueColor: 'text-[#253746]',
    },
    amber: {
      iconBg: 'bg-[#FEF6E9] border-[#E9A23B]/30 text-[#E9A23B]',
      valueColor: 'text-[#253746]',
    },
    rose: {
      iconBg: 'bg-[#FCEEEE] border-[#DC5353]/20 text-[#DC5353]',
      valueColor: 'text-[#DC5353]',
    },
    sky: {
      iconBg: 'bg-[#DDF3F3] border-[#087E8B]/20 text-[#087E8B]',
      valueColor: 'text-[#253746]',
    },
    slate: {
      iconBg: 'bg-[#F5F7FA] border-[#E5EAF0] text-[#718096]',
      valueColor: 'text-[#253746]',
    },
  };

  const scheme = colorMap[color] || colorMap.teal;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs transition duration-150 hover:shadow-sm hover:border-[#CBD5E0] ${
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
          <span className="text-xs font-bold text-[#718096] uppercase tracking-wider">
            {title}
          </span>
        </div>
        {badge && (
          <span className="rounded-full bg-[#F5F7FA] px-2 py-0.5 text-[10px] font-bold text-[#718096] border border-[#E5EAF0]">
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
              trend.isPositive ? 'text-[#16A36A]' : 'text-[#DC5353]'
            }`}
          >
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
            {trend.label && (
              <span className="text-[10px] text-[#718096] font-normal">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-[#718096]">
          {subtext}
        </p>
      )}
    </div>
  );
}
