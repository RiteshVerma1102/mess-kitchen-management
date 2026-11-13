'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

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
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Food Waste, Cost & Demand Analytics</h1>
          <p className="text-sm text-slate-500">
            Real-time financial audits, plate & prep wastage metrics, forecast accuracy (MAPE), and CSV reports
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-1.5 shadow-sm text-xs">
            <span className="font-semibold text-slate-500">Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent font-medium focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent font-medium focus:outline-none"
            />
          </div>

          <select
            value={messHallId}
            onChange={(e) => setMessHallId(e.target.value)}
            className="rounded-xl border border-line bg-paper px-3 py-2 text-xs font-medium shadow-sm focus:border-brand focus:outline-none"
          >
            <option value="hall_a">Main Dining Hall (Hall A)</option>
            <option value="hall_b">Annex Kitchen (Hall B)</option>
          </select>

          <button
            onClick={() => handleExportCSV('daily_operations')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon (Inspired by screenshots 1, 5, 7, 11) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        <div className="rounded-xl border border-line bg-paper p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Total Prepared</span>
          <p className="mt-1 text-lg font-bold text-sky-700">{data ? data.kpis.totalFoodPrepared : 0}</p>
          <span className="text-[10px] text-slate-400">Portions cooked</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Meals Served</span>
          <p className="mt-1 text-lg font-bold text-emerald-700">{data ? data.kpis.totalMealsServed : 0}</p>
          <span className="text-[10px] text-slate-400">Student intake</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Total Food Waste</span>
          <p className="mt-1 text-lg font-bold text-rose-600">{data ? `${data.kpis.totalFoodWasteKg} kg` : '0 kg'}</p>
          <span className="text-[10px] text-slate-400">Logged weight</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Waste Rate</span>
          <p className={`mt-1 text-lg font-bold ${data && data.kpis.wastePercentage > 10 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {data ? `${data.kpis.wastePercentage}%` : '0%'}
          </p>
          <span className="text-[10px] text-slate-400">Target: &lt;8%</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Financial Loss</span>
          <p className="mt-1 text-lg font-bold text-rose-600">
            ₹{data ? (data.kpis.estimatedWasteLossPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-slate-400">Wasted capital</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Total Spend</span>
          <p className="mt-1 text-lg font-bold text-ink">
            ₹{data ? (data.kpis.totalExpenditurePaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
          </p>
          <span className="text-[10px] text-slate-400">Kitchen budget</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Cost / Meal</span>
          <p className="mt-1 text-lg font-bold text-brand">
            ₹{data ? (data.kpis.costPerMealPaise / 100).toFixed(2) : '0.00'}
          </p>
          <span className="text-[10px] text-slate-400">Per student plate</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Forecast Error</span>
          <p className={`mt-1 text-lg font-bold ${data && data.kpis.overallMape > 15 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {data ? `${data.kpis.overallMape}%` : '0%'}
          </p>
          <span className="text-[10px] text-slate-400">Overall MAPE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
          }`}
        >
          <span>📊</span>
          <span>Operations & Trends</span>
        </button>

        <button
          onClick={() => setActiveTab('waste')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'waste'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
          }`}
        >
          <span>🗑️</span>
          <span>Food Waste Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('costs')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'costs'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
          }`}
        >
          <span>💰</span>
          <span>Cost & Expenditure</span>
        </button>

        <button
          onClick={() => setActiveTab('accuracy')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'accuracy'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
          }`}
        >
          <span>🎯</span>
          <span>Forecast Accuracy</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'reports'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
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
                <div key={meal} className="rounded-xl border border-line bg-paper p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <h3 className="font-bold capitalize text-ink">{meal}</h3>
                    <span className="text-xs font-semibold text-slate-500">
                      ₹{(item.costPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Prepared:</span>
                      <strong className="text-ink">{item.actualPrepared} portions</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Served:</span>
                      <strong className="text-emerald-700">{item.mealsServed} portions</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Leftover:</span>
                      <strong className="text-amber-600">{item.leftoverPortions} portions</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Logged Waste:</span>
                      <strong className="text-rose-600">{item.wasteKg} kg</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Daily Trends Table */}
          <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
            <h2 className="text-base font-bold text-ink">Daily Operations Timeline</h2>
            <p className="text-xs text-slate-500">Historical daily audit of planning, cooking, servings, and waste</p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Service Date</th>
                    <th className="px-4 py-2 font-semibold">Forecast Headcount</th>
                    <th className="px-4 py-2 font-semibold">Planned Portions</th>
                    <th className="px-4 py-2 font-semibold">Actual Prepared</th>
                    <th className="px-4 py-2 font-semibold">Meals Served</th>
                    <th className="px-4 py-2 font-semibold">Leftovers</th>
                    <th className="px-4 py-2 font-semibold">Waste Weight</th>
                    <th className="px-4 py-2 font-semibold">Waste Loss</th>
                    <th className="px-4 py-2 font-semibold">Day Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        Loading daily trends...
                      </td>
                    </tr>
                  ) : !data || data.dailyTrends.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        No operations data recorded in this range.
                      </td>
                    </tr>
                  ) : (
                    data.dailyTrends.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-ink">{d.date}</td>
                        <td className="px-4 py-3 text-slate-600">{d.predictedCount || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{d.plannedPortions}</td>
                        <td className="px-4 py-3 font-bold text-sky-700">{d.actualPrepared}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{d.mealsServed}</td>
                        <td className="px-4 py-3 font-medium text-amber-600">{d.leftoverPortions}</td>
                        <td className="px-4 py-3 font-semibold text-rose-600">{d.wasteKg} kg</td>
                        <td className="px-4 py-3 text-slate-700">₹{(d.wasteLossPaise / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 font-semibold text-ink">
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
              <h2 className="text-base font-bold text-ink">Comprehensive Waste Breakdown & Causes</h2>
              <p className="text-xs text-slate-500">
                Segregated tracking across kitchen prep scraps, unserved batch leftovers, plate waste and spoilage
              </p>
            </div>

            <button
              onClick={() => setShowLogWasteModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
            >
              <span>➕</span>
              <span>Log Food Waste</span>
            </button>
          </div>

          {/* Waste Categories Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Unserved Leftovers</span>
              <p className="mt-2 text-2xl font-bold text-rose-600">
                {data ? `${(data.wasteCategoryDistribution['unserved_leftover'] || 0).toFixed(1)} kg` : '0 kg'}
              </p>
              <span className="text-xs text-slate-400">Excess preparation</span>
            </div>

            <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Kitchen Prep Scrap</span>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {data ? `${(data.wasteCategoryDistribution['kitchen_prep'] || 0).toFixed(1)} kg` : '0 kg'}
              </p>
              <span className="text-xs text-slate-400">Peelings, trimmings & burns</span>
            </div>

            <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Student Plate Waste</span>
              <p className="mt-2 text-2xl font-bold text-sky-700">
                {data ? `${(data.wasteCategoryDistribution['student_plate_waste'] || 0).toFixed(1)} kg` : '0 kg'}
              </p>
              <span className="text-xs text-slate-400">Returned uneaten plates</span>
            </div>

            <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Storage Spoilage</span>
              <p className="mt-2 text-2xl font-bold text-purple-700">
                {data ? `${(data.wasteCategoryDistribution['spoilage'] || 0).toFixed(1)} kg` : '0 kg'}
              </p>
              <span className="text-xs text-slate-400">Cold chain / shelf-life loss</span>
            </div>
          </div>

          {/* Top Causes List */}
          <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
            <h3 className="text-sm font-bold text-ink">Primary Root Causes of Waste</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data && data.topWastedReasons.length > 0 ? (
                data.topWastedReasons.map((r) => (
                  <div key={r.reason} className="rounded-lg border border-line bg-slate-50 p-3">
                    <p className="text-xs font-semibold capitalize text-slate-700">{r.reason.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-lg font-bold text-rose-600">{r.quantityKg} kg</p>
                    <span className="text-[10px] text-slate-400">{r.count} incidents recorded</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No cause distribution data.</p>
              )}
            </div>
          </div>

          {/* Waste Logs Table */}
          <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
            <h3 className="text-sm font-bold text-ink">Recent Waste Logs</h3>
            <div className="mt-3 overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-4 py-2 font-semibold">Meal</th>
                    <th className="px-4 py-2 font-semibold">Category</th>
                    <th className="px-4 py-2 font-semibold">Quantity</th>
                    <th className="px-4 py-2 font-semibold">Financial Loss</th>
                    <th className="px-4 py-2 font-semibold">Reason</th>
                    <th className="px-4 py-2 font-semibold">Disposal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {loadingWasteLogs ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                        Loading waste log entries...
                      </td>
                    </tr>
                  ) : wasteLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                        No food waste logged in this date range.
                      </td>
                    </tr>
                  ) : (
                    wasteLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-ink">{log.serviceDate}</td>
                        <td className="px-4 py-3 capitalize text-slate-600">{log.mealType}</td>
                        <td className="px-4 py-3 capitalize text-slate-700">{log.wasteType.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 font-bold text-rose-600">{log.quantityKg} kg</td>
                        <td className="px-4 py-3 font-semibold text-ink">
                          ₹{(log.financialLossPaise / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-500">{log.reasonCode.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 capitalize text-slate-500">{log.disposalMethod}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COST & EXPENDITURE */}
      {activeTab === 'costs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="text-sm font-bold text-ink">Cost Efficiency Metrics</h3>
              <div className="mt-4 space-y-4 text-xs">
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-slate-500">Total Food Expenditure:</span>
                  <strong className="text-ink text-sm">
                    ₹{data ? (data.kpis.totalExpenditurePaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}
                  </strong>
                </div>
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-slate-500">Total Meals Served:</span>
                  <strong className="text-emerald-700 text-sm">{data ? data.kpis.totalMealsServed : 0}</strong>
                </div>
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-slate-500">Average Cost Per Meal:</span>
                  <strong className="text-brand text-base">
                    ₹{data ? (data.kpis.costPerMealPaise / 100).toFixed(2) : '0.00'}
                  </strong>
                </div>
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-slate-500">Financial Loss to Food Waste:</span>
                  <strong className="text-rose-600 text-sm">
                    ₹{data ? (data.kpis.estimatedWasteLossPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-paper p-5 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold text-ink">Meal-Wise Expenditure Breakdown</h3>
              <p className="text-xs text-slate-500">Cost allocation across daily meal services</p>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((m) => {
                  const item = data?.mealBreakdown[m];
                  const cost = item ? item.costPaise / 100 : 0;
                  return (
                    <div key={m} className="rounded-lg border border-line bg-slate-50 p-3">
                      <p className="text-xs font-semibold capitalize text-slate-700">{m}</p>
                      <p className="mt-1 text-lg font-bold text-ink">
                        ₹{cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {item && item.mealsServed > 0 ? `₹${(cost / item.mealsServed).toFixed(2)}/plate` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FORECAST ACCURACY */}
      {activeTab === 'accuracy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Overall MAPE</span>
              <p className="mt-2 text-3xl font-bold text-brand">{data ? `${data.kpis.overallMape}%` : '0%'}</p>
              <p className="mt-1 text-xs text-slate-500">Mean Absolute Percentage Error</p>
              <span className="text-[10px] text-emerald-600">Excludes zero-demand days safely</span>
            </div>

            <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Overall MAE</span>
              <p className="mt-2 text-3xl font-bold text-sky-700">{data ? `${data.kpis.overallMae} meals` : '0'}</p>
              <p className="mt-1 text-xs text-slate-500">Mean Absolute Error in Student Headcount</p>
            </div>

            <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Valid Sample Size</span>
              <p className="mt-2 text-3xl font-bold text-ink">{data ? data.kpis.validForecastPoints : 0}</p>
              <p className="mt-1 text-xs text-slate-500">Recorded attendance checkpoints</p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
            <h3 className="text-sm font-bold text-ink">Forecast Methodology & Reliability</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
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
        <div className="rounded-xl border border-line bg-paper p-6 shadow-sm">
          <h2 className="text-base font-bold text-ink">Export Institutional Audits & Reports</h2>
          <p className="text-xs text-slate-500">
            Generate compliant RFC 4180 CSV spreadsheets for management review, financial auditors, and mess committees
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-line p-5">
              <span className="text-2xl">📋</span>
              <h3 className="mt-2 text-sm font-bold text-ink">Daily Operations Summary</h3>
              <p className="mt-1 text-xs text-slate-500">
                Covers planned portions, actual cooking volumes, served student headcount, and leftover statistics.
              </p>
              <button
                onClick={() => handleExportCSV('daily_operations')}
                className="mt-4 w-full rounded-lg bg-brand py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                Download CSV
              </button>
            </div>

            <div className="rounded-xl border border-line p-5">
              <span className="text-2xl">🗑️</span>
              <h3 className="mt-2 text-sm font-bold text-ink">Food Waste & Spoilage Log</h3>
              <p className="mt-1 text-xs text-slate-500">
                Detailed record of kitchen prep scrap, plate waste, financial loss per incident, and disposal methods.
              </p>
              <button
                onClick={() => handleExportCSV('waste_log')}
                className="mt-4 w-full rounded-lg bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Download CSV
              </button>
            </div>

            <div className="rounded-xl border border-line p-5">
              <span className="text-2xl">📈</span>
              <h3 className="mt-2 text-sm font-bold text-ink">Forecast Reliability Audit</h3>
              <p className="mt-1 text-xs text-slate-500">
                Complete comparison of predicted versus actual meal uptake, daily error margins, and MAPE accuracy metrics.
              </p>
              <button
                onClick={() => handleExportCSV('daily_operations')}
                className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG FOOD WASTE MODAL */}
      {showLogWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-paper p-6 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Log Daily Food Waste</h3>
            <p className="mt-1 text-xs text-slate-500">Record unserved leftovers, preparation scrap or spoilage</p>

            <form onSubmit={handleLogWasteSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Service Date</label>
                  <input
                    type="date"
                    value={logWasteDate}
                    onChange={(e) => setLogWasteDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600">Meal Service</label>
                  <select
                    value={logWasteMeal}
                    onChange={(e) => setLogWasteMeal(e.target.value as typeof logWasteMeal)}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
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
                  <label className="block text-xs font-semibold text-slate-600">Waste Category</label>
                  <select
                    value={logWasteType}
                    onChange={(e) => setLogWasteType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                  >
                    <option value="unserved_leftover">Unserved Batch Leftover</option>
                    <option value="kitchen_prep">Kitchen Preparation Scrap</option>
                    <option value="student_plate_waste">Student Plate Waste</option>
                    <option value="spoilage">Cold Storage Spoilage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600">Primary Reason</label>
                  <select
                    value={logWasteReason}
                    onChange={(e) => setLogWasteReason(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
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
                  <label className="block text-xs font-semibold text-slate-600">Waste Quantity (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={logWasteKg}
                    onChange={(e) => setLogWasteKg(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600">Financial Loss (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={logWasteLossPaise / 100}
                    onChange={(e) => setLogWasteLossPaise(Math.round(Number(e.target.value) * 100))}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Disposal Method</label>
                <select
                  value={logWasteDisposal}
                  onChange={(e) => setLogWasteDisposal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                >
                  <option value="biogas">Campus Biogas Digester</option>
                  <option value="compost">Compost Yard</option>
                  <option value="piggery_feed">Authorized Piggery Feed</option>
                  <option value="municipal_waste">Municipal Waste Collection</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Notes</label>
                <input
                  type="text"
                  value={logWasteNotes}
                  onChange={(e) => setLogWasteNotes(e.target.value)}
                  placeholder="e.g. Hostellers left early for weekend"
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogWasteModal(false)}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWaste}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
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
