'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface ComprehensiveAnalytics {
  dateRange: { startDate: string; endDate: string };
  kpis: {
    totalFoodPrepared: number;
    totalMealsServed: number;
    totalFoodWasteKg: number;
    wastePercentage: number;
    estimatedWasteLossPaise: number;
    totalExpenditurePaise: number;
    costPerMealPaise: number;
    overallMape: number;
    overallMae: number;
    validForecastPoints: number;
  };
  mealBreakdown: Record<
    string,
    {
      plannedPortions: number;
      actualPrepared: number;
      mealsServed: number;
      leftoverPortions: number;
      wasteKg: number;
      costPaise: number;
    }
  >;
  dailyTrends: Array<{
    date: string;
    plannedPortions: number;
    actualPrepared: number;
    mealsServed: number;
    leftoverPortions: number;
    wasteKg: number;
    wasteLossPaise: number;
    expenditurePaise: number;
    predictedCount: number;
  }>;
  topWastedReasons: Array<{ reason: string; quantityKg: number; count: number }>;
  wasteCategoryDistribution: Record<string, number>;
}

interface WasteLogItem {
  _id: string;
  serviceDate: string;
  messHallId: string;
  mealType: string;
  dishId?: { name: string };
  wasteType: string;
  quantityKg: number;
  financialLossPaise: number;
  reasonCode: string;
  disposalMethod: string;
  notes?: string;
}

