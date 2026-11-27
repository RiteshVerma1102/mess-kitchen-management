import type {
  ComplaintDoc,
  FeedbackDoc,
  InventoryItemDoc,
  MenuPlanDoc,
  PurchaseOrderDoc,
  RecipeDoc,
} from "@/lib/domain/workspace-types";

export const FEEDBACK_TAGS = ["taste", "hygiene", "quantity", "temperature", "freshness"] as const;
export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];

export interface AttendanceLike {
  studentCode?: string;
  student_code?: string;
  mealType?: string;
  meal_type?: string;
  serviceDate?: string;
  service_date?: string;
  servedAt?: string;
  served_at?: string;
}

export interface FeedbackEligibilityResult {
  eligible: boolean;
  reasonCode: "ok" | "not_checked_in" | "window_expired" | "already_rated";
  messageEn: string;
  messageHi: string;
  checkedInAt?: string;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function normalizeMealSlotName(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith("break")) return "breakfast";
  if (lower.startsWith("lun")) return "lunch";
  if (lower.startsWith("snack") || lower.startsWith("evening")) return "snacks";
  if (lower.startsWith("din")) return "dinner";
  return lower;
}

export function checkFeedbackEligibility(params: {
  attendanceRecords: readonly AttendanceLike[];
  existingFeedback: readonly Pick<FeedbackDoc, "userId" | "serviceDate" | "mealType">[];
  userId: string;
  studentCode: string;
  serviceDate: string;
  mealType: string;
  nowMs?: number;
}): FeedbackEligibilityResult {
  const nowMs = params.nowMs ?? Date.now();
  const slot = normalizeMealSlotName(params.mealType);
  const cleanCode = params.studentCode.trim().toLowerCase();

  const already = params.existingFeedback.some(
    (f) =>
      f.userId === params.userId &&
      f.serviceDate === params.serviceDate &&
      normalizeMealSlotName(f.mealType) === slot,
  );
  if (already) {
    return {
      eligible: false,
      reasonCode: "already_rated",
      messageEn: "You already submitted a rating for this meal.",
      messageHi: "आप इस भोजन के लिए पहले ही रेटिंग दे चुके हैं।",
    };
  }

  const checkIn = params.attendanceRecords.find((a) => {
    const code = (a.studentCode ?? a.student_code ?? "").trim().toLowerCase();
    const date = (a.serviceDate ?? a.service_date ?? "").slice(0, 10);
    const meal = normalizeMealSlotName(a.mealType ?? a.meal_type ?? "");
    return code === cleanCode && date === params.serviceDate && meal === slot;
  });

  if (!checkIn) {
    return {
      eligible: false,
      reasonCode: "not_checked_in",
      messageEn: "Check in at the mess QR counter for this meal to unlock 1-tap rating.",
      messageHi: "1-टैप रेटिंग खोलने के लिए पहले मेस QR काउंटर पर चेक-इन करें।",
    };
  }

  const servedIso = checkIn.servedAt ?? checkIn.served_at ?? `${params.serviceDate}T12:00:00+05:30`;
  const servedMs = new Date(servedIso).getTime();
  if (Number.isFinite(servedMs) && nowMs - servedMs > TWENTY_FOUR_HOURS_MS) {
    return {
      eligible: false,
      reasonCode: "window_expired",
      messageEn: "24-hour rating window after meal check-in has closed.",
      messageHi: "भोजन चेक-इन के 24 घंटे बाद रेटिंग विंडो बंद हो गई है।",
      checkedInAt: servedIso,
    };
  }

  return {
    eligible: true,
    reasonCode: "ok",
    messageEn: "Verified dining check-in — feedback unlocked (within 24h).",
    messageHi: "चेक-इन सत्यापित — फीडबैक खुला है (24 घंटे के भीतर)।",
    checkedInAt: servedIso,
  };
}

const PROFANITY_PATTERNS: RegExp[] = [
  /\b(idiot|stupid|moron|bastard|bitch|shit|fuck|asshole|crap|dumbass|scam|trash)\b/i,
  /\b(kamina|kutta|chutiya|madarchod|behenchod|harami|bakwas|gandu|bhosdike|ullu)\b/i,
];

