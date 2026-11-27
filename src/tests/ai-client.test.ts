import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDataAwareAskFallback,
  buildSanitizedMessSummary,
  clearAiClientCacheForTests,
  computeFeedbackSummaryFromSummary,
  computeMenuSuggestionsFromSummary,
  computeTomorrowDemandBreakdown,
  computeWasteTipsFromSummary,
  getAiUsageToday,
  requestAskFoodFlowChat,
  requestDemandForecastAI,
  requestInsightsAI,
  stripPiiText,
} from "@/lib/ai-client";
import { TRANSLATIONS } from "@/lib/i18n";

describe("FoodFlow Free-Tier AI Client, Sanitizer & Fallbacks", () => {
  beforeEach(() => {
    clearAiClientCacheForTests();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("strips phone numbers and email addresses from text and mess summaries", () => {
    expect(stripPiiText("Call +91 9876543210 or email chef@hostel.edu.in")).toBe(
      "Call [redacted-phone] or email [redacted-email]",
    );

    const summary = buildSanitizedMessSummary({
      lang: "en",
      inventoryItems: [
        {
          id: "inv-1",
          name: "Fresh Paneer 9876543210",
          category: "Dairy",
          quantity: 4,
          unit: "kg",
          minimum_quantity: 10,
          unit_cost: 340,
          supplier_name: "Dairy Corp",
          expiry_date: "2026-11-27",
        },
      ],
      rows: [
        {
          id: "stu-1",
          student_code: "HOSTEL-991",
          name: "Aarav Sharma",
          phone: "9898989898",
          email: "aarav@campus.edu",
          status: "Active",
        },
        {
          id: "w-1",
          dish_name: "Dal Tadka",
          prepared_quantity: 100,
          served_quantity: 90,
          wasted_quantity: 10,
          waste_cost: 650,
          reason: "Overcooked call 9123456789",
        },
      ],
      invoices: [
        {
          id: "inv-b1",
          workspaceId: "ws-1",
          studentCode: "HOSTEL-991",
          studentName: "Aarav Sharma",
          monthKey: "2026-11",
          baseProratedPaise: 420000,
          leaveRebatePaise: 20000,
          guestChargesPaise: 0,
          gstPaise: 20000,
          totalPayablePaise: 420000,
          paidPaise: 200000,
          status: "partial",
          createdBy: "uid-secret-1",
        },
      ],
      payments: [
        {
          id: "pay-1",
          workspaceId: "ws-1",
          invoiceId: "inv-b1",
          studentName: "Aarav Sharma",
          amountPaise: 200000,
          method: "upi",
          referenceNo: "UPI-SECRET-99",
          paidAt: "2026-11-20",
          createdBy: "uid-secret-1",
        },
      ],
      feedbackList: [
        {
          id: "fb-1",
          workspaceId: "ws-1",
          userId: "uid-secret-2",
          studentName: "Priya Nair",
          mealType: "Dinner",
          serviceDate: "2026-11-25",
          rating: 2,
          category: "taste",
          comment: "Contact priya@campus.edu for details",
          status: "open",
          createdBy: "uid-secret-2",
        },
      ],
    });

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("Aarav");
    expect(serialized).not.toContain("Priya");
    expect(serialized).not.toContain("HOSTEL-991");
    expect(serialized).not.toContain("9876543210");
    expect(serialized).not.toContain("9898989898");
    expect(serialized).not.toContain("9123456789");
    expect(serialized).not.toContain("aarav@campus.edu");
    expect(serialized).not.toContain("priya@campus.edu");
    expect(serialized).not.toContain("uid-secret");
    expect(summary.billing.totalBilledRupees).toBe(4200);
    expect(summary.billing.pendingRupees).toBe(2200);
    expect(summary.stock.lowStockCount).toBe(1);
    expect(summary.waste.totalWastedKg).toBe(10);
  });

  it("computes deterministic tomorrow demand breakdown using attendance, weekday, holiday, and weather", () => {
    const rainyWeekday = computeTomorrowDemandBreakdown({
      targetDate: "2026-11-27",
      weekdayName: "Friday",
      lang: "en",
      activeStudentsCount: 300,
      pastAttendanceAvg: 280,
      tomorrowSkipsCount: 15,
      guestCount: 5,
      holidayFactor: 1.0,
      holidayNote: "Regular academic day",
      weatherMultiplier: 1.08,
      weatherCondition: "Heavy Rain",
    });

    const sunnyHolidayWeekend = computeTomorrowDemandBreakdown({
      targetDate: "2026-11-28",
      weekdayName: "Saturday",
      lang: "en",
      activeStudentsCount: 300,
      pastAttendanceAvg: 280,
      tomorrowSkipsCount: 15,
      guestCount: 5,
      holidayFactor: 0.7,
      holidayNote: "Campus Holiday",
      weatherMultiplier: 1.0,
      weatherCondition: "Clear",
    });

    expect(rainyWeekday.lunchPortions).toBeGreaterThan(sunnyHolidayWeekend.lunchPortions);
    expect(rainyWeekday.breakfastPortions).toBeGreaterThan(0);
    expect(rainyWeekday.dinnerPortions).toBeGreaterThan(0);
    expect(rainyWeekday.rationale).toContain("Friday");
  });

  it("falls back cleanly to formulas when Gemini returns 429 quota exceeded and tracks usage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "QUOTA_EXCEEDED", error: "Quota exceeded" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      }),
    );

    const forecast = await requestDemandForecastAI({
      targetDate: "2026-11-27",
      weekdayName: "Friday",
      lang: "en",
      activeStudentsCount: 250,
      pastAttendanceAvg: 220,
      tomorrowSkipsCount: 10,
      guestCount: 0,
      holidayFactor: 1,
      holidayNote: "Regular",
      weatherTempMaxC: 29,
      weatherRainMm: 4,
      weatherCondition: "Light Rain",
      weatherMultiplier: 1.04,
    });

    expect(forecast.source).toBe("formula-fallback");
    expect(forecast.notice).toContain("Quota exceeded");
    expect(forecast.lunchPortions).toBeGreaterThan(150);

    const usage = getAiUsageToday();
    expect(usage.formulaFallbacksToday).toBe(1);
    expect(usage.lastStatus).toBe("quota_fallback");
  });

  it("caches successful Gemini responses and avoids duplicate API calls", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          reply: "Low stock items: Paneer (4 kg). Pending bills: ₹2,200.",
          model: "gemini-3.1-flash-lite",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const summary = buildSanitizedMessSummary({
      lang: "en",
      inventoryItems: [],
      rows: [],
      invoices: [],
      payments: [],
      feedbackList: [],
    });

    const first = await requestAskFoodFlowChat({
      model: "gemini-3.1-flash-lite",
      persona: "kitchen_copilot",
      message: "Summarize stock and bills",
      history: [],
      messSummary: summary,
    });
    const second = await requestAskFoodFlowChat({
      model: "gemini-3.1-flash-lite",
      persona: "kitchen_copilot",
      message: "Summarize stock and bills",
      history: [],
      messSummary: summary,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.source).toBe("gemini");
    expect(second.source).toBe("cache");

    const usage = getAiUsageToday();
    expect(usage.apiCallsToday).toBe(1);
    expect(usage.cachedHitsToday).toBe(1);
  });

  it("generates menu suggestions, waste tips, and data-aware Ask FoodFlow answers offline", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline"));

    const summary = buildSanitizedMessSummary({
      lang: "hi",
      inventoryItems: [
        {
          id: "inv-1",
          name: "दही (Curd)",
          category: "Dairy",
          quantity: 6,
          unit: "kg",
          minimum_quantity: 5,
          unit_cost: 60,
          supplier_name: "Dairy",
          expiry_date: "2026-11-26",
        },
      ],
      rows: [
        {
          id: "w-1",
          dish_name: "दाल तड़का",
          prepared_quantity: 100,
          served_quantity: 85,
          wasted_quantity: 15,
          waste_cost: 900,
          reason: "Leftover",
        },
      ],
      invoices: [],
      payments: [],
      feedbackList: [],
    });

    const menuFormula = computeMenuSuggestionsFromSummary(summary);
    const wasteFormula = computeWasteTipsFromSummary(summary);
    const menuRes = await requestInsightsAI({ kind: "menu_suggestions", summary });
    const wasteRes = await requestInsightsAI({ kind: "waste_tips", summary });
    const localReply = buildDataAwareAskFallback("अपव्यय बताएं", summary);

    expect(menuFormula.tips[0]).toContain("FEFO");
    expect(wasteFormula.tips[0]).toContain("दाल तड़का");
    expect(menuRes.source).toBe("formula-fallback");
    expect(menuRes.tips[0]).toContain("FEFO");
    expect(wasteRes.source).toBe("formula-fallback");
    expect(wasteRes.tips[0]).toContain("दाल तड़का");
    expect(localReply).toContain("15 kg");

    // Verify EN/HI AI translation parity
    expect(Object.keys(TRANSLATIONS.en.ai).sort()).toEqual(Object.keys(TRANSLATIONS.hi.ai).sort());
  });

  it("aggregates feedback topics, builds feedback_summary fallback offline, and maintains EN/HI ops & checklist parity", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline"));

    const summary = buildSanitizedMessSummary({
      lang: "en",
      inventoryItems: [],
      rows: [],
      invoices: [],
      payments: [],
      feedbackList: [
        {
          id: "fb-1",
          workspaceId: "ws-1",
          userId: "u-1",
          studentName: "Riya",
          mealType: "Lunch",
          serviceDate: "2026-11-26",
          rating: 2,
          category: "hygiene",
          tags: ["hygiene", "temperature"],
          comment: "Counter needed cleaning",
          status: "open",
          createdBy: "u-1",
        },
        {
          id: "fb-2",
          workspaceId: "ws-1",
          userId: "u-2",
          studentName: "Karan",
          mealType: "Dinner",
          serviceDate: "2026-11-26",
          rating: 5,
          category: "taste",
          tags: ["taste", "freshness"],
          comment: "Hot dal and crisp rotis",
          status: "resolved",
          createdBy: "u-2",
        },
      ],
    });

    expect(summary.ratings.topicCounts?.some((t) => t.topic === "hygiene")).toBe(true);
    expect(summary.ratings.topicCounts?.some((t) => t.topic === "temperature")).toBe(true);

    const fbFormula = computeFeedbackSummaryFromSummary(summary);
    const fbRes = await requestInsightsAI({ kind: "feedback_summary", summary });

    expect(fbFormula.tips.length).toBeGreaterThan(0);
    expect(fbFormula.highlightMetric).toContain("Total reviews: 2");
    expect(fbRes.source).toBe("formula-fallback");
    expect(fbRes.tips.some((tip) => tip.includes("hygiene"))).toBe(true);

    expect(Object.keys(TRANSLATIONS.en.checklist).sort()).toEqual(
      Object.keys(TRANSLATIONS.hi.checklist).sort(),
    );
    expect(Object.keys(TRANSLATIONS.en.ops).sort()).toEqual(
      Object.keys(TRANSLATIONS.hi.ops).sort(),
    );
  });
});
