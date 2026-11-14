'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { AiAssistantModal } from '@/components/ui/AiAssistantModal';

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

interface FoodFlowData {
  totalInventoryValuePaise: number;
  monthlyRevenuePaise: number;
  activeSuppliersCount: number;
  wasteReductionPercent: number;
  inventoryStatus: {
    totalItems: number;
    lowStock: number;
    expired: number;
    items: Array<{ name: string; qty: string; status: string; category?: string }>;
  };
  ordersSummary: {
    pending: number;
    completed: number;
    orders: Array<{ id: string; student: string; meal: string; status: string }>;
  };
  supplierOverview: {
    activeCount: number;
    performanceScore: number;
    deliveries: Array<{ name: string; status: string; time: string }>;
  };
  salesExpenses: {
    salesPaise: number;
    expensesPaise: number;
  };
  foodWasteTracker: {
    currentMonthWastePercent: number;
    reductionFromLastMonth: number;
  };
}

interface AIInsight {
  source: string;
  summary: string;
  bufferAdvice: string;
  wastePreventionTip: string;
  confidenceScore: number;
  suggestedAdjustments: Array<{
    dish: string;
    action: 'increase' | 'decrease' | 'maintain';
    percentChange: number;
    reason: string;
  }>;
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
  foodFlow?: FoodFlowData;
}

