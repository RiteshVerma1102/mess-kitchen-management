import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2.5',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-[#087E8B] text-white shadow-xs hover:bg-[#066873] border border-[#087E8B]/20 active:scale-[0.98]',
    secondary:
      'bg-[#DDF3F3] text-[#087E8B] hover:bg-[#cbeeed] border border-[#087E8B]/20 active:scale-[0.98]',
    outline:
      'bg-white text-[#253746] border border-[#E5EAF0] hover:bg-[#F5F7FA] hover:text-[#253746] active:scale-[0.98]',
    ghost:
      'bg-transparent text-[#718096] hover:bg-[#F5F7FA] hover:text-[#253746] active:scale-[0.98]',
    danger:
      'bg-[#DC5353] text-white shadow-xs hover:bg-[#c44343] border border-[#DC5353]/20 active:scale-[0.98]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
