import { describe, expect, it } from "vitest";
import {
  calculateForecastAccuracy,
  calculateMealForecast,
  type HistoricalRecord,
} from "../lib/forecast-engine";

describe("calculateMealForecast", () => {
  it("calculates accurate mean from historical day-of-week services", () => {
    // 2026-11-19 is a Thursday
    const history: HistoricalRecord[] = [
      { serviceDate: "2026-11-12", mealType: "lunch", actualCount: 400 },
      { serviceDate: "2026-11-05", mealType: "lunch", actualCount: 420 },
      { serviceDate: "2026-10-29", mealType: "lunch", actualCount: 410 },
    ];

    const result = calculateMealForecast({
      targetDate: "2026-11-19",
      mealType: "lunch",
      enrolledStudentsCount: 500,
      historicalRecords: history,
      bufferPercent: 8,
    });

    // Mean is 410. With 8% buffer, recommended portions is 410 + round(410 * 0.08) = 410 + 33 = 443
    expect(result.predictedCount).toBe(410);
    expect(result.recommendedPortions).toBe(443);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(75);
    expect(result.lowerBound).toBeLessThanOrEqual(410);
    expect(result.upperBound).toBeGreaterThanOrEqual(410);
  });

  it("applies calendar event multiplier for exams and festivals", () => {
    const history: HistoricalRecord[] = [
      { serviceDate: "2026-11-12", mealType: "lunch", actualCount: 400 },
      { serviceDate: "2026-11-05", mealType: "lunch", actualCount: 400 },
    ];

    const result = calculateMealForecast({
      targetDate: "2026-11-19",
      mealType: "lunch",
      enrolledStudentsCount: 500,
      historicalRecords: history,
      eventsOnDate: [{ title: "Mid-Term Examination", type: "exam", impactFactor: 1.15 }],
      bufferPercent: 5,
    });

    // 400 * 1.15 = 460
    expect(result.predictedCount).toBe(460);
    expect(result.explanation).toContain("Mid-Term Examination");
  });

  it("uses turnout ratio fallback when no historical records exist", () => {
    const result = calculateMealForecast({
      targetDate: "2026-11-20",
      mealType: "breakfast",
      enrolledStudentsCount: 400,
      historicalRecords: [],
    });

    // 400 * 0.68 turnout = 272
    expect(result.predictedCount).toBe(272);
    expect(result.explanation).toContain("registered students");
  });
});

describe("calculateForecastAccuracy (MAPE)", () => {
  it("computes Mean Absolute Percentage Error correctly", () => {
    const pairs = [
      { predicted: 100, actual: 100 }, // 0%
      { predicted: 110, actual: 100 }, // 10%
      { predicted: 90, actual: 100 }, // 10%
    ];

    const { mape, accuracyRate } = calculateForecastAccuracy(pairs);
    expect(mape).toBeCloseTo(6.7, 1);
    expect(accuracyRate).toBe(100); // All pairs within ±10% margin
  });
});