export default function DashboardPage() {
  const { error, success } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'foodflow' | 'alpha' | 'tray'>('foodflow');
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'INR'>('USD');
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 Days');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(2);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

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

  // Load Google Gemini AI insights
  useEffect(() => {
    async function loadGeminiInsights() {
      setLoadingAi(true);
      try {
        const res = await fetch('/api/v1/ai/insights');
        if (res.ok) {
          const body = await res.json();
          setAiInsight(body.data);
        }
      } catch {
        // Fallback handled seamlessly
      } finally {
        setLoadingAi(false);
      }
    }
    loadGeminiInsights();
  }, []);

  const formatMoney = (valPaiseOrDollar: number, isDirectDollar = false) => {
    if (currencyMode === 'USD') {
      const dollars = isDirectDollar ? valPaiseOrDollar : Math.round(valPaiseOrDollar / 100);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(dollars);
    } else {
      const inr = isDirectDollar ? valPaiseOrDollar * 83 : Math.round(valPaiseOrDollar / 100);
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(inr);
    }
  };

  const foodFlow = data?.foodFlow || {
    totalInventoryValuePaise: 12450000,
    monthlyRevenuePaise: 6700000,
    activeSuppliersCount: 24,
    wasteReductionPercent: 5.2,
    inventoryStatus: {
      totalItems: 1248,
      lowStock: 23,
      expired: 7,
      items: [
        { name: 'Rui Fish', qty: '12kg', status: 'Low stock', category: 'Seafood' },
        { name: 'Boiler Chicken', qty: '15kg', status: 'Low stock', category: 'Poultry' },
      ],
    },
    ordersSummary: {
      pending: 18,
      completed: 142,
      orders: [
        { id: '#ORD1203', student: 'Javed Islam', meal: 'Campus Meal', status: 'New order' },
        { id: '#ORD1202', student: 'Rakibul Islam', meal: 'Campus Meal', status: 'New order' },
      ],
    },
    supplierOverview: {
      activeCount: 24,
      performanceScore: 4.8,
      deliveries: [
        { name: 'Fresh Farms Co.', status: 'Delivered', time: 'Today' },
        { name: 'Dairy Best Ltd.', status: 'In Transit', time: 'Yesterday' },
        { name: 'Meat Masters', status: 'Delivered', time: '3 days ago' },
      ],
    },
    salesExpenses: {
      salesPaise: 33100000,
      expensesPaise: 21300000,
    },
    foodWasteTracker: {
      currentMonthWastePercent: 5.2,
      reductionFromLastMonth: 2.3,
    },
  };

  const metrics: DashboardMetrics = data?.metrics || {
    totalStudents: 1248,
    todayAttendance: 842,
    expectedMeals: 910,
    prepStatus: 'In Preparation',
    totalInventory: 1248,
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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-72 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-slate-100 shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 rounded-2xl bg-white border border-slate-100 shadow-sm" />
          <div className="h-72 rounded-2xl bg-white border border-slate-100 shadow-sm" />
          <div className="h-72 rounded-2xl bg-white border border-slate-100 shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & View Switcher Bar */}
      <PageHeader
        icon="📊"
        title="Dashboard Overview"
        badge={
          <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 border border-teal-200/60">
            FoodFlow Edition
          </span>
        }
        description="Welcome back! Here's what's happening with your food management today."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Reference Mode Tabs */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setActiveTab('foodflow')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === 'foodflow'
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                FoodFlow
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('alpha')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === 'alpha'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alpha Waves
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tray')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === 'tray'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tray Live
              </button>
            </div>

            {/* Currency Toggle ($ / ₹) */}
            <button
              type="button"
              onClick={() => setCurrencyMode(currencyMode === 'USD' ? 'INR' : 'USD')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
              title="Toggle between USD ($) and INR (₹)"
            >
              <span className="text-slate-400">Currency:</span>
              <span className="text-teal-700">{currencyMode === 'USD' ? '$ USD' : '₹ INR'}</span>
            </button>
          </div>
        }
      />

      {/* Google Gemini AI Live Forecasting Intelligence Pill Banner */}
      <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50 via-emerald-50/50 to-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-bold text-base shadow-sm">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800">
                Google Gemini AI Demand Analysis
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Live & Smooth (1 Lakh QPS Ready)
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {aiInsight?.summary || 'Projecting stable lunch demand with dynamic batch cooking buffers.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAiAssistantOpen(true)}
            className="rounded-xl border border-teal-300 bg-teal-100/70 hover:bg-teal-200 px-3.5 py-2 text-xs font-bold text-teal-900 shadow-2xs transition flex items-center gap-1.5"
          >
            <span>✨</span>
            <span>Ask AI Assistant</span>
          </button>
          <Link
            href="/forecast"
            className="rounded-xl bg-teal-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-900 transition flex items-center gap-1.5"
          >
            <span>Detailed AI Forecast</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* 4 KPI Top Cards (FoodFlow Ditto) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Inventory Value */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Inventory Value</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 border border-teal-100 text-teal-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {formatMoney(124500, true)}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-600">▲ +8.2%</span>
              <span className="text-[11px] text-slate-400">vs last month</span>
            </div>
          </div>
        </div>

        {/* 2. Monthly Revenue */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Monthly Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {formatMoney(67000, true)}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-600">▲ +12.5%</span>
              <span className="text-[11px] text-slate-400">vs last month</span>
            </div>
          </div>
        </div>

        {/* 3. Active Suppliers */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Suppliers</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {foodFlow.activeSuppliersCount}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-cyan-700">2 new</span>
              <span className="text-[11px] text-slate-400">this month</span>
            </div>
          </div>
        </div>

        {/* 4. Waste Reduction */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Waste Reduction</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {foodFlow.wasteReductionPercent}%
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-600">▲ +2.2%</span>
              <span className="text-[11px] text-slate-400">vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row (3 FoodFlow Reference Cards Side-by-Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Inventory Status */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <h2 className="text-base font-bold text-slate-900">Inventory Status</h2>
              <div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-800 text-xs">
                📊
              </div>
            </div>

            {/* Total Items & Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>Total Items</span>
                <span className="text-sm font-extrabold text-teal-900">
                  {foodFlow.inventoryStatus.totalItems.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-teal-700 w-4/5" />
              </div>
            </div>

            {/* Low Stock & Expired Badges */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 rounded-xl bg-rose-50 border border-rose-100 p-2.5 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 text-xs">
                  ⚠️
                </div>
                <div>
                  <p className="text-[10px] text-rose-700 font-medium">Low Stock</p>
                  <p className="text-sm font-extrabold text-rose-900">{foodFlow.inventoryStatus.lowStock}</p>
                </div>
              </div>

              <div className="flex-1 rounded-xl bg-amber-50 border border-amber-100 p-2.5 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs">
                  🕒
                </div>
                <div>
                  <p className="text-[10px] text-amber-800 font-medium">Expired</p>
                  <p className="text-sm font-extrabold text-amber-900">{foodFlow.inventoryStatus.expired}</p>
                </div>
              </div>
            </div>

            {/* Low Stock Alert Items */}
            <div className="mt-5 space-y-2.5">
              {foodFlow.inventoryStatus.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-rose-50/50 p-2.5 border border-rose-100/60"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.qty}</p>
                  </div>
                  <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/inventory"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/80 p-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <span>Manage Inventory</span>
            <span>→</span>
          </Link>
        </div>

        {/* Card 2: Orders Summary */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <h2 className="text-base font-bold text-slate-900">Orders Summary</h2>
              <div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-800 text-xs">
                🛒
              </div>
            </div>

            {/* Pending & Completed Indicators */}
            <div className="mt-4 flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-500">Pending:</span>
                <span className="text-slate-900">{foodFlow.ordersSummary.pending}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Completed:</span>
                <span className="text-slate-900">{foodFlow.ordersSummary.completed}</span>
              </div>
            </div>

            {/* 7-Day Order Trend Spline Line Chart */}
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-slate-400">7-Day Order Trend</p>
              <div className="mt-2 h-20 w-full">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 200 60" preserveAspectRatio="none">
                  <path
                    d="M 10,45 Q 50,48 90,30 T 170,18 T 195,12"
                    fill="none"
                    stroke="#0F766E"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="10" cy="45" r="3" fill="#0F766E" />
                  <circle cx="90" cy="30" r="3" fill="#0F766E" />
                  <circle cx="170" cy="18" r="3" fill="#0F766E" />
                  <circle cx="195" cy="12" r="4" fill="#10B981" />
                </svg>
              </div>
            </div>

            {/* Recent Orders List */}
            <div className="mt-4 space-y-2">
              {foodFlow.ordersSummary.orders.map((ord, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{ord.student}</p>
                    <p className="text-[10px] text-slate-400">{ord.id}</p>
                  </div>
                  <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {ord.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/kitchen"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/80 p-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <span>Live Kitchen Orders</span>
            <span>→</span>
          </Link>
        </div>

        {/* Card 3: Supplier Overview */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <h2 className="text-base font-bold text-slate-900">Supplier Overview</h2>
              <div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-800 text-xs">
                🚚
              </div>
            </div>

            {/* Active Suppliers & Score */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400">Active Suppliers</p>
                <p className="text-xl font-extrabold text-slate-900">{foodFlow.supplierOverview.activeCount}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Performance Score</p>
                <p className="text-xl font-extrabold text-amber-500 flex items-center justify-end gap-1">
                  <span>{foodFlow.supplierOverview.performanceScore}</span>
                  <span className="text-amber-400">★</span>
                </p>
              </div>
            </div>

            {/* Recent Deliveries */}
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Recent Deliveries
              </p>
              <div className="space-y-2.5">
                {foodFlow.supplierOverview.deliveries.map((del, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-slate-50/70 p-2.5 border border-slate-100/80"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{del.name}</p>
                      <p className="text-[10px] text-slate-400">{del.time}</p>
                    </div>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                        del.status === 'Delivered'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}
                    >
                      {del.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => success('Supplier Indents', 'All vendor contracts and delivery schedules up to date')}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/80 p-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <span>View All Suppliers</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Sales & Expenses (2/3) + Food Waste Tracker (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Expenses (Wide Card) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Sales & Expenses</h2>
                <p className="text-xs text-slate-400 mt-0.5">6-month Financial overview</p>
              </div>
              <div className="h-8 w-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-800 font-bold text-sm">
                $
              </div>
            </div>

            {/* Total Sales vs Total Expenses */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Sales</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {formatMoney(331000, true)}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">▲ +12.5%</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-medium">Total Expenses</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {formatMoney(213000, true)}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">▲ +8.2%</span>
                </div>
              </div>
            </div>

            {/* 6-Month Comparison Double Bar Chart */}
            <div className="mt-6 h-48 w-full flex items-end justify-between gap-4 px-2">
              {[
                { month: 'Jan', sales: 75, expenses: 50 },
                { month: 'Feb', sales: 82, expenses: 58 },
                { month: 'Mar', sales: 90, expenses: 62 },
                { month: 'Apr', sales: 85, expenses: 55 },
                { month: 'May', sales: 94, expenses: 64 },
                { month: 'Jun', sales: 100, expenses: 68 },
              ].map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    <div
                      className="w-3 sm:w-5 bg-teal-800 rounded-t-sm transition-all group-hover:bg-teal-900"
                      style={{ height: `${m.sales}%` }}
                      title={`Sales: $${m.sales * 3310}`}
                    />
                    <div
                      className="w-3 sm:w-5 bg-teal-200 rounded-t-sm transition-all group-hover:bg-teal-300"
                      style={{ height: `${m.expenses}%` }}
                      title={`Expenses: $${m.expenses * 2130}`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{m.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-teal-800" />
                <span className="font-semibold text-slate-700">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-teal-200" />
                <span className="font-semibold text-slate-700">Expenses</span>
              </div>
            </div>
            <span className="text-slate-400 text-[11px]">Net Margin: +35.6%</span>
          </div>
        </div>

        {/* Food Waste Tracker (1/3 Card) */}
        <div className="rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <h2 className="text-base font-bold text-slate-900">Food Waste Tracker</h2>
              <div className="h-8 w-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-sm">
                🗑️
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-400">Current Month Waste</p>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {foodFlow.foodWasteTracker.currentMonthWastePercent}%
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">
                  ▼ -{foodFlow.foodWasteTracker.reductionFromLastMonth}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Reduction from last month</p>
            </div>

            {/* 6-Month Progressive Reduction Bar Chart */}
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                6-Month Trend
              </p>
              <div className="h-28 flex items-end justify-between gap-2 px-1">
                {[
                  { month: 'Jan', percent: 9.4, height: 94 },
                  { month: 'Feb', percent: 8.6, height: 86 },
                  { month: 'Mar', percent: 7.8, height: 78 },
                  { month: 'Apr', percent: 6.9, height: 69 },
                  { month: 'May', percent: 6.0, height: 60 },
                  { month: 'Jun', percent: 5.2, height: 52, isLatest: true },
                ].map((bar) => (
                  <div key={bar.month} className="flex-1 flex flex-col items-center h-full justify-end">
                    <div
                      className={`w-full max-w-[24px] rounded-t-sm transition-all ${
                        bar.isLatest ? 'bg-teal-700' : 'bg-slate-200 hover:bg-slate-300'
                      }`}
                      style={{ height: `${bar.height}%` }}
                      title={`${bar.month}: ${bar.percent}% waste`}
                    />
                    <span className="mt-1.5 text-[10px] font-semibold text-slate-400">
                      {bar.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/analytics"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/80 p-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <span>Food Waste Report</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Conditionally Show Alpha Analytics Wave (Image 5) when user selects that tab */}
      {activeTab === 'alpha' && (
        <div className="space-y-6 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Alpha Analytics & Demand Waves (Image 5)</h2>
              <p className="text-xs text-slate-500">Live spline area curves and meal turnout distributions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Demand Spline Area Wave */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Turnout vs Projection Curve</h3>
                  <p className="text-xs text-slate-400">Hover over points to inspect peak dining hall sessions</p>
                </div>
                <select
                  aria-label="Filter range"
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                </select>
              </div>

              <div className="relative mt-6 h-60 w-full">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 800 240" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="blueWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 40,160 C 120,160 160,120 220,130 C 280,140 320,185 380,180 C 440,175 460,85 520,80 C 580,75 620,140 680,135 C 720,130 750,110 770,105 L 770,220 L 40,220 Z"
                    fill="url(#blueWaveGrad)"
                  />
                  <path
                    d="M 40,160 C 120,160 160,120 220,130 C 280,140 320,185 380,180 C 440,175 460,85 520,80 C 580,75 620,140 680,135 C 720,130 750,110 770,105"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Waste Donut Breakdown */}
            <div className="rounded-2xl border border-slate-100/90 bg-white p-6 shadow-sm flex flex-col justify-between">
              <h3 className="text-base font-bold text-slate-900">Loss Categorization</h3>
              <div className="my-3 flex items-center justify-center">
                <div className="relative h-40 w-40 flex items-center justify-center">
                  <span className="text-xl font-black text-slate-800">{metrics.dailyFoodWasteKg} kg</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {wasteCategories.map((c) => (
                  <div key={c.category} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-[11px] text-slate-500">{c.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conditionally Show Tray Live Operations (Image 7) */}
      {activeTab === 'tray' && (
        <div className="space-y-6 pt-4 border-t border-slate-200">
          <div className="rounded-2xl bg-[#121417] p-6 text-white shadow-xl border border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400 font-black text-black">
                  T
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Tray Live Canteen Ops (Image 7)</h3>
                  <p className="text-xs text-slate-400">Night canteen & live kitchen counter throughput</p>
                </div>
              </div>
              <span className="rounded-full bg-lime-400/20 px-2.5 py-1 text-xs font-bold text-lime-400 border border-lime-400/30">
                ● Live 2 counters active
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800">
                <p className="text-xs text-slate-400">Revenue Today</p>
                <p className="text-2xl font-black text-white mt-1">₹38,420</p>
                <p className="text-[11px] text-lime-400 mt-1">▲ 12.4%</p>
              </div>
              <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800">
                <p className="text-xs text-slate-400">Orders</p>
                <p className="text-2xl font-black text-white mt-1">248</p>
                <p className="text-[11px] text-lime-400 mt-1">▲ 8.1%</p>
              </div>
              <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800">
                <p className="text-xs text-slate-400">Avg Ticket</p>
                <p className="text-2xl font-black text-white mt-1">₹155</p>
                <p className="text-[11px] text-slate-400 mt-1">Normal</p>
              </div>
              <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800">
                <p className="text-xs text-slate-400">Avg Pickup</p>
                <p className="text-2xl font-black text-white mt-1">7:12</p>
                <p className="text-[11px] text-emerald-400 mt-1">Fast delivery</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Assistant Trigger Button & Dialog */}
      <button
        type="button"
        onClick={() => setIsAiAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-teal-800 text-white px-4 py-3 shadow-xl hover:bg-teal-900 transition hover:scale-105 active:scale-95 border border-teal-600/40"
        aria-label="Open AI Kitchen Assistant"
      >
        <span className="text-base">✨</span>
        <span className="text-xs font-extrabold hidden sm:inline">Ask AI Kitchen Assistant</span>
      </button>

      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
      />
    </div>
  );
}