export function moderateFeedbackContent(text: string): {
  moderationStatus: "approved" | "flagged";
  matchedTerms: string[];
} {
  const clean = text.trim();
  if (!clean) return { moderationStatus: "approved", matchedTerms: [] };
  const matched: string[] = [];
  for (const rx of PROFANITY_PATTERNS) {
    const found = rx.exec(clean);
    if (found?.[1]) matched.push(found[1].toLowerCase());
  }
  return {
    moderationStatus: matched.length > 0 ? "flagged" : "approved",
    matchedTerms: matched,
  };
}

export function computeComplaintSlaDeadline(
  createdAtIso: string,
  priority: ComplaintDoc["priority"],
): string {
  const baseMs = new Date(createdAtIso).getTime();
  const safeBase = Number.isFinite(baseMs) ? baseMs : Date.now();
  const hours = priority === "high" ? 4 : priority === "medium" ? 24 : 48;
  return new Date(safeBase + hours * 3_600_000).toISOString();
}

export function normalizeComplaintPriorityAndEscalation(
  category: string,
  requestedPriority: ComplaintDoc["priority"],
): { priority: ComplaintDoc["priority"]; escalatedToRoles: string[]; autoEscalated: boolean } {
  const lower = category.trim().toLowerCase();
  const isHygiene =
    lower.includes("hygiene") || lower.includes("spoil") || lower.includes("poison");
  if (isHygiene) {
    return {
      priority: "high",
      escalatedToRoles: ["admin", "warden"],
      autoEscalated: true,
    };
  }
  if (requestedPriority === "high") {
    return {
      priority: "high",
      escalatedToRoles: ["admin"],
      autoEscalated: false,
    };
  }
  return {
    priority: requestedPriority,
    escalatedToRoles: [],
    autoEscalated: false,
  };
}

export function formatSlaRemaining(
  slaDeadlineAt: string | undefined,
  status: ComplaintDoc["status"],
  nowMs = Date.now(),
): { label: string; overdue: boolean; tone: "green" | "amber" | "red" } {
  if (status === "resolved") {
    return { label: "Resolved within log", overdue: false, tone: "green" };
  }
  if (!slaDeadlineAt) {
    return { label: "24h SLA", overdue: false, tone: "amber" };
  }
  const deadlineMs = new Date(slaDeadlineAt).getTime();
  if (!Number.isFinite(deadlineMs)) {
    return { label: "24h SLA", overdue: false, tone: "amber" };
  }
  const diffMin = Math.round((deadlineMs - nowMs) / 60000);
  if (diffMin < 0) {
    const absMin = Math.abs(diffMin);
    const hrs = Math.floor(absMin / 60);
    const mins = absMin % 60;
    return {
      label: `Overdue ${hrs > 0 ? `${hrs}h ` : ""}${mins}m`,
      overdue: true,
      tone: "red",
    };
  }
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return {
    label: `${hrs}h ${mins}m left`,
    overdue: false,
    tone: hrs < 2 ? "amber" : "green",
  };
}

export interface DishRatingAggregate {
  dish: string;
  avgRating: number;
  count: number;
  status: "favorite" | "ok" | "needs_review";
}

export interface FeedbackAnalyticsSummary {
  avgRatingToday: number | null;
  avgRatingOverall: number;
  totalReviews: number;
  flaggedCount: number;
  trend7Days: { date: string; avgRating: number; count: number }[];
  dishLeaderboard: DishRatingAggregate[];
  bestDish: DishRatingAggregate | null;
  worstDish: DishRatingAggregate | null;
  lowRatedDishesNeedingReview: DishRatingAggregate[];
  topComplaintCategories: { category: string; count: number; openCount: number }[];
  openComplaintsCount: number;
  escalatedCount: number;
}

