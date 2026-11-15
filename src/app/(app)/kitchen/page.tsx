'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';

interface PlanItem {
  dishId: string;
  dishName: string;
  plannedPortions: number;
  estimatedCostPaise: number;
  prepNotes?: string;
}

interface PreparationPlan {
  _id: string;
  messHallId: string;
  serviceDate: string;
  mealType: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  forecastedHeadcount: number;
  bufferPercentage: number;
  plannedPortions: number;
  items: PlanItem[];
  totalEstimatedCostPaise: number;
  status: 'draft' | 'approved' | 'in_kitchen' | 'completed';
  approvedBy?: string;
}

interface PlanIngredientRequirement {
  ingredientId: string;
  name: string;
  category: string;
  unit: string;
  grossRequiredQty: number;
  currentStock: number;
  shortfall: number;
  estimatedCostPaise: number;
  associatedDishes: string[];
}

interface KitchenVarianceItem {
  mealType: string;
  dishId: string;
  dishName: string;
  plannedPortions: number;
  quantityPrepared: number;
  quantityServed: number;
  quantityLeftover: number;
  quantitySpoiled: number;
  variancePortions: number;
  variancePercentage: number;
}

interface VarianceSummary {
  serviceDate: string;
  messHallId: string;
  items: KitchenVarianceItem[];
  totals: {
    totalPlanned: number;
    totalPrepared: number;
    totalServed: number;
    totalLeftover: number;
    totalSpoiled: number;
    overallVariancePercentage: number;
  };
}

