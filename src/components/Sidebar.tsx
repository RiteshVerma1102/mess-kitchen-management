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

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: '📊',
    },
    {
      name: 'Attendance (Offline)',
      href: '/attendance',
      icon: '📱',
      requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'],
    },
    {
      name: 'Menu Management',
      href: '/menus',
      icon: '🍽️',
    },
    {
      name: 'Recipes & BOM',
      href: '/recipes',
      icon: '🥗',
      requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'],
    },
    {
      name: 'Calendar & Schedule',
      href: '/calendar',
      icon: '📅',
    },
    {
      name: 'Demand Forecast',
      href: '/forecast',
      icon: '📈',
      requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff', 'finance_officer'],
    },
    {
      name: 'Students Directory',
      href: '/students',
      icon: '🎓',
      requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'],
    },
    {
      name: 'User Management',
      href: '/users',
      icon: '👥',
      requiredRoles: ['admin'],
    },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.requiredRoles || item.requiredRoles.includes(role),
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-paper transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b border-line px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-lg text-white shadow">
              🍲
            </span>
            <span className="font-bold tracking-tight text-ink text-base">SmartMess P05</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink/60 hover:bg-stone-200/50 dark:hover:bg-stone-800 lg:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
            Operations
          </div>
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand/10 font-semibold text-brand dark:bg-brand/20'
                    : 'text-ink/80 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 hover:text-ink'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom mess notice */}
        <div className="border-t border-line p-4">
          <div className="rounded-lg bg-brand/5 dark:bg-brand/10 p-3 border border-brand/20">
            <p className="text-xs font-semibold text-brand">Goal: Zero Food Waste</p>
            <p className="mt-1 text-[11px] text-ink/70">
              Cook what will be eaten. Real-time scanning & dynamic forecasting.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
