import React from 'react';
import { ToastProvider } from '@/components/Toast';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 dark:bg-stone-950 px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </ToastProvider>
  );
}
