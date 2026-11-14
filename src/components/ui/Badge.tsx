import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  withDot?: boolean;
}

export function Badge({
  variant = 'neutral',
  withDot = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string; border: string }> = {
    success: {
      bg: 'bg-[#E8F7F0]',
      text: 'text-[#16A36A]',
      dot: 'bg-[#16A36A]',
      border: 'border-[#16A36A]/20',
    },
    warning: {
      bg: 'bg-[#FEF6E9]',
      text: 'text-[#E9A23B]',
      dot: 'bg-[#E9A23B]',
      border: 'border-[#E9A23B]/30',
    },
    danger: {
      bg: 'bg-[#FCEEEE]',
      text: 'text-[#DC5353]',
      dot: 'bg-[#DC5353]',
      border: 'border-[#DC5353]/20',
    },
    info: {
      bg: 'bg-[#DDF3F3]',
      text: 'text-[#087E8B]',
      dot: 'bg-[#087E8B]',
      border: 'border-[#087E8B]/20',
    },
    neutral: {
      bg: 'bg-[#F5F7FA]',
      text: 'text-[#718096]',
      dot: 'bg-[#718096]',
      border: 'border-[#E5EAF0]',
    },
    primary: {
      bg: 'bg-[#DDF3F3]',
      text: 'text-[#087E8B]',
      dot: 'bg-[#087E8B]',
      border: 'border-[#087E8B]/20',
    },
  };

  const style = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[11px] font-bold ${style.bg} ${style.text} ${style.border} ${className}`}
      {...props}
    >
      {withDot && <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />}
      {children}
    </span>
  );
}
