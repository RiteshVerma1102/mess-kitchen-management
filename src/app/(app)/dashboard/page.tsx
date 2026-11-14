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
  };
  demandTrend?: DemandPoint[];
  wasteCategories?: WasteCategory[];
  rushHours?: RushHour[];
  foodFlow?: FoodFlowData;
  aiInsight?: AIInsight;
}

export default function DashboardPage() {
  const { error } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'INR'>('USD');
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/dashboard/metrics');
        if (res.ok) {
          const body = await res.json();
          setData(body.data);
          if (body.data?.aiInsight) {
            setAiInsight(body.data.aiInsight);
          }
        } else {
          error('Failed to load metrics', 'Could not fetch live mess metrics');
        }
      } catch {
        error('Network Error', 'Failed to reach server');
      } finally {
        setLoading(false);
      }
    }

    async function loadAIInsights() {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const res = await fetch(`/api/v1/ai/insight?date=${todayStr}&mealType=lunch`);
        if (res.ok) {
          const body = await res.json();
          if (body.data) {
            setAiInsight(body.data);
          }
        }
      } catch {
        // Fallback already handled
      }
    }

    loadDashboard();
    loadAIInsights();
  }, [error]);

  const formatMoney = (amountPaise: number, isPreConvertedUSD: boolean = false) => {
    if (currencyMode === 'USD') {
      const val = isPreConvertedUSD ? amountPaise : Math.round(amountPaise / 8500);
      return `$${val.toLocaleString()}`;
    }
    const inrVal = isPreConvertedUSD ? amountPaise * 85 : Math.round(amountPaise / 100);
    return `₹${inrVal.toLocaleString('en-IN')}`;
  };

  const foodFlow: FoodFlowData = data?.foodFlow || {
    totalInventoryValuePaise: 12450000,
    monthlyRevenuePaise: 6700000,
    activeSuppliersCount: 24,
    wasteReductionPercent: 5.2,
    inventoryStatus: {
      totalItems: 1248,
      lowStock: 23,
      expired: 7,
      items: [
        { name: 'Rui Fish', qty: '12 kg', status: 'Low stock', category: 'Seafood' },
        { name: 'Boiler Chicken', qty: '15 kg', status: 'Low stock', category: 'Meat' },
      ],
    },
    ordersSummary: {
      pending: 18,
      completed: 142,
      orders: [
        { id: '#ORD1201', student: 'Jared Islam', meal: 'Standard Thali', status: 'New order' },
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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-72 bg-[#E5EAF0] rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-[#E5EAF0] shadow-xs" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 rounded-2xl bg-white border border-[#E5EAF0] shadow-xs" />
          <div className="h-72 rounded-2xl bg-white border border-[#E5EAF0] shadow-xs" />
          <div className="h-72 rounded-2xl bg-white border border-[#E5EAF0] shadow-xs" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar (FoodFlow Reference 1) */}
      <PageHeader
        icon="📊"
        title="Dashboard Overview"
        badge={
          <span className="rounded-full bg-[#DDF3F3] px-2.5 py-0.5 text-xs font-bold text-[#087E8B] border border-[#087E8B]/20">
            Institutional Mess Edition
          </span>
        }
        description="Welcome back! Here's what's happening with your food management today."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Currency Toggle ($ / ₹) */}
            <button
              type="button"
              onClick={() => setCurrencyMode(currencyMode === 'USD' ? 'INR' : 'USD')}
              className="flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-3 py-1.5 text-xs font-bold text-[#253746] hover:bg-[#F5F7FA] shadow-xs transition"
              title="Toggle between USD ($) and INR (₹)"
            >
              <span className="text-[#718096]">Currency:</span>
              <span className="text-[#087E8B]">{currencyMode === 'USD' ? '$ USD' : '₹ INR'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAiAssistantOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#087E8B] text-white px-3.5 py-1.5 text-xs font-bold shadow-xs hover:bg-[#066873] transition"
            >
              <span>✨</span>
              <span>Ask AI Assistant</span>
            </button>
          </div>
        }
      />

      {/* Google Gemini AI Demand Intelligence Banner */}
      <div className="rounded-2xl border border-[#087E8B]/20 bg-[#DDF3F3]/40 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#087E8B] text-white font-bold text-base shadow-xs">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#087E8B]">
                Google Gemini AI Demand Analysis
              </span>
              <span className="rounded-full bg-[#E8F7F0] px-2 py-0.5 text-[10px] font-bold text-[#16A36A] border border-[#16A36A]/20">
                Live Turnout Calibrated
              </span>
            </div>
            <p className="text-xs text-[#253746] mt-0.5">
              {aiInsight?.summary || 'Projecting stable lunch demand with dynamic batch cooking buffers.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/forecast"
            className="rounded-xl bg-[#087E8B] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition flex items-center gap-1.5"
          >
            <span>Detailed AI Forecast</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* 4 KPI Top Cards (FoodFlow Reference 1 Ditto) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Inventory Value */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Total Inventory Value</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDF3F3] border border-[#087E8B]/20 text-[#087E8B]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#253746]">
              {formatMoney(124500, true)}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#16A36A]">▲ +8.2%</span>
              <span className="text-[11px] text-[#718096]">vs last month</span>
            </div>
          </div>
        </div>

        {/* 2. Monthly Revenue */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Monthly Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F7F0] border border-[#16A36A]/20 text-[#16A36A]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#253746]">
              {formatMoney(67000, true)}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#16A36A]">▲ +12.5%</span>
              <span className="text-[11px] text-[#718096]">vs last month</span>
            </div>
          </div>
        </div>

        {/* 3. Active Suppliers */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Active Suppliers</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDF3F3] border border-[#087E8B]/20 text-[#087E8B]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#253746]">
              {foodFlow.activeSuppliersCount}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#087E8B]">2 new</span>
              <span className="text-[11px] text-[#718096]">this month</span>
            </div>
          </div>
        </div>

        {/* 4. Waste Reduction */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Waste Reduction</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F7F0] border border-[#16A36A]/20 text-[#16A36A]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#253746]">
              {foodFlow.wasteReductionPercent}%
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#16A36A]">▲ +2.2%</span>
              <span className="text-[11px] text-[#718096]">vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: 3 FoodFlow Cards Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Inventory Status */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <h2 className="text-base font-bold text-[#253746]">Inventory Status</h2>
              <div className="h-7 w-7 rounded-lg bg-[#DDF3F3] flex items-center justify-center text-[#087E8B] text-xs">
                📊
              </div>
            </div>

            {/* Total Items & Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#253746] mb-2">
                <span>Total Items</span>
                <span className="text-sm font-extrabold text-[#087E8B]">
                  {foodFlow.inventoryStatus.totalItems.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#F5F7FA] overflow-hidden border border-[#E5EAF0]">
                <div className="h-full rounded-full bg-[#087E8B] w-4/5" />
              </div>
            </div>

            {/* Low Stock & Expired Badges */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 rounded-xl bg-[#FEF6E9] border border-[#E9A23B]/30 p-2.5 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-white flex items-center justify-center text-[#E9A23B] text-xs font-bold">
                  !
                </div>
                <div>
                  <p className="text-[10px] text-[#718096] font-medium leading-tight">Low Stock</p>
                  <p className="text-xs font-extrabold text-[#E9A23B]">{foodFlow.inventoryStatus.lowStock}</p>
                </div>
              </div>

              <div className="flex-1 rounded-xl bg-[#FCEEEE] border border-[#DC5353]/20 p-2.5 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-white flex items-center justify-center text-[#DC5353] text-xs font-bold">
                  ✕
                </div>
                <div>
                  <p className="text-[10px] text-[#718096] font-medium leading-tight">Expired</p>
                  <p className="text-xs font-extrabold text-[#DC5353]">{foodFlow.inventoryStatus.expired}</p>
                </div>
              </div>
            </div>

            {/* Low stock items list */}
            <div className="mt-4 divide-y divide-[#E5EAF0]">
              {foodFlow.inventoryStatus.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📦</span>
                    <div>
                      <p className="text-xs font-bold text-[#253746]">{item.name}</p>
                      <p className="text-[10px] text-[#718096]">{item.qty}</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-[#FEF6E9] border border-[#E9A23B]/30 px-2 py-0.5 text-[10px] font-bold text-[#E9A23B]">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/inventory"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#F5F7FA] border border-[#E5EAF0] p-2 text-xs font-bold text-[#253746] hover:bg-[#DDF3F3] hover:text-[#087E8B] transition"
          >
            <span>View Full Inventory</span>
            <span>→</span>
          </Link>
        </div>

        {/* Card 2: Orders Summary */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <h2 className="text-base font-bold text-[#253746]">Orders Summary</h2>
              <div className="h-7 w-7 rounded-lg bg-[#E8F7F0] flex items-center justify-center text-[#16A36A] text-xs">
                🛒
              </div>
            </div>

            {/* Pending vs Completed Pills */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#FEF6E9] border border-[#E9A23B]/30 p-2.5 text-center">
                <span className="text-[10px] text-[#718096] font-semibold block">Pending</span>
                <span className="text-lg font-extrabold text-[#E9A23B] mt-0.5 block">
                  {foodFlow.ordersSummary.pending}
                </span>
              </div>
              <div className="rounded-xl bg-[#E8F7F0] border border-[#16A36A]/20 p-2.5 text-center">
                <span className="text-[10px] text-[#718096] font-semibold block">Completed</span>
                <span className="text-lg font-extrabold text-[#16A36A] mt-0.5 block">
                  {foodFlow.ordersSummary.completed}
                </span>
              </div>
            </div>

            {/* 7-Day Order Trend Sparkline */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#718096] mb-1">
                <span>7-Day Order Trend</span>
                <span className="text-[#16A36A] font-bold">▲ 98.4% Fulfilled</span>
              </div>
              <div className="h-14 w-full flex items-center justify-center">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 40">
                  <path
                    d="M 5,28 Q 30,5 60,25 T 120,18 T 160,8 T 195,12"
                    fill="none"
                    stroke="#087E8B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="195" cy="12" r="3.5" fill="#087E8B" />
                </svg>
              </div>
            </div>

            {/* Orders list */}
            <div className="mt-2 divide-y divide-[#E5EAF0]">
              {foodFlow.ordersSummary.orders.map((ord, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-[#DDF3F3] flex items-center justify-center text-[#087E8B] text-xs font-bold">
                      {ord.student.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#253746]">{ord.student}</p>
                      <p className="text-[10px] text-[#718096]">{ord.id} • {ord.meal}</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-[#E8F7F0] border border-[#16A36A]/20 px-2 py-0.5 text-[10px] font-bold text-[#16A36A]">
                    {ord.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/kitchen"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#F5F7FA] border border-[#E5EAF0] p-2 text-xs font-bold text-[#253746] hover:bg-[#DDF3F3] hover:text-[#087E8B] transition"
          >
            <span>Manage Kitchen Orders</span>
            <span>→</span>
          </Link>
        </div>

        {/* Card 3: Supplier Overview */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <h2 className="text-base font-bold text-[#253746]">Supplier Overview</h2>
              <div className="h-7 w-7 rounded-lg bg-[#DDF3F3] flex items-center justify-center text-[#087E8B] text-xs">
                🏢
              </div>
            </div>

            {/* Active Suppliers & Score */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F5F7FA] border border-[#E5EAF0] p-2.5">
                <span className="text-[10px] text-[#718096] font-semibold block">Active Suppliers</span>
                <span className="text-lg font-extrabold text-[#253746] mt-0.5 block">
                  {foodFlow.supplierOverview.activeCount}
                </span>
              </div>
              <div className="rounded-xl bg-[#FEF6E9] border border-[#E9A23B]/30 p-2.5">
                <span className="text-[10px] text-[#718096] font-semibold block">Performance</span>
                <span className="text-lg font-extrabold text-[#E9A23B] mt-0.5 flex items-center gap-1">
                  <span>★</span>
                  <span>{foodFlow.supplierOverview.performanceScore}</span>
                </span>
              </div>
            </div>

            {/* Recent Deliveries list */}
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#718096] mb-2">
                Recent Deliveries
              </p>
              <div className="divide-y divide-[#E5EAF0]">
                {foodFlow.supplierOverview.deliveries.map((del, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#253746]">{del.name}</p>
                      <p className="text-[10px] text-[#718096]">{del.time}</p>
                    </div>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border ${
                        del.status === 'Delivered'
                          ? 'bg-[#E8F7F0] text-[#16A36A] border-[#16A36A]/20'
                          : 'bg-[#DDF3F3] text-[#087E8B] border-[#087E8B]/20'
                      }`}
                    >
                      {del.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/inventory"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#F5F7FA] border border-[#E5EAF0] p-2 text-xs font-bold text-[#253746] hover:bg-[#DDF3F3] hover:text-[#087E8B] transition"
          >
            <span>Supplier Indents</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Bottom Row: Sales & Expenses (2/3) + Food Waste Tracker (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Expenses (2/3 width) */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <div>
                <h2 className="text-base font-bold text-[#253746]">Sales & Expenses</h2>
                <p className="text-xs text-[#718096]">6-month financial operations overview</p>
              </div>
              <div className="h-8 w-8 rounded-xl bg-[#DDF3F3] flex items-center justify-center text-[#087E8B] font-bold text-sm">
                $
              </div>
            </div>

            {/* Total Sales vs Total Expenses */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#718096] font-medium">Total Sales</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#253746]">
                    {formatMoney(331000, true)}
                  </span>
                  <span className="text-xs font-bold text-[#16A36A]">▲ +12.5%</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#718096] font-medium">Total Expenses</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#253746]">
                    {formatMoney(213000, true)}
                  </span>
                  <span className="text-xs font-bold text-[#16A36A]">▲ +8.2%</span>
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
                      className="w-3 sm:w-5 bg-[#087E8B] rounded-t-sm transition-all group-hover:bg-[#066873]"
                      style={{ height: `${m.sales}%` }}
                      title={`Sales: $${m.sales * 3310}`}
                    />
                    <div
                      className="w-3 sm:w-5 bg-[#DDF3F3] rounded-t-sm transition-all group-hover:bg-[#c6eceb] border-t border-[#087E8B]/30"
                      style={{ height: `${m.expenses}%` }}
                      title={`Expenses: $${m.expenses * 2130}`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-[#718096]">{m.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5EAF0] flex items-center justify-between text-xs text-[#718096]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-[#087E8B]" />
                <span className="font-semibold text-[#253746]">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-[#DDF3F3] border border-[#087E8B]/30" />
                <span className="font-semibold text-[#253746]">Expenses</span>
              </div>
            </div>
            <span className="text-[#718096] text-[11px]">Net Margin: +35.6%</span>
          </div>
        </div>

        {/* Food Waste Tracker (1/3 Card) */}
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <h2 className="text-base font-bold text-[#253746]">Food Waste Tracker</h2>
              <div className="h-8 w-8 rounded-xl bg-[#FEF6E9] flex items-center justify-center text-[#E9A23B] font-bold text-sm">
                🗑️
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-[#718096]">Current Month Waste</p>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#253746]">
                  {foodFlow.foodWasteTracker.currentMonthWastePercent}%
                </span>
                <span className="rounded-full bg-[#E8F7F0] px-2 py-0.5 text-xs font-bold text-[#16A36A] border border-[#16A36A]/20">
                  ▼ -{foodFlow.foodWasteTracker.reductionFromLastMonth}%
                </span>
              </div>
              <p className="text-[11px] text-[#718096] mt-0.5">Reduction from last month</p>
            </div>

            {/* 6-Month Progressive Reduction Bar Chart */}
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#718096] mb-2">
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
                        bar.isLatest ? 'bg-[#087E8B]' : 'bg-[#E5EAF0] hover:bg-[#CBD5E0]'
                      }`}
                      style={{ height: `${bar.height}%` }}
                      title={`${bar.month}: ${bar.percent}% waste`}
                    />
                    <span className="mt-1.5 text-[10px] font-semibold text-[#718096]">
                      {bar.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/analytics"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#F5F7FA] border border-[#E5EAF0] p-2 text-xs font-bold text-[#253746] hover:bg-[#DDF3F3] hover:text-[#087E8B] transition"
          >
            <span>Food Waste Report</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Floating AI Assistant Trigger Button & Dialog */}
      <button
        type="button"
        onClick={() => setIsAiAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-[#087E8B] text-white px-4 py-3 shadow-xl hover:bg-[#066873] transition hover:scale-105 active:scale-95 border border-white/20"
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
