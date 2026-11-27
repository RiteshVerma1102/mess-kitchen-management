import { useEffect, useState } from "react";
import type {
  FeedbackDoc,
  InvoiceDoc,
  PaymentDoc,
  SupportedLanguage,
} from "@/lib/domain/workspace-types";
import type { DemoInventoryItem } from "@/lib/foodflow-data";
import { rowNumber, rowText, shiftDateKey, type FoodFlowRow } from "@/lib/foodflow-models";

const AI_CACHE_PREFIX = "foodflow_ai_cache_v1:";
const AI_USAGE_STORAGE_KEY = "foodflow_ai_usage_v1";
const AI_USAGE_EVENT = "foodflow-ai-usage-updated";
const DEFAULT_CLIENT_TTL_MS = 10 * 60 * 1000;

const memoryCache = new Map<string, { expiresAt: number; data: unknown }>();
const inflightRequests = new Map<string, Promise<unknown>>();

export interface SanitizedMessSummary {
  lang: SupportedLanguage;
  stock: {
    totalItems: number;
    lowStockCount: number;
    expiringSoonCount: number;
    topLowStock: { name: string; qty: number; min: number; unit: string }[];
    topExpiring: { name: string; qty: number; unit: string; expiryDate: string }[];
  };
  menu: {
    todayMenus: { mealType: string; title: string; expectedServings: number }[];
    recipeCount: number;
    avgRecipeCostRupees: number;
    topCostEffectiveRecipes: { name: string; costRupees: number }[];
  };
  billing: {
    invoiceCount: number;
    unpaidCount: number;
    totalBilledRupees: number;
    totalCollectedRupees: number;
    pendingRupees: number;
  };
  waste: {
    logCount: number;
    totalPreparedKg: number;
    totalWastedKg: number;
    totalWasteCostRupees: number;
    wastePct: number;
    topWastedDishes: { dishName: string; wastedKg: number; wastePct: number; reason: string }[];
  };
  ratings: {
    feedbackCount: number;
    avgRating: number;
    lowRatedMeals: { mealType: string; rating: number; category: string }[];
    topicCounts?: { topic: string; count: number; avgRating: number }[];
    openComplaintsCount?: number;
  };
  operations: {
    activeStudentsCount: number;
    pastAttendanceAvg: number;
    upcomingHolidays: { date: string; title: string; attendanceFactor: number }[];
  };
}

export interface AiUsageToday {
  dateKey: string;
  apiCallsToday: number;
  cachedHitsToday: number;
  formulaFallbacksToday: number;
  lastModel: string | null;
  lastStatus: "ok" | "quota_fallback" | "offline_fallback" | null;
}

export interface TomorrowDemandBreakdown {
  targetDate: string;
  weekdayName: string;
  breakfastPortions: number;
  lunchPortions: number;
  snacksPortions: number;
  dinnerPortions: number;
  confidence: number;
  rationale: string;
  source: "gemini" | "cache" | "formula-fallback";
  notice?: string;
}

export interface InsightsResponse {
  tips: string[];
  highlightMetric: string;
  source: "gemini" | "cache" | "formula-fallback";
  notice?: string;
}

export function getIstDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Strips any accidental emails or Indian phone numbers from strings before AI serialization. */
export function stripPiiText(raw: string): string {
  return raw
    .replaceAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replaceAll(/(?:\+91[\s-]?)?[6-9]\d{9}\b/g, "[redacted-phone]")
    .trim();
}

