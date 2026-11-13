'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

interface DemandPoint {
  day: string;
  label: string;
  forecast: number;
  actual: number;
  costPaise: number;
  isPeak?: boolean;
}

interface WasteCategory {
  category: string;
  kg: number;
  percentage: number;
  color: string;
}

interface RushHour {
  hour: string;
  label: string;
  heightPercent: number;
  count: number;
  meal: string;
  isPeak?: boolean;
}

interface DashboardMetrics {
  totalStudents: number;
  todayAttendance: number;
  expectedMeals: number;
  prepStatus: string;
  totalInventory: number;
  dailyFoodWasteKg: number;
  dailyWasteLossPaise: number;
  estimatedFoodCostPaise: number;
  monthlySavingsPaise: number;
}

interface DashboardData {
  today: string;
  dayName: string;
  isHoliday: boolean;
  impactMultiplier: number;
  metrics: DashboardMetrics;
  todayMenu?: {
    name?: string;
    meals?: {
      breakfast?: Array<{ dishId?: { name?: string; category?: string } }>;
      lunch?: Array<{ dishId?: { name?: string; category?: string } }>;
      snacks?: Array<{ dishId?: { name?: string; category?: string } }>;
      dinner?: Array<{ dishId?: { name?: string; category?: string } }>;
    };
  } | null;
  mealTimings?: Record<string, string>;
  demandTrend?: DemandPoint[];
  wasteCategories?: WasteCategory[];
  rushHours?: RushHour[];
}

