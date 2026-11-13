'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  role?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: string;
  requiredRoles?: string[];
}

export function Sidebar({ role = 'student', isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const menuItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Analytics', href: '/analytics', icon: '📈', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'finance_officer'] },
    { name: 'Attendance', href: '/attendance', icon: '📱', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'] },
    { name: 'Menu Planner', href: '/menus', icon: '🍽️' },
    { name: 'Recipes & BOM', href: '/recipes', icon: '🥗', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'] },
    { name: 'Calendar', href: '/calendar', icon: '📅' },
    { name: 'Kitchen Ops', href: '/kitchen', icon: '🍳', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'] },
    { name: 'Inventory', href: '/inventory', icon: '📦', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'] },
    { name: 'AI Forecast', href: '/forecast', icon: '🔮', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff', 'finance_officer'] },
    { name: 'Students', href: '/students', icon: '🎓', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'] },
    { name: 'User Access', href: '/users', icon: '👥', requiredRoles: ['admin'] },
  ];

  const visibleMenuItems = menuItems.filter(
    (item) => !item.requiredRoles || item.requiredRoles.includes(role),
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-100 bg-white shadow-sm transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-50">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-lg shadow-sm shadow-blue-500/30">
              A
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-base tracking-tight leading-none">
                Alpha
              </span>
              <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                Smart Mess & Kitchen
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Quick Search */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/60 px-3 py-2 text-xs text-slate-400 focus-within:border-blue-500 focus-within:bg-white focus-within:text-slate-800 transition">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search here..."
              className="w-full bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu
          </div>
          {visibleMenuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-4 px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Settings
          </div>
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <span className="text-sm">⚙️</span>
            <span>Settings</span>
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <span className="text-sm">💬</span>
            <span>Help & Support</span>
          </a>
        </nav>

        {/* Bottom Banner */}
        <div className="p-4 border-t border-slate-50">
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/60 p-3.5 border border-blue-100/60">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <span>🌱</span>
              <span>Zero Food Waste</span>
            </div>
            <p className="mt-1 text-[11px] text-blue-700/80 leading-snug">
              Forecast demand. Cook precisely. Save costs & campus resources.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