export function analyzeDishQualityLoop(params: {
  feedbackList: readonly FeedbackDoc[];
  complaints: readonly ComplaintDoc[];
  todayDateKey: string;
}): FeedbackAnalyticsSummary {
  const visibleFeedback = params.feedbackList.filter((f) => f.moderationStatus !== "hidden");
  const flaggedCount = params.feedbackList.filter((f) => f.moderationStatus === "flagged").length;

  const todayRows = visibleFeedback.filter((f) => f.serviceDate === params.todayDateKey);
  const avgRatingToday = todayRows.length
    ? Number((todayRows.reduce((s, r) => s + r.rating, 0) / todayRows.length).toFixed(1))
    : null;
  const avgRatingOverall = visibleFeedback.length
    ? Number(
        (visibleFeedback.reduce((s, r) => s + r.rating, 0) / visibleFeedback.length).toFixed(1),
      )
    : 0;

  // 7-day trend
  const byDate = new Map<string, { sum: number; count: number }>();
  for (const fb of visibleFeedback) {
    const key = fb.serviceDate || params.todayDateKey;
    const prev = byDate.get(key) ?? { sum: 0, count: 0 };
    byDate.set(key, { sum: prev.sum + fb.rating, count: prev.count + 1 });
  }
  const trend7Days = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, agg]) => ({
      date: date.slice(5),
      avgRating: Number((agg.sum / agg.count).toFixed(2)),
      count: agg.count,
    }));

  // Dish-level aggregation
  const dishStats = new Map<string, { sum: number; count: number }>();
  for (const fb of visibleFeedback) {
    if (Array.isArray(fb.dishRatings) && fb.dishRatings.length > 0) {
      for (const dr of fb.dishRatings) {
        const key = dr.dish.trim();
        if (!key) continue;
        const prev = dishStats.get(key) ?? { sum: 0, count: 0 };
        dishStats.set(key, { sum: prev.sum + dr.rating, count: prev.count + 1 });
      }
    } else {
      const fallbackDish = `${fb.mealType} Thali`;
      const prev = dishStats.get(fallbackDish) ?? { sum: 0, count: 0 };
      dishStats.set(fallbackDish, { sum: prev.sum + fb.rating, count: prev.count + 1 });
    }
  }

  const dishLeaderboard: DishRatingAggregate[] = [...dishStats.entries()]
    .map(([dish, agg]) => {
      const avg = Number((agg.sum / agg.count).toFixed(2));
      const status: DishRatingAggregate["status"] =
        avg < 3.0 ? "needs_review" : avg >= 4.2 ? "favorite" : "ok";
      return { dish, avgRating: avg, count: agg.count, status };
    })
    .sort((a, b) => b.avgRating - a.avgRating);

  const bestDish = dishLeaderboard[0] ?? null;
  const worstDish = dishLeaderboard.length ? dishLeaderboard[dishLeaderboard.length - 1]! : null;
  const lowRatedDishesNeedingReview = dishLeaderboard.filter((d) => d.status === "needs_review");

  const compByCategory = new Map<string, { count: number; openCount: number }>();
  for (const c of params.complaints) {
    const key = c.category || "Other";
    const prev = compByCategory.get(key) ?? { count: 0, openCount: 0 };
    compByCategory.set(key, {
      count: prev.count + 1,
      openCount: prev.openCount + (c.status !== "resolved" ? 1 : 0),
    });
  }
  const topComplaintCategories = [...compByCategory.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.count - a.count);

  return {
    avgRatingToday,
    avgRatingOverall,
    totalReviews: visibleFeedback.length,
    flaggedCount,
    trend7Days,
    dishLeaderboard,
    bestDish,
    worstDish,
    lowRatedDishesNeedingReview,
    topComplaintCategories,
    openComplaintsCount: params.complaints.filter((c) => c.status !== "resolved").length,
    escalatedCount: params.complaints.filter(
      (c) => (c.escalatedToRoles?.length ?? 0) > 0 && c.status !== "resolved",
    ).length,
  };
}

export function evaluateLeaveRebateEligibility(params: {
  days: number;
  minRebateDays?: number;
  perDayRebatePaise: number;
}): {
  rebateEligible: boolean;
  minDays: number;
  rebatePaise: number;
  noteEn: string;
  noteHi: string;
} {
  const minDays = Math.max(1, Math.round(params.minRebateDays ?? 3));
  const safeDays = Math.max(1, Math.round(params.days));
  const rebateEligible = safeDays >= minDays;
  const rebatePaise = rebateEligible
    ? safeDays * Math.max(0, Math.round(params.perDayRebatePaise))
    : 0;
  return {
    rebateEligible,
    minDays,
    rebatePaise,
    noteEn: rebateEligible
      ? `Eligible for rebate (${safeDays} days >= ${minDays}-day minimum policy): ₹${Math.round(rebatePaise / 100)}.`
      : `Leave below ${minDays} consecutive days (${safeDays}d) will be logged for attendance without fee rebate.`,
    noteHi: rebateEligible
      ? `छूट के लिए पात्र (${safeDays} दिन >= ${minDays} दिन नियम): ₹${Math.round(rebatePaise / 100)}।`
      : `${minDays} से कम लगातार दिनों (${safeDays} दिन) पर शुल्क छूट लागू नहीं होगी, केवल अनुपस्थिति दर्ज होगी।`,
  };
}

