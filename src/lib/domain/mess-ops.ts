export type PdfRole =
  | "super_admin"
  | "mess_admin"
  | "kitchen_head"
  | "store_keeper"
  | "accountant"
  | "warden"
  | "counter_staff"
  | "student";

export type MealSlot = "breakfast" | "lunch" | "snacks" | "dinner";

export interface FinancialSummary {
  totalPayablePaise: number;
  ingredientCostPaise: number;
  wasteCostPaise: number;
  gstPaise: number;
}

export interface RedactedFinancialSummary {
  visible: boolean;
  totalPayablePaise: number | null;
  ingredientCostPaise: number | null;
  wasteCostPaise: number | null;
  gstPaise: number | null;
  notice?: string;
}

const FINANCIAL_ROLES = new Set<PdfRole>(["super_admin", "mess_admin", "accountant"]);

export function canRoleViewFinancials(role: PdfRole): boolean {
  return FINANCIAL_ROLES.has(role);
}

export function canRoleApproveHighValuePO(role: PdfRole, totalPaise: number): boolean {
  if (totalPaise < 0 || !Number.isFinite(totalPaise)) return false;
  if (totalPaise <= 1_000_000) {
    return role === "super_admin" || role === "mess_admin" || role === "store_keeper";
  }
  if (totalPaise <= 5_000_000) {
    return role === "super_admin" || role === "mess_admin";
  }
  return role === "super_admin";
}

export function evaluatePurchaseOrderApproval(totalPaise: number): {
  tier: "standard" | "mess_admin" | "executive_escalation";
  approverLabel: string;
} {
  if (totalPaise <= 1_000_000) {
    return { tier: "standard", approverLabel: "Store Keeper or Mess Admin (<= Rs. 10,000)" };
  }
  if (totalPaise <= 5_000_000) {
    return { tier: "mess_admin", approverLabel: "Mess Admin sign-off (Rs. 10,001 - Rs. 50,000)" };
  }
  return {
    tier: "executive_escalation",
    approverLabel: "Super Admin + Finance dual sign-off (> Rs. 50,000)",
  };
}

export function requiresWriteOffEscalation(writeOffPaise: number): boolean {
  return writeOffPaise > 200_000;
}

