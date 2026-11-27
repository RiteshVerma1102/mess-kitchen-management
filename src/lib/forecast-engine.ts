/**
 * FoodFlow Pro Max - Mathematical Demand Forecasting Engine
 * Real prediction algorithm with DOW seasonality, calendar multipliers,
 * active residency fallback, safety buffers, and MAPE accuracy evaluation.
 */

export interface HistoricalRecord {
  serviceDate: string;
  mealType: "breakfast" | "lunch" | "snacks" | "dinner";
  actualCount: number;
}

export interface CalendarEventImpact {
  title: string;
  type: "exam" | "holiday" | "festival" | "event" | "vacation";
  impactFactor: number;
}

export interface MealForecastOutput {
  targetDate: string;
  mealType: "breakfast" | "lunch" | "snacks" | "dinner";
  predictedCount: number;
  lowerBound: number;
  upperBound: number;
  confidenceScore: number; // 0 to 100
  bufferPercentage: number;
  recommendedPortions: number;
  factors: {
    baseCount: number;
    dowFactor: number;
    calendarMultiplier: number;
    historicalDataPoints: number;
    turnoutPercentage: number;
  };
  explanation: string;
}

const DEFAULT_BUFFER_PERCENTAGE = 8; // 8% kitchen safety buffer

const DEFAULT_TURNOUT_RATIOS: Record<string, number> = {
  breakfast: 0.68,
  lunch: 0.88,
  dinner: 0.84,
  snacks: 0.42,
};

/**
 * Calculates single meal demand forecast based on empirical consumption history
 */
export function calculateMealForecast(params: {
  targetDate: string;
  mealType: "breakfast" | "lunch" | "snacks" | "dinner";
  enrolledStudentsCount: number;
  historicalRecords: HistoricalRecord[];
  eventsOnDate?: CalendarEventImpact[];
  bufferPercent?: number;
}): MealForecastOutput {
  const {
    targetDate,
    mealType,
    enrolledStudentsCount,
    historicalRecords,
    eventsOnDate = [],
    bufferPercent = DEFAULT_BUFFER_PERCENTAGE,
  } = params;

  const targetDateObj = new Date(targetDate.includes("T") ? targetDate : `${targetDate}T12:00:00Z`);
  const targetDow = targetDateObj.getUTCDay(); // 0 = Sun ... 6 = Sat
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // 1. Filter historical records for same day of week & meal type
  const matchingHistory = historicalRecords.filter((rec) => {
    if (rec.mealType !== mealType) return false;
    const d = new Date(
      rec.serviceDate.includes("T") ? rec.serviceDate : `${rec.serviceDate}T12:00:00Z`,
    );
    return d.getUTCDay() === targetDow && rec.actualCount > 0;
  });

  const counts = matchingHistory.map((h) => h.actualCount);

  let baseCount = 0;
  let stdDev = 0;
  let confidenceScore = 60;
  let explanation = "";

  if (counts.length >= 2) {
    // True sample mean and sample standard deviation
    const sum = counts.reduce((acc, c) => acc + c, 0);
    baseCount = Math.round(sum / counts.length);

    const variance =
      counts.reduce((acc, c) => acc + Math.pow(c - baseCount, 2), 0) / (counts.length - 1);
    stdDev = Math.round(Math.sqrt(variance));
    confidenceScore = Math.min(95, 70 + counts.length * 4);
    explanation = `Derived from ${counts.length} matching ${dayNames[targetDow]} services in recent weeks (mean: ${baseCount}, std dev: ±${stdDev}).`;
  } else if (counts.length === 1) {
    baseCount = counts[0] ?? 0;
    stdDev = Math.round(baseCount * 0.1);
    confidenceScore = 70;
    explanation = `Estimated from 1 previous ${dayNames[targetDow]} record (${baseCount} servings) with standard variance.`;
  } else {
    // Baseline turnout ratio based on registered students
    const ratio = DEFAULT_TURNOUT_RATIOS[mealType] || 0.75;
    const enrolled = enrolledStudentsCount > 0 ? enrolledStudentsCount : 320;
    baseCount = Math.round(enrolled * ratio);
    stdDev = Math.round(baseCount * 0.12);
    confidenceScore = 65;
    explanation = `Baseline estimate for ${enrolled} registered students with standard ${Math.round(ratio * 100)}% ${mealType} attendance ratio.`;
  }

  // 2. Apply calendar event impact factor
  let calendarMultiplier = 1.0;
  const eventNotes: string[] = [];

  for (const ev of eventsOnDate) {
    if (ev.impactFactor > 0) {
      calendarMultiplier *= ev.impactFactor;
      eventNotes.push(`${ev.title} (${ev.type}: ${Math.round((ev.impactFactor - 1) * 100)}%)`);
    }
  }

  const rawPredicted = Math.round(baseCount * calendarMultiplier);
  const predictedCount = Math.max(10, rawPredicted);
  const bufferPortions = Math.round(predictedCount * (bufferPercent / 100));
  const recommendedPortions = predictedCount + bufferPortions;

  const lowerBound = Math.max(
    0,
    Math.round(predictedCount - Math.max(stdDev, predictedCount * 0.08)),
  );
  const upperBound = Math.round(predictedCount + Math.max(stdDev, predictedCount * 0.08));

  if (eventNotes.length > 0) {
    explanation += ` Adjusted for: ${eventNotes.join(", ")}.`;
  }

  return {
    targetDate,
    mealType,
    predictedCount,
    lowerBound,
    upperBound,
    confidenceScore,
    bufferPercentage: bufferPercent,
    recommendedPortions,
    factors: {
      baseCount,
      dowFactor: targetDow,
      calendarMultiplier,
      historicalDataPoints: counts.length,
      turnoutPercentage: Math.round(
        (predictedCount / Math.max(1, enrolledStudentsCount || 300)) * 100,
      ),
    },
    explanation,
  };
}

/**
 * Calculates Mean Absolute Percentage Error (MAPE) and accuracy rate for past predictions
 */
export function calculateForecastAccuracy(pairs: Array<{ predicted: number; actual: number }>): {
  mape: number;
  accuracyRate: number;
} {
  if (!pairs.length) return { mape: 0, accuracyRate: 100 };

  let totalApe = 0;
  let withinToleranceCount = 0;

  for (const p of pairs) {
    if (p.actual <= 0) continue;
    const absDiff = Math.abs(p.predicted - p.actual);
    const ape = (absDiff / p.actual) * 100;
    totalApe += ape;
    if (ape <= 10.0) {
      withinToleranceCount++; // Within ±10% margin of error
    }
  }

  const mape = Math.round((totalApe / pairs.length) * 10) / 10;
  const accuracyRate = Math.round((withinToleranceCount / pairs.length) * 100);

  return { mape, accuracyRate };
}
