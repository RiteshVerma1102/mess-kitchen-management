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
    { name: 'Inventory', href: '/inventory', icon: '📦', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'] },
    { name: 'Kitchen Ops', href: '/kitchen', icon: '🍳', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'] },
    { name: 'Menu Planner', href: '/menus', icon: '🍽️' },
    { name: 'Calendar', href: '/calendar', icon: '📅' },
    { name: 'Analytics', href: '/analytics', icon: '📈', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'finance_officer'] },
    { name: 'Attendance', href: '/attendance', icon: '📱', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'] },
    { name: 'AI Forecast', href: '/forecast', icon: '✨', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff', 'finance_officer'] },
    { name: 'Recipes & BOM', href: '/recipes', icon: '🥗', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'] },
    { name: 'Students', href: '/students', icon: '🎓', requiredRoles: ['admin', 'mess_admin', 'mess_manager', 'kitchen_staff'] },
    { name: 'Users & Roles', href: '/users', icon: '👥', requiredRoles: ['admin'] },
  ];

  const visibleMenuItems = menuItems.filter(
    (item) => !item.requiredRoles || item.requiredRoles.includes(role),
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#253746]/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#E5EAF0] bg-white shadow-xs transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header (FoodFlow Reference 1 Ditto) */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-[#E5EAF0]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#087E8B] text-white font-extrabold text-base shadow-xs">
              🍃
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[#253746] text-lg tracking-tight leading-none">
                FoodFlow
              </span>
              <span className="text-[10px] font-semibold text-[#718096] mt-0.5">
                Food Management App
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#718096] hover:bg-[#F5F7FA] lg:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Quick Search Bar */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 rounded-xl bg-[#F5F7FA] border border-[#E5EAF0] px-3 py-2 text-xs text-[#718096] focus-within:border-[#087E8B] focus-within:bg-white focus-within:text-[#253746] transition">
            <svg className="h-3.5 w-3.5 text-[#718096]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search inventory, orders..."
              className="w-full bg-transparent text-xs text-[#253746] placeholder-[#718096] focus:outline-none"
            />
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#718096]">
            Main Menu
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
                    ? 'bg-[#087E8B] text-white shadow-xs'
                    : 'text-[#718096] hover:bg-[#F5F7FA] hover:text-[#253746]'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-4 px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#718096]">
            Preferences
          </div>
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#718096] hover:bg-[#F5F7FA] hover:text-[#253746] transition"
          >
            <span className="text-sm">⚙️</span>
            <span>Settings</span>
          </Link>
        </nav>

        {/* Need Help? Card (FoodFlow Image 1 Ditto) */}
        <div className="p-4 border-t border-[#E5EAF0]">
          <div className="rounded-2xl bg-[#DDF3F3]/50 p-4 border border-[#087E8B]/20 text-center relative overflow-hidden">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#087E8B] text-white text-xl shadow-xs mb-2">
              👨‍🍳
            </div>
            <p className="text-xs font-extrabold text-[#253746]">Need Help?</p>
            <p className="text-[11px] text-[#718096] mt-0.5">
              Contact 24/7 mess operations & supplier support
            </p>
            <button
              type="button"
              onClick={() => alert('Support line: support@foodflow.org | Mess Helpdesk Ext: 402')}
              className="mt-3 w-full rounded-xl bg-white border border-[#087E8B]/30 py-1.5 text-[11px] font-bold text-[#087E8B] shadow-2xs hover:bg-[#DDF3F3] transition"
            >
              Contact Support
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
