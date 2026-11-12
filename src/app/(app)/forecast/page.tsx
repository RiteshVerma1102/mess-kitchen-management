'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

interface SingleMealForecast {
  targetDate: string;
  mealType: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  predictedCount: number;
  lowerBound: number;
  upperBound: number;
  confidenceLevel?: number;
  recommendedPortions: number;
  bufferPercentage?: number;
  dataPointsCount: number;
  historicalMean: number;
  historicalStdDev: number;
  calendarMultiplier: number;
  explanation: string;
  overridden: boolean;
  overrideCount?: number;
  overrideReason?: string;
  forecastId?: string;
}

interface DailyForecastData {
  targetDate: string;
  messHallId: string;
  dayOfWeek: number;
  dayName: string;
  meals: {
    breakfast: SingleMealForecast;
    lunch: SingleMealForecast;
    snacks: SingleMealForecast;
    dinner: SingleMealForecast;
  };
  totalPredictedDayCount: number;
  totalRecommendedPortions: number;
}

interface IngredientForecastItem {
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

interface IngredientForecastResponse {
  targetDate: string;
  mealType: string;
  forecast?: SingleMealForecast;
  menuName?: string;
  ingredients: IngredientForecastItem[];
  totalProcurementCostPaise: number;
}

interface HistoryItem {
  date: string;
  mealType: string;
  predicted: number;
  actual: number;
  lowerBound: number;
  upperBound: number;
  absoluteError: number;
  percentageError: number;
  withinConfidenceRange: boolean;
}

interface HistoryResponse {
  history: HistoryItem[];
  meanAbsolutePercentageError: number;
  accuracyRatePercentage: number;
}

export default function ForecastPage() {
  const { success, error } = useToast();

  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [messHallId, setMessHallId] = useState('hall_a');
  const [activeTab, setActiveTab] = useState<'daily' | 'ingredients' | 'accuracy'>('daily');

  // Forecast data states
  const [dailyData, setDailyData] = useState<DailyForecastData | null>(null);
  const [ingredientData, setIngredientData] = useState<IngredientForecastResponse | null>(null);
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Ingredient forecast meal selector
  const [ingMealType, setIngMealType] = useState<'breakfast' | 'lunch' | 'snacks' | 'dinner'>('lunch');

  // Manager Override Modal
  const [overrideModalForecast, setOverrideModalForecast] = useState<SingleMealForecast | null>(null);
  const [overrideCountInput, setOverrideCountInput] = useState<number>(300);
  const [overrideReasonInput, setOverrideReasonInput] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  const loadForecast = useCallback(async () => {
    try {
      setLoading(true);
      const [dailyRes, ingRes, histRes] = await Promise.all([
        fetch(`/api/v1/forecast/daily?targetDate=${targetDate}&messHallId=${messHallId}`),
        fetch(`/api/v1/forecast/ingredients?targetDate=${targetDate}&messHallId=${messHallId}&mealType=${ingMealType}`),
        fetch(`/api/v1/forecast/history?messHallId=${messHallId}`),
      ]);

      if (dailyRes.ok) {
        const body = await dailyRes.json();
        setDailyData(body.data);
      }
      if (ingRes.ok) {
        const body = await ingRes.json();
        setIngredientData(body.data);
      }
      if (histRes.ok) {
        const body = await histRes.json();
        setHistoryData(body.data);
      }
    } catch {
      error('Network Error', 'Failed to retrieve demand forecast');
    } finally {
      setLoading(false);
    }
  }, [targetDate, messHallId, ingMealType, error]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  const handleOpenOverride = (meal: SingleMealForecast) => {
    setOverrideModalForecast(meal);
    setOverrideCountInput(meal.recommendedPortions);
    setOverrideReasonInput(meal.overrideReason || '');
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalForecast?.forecastId) return;

    try {
      setSavingOverride(true);
      const res = await fetch('/api/v1/forecast/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forecastId: overrideModalForecast.forecastId,
          overrideCount: overrideCountInput,
          reason: overrideReasonInput,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        error('Override Failed', body?.error?.message ?? 'Failed to update forecast');
        setSavingOverride(false);
        return;
      }

      success('Forecast Overridden', `Adjusted target to ${overrideCountInput} portions`);
      setOverrideModalForecast(null);
      loadForecast();
    } catch {
      error('Network Error', 'Failed to submit override');
    } finally {
      setSavingOverride(false);
    }
  };

  const formatPaise = (paise: number) => {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Operational Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">Baseline Demand Forecasting</h1>
            <span className="rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-[11px] font-bold text-brand uppercase">
              Model v1 (Rolling DOW + Calendar)
            </span>
          </div>
          <p className="text-xs text-ink/70 mt-1">
            Statistical demand forecasting using 8-week same-weekday attendance histories, event multipliers, and BOM planning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold"
          />

          <select
            value={messHallId}
            onChange={(e) => setMessHallId(e.target.value)}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold"
          >
            <option value="hall_a">Hostel A & B (Boys Mess)</option>
            <option value="hall_b">Hostel C & D (Girls Mess)</option>
            <option value="hall_c">Post-Graduate Dining Hall</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`pb-2 border-b-2 transition ${
            activeTab === 'daily'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          Daily Meal Forecasts (4 Meals)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ingredients')}
          className={`pb-2 border-b-2 transition ${
            activeTab === 'ingredients'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          Forecasted Raw Commodity BOM
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('accuracy')}
          className={`pb-2 border-b-2 transition ${
            activeTab === 'accuracy'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          Model Accuracy & Historical Error (MAPE)
        </button>
      </div>

      {/* TAB 1: Daily Forecast Cards */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-16 text-center text-xs text-ink/60 animate-pulse">
              Computing rolling baseline forecasts...
            </div>
          ) : !dailyData ? (
            <div className="p-12 text-center text-xs text-ink/60">
              Unable to compute forecast for selected parameters.
            </div>
          ) : (
            <>
              {/* Daily Cumulative Overview Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-line bg-paper p-5 shadow-sm">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink/50">Target Service Day</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-brand">{dailyData.dayName}</span>
                    <span className="text-xs text-ink/60 font-mono">{dailyData.targetDate}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-ink/50">Total Expected Headcount</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-ink">{dailyData.totalPredictedDayCount}</span>
                    <span className="text-xs text-ink/60">across all 4 meals</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-ink/50">Recommended Batch Portions</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600">
                      {dailyData.totalRecommendedPortions}
                    </span>
                    <span className="text-xs text-ink/60">(Includes 8% kitchen safety buffer)</span>
                  </div>
                </div>
              </div>

              {/* 4 Meal Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((mealKey) => {
                  const meal = dailyData.meals[mealKey];

                  return (
                    <div
                      key={mealKey}
                      className="rounded-2xl border border-line bg-paper p-5 shadow-sm flex flex-col justify-between hover:border-brand/40 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-line pb-2.5">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-brand">
                            {mealKey}
                          </h3>
                          {meal.overridden ? (
                            <span className="rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 text-[10px] font-bold">
                              Overridden
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-ink/50">
                              {meal.dataPointsCount} data points
                            </span>
                          )}
                        </div>

                        {/* Forecast Prediction Metric */}
                        <div className="mt-3">
                          <span className="text-[10px] font-semibold uppercase text-ink/50">
                            Expected Student Attendance
                          </span>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-3xl font-black text-ink">{meal.predictedCount}</span>
                            <span className="text-xs text-ink/60">students</span>
                          </div>
                        </div>

                        {/* Confidence Range Bar */}
                        <div className="mt-3 rounded-lg border border-line/70 bg-stone-50 dark:bg-stone-900/40 p-2.5 text-xs">
                          <div className="flex justify-between text-[11px] font-semibold text-ink/70">
                            <span>Lower Est. (90% CI)</span>
                            <span>Upper Est.</span>
                          </div>
                          <div className="flex justify-between font-mono font-bold text-ink mt-0.5">
                            <span>{meal.lowerBound}</span>
                            <span className="text-ink/40 text-[10px]">confidence range</span>
                            <span>{meal.upperBound}</span>
                          </div>
                        </div>

                        {/* Preparation Recommendation */}
                        <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                              Prep Portions:
                            </span>
                            <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                              {meal.recommendedPortions}
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                            {meal.overridden
                              ? `Manual override: ${meal.overrideReason}`
                              : `Baseline + ${meal.bufferPercentage}% prep margin`}
                          </span>
                        </div>

                        {/* Explanation snippet */}
                        <p className="mt-3 text-[11px] text-ink/70 leading-relaxed border-t border-line/50 pt-2">
                          {meal.explanation}
                        </p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-line flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenOverride(meal)}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                        >
                          ✏️ Adjust / Override
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Methodology & Assumptions Disclosure */}
              <div className="rounded-xl border border-line bg-paper p-5 shadow-sm text-xs text-ink/80 space-y-2">
                <h4 className="font-bold text-sm text-ink flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>Forecasting Engine Methodology & Transparent Baseline Assumptions</span>
                </h4>
                <p>
                  1. <span className="font-semibold text-ink">Day-of-Week Seasonality:</span> Student turnout in university mess halls fluctuates predictably by weekday (e.g. lower attendance on Friday nights and weekends due to home visits). The baseline engine queries past 8 weeks of identical weekdays.
                </p>
                <p>
                  2. <span className="font-semibold text-ink">Calendar Impact Scaling:</span> Academic events registered in Module M3 (such as exams, festivals, or university recesses) apply deterministic multipliers directly to the historical sample mean.
                </p>
                <p>
                  3. <span className="font-semibold text-ink">Kitchen Preparation Buffer:</span> Recommended cooking quantity incorporates a configured 8% buffer above expected attendance to safeguard service availability while preventing over-preparation waste.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: Forecasted Raw Commodity BOM */}
      {activeTab === 'ingredients' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper p-4 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-ink">
                Raw Commodity Demand for {ingMealType.toUpperCase()}
              </h2>
              <p className="text-xs text-ink/60">
                Menu: {ingredientData?.menuName ?? 'Standard University Rotation'} • Forecasted Portions: {ingredientData?.forecast?.recommendedPortions ?? 350}
              </p>
            </div>

            <div className="flex gap-1 rounded-lg border border-line bg-paper p-1 text-xs font-semibold">
              {(['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setIngMealType(m)}
                  className={`rounded px-3 py-1 capitalize transition ${
                    ingMealType === m ? 'bg-brand text-white shadow-sm' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-ink/60 animate-pulse">
              Scaling bill of materials for forecasted headcount...
            </div>
          ) : !ingredientData || ingredientData.ingredients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-paper p-12 text-center text-xs text-ink/60">
              No recipe BOM found for this meal type. Add recipes to the active menu to view ingredient scaling.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-paper shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-stone-50 dark:bg-stone-900/60 text-ink/70 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Ingredient Commodity</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Gross Required</th>
                    <th className="px-4 py-3">Warehouse Stock</th>
                    <th className="px-4 py-3">Procurement Need</th>
                    <th className="px-4 py-3">Used in Dishes</th>
                    <th className="px-4 py-3 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {ingredientData.ingredients.map((ing) => (
                    <tr key={ing.ingredientId} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/40">
                      <td className="px-4 py-3 font-semibold">{ing.name}</td>
                      <td className="px-4 py-3 capitalize text-ink/60">{ing.category}</td>
                      <td className="px-4 py-3 font-bold text-brand">
                        {ing.grossRequiredQty} {ing.unit}
                      </td>
                      <td className="px-4 py-3 text-ink/70">
                        {ing.currentStock} {ing.unit}
                      </td>
                      <td className="px-4 py-3">
                        {ing.shortfall > 0 ? (
                          <span className="rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 px-2 py-0.5 text-[10px] font-bold">
                            Short {ing.shortfall} {ing.unit}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[11px]">Sufficient</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-ink/70">
                        {ing.associatedDishes.join(', ') || 'General Prep'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatPaise(ing.estimatedCostPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-line bg-stone-50 dark:bg-stone-900/40 font-bold">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right">
                      Total Estimated Raw Ingredient Cost:
                    </td>
                    <td className="px-4 py-3 text-right text-brand text-sm">
                      {formatPaise(ingredientData.totalProcurementCostPaise)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Model Accuracy & Historical Error (MAPE) */}
      {activeTab === 'accuracy' && (
        <div className="space-y-6">
          {/* Summary Accuracy Metrics */}
          {historyData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-ink/50">Overall MAPE</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-brand">
                    {historyData.meanAbsolutePercentageError}%
                  </span>
                  <span className="text-xs text-ink/60">Mean Absolute % Error</span>
                </div>
                <p className="mt-1 text-[11px] text-ink/50">Target is under 15% error</p>
              </div>

              <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-ink/50">Confidence Accuracy Rate</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-600">
                    {historyData.accuracyRatePercentage}%
                  </span>
                  <span className="text-xs text-ink/60">within predicted bounds</span>
                </div>
                <p className="mt-1 text-[11px] text-ink/50">Actuals within 90% confidence range</p>
              </div>

              <div className="rounded-xl border border-line bg-paper p-5 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-ink/50">Total Evaluated Services</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-ink">{historyData.history.length}</span>
                  <span className="text-xs text-ink/60">meal sessions recorded</span>
                </div>
                <p className="mt-1 text-[11px] text-ink/50">Based on historical meal consumptions</p>
              </div>
            </div>
          )}

          {/* Actual vs Predicted Visual History Table */}
          <div className="rounded-xl border border-line bg-paper shadow-sm overflow-hidden">
            <div className="border-b border-line p-4">
              <h3 className="text-sm font-bold text-ink">Recent Service Actuals vs Predictions</h3>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-ink/60 animate-pulse">
                Evaluating historical predictions...
              </div>
            ) : !historyData || historyData.history.length === 0 ? (
              <div className="p-12 text-center text-xs text-ink/60">
                No verified historical attendance records available for comparison.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-stone-50 dark:bg-stone-900/60 text-ink/70 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Meal</th>
                      <th className="px-4 py-3">Predicted Headcount</th>
                      <th className="px-4 py-3">Actual Headcount</th>
                      <th className="px-4 py-3">Confidence Interval</th>
                      <th className="px-4 py-3">Absolute Error</th>
                      <th className="px-4 py-3 text-right">Error %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink">
                    {historyData.history.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/40">
                        <td className="px-4 py-3 font-mono">{row.date}</td>
                        <td className="px-4 py-3 font-semibold capitalize">{row.mealType}</td>
                        <td className="px-4 py-3 font-bold text-ink">{row.predicted}</td>
                        <td className="px-4 py-3 font-black text-brand">{row.actual}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-ink/70">
                          [{row.lowerBound} – {row.upperBound}]
                        </td>
                        <td className="px-4 py-3 font-mono text-ink/80">{row.absoluteError}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span
                            className={
                              row.percentageError <= 12
                                ? 'text-emerald-600'
                                : row.percentageError <= 20
                                ? 'text-amber-600'
                                : 'text-red-600'
                            }
                          >
                            {row.percentageError}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manager Override Modal */}
      {overrideModalForecast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Override {overrideModalForecast.mealType.toUpperCase()} Forecast
                </h3>
                <p className="text-xs text-ink/60">
                  Target Date: {overrideModalForecast.targetDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModalForecast(null)}
                className="text-sm text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="mt-4 space-y-3 text-xs">
              <div className="rounded-lg border border-line bg-stone-50 dark:bg-stone-900/30 p-3">
                <div className="flex justify-between text-ink/70">
                  <span>Engine Prediction:</span>
                  <span className="font-bold text-ink">{overrideModalForecast.predictedCount} portions</span>
                </div>
                <div className="flex justify-between text-ink/70 mt-1">
                  <span>Recommended Prep (8% Buffer):</span>
                  <span className="font-bold text-brand">{overrideModalForecast.recommendedPortions} portions</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink/80">
                  New Adjusted Preparation Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={overrideCountInput}
                  onChange={(e) => setOverrideCountInput(Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/80">
                  Manager Justification / Audit Reason
                </label>
                <textarea
                  rows={3}
                  required
                  value={overrideReasonInput}
                  onChange={(e) => setOverrideReasonInput(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                  placeholder="e.g. Hostels committee sports trip departed today; reduced demand expected."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setOverrideModalForecast(null)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOverride}
                  className="rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
                >
                  {savingOverride ? 'Saving...' : 'Apply Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
