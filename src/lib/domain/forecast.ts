/**
 * Demand forecast for one meal (+hall) on one date.
 * predicted = weighted moving average × weekday seasonality × trend × calendar impact − approved leaves
 */
export const FORECAST_MODEL_VERSION = "wma-season-v1";

export interface DayActual {
  date: string; // YYYY-MM-DD
  served: number;
}

export interface CalendarImpact {
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive
  impactFactor: number; // 1 = normal, 0.6 = 40% fewer diners, 1.2 = 20% more
}

export interface ForecastInput {
  targetDate: string;
  history: DayActual[];
  calendar?: CalendarImpact[];
  approvedLeaves?: number;
  activeStudents?: number;
}

export interface ForecastFactors {
  base: number;
  weekday: number;
  trend: number;
  calendar: number;
  leaves: number;
  samples: number;
}

export interface ForecastResult {
  predicted: number;
  confidence: number; // 0..1
  factors: ForecastFactors;
  modelVersion: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const weekdayOf = (key: string) => new Date(`${key}T00:00:00Z`).getUTCDay();
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function calendarFactorFor(date: string, calendar: CalendarImpact[] = []): number {
  return calendar
    .filter((e) => e.start <= date && date <= e.end)
    .reduce((f, e) => f * clamp(e.impactFactor, 0, 3), 1);
}

export function forecastDemand(input: ForecastInput): ForecastResult {
  const { targetDate, calendar = [], approvedLeaves = 0, activeStudents } = input;

  // Only past days, newest first, last 28 days of data; de-seasonalise calendar effects.
  const history = input.history
    .filter((h) => h.date < targetDate && Number.isFinite(h.served) && h.served >= 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 28)
    .map((h) => {
      const cf = calendarFactorFor(h.date, calendar);
      return { ...h, normal: cf > 0 ? h.served / cf : h.served };
    });

  const calendar_ = calendarFactorFor(targetDate, calendar);

  if (history.length === 0) {
    const fallback = activeStudents
      ? Math.max(0, Math.round(activeStudents * calendar_ - approvedLeaves))
      : 0;
    return {
      predicted: fallback,
      confidence: 0,
      factors: {
        base: activeStudents ?? 0,
        weekday: 1,
        trend: 1,
        calendar: calendar_,
        leaves: approvedLeaves,
        samples: 0,
      },
      modelVersion: FORECAST_MODEL_VERSION,
    };
  }

  // Weighted moving average over the latest 14 days (newest weight highest).
  const recent = history.slice(0, 14);
  let wSum = 0;
  let vSum = 0;
  recent.forEach((h, i) => {
    const w = recent.length - i;
    wSum += w;
    vSum += w * h.normal;
  });
  const overall = mean(history.map((h) => h.normal));
  const recentWeekdayMix = mean(recent.map((h) => weekdayRatio(h.date)));
  const base = vSum / wSum / (recentWeekdayMix || 1);

  function weekdayRatio(date: string): number {
    const wd = weekdayOf(date);
    const same = history.filter((h) => weekdayOf(h.date) === wd).map((h) => h.normal);
    if (same.length < 2 || overall <= 0) return 1;
    return clamp(mean(same) / overall, 0.4, 1.6);
  }

  const weekday = weekdayRatio(targetDate);

  // Trend: last 7 vs previous 7, damped by half, capped at ±10%.
  let trend = 1;
  if (history.length >= 14) {
    const last = mean(history.slice(0, 7).map((h) => h.normal));
    const prev = mean(history.slice(7, 14).map((h) => h.normal));
    if (prev > 0) trend = clamp(1 + (last / prev - 1) * 0.5, 0.9, 1.1);
  }

  let predicted = base * weekday * trend * calendar_ - approvedLeaves;
  if (activeStudents !== undefined) predicted = Math.min(predicted, activeStudents);
  predicted = Math.max(0, Math.round(predicted));

  // Confidence: more samples and steadier (lower CV after weekday adjustment) → higher.
  const adjusted = history.map((h) => h.normal / weekdayRatio(h.date));
  const m = mean(adjusted);
  const sd = Math.sqrt(mean(adjusted.map((x) => (x - m) ** 2)));
  const cv = m > 0 ? sd / m : 1;
  const sampleScore = Math.min(1, history.length / 14);
  const confidence = Math.round(clamp((1 - cv) * sampleScore, 0.05, 0.98) * 100) / 100;

  return {
    predicted,
    confidence,
    factors: {
      base: Math.round(base * 10) / 10,
      weekday: Math.round(weekday * 1000) / 1000,
      trend: Math.round(trend * 1000) / 1000,
      calendar: calendar_,
      leaves: approvedLeaves,
      samples: history.length,
    },
    modelVersion: FORECAST_MODEL_VERSION,
  };
}

/** Mean absolute percentage error as a fraction; pairs with actual = 0 are skipped. */
export function mape(pairs: { actual: number; predicted: number }[]): number {
  const valid = pairs.filter((p) => p.actual > 0);
  if (!valid.length) return 0;
  return mean(valid.map((p) => Math.abs(p.actual - p.predicted) / p.actual));
}
