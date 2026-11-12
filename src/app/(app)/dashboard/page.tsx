'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

interface DashboardMetrics {
  totalStudents: number;
  todayAttendance: number;
  expectedMeals: number;
  prepStatus: string;
  totalInventory: number;
  dailyFoodWasteKg: number;
  dailyWasteLossPaise: number;
  estimatedFoodCostPaise: number;
}

interface DashboardData {
  today: string;
  dayName: string;
  isHoliday: boolean;
  impactMultiplier: number;
  metrics: DashboardMetrics;
  todayMenu: {
    name?: string;
    meals?: {
      breakfast?: Array<{ dishId?: { name?: string; category?: string } }>;
      lunch?: Array<{ dishId?: { name?: string; category?: string } }>;
      snacks?: Array<{ dishId?: { name?: string; category?: string } }>;
      dinner?: Array<{ dishId?: { name?: string; category?: string } }>;
    };
  } | null;
  mealTimings: Record<string, string>;
  events: Array<{ title: string; eventType: string }>;
}

export default function DashboardPage() {
  const { error } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/v1/dashboard/metrics');
        if (res.ok) {
          const body = await res.json();
          setData(body.data);
        } else {
          error('Error', 'Failed to retrieve dashboard metrics');
        }
      } catch {
        error('Network Error', 'Cannot connect to dashboard services');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [error]);

  const formatPaise = (paise: number) => {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-stone-200 dark:bg-stone-800 animate-pulse rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-stone-200 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalStudents: 30,
    todayAttendance: 0,
    expectedMeals: 28,
    prepStatus: 'Scheduled',
    totalInventory: 16,
    dailyFoodWasteKg: 14.5,
    dailyWasteLossPaise: 185000,
    estimatedFoodCostPaise: 145600,
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Date Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Kitchen & Mess Overview</h1>
          <p className="text-xs text-ink/70 mt-1">
            {data?.dayName ?? 'Today'}, {data?.today ?? new Date().toISOString().slice(0, 10)}
            {data?.isHoliday && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                🎉 University Holiday / Recess
              </span>
            )}
          </p>
        </div>

        {/* Quick Action Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
          >
            <span>📱</span>
            <span>Mark Attendance</span>
          </Link>
          <Link
            href="/menus"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <span>🍽️</span>
            <span>Menu Planner</span>
          </Link>
          <Link
            href="/recipes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <span>🥗</span>
            <span>BOM Scaling</span>
          </Link>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <span>📅</span>
            <span>Calendar</span>
          </Link>
        </div>
      </div>

      {/* 7 Core Dashboard Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Students */}
        <div className="rounded-xl border border-line bg-paper p-5 shadow-sm hover:border-brand/40 transition">
          <div className="flex items-center justify-between text-ink/60">
            <span className="text-xs font-medium uppercase tracking-wider">Total Students</span>
            <span className="text-lg">🎓</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-ink">{metrics.totalStudents}</span>
            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
              Active Enrolled
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink/60">Subscribed hostel residents</p>
        </div>

        {/* 2. Today's Attendance */}
        <div className="rounded-xl border border-line bg-paper p-5 shadow-sm hover:border-brand/40 transition">
          <div className="flex items-center justify-between text-ink/60">
            <span className="text-xs font-medium uppercase tracking-wider">Today&apos;s Attendance</span>
            <span className="text-lg">✅</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-brand">{metrics.todayAttendance}</span>
            <span className="text-[11px] text-ink/60">
              {metrics.totalStudents > 0
                ? `${Math.round((metrics.todayAttendance / metrics.totalStudents) * 100)}% turnout`
                : 'Scans today'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink/60">Verified meal scans across halls</p>
        </div>

        {/* 3. Expected Meals */}
        <div className="rounded-xl border border-line bg-paper p-5 shadow-sm hover:border-brand/40 transition">
          <div className="flex items-center justify-between text-ink/60">
            <span className="text-xs font-medium uppercase tracking-wider">Expected Meals</span>
            <span className="text-lg">🔮</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-ink">{metrics.expectedMeals}</span>
            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
              {data?.impactMultiplier ? `${Math.round(data.impactMultiplier * 100)}% load` : 'Baseline'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink/60">Dynamic attendance forecast</p>
        </div>

        {/* 4. Food Preparation Status */}
        <div className="rounded-xl border border-line bg-paper p-5 shadow-sm hover:border-brand/40 transition">
          <div className="flex items-center justify-between text-ink/60">
            <span className="text-xs font-medium uppercase tracking-wider">Food Prep Status</span>
            <span className="text-lg">🍲</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-lg font-bold text-ink">{metrics.prepStatus}</span>
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-1 text-[11px] text-ink/60">Batch cooking & serving schedule</p>
        </div>

        {/* 5. Total Inventory Items */}
        <div className="rounded-xl border border-line bg-paper p-5 shadow-sm hover:border-brand/40 transition">
          <div className="flex items-center justify-between text-ink/60">
            <span className="text-xs font-medium uppercase tracking-wider">Total Inventory Items</span>
            <span className="text-lg">📦</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-ink">{metrics.totalInventory}</span>
            <span className="text-[11px] text-ink/60">Dry & fresh rations</span>
          </div>
          <p className="mt-1 text-[11px] text-ink/60">Managed raw commodities</p>
        </div>

        {/* 6. Daily Food Waste */}
        <div className="rounded-xl border border-line bg-paper p-5 shadow-sm hover:border-brand/40 transition">
          <div className="flex items-center justify-between text-ink/60">
            <span className="text-xs font-medium uppercase tracking-wider">Daily Food Waste</span>
            <span className="text-lg">🗑️</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-600">{metrics.dailyFoodWasteKg} kg</span>
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded">
              {formatPaise(metrics.dailyWasteLossPaise)} loss
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink/60">Plate & unserved kitchen waste</p>
        </div>

        {/* 7. Estimated Food Cost */}
        <div className="rounded-xl border border-line bg-paper p-5 shadow-sm sm:col-span-2 lg:col-span-2 hover:border-brand/40 transition">
          <div className="flex items-center justify-between text-ink/60">
            <span className="text-xs font-medium uppercase tracking-wider">Estimated Food Cost Today</span>
            <span className="text-lg">💰</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-brand">
              {formatPaise(metrics.estimatedFoodCostPaise)}
            </span>
            <span className="text-xs text-ink/60">
              ~₹52.00 / portion avg
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink/60">Raw commodity procurement value based on forecasted requirements</p>
        </div>
      </div>

      {/* Today's Menu & Live Service Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Menu Card */}
        <div className="lg:col-span-2 rounded-xl border border-line bg-paper p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Today&apos;s Active Menu</h2>
              <p className="text-xs text-ink/60">
                {data?.todayMenu?.name ?? 'Standard University Rotation'}
              </p>
            </div>
            <Link href="/menus" className="text-xs font-semibold text-brand hover:underline">
              View All Menus →
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Breakfast */}
            <div className="rounded-lg border border-line/70 p-3 bg-stone-50/50 dark:bg-stone-900/40">
              <div className="flex justify-between items-center text-xs font-semibold text-brand">
                <span>Breakfast</span>
                <span className="text-ink/50 text-[11px]">{data?.mealTimings?.breakfast ?? '07:30 - 09:30'}</span>
              </div>
              <ul className="mt-2 text-xs text-ink/80 space-y-1">
                {data?.todayMenu?.meals?.breakfast?.length ? (
                  data.todayMenu.meals.breakfast.map((m, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span>•</span>
                      <span>{m.dishId?.name ?? 'Breakfast Dish'}</span>
                    </li>
                  ))
                ) : (
                  <li className="italic text-ink/50">Aloo Paratha, Curd, Pickle, Tea</li>
                )}
              </ul>
            </div>

            {/* Lunch */}
            <div className="rounded-lg border border-line/70 p-3 bg-stone-50/50 dark:bg-stone-900/40">
              <div className="flex justify-between items-center text-xs font-semibold text-brand">
                <span>Lunch</span>
                <span className="text-ink/50 text-[11px]">{data?.mealTimings?.lunch ?? '12:00 - 14:15'}</span>
              </div>
              <ul className="mt-2 text-xs text-ink/80 space-y-1">
                {data?.todayMenu?.meals?.lunch?.length ? (
                  data.todayMenu.meals.lunch.map((m, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span>•</span>
                      <span>{m.dishId?.name ?? 'Lunch Dish'}</span>
                    </li>
                  ))
                ) : (
                  <li className="italic text-ink/50">Dal Makhani, Seasonal Sabzi, Rice, Roti, Salad</li>
                )}
              </ul>
            </div>

            {/* Snacks */}
            <div className="rounded-lg border border-line/70 p-3 bg-stone-50/50 dark:bg-stone-900/40">
              <div className="flex justify-between items-center text-xs font-semibold text-brand">
                <span>Evening Snacks</span>
                <span className="text-ink/50 text-[11px]">{data?.mealTimings?.snacks ?? '17:00 - 18:00'}</span>
              </div>
              <ul className="mt-2 text-xs text-ink/80 space-y-1">
                {data?.todayMenu?.meals?.snacks?.length ? (
                  data.todayMenu.meals.snacks.map((m, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span>•</span>
                      <span>{m.dishId?.name ?? 'Snack Dish'}</span>
                    </li>
                  ))
                ) : (
                  <li className="italic text-ink/50">Vegetable Samosa, Green Chutney, Tea / Coffee</li>
                )}
              </ul>
            </div>

            {/* Dinner */}
            <div className="rounded-lg border border-line/70 p-3 bg-stone-50/50 dark:bg-stone-900/40">
              <div className="flex justify-between items-center text-xs font-semibold text-brand">
                <span>Dinner</span>
                <span className="text-ink/50 text-[11px]">{data?.mealTimings?.dinner ?? '19:45 - 21:45'}</span>
              </div>
              <ul className="mt-2 text-xs text-ink/80 space-y-1">
                {data?.todayMenu?.meals?.dinner?.length ? (
                  data.todayMenu.meals.dinner.map((m, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span>•</span>
                      <span>{m.dishId?.name ?? 'Dinner Dish'}</span>
                    </li>
                  ))
                ) : (
                  <li className="italic text-ink/50">Shahi Paneer, Jeera Rice, Chapati, Gulab Jamun</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* University Calendar & Events */}
        <div className="rounded-xl border border-line bg-paper p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-base font-bold text-ink">Upcoming Events</h2>
              <Link href="/calendar" className="text-xs font-semibold text-brand hover:underline">
                View Calendar →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {data?.events?.length ? (
                data.events.map((e, idx) => (
                  <div key={idx} className="rounded-lg border border-line p-3 bg-stone-50 dark:bg-stone-900/30">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                      {e.eventType}
                    </span>
                    <p className="text-xs font-medium text-ink mt-0.5">{e.title}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-ink/60">
                  <span className="text-2xl block mb-1">🗓️</span>
                  Regular Academic Day
                  <p className="text-[11px] text-ink/40 mt-1">Normal full-capacity meal service in progress</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Kitchen Efficiency Tip:
            </p>
            <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
              Forecast estimates predict 12% lower attendance on Fridays. Scale dal & rice prep accordingly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
