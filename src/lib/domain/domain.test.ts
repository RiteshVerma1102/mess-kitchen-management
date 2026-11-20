import { describe, expect, it } from "vitest";
import { z } from "zod";

import { formatINR, formatINRCompact, formatNumber, formatPercent, toDateKey } from "./format";
import { convert } from "./units";
import { costPerPlate, monthlyBill, purchaseSuggestions, recipeCostPerServing, scaleRecipe, wasteRatio } from "./costing";
import { forecastDemand, mape, type DayActual } from "./forecast";
import { csvToObjects, parseCSV, toCSV, validateRows } from "./csv";
import { accessFor, canRead, canWrite } from "./permissions";

const days = (n: number, end: string, f: (d: Date) => number): DayActual[] => {
  const out: DayActual[] = [];
  const e = new Date(`${end}T00:00:00Z`);
  for (let i = 1; i <= n; i++) {
    const d = new Date(e);
    d.setUTCDate(e.getUTCDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), served: f(d) });
  }
  return out;
};

describe("Indian formatting", () => {
  it("groups rupees in lakhs", () => expect(formatINR(1234567.5)).toBe("₹12,34,567.50"));
  it("compacts lakhs", () => expect(formatINRCompact(447000)).toBe("₹4.47L"));
  it("compacts crores", () => expect(formatINRCompact(12000000)).toBe("₹1.2Cr"));
  it("groups numbers en-IN", () => expect(formatNumber(1234567)).toBe("12,34,567"));
  it("formats percent", () => expect(formatPercent(0.062)).toBe("6.2%"));
  it("uses Asia/Kolkata for date keys", () => expect(toDateKey(new Date("2026-11-18T20:00:00Z"))).toBe("2026-11-19"));
});

describe("units", () => {
  it("kg → g", () => expect(convert(1.5, "kg", "g")).toBe(1500));
  it("dozen → pcs", () => expect(convert(2, "dozen", "pcs")).toBe(24));
  it("rejects mass → volume", () => expect(() => convert(1, "kg", "l")).toThrow());
});

describe("costing", () => {
  const dal = [
    { itemId: "toor", quantityPerServing: 60, unit: "g" as const, itemUnit: "kg" as const, unitCost: 140 },
    { itemId: "ghee", quantityPerServing: 5, unit: "ml" as const, itemUnit: "l" as const, unitCost: 600 },
  ];
  it("cost per serving converts units", () => expect(recipeCostPerServing(dal)).toBe(11.4));
  it("scales to headcount in stock units", () =>
    expect(scaleRecipe(dal, 500)[0]).toEqual({ itemId: "toor", unit: "kg", quantity: 30 }));
  it("cost per plate", () => expect(costPerPlate(34200, 500)).toBe(68.4));
  it("cost per plate is 0 with no plates", () => expect(costPerPlate(100, 0)).toBe(0));
  it("waste ratio", () => expect(wasteRatio(200, 12.4)).toBeCloseTo(0.062));
  it("purchase = need × 1.1 − stock, rounded up to pack", () =>
    expect(purchaseSuggestions([{ itemId: "rice", required: 100, inStock: 30, packSize: 25 }], 0.1)).toEqual([
      { itemId: "rice", toOrder: 100 },
    ]));
  it("drops items already covered by stock", () =>
    expect(purchaseSuggestions([{ itemId: "salt", required: 10, inStock: 50 }])).toEqual([]));
  it("monthly bill with 5% GST", () =>
    expect(monthlyBill({ mealsEaten: 84, ratePerMeal: 45, extras: 120, gstPercent: 5 })).toEqual({
      subtotal: 3900,
      gst: 195,
      total: 4095,
    }));
});

describe("forecast", () => {
  it("steady history predicts the same headcount", () => {
    const r = forecastDemand({ targetDate: "2026-11-20", history: days(28, "2026-11-20", () => 400) });
    expect(r.predicted).toBe(400);
    expect(r.confidence).toBeGreaterThan(0.9);
  });
  it("applies calendar impact (exam week 0.8)", () => {
    const r = forecastDemand({
      targetDate: "2026-11-20",
      history: days(28, "2026-11-20", () => 400),
      calendar: [{ start: "2026-11-20", end: "2026-11-27", impactFactor: 0.8 }],
    });
    expect(r.predicted).toBe(320);
  });
  it("subtracts approved leaves", () => {
    const r = forecastDemand({ targetDate: "2026-11-20", history: days(28, "2026-11-20", () => 400), approvedLeaves: 25 });
    expect(r.predicted).toBe(375);
  });
  it("learns weekday seasonality (Sundays are quieter)", () => {
    const hist = days(28, "2026-11-22", (d) => (d.getUTCDay() === 0 ? 200 : 400));
    const sunday = forecastDemand({ targetDate: "2026-11-22", history: hist }); // 22 Nov 2026 is a Sunday
    const monday = forecastDemand({ targetDate: "2026-11-23", history: hist });
    expect(sunday.predicted).toBeLessThan(260);
    expect(monday.predicted).toBeGreaterThan(370);
  });
  it("never exceeds active students", () => {
    const r = forecastDemand({ targetDate: "2026-11-20", history: days(28, "2026-11-20", () => 400), activeStudents: 350 });
    expect(r.predicted).toBe(350);
  });
  it("falls back to active students with no history", () => {
    const r = forecastDemand({ targetDate: "2026-11-20", history: [], activeStudents: 300 });
    expect(r).toMatchObject({ predicted: 300, confidence: 0 });
  });
  it("MAPE", () => expect(mape([{ actual: 100, predicted: 90 }, { actual: 200, predicted: 220 }])).toBeCloseTo(0.1));
});

describe("csv", () => {
  it("handles quotes, commas and CRLF", () =>
    expect(parseCSV('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]));
  it("validates rows and reports errors with row numbers", () => {
    const rows = csvToObjects("Student Code,Full Name\nS1,Asha\n,Ravi\n");
    const { valid, errors } = validateRows(rows, z.object({ student_code: z.string().min(1), full_name: z.string() }));
    expect(valid).toHaveLength(1);
    expect(errors[0]?.row).toBe(2);
  });
  it("round-trips export", () =>
    expect(toCSV([{ n: "Dal, tadka", q: 2 }], [{ key: "n", label: "Dish" }, { key: "q", label: "Qty" }])).toBe(
      'Dish,Qty\r\n"Dal, tadka",2',
    ));
});

describe("permission matrix", () => {
  it("only admin writes settings", () => {
    expect(canWrite(["admin"], "settings")).toBe(true);
    expect(canWrite(["manager"], "settings")).toBe(false);
    expect(canRead(["manager"], "settings")).toBe(true);
  });
  it("kitchen can adjust inventory but not purchasing", () => {
    expect(canWrite(["kitchen"], "inventory")).toBe(true);
    expect(canWrite(["kitchen"], "purchasing")).toBe(false);
  });
  it("attendance operator cannot see inventory", () => expect(canRead(["attendance"], "inventory")).toBe(false));
  it("students see only published menu and own attendance", () => {
    expect(accessFor(["student"], "menu")).toBe("published");
    expect(accessFor(["student"], "attendance")).toBe("own");
    expect(canRead(["student"], "analytics")).toBe(false);
  });
  it("viewer is read-only everywhere it can see", () => expect(canWrite(["viewer"], "kitchen")).toBe(false));
  it("multiple roles take the highest access", () => expect(accessFor(["viewer", "kitchen"], "inventory")).toBe("write"));
});