export function redactFinancialsForRole(
  role: PdfRole,
  summary: FinancialSummary,
): RedactedFinancialSummary {
  if (canRoleViewFinancials(role)) {
    return {
      visible: true,
      ...summary,
    };
  }
  return {
    visible: false,
    totalPayablePaise: null,
    ingredientCostPaise: null,
    wasteCostPaise: null,
    gstPaise: null,
    notice:
      role === "warden"
        ? "Financial figures are redacted for the Warden role (counts, feedback, and meal operations remain accessible)."
        : "Financial figures restricted for this role.",
  };
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function toISTParts(date: Date): {
  dateKey: string;
  hour: number;
  minute: number;
  minutesSinceMidnight: number;
} {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  return {
    dateKey: `${year}-${month}-${day}`,
    hour,
    minute,
    minutesSinceMidnight: hour * 60 + minute,
  };
}

export function formatISTDateKey(date: Date): string {
  return toISTParts(date).dateKey;
}

function parseDateKeyUTCStart(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid IST dateKey: ${dateKey}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Midnight IST expressed in UTC ms
  return Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MS;
}

/** Cut-off timestamp in UTC epoch ms for modifying a given meal slot on an IST dateKey. */
export function getMealCutoffEpochMs(mealType: MealSlot, serviceDateIST: string): number {
  const midnightIstUtcMs = parseDateKeyUTCStart(serviceDateIST);
  switch (mealType) {
    case "breakfast":
      // 21:00 IST on the previous day (-3 hours from midnight)
      return midnightIstUtcMs - 3 * 60 * 60 * 1000;
    case "lunch":
      // 09:00 IST on service date
      return midnightIstUtcMs + 9 * 60 * 60 * 1000;
    case "snacks":
      // 14:00 IST on service date
      return midnightIstUtcMs + 14 * 60 * 60 * 1000;
    case "dinner":
      // 16:30 IST on service date
      return midnightIstUtcMs + (16 * 60 + 30) * 60 * 1000;
  }
}

export function canModifyMealSelection(
  mealType: MealSlot,
  serviceDateIST: string,
  now: Date = new Date(),
): { allowed: boolean; cutoffIstLabel: string; minutesRemaining: number } {
  const cutoffMs = getMealCutoffEpochMs(mealType, serviceDateIST);
  const diffMs = cutoffMs - now.getTime();
  const cutoffLabels: Record<MealSlot, string> = {
    breakfast: "21:00 IST (prev day)",
    lunch: "09:00 IST",
    snacks: "14:00 IST",
    dinner: "16:30 IST",
  };
  return {
    allowed: diffMs > 0,
    cutoffIstLabel: cutoffLabels[mealType],
    minutesRemaining: Math.max(0, Math.floor(diffMs / 60000)),
  };
}

export function computeEffectiveAttendanceCount(params: {
  bookedCount: number;
  skippedCount: number;
  guestCount: number;
}): number {
  const booked = Math.max(0, Math.round(params.bookedCount));
  const skipped = Math.max(0, Math.min(booked, Math.round(params.skippedCount)));
  const guests = Math.max(0, Math.round(params.guestCount));
  return booked - skipped + guests;
}

export interface MonthlyBillInput {
  planMonthlyPaise: number;
  daysInMonth: number;
  activeDays: number;
  approvedLeaveDays: number;
  perDayRebatePaise: number;
  guestMealCount: number;
  guestMealUnitPaise: number;
  creditNotesPaise?: number;
  debitNotesPaise?: number;
  lateFeePaise?: number;
  gstRateBps?: number;
}

export interface MonthlyBillBreakdown {
  baseProratedPaise: number;
  leaveRebatePaise: number;
  guestChargesPaise: number;
  creditNotesPaise: number;
  debitNotesPaise: number;
  lateFeePaise: number;
  taxableSubtotalPaise: number;
  gstPaise: number;
  totalPayablePaise: number;
}

export function computeMonthlyMessBillPaise(input: MonthlyBillInput): MonthlyBillBreakdown {
  const safeDaysInMonth = Math.max(1, Math.round(input.daysInMonth));
  const safeActiveDays = Math.max(0, Math.min(safeDaysInMonth, Math.round(input.activeDays)));
  const safeLeaveDays = Math.max(0, Math.min(safeActiveDays, Math.round(input.approvedLeaveDays)));
  const safeGuests = Math.max(0, Math.round(input.guestMealCount));

  const baseProratedPaise = Math.round((input.planMonthlyPaise * safeActiveDays) / safeDaysInMonth);
  const leaveRebatePaise = safeLeaveDays * Math.max(0, Math.round(input.perDayRebatePaise));
  const guestChargesPaise = safeGuests * Math.max(0, Math.round(input.guestMealUnitPaise));
  const creditNotesPaise = Math.max(0, Math.round(input.creditNotesPaise ?? 0));
  const debitNotesPaise = Math.max(0, Math.round(input.debitNotesPaise ?? 0));
  const lateFeePaise = Math.max(0, Math.round(input.lateFeePaise ?? 0));
  const gstRateBps = Math.max(0, Math.round(input.gstRateBps ?? 0));

  const rawTaxable =
    baseProratedPaise -
    leaveRebatePaise +
    guestChargesPaise +
    debitNotesPaise +
    lateFeePaise -
    creditNotesPaise;
  const taxableSubtotalPaise = Math.max(0, rawTaxable);
  const gstPaise = Math.round((taxableSubtotalPaise * gstRateBps) / 10_000);
  const totalPayablePaise = taxableSubtotalPaise + gstPaise;

  return {
    baseProratedPaise,
    leaveRebatePaise,
    guestChargesPaise,
    creditNotesPaise,
    debitNotesPaise,
    lateFeePaise,
    taxableSubtotalPaise,
    gstPaise,
    totalPayablePaise,
  };
}

export interface RecipeIngredientSpec {
  name: string;
  baseQty: number;
  unit: string;
  yieldPercent?: number;
}

export interface ScaledIngredientResult {
  name: string;
  netRequiredQty: number;
  grossPurchaseQty: number;
  unit: string;
  yieldPercent: number;
}

export function scaleRecipeIngredients(params: {
  baseServings: number;
  targetServings: number;
  ingredients: RecipeIngredientSpec[];
}): ScaledIngredientResult[] {
  const safeBase = Math.max(1, params.baseServings);
  const safeTarget = Math.max(0, params.targetServings);
  const factor = safeTarget / safeBase;

  return params.ingredients.map((item) => {
    const yieldPct = Math.min(100, Math.max(10, item.yieldPercent ?? 100));
    const netRequiredQty = Math.round(item.baseQty * factor * 1000) / 1000;
    const grossPurchaseQty = Math.round((netRequiredQty / (yieldPct / 100)) * 1000) / 1000;
    return {
      name: item.name,
      netRequiredQty,
      grossPurchaseQty,
      unit: item.unit,
      yieldPercent: yieldPct,
    };
  });
}

export interface StockBatch {
  batchId: string;
  quantity: number;
  expiryDate: string | null;
}

export interface FefoAllocationResult {
  allocations: { batchId: string; deducted: number; expiryDate: string | null }[];
  totalAllocated: number;
  shortfall: number;
}

export function allocateFefoBatches(
  batches: readonly StockBatch[],
  requiredQty: number,
): FefoAllocationResult {
  let remaining = Math.max(0, requiredQty);
  const sorted = [...batches]
    .filter((b) => b.quantity > 0)
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });

  const allocations: { batchId: string; deducted: number; expiryDate: string | null }[] = [];
  let totalAllocated = 0;

  for (const batch of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    if (take > 0) {
      allocations.push({
        batchId: batch.batchId,
        deducted: Math.round(take * 1000) / 1000,
        expiryDate: batch.expiryDate,
      });
      totalAllocated = Math.round((totalAllocated + take) * 1000) / 1000;
      remaining = Math.round((remaining - take) * 1000) / 1000;
    }
  }

  return {
    allocations,
    totalAllocated,
    shortfall: Math.max(0, Math.round(remaining * 1000) / 1000),
  };
}

export function generateDynamicDiningPassToken(
  studentCode: string,
  hallCode: string,
  nowMs: number = Date.now(),
): { token: string; expiresInSeconds: number; windowIndex: number } {
  const windowSeconds = 60;
  const epochSeconds = Math.floor(nowMs / 1000);
  const windowIndex = Math.floor(epochSeconds / windowSeconds);
  const expiresInSeconds = windowSeconds - (epochSeconds % windowSeconds);

  const seed = `${studentCode.toUpperCase()}:${hallCode.toUpperCase()}:${windowIndex}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const digest = (hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  const cleanStudent =
    studentCode
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 8) || "STU";
  return {
    token: `FF-${cleanStudent}-${digest}`,
    expiresInSeconds,
    windowIndex,
  };
}
