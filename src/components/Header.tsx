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
    admin: 'Manager',
    mess_admin: 'Manager',
    mess_manager: 'Mess Manager',
    kitchen_staff: 'Kitchen Chef',
    finance_officer: 'Finance Lead',
    student: 'Resident',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-white/95 px-4 sm:px-8 border-b border-[#E5EAF0] backdrop-blur-md transition">
      {/* Left: Mobile Toggle & Global Search Bar (FoodFlow Reference 1 Ditto) */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-xl border border-[#E5EAF0] bg-white p-2 text-[#718096] shadow-2xs hover:bg-[#F5F7FA] lg:hidden"
            aria-label="Toggle navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Global Search Bar (Matching FoodFlow Header) */}
        <div className="relative w-full max-w-md hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-[#718096]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search inventory, orders, suppliers..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[#F5F7FA] border border-[#E5EAF0] text-[#253746] placeholder-[#718096] focus:outline-none focus:ring-1 focus:ring-[#087E8B] focus:border-[#087E8B] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Right Controls: Sync Status, Notification Bell with red badge '1', User Profile */}
      <div className="flex items-center gap-3">
        {/* Live sync status */}
        <div
          className={`hidden md:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
            isOnline
              ? 'border-[#16A36A]/20 bg-[#E8F7F0] text-[#16A36A]'
              : 'border-[#E9A23B]/30 bg-[#FEF6E9] text-[#E9A23B] animate-pulse'
          }`}
          title={isOnline ? 'Online Sync Active' : 'Offline Mode'}
        >
          <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-[#16A36A]' : 'bg-[#E9A23B]'}`} />
          <span>{isOnline ? 'Live 1 Lakh QPS' : 'Offline'}</span>
        </div>

        {/* Notification Bell Button with Red Badge '1' (FoodFlow Ditto) */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] text-[#718096] shadow-2xs hover:text-[#253746] hover:bg-white transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC5353] text-[10px] font-extrabold text-white ring-2 ring-white">
            1
          </span>
        </button>

        {/* User Profile Avatar with Sarah Johnson / Manager (FoodFlow Ditto) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] p-1 sm:px-3 sm:py-1.5 shadow-2xs hover:bg-white transition"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#087E8B] text-white font-bold text-xs shadow-xs">
              <span>{user?.fullName?.charAt(0) || 'S'}</span>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#16A36A] ring-2 ring-white" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-[#253746] leading-tight">
                {user?.fullName || 'Sarah Johnson'}
              </span>
              <span className="text-[10px] text-[#718096] capitalize">
                {roleLabelMap[user?.role || 'admin'] || 'Manager'}
              </span>
            </div>
            <svg className="hidden sm:block h-3 w-3 text-[#718096] ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Profile Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl border border-[#E5EAF0] z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-[#E5EAF0] mb-1">
                <p className="text-xs font-bold text-[#253746]">{user?.fullName || 'Sarah Johnson'}</p>
                <p className="text-[11px] text-[#718096] truncate">{user?.email || 'admin@thapar.edu'}</p>
                <p className="text-[10px] font-semibold text-[#087E8B] mt-1 uppercase tracking-wider">
                  {user?.institutionName || 'Central Kitchen Operations'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#DC5353] hover:bg-[#FCEEEE] transition"
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