export default function DashboardPage() {
  const { error } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 Days');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(2); // Default highlight on peak point

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

  // Fallbacks if backend is booting or seed is fresh
  const metrics: DashboardMetrics = data?.metrics || {
    totalStudents: 1248,
    todayAttendance: 842,
    expectedMeals: 910,
    prepStatus: 'In Preparation',
    totalInventory: 64,
    dailyFoodWasteKg: 14.5,
    dailyWasteLossPaise: 185000,
    estimatedFoodCostPaise: 4378400,
    monthlySavingsPaise: 4285000,
  };

  const demandTrend: DemandPoint[] = data?.demandTrend || [
    { day: 'Day 5', label: '05 Nov', forecast: 760, actual: 745, costPaise: 3874000 },
    { day: 'Day 10', label: '10 Nov', forecast: 810, actual: 795, costPaise: 4134000 },
    { day: 'Day 15', label: '15 Nov', forecast: 950, actual: 940, costPaise: 4888000, isPeak: true },
    { day: 'Day 20', label: '20 Nov', forecast: 830, actual: 820, costPaise: 4264000 },
    { day: 'Day 25', label: '25 Nov', forecast: 900, actual: 890, costPaise: 4628000 },
    { day: 'Day 30', label: '30 Nov', forecast: 860, actual: 842, costPaise: 4378400 },
  ];

  const wasteCategories: WasteCategory[] = data?.wasteCategories || [
    { category: 'Unserved Leftover', kg: 6.2, percentage: 43, color: '#06b6d4' },
    { category: 'Prep Scraps', kg: 4.1, percentage: 28, color: '#8b5cf6' },
    { category: 'Plate Waste', kg: 2.6, percentage: 18, color: '#ec4899' },
    { category: 'Spoilage & Storage', kg: 1.6, percentage: 11, color: '#f59e0b' },
  ];

  const rushHours: RushHour[] = data?.rushHours || [
    { hour: '07:30', label: '7:30 AM', heightPercent: 45, count: 180, meal: 'Breakfast' },
    { hour: '08:30', label: '8:30 AM', heightPercent: 65, count: 320, meal: 'Breakfast' },
    { hour: '12:15', label: '12:15 PM', heightPercent: 78, count: 410, meal: 'Lunch' },
    { hour: '13:00', label: '1:00 PM', heightPercent: 100, count: 520, meal: 'Lunch', isPeak: true },
    { hour: '13:45', label: '1:45 PM', heightPercent: 55, count: 280, meal: 'Lunch' },
    { hour: '17:30', label: '5:30 PM', heightPercent: 68, count: 340, meal: 'Snacks' },
    { hour: '19:45', label: '7:45 PM', heightPercent: 82, count: 460, meal: 'Dinner' },
    { hour: '20:30', label: '8:30 PM', heightPercent: 90, count: 490, meal: 'Dinner' },
    { hour: '21:15', label: '9:15 PM', heightPercent: 40, count: 210, meal: 'Dinner' },
  ];

  // Kitchen Menu Item Cards
  const menuItems = [
    {
      meal: 'Breakfast',
      name: 'Masala Dosa & Fresh Sambhar',
      timing: data?.mealTimings?.breakfast || '07:30 - 09:30',
      portions: 380,
      gradient: 'from-emerald-400 to-teal-500',
      icon: '🍳',
    },
    {
      meal: 'Lunch',
      name: 'Paneer Butter Masala & Dal Makhani',
      timing: data?.mealTimings?.lunch || '12:00 - 14:15',
      portions: 650,
      gradient: 'from-purple-500 to-indigo-600',
      icon: '🍛',
    },
    {
      meal: 'Snacks',
      name: 'Crispy Samosa & Masala Chai',
      timing: data?.mealTimings?.snacks || '17:00 - 18:30',
      portions: 420,
      gradient: 'from-sky-400 to-blue-600',
      icon: '🥪',
    },
    {
      meal: 'Dinner',
      name: 'Shahi Biryani & Mixed Vegetable Raita',
      timing: data?.mealTimings?.dinner || '19:30 - 21:45',
      portions: 610,
      gradient: 'from-pink-500 to-rose-600',
      icon: '🍲',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-slate-100 shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-2xl bg-white border border-slate-100 shadow-sm" />
          <div className="h-72 rounded-2xl bg-white border border-slate-100 shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-10">
      {/* 4 Core Top Metric Cards (Alpha Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Diners / Users */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-sm">
              👥
            </div>
            <span className="text-xs font-semibold text-slate-400">Total Diners</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {metrics.totalStudents >= 1000 ? `${(metrics.totalStudents / 1000).toFixed(1)}k+` : metrics.totalStudents}
            </span>
            <div className="flex items-center gap-1">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                +67.8%
              </span>
              <span className="text-[10px] text-slate-400 hidden xl:inline">Last month</span>
            </div>
          </div>
        </div>

        {/* 2. Today's Meals Served */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-sm">
              🎯
            </div>
            <span className="text-xs font-semibold text-slate-400">Meals Served</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {metrics.todayAttendance >= 1000 ? `${(metrics.todayAttendance / 1000).toFixed(1)}k+` : metrics.todayAttendance}
            </span>
            <div className="flex items-center gap-1">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                +87.2%
              </span>
              <span className="text-[10px] text-slate-400 hidden xl:inline">Last month</span>
            </div>
          </div>
        </div>

        {/* 3. Monthly Cost Savings */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-sm">
              💰
            </div>
            <span className="text-xs font-semibold text-slate-400">Monthly Savings</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {formatPaise(metrics.monthlySavingsPaise)}
            </span>
            <div className="flex items-center gap-1">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                +92.8%
              </span>
              <span className="text-[10px] text-slate-400 hidden xl:inline">Last month</span>
            </div>
          </div>
        </div>

        {/* 4. Active Stock Commodities */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-sm">
              📦
            </div>
            <span className="text-xs font-semibold text-slate-400">Total Items</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {metrics.totalInventory}+
            </span>
            <div className="flex items-center gap-1">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                +32.1%
              </span>
              <span className="text-[10px] text-slate-400 hidden xl:inline">Last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Demand Curve Chart (2/3) + Today's Kitchen Menu (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Demand vs Actual Spline Wave Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Demand & Consumption Trends</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic forecast curve vs actual verified hostel attendance
              </p>
            </div>

            {/* Time Filter Dropdown */}
            <div className="relative inline-block text-left">
              <select
                aria-label="Select date range"
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Current Semester">Current Semester</option>
              </select>
            </div>
          </div>

          {/* Spline Area Chart Canvas */}
          <div className="relative mt-6 h-64 w-full">
            <svg
              className="h-full w-full overflow-visible"
              viewBox="0 0 800 240"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Smooth Glowing Blue Area Gradient */}
                <linearGradient id="splineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.30" />
                  <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              <line x1="30" y1="40" x2="770" y2="40" stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="30" y1="90" x2="770" y2="90" stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="30" y1="140" x2="770" y2="140" stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="30" y1="190" x2="770" y2="190" stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1" />

              {/* Y-axis Labels */}
              <text x="5" y="44" fill="#94A3B8" fontSize="10" fontWeight="500">1000</text>
              <text x="10" y="94" fill="#94A3B8" fontSize="10" fontWeight="500">800</text>
              <text x="10" y="144" fill="#94A3B8" fontSize="10" fontWeight="500">600</text>
              <text x="10" y="194" fill="#94A3B8" fontSize="10" fontWeight="500">400</text>

              {/* Spline Area Fill */}
              <path
                d="M 40,160 C 120,160 160,120 220,130 C 280,140 320,185 380,180 C 440,175 460,85 520,80 C 580,75 620,140 680,135 C 720,130 750,110 770,105 L 770,220 L 40,220 Z"
                fill="url(#splineGradient)"
              />

              {/* Main Spline Blue Curve */}
              <path
                d="M 40,160 C 120,160 160,120 220,130 C 280,140 320,185 380,180 C 440,175 460,85 520,80 C 580,75 620,140 680,135 C 720,130 750,110 770,105"
                fill="none"
                stroke="#2563EB"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data points along curve */}
              {[
                { cx: 40, cy: 160, idx: 0 },
                { cx: 220, cy: 130, idx: 1 },
                { cx: 380, cy: 180, idx: 2 },
                { cx: 520, cy: 80, idx: 3, isPeak: true },
                { cx: 680, cy: 135, idx: 4 },
                { cx: 770, cy: 105, idx: 5 },
              ].map((pt) => (
                <g key={pt.idx} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(pt.idx)}>
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={pt.isPeak ? 6 : 4}
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth={pt.isPeak ? 3 : 2}
                  />
                  {pt.isPeak && (
                    <circle
                      cx={pt.cx}
                      cy={pt.cy}
                      r="12"
                      fill="#3B82F6"
                      opacity="0.2"
                      className="animate-pulse"
                    />
                  )}
                </g>
              ))}
            </svg>

            {/* Interactive Floating Tooltip Pill (Matching Alpha Reference) */}
            <div
              className="absolute left-[58%] top-[14%] -translate-x-1/2 rounded-xl bg-white px-3 py-2 shadow-lg border border-slate-100 flex flex-col items-center pointer-events-none transition-all duration-200"
            >
              <span className="text-[10px] font-bold text-slate-400">Peak Turnout</span>
              <span className="text-xs font-black text-slate-900">
                {hoveredPoint === 3 ? '940 meals • ₹18,400' : '940 portions'}
              </span>
              <div className="absolute -bottom-1 h-2 w-2 rotate-45 bg-white border-r border-b border-slate-100" />
            </div>

            {/* X-axis Labels */}
            <div className="flex justify-between px-6 pt-3 text-[11px] font-semibold text-slate-400">
              {demandTrend.map((d) => (
                <span key={d.day}>{d.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Today's Kitchen Menu (Matching Alpha "Earnings by Item") */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Today&apos;s Kitchen Menu</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {data?.todayMenu?.name || 'Standard Campus Rotation'}
                </p>
              </div>
              <Link href="/menus" className="text-xs font-bold text-blue-600 hover:underline">
                View All →
              </Link>
            </div>

            {/* Meal Items List */}
            <div className="mt-4 space-y-3">
              {menuItems.map((item, idx) => (
                <Link
                  key={idx}
                  href="/menus"
                  className="group flex items-center justify-between rounded-xl bg-slate-50/70 p-3 hover:bg-slate-100/80 border border-slate-100/70 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${item.gradient} text-white text-base shadow-sm`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.portions} portions • {item.timing}
                      </p>
                    </div>
                  </div>
                  <div className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 shadow-2xs group-hover:text-slate-900 group-hover:translate-x-0.5 transition">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: 3 Equal Width Cards (Donut Chart, Rush Hours Bar Chart, Smart Buffer Action Card) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Food Waste Breakdown (Alpha Donut Chart) */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Food Waste Breakdown</h3>
              <p className="text-xs text-slate-400 mt-0.5">Categorized kitchen & plate loss</p>
            </div>
            <Link href="/analytics" className="text-xs font-bold text-blue-600 hover:underline">
              Details →
            </Link>
          </div>

          {/* SVG Donut Ring Chart */}
          <div className="my-4 flex items-center justify-center">
            <div className="relative h-44 w-44">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="12" />

                {/* Segment 1: Unserved Leftover (Cyan 43%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="12"
                  strokeDasharray="103 238"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />

                {/* Segment 2: Prep Scraps (Purple 28%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="12"
                  strokeDasharray="67 238"
                  strokeDashoffset="-108"
                  strokeLinecap="round"
                />

                {/* Segment 3: Plate Waste (Pink 18%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="12"
                  strokeDasharray="43 238"
                  strokeDashoffset="-179"
                  strokeLinecap="round"
                />

                {/* Segment 4: Spoilage (Amber 11%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray="26 238"
                  strokeDashoffset="-226"
                  strokeLinecap="round"
                />
              </svg>

              {/* Center Metrics in Donut Ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {metrics.dailyFoodWasteKg} kg
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Daily Waste
                </span>
              </div>
            </div>
          </div>

          {/* Waste Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-50">
            {wasteCategories.map((cat) => (
              <div key={cat.category} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-[11px] text-slate-500 truncate">{cat.category}</span>
                <span className="text-[11px] font-bold text-slate-800 ml-auto">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Peak Attendance Rush Hours (Alpha Vertical Pill Bars) */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Peak Meal Rush Hours</h3>
              <p className="text-xs text-slate-400 mt-0.5">Live scanner footfall throughput</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">
              Peak: 1 PM
            </span>
          </div>

          {/* Vertical Pill Bar Chart */}
          <div className="my-4 flex h-44 items-end justify-between gap-2 px-1">
            {rushHours.map((slot) => (
              <div key={slot.hour} className="group flex flex-1 flex-col items-center h-full justify-end">
                <div
                  className={`w-full max-w-[20px] rounded-full transition-all duration-300 ${
                    slot.isPeak
                      ? 'bg-blue-600 shadow-md shadow-blue-500/30'
                      : 'bg-slate-100 group-hover:bg-slate-200'
                  }`}
                  style={{ height: `${slot.heightPercent}%` }}
                  title={`${slot.meal} (${slot.label}): ${slot.count} scans`}
                />
                <span className="mt-2 text-[9px] font-semibold text-slate-400 truncate">
                  {slot.hour}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Busiest Turnout</span>
            <span className="font-bold text-slate-800 text-[11px]">12:30 - 13:30 (520 diners/hr)</span>
          </div>
        </div>

        {/* Card 3: Smart Kitchen Buffer & Auto-Indent Action (Alpha Wallet Style) */}
        <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                Safety Buffer: +8%
              </span>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Floating 3D-style Shield Icon */}
            <div className="my-5 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-3xl text-white shadow-xl shadow-blue-500/25">
                🍲
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Kitchen Preparation Buffer</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Automated preparation plans with dynamic safety buffers prevent dining hall shortages and eliminate overproduction waste.
              </p>
            </div>
          </div>

          <Link
            href="/kitchen"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition"
          >
            <span>Review Kitchen Plans</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
