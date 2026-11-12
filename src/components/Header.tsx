'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

export interface HeaderUser {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  institutionName?: string;
}

interface HeaderProps {
  user: HeaderUser | null;
  onToggleSidebar?: () => void;
}

export function Header({ user, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const res = await fetch('/api/v1/auth/logout', { method: 'POST' });
      if (res.ok) {
        success('Logged Out', 'You have been safely signed out');
        router.push('/login');
        router.refresh();
      } else {
        error('Logout Failed', 'Could not terminate session');
      }
    } catch {
      error('Network Error', 'Failed to reach server');
    } finally {
      setLoggingOut(false);
    }
  };

  const roleLabelMap: Record<string, string> = {
    admin: 'Super Admin',
    mess_admin: 'Mess Admin',
    mess_manager: 'Mess Manager',
    kitchen_staff: 'Kitchen Staff',
    finance_officer: 'Finance Officer',
    student: 'Student',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-line bg-paper/95 px-4 sm:px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded p-2 text-ink/70 hover:bg-stone-200/50 dark:hover:bg-stone-800 lg:hidden"
            aria-label="Toggle navigation"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            {user?.institutionName ?? 'Smart Mess System'}
          </span>
          <span className="text-sm font-medium text-ink/80 hidden sm:inline">
            Smart Kitchen Management & Waste Optimization
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Online / Offline status badge */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
            isOnline
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
              : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 animate-pulse'
          }`}
          title={isOnline ? 'System is connected' : 'Working offline - pending sync'}
        >
          <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* User Info & Role Badge */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-ink leading-tight">{user.fullName}</span>
              <span className="text-xs text-ink/60 capitalize">
                {roleLabelMap[user.role] ?? user.role.replace('_', ' ')}
              </span>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-sm">
              {user.fullName.charAt(0).toUpperCase()}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink/80 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition"
            >
              {loggingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="rounded-md bg-brand px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