export default function AnalyticsDashboardPage() {
  const { toast, success, error } = useToast();

  // Date range defaults: last 14 days
  const todayStr = new Date().toISOString().slice(0, 10);
  const twoWeeksAgoStr = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(twoWeeksAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [messHallId, setMessHallId] = useState('hall_a');
  const [activeTab, setActiveTab] = useState<'overview' | 'waste' | 'costs' | 'accuracy' | 'reports'>('overview');

  const [data, setData] = useState<ComprehensiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Waste Log Modal state
  const [showLogWasteModal, setShowLogWasteModal] = useState(false);
  const [logWasteDate, setLogWasteDate] = useState(todayStr);
  const [logWasteMeal, setLogWasteMeal] = useState<'breakfast' | 'lunch' | 'snacks' | 'dinner'>('lunch');
  const [logWasteType, setLogWasteType] = useState<string>('unserved_leftover');
  const [logWasteKg, setLogWasteKg] = useState<number>(5);
  const [logWasteLossPaise, setLogWasteLossPaise] = useState<number>(17500); // ₹175
  const [logWasteReason, setLogWasteReason] = useState<string>('over_preparation');
  const [logWasteDisposal, setLogWasteDisposal] = useState<string>('biogas');
  const [logWasteNotes, setLogWasteNotes] = useState('');
  const [submittingWaste, setSubmittingWaste] = useState(false);

  // Waste logs table
  const [wasteLogs, setWasteLogs] = useState<WasteLogItem[]>([]);
  const [loadingWasteLogs, setLoadingWasteLogs] = useState(false);

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/analytics/overview?startDate=${startDate}&endDate=${endDate}&messHallId=${messHallId}`,
      );
      if (!res.ok) throw new Error('Failed to load analytics data');
      const json = await res.json();
      setData(json.data || json);
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, messHallId, error]);

  // Fetch Waste Logs
  const fetchWasteLogs = useCallback(async () => {
    setLoadingWasteLogs(true);
    try {
      const res = await fetch(
        `/api/v1/waste?startDate=${startDate}&endDate=${endDate}&messHallId=${messHallId}&limit=50`,
      );
      if (!res.ok) throw new Error('Failed to load waste logs');
      const json = await res.json();
      const payload = json.data || json;
      setWasteLogs(payload.items || []);
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoadingWasteLogs(false);
    }
  }, [startDate, endDate, messHallId, error]);

  useEffect(() => {
    fetchAnalytics();
    if (activeTab === 'waste') fetchWasteLogs();
  }, [fetchAnalytics, fetchWasteLogs, activeTab]);

  // Handle Log Waste
  const handleLogWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingWaste(true);
    try {
      const res = await fetch('/api/v1/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messHallId,
          serviceDate: logWasteDate,
          mealType: logWasteMeal,
          wasteType: logWasteType,
          quantityKg: Number(logWasteKg),
          financialLossPaise: Number(logWasteLossPaise),
          reasonCode: logWasteReason,
          disposalMethod: logWasteDisposal,
          notes: logWasteNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to record food waste');
      }

      success('Food waste recorded successfully!');
      setShowLogWasteModal(false);
      fetchAnalytics();
      if (activeTab === 'waste') fetchWasteLogs();
    } catch (err) {
      error((err as Error).message);
    } finally {
      setSubmittingWaste(false);
    }
  };

  // CSV Export Trigger
  const handleExportCSV = (type: string) => {
    window.location.href = `/api/v1/reports/export?type=${type}&startDate=${startDate}&endDate=${endDate}&messHallId=${messHallId}`;
    toast('info', 'Download Started', `Generating ${type.replace('_', ' ')} CSV export...`);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls (Unified PageHeader) */}
      <PageHeader
        icon="📈"
        title="Food Waste, Cost & Demand Analytics"
        description="Real-time financial audits, plate & prep wastage metrics, forecast accuracy (MAPE), and CSV reports"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs text-xs">
              <span className="font-bold text-slate-500">Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent font-medium focus:outline-none text-slate-800"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent font-medium focus:outline-none text-slate-800"
              />
            </div>

            <select
              value={messHallId}
              onChange={(e) => setMessHallId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-2xs text-slate-800 focus:border-teal-700 focus:outline-none"
            >
              <option value="hall_a">Main Dining Hall (Hall A)</option>
              <option value="hall_b">Annex Kitchen (Hall B)</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV('daily_operations')}
              icon={<span>📥</span>}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* KPI Cards Ribbon (MarketMan & FoodFlow Reference Style) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        <div className="rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-[#718096]">Total Prepared</span>
          <p className="mt-1 text-lg font-bold text-[#087E8B]">{data ? data.kpis.totalFoodPrepared : 0}</p>
          <span className="text-[10px] text-[#718096]">Portions cooked</span>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-[#718096]">Meals Served</span>
          <p className="mt-1 text-lg font-bold text-[#16A36A]">{data ? data.kpis.totalMealsServed : 0}</p>
          <span className="text-[10px] text-[#718096]">Student intake</span>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-[#718096]">Total Food Waste</span>
          <p className="mt-1 text-lg font-bold text-[#DC5353]">{data ? `${data.kpis.totalFoodWasteKg} kg` : '0 kg'}</p>
          <span className="text-[10px] text-[#718096]">Logged weight</span>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-[#718096]">Waste Rate</span>
          <p className={`mt-1 text-lg font-bold ${data && data.kpis.wastePercentage > 10 ? 'text-[#DC5353]' : 'text-[#16A36A]'}`}>
            {data ? `${data.kpis.wastePercentage}%` : '0%'}
          </p>
          <span className="text-[10px] text-[#718096]">Target: &lt;8%</span>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-[#718096]">Financial Loss</span>
          <p className="mt-1 text-lg font-bold text-[#DC5353]">
            ₹{data ? (data.kpis.estimatedWasteLossPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-[#718096]">Wasted capital</span>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-[#718096]">Total Spend</span>
          <p className="mt-1 text-lg font-bold text-[#253746]">
            ₹{data ? (data.kpis.totalExpenditurePaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-[#718096]">Kitchen budget</span>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-[#718096]">Cost / Meal</span>
          <p className="mt-1 text-lg font-bold text-[#087E8B]">
            ₹{data ? (data.kpis.costPerMealPaise / 100).toFixed(2) : '0.00'}
          </p>
          <span className="text-[10px] text-[#718096]">Per student plate</span>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-[#718096]">Forecast Error</span>
          <p className={`mt-1 text-lg font-bold ${data && data.kpis.overallMape > 15 ? 'text-[#E9A23B]' : 'text-[#16A36A]'}`}>
            {data ? `${data.kpis.overallMape}%` : '0%'}
          </p>
          <span className="text-[10px] text-[#718096]">Overall MAPE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5EAF0]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>📊</span>
          <span>Operations & Trends</span>
        </button>

        <button
          onClick={() => setActiveTab('waste')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'waste'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>🗑️</span>
          <span>Food Waste Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('costs')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'costs'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>💰</span>
          <span>Cost & Expenditure</span>
        </button>

        <button
          onClick={() => setActiveTab('accuracy')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'accuracy'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>🎯</span>
          <span>Forecast Accuracy</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'reports'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>📑</span>
          <span>Reports & CSV</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TRENDS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Meal Breakdown Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {(['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((meal) => {
              const item = data?.mealBreakdown[meal] || {
                plannedPortions: 0,
                actualPrepared: 0,
                mealsServed: 0,
                leftoverPortions: 0,
                wasteKg: 0,
                costPaise: 0,
              };
              return (
                <div key={meal} className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3">
                    <h3 className="font-bold capitalize text-[#253746] text-sm">{meal}</h3>
                    <span className="text-xs font-bold text-[#087E8B]">
                      ₹{(item.costPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="mt-3.5 space-y-2.5 text-xs">
                    <div className="flex justify-between text-[#718096]">
                      <span>Prepared:</span>
                      <strong className="text-[#253746]">{item.actualPrepared} portions</strong>
                    </div>
                    <div className="flex justify-between text-[#718096]">
                      <span>Served:</span>
                      <strong className="text-[#16A36A]">{item.mealsServed} portions</strong>
                    </div>
                    <div className="flex justify-between text-[#718096]">
                      <span>Leftover:</span>
                      <strong className="text-[#E9A23B]">{item.leftoverPortions} portions</strong>
                    </div>
                    <div className="flex justify-between text-[#718096]">
                      <span>Logged Waste:</span>
                      <strong className="text-[#DC5353]">{item.wasteKg} kg</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Peak-Hour Service Heatmap (Tray Reference Style - Image 7) */}
          <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5EAF0] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#253746] flex items-center gap-2">
                  <span>⏱️</span>
                  <span>Peak-Hour Service & Attendance Heatmap</span>
                </h3>
                <p className="text-xs text-[#718096] mt-0.5">
                  Meal intake intensity matrix across dining hours (07:00 to 21:00) by day of the week
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#718096]">
                <span>Low</span>
                <span className="h-3 w-4 rounded-xs bg-[#DDF3F3] border border-[#087E8B]/20" />
                <span className="h-3 w-4 rounded-xs bg-[#74C7D0]" />
                <span className="h-3 w-4 rounded-xs bg-[#087E8B]" />
                <span className="h-3 w-4 rounded-xs bg-[#066873]" />
                <span>Peak Rush</span>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[680px]">
                {/* Hours column headers */}
                <div className="grid grid-cols-15 gap-1 text-center text-[10px] font-bold text-[#718096] mb-1.5 pl-14">
                  {['7a', '8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p'].map((h) => (
                    <div key={h}>{h}</div>
                  ))}
                </div>

                {/* Day rows with intensity cells */}
                {[
                  { day: 'Mon', levels: [1, 3, 2, 0, 1, 3, 4, 2, 0, 1, 2, 3, 4, 3, 1] },
                  { day: 'Tue', levels: [1, 4, 3, 1, 1, 4, 4, 2, 0, 1, 2, 3, 4, 2, 1] },
                  { day: 'Wed', levels: [1, 3, 2, 0, 1, 3, 4, 3, 0, 1, 2, 4, 4, 3, 1] },
                  { day: 'Thu', levels: [1, 4, 2, 1, 1, 4, 3, 2, 0, 1, 2, 3, 4, 2, 1] },
                  { day: 'Fri', levels: [1, 3, 3, 1, 1, 4, 4, 2, 1, 2, 3, 4, 3, 2, 1] },
                  { day: 'Sat', levels: [0, 2, 3, 1, 0, 3, 3, 1, 0, 1, 1, 3, 3, 2, 0] },
                  { day: 'Sun', levels: [0, 1, 3, 2, 0, 3, 4, 2, 1, 1, 1, 3, 3, 2, 0] },
                ].map((row) => (
                  <div key={row.day} className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-12 text-xs font-bold text-[#253746] text-right pr-2">{row.day}</span>
                    <div className="grid grid-cols-15 gap-1 flex-1">
                      {row.levels.map((lvl, idx) => {
                        const bgClass =
                          lvl === 4
                            ? 'bg-[#066873] text-white'
                            : lvl === 3
                            ? 'bg-[#087E8B] text-white'
                            : lvl === 2
                            ? 'bg-[#74C7D0] text-[#253746]'
                            : lvl === 1
                            ? 'bg-[#DDF3F3] text-[#087E8B]'
                            : 'bg-[#F5F7FA] border border-[#E5EAF0] text-transparent';

                        return (
                          <div
                            key={idx}
                            title={`${row.day} at ${idx + 7}:00 - Activity Index: ${lvl}/4`}
                            className={`h-7 rounded-md ${bgClass} flex items-center justify-center text-[10px] font-bold cursor-pointer hover:ring-2 hover:ring-[#087E8B]/40 transition`}
                          >
                            {lvl > 0 ? `${lvl * 25}%` : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Trends Table */}
          <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-[#253746]">Daily Operations Timeline</h2>
            <p className="text-xs text-[#718096]">Historical daily audit of planning, cooking, servings, and waste</p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5EAF0]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F7FA] text-[#718096] border-b border-[#E5EAF0] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Service Date</th>
                    <th className="px-4 py-3">Forecast Headcount</th>
                    <th className="px-4 py-3">Planned Portions</th>
                    <th className="px-4 py-3">Actual Prepared</th>
                    <th className="px-4 py-3">Meals Served</th>
                    <th className="px-4 py-3">Leftovers</th>
                    <th className="px-4 py-3">Waste Weight</th>
                    <th className="px-4 py-3">Waste Loss</th>
                    <th className="px-4 py-3">Day Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-[#718096]">
                        Loading daily trends...
                      </td>
                    </tr>
                  ) : !data || data.dailyTrends.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-[#718096]">
                        No operations data recorded in this range.
                      </td>
                    </tr>
                  ) : (
                    data.dailyTrends.map((d) => (
                      <tr key={d.date} className="hover:bg-[#F5F7FA]/80 transition">
                        <td className="px-4 py-3 font-bold text-[#253746]">{d.date}</td>
                        <td className="px-4 py-3 text-[#718096]">{d.predictedCount || '—'}</td>
                        <td className="px-4 py-3 text-[#718096]">{d.plannedPortions}</td>
                        <td className="px-4 py-3 font-bold text-[#087E8B]">{d.actualPrepared}</td>
                        <td className="px-4 py-3 font-bold text-[#16A36A]">{d.mealsServed}</td>
                        <td className="px-4 py-3 font-medium text-[#E9A23B]">{d.leftoverPortions}</td>
                        <td className="px-4 py-3 font-bold text-[#DC5353]">{d.wasteKg} kg</td>
                        <td className="px-4 py-3 text-[#253746]">₹{(d.wasteLossPaise / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 font-bold text-[#253746]">
                          ₹{(d.expenditurePaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FOOD WASTE TRACKER */}
      {activeTab === 'waste' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#253746]">Comprehensive Waste Breakdown & Causes</h2>
              <p className="text-xs text-[#718096]">
                Segregated tracking across kitchen prep scraps, unserved batch leftovers, plate waste and spoilage
              </p>
            </div>

            <button
              onClick={() => setShowLogWasteModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#DC5353] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#c04343] transition"
            >
              <span>➕</span>
              <span>Log Food Waste</span>
            </button>
          </div>

          {/* Waste Categories Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Unserved Leftovers</span>
              <p className="mt-2 text-2xl font-black text-[#DC5353]">
                {data ? `${(data.wasteCategoryDistribution['unserved_leftover'] || 0).toFixed(1)} kg` : '0 kg'}
              </p>
              <span className="text-[11px] text-[#718096]">Excess batch cooking</span>
            </div>

            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Kitchen Prep Scrap</span>
              <p className="mt-2 text-2xl font-black text-[#E9A23B]">
                {data ? `${(data.wasteCategoryDistribution['kitchen_prep'] || 0).toFixed(1)} kg` : '0 kg'}
              </p>
              <span className="text-[11px] text-[#718096]">Peelings, trimmings & burns</span>
            </div>

            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Student Plate Waste</span>
              <p className="mt-2 text-2xl font-black text-[#087E8B]">
                {data ? `${(data.wasteCategoryDistribution['student_plate_waste'] || 0).toFixed(1)} kg` : '0 kg'}
              </p>
              <span className="text-[11px] text-[#718096]">Returned uneaten plates</span>
            </div>

            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Storage Spoilage</span>
              <p className="mt-2 text-2xl font-black text-[#718096]">
                {data ? `${(data.wasteCategoryDistribution['spoilage'] || 0).toFixed(1)} kg` : '0 kg'}
              </p>
              <span className="text-[11px] text-[#718096]">Cold chain / shelf-life loss</span>
            </div>
          </div>

          {/* Top Causes List */}
          <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#253746]">Primary Root Causes of Waste</h3>
            <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data && data.topWastedReasons.length > 0 ? (
                data.topWastedReasons.map((r) => (
                  <div key={r.reason} className="rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] p-3.5">
                    <p className="text-xs font-bold capitalize text-[#253746]">{r.reason.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-lg font-black text-[#DC5353]">{r.quantityKg} kg</p>
                    <span className="text-[10px] text-[#718096]">{r.count} incidents recorded</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#718096]">No cause distribution data available.</p>
              )}
            </div>
          </div>

          {/* Waste Logs Table */}
          <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#253746]">Recent Waste Logs</h3>
            <div className="mt-3.5 overflow-x-auto rounded-xl border border-[#E5EAF0]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F7FA] text-[#718096] border-b border-[#E5EAF0] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Meal</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Financial Loss</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Disposal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {loadingWasteLogs ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-[#718096]">
                        Loading waste log entries...
                      </td>
                    </tr>
                  ) : wasteLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-[#718096]">
                        No food waste logged in this date range.
                      </td>
                    </tr>
                  ) : (
                    wasteLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-[#F5F7FA]/80 transition">
                        <td className="px-4 py-3 font-bold text-[#253746]">{log.serviceDate}</td>
                        <td className="px-4 py-3 capitalize text-[#718096]">{log.mealType}</td>
                        <td className="px-4 py-3 capitalize text-[#253746]">{log.wasteType.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 font-bold text-[#DC5353]">{log.quantityKg} kg</td>
                        <td className="px-4 py-3 font-bold text-[#253746]">
                          ₹{(log.financialLossPaise / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 capitalize text-[#718096]">{log.reasonCode.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 capitalize text-[#718096]">{log.disposalMethod}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COST & EXPENDITURE (MarketMan Reference - Image 5) */}
      {activeTab === 'costs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Cost Efficiency Metrics */}
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
              <h3 className="text-sm font-bold text-[#253746]">Cost Efficiency Metrics</h3>
              <div className="mt-4 space-y-3.5 text-xs">
                <div className="flex justify-between border-b border-[#E5EAF0] pb-2.5">
                  <span className="text-[#718096]">Total Food Expenditure:</span>
                  <strong className="text-[#253746] text-sm font-black">
                    ₹{data ? (data.kpis.totalExpenditurePaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}
                  </strong>
                </div>
                <div className="flex justify-between border-b border-[#E5EAF0] pb-2.5">
                  <span className="text-[#718096]">Total Meals Served:</span>
                  <strong className="text-[#16A36A] text-sm font-bold">{data ? data.kpis.totalMealsServed : 0}</strong>
                </div>
                <div className="flex justify-between border-b border-[#E5EAF0] pb-2.5">
                  <span className="text-[#718096]">Average Cost Per Meal:</span>
                  <strong className="text-[#087E8B] text-base font-black">
                    ₹{data ? (data.kpis.costPerMealPaise / 100).toFixed(2) : '0.00'}
                  </strong>
                </div>
                <div className="flex justify-between border-b border-[#E5EAF0] pb-2.5">
                  <span className="text-[#718096]">Financial Loss to Food Waste:</span>
                  <strong className="text-[#DC5353] text-sm font-bold">
                    ₹{data ? (data.kpis.estimatedWasteLossPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Meal-Wise Expenditure Breakdown */}
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs lg:col-span-2">
              <h3 className="text-sm font-bold text-[#253746]">Meal-Wise Expenditure Breakdown</h3>
              <p className="text-xs text-[#718096]">Cost allocation across daily institutional meal services</p>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((m) => {
                  const item = data?.mealBreakdown[m];
                  const cost = item ? item.costPaise / 100 : 0;
                  return (
                    <div key={m} className="rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] p-4">
                      <p className="text-xs font-bold capitalize text-[#253746]">{m}</p>
                      <p className="mt-1 text-lg font-black text-[#087E8B]">
                        ₹{cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <span className="text-[10px] text-[#718096]">
                        {item && item.mealsServed > 0 ? `₹${(cost / item.mealsServed).toFixed(2)}/plate` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sales & COGS Over Time (MarketMan Reference 5) */}
          <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5EAF0] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#253746]">
                  Sales & Cost of Goods Sold (COGS) Over Time
                </h3>
                <p className="text-xs text-[#718096] mt-0.5">
                  Benchmarking monthly dining budget burn rate against food intake allocations
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-[#253746] font-semibold">
                  <span className="h-3 w-3 rounded-full bg-[#087E8B]" /> Food Budget
                </span>
                <span className="flex items-center gap-1.5 text-[#253746] font-semibold">
                  <span className="h-3 w-3 rounded-full bg-[#E9A23B]" /> Actual COGS
                </span>
                <span className="rounded-lg bg-[#DDF3F3] px-2.5 py-1 text-[11px] font-bold text-[#087E8B]">
                  Target Ratio: 25.4%
                </span>
              </div>
            </div>

            {/* 6-Month COGS comparison bars */}
            <div className="mt-6 grid grid-cols-6 gap-4 text-center">
              {[
                { month: 'Jun', budget: 85, cogs: 22, ratio: '25.8%' },
                { month: 'Jul', budget: 92, cogs: 24, ratio: '26.0%' },
                { month: 'Aug', budget: 98, cogs: 24, ratio: '24.5%' },
                { month: 'Sep', budget: 104, cogs: 26, ratio: '25.0%' },
                { month: 'Oct', budget: 110, cogs: 27, ratio: '24.5%' },
                { month: 'Nov', budget: 115, cogs: 28, ratio: '24.3%' },
              ].map((item) => (
                <div key={item.month} className="space-y-2">
                  <div className="flex h-40 items-end justify-center gap-2 rounded-xl bg-[#F5F7FA] p-3 border border-[#E5EAF0]">
                    <div
                      style={{ height: `${(item.budget / 120) * 100}%` }}
                      className="w-4 rounded-t-md bg-[#087E8B] hover:opacity-90 transition"
                      title={`Budget: ₹${item.budget}k`}
                    />
                    <div
                      style={{ height: `${(item.cogs / 120) * 100 * 2.8}%` }}
                      className="w-4 rounded-t-md bg-[#E9A23B] hover:opacity-90 transition"
                      title={`COGS: ₹${item.cogs}k`}
                    />
                  </div>
                  <p className="text-xs font-bold text-[#253746]">{item.month}</p>
                  <span className="text-[10px] font-bold text-[#16A36A]">{item.ratio}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FORECAST ACCURACY */}
      {activeTab === 'accuracy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Overall MAPE</span>
              <p className="mt-2 text-3xl font-black text-[#087E8B]">{data ? `${data.kpis.overallMape}%` : '0%'}</p>
              <p className="mt-1 text-xs text-[#718096]">Mean Absolute Percentage Error</p>
              <span className="text-[10px] font-bold text-[#16A36A]">Excludes zero-demand days safely</span>
            </div>

            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Overall MAE</span>
              <p className="mt-2 text-3xl font-black text-[#253746]">{data ? `${data.kpis.overallMae} meals` : '0'}</p>
              <p className="mt-1 text-xs text-[#718096]">Mean Absolute Error in Student Headcount</p>
            </div>

            <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Valid Sample Size</span>
              <p className="mt-2 text-3xl font-black text-[#253746]">{data ? data.kpis.validForecastPoints : 0}</p>
              <p className="mt-1 text-xs text-[#718096]">Recorded attendance checkpoints</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#253746]">Forecast Methodology & Reliability</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#718096]">
              The demand forecast implements an 8-week same-weekday rolling average baseline ($z = 1.645$ for a 90%
              confidence bound), combined with academic calendar multipliers (holidays, exams) and an 8% kitchen safety
              buffer. When zero actual attendance occurs (such as campus closures), the system handles the zero safely to
              prevent division-by-zero artifacts.
            </p>
          </div>
        </div>
      )}

      {/* TAB 5: REPORTS & CSV */}
      {activeTab === 'reports' && (
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-[#253746]">Export Institutional Audits & Reports</h2>
          <p className="text-xs text-[#718096]">
            Generate compliant RFC 4180 CSV spreadsheets for management review, financial auditors, and mess committees
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E5EAF0] p-5">
              <span className="text-2xl">📋</span>
              <h3 className="mt-2 text-sm font-bold text-[#253746]">Daily Operations Summary</h3>
              <p className="mt-1 text-xs text-[#718096]">
                Covers planned portions, actual cooking volumes, served student headcount, and leftover statistics.
              </p>
              <button
                onClick={() => handleExportCSV('daily_operations')}
                className="mt-4 w-full rounded-xl bg-[#087E8B] py-2 text-xs font-bold text-white hover:bg-[#066873] transition"
              >
                Download CSV
              </button>
            </div>

            <div className="rounded-2xl border border-[#E5EAF0] p-5">
              <span className="text-2xl">🗑️</span>
              <h3 className="mt-2 text-sm font-bold text-[#253746]">Food Waste & Spoilage Log</h3>
              <p className="mt-1 text-xs text-[#718096]">
                Detailed record of kitchen prep scrap, plate waste, financial loss per incident, and disposal methods.
              </p>
              <button
                onClick={() => handleExportCSV('waste_log')}
                className="mt-4 w-full rounded-xl bg-[#DC5353] py-2 text-xs font-bold text-white hover:bg-[#c04343] transition"
              >
                Download CSV
              </button>
            </div>

            <div className="rounded-2xl border border-[#E5EAF0] p-5">
              <span className="text-2xl">📈</span>
              <h3 className="mt-2 text-sm font-bold text-[#253746]">Forecast Reliability Audit</h3>
              <p className="mt-1 text-xs text-[#718096]">
                Complete comparison of predicted versus actual meal uptake, daily error margins, and MAPE accuracy metrics.
              </p>
              <button
                onClick={() => handleExportCSV('forecast_audit')}
                className="mt-4 w-full rounded-xl bg-[#087E8B] py-2 text-xs font-bold text-white hover:bg-[#066873] transition"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
      {/* LOG FOOD WASTE MODAL */}
      {showLogWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#253746]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-[#253746]">Log Daily Food Waste</h3>
            <p className="mt-1 text-xs text-[#718096]">Record unserved leftovers, preparation scrap or spoilage</p>

            <form onSubmit={handleLogWasteSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#253746]">Service Date</label>
                  <input
                    type="date"
                    value={logWasteDate}
                    onChange={(e) => setLogWasteDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-medium text-[#253746] focus:border-[#087E8B] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#253746]">Meal Service</label>
                  <select
                    value={logWasteMeal}
                    onChange={(e) => setLogWasteMeal(e.target.value as typeof logWasteMeal)}
                    className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-medium text-[#253746] focus:border-[#087E8B] focus:outline-none"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="snacks">Snacks</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#253746]">Waste Category</label>
                  <select
                    value={logWasteType}
                    onChange={(e) => setLogWasteType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-medium text-[#253746] focus:border-[#087E8B] focus:outline-none"
                  >
                    <option value="unserved_leftover">Unserved Batch Leftover</option>
                    <option value="kitchen_prep">Kitchen Preparation Scrap</option>
                    <option value="student_plate_waste">Student Plate Waste</option>
                    <option value="spoilage">Cold Storage Spoilage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#253746]">Primary Reason</label>
                  <select
                    value={logWasteReason}
                    onChange={(e) => setLogWasteReason(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-medium text-[#253746] focus:border-[#087E8B] focus:outline-none"
                  >
                    <option value="over_preparation">Over Preparation</option>
                    <option value="low_attendance_exam">Low Attendance (Exams)</option>
                    <option value="low_attendance_holiday">Low Attendance (Holiday)</option>
                    <option value="rain_disruption">Rain / Weather Disruption</option>
                    <option value="burning_cooking_error">Burning / Cooking Error</option>
                    <option value="spoilage_power_cut">Power Cut / Freezer Issue</option>
                    <option value="quality_rejection">Quality Rejection</option>
                    <option value="plate_uneaten">Plate Uneaten</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#253746]">Waste Quantity (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={logWasteKg}
                    onChange={(e) => setLogWasteKg(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-medium text-[#253746] focus:border-[#087E8B] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#253746]">Financial Loss (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={logWasteLossPaise / 100}
                    onChange={(e) => setLogWasteLossPaise(Math.round(Number(e.target.value) * 100))}
                    className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-medium text-[#253746] focus:border-[#087E8B] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#253746]">Disposal Method</label>
                <select
                  value={logWasteDisposal}
                  onChange={(e) => setLogWasteDisposal(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-medium text-[#253746] focus:border-[#087E8B] focus:outline-none"
                >
                  <option value="biogas">Campus Biogas Digester</option>
                  <option value="compost">Compost Yard</option>
                  <option value="piggery_feed">Authorized Piggery Feed</option>
                  <option value="municipal_waste">Municipal Waste Collection</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#253746]">Notes</label>
                <input
                  type="text"
                  value={logWasteNotes}
                  onChange={(e) => setLogWasteNotes(e.target.value)}
                  placeholder="e.g. Hostellers left early for weekend"
                  className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-medium text-[#253746] focus:border-[#087E8B] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EAF0]">
                <button
                  type="button"
                  onClick={() => setShowLogWasteModal(false)}
                  className="rounded-xl border border-[#E5EAF0] px-4 py-2 text-xs font-bold text-[#718096] hover:bg-[#F5F7FA] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWaste}
                  className="rounded-xl bg-[#087E8B] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#066873] disabled:opacity-50 transition"
                >
                  {submittingWaste ? 'Saving...' : 'Save Food Waste Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
