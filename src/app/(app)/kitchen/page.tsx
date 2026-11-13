'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

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
      {/* Page Header (Lakeland Central Kitchen Style) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-bold text-lg shadow-sm shadow-orange-500/20">
              🍳
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                Kitchen Operations & Preparation Planning
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic recipe BOM scaling, safety buffer management, live kitchen execution, and variance tracking
              </p>
            </div>
          </div>
        </div>

        {/* Date and Hall Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            aria-label="Filter by service date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:bg-white"
          />

          <select
            aria-label="Filter by mess hall location"
            value={messHallId}
            onChange={(e) => setMessHallId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs"
          >
            <option value="hall_a">Main Dining Hall (Hall A)</option>
            <option value="hall_b">Annex Kitchen (Hall B)</option>
          </select>
        </div>
      </div>

      {/* 4 Top KPI Cards (Lakeland Central Kitchen Metric Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Planned */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 text-sm">
              📋
            </div>
            <span className="text-xs font-bold text-slate-700">Planned Portions</span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            {varianceData ? varianceData.totals.totalPlanned : 650}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Target meals across today&apos;s rotation</p>
        </div>

        {/* Cooked */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-sm">
              🔥
            </div>
            <span className="text-xs font-bold text-slate-700">Actually Prepared</span>
          </div>
          <p className="mt-3 text-2xl font-black text-blue-600 tracking-tight">
            {varianceData ? varianceData.totals.totalPrepared : 680}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Dispatched from kitchen cooking line</p>
        </div>

        {/* Served */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-sm">
              ✅
            </div>
            <span className="text-xs font-bold text-slate-700">Meals Served</span>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 tracking-tight">
            {varianceData ? varianceData.totals.totalServed : 642}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Verified scanner attendance scans</p>
        </div>

        {/* Variance */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 text-sm">
              ⚖️
            </div>
            <span className="text-xs font-bold text-slate-700">Prep Variance</span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            {varianceData ? `${varianceData.totals.overallVariancePercentage > 0 ? '+' : ''}${varianceData.totals.overallVariancePercentage}%` : '+4.2%'}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Well within ±5% tolerance</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'plans'
              ? 'border-blue-600 text-blue-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>🍳</span>
          <span>Preparation Planning & BOM</span>
        </button>

        <button
          onClick={() => setActiveTab('actuals')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'actuals'
              ? 'border-blue-600 text-blue-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>⚖️</span>
          <span>Record Kitchen Actuals</span>
        </button>

        <button
          onClick={() => setActiveTab('variance')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'variance'
              ? 'border-blue-600 text-blue-800'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>📊</span>
          <span>Variance & Waste Analysis</span>
        </button>
      </div>

      {/* TAB 1: PREPARATION PLANNING */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Meal Service Sub-selector & Buffer Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
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
                      ? 'bg-white text-blue-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Buffer:</label>
                <select
                  aria-label="Preparation safety buffer percentage"
                  value={bufferPercentage}
                  onChange={(e) => setBufferPercentage(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
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
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition disabled:opacity-50"
              >
                {generating ? 'Calculating...' : '⚡ Generate / Scale Plan'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-100 bg-white">
              <p className="text-xs text-slate-400">Loading kitchen preparation plan...</p>
            </div>
          ) : currentPlan ? (
            <div className="space-y-6">
              {/* Plan Overview Card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-bold capitalize text-slate-900">
                        {currentPlan.mealType} Service Preparation Plan
                      </h2>
                      {getStatusBadge(currentPlan.status)}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Forecasted Attendance: <strong className="text-slate-800">{currentPlan.forecastedHeadcount}</strong> | Safety Buffer: <strong className="text-slate-800">+{currentPlan.bufferPercentage}%</strong> | Target Portions to Cook: <strong className="text-blue-600 text-sm">{currentPlan.plannedPortions}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {currentPlan.status === 'draft' && (
                      <button
                        onClick={() => handleUpdateStatus(currentPlan._id, 'approved')}
                        className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                      >
                        ✓ Approve Plan
                      </button>
                    )}
                    {currentPlan.status === 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(currentPlan._id, 'in_kitchen')}
                        className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600"
                      >
                        🍳 Send to Cooking Line
                      </button>
                    )}
                    {currentPlan.status === 'in_kitchen' && (
                      <button
                        onClick={() => handleUpdateStatus(currentPlan._id, 'completed')}
                        className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                      >
                        🏁 Complete Service
                      </button>
                    )}
                  </div>
                </div>

                {/* Planned Dishes Table */}
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Planned Dish</th>
                        <th className="px-4 py-3">Portions to Cook</th>
                        <th className="px-4 py-3">Batch Size</th>
                        <th className="px-4 py-3">Estimated Food Cost</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {currentPlan.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-bold text-slate-900">{item.dishName}</td>
                          <td className="px-4 py-3 font-bold text-blue-600">{item.plannedPortions}</td>
                          <td className="px-4 py-3 text-slate-500">{item.prepNotes || 'Standard Batch'}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">₹{(item.estimatedCostPaise / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setDishId(item.dishId.toString());
                                setDishName(item.dishName);
                                setActualPrepared(item.plannedPortions);
                                setActualServed(item.plannedPortions);
                                setActiveTab('actuals');
                              }}
                              className="font-bold text-blue-600 hover:underline"
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

              {/* Ingredient Requirements & Shortages Card (Lakeland Low Stock Layout) */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Raw Commodity Explosion & Shortfall Check
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Net inventory exploded from recipe Bill of Materials (BOM) including prep yield factors
                    </p>
                  </div>

                  {totalShortfallCostPaise > 0 && (
                    <button
                      onClick={handleCreateIndentFromShortage}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/25 hover:bg-rose-700 transition"
                    >
                      <span>📦</span>
                      <span>Generate Indent for Shortages (₹{(totalShortfallCostPaise / 100).toFixed(2)})</span>
                    </button>
                  )}
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
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
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedPlanRequirements.map((ing) => (
                        <tr key={ing.ingredientId} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-bold text-slate-900">{ing.name}</td>
                          <td className="px-4 py-3 capitalize text-slate-500">{ing.category}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{ing.grossRequiredQty} {ing.unit}</td>
                          <td className="px-4 py-3 text-slate-600">{ing.currentStock} {ing.unit}</td>
                          <td className="px-4 py-3">
                            {ing.shortfall > 0 ? (
                              <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                                Deficit Shortage
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-rose-600">
                            {ing.shortfall > 0 ? `${ing.shortfall} ${ing.unit}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{ing.associatedDishes.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <span className="text-4xl">🍲</span>
              <h3 className="mt-3 text-base font-bold text-slate-800">No Preparation Plan Generated</h3>
              <p className="mt-1 text-xs text-slate-400">
                Click below to compute forecasted turnout and scale recipe BOMs for {activeMeal} on {selectedDate}.
              </p>
              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="mt-4 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
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
                  <label className="block text-xs font-bold text-slate-700">Prepared Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={actualPrepared}
                    onChange={(e) => setActualPrepared(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Served Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={actualServed}
                    onChange={(e) => setActualServed(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Leftover Portions</label>
                  <input
                    type="number"
                    min="0"
                    value={actualLeftover}
                    onChange={(e) => setActualLeftover(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-amber-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Spoiled / Waste</label>
                  <input
                    type="number"
                    min="0"
                    value={actualSpoiled}
                    onChange={(e) => setActualSpoiled(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-rose-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Kitchen Staff Log Notes</label>
                <textarea
                  rows={2}
                  value={actualNotes}
                  onChange={(e) => setActualNotes(e.target.value)}
                  placeholder="e.g. Extra rain caused lower turnout; stored in freezer"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submittingActual}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
              >
                {submittingActual ? 'Submitting...' : 'Save Kitchen Actuals'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-base font-bold text-slate-900">Recorded Service Actuals for {selectedDate}</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
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
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {varianceData && varianceData.items.length > 0 ? (
                    varianceData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 capitalize font-bold text-slate-800">{item.mealType}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.dishName}</td>
                        <td className="px-4 py-3 text-slate-500">{item.plannedPortions}</td>
                        <td className="px-4 py-3 font-bold text-blue-600">{item.quantityPrepared}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">{item.quantityServed}</td>
                        <td className="px-4 py-3 font-medium text-amber-600">{item.quantityLeftover}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${item.variancePortions > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {item.variancePortions > 0 ? `+${item.variancePortions}` : item.variancePortions} ({item.variancePercentage}%)
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
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
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Planned vs Actual Variance Analysis</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Production precision analysis and leftover volumes to reach zero food waste
            </p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
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
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {varianceData && varianceData.items.length > 0 ? (
                    varianceData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 capitalize font-bold text-slate-800">{item.mealType}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.dishName}</td>
                        <td className="px-4 py-3 text-slate-500">{item.plannedPortions}</td>
                        <td className="px-4 py-3 font-bold text-blue-600">{item.quantityPrepared}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">{item.quantityServed}</td>
                        <td className="px-4 py-3 font-medium text-amber-600">{item.quantityLeftover}</td>
                        <td className="px-4 py-3 text-rose-600">{item.quantitySpoiled}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              item.variancePortions > 10
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : item.variancePortions < -10
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.variancePortions > 0 ? `+${item.variancePortions}` : item.variancePortions} ({item.variancePercentage}%)
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
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