export interface RationIndentRow {
  ingredientName: string;
  requiredQty: number;
  onHandQty: number;
  toIssueQty: number;
  shortfallQty: number;
  unit: string;
}

export function computeDailyRationIndent(params: {
  menus: readonly Pick<MenuPlanDoc, "title" | "dishes" | "expectedServings">[];
  recipes: readonly Pick<RecipeDoc, "name" | "servings" | "ingredients">[];
  inventoryItems: readonly Pick<InventoryItemDoc, "name" | "quantity" | "unit">[];
}): RationIndentRow[] {
  const needMap = new Map<string, { qty: number; unit: string }>();

  for (const menu of params.menus) {
    const servings = Math.max(0, menu.expectedServings);
    if (!servings) continue;
    const textPool = `${menu.title} ${menu.dishes.join(" ")}`.toLowerCase();
    for (const recipe of params.recipes) {
      const recipeWords = recipe.name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3);
      const matched =
        textPool.includes(recipe.name.toLowerCase()) ||
        recipeWords.some((word) => textPool.includes(word));
      if (!matched) continue;
      const factor = servings / Math.max(1, recipe.servings);
      for (const ing of recipe.ingredients) {
        const key = ing.name.trim().toLowerCase();
        const prev = needMap.get(key) ?? { qty: 0, unit: ing.unit };
        needMap.set(key, {
          qty: Number((prev.qty + ing.quantity * factor).toFixed(2)),
          unit: prev.unit || ing.unit,
        });
      }
    }
  }

  return [...needMap.entries()].map(([key, req]) => {
    const stockMatch = params.inventoryItems.find(
      (inv) =>
        inv.name.trim().toLowerCase().includes(key) || key.includes(inv.name.trim().toLowerCase()),
    );
    const onHandQty = stockMatch ? Number(stockMatch.quantity.toFixed(2)) : 0;
    const toIssueQty = Number(Math.min(req.qty, onHandQty).toFixed(2));
    const shortfallQty = Number(Math.max(0, req.qty - onHandQty).toFixed(2));
    return {
      ingredientName: stockMatch?.name ?? key.replace(/\b\w/g, (m) => m.toUpperCase()),
      requiredQty: req.qty,
      onHandQty,
      toIssueQty,
      shortfallQty,
      unit: stockMatch?.unit ?? req.unit,
    };
  });
}

export interface VendorSpendRow {
  supplierName: string;
  orderCount: number;
  totalPaise: number;
  pendingCount: number;
  inventoryValuePaise: number;
  varianceStatus: "steady" | "elevated";
}

export function computeVendorPriceVariance(params: {
  purchaseOrders: readonly Pick<PurchaseOrderDoc, "supplierName" | "totalPaise" | "status">[];
  inventoryItems: readonly Pick<InventoryItemDoc, "supplierName" | "quantity" | "unitCostPaise">[];
}): VendorSpendRow[] {
  const byVendor = new Map<string, VendorSpendRow>();

  for (const item of params.inventoryItems) {
    const key = item.supplierName || "General Supplier";
    const cur = byVendor.get(key) ?? {
      supplierName: key,
      orderCount: 0,
      totalPaise: 0,
      pendingCount: 0,
      inventoryValuePaise: 0,
      varianceStatus: "steady" as const,
    };
    cur.inventoryValuePaise += Math.round(item.quantity * item.unitCostPaise);
    byVendor.set(key, cur);
  }

  for (const po of params.purchaseOrders) {
    const key = po.supplierName || "General Supplier";
    const cur = byVendor.get(key) ?? {
      supplierName: key,
      orderCount: 0,
      totalPaise: 0,
      pendingCount: 0,
      inventoryValuePaise: 0,
      varianceStatus: "steady" as const,
    };
    cur.orderCount += 1;
    cur.totalPaise += po.totalPaise;
    if (po.status === "Pending" || po.status === "Ordered") {
      cur.pendingCount += 1;
    }
    if (cur.inventoryValuePaise > 0 && po.totalPaise > cur.inventoryValuePaise * 1.15) {
      cur.varianceStatus = "elevated";
    }
    byVendor.set(key, cur);
  }

  return [...byVendor.values()].sort((a, b) => b.totalPaise - a.totalPaise);
}

