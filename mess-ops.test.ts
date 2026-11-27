import test from "node:test";
import assert from "node:assert/strict";
import {
  allocateFefoBatches,
  canModifyMealSelection,
  canRoleApproveHighValuePO,
  computeEffectiveAttendanceCount,
  computeMonthlyMessBillPaise,
  evaluatePurchaseOrderApproval,
  formatISTDateKey,
  generateDynamicDiningPassToken,
  redactFinancialsForRole,
  requiresWriteOffEscalation,
  scaleRecipeIngredients,
} from "./src/lib/domain/mess-ops";

test("Warden financial redaction hides Rupee amounts while Accountants see full paise totals", () => {
  const raw = {
    totalPayablePaise: 404000,
    ingredientCostPaise: 120000,
    wasteCostPaise: 18500,
    gstPaise: 20200,
  };
  const wardenView = redactFinancialsForRole("warden", raw);
  assert.equal(wardenView.visible, false);
  assert.equal(wardenView.totalPayablePaise, null);
  assert.equal(wardenView.wasteCostPaise, null);

  const accountantView = redactFinancialsForRole("accountant", raw);
  assert.equal(accountantView.visible, true);
  assert.equal(accountantView.totalPayablePaise, 404000);
});

test("IST cut-off locks lunch after 09:00 IST and dinner after 16:30 IST", () => {
  // 2026-11-25 08:30 IST === 2026-11-25T03:00:00Z
  const beforeLunchCutoff = new Date("2026-11-25T03:00:00Z");
  assert.equal(formatISTDateKey(beforeLunchCutoff), "2026-11-25");
  assert.equal(canModifyMealSelection("lunch", "2026-11-25", beforeLunchCutoff).allowed, true);

  // 2026-11-25 09:05 IST === 2026-11-25T03:35:00Z
  const afterLunchCutoff = new Date("2026-11-25T03:35:00Z");
  assert.equal(canModifyMealSelection("lunch", "2026-11-25", afterLunchCutoff).allowed, false);
  assert.equal(canModifyMealSelection("dinner", "2026-11-25", afterLunchCutoff).allowed, true);
});

test("Effective kitchen attendance equals booked - skipped + guest meals", () => {
  assert.equal(
    computeEffectiveAttendanceCount({ bookedCount: 500, skippedCount: 45, guestCount: 12 }),
    467,
  );
  assert.equal(
    computeEffectiveAttendanceCount({ bookedCount: 20, skippedCount: 50, guestCount: 3 }),
    3,
  );
});

test("Monthly mess bill uses integer paise arithmetic with proration, leave rebate, guests, and GST", () => {
  const bill = computeMonthlyMessBillPaise({
    planMonthlyPaise: 420000,
    daysInMonth: 30,
    activeDays: 30,
    approvedLeaveDays: 4,
    perDayRebatePaise: 8500,
    guestMealCount: 2,
    guestMealUnitPaise: 9000,
    creditNotesPaise: 5000,
    debitNotesPaise: 0,
    lateFeePaise: 0,
    gstRateBps: 500, // 5%
  });
  // 420000 - 34000 + 18000 - 5000 = 399000 taxable; 5% GST = 19950; total = 418950
  assert.equal(bill.taxableSubtotalPaise, 399000);
  assert.equal(bill.gstPaise, 19950);
  assert.equal(bill.totalPayablePaise, 418950);
});

test("Recipe yield scaling increases gross purchase quantity by yield/loss factor", () => {
  const scaled = scaleRecipeIngredients({
    baseServings: 100,
    targetServings: 250,
    ingredients: [{ name: "Raw Potatoes", baseQty: 10, unit: "kg", yieldPercent: 80 }],
  });
  assert.equal(scaled[0]?.netRequiredQty, 25);
  assert.equal(scaled[0]?.grossPurchaseQty, 31.25);
});

test("FEFO batch allocator consumes earliest-expiring stock first", () => {
  const result = allocateFefoBatches(
    [
      { batchId: "B-LATE", quantity: 20, expiryDate: "2026-12-10" },
      { batchId: "B-SOON", quantity: 12, expiryDate: "2026-11-27" },
      { batchId: "B-NONE", quantity: 15, expiryDate: null },
    ],
    25,
  );
  assert.equal(result.allocations[0]?.batchId, "B-SOON");
  assert.equal(result.allocations[0]?.deducted, 12);
  assert.equal(result.allocations[1]?.batchId, "B-LATE");
  assert.equal(result.allocations[1]?.deducted, 13);
  assert.equal(result.shortfall, 0);
});

test("PO approval matrix and write-off thresholds match PDF governance tiers", () => {
  assert.equal(evaluatePurchaseOrderApproval(950_000).tier, "standard");
  assert.equal(evaluatePurchaseOrderApproval(2_400_000).tier, "mess_admin");
  assert.equal(evaluatePurchaseOrderApproval(7_500_000).tier, "executive_escalation");
  assert.equal(canRoleApproveHighValuePO("store_keeper", 2_400_000), false);
  assert.equal(canRoleApproveHighValuePO("mess_admin", 2_400_000), true);
  assert.equal(canRoleApproveHighValuePO("mess_admin", 7_500_000), false);
  assert.equal(canRoleApproveHighValuePO("super_admin", 7_500_000), true);
  assert.equal(requiresWriteOffEscalation(200_000), false);
  assert.equal(requiresWriteOffEscalation(200_100), true);
});

test("Dynamic QR dining pass rotates every 60 seconds deterministically", () => {
  const passA = generateDynamicDiningPassToken("21CS042", "NORTH", 1_700_000_010_000);
  const passSameWindow = generateDynamicDiningPassToken("21CS042", "NORTH", 1_700_000_025_000);
  const passNextWindow = generateDynamicDiningPassToken("21CS042", "NORTH", 1_700_000_070_000);
  assert.equal(passA.token, passSameWindow.token);
  assert.notEqual(passA.token, passNextWindow.token);
  assert.ok(passA.expiresInSeconds >= 1 && passA.expiresInSeconds <= 60);
});