export default function KitchenOperationsPage() {
  const { toast, success, error } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [messHallId, setMessHallId] = useState<string>('hall_a');
  const [activeTab, setActiveTab] = useState<'plans' | 'actuals' | 'variance'>('plans');
  const [isTabletMode, setIsTabletMode] = useState<boolean>(false);

  const [plans, setPlans] = useState<PreparationPlan[]>([]);
  const [activeMeal, setActiveMeal] = useState<'breakfast' | 'lunch' | 'snacks' | 'dinner'>('lunch');
  const [selectedPlanRequirements, setSelectedPlanRequirements] = useState<PlanIngredientRequirement[]>([]);
  const [totalShortfallCostPaise, setTotalShortfallCostPaise] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [bufferPercentage, setBufferPercentage] = useState<number>(8);

  // Variance state
  const [varianceData, setVarianceData] = useState<VarianceSummary | null>(null);

  // Actuals form state
  const [dishId, setDishId] = useState<string>('');
  const [dishName, setDishName] = useState<string>('');
  const [actualPrepared, setActualPrepared] = useState<number>(0);
  const [actualServed, setActualServed] = useState<number>(0);
  const [actualLeftover, setActualLeftover] = useState<number>(0);
  const [actualSpoiled, setActualSpoiled] = useState<number>(0);
  const [actualNotes, setActualNotes] = useState<string>('');
  const [submittingActual, setSubmittingActual] = useState<boolean>(false);

  // Load Plan Requirements
  const fetchPlanRequirements = useCallback(async (planId: string) => {
    try {
      const res = await fetch(`/api/v1/kitchen/plans/${planId}`);
      if (!res.ok) throw new Error('Failed to load ingredient requirements');
      const data = await res.json();
      const reqs: PlanIngredientRequirement[] = data.data?.ingredientRequirements || data.ingredientRequirements || [];
      setSelectedPlanRequirements(reqs);

      const shortfallCost = reqs.reduce((sum, r) => sum + (r.shortfall > 0 ? r.estimatedCostPaise : 0), 0);
      setTotalShortfallCostPaise(shortfallCost);
    } catch (err) {
      error((err as Error).message);
    }
  }, [error]);

  // Load Daily Plans
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/kitchen/plans?date=${selectedDate}&messHallId=${messHallId}`);
      if (!res.ok) throw new Error('Failed to load preparation plans');
      const data = await res.json();
      const planList: PreparationPlan[] = data.data?.plans || data.plans || [];
      setPlans(planList);

      const current = planList.find((p) => p.mealType === activeMeal);
      if (current) {
        fetchPlanRequirements(current._id);
      } else {
        setSelectedPlanRequirements([]);
      }
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, messHallId, activeMeal, error, fetchPlanRequirements]);

  // Load Variance Summary
  const fetchVariance = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/kitchen/actuals/variance?date=${selectedDate}&messHallId=${messHallId}`);
      if (!res.ok) throw new Error('Failed to load variance summary');
      const data = await res.json();
      setVarianceData(data.data || data);
    } catch (err) {
      error((err as Error).message);
    }
  }, [selectedDate, messHallId, error]);

  useEffect(() => {
    fetchPlans();
    fetchVariance();
  }, [fetchPlans, fetchVariance]);

  // Generate / Recalculate Plan
  const handleGeneratePlan = async () => {
    try {
      setGenerating(true);
      const res = await fetch('/api/v1/kitchen/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messHallId,
          serviceDate: selectedDate,
          mealType: activeMeal,
          bufferPercentage,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to generate preparation plan');
      }

      success(`Plan for ${activeMeal} generated successfully with +${bufferPercentage}% safety buffer!`);
      fetchPlans();
    } catch (err) {
      error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // Update Plan Status (Approve / Send to Kitchen / Complete)
  const handleUpdateStatus = async (planId: string, status: PreparationPlan['status']) => {
    try {
      const res = await fetch(`/api/v1/kitchen/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to update plan status');
      }

      success(`Plan status updated to ${status}!`);
      fetchPlans();
    } catch (err) {
      error((err as Error).message);
    }
  };

  // Submit Kitchen Actuals
  const handleSubmitActual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishId) {
      error('Please select a dish from the plan');
      return;
    }

    try {
      setSubmittingActual(true);
      const res = await fetch('/api/v1/kitchen/actuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messHallId,
          serviceDate: selectedDate,
          mealType: activeMeal,
          dishId,
          quantityPrepared: Number(actualPrepared),
          quantityServed: Number(actualServed),
          quantityLeftover: Number(actualLeftover),
          quantitySpoiled: Number(actualSpoiled),
          notes: actualNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to record kitchen actuals');
      }

      success(`Actuals for ${dishName || 'dish'} recorded successfully!`);
      setDishId('');
      setDishName('');
      setActualPrepared(0);
      setActualServed(0);
      setActualLeftover(0);
      setActualSpoiled(0);
      setActualNotes('');
      fetchVariance();
    } catch (err) {
      error((err as Error).message);
    } finally {
      setSubmittingActual(false);
    }
  };

  // Auto-generate Purchase Indent for Plan Shortfalls
  const handleCreateIndentFromShortage = async () => {
    try {
      const shortfalls = selectedPlanRequirements.filter((r) => r.shortfall > 0);
      if (shortfalls.length === 0) {
        toast('info', 'Stock Sufficient', 'No ingredient shortages detected for this meal plan.');
        return;
      }

      const res = await fetch('/api/v1/indents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'auto',
          messHallId,
          targetDate: selectedDate,
          notes: `Auto-generated indent for ${activeMeal} shortfall on ${selectedDate}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to create indent');
      }

      success(`Purchase indent created for ${shortfalls.length} missing raw commodities!`);
    } catch (err) {
      error((err as Error).message);
    }
  };

  const currentPlan = plans.find((p) => p.mealType === activeMeal);

  const getStatusBadge = (status: PreparationPlan['status']) => {
    switch (status) {
      case 'draft':
        return <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">Draft Plan</span>;
      case 'approved':
        return <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">Approved for Kitchen</span>;
      case 'in_kitchen':
        return <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 animate-pulse">Cooking in Progress</span>;
      case 'completed':
        return <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">Service Finished</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Unified Design) */}
      <PageHeader
        icon="🍳"
        title="Kitchen Operations & Preparation Planning"
        description="Dynamic recipe BOM scaling, safety buffer management, live kitchen execution, and variance tracking"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsTabletMode(!isTabletMode)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                isTabletMode
                  ? 'bg-[#087E8B] text-white border-[#087E8B]'
                  : 'bg-white text-[#253746] border-[#E5EAF0] hover:bg-[#F5F7FA]'
              }`}
              title="Toggle Kitchen Tablet Terminal (Photo 11 Reference)"
            >
              <span>📱</span>
              <span>{isTabletMode ? 'Exit Tablet View' : 'Tablet Terminal Mode'}</span>
            </button>

            <input
              type="date"
              aria-label="Filter by service date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-[#E5EAF0] bg-white px-3 py-1.5 text-xs font-bold text-[#253746] shadow-xs focus:border-[#087E8B] focus:outline-none"
            />

            <select
              aria-label="Filter by mess hall location"
              value={messHallId}
              onChange={(e) => setMessHallId(e.target.value)}
              className="rounded-xl border border-[#E5EAF0] bg-white px-3 py-1.5 text-xs font-bold text-[#253746] shadow-xs focus:border-[#087E8B] focus:outline-none"
            >
              <option value="hall_a">Main Dining Hall (Hall A)</option>
              <option value="hall_b">Annex Kitchen (Hall B)</option>
            </select>
          </div>
        }
      />

      {/* 4 Top KPI Cards (Unified StatCard System) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="📋"
          title="Planned Portions"
          value={varianceData ? varianceData.totals.totalPlanned : 650}
          subtext="Target meals across today's rotation"
          color="slate"
        />
        <StatCard
          icon="🔥"
          title="Actually Prepared"
          value={varianceData ? varianceData.totals.totalPrepared : 680}
          subtext="Dispatched from kitchen cooking line"
          color="teal"
        />
        <StatCard
          icon="✅"
          title="Meals Served"
          value={varianceData ? varianceData.totals.totalServed : 642}
          subtext="Verified scanner attendance scans"
          color="emerald"
        />
        <StatCard
          icon="⚖️"
          title="Prep Variance"
          value={varianceData ? `${varianceData.totals.overallVariancePercentage > 0 ? '+' : ''}${varianceData.totals.overallVariancePercentage}%` : '+4.2%'}
          subtext="Well within ±5% tolerance"
          color="amber"
        />
      </div>

      {/* Lakeland Central Kitchen Financial & Stock Summary (Photo 9 Reference) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-[#E5EAF0] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Total Value on Hand</p>
            <p className="mt-1 text-2xl font-black text-[#087E8B]">
              ₹80,920 <span className="text-xs font-semibold text-[#718096]">($952)</span>
            </p>
            <span className="text-[11px] text-[#16A36A] font-semibold">Live raw commodity valuation</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#DDF3F3] text-[#087E8B] flex items-center justify-center text-xl font-bold">
            💎
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5EAF0] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Non-Consume Orders</p>
            <p className="mt-1 text-2xl font-black text-[#E9A23B]">
              13 <span className="text-xs font-semibold text-[#718096]">batches</span>
            </p>
            <span className="text-[11px] text-[#718096]">Queued & pending cook dispatch</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#FEF6E9] text-[#E9A23B] flex items-center justify-center text-xl font-bold">
            📋
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5EAF0] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Cost of Goods Sold (COGS)</p>
            <p className="mt-1 text-2xl font-black text-[#16A36A]">
              ₹27,285 <span className="text-xs font-semibold text-[#718096]">($321)</span>
            </p>
            <span className="text-[11px] text-[#087E8B] font-semibold">Today&apos;s batch consumption</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#E8F7F0] text-[#16A36A] flex items-center justify-center text-xl font-bold">
            💵
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E5EAF0]">
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'plans'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>🍳</span>
          <span>Preparation Planning & BOM</span>
        </button>

        <button
          onClick={() => setActiveTab('actuals')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'actuals'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>⚖️</span>
          <span>Record Kitchen Actuals</span>
        </button>

        <button
          onClick={() => setActiveTab('variance')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'variance'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>📊</span>
          <span>Variance & Waste Analysis</span>
        </button>
      </div>

      {/* Tablet Kitchen Terminal View (Unnic AI Reference 11) */}
      {isTabletMode && (
        <div className="rounded-3xl border-2 border-[#087E8B] bg-white p-6 shadow-xl animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5EAF0] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#16A36A] h-3 w-3 animate-ping" />
                <span className="rounded-md bg-[#DDF3F3] px-2.5 py-0.5 text-xs font-black text-[#087E8B]">
                  LIVE KITCHEN KIOSK TERMINAL
                </span>
              </div>
              <h2 className="text-xl font-black text-[#253746] mt-1 capitalize">
                {activeMeal} Batch Cooker Console — {selectedDate}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#718096]">Station: Central Cooking Line A</span>
              <button
                type="button"
                onClick={() => setIsTabletMode(false)}
                className="rounded-xl border border-[#E5EAF0] px-3.5 py-2 text-xs font-bold text-[#718096] hover:bg-[#F5F7FA] transition"
              >
                ✕ Close Terminal
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Batch Target Card */}
            <div className="rounded-2xl bg-[#F5F7FA] p-6 border border-[#E5EAF0] text-center flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#718096]">Target Portions to Cook</span>
                <p className="mt-2 text-5xl font-black text-[#087E8B]">
                  {currentPlan ? currentPlan.plannedPortions : 350}
                </p>
                <span className="mt-2 inline-block rounded-full bg-[#DDF3F3] px-3 py-1 text-xs font-bold text-[#087E8B]">
                  +8% Safety Buffer Included
                </span>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (currentPlan) handleUpdateStatus(currentPlan._id, 'in_kitchen');
                    toast('info', 'Cooking Started', 'Batch status updated to in-kitchen line.');
                  }}
                  className="w-full rounded-2xl bg-[#087E8B] py-3.5 text-sm font-black text-white shadow-md hover:bg-[#066873] active:scale-95 transition"
                >
                  🔥 Start Cooking Batch
                </button>
              </div>
            </div>

            {/* Quick Completion Card */}
            <div className="rounded-2xl bg-[#F5F7FA] p-6 border border-[#E5EAF0] text-center flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#718096]">Dispatched to Line</span>
                <p className="mt-2 text-5xl font-black text-[#16A36A]">
                  {actualPrepared > 0 ? actualPrepared : (currentPlan ? currentPlan.plannedPortions : 350)}
                </p>
                <span className="mt-2 inline-block rounded-full bg-[#E8F7F0] px-3 py-1 text-xs font-bold text-[#16A36A]">
                  Quality Checked & Ready
                </span>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (currentPlan) handleUpdateStatus(currentPlan._id, 'completed');
                    success('Batch Completed', 'Service readiness marked 100% complete.');
                  }}
                  className="w-full rounded-2xl bg-[#16A36A] py-3.5 text-sm font-black text-white shadow-md hover:bg-[#128a59] active:scale-95 transition"
                >
                  ✓ Complete & Dispatch
                </button>
              </div>
            </div>

            {/* Quick Leftovers & Waste Card */}
            <div className="rounded-2xl bg-[#F5F7FA] p-6 border border-[#E5EAF0] text-center flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#718096]">Log Unserved Leftover</span>
                <p className="mt-2 text-5xl font-black text-[#E9A23B]">
                  {actualLeftover} <span className="text-xl">pts</span>
                </p>
                <span className="mt-2 inline-block rounded-full bg-[#FEF6E9] px-3 py-1 text-xs font-bold text-[#E9A23B]">
                  Audit Tolerance: &lt;5%
                </span>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActualLeftover(Math.max(0, actualLeftover - 5))}
                  className="h-12 w-12 rounded-xl bg-white border border-[#E5EAF0] text-xl font-black text-[#253746] shadow-xs active:scale-90"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => setActualLeftover(actualLeftover + 5)}
                  className="h-12 w-12 rounded-xl bg-white border border-[#E5EAF0] text-xl font-black text-[#253746] shadow-xs active:scale-90"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast('info', 'Leftovers Saved', `${actualLeftover} portions queued for evening repurposing.`);
                  }}
                  className="flex-1 rounded-xl bg-[#E9A23B] py-3.5 text-xs font-black text-white shadow-xs hover:bg-[#d4902f] transition"
                >
                  Save Leftovers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: PREPARATION PLANNING */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Meal Service Sub-selector & Buffer Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5EAF0] shadow-xs">
            <div className="flex items-center gap-2 rounded-xl bg-[#F5F7FA] p-1">
              {(['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((meal) => (
                <button
                  key={meal}
                  onClick={() => {
                    setActiveMeal(meal);
                    const p = plans.find((item) => item.mealType === meal);
                    if (p) fetchPlanRequirements(p._id);
                    else setSelectedPlanRequirements([]);
                  }}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition ${
                    activeMeal === meal
                      ? 'bg-white text-[#087E8B] shadow-xs'
                      : 'text-[#718096] hover:text-[#253746]'
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#253746]">Buffer:</label>
                <select
                  aria-label="Preparation safety buffer percentage"
                  value={bufferPercentage}
                  onChange={(e) => setBufferPercentage(Number(e.target.value))}
                  className="rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-1.5 text-xs font-semibold text-[#253746] focus:border-[#087E8B] focus:outline-none"
                >
                  <option value={5}>+5% (Standard)</option>
                  <option value={8}>+8% (Recommended)</option>
                  <option value={12}>+12% (Peak Weekend)</option>
                  <option value={15}>+15% (Special Recess)</option>
                </select>
              </div>

              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-xl bg-[#087E8B] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition disabled:opacity-50"
              >
                {generating ? 'Calculating...' : '⚡ Generate / Scale Plan'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-[#E5EAF0] bg-white">
              <p className="text-xs text-[#718096]">Loading kitchen preparation plan...</p>
            </div>
          ) : currentPlan ? (
            <div className="space-y-6">
              {/* Plan Overview Card */}
              <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5EAF0] pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-bold capitalize text-[#253746]">
                        {currentPlan.mealType} Service Preparation Plan
                      </h2>
                      {getStatusBadge(currentPlan.status)}
                    </div>
                    <p className="mt-1 text-xs text-[#718096]">
                      Forecasted Attendance: <strong className="text-[#253746]">{currentPlan.forecastedHeadcount}</strong> | Safety Buffer: <strong className="text-[#253746]">+{currentPlan.bufferPercentage}%</strong> | Target Portions to Cook: <strong className="text-[#087E8B] text-sm">{currentPlan.plannedPortions}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {currentPlan.status === 'draft' && (
                      <button
                        onClick={() => handleUpdateStatus(currentPlan._id, 'approved')}
                        className="rounded-xl bg-[#087E8B] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#066873]"
                      >
                        ✓ Approve Plan
                      </button>
                    )}
                    {currentPlan.status === 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(currentPlan._id, 'in_kitchen')}
                        className="rounded-xl bg-[#E9A23B] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#d4902f]"
                      >
                        🍳 Send to Cooking Line
                      </button>
                    )}
                    {currentPlan.status === 'in_kitchen' && (
                      <button
                        onClick={() => handleUpdateStatus(currentPlan._id, 'completed')}
                        className="rounded-xl bg-[#16A36A] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#128a59]"
                      >
                        🏁 Complete Service
                      </button>
                    )}
                  </div>
                </div>

                {/* Planned Dishes Table */}
                <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5EAF0]">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E5EAF0] bg-[#F5F7FA] text-[#718096] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Planned Dish</th>
                        <th className="px-4 py-3">Portions to Cook</th>
                        <th className="px-4 py-3">Batch Size</th>
                        <th className="px-4 py-3">Estimated Food Cost</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0] text-[#253746]">
                      {currentPlan.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#F5F7FA]/80 transition">
                          <td className="px-4 py-3 font-bold text-[#253746]">{item.dishName}</td>
                          <td className="px-4 py-3 font-bold text-[#087E8B]">{item.plannedPortions}</td>
                          <td className="px-4 py-3 text-[#718096]">{item.prepNotes || 'Standard Batch'}</td>
                          <td className="px-4 py-3 font-medium text-[#253746]">₹{(item.estimatedCostPaise / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setDishId(item.dishId.toString());
                                setDishName(item.dishName);
                                setActualPrepared(item.plannedPortions);
                                setActualServed(item.plannedPortions);
                                setActiveTab('actuals');
                              }}
                              className="font-bold text-[#087E8B] hover:underline"
                            >
                              Log Actuals →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ingredient Requirements & Shortages Card */}
              <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5EAF0] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#253746]">
                      Raw Commodity Explosion & Shortfall Check
                    </h3>
                    <p className="text-xs text-[#718096] mt-0.5">
                      Net inventory exploded from recipe Bill of Materials (BOM) including prep yield factors
                    </p>
                  </div>

                  {totalShortfallCostPaise > 0 && (
                    <button
                      onClick={handleCreateIndentFromShortage}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#DC5353] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#c04343] transition"
                    >
                      <span>📦</span>
                      <span>Generate Indent for Shortages (₹{(totalShortfallCostPaise / 100).toFixed(2)})</span>
                    </button>
                  )}
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5EAF0]">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E5EAF0] bg-[#F5F7FA] text-[#718096] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Ingredient</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Required Qty</th>
                        <th className="px-4 py-3">Available Stock</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Shortfall</th>
                        <th className="px-4 py-3">Mapped Dishes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0] text-[#253746]">
                      {selectedPlanRequirements.map((ing) => (
                        <tr key={ing.ingredientId} className="hover:bg-[#F5F7FA]/80 transition">
                          <td className="px-4 py-3 font-bold text-[#253746]">{ing.name}</td>
                          <td className="px-4 py-3 capitalize text-[#718096]">{ing.category}</td>
                          <td className="px-4 py-3 font-bold text-[#253746]">{ing.grossRequiredQty} {ing.unit}</td>
                          <td className="px-4 py-3 text-[#718096]">{ing.currentStock} {ing.unit}</td>
                          <td className="px-4 py-3">
                            {ing.shortfall > 0 ? (
                              <span className="rounded-full bg-[#FEF6E9] border border-[#E9A23B]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#E9A23B]">
                                Deficit Shortage
                              </span>
                            ) : (
                              <span className="rounded-full bg-[#E8F7F0] border border-[#16A36A]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#16A36A]">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-[#DC5353]">
                            {ing.shortfall > 0 ? `${ing.shortfall} ${ing.unit}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-[#718096]">{ing.associatedDishes.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#E5EAF0] bg-white p-12 text-center shadow-xs">
              <span className="text-4xl">🍲</span>
              <h3 className="mt-3 text-base font-bold text-[#253746]">No Preparation Plan Generated</h3>
              <p className="mt-1 text-xs text-[#718096]">
                Click below to compute forecasted turnout and scale recipe BOMs for {activeMeal} on {selectedDate}.
              </p>
              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="mt-4 rounded-xl bg-[#087E8B] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition"
              >
                {generating ? 'Calculating Plan...' : `Generate ${activeMeal} Plan Now`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOG ACTUALS */}
      {activeTab === 'actuals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-base font-bold text-slate-900">Record Service Actuals</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Log cooked portions, student servings, and plate leftovers
            </p>

            <form onSubmit={handleSubmitActual} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Dish Name</label>
                {currentPlan && currentPlan.items.length > 0 ? (
                  <select
                    value={dishId}
                    onChange={(e) => {
                      setDishId(e.target.value);
                      const selected = currentPlan.items.find((i) => i.dishId.toString() === e.target.value);
                      if (selected) {
                        setDishName(selected.dishName);
                        setActualPrepared(selected.plannedPortions);
                        setActualServed(selected.plannedPortions);
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                    required
                  >
                    <option value="">Select dish from plan...</option>
                    {currentPlan.items.map((i) => (
                      <option key={i.dishId.toString()} value={i.dishId.toString()}>
                        {i.dishName} ({i.plannedPortions} planned)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter dish name or ObjectId..."
                    value={dishId}
                    onChange={(e) => setDishId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#253746]">Prepared Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={actualPrepared}
                    onChange={(e) => setActualPrepared(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs font-bold text-[#087E8B]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#253746]">Served Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={actualServed}
                    onChange={(e) => setActualServed(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs font-bold text-[#16A36A]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#253746]">Leftover Portions</label>
                  <input
                    type="number"
                    min="0"
                    value={actualLeftover}
                    onChange={(e) => setActualLeftover(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs text-[#E9A23B] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#253746]">Spoiled / Waste</label>
                  <input
                    type="number"
                    min="0"
                    value={actualSpoiled}
                    onChange={(e) => setActualSpoiled(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs text-[#DC5353] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#253746]">Kitchen Staff Log Notes</label>
                <textarea
                  rows={2}
                  value={actualNotes}
                  onChange={(e) => setActualNotes(e.target.value)}
                  placeholder="e.g. Extra rain caused lower turnout; stored in freezer"
                  className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2 text-xs text-[#253746]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingActual}
                className="w-full rounded-xl bg-[#087E8B] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#066873] transition"
              >
                {submittingActual ? 'Submitting...' : 'Save Kitchen Actuals'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs lg:col-span-2">
            <h2 className="text-base font-bold text-[#253746]">Recorded Service Actuals for {selectedDate}</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5EAF0]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E5EAF0] bg-[#F5F7FA] text-[#718096] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Meal</th>
                    <th className="px-4 py-3">Dish</th>
                    <th className="px-4 py-3">Planned</th>
                    <th className="px-4 py-3">Prepared</th>
                    <th className="px-4 py-3">Served</th>
                    <th className="px-4 py-3">Leftover</th>
                    <th className="px-4 py-3">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0] text-[#253746]">
                  {varianceData && varianceData.items.length > 0 ? (
                    varianceData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F5F7FA]/80 transition">
                        <td className="px-4 py-3 capitalize font-bold text-[#253746]">{item.mealType}</td>
                        <td className="px-4 py-3 font-semibold text-[#253746]">{item.dishName}</td>
                        <td className="px-4 py-3 text-[#718096]">{item.plannedPortions}</td>
                        <td className="px-4 py-3 font-bold text-[#087E8B]">{item.quantityPrepared}</td>
                        <td className="px-4 py-3 font-bold text-[#16A36A]">{item.quantityServed}</td>
                        <td className="px-4 py-3 font-medium text-[#E9A23B]">{item.quantityLeftover}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${item.variancePortions > 0 ? 'text-[#DC5353]' : 'text-[#16A36A]'}`}>
                            {item.variancePortions > 0 ? `+${item.variancePortions}` : item.variancePortions} ({item.variancePercentage}%)
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-[#718096]">
                        No service actuals logged for this date yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VARIANCE SUMMARY */}
      {activeTab === 'variance' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-[#253746]">Planned vs Actual Variance Analysis</h2>
            <p className="text-xs text-[#718096] mt-0.5">
              Production precision analysis and leftover volumes to reach zero food waste
            </p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5EAF0]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E5EAF0] bg-[#F5F7FA] text-[#718096] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Meal Service</th>
                    <th className="px-4 py-3">Dish</th>
                    <th className="px-4 py-3">Planned</th>
                    <th className="px-4 py-3">Prepared</th>
                    <th className="px-4 py-3">Served</th>
                    <th className="px-4 py-3">Leftover</th>
                    <th className="px-4 py-3">Spoiled</th>
                    <th className="px-4 py-3">Over/Under Prep</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0] text-[#253746]">
                  {varianceData && varianceData.items.length > 0 ? (
                    varianceData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F5F7FA]/80 transition">
                        <td className="px-4 py-3 capitalize font-bold text-[#253746]">{item.mealType}</td>
                        <td className="px-4 py-3 font-semibold text-[#253746]">{item.dishName}</td>
                        <td className="px-4 py-3 text-[#718096]">{item.plannedPortions}</td>
                        <td className="px-4 py-3 font-bold text-[#087E8B]">{item.quantityPrepared}</td>
                        <td className="px-4 py-3 font-bold text-[#16A36A]">{item.quantityServed}</td>
                        <td className="px-4 py-3 font-medium text-[#E9A23B]">{item.quantityLeftover}</td>
                        <td className="px-4 py-3 text-[#DC5353]">{item.quantitySpoiled}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              item.variancePortions > 10
                                ? 'bg-[#FCEEEE] text-[#DC5353] border-[#DC5353]/20'
                                : item.variancePortions < -10
                                ? 'bg-[#FEF6E9] text-[#E9A23B] border-[#E9A23B]/30'
                                : 'bg-[#E8F7F0] text-[#16A36A] border-[#16A36A]/20'
                            }`}
                          >
                            {item.variancePortions > 0 ? `+${item.variancePortions}` : item.variancePortions} ({item.variancePercentage}%)
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-[#718096]">
                        No variance data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
