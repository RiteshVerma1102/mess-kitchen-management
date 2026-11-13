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
  const [menuOpen, setMenuOpen] = useState(false);

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
    student: 'Student Resident',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-[#F4F7FE]/90 px-4 sm:px-8 backdrop-blur-md transition">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-xl border border-slate-200/80 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden"
            aria-label="Toggle navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
            Dashboard
          </h1>
        </div>
      </div>

      {/* Right Controls: Notification, Status, Profile Avatar */}
      <div className="flex items-center gap-3">
        {/* Online / Offline status badge */}
        <div
          className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
            isOnline
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700 animate-pulse'
          }`}
          title={isOnline ? 'Online Sync Active' : 'Offline Mode'}
        >
          <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span>{isOnline ? 'Live' : 'Offline'}</span>
        </div>

        {/* Notification Bell Button */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 shadow-sm hover:text-slate-900 hover:bg-slate-50 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        {/* Settings/Theme Toggle Button */}
        <button
          type="button"
          aria-label="System Settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 shadow-sm hover:text-slate-900 hover:bg-slate-50 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-1 sm:px-3 sm:py-1.5 shadow-sm hover:bg-slate-50 transition"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white font-bold text-xs shadow-sm">
              {user?.fullName?.charAt(0) || 'S'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {user?.fullName || 'Sarah Johnson'}
              </span>
              <span className="text-[10px] text-slate-400 capitalize">
                {roleLabelMap[user?.role || 'admin'] || 'Mess Admin'}
              </span>
            </div>
            <svg className="hidden sm:block h-3 w-3 text-slate-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Profile Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-800">{user?.fullName || 'Sarah Johnson'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@thapar.edu'}</p>
                <p className="text-[10px] font-semibold text-blue-600 mt-1 uppercase tracking-wider">
                  {user?.institutionName || 'Thapar Institute'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                <span>🚪</span>
                <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
