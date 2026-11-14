import React from 'react';

export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs animate-pulse space-y-4">
      <div className="h-5 w-1/3 bg-slate-200 rounded-lg" />
      <div className="h-8 w-1/2 bg-slate-200 rounded-lg" />
      <div className="h-4 w-full bg-slate-100 rounded-lg" />
    </div>
  );
}
