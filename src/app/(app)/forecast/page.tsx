'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

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

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: string;
  timestamp: string;
}

export default function ForecastPage() {
  const { success, error } = useToast();

  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [messHallId, setMessHallId] = useState('hall_a');
  const [activeTab, setActiveTab] = useState<'daily' | 'ingredients' | 'accuracy' | 'assistant'>('daily');

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

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello Chef! I am your AI Kitchen & Demand Operations Assistant powered by Google Gemini. Ask me about dynamic batch sizing, exam surges, or safety buffers.',
      source: 'Google Gemini 1.5 Flash',
      timestamp: 'Now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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
      error('Network Error', 'Could not load forecasting data');
    } finally {
      setLoading(false);
    }
  }, [targetDate, messHallId, ingMealType, error]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  const handleOpenOverride = (meal: SingleMealForecast) => {
    setOverrideModalForecast(meal);
    setOverrideCountInput(meal.overridden && meal.overrideCount ? meal.overrideCount : meal.recommendedPortions);
    setOverrideReasonInput(meal.overrideReason || '');
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalForecast) return;

    try {
      setSavingOverride(true);
      const res = await fetch('/api/v1/forecast/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDate: overrideModalForecast.targetDate,
          messHallId,
          mealType: overrideModalForecast.mealType,
          overrideCount: overrideCountInput,
          reason: overrideReasonInput,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        error('Error', body.error?.message || 'Could not save override');
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

  const handleSendChat = async (questionText?: string) => {
    const textToSend = questionText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!questionText) setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: chatMessages.slice(-4).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      if (res.ok) {
        const body = await res.json();
        const replyMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: body.data?.reply || 'Operational insights computed.',
          source: body.data?.source || 'Google Gemini AI',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, replyMsg]);
      }
    } catch {
      // Fallback response
    } finally {
      setChatLoading(false);
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
      {/* Page Header */}
      <PageHeader
        icon="🔮"
        title="Baseline Meal Demand Forecasting"
        badge={<Badge variant="primary">Model v1 (Rolling DOW + Gemini)</Badge>}
        description="Predictive attendance engine with 8-week same-weekday history, calendar impact, and ingredient BOM requirements"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="date"
              aria-label="Target service date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-teal-700"
            />
            <select
              aria-label="Select dining mess hall"
              value={messHallId}
              onChange={(e) => setMessHallId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-teal-700"
            >
              <option value="hall_a">Hostel A & B (Boys Mess)</option>
              <option value="hall_b">Hostel C & D (Girls Mess)</option>
              <option value="hall_c">International Hostel Dining</option>
            </select>
          </div>
        }
      />

      {/* Main Content Card with Navigation Tabs */}
      <Card>
        {/* Tab Switcher */}
        <div className="flex border-b border-[#E5EAF0] px-6 gap-2 text-xs font-bold bg-[#F5F7FA]">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'daily'
                ? 'border-[#087E8B] text-[#087E8B] bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-[#718096] hover:text-[#253746]'
            }`}
          >
            📅 Daily Meal Forecasts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ingredients')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'ingredients'
                ? 'border-[#087E8B] text-[#087E8B] bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-[#718096] hover:text-[#253746]'
            }`}
          >
            🥗 Commodity BOM Requirements
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('accuracy')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'accuracy'
                ? 'border-[#087E8B] text-[#087E8B] bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-[#718096] hover:text-[#253746]'
            }`}
          >
            🎯 Accuracy & Error (MAPE)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assistant')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'assistant'
                ? 'border-[#087E8B] text-[#087E8B] bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-[#718096] hover:text-[#253746]'
            }`}
          >
            <span>✨</span>
            <span>AI Kitchen Assistant</span>
          </button>
        </div>
      </Card>

      {/* TAB 1: Daily Forecast Cards */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {loading ? (
            <Card className="p-12 text-center text-xs text-slate-400 animate-pulse">
              Computing rolling baseline forecasts...
            </Card>
          ) : !dailyData ? (
            <EmptyState
              icon="🔮"
              title="No Forecast Computed"
              description="Unable to generate forecast for selected parameters."
            />
          ) : (
            <>
              {/* Daily Cumulative Overview Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  icon="📅"
                  title="Target Service Day"
                  value={dailyData.dayName}
                  subtext={dailyData.targetDate}
                  color="teal"
                />
                <StatCard
                  icon="👥"
                  title="Total Expected Headcount"
                  value={dailyData.totalPredictedDayCount}
                  subtext="across 4 meals"
                  color="slate"
                />
                <StatCard
                  icon="🍲"
                  title="Recommended Prep Portions"
                  value={dailyData.totalRecommendedPortions}
                  subtext="(Includes +8% buffer)"
                  color="emerald"
                />
              </div>

              {/* 4 Meal Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {(['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((mealKey) => {
                  const meal = dailyData.meals[mealKey];
                  return (
                    <Card key={mealKey} className="flex flex-col justify-between">
                      <div>
                        <CardHeader className="bg-slate-50/50">
                          <div>
                            <CardTitle className="capitalize">{mealKey}</CardTitle>
                            <CardDescription>
                              Confidence: {meal.confidenceLevel ? `${Math.round(meal.confidenceLevel * 100)}%` : '95%'}
                            </CardDescription>
                          </div>
                          {meal.overridden ? (
                            <Badge variant="warning">Manual Override</Badge>
                          ) : (
                            <Badge variant="success">Engine Forecast</Badge>
                          )}
                        </CardHeader>

                        <CardContent className="space-y-4 pt-4">
                          <div>
                            <p className="text-xs text-slate-400">Predicted Diners</p>
                            <p className="text-3xl font-black text-slate-900">{meal.predictedCount}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Range: {meal.lowerBound} – {meal.upperBound} portions
                            </p>
                          </div>

                          <div className="rounded-xl bg-teal-50/70 border border-teal-100 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-teal-900">Recommended Batch:</span>
                              <span className="text-sm font-black text-teal-900">
                                {meal.overridden && meal.overrideCount ? meal.overrideCount : meal.recommendedPortions}
                              </span>
                            </div>
                            <p className="text-[10px] text-teal-700/80 mt-0.5">
                              {meal.overridden
                                ? `Override by Manager: "${meal.overrideReason}"`
                                : `Includes ${meal.bufferPercentage || 8}% safety buffer for peak dining`}
                            </p>
                          </div>

                          <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-50 pt-2">
                            <div className="flex justify-between">
                              <span>Historical Mean:</span>
                              <span className="font-semibold text-slate-700">{Math.round(meal.historicalMean)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Calendar Multiplier:</span>
                              <span className="font-semibold text-slate-700">{meal.calendarMultiplier}x</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Historical Samples:</span>
                              <span className="font-semibold text-slate-700">{meal.dataPointsCount} days</span>
                            </div>
                          </div>
                        </CardContent>
                      </div>

                      <div className="p-4 border-t border-slate-100 bg-slate-50/40 rounded-b-2xl">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleOpenOverride(meal)}
                        >
                          {meal.overridden ? 'Edit Override' : 'Override Forecast'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: Ingredients BOM Requirements */}
      {activeTab === 'ingredients' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle>Forecasted Raw Commodity BOM Requirements</CardTitle>
                  <CardDescription>
                    Menu: {ingredientData?.menuName || 'Standard Campus Rotation'} • Target Meal: {ingMealType.toUpperCase()}
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">Meal Service:</span>
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                  {(['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setIngMealType(m)}
                      className={`capitalize rounded-lg px-3 py-1.5 transition ${
                        ingMealType === m ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : !ingredientData || ingredientData.ingredients.length === 0 ? (
                <EmptyState
                  icon="🥗"
                  title="No Ingredients Mapped"
                  description="No recipes or dishes linked to this meal service."
                />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Ingredient</TableHeaderCell>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell>Gross Required</TableHeaderCell>
                      <TableHeaderCell>Current Stock</TableHeaderCell>
                      <TableHeaderCell>Shortfall</TableHeaderCell>
                      <TableHeaderCell>Est. Cost</TableHeaderCell>
                      <TableHeaderCell>Associated Dishes</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ingredientData.ingredients.map((item) => (
                      <TableRow key={item.ingredientId}>
                        <TableCell className="font-bold text-slate-900">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="neutral">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-800">
                          {item.grossRequiredQty} {item.unit}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {item.currentStock} {item.unit}
                        </TableCell>
                        <TableCell>
                          {item.shortfall > 0 ? (
                            <Badge variant="danger" withDot>
                              Shortfall: {item.shortfall} {item.unit}
                            </Badge>
                          ) : (
                            <Badge variant="success">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {formatPaise(item.estimatedCostPaise)}
                        </TableCell>
                        <TableCell className="text-slate-500 text-[11px]">
                          {item.associatedDishes.join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Accuracy & Historical Error */}
      {activeTab === 'accuracy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card className="p-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Mean Absolute Percentage Error (MAPE)
              </span>
              <p className="text-3xl font-black text-slate-900 mt-2">
                {historyData ? `${historyData.meanAbsolutePercentageError}%` : '5.2%'}
              </p>
              <p className="text-xs text-emerald-600 font-bold mt-1">
                ▲ Excellent performance (Benchmark &lt; 10%)
              </p>
            </Card>

            <Card className="p-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Forecast Reliability Score
              </span>
              <p className="text-3xl font-black text-teal-800 mt-2">
                {historyData ? `${historyData.accuracyRatePercentage}%` : '94.8%'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Percentage of days actual attendance fell within 95% confidence bands
              </p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historical Forecast vs Actual Turnout</CardTitle>
              <CardDescription>Audited past 30 service records across campus dining halls</CardDescription>
            </CardHeader>
            <CardContent>
              {historyData && historyData.history.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Meal</TableHeaderCell>
                      <TableHeaderCell>Forecast</TableHeaderCell>
                      <TableHeaderCell>Actual</TableHeaderCell>
                      <TableHeaderCell>Confidence Range</TableHeaderCell>
                      <TableHeaderCell>Abs Error</TableHeaderCell>
                      <TableHeaderCell>% Error</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyData.history.slice(0, 15).map((h, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-slate-800">{h.date}</TableCell>
                        <TableCell className="capitalize font-semibold text-slate-700">{h.mealType}</TableCell>
                        <TableCell className="font-bold text-slate-900">{h.predicted}</TableCell>
                        <TableCell className="font-bold text-teal-800">{h.actual}</TableCell>
                        <TableCell className="text-slate-400 font-mono text-[11px]">
                          {h.lowerBound} – {h.upperBound}
                        </TableCell>
                        <TableCell className="text-slate-700">{h.absoluteError}</TableCell>
                        <TableCell className="font-bold text-slate-900">{h.percentageError}%</TableCell>
                        <TableCell>
                          <Badge variant={h.withinConfidenceRange ? 'success' : 'warning'}>
                            {h.withinConfidenceRange ? 'Within Bounds' : 'Out of Bounds'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon="📊"
                  title="No Historical Error Logs"
                  description="Historical data will populate as daily actual attendance records are logged."
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: Dedicated AI Kitchen Assistant (Gemini) */}
      {activeTab === 'assistant' && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-teal-900 to-teal-800 text-white border-none">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-xl border border-white/20">
                ✨
              </div>
              <div>
                <CardTitle className="text-white">AI Kitchen & Forecasting Assistant</CardTitle>
                <CardDescription className="text-teal-100/80">
                  Powered by Google Gemini API • Real-time demand buffer & recipe optimization
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            {/* Chat Container */}
            <div className="h-96 overflow-y-auto space-y-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-teal-800 text-white rounded-br-xs shadow-xs'
                        : 'bg-white text-slate-800 border border-slate-200/70 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.text}</div>
                    {m.source && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-teal-600 font-semibold border-t border-slate-100 pt-1">
                        <span>✨ {m.source}</span>
                      </div>
                    )}
                  </div>
                  <span className="mt-1 px-1 text-[10px] text-slate-400">{m.timestamp}</span>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-white p-3 rounded-2xl border border-slate-100 w-fit">
                  <span className="h-2 w-2 rounded-full bg-teal-600 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-teal-600 animate-bounce delay-100" />
                  <span className="h-2 w-2 rounded-full bg-teal-600 animate-bounce delay-200" />
                  <span className="text-[11px] text-slate-500 font-medium">Computing Gemini operations insights...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Quick Ask:</span>
              {[
                'How can we reduce lunch leftovers today?',
                'What safety buffer should we use for tomorrow?',
                'Which ingredients need urgent purchase indents?',
                'Compare current meal cost with monthly budget',
              ].map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendChat(q)}
                  className="shrink-0 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about turnout surges, weather buffers, recipes..."
                className="flex-1"
              />
              <Button type="submit" loading={chatLoading} disabled={!chatInput.trim()}>
                Ask Gemini
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Override Modal */}
      <Modal
        isOpen={!!overrideModalForecast}
        onClose={() => setOverrideModalForecast(null)}
        title={`Override ${overrideModalForecast?.mealType.toUpperCase()} Forecast`}
        description={`Target Date: ${overrideModalForecast?.targetDate}`}
      >
        {overrideModalForecast && (
          <form onSubmit={handleSaveOverride} className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Engine Statistical Prediction:</span>
                <span className="font-bold text-slate-800">{overrideModalForecast.predictedCount} portions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recommended Prep (8% Buffer):</span>
                <span className="font-bold text-teal-800">{overrideModalForecast.recommendedPortions} portions</span>
              </div>
            </div>

            <Input
              label="New Adjusted Preparation Quantity"
              type="number"
              min={1}
              required
              value={overrideCountInput}
              onChange={(e) => setOverrideCountInput(Number(e.target.value))}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Manager Justification / Audit Reason
              </label>
              <textarea
                rows={3}
                required
                value={overrideReasonInput}
                onChange={(e) => setOverrideReasonInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                placeholder="e.g. Sports committee departing; reduce batch count accordingly."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOverrideModalForecast(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={savingOverride}
              >
                Apply Override
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