export function buildSanitizedMessSummary(params: {
  lang: SupportedLanguage;
  inventoryItems: DemoInventoryItem[];
  rows: FoodFlowRow[];
  invoices: InvoiceDoc[];
  payments: PaymentDoc[];
  feedbackList: FeedbackDoc[];
}): SanitizedMessSummary {
  const { lang, inventoryItems, rows, invoices, payments, feedbackList } = params;
  const today = shiftDateKey(0);
  const cutoff72h = shiftDateKey(3);

  const lowStock = inventoryItems.filter((i) => i.quantity <= i.minimum_quantity);
  const expiringSoon = inventoryItems.filter((i) => i.expiry_date && i.expiry_date <= cutoff72h);

  const menusToday = rows.filter(
    (r) => typeof r.title === "string" && rowText(r, "service_date") === today,
  );
  const recipes = rows.filter(
    (r) => typeof r.name === "string" && r.cost_per_serving !== undefined,
  );
  const avgRecipeCostRupees = recipes.length
    ? Math.round(recipes.reduce((s, r) => s + rowNumber(r, "cost_per_serving"), 0) / recipes.length)
    : 0;

  const wasteLogs = rows.filter(
    (r) => typeof r.dish_name === "string" && r.wasted_quantity !== undefined,
  );
  const totalPreparedKg = Number(
    wasteLogs.reduce((s, r) => s + rowNumber(r, "prepared_quantity"), 0).toFixed(1),
  );
  const totalWastedKg = Number(
    wasteLogs.reduce((s, r) => s + rowNumber(r, "wasted_quantity"), 0).toFixed(1),
  );
  const totalWasteCostRupees = Math.round(
    wasteLogs.reduce((s, r) => s + rowNumber(r, "waste_cost"), 0),
  );
  const wastePct =
    totalPreparedKg > 0 ? Number(((totalWastedKg / totalPreparedKg) * 100).toFixed(1)) : 0;

  const totalBilledRupees = Math.round(
    invoices.reduce((s, inv) => s + inv.totalPayablePaise, 0) / 100,
  );
  const totalCollectedRupees = Math.round(payments.reduce((s, p) => s + p.amountPaise, 0) / 100);
  const pendingRupees = Math.max(0, totalBilledRupees - totalCollectedRupees);
  const unpaidCount = invoices.filter((i) => i.status !== "paid").length;

  const visibleFeedback = feedbackList.filter((f) => f.moderationStatus !== "hidden");
  const avgRating = visibleFeedback.length
    ? Number(
        (visibleFeedback.reduce((s, f) => s + f.rating, 0) / visibleFeedback.length).toFixed(1),
      )
    : 0;

  const topicBuckets = new Map<string, { sum: number; count: number }>();
  for (const fb of visibleFeedback) {
    const tKey = fb.category || "other";
    const cur = topicBuckets.get(tKey) ?? { sum: 0, count: 0 };
    topicBuckets.set(tKey, { sum: cur.sum + fb.rating, count: cur.count + 1 });
    for (const tag of fb.tags ?? []) {
      const cleanTag = stripPiiText(tag).toLowerCase().slice(0, 24);
      if (!cleanTag || cleanTag === tKey) continue;
      const tCur = topicBuckets.get(cleanTag) ?? { sum: 0, count: 0 };
      topicBuckets.set(cleanTag, { sum: tCur.sum + fb.rating, count: tCur.count + 1 });
    }
  }
  const topicCounts = [...topicBuckets.entries()]
    .map(([topic, agg]) => ({
      topic,
      count: agg.count,
      avgRating: Number((agg.sum / agg.count).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const activeStudentsCount = rows.filter(
    (r) => typeof r.student_code === "string" && rowText(r, "status") === "Active",
  ).length;
  const attendanceRows = rows.filter(
    (r) => typeof r.student_code === "string" && typeof r.served_at === "string",
  );
  const actualRows = rows.filter(
    (r) => typeof r.service_date === "string" && r.served_quantity !== undefined,
  );
  const pastAttendanceAvg = actualRows.length
    ? Math.round(
        actualRows.reduce((s, r) => s + rowNumber(r, "served_quantity"), 0) / actualRows.length,
      )
    : attendanceRows.length;

  const events = rows
    .filter((r) => typeof r.event_date === "string" && rowText(r, "event_date") >= today)
    .slice(0, 4);

  return {
    lang,
    stock: {
      totalItems: inventoryItems.length,
      lowStockCount: lowStock.length,
      expiringSoonCount: expiringSoon.length,
      topLowStock: lowStock.slice(0, 5).map((i) => ({
        name: stripPiiText(i.name).slice(0, 60),
        qty: i.quantity,
        min: i.minimum_quantity,
        unit: i.unit.slice(0, 16),
      })),
      topExpiring: expiringSoon.slice(0, 5).map((i) => ({
        name: stripPiiText(i.name).slice(0, 60),
        qty: i.quantity,
        unit: i.unit.slice(0, 16),
        expiryDate: i.expiry_date ?? today,
      })),
    },
    menu: {
      todayMenus: menusToday.slice(0, 6).map((m) => ({
        mealType: rowText(m, "meal_type", "Meal").slice(0, 24),
        title: stripPiiText(rowText(m, "title", "Planned meal")).slice(0, 90),
        expectedServings: rowNumber(m, "expected_servings"),
      })),
      recipeCount: recipes.length,
      avgRecipeCostRupees,
      topCostEffectiveRecipes: [...recipes]
        .sort((a, b) => rowNumber(a, "cost_per_serving") - rowNumber(b, "cost_per_serving"))
        .slice(0, 5)
        .map((r) => ({
          name: stripPiiText(rowText(r, "name")).slice(0, 60),
          costRupees: Math.round(rowNumber(r, "cost_per_serving")),
        })),
    },
    billing: {
      invoiceCount: invoices.length,
      unpaidCount,
      totalBilledRupees,
      totalCollectedRupees,
      pendingRupees,
    },
    waste: {
      logCount: wasteLogs.length,
      totalPreparedKg,
      totalWastedKg,
      totalWasteCostRupees,
      wastePct,
      topWastedDishes: [...wasteLogs]
        .sort((a, b) => rowNumber(b, "wasted_quantity") - rowNumber(a, "wasted_quantity"))
        .slice(0, 4)
        .map((w) => {
          const prep = rowNumber(w, "prepared_quantity");
          const wasted = rowNumber(w, "wasted_quantity");
          return {
            dishName: stripPiiText(rowText(w, "dish_name", "Dish")).slice(0, 60),
            wastedKg: wasted,
            wastePct: prep > 0 ? Math.round((wasted / prep) * 100) : 0,
            reason: stripPiiText(rowText(w, "reason", "Leftover")).slice(0, 80),
          };
        }),
    },
    ratings: {
      feedbackCount: visibleFeedback.length,
      avgRating,
      lowRatedMeals: [...visibleFeedback]
        .filter((f) => f.rating <= 3)
        .slice(0, 3)
        .map((f) => ({
          mealType: f.mealType.slice(0, 24),
          rating: f.rating,
          category: f.category,
        })),
      topicCounts,
    },
    operations: {
      activeStudentsCount,
      pastAttendanceAvg,
      upcomingHolidays: events.map((ev) => ({
        date: rowText(ev, "event_date"),
        title: stripPiiText(rowText(ev, "title", "Campus event")).slice(0, 60),
        attendanceFactor: rowNumber(ev, "attendance_factor", 1),
      })),
    },
  };
}

function defaultUsageToday(today = getIstDateKey()): AiUsageToday {
  return {
    dateKey: today,
    apiCallsToday: 0,
    cachedHitsToday: 0,
    formulaFallbacksToday: 0,
    lastModel: null,
    lastStatus: null,
  };
}

export function getAiUsageToday(now = new Date()): AiUsageToday {
  const today = getIstDateKey(now);
  if (typeof window === "undefined") return defaultUsageToday(today);
  try {
    const raw = window.localStorage.getItem(AI_USAGE_STORAGE_KEY);
    if (!raw) return defaultUsageToday(today);
    const parsed = JSON.parse(raw) as Partial<AiUsageToday>;
    if (parsed.dateKey !== today) {
      return defaultUsageToday(today);
    }
    return {
      dateKey: today,
      apiCallsToday: Number(parsed.apiCallsToday ?? 0),
      cachedHitsToday: Number(parsed.cachedHitsToday ?? 0),
      formulaFallbacksToday: Number(parsed.formulaFallbacksToday ?? 0),
      lastModel: typeof parsed.lastModel === "string" ? parsed.lastModel : null,
      lastStatus: parsed.lastStatus ?? null,
    };
  } catch {
    return defaultUsageToday(today);
  }
}

export function recordAiUsageEvent(
  kind: "api" | "cache" | "fallback",
  options?: {
    model?: string;
    status?: AiUsageToday["lastStatus"];
    now?: Date;
  },
): AiUsageToday {
  const current = getAiUsageToday(options?.now);
  const next: AiUsageToday = {
    ...current,
    apiCallsToday: current.apiCallsToday + (kind === "api" ? 1 : 0),
    cachedHitsToday: current.cachedHitsToday + (kind === "cache" ? 1 : 0),
    formulaFallbacksToday: current.formulaFallbacksToday + (kind === "fallback" ? 1 : 0),
    lastModel: options?.model ?? current.lastModel,
    lastStatus: options?.status ?? current.lastStatus,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(AI_USAGE_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(AI_USAGE_EVENT, { detail: next }));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

export function useAiUsageToday(): AiUsageToday {
  const [usage, setUsage] = useState<AiUsageToday>(() => getAiUsageToday());
  useEffect(() => {
    setUsage(getAiUsageToday());
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<AiUsageToday>).detail;
      setUsage(detail ?? getAiUsageToday());
    };
    window.addEventListener(AI_USAGE_EVENT, handler);
    return () => window.removeEventListener(AI_USAGE_EVENT, handler);
  }, []);
  return usage;
}

export function stableHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function getCachedAiValue<T>(key: string): T | null {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > now) {
    return mem.data as T;
  }
  memoryCache.delete(key);
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${AI_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt: number; data: T };
    if (parsed.expiresAt <= now) {
      window.localStorage.removeItem(`${AI_CACHE_PREFIX}${key}`);
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed.data;
  } catch {
    return null;
  }
}

export function setCachedAiValue<T>(key: string, data: T, ttlMs = DEFAULT_CLIENT_TTL_MS): void {
  const entry = { expiresAt: Date.now() + ttlMs, data };
  memoryCache.set(key, entry);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(`${AI_CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // Ignore localStorage quota overflow
    }
  }
}

export function clearAiClientCacheForTests(): void {
  memoryCache.clear();
  inflightRequests.clear();
}

export function debounceCallback<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs: number,
): ((...args: TArgs) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const wrapped = (...args: TArgs) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return wrapped;
}

export function computeTomorrowDemandBreakdown(params: {
  targetDate: string;
  weekdayName: string;
  lang: SupportedLanguage;
  activeStudentsCount: number;
  pastAttendanceAvg: number;
  tomorrowSkipsCount: number;
  guestCount: number;
  holidayFactor: number;
  holidayNote: string;
  weatherMultiplier: number;
  weatherCondition: string;
}): TomorrowDemandBreakdown {
  const effectiveBase =
    params.pastAttendanceAvg > 0
      ? Math.round(params.pastAttendanceAvg * 0.6 + params.activeStudentsCount * 0.4)
      : Math.max(0, params.activeStudentsCount);

  const isWeekend =
    params.weekdayName.toLowerCase().startsWith("sat") ||
    params.weekdayName.toLowerCase().startsWith("sun");
  const dowFactor = isWeekend ? 0.91 : 1.0;

  const combinedFactor =
    dowFactor * Math.max(0.2, params.holidayFactor) * Math.max(0.6, params.weatherMultiplier);

  const netHeadcount = Math.max(
    0,
    effectiveBase - Math.max(0, params.tomorrowSkipsCount) + Math.max(0, params.guestCount),
  );

  const breakfastPortions = Math.max(0, Math.round(netHeadcount * 0.74 * combinedFactor));
  const lunchPortions = Math.max(0, Math.round(netHeadcount * 0.9 * combinedFactor));
  const snacksPortions = Math.max(0, Math.round(netHeadcount * 0.54 * combinedFactor));
  const dinnerPortions = Math.max(0, Math.round(netHeadcount * 0.86 * combinedFactor));

  const confidence = params.pastAttendanceAvg > 0 ? 86 : params.activeStudentsCount > 0 ? 74 : 60;
  const rationale =
    params.lang === "hi"
      ? `फ़ॉर्मूला आधार: ${effectiveBase} औसत उपस्थिति × ${dowFactor.toFixed(2)} (${params.weekdayName}) × ${params.holidayFactor.toFixed(2)} (${params.holidayNote}) × ${params.weatherMultiplier.toFixed(2)} मौसम (${params.weatherCondition})।`
      : `Formula basis: ${effectiveBase} baseline × ${dowFactor.toFixed(2)} (${params.weekdayName}) × ${params.holidayFactor.toFixed(2)} (${params.holidayNote}) × ${params.weatherMultiplier.toFixed(2)} weather (${params.weatherCondition}).`;

  return {
    targetDate: params.targetDate,
    weekdayName: params.weekdayName,
    breakfastPortions,
    lunchPortions,
    snacksPortions,
    dinnerPortions,
    confidence,
    rationale,
    source: "formula-fallback",
  };
}

export function computeMenuSuggestionsFromSummary(summary: SanitizedMessSummary): {
  tips: string[];
  highlightMetric: string;
} {
  const hi = summary.lang === "hi";
  const tips: string[] = [];

  if (summary.stock.topExpiring.length > 0) {
    const first = summary.stock.topExpiring[0]!;
    tips.push(
      hi
        ? `FEFO मेनू प्राथमिकता: '${first.name}' (${first.qty} ${first.unit}, समाप्ति ${first.expiryDate}) को कल के मुख्य भोजन में पहले उपयोग करें।`
        : `FEFO Priority: Use '${first.name}' (${first.qty} ${first.unit}, exp ${first.expiryDate}) in tomorrow's main course before expiry.`,
    );
  }

  if (summary.menu.topCostEffectiveRecipes.length > 0) {
    const best = summary.menu.topCostEffectiveRecipes[0]!;
    tips.push(
      hi
        ? `किफायती थाली सुझाव: '${best.name}' (~₹${best.costRupees}/प्लेट) को लागत नियंत्रण के लिए शामिल करें।`
        : `Cost-Optimal Dish: Rotate '${best.name}' (~₹${best.costRupees}/plate) to hold plate cost near ₹${summary.menu.avgRecipeCostRupees || best.costRupees}.`,
    );
  }

  if (summary.ratings.lowRatedMeals.length > 0) {
    const low = summary.ratings.lowRatedMeals[0]!;
    tips.push(
      hi
        ? `छात्र रेटिंग सुधार: ${low.mealType} (${low.rating}/5, ${low.category}) के लिए ताज़ा मसाला/तड़का और गर्म परोसने पर ध्यान दें।`
        : `Rating Boost: Refresh ${low.mealType} (${low.rating}/5 on ${low.category}) with an alternate high-rated seasonal sabzi or live counter item.`,
    );
  }

  if (tips.length === 0) {
    tips.push(
      hi
        ? "पर्याप्त स्टॉक व संतुलित लागत के लिए साप्ताहिक मेनू में मौसमी सब्ज़ी, दाल तड़का और दही शामिल करें।"
        : "Stock & Cost Balance: Pair high-stock staples (dal/rice) with one seasonal vegetable and raita to keep plate cost predictable.",
    );
  }

  const highlightMetric = hi
    ? `औसत प्लेट लागत: ₹${summary.menu.avgRecipeCostRupees} · औसत रेटिंग: ${summary.ratings.avgRating || "N/A"}/5`
    : `Avg plate cost: ₹${summary.menu.avgRecipeCostRupees} · Avg rating: ${summary.ratings.avgRating || "N/A"}/5`;

  return { tips, highlightMetric };
}

export function computeWasteTipsFromSummary(summary: SanitizedMessSummary): {
  tips: string[];
  highlightMetric: string;
} {
  const hi = summary.lang === "hi";
  const tips: string[] = [];

  if (summary.waste.topWastedDishes.length > 0) {
    const top = summary.waste.topWastedDishes[0]!;
    tips.push(
      hi
        ? `शीर्ष अपव्यय व्यंजन '${top.dishName}': ${top.wastedKg} kg (${top.wastePct}%) बचा — अंतिम 30 मिनट में छोटे बैच पकाएं।`
        : `Top Leftover '${top.dishName}': ${top.wastedKg} kg (${top.wastePct}% of prep, "${top.reason}") — trim initial batch by 15% and cook final tray only on queue check.`,
    );
  }

  if (summary.waste.wastePct > 5) {
    tips.push(
      hi
        ? `कुल अपव्यय दर ${summary.waste.wastePct}% है (लक्ष्य < 5%): छात्रों को कट-ऑफ से पहले मील स्किप रिमाइंडर भेजें।`
        : `Waste Rate Alert (${summary.waste.wastePct}% vs <5% target): Trigger pre-cutoff skip reminders so prep matches actual hostel turnout.`,
    );
  } else if (summary.waste.logCount > 0) {
    tips.push(
      hi
        ? `अच्छा नियंत्रण (${summary.waste.wastePct}% अपव्यय): साप्ताहिक व्यंजनवार बर्बादी की तुलना जारी रखें।`
        : `Waste is under control (${summary.waste.wastePct}%). Keep logging plate waste separately from prep trimmings.`,
    );
  } else {
    tips.push(
      hi
        ? "लंच और डिनर के बाद बचे भोजन का वजन दर्ज करना शुरू करें ताकि सटीक बचत सुझाव मिल सकें।"
        : "Log post-service leftovers after lunch & dinner to unlock dish-level batch reduction targets.",
    );
  }

  const highlightMetric = hi
    ? `कुल अपव्यय: ${summary.waste.totalWastedKg} kg (₹${summary.waste.totalWasteCostRupees.toLocaleString("en-IN")})`
    : `Logged waste: ${summary.waste.totalWastedKg} kg (₹${summary.waste.totalWasteCostRupees.toLocaleString("en-IN")})`;

  return { tips, highlightMetric };
}

export function computeFeedbackSummaryFromSummary(summary: SanitizedMessSummary): {
  tips: string[];
  highlightMetric: string;
} {
  const hi = summary.lang === "hi";
  const topics = summary.ratings.topicCounts ?? [];
  const tips: string[] = [];

  if (topics.length > 0) {
    const sortedWorst = [...topics].sort((a, b) => a.avgRating - b.avgRating);
    const worst = sortedWorst[0]!;
    const topMentioned = topics[0]!;
    tips.push(
      hi
        ? `सबसे चर्चित विषय '${topMentioned.topic}': ${topMentioned.count} समीक्षाएँ (औसत ${topMentioned.avgRating}/5)।`
        : `Top discussed topic '${topMentioned.topic}': ${topMentioned.count} review(s) averaging ${topMentioned.avgRating}/5.`,
    );
    if (worst.avgRating < 3.5) {
      tips.push(
        hi
          ? `तत्काल सुधार क्षेत्र '${worst.topic}' (${worst.avgRating}/5): मेस समिति की बैठक में रेसिपी व गुणवत्ता जांच रखें।`
          : `Priority attention on '${worst.topic}' (${worst.avgRating}/5): review counter temperature, seasoning, or portion ladle sizing.`,
      );
    }
  }

  if (summary.ratings.lowRatedMeals.length > 0) {
    const low = summary.ratings.lowRatedMeals[0]!;
    tips.push(
      hi
        ? `निम्न-रेटेड भोजन (${low.mealType} · ${low.rating}/5 · ${low.category}): छात्र समिति के साथ साप्ताहिक स्वाद समीक्षा करें।`
        : `Low-rated meal focus: ${low.mealType} scored ${low.rating}/5 on ${low.category} — schedule a recipe check before next cycle.`,
    );
  }

  if (tips.length === 0) {
    tips.push(
      hi
        ? "अब तक प्राप्त छात्र फीडबैक सकारात्मक और संतुलित है। चेक-इन के बाद 1-टैप रेटिंग को प्रोत्साहित करें।"
        : "Student dining feedback is balanced with no urgent topic clusters. Encourage 1-tap QR post-meal ratings.",
    );
  }

  const highlightMetric = hi
    ? `औसत रेटिंग: ${summary.ratings.avgRating || "N/A"}/5 · कुल समीक्षाएँ: ${summary.ratings.feedbackCount}`
    : `Avg rating: ${summary.ratings.avgRating || "N/A"}/5 · Total reviews: ${summary.ratings.feedbackCount}`;

  return { tips, highlightMetric };
}

export function buildDataAwareAskFallback(
  prompt: string,
  summary: SanitizedMessSummary | undefined,
): string {
  const q = prompt.toLowerCase();
  const hi = summary?.lang === "hi";

  if (summary) {
    if (
      q.includes("bill") ||
      q.includes("pay") ||
      q.includes("invoice") ||
      q.includes("बिल") ||
      q.includes("भुगतान")
    ) {
      const b = summary.billing;
      return hi
        ? `बिलिंग सारांश (लोकल फ़ॉर्मूला): कुल ${b.invoiceCount} बिल, ₹${b.totalBilledRupees.toLocaleString("en-IN")} देय, ₹${b.totalCollectedRupees.toLocaleString("en-IN")} प्राप्त, ₹${b.pendingRupees.toLocaleString("en-IN")} शेष (${b.unpaidCount} बकाया)।`
        : `Billing Snapshot (Local Fallback): ${b.invoiceCount} invoices totaling ₹${b.totalBilledRupees.toLocaleString("en-IN")} billed, ₹${b.totalCollectedRupees.toLocaleString("en-IN")} collected, and ₹${b.pendingRupees.toLocaleString("en-IN")} pending across ${b.unpaidCount} unpaid/partial bills.`;
    }

    if (
      q.includes("stock") ||
      q.includes("inventory") ||
      q.includes("expir") ||
      q.includes("fefo") ||
      q.includes("स्टॉक") ||
      q.includes("एक्सपायरी")
    ) {
      const s = summary.stock;
      const lowList = s.topLowStock
        .map((i) => `${i.name} (${i.qty}/${i.min} ${i.unit})`)
        .join(", ");
      const expList = s.topExpiring.map((i) => `${i.name} (${i.expiryDate})`).join(", ");
      return hi
        ? `स्टॉक सारांश (लोकल फ़ॉर्मूला): कुल ${s.totalItems} आइटम, ${s.lowStockCount} कम स्टॉक (${lowList || "कोई नहीं"}), ${s.expiringSoonCount} जल्द समाप्त होने वाले (${expList || "कोई नहीं"})।`
        : `Stock Snapshot (Local Fallback): ${s.totalItems} tracked ingredients — ${s.lowStockCount} low stock (${lowList || "none"}), ${s.expiringSoonCount} expiring within 72h (${expList || "none"}). Prioritize FEFO issue for expiring items before placing POs.`;
    }

    if (
      q.includes("waste") ||
      q.includes("leftover") ||
      q.includes("अपव्यय") ||
      q.includes("बर्बादी")
    ) {
      const w = summary.waste;
      const top = w.topWastedDishes[0];
      return hi
        ? `अपव्यय सारांश (लोकल फ़ॉर्मूला): ${w.logCount} प्रविष्टियाँ, कुल ${w.totalWastedKg} kg (${w.wastePct}%, ₹${w.totalWasteCostRupees.toLocaleString("en-IN")})। ${top ? `शीर्ष व्यंजन: ${top.dishName} (${top.wastedKg} kg)।` : ""}`
        : `Waste Snapshot (Local Fallback): ${w.logCount} logs totaling ${w.totalWastedKg} kg (${w.wastePct}% of ${w.totalPreparedKg} kg prepared, ₹${w.totalWasteCostRupees.toLocaleString("en-IN")} leakage). ${top ? `Highest dish: ${top.dishName} (${top.wastedKg} kg).` : ""}`;
    }

    if (q.includes("menu") || q.includes("recipe") || q.includes("rating") || q.includes("मेनू")) {
      const m = summary.menu;
      const slots = m.todayMenus.map((t) => `${t.mealType}: ${t.title}`).join("; ");
      return hi
        ? `मेनू सारांश (लोकल फ़ॉर्मूला): आज के भोजन — ${slots || "अभी निर्धारित नहीं"}। औसत प्लेट लागत ₹${m.avgRecipeCostRupees} और औसत रेटिंग ${summary.ratings.avgRating || "N/A"}/5।`
        : `Menu Snapshot (Local Fallback): Today's menus — ${slots || "none scheduled yet"}. ${m.recipeCount} standardized recipes averaging ₹${m.avgRecipeCostRupees}/plate; student rating avg ${summary.ratings.avgRating || "N/A"}/5.`;
    }
  }

  return hi
    ? "Gemini फ्री-टियर कोटा या नेटवर्क उपलब्ध न होने के कारण लोकल डेटा-आधारित सहायक सक्रिय है। आप स्टॉक, बिल, अपव्यय या मेनू के बारे में पूछ सकते हैं।"
    : "Gemini free-tier quota is currently unavailable, so FoodFlow answered locally from your workspace summary. Ask about stock, bills, waste, or today's menu anytime.";
}

export async function requestDemandForecastAI(params: {
  targetDate: string;
  weekdayName: string;
  lang: SupportedLanguage;
  activeStudentsCount: number;
  pastAttendanceAvg: number;
  tomorrowSkipsCount: number;
  guestCount: number;
  holidayFactor: number;
  holidayNote: string;
  weatherTempMaxC: number;
  weatherRainMm: number;
  weatherCondition: string;
  weatherMultiplier: number;
}): Promise<TomorrowDemandBreakdown> {
  const key = `fc_${stableHash(JSON.stringify(params))}`;
  const cached = getCachedAiValue<TomorrowDemandBreakdown>(key);
  if (cached) {
    recordAiUsageEvent("cache", { status: "ok" });
    return { ...cached, source: "cache" };
  }

  const existing = inflightRequests.get(key) as Promise<TomorrowDemandBreakdown> | undefined;
  if (existing) return existing;

  const task = (async (): Promise<TomorrowDemandBreakdown> => {
    try {
      const resp = await fetch("/api/gemini/forecast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = (await resp.json()) as {
        breakfastPortions?: number;
        lunchPortions?: number;
        snacksPortions?: number;
        dinnerPortions?: number;
        confidence?: number;
        rationale?: string;
        model?: string;
        code?: string;
        error?: string;
      };
      if (!resp.ok || typeof json.lunchPortions !== "number") {
        const isQuota = resp.status === 429 || json.code === "QUOTA_EXCEEDED";
        recordAiUsageEvent("fallback", {
          status: isQuota ? "quota_fallback" : "offline_fallback",
        });
        return {
          ...computeTomorrowDemandBreakdown(params),
          notice: json.error ?? "Free-tier quota reached — using local forecast formula.",
        };
      }

      const result: TomorrowDemandBreakdown = {
        targetDate: params.targetDate,
        weekdayName: params.weekdayName,
        breakfastPortions: json.breakfastPortions ?? 0,
        lunchPortions: json.lunchPortions,
        snacksPortions: json.snacksPortions ?? 0,
        dinnerPortions: json.dinnerPortions ?? 0,
        confidence: json.confidence ?? 85,
        rationale: json.rationale ?? "Predicted with Gemini free-tier + Open-Meteo.",
        source: "gemini",
      };
      setCachedAiValue(key, result);
      recordAiUsageEvent("api", { model: json.model ?? "gemini-4-hydrogen", status: "ok" });
      return result;
    } catch {
      recordAiUsageEvent("fallback", { status: "offline_fallback" });
      return {
        ...computeTomorrowDemandBreakdown(params),
        notice: "Unable to reach AI service — using local forecast formula.",
      };
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, task);
  return task;
}

export async function requestInsightsAI(params: {
  kind: "menu_suggestions" | "waste_tips" | "feedback_summary";
  summary: SanitizedMessSummary;
}): Promise<InsightsResponse> {
  const key = `ins_${params.kind}_${stableHash(JSON.stringify(params.summary))}`;
  const cached = getCachedAiValue<InsightsResponse>(key);
  if (cached) {
    recordAiUsageEvent("cache", { status: "ok" });
    return { ...cached, source: "cache" };
  }

  const fallbackResult =
    params.kind === "menu_suggestions"
      ? computeMenuSuggestionsFromSummary(params.summary)
      : params.kind === "feedback_summary"
        ? computeFeedbackSummaryFromSummary(params.summary)
        : computeWasteTipsFromSummary(params.summary);

  try {
    const resp = await fetch("/api/gemini/insights", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: params.kind,
        lang: params.summary.lang,
        messSummary: params.summary,
      }),
    });
    const json = (await resp.json()) as {
      tips?: string[];
      highlightMetric?: string;
      model?: string;
      code?: string;
      error?: string;
    };
    if (!resp.ok || !Array.isArray(json.tips) || json.tips.length === 0) {
      const isQuota = resp.status === 429 || json.code === "QUOTA_EXCEEDED";
      recordAiUsageEvent("fallback", {
        status: isQuota ? "quota_fallback" : "offline_fallback",
      });
      return {
        ...fallbackResult,
        source: "formula-fallback",
        notice: json.error ?? "Switched to deterministic formula recommendations.",
      };
    }

    const result: InsightsResponse = {
      tips: json.tips,
      highlightMetric: json.highlightMetric ?? fallbackResult.highlightMetric,
      source: "gemini",
    };
    setCachedAiValue(key, result);
    recordAiUsageEvent("api", { model: json.model ?? "gemini-3.1-flash-lite", status: "ok" });
    return result;
  } catch {
    recordAiUsageEvent("fallback", { status: "offline_fallback" });
    return {
      ...fallbackResult,
      source: "formula-fallback",
      notice: "Switched to local formula recommendations.",
    };
  }
}

export async function requestAskFoodFlowChat(params: {
  model: "gemini-4-hydrogen" | "gemini-3.1-flash-lite";
  persona: "kitchen_copilot" | "warden_ops" | "student_helper";
  message: string;
  history: { role: "user" | "model"; text: string }[];
  messSummary?: SanitizedMessSummary;
}): Promise<{ reply: string; source: "gemini" | "cache" | "formula-fallback"; notice?: string }> {
  const cleanMessage = stripPiiText(params.message);
  const cacheKey = `chat_${params.model}_${params.persona}_${stableHash(
    `${cleanMessage}|${JSON.stringify(params.messSummary ?? {})}`,
  )}`;

  if (params.history.length <= 2) {
    const cached = getCachedAiValue<{ reply: string }>(cacheKey);
    if (cached) {
      recordAiUsageEvent("cache", { status: "ok" });
      return { reply: cached.reply, source: "cache" };
    }
  }

  try {
    const resp = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: params.model,
        persona: params.persona,
        message: cleanMessage,
        history: params.history.slice(-8),
        ...(params.messSummary ? { messSummary: params.messSummary } : {}),
      }),
    });
    const json = (await resp.json()) as {
      reply?: string;
      model?: string;
      code?: string;
      error?: string;
    };
    if (!resp.ok || !json.reply) {
      const isQuota = resp.status === 429 || json.code === "QUOTA_EXCEEDED";
      recordAiUsageEvent("fallback", {
        status: isQuota ? "quota_fallback" : "offline_fallback",
      });
      return {
        reply: buildDataAwareAskFallback(cleanMessage, params.messSummary),
        source: "formula-fallback",
        notice: json.error ?? "Free-tier quota reached — answered from local mess summary.",
      };
    }

    if (params.history.length <= 2) {
      setCachedAiValue(cacheKey, { reply: json.reply });
    }
    recordAiUsageEvent("api", { model: json.model ?? params.model, status: "ok" });
    return { reply: json.reply, source: "gemini" };
  } catch {
    recordAiUsageEvent("fallback", { status: "offline_fallback" });
    return {
      reply: buildDataAwareAskFallback(cleanMessage, params.messSummary),
      source: "formula-fallback",
      notice: "Could not reach AI service — answered locally from your mess summary.",
    };
  }
}