export interface CycleMenuTemplateEntry {
  dayOffset: number;
  mealType: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
  title: string;
  dishes: string[];
  expectedServings: number;
  plateCostPaise: number;
  allergens: string[];
}

export const CYCLE_MENU_PRESETS: Record<"A" | "B", CycleMenuTemplateEntry[]> = {
  A: [
    {
      dayOffset: 0,
      mealType: "Breakfast",
      title: "Poha, Jalebi & Sprouts",
      dishes: ["Kanda Poha", "Sprouts Chaat", "Masala Chai"],
      expectedServings: 420,
      plateCostPaise: 3200,
      allergens: ["Peanuts", "Dairy"],
    },
    {
      dayOffset: 0,
      mealType: "Lunch",
      title: "Rajma Chawal & Jeera Aloo",
      dishes: ["Rajma Masala", "Steamed Rice", "Jeera Aloo", "Boondi Raita"],
      expectedServings: 680,
      plateCostPaise: 5800,
      allergens: ["Dairy"],
    },
    {
      dayOffset: 0,
      mealType: "Dinner",
      title: "Paneer Butter Masala & Tandoori Roti",
      dishes: ["Paneer Butter Masala", "Dal Tadka", "Tawa Roti", "Green Salad"],
      expectedServings: 610,
      plateCostPaise: 6600,
      allergens: ["Dairy", "Gluten"],
    },
    {
      dayOffset: 1,
      mealType: "Breakfast",
      title: "Aloo Paratha & Curd",
      dishes: ["Aloo Paratha", "Curd", "Mango Pickle", "Tea"],
      expectedServings: 430,
      plateCostPaise: 3500,
      allergens: ["Dairy", "Gluten"],
    },
    {
      dayOffset: 1,
      mealType: "Lunch",
      title: "Kadhi Pakora & Rice",
      dishes: ["Kadhi Pakora", "Bhindi Fry", "Steamed Rice", "Papad"],
      expectedServings: 670,
      plateCostPaise: 5400,
      allergens: ["Dairy", "Gluten"],
    },
  ],
  B: [
    {
      dayOffset: 0,
      mealType: "Breakfast",
      title: "Idli Sambar & Coconut Chutney",
      dishes: ["Steamed Idli", "Toor Dal Sambar", "Coconut Chutney", "Filter Coffee"],
      expectedServings: 440,
      plateCostPaise: 3100,
      allergens: ["Dairy"],
    },
    {
      dayOffset: 0,
      mealType: "Lunch",
      title: "Chole, Jeera Rice & Bhindi Masala",
      dishes: ["Punjabi Chole", "Jeera Rice", "Bhindi Masala", "Cucumber Raita"],
      expectedServings: 690,
      plateCostPaise: 5900,
      allergens: ["Dairy"],
    },
    {
      dayOffset: 0,
      mealType: "Dinner",
      title: "Palak Paneer & Dal Makhani",
      dishes: ["Palak Paneer", "Dal Makhani", "Phulka", "Kheer"],
      expectedServings: 620,
      plateCostPaise: 6800,
      allergens: ["Dairy", "Gluten"],
    },
    {
      dayOffset: 1,
      mealType: "Breakfast",
      title: "Masala Dosa & Vada",
      dishes: ["Masala Dosa", "Medu Vada", "Sambar", "Chai"],
      expectedServings: 450,
      plateCostPaise: 3800,
      allergens: [],
    },
    {
      dayOffset: 1,
      mealType: "Lunch",
      title: "Mix Veg Pulao & Dal Fry",
      dishes: ["Mix Veg Pulao", "Dal Fry", "Baingan Bharta", "Buttermilk"],
      expectedServings: 660,
      plateCostPaise: 5200,
      allergens: ["Dairy"],
    },
  ],
};
