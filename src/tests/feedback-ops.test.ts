import { describe, expect, it } from "vitest";
import {
  analyzeDishQualityLoop,
  checkFeedbackEligibility,
  computeComplaintSlaDeadline,
  computeDailyRationIndent,
  computeVendorPriceVariance,
  CYCLE_MENU_PRESETS,
  evaluateLeaveRebateEligibility,
  formatSlaRemaining,
  moderateFeedbackContent,
  normalizeComplaintPriorityAndEscalation,
} from "@/lib/domain/feedback-ops";

describe("FoodFlow Feedback Gating, Moderation, SLA & Hostel Mess Operations", () => {
  it("gates 1-tap meal ratings strictly to checked-in students within 24h and prevents duplicates", () => {
    const now = new Date("2026-11-26T14:00:00+05:30").getTime();

    const notCheckedIn = checkFeedbackEligibility({
      attendanceRecords: [],
      existingFeedback: [],
      userId: "u1",
      studentCode: "ST-1042",
      serviceDate: "2026-11-26",
      mealType: "Lunch",
      nowMs: now,
    });
    expect(notCheckedIn.eligible).toBe(false);
    expect(notCheckedIn.reasonCode).toBe("not_checked_in");

    const checkedInValid = checkFeedbackEligibility({
      attendanceRecords: [
        {
          studentCode: "ST-1042",
          mealType: "Lunch",
          serviceDate: "2026-11-26",
          servedAt: "2026-11-26T12:45:00+05:30",
        },
      ],
      existingFeedback: [],
      userId: "u1",
      studentCode: "ST-1042",
      serviceDate: "2026-11-26",
      mealType: "Lunch",
      nowMs: now,
    });
    expect(checkedInValid.eligible).toBe(true);
    expect(checkedInValid.reasonCode).toBe("ok");

    const expired = checkFeedbackEligibility({
      attendanceRecords: [
        {
          studentCode: "ST-1042",
          mealType: "Lunch",
          serviceDate: "2026-11-25",
          servedAt: "2026-11-25T12:00:00+05:30",
        },
      ],
      existingFeedback: [],
      userId: "u1",
      studentCode: "ST-1042",
      serviceDate: "2026-11-25",
      mealType: "Lunch",
      nowMs: now,
    });
    expect(expired.eligible).toBe(false);
    expect(expired.reasonCode).toBe("window_expired");

    const duplicate = checkFeedbackEligibility({
      attendanceRecords: [
        {
          studentCode: "ST-1042",
          mealType: "Lunch",
          serviceDate: "2026-11-26",
          servedAt: "2026-11-26T12:45:00+05:30",
        },
      ],
      existingFeedback: [{ userId: "u1", serviceDate: "2026-11-26", mealType: "Lunch" }],
      userId: "u1",
      studentCode: "ST-1042",
      serviceDate: "2026-11-26",
      mealType: "Lunch",
      nowMs: now,
    });
    expect(duplicate.eligible).toBe(false);
    expect(duplicate.reasonCode).toBe("already_rated");
  });

  it("flags abusive English and Hindi terms for moderation queue while approving constructive text", () => {
    expect(moderateFeedbackContent("Dal tadka was too salty today, please reduce salt.")).toEqual({
      moderationStatus: "approved",
      matchedTerms: [],
    });

    const flagged = moderateFeedbackContent("This food is total bakwas and shit");
    expect(flagged.moderationStatus).toBe("flagged");
    expect(flagged.matchedTerms.length).toBeGreaterThan(0);
  });

  it("auto-escalates Hygiene complaints to Admin + Warden with 4h SLA timer", () => {
    const escalated = normalizeComplaintPriorityAndEscalation("Hygiene", "low");
    expect(escalated.priority).toBe("high");
    expect(escalated.autoEscalated).toBe(true);
    expect(escalated.escalatedToRoles).toEqual(["admin", "warden"]);

    const createdIso = "2026-11-26T08:00:00.000Z";
    const deadlineIso = computeComplaintSlaDeadline(createdIso, escalated.priority);
    expect(new Date(deadlineIso).getTime() - new Date(createdIso).getTime()).toBe(4 * 3_600_000);

    const remaining = formatSlaRemaining(
      deadlineIso,
      "open",
      new Date("2026-11-26T10:30:00.000Z").getTime(),
    );
    expect(remaining.overdue).toBe(false);
    expect(remaining.label).toBe("1h 30m left");

    const overdue = formatSlaRemaining(
      deadlineIso,
      "in_progress",
      new Date("2026-11-26T13:15:00.000Z").getTime(),
    );
    expect(overdue.overdue).toBe(true);
    expect(overdue.tone).toBe("red");
  });

  it("computes dish quality loop, best/worst dishes, and menu flags (<3.0 review, >=4.2 favorite)", () => {
    const summary = analyzeDishQualityLoop({
      todayDateKey: "2026-11-26",
      feedbackList: [
        {
          id: "f1",
          workspaceId: "ws1",
          userId: "u1",
          studentName: "Anonymous Student",
          mealType: "Lunch",
          serviceDate: "2026-11-26",
          rating: 5,
          category: "taste",
          isAnonymous: true,
          moderationStatus: "approved",
          dishRatings: [
            { dish: "Paneer Butter Masala", rating: 5 },
            { dish: "Dal Tadka", rating: 2 },
          ],
          comment: "Paneer great, dal watery",
          status: "open",
          createdBy: "u1",
        },
        {
          id: "f2",
          workspaceId: "ws1",
          userId: "u2",
          studentName: "Riya",
          mealType: "Lunch",
          serviceDate: "2026-11-26",
          rating: 4,
          category: "taste",
          moderationStatus: "approved",
          dishRatings: [
            { dish: "Paneer Butter Masala", rating: 4 },
            { dish: "Dal Tadka", rating: 2 },
          ],
          comment: "Good",
          status: "open",
          createdBy: "u2",
        },
      ],
      complaints: [
        {
          id: "c1",
          workspaceId: "ws1",
          userId: "u1",
          studentName: "Aarav",
          category: "Hygiene",
          subject: "Tray wet",
          description: "Counter trays wet",
          priority: "high",
          status: "open",
          escalatedToRoles: ["admin", "warden"],
          createdBy: "u1",
        },
      ],
    });

    expect(summary.avgRatingToday).toBe(4.5);
    expect(summary.bestDish?.dish).toBe("Paneer Butter Masala");
    expect(summary.bestDish?.status).toBe("favorite");
    expect(summary.worstDish?.dish).toBe("Dal Tadka");
    expect(summary.worstDish?.status).toBe("needs_review");
    expect(summary.lowRatedDishesNeedingReview).toHaveLength(1);
    expect(summary.escalatedCount).toBe(1);
  });

  it("enforces minimum consecutive leave days for mess fee rebates", () => {
    const shortLeave = evaluateLeaveRebateEligibility({
      days: 2,
      minRebateDays: 3,
      perDayRebatePaise: 8500,
    });
    expect(shortLeave.rebateEligible).toBe(false);
    expect(shortLeave.rebatePaise).toBe(0);

    const eligibleLeave = evaluateLeaveRebateEligibility({
      days: 4,
      minRebateDays: 3,
      perDayRebatePaise: 8500,
    });
    expect(eligibleLeave.rebateEligible).toBe(true);
    expect(eligibleLeave.rebatePaise).toBe(34000);
  });

  it("computes daily dry-store ration indent, vendor spend variance, and cycle presets", () => {
    const indent = computeDailyRationIndent({
      menus: [
        { title: "Dal Tadka & Rice", dishes: ["Dal Tadka", "Steamed Rice"], expectedServings: 200 },
      ],
      recipes: [
        {
          name: "Dal Tadka",
          servings: 100,
          ingredients: [
            { name: "Toor dal", quantity: 10, unit: "kg" },
            { name: "Sunflower oil", quantity: 2, unit: "L" },
          ],
        },
      ],
      inventoryItems: [
        { name: "Toor dal", quantity: 14, unit: "kg" },
        { name: "Sunflower oil", quantity: 10, unit: "L" },
      ],
    });

    const dal = indent.find((r) => r.ingredientName === "Toor dal");
    expect(dal?.requiredQty).toBe(20);
    expect(dal?.toIssueQty).toBe(14);
    expect(dal?.shortfallQty).toBe(6);

    const variance = computeVendorPriceVariance({
      purchaseOrders: [{ supplierName: "Daily Harvest", totalPaise: 250000, status: "Ordered" }],
      inventoryItems: [{ supplierName: "Daily Harvest", quantity: 10, unitCostPaise: 10000 }],
    });
    expect(variance[0]?.varianceStatus).toBe("elevated");
    expect(CYCLE_MENU_PRESETS.A.length).toBeGreaterThanOrEqual(4);
    expect(CYCLE_MENU_PRESETS.B.length).toBeGreaterThanOrEqual(4);
  });
});
