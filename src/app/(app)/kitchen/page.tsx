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
      setSelectedPlanRequirements(data.data?.requirements || data.requirements || []);
      setTotalShortfallCostPaise(data.data?.totalShortfallCostPaise || data.totalShortfallCostPaise || 0);
    } catch (err) {
      error((err as Error).message);
    }
  }, [error]);

  // Load Plans
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/kitchen/plans?serviceDate=${selectedDate}&messHallId=${messHallId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch preparation plans');
      const data = await res.json();
      const planList = data.data?.plans || data.plans || [];
      setPlans(planList);

      // If active meal plan exists, fetch requirements
      const currentPlan = planList.find((p: PreparationPlan) => p.mealType === activeMeal);
      if (currentPlan) {
        fetchPlanRequirements(currentPlan._id);
      } else {
        setSelectedPlanRequirements([]);
        setTotalShortfallCostPaise(0);
      }
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, messHallId, activeMeal, error, fetchPlanRequirements]);

  // Load Variance
  const fetchVariance = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/kitchen/actuals/variance?serviceDate=${selectedDate}&messHallId=${messHallId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch kitchen variance summary');
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

  // Generate Plan
  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
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
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to generate plan');
      }
      success(`Preparation plan for ${activeMeal} generated successfully!`);
      await fetchPlans();
    } catch (err) {
      error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // Update Plan Status
  const handleUpdateStatus = async (planId: string, newStatus: PreparationPlan['status']) => {
    try {
      const res = await fetch(`/api/v1/kitchen/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update plan status');
      success(`Plan status updated to ${newStatus}`);
      await fetchPlans();
    } catch (err) {
      error((err as Error).message);
    }
  };

  // Generate Indent from Shortage
  const handleCreateIndentFromShortage = async () => {
    try {
      const res = await fetch('/api/v1/indents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'auto',
          messHallId,
          targetDate: selectedDate,
          notes: `Auto-generated from ${activeMeal} kitchen shortfall`,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to create indent');
      }
      const data = await res.json();
      const indentObj = data.data?.indent || data.indent;
      success(`Purchase Indent ${indentObj?.indentNumber || ''} created successfully!`);
    } catch (err) {
      error((err as Error).message);
    }
  };

  // Submit Actuals
  const handleSubmitActual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishId) {
      error('Please select a dish to log actuals');
      return;
    }
    setSubmittingActual(true);
    try {
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
          unit: 'portion',
          notes: actualNotes,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to record actuals');
      }
      success('Kitchen actuals logged successfully!');
      // Reset form
      setActualPrepared(0);
      setActualServed(0);
      setActualLeftover(0);
      setActualSpoiled(0);
      setActualNotes('');
      await fetchVariance();
    } catch (err) {
      error((err as Error).message);
    } finally {
      setSubmittingActual(false);
    }
  };

  const currentPlan = plans.find((p) => p.mealType === activeMeal);

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Completed</span>;
      case 'in_kitchen':
        return <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">In Kitchen</span>;
      case 'approved':
        return <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">Approved</span>;
      default:
        return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Draft</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Kitchen Operations & Production</h1>
          <p className="text-sm text-slate-500">
            Automate preparation scaling, raw material allocation, indents, and live kitchen execution
          </p>
        </div>

        {/* Global Date & Hall Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">Target Service Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-medium shadow-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500">Mess Hall</label>
            <select
              value={messHallId}
              onChange={(e) => setMessHallId(e.target.value)}
              className="mt-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-medium shadow-sm focus:border-brand focus:outline-none"
            >
              <option value="hall_a">Main Dining Hall (Hall A)</option>
              <option value="hall_b">Annex Kitchen (Hall B)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Planned Portions</p>
          <p className="mt-1 text-2xl font-bold text-ink">
            {varianceData ? varianceData.totals.totalPlanned : 0}
          </p>
          <span className="text-xs text-slate-400">Across all meals today</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Actually Prepared</p>
          <p className="mt-1 text-2xl font-bold text-sky-700">
            {varianceData ? varianceData.totals.totalPrepared : 0}
          </p>
          <span className="text-xs text-sky-600">Dispatched from kitchen</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Meals Served to Students</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {varianceData ? varianceData.totals.totalServed : 0}
          </p>
          <span className="text-xs text-emerald-600">Attendance scanned</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Overall Prep Variance</p>
          <p className={`mt-1 text-2xl font-bold ${
            varianceData && Math.abs(varianceData.totals.overallVariancePercentage) > 10
              ? 'text-rose-600'
              : 'text-emerald-600'
          }`}>
            {varianceData ? `${varianceData.totals.overallVariancePercentage > 0 ? '+' : ''}${varianceData.totals.overallVariancePercentage}%` : '0%'}
          </p>
          <span className="text-xs text-slate-400">Target tolerance: ±5%</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'plans'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
          }`}
        >
          <span>🍳</span>
          <span>Preparation Planning</span>
        </button>

        <button
          onClick={() => setActiveTab('actuals')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'actuals'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
          }`}
        >
          <span>⚖️</span>
          <span>Log Kitchen Actuals</span>
        </button>

        <button
          onClick={() => setActiveTab('variance')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'variance'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
          }`}
        >
          <span>📊</span>
          <span>Variance & Daily Summary</span>
        </button>
      </div>

      {/* TAB 1: PREPARATION PLANNING */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Meal Service Sub-selector */}
          <div className="flex flex-wrap items-center justify-between gap-4">
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
                  className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-all ${
                    activeMeal === meal
                      ? 'bg-paper text-ink shadow-sm'
                      : 'text-slate-600 hover:text-ink'
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">Safety Buffer:</label>
                <select
                  value={bufferPercentage}
                  onChange={(e) => setBufferPercentage(Number(e.target.value))}
                  className="rounded-lg border border-line bg-paper px-2 py-1 text-xs font-medium"
                >
                  <option value={5}>+5% (Standard)</option>
                  <option value={8}>+8% (Recommended)</option>
                  <option value={12}>+12% (Peak Weekend)</option>
                  <option value={15}>+15% (Exam/Event)</option>
                </select>
              </div>

              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {generating ? 'Calculating...' : '⚡ Generate / Sync Plan'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-line bg-paper">
              <p className="text-sm text-slate-400">Loading kitchen preparation plan...</p>
            </div>
          ) : currentPlan ? (
            <div className="space-y-6">
              {/* Plan Overview Card */}
              <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold capitalize text-ink">
                        {currentPlan.mealType} Service Plan
                      </h2>
                      {getStatusBadge(currentPlan.status)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Forecasted Headcount: <strong className="text-ink">{currentPlan.forecastedHeadcount}</strong> | Buffer: <strong className="text-ink">+{currentPlan.bufferPercentage}%</strong> | Target Portions: <strong className="text-brand text-sm">{currentPlan.plannedPortions}</strong>
                    </p>
                  </div>

                  {/* Action Buttons for Plan Workflow */}
                  <div className="flex flex-wrap items-center gap-2">
                    {currentPlan.status === 'draft' && (
                      <button
                        onClick={() => handleUpdateStatus(currentPlan._id, 'approved')}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                      >
                        ✓ Approve Plan
                      </button>
                    )}
                    {currentPlan.status === 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(currentPlan._id, 'in_kitchen')}
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                      >
                        🍳 Send to Kitchen
                      </button>
                    )}
                    {currentPlan.status === 'in_kitchen' && (
                      <button
                        onClick={() => handleUpdateStatus(currentPlan._id, 'completed')}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                      >
                        🏁 Mark Completed
                      </button>
                    )}
                  </div>
                </div>

                {/* Planned Dishes Table */}
                <div className="mt-4 overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Planned Dish</th>
                        <th className="px-4 py-2 font-semibold">Portions to Cook</th>
                        <th className="px-4 py-2 font-semibold">Portion Size</th>
                        <th className="px-4 py-2 font-semibold">Est. Total Cost</th>
                        <th className="px-4 py-2 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {currentPlan.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-ink">{item.dishName}</td>
                          <td className="px-4 py-3 font-bold text-brand">{item.plannedPortions}</td>
                          <td className="px-4 py-3 text-slate-500">{item.prepNotes || 'Standard'}</td>
                          <td className="px-4 py-3 text-ink">₹{(item.estimatedCostPaise / 100).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setDishId(item.dishId.toString());
                                setDishName(item.dishName);
                                setActualPrepared(item.plannedPortions);
                                setActualServed(item.plannedPortions);
                                setActiveTab('actuals');
                              }}
                              className="text-xs font-semibold text-brand hover:underline"
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
              <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-ink">Raw Ingredient Allocation & Shortfall Analysis</h3>
                    <p className="text-xs text-slate-500">
                      Net requirements exploded from recipe bill of materials (BOM) including waste factors
                    </p>
                  </div>

                  {totalShortfallCostPaise > 0 && (
                    <button
                      onClick={handleCreateIndentFromShortage}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                    >
                      <span>📦</span>
                      <span>Generate Indent for Shortages (₹{(totalShortfallCostPaise / 100).toFixed(2)})</span>
                    </button>
                  )}
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Ingredient</th>
                        <th className="px-4 py-2 font-semibold">Category</th>
                        <th className="px-4 py-2 font-semibold">Gross Required</th>
                        <th className="px-4 py-2 font-semibold">Current Stock</th>
                        <th className="px-4 py-2 font-semibold">Stock Status</th>
                        <th className="px-4 py-2 font-semibold">Shortfall</th>
                        <th className="px-4 py-2 font-semibold">Dishes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {selectedPlanRequirements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                            No recipe ingredients mapped for these dishes yet.
                          </td>
                        </tr>
                      ) : (
                        selectedPlanRequirements.map((ing) => (
                          <tr key={ing.ingredientId} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-ink">{ing.name}</td>
                            <td className="px-4 py-3 capitalize text-slate-500">{ing.category}</td>
                            <td className="px-4 py-3 font-medium text-ink">
                              {ing.grossRequiredQty} {ing.unit}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {ing.currentStock} {ing.unit}
                            </td>
                            <td className="px-4 py-3">
                              {ing.shortfall > 0 ? (
                                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                                  Deficit Shortage
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                  In Stock
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold text-rose-600">
                              {ing.shortfall > 0 ? `${ing.shortfall} ${ing.unit}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{ing.associatedDishes.join(', ')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-paper p-10 text-center">
              <span className="text-3xl">🍲</span>
              <h3 className="mt-2 text-base font-bold text-ink">No Preparation Plan Generated</h3>
              <p className="mt-1 text-xs text-slate-500">
                Click below to compute forecasted turnout and scale recipe BOMs for {activeMeal} on {selectedDate}.
              </p>
              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="mt-4 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {generating ? 'Calculating Plan...' : `Generate ${activeMeal} Plan Now`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOG ACTUALS */}
      {activeTab === 'actuals' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-line bg-paper p-5 shadow-sm lg:col-span-1">
            <h2 className="text-base font-bold text-ink">Record Service Execution</h2>
            <p className="text-xs text-slate-500">
              Log actual dishes prepared, student servings, and food leftovers
            </p>

            <form onSubmit={handleSubmitActual} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Dish Name</label>
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
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium focus:border-brand focus:outline-none"
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
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Quantity Prepared</label>
                  <input
                    type="number"
                    min="0"
                    value={actualPrepared}
                    onChange={(e) => setActualPrepared(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600">Quantity Served</label>
                  <input
                    type="number"
                    min="0"
                    value={actualServed}
                    onChange={(e) => setActualServed(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Leftover Portions</label>
                  <input
                    type="number"
                    min="0"
                    value={actualLeftover}
                    onChange={(e) => setActualLeftover(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600">Spoiled / Rejected</label>
                  <input
                    type="number"
                    min="0"
                    value={actualSpoiled}
                    onChange={(e) => setActualSpoiled(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Kitchen Staff Notes</label>
                <textarea
                  rows={2}
                  value={actualNotes}
                  onChange={(e) => setActualNotes(e.target.value)}
                  placeholder="e.g. Extra rain caused 15 leftovers, preserved in cold storage"
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={submittingActual}
                className="w-full rounded-lg bg-brand py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {submittingActual ? 'Submitting...' : 'Save Service Actuals'}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-line bg-paper p-5 shadow-sm lg:col-span-2">
            <h2 className="text-base font-bold text-ink">Recorded Actuals for {selectedDate}</h2>
            <div className="mt-4 overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Meal</th>
                    <th className="px-4 py-2 font-semibold">Dish</th>
                    <th className="px-4 py-2 font-semibold">Planned</th>
                    <th className="px-4 py-2 font-semibold">Prepared</th>
                    <th className="px-4 py-2 font-semibold">Served</th>
                    <th className="px-4 py-2 font-semibold">Leftover</th>
                    <th className="px-4 py-2 font-semibold">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {varianceData && varianceData.items.length > 0 ? (
                    varianceData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 capitalize font-semibold text-slate-700">{item.mealType}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{item.dishName}</td>
                        <td className="px-4 py-3 text-slate-600">{item.plannedPortions}</td>
                        <td className="px-4 py-3 font-bold text-sky-700">{item.quantityPrepared}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{item.quantityServed}</td>
                        <td className="px-4 py-3 font-medium text-amber-600">{item.quantityLeftover}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${
                            item.variancePortions > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
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
          <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
            <h2 className="text-base font-bold text-ink">Planned vs Actual Variance Analysis</h2>
            <p className="text-xs text-slate-500">
              Evaluates production precision and unserved leftover volumes to minimize kitchen waste
            </p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Meal Service</th>
                    <th className="px-4 py-2 font-semibold">Dish</th>
                    <th className="px-4 py-2 font-semibold">Planned</th>
                    <th className="px-4 py-2 font-semibold">Prepared</th>
                    <th className="px-4 py-2 font-semibold">Served</th>
                    <th className="px-4 py-2 font-semibold">Leftover</th>
                    <th className="px-4 py-2 font-semibold">Spoiled</th>
                    <th className="px-4 py-2 font-semibold">Over/Under Prep</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {varianceData && varianceData.items.length > 0 ? (
                    varianceData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 capitalize font-semibold text-slate-700">{item.mealType}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{item.dishName}</td>
                        <td className="px-4 py-3 font-medium text-slate-600">{item.plannedPortions}</td>
                        <td className="px-4 py-3 font-bold text-sky-700">{item.quantityPrepared}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{item.quantityServed}</td>
                        <td className="px-4 py-3 font-medium text-amber-600">{item.quantityLeftover}</td>
                        <td className="px-4 py-3 text-rose-600">{item.quantitySpoiled}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            item.variancePortions > 10
                              ? 'bg-rose-100 text-rose-700'
                              : item.variancePortions < -10
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
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
