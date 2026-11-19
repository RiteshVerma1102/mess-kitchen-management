import { describe, expect, it } from "vitest";
import {
  formatDateIN,
  formatINR,
  formatINRCompact,
  formatPercentage,
  formatQuantity,
} from "../lib/formatters";

describe("formatINR", () => {
  it("formats standard amounts with Indian digit grouping", () => {
    expect(formatINR(1000)).toMatch(/₹\s?1,000/);
    expect(formatINR(100000)).toMatch(/₹\s?1,00,000/);
    expect(formatINR(447000)).toMatch(/₹\s?4,47,000/);
  });

  it("handles zero and NaN gracefully", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(NaN)).toBe("₹0");
  });

  it("handles negative values cleanly", () => {
    expect(formatINR(-500)).toMatch(/-₹\s?500/);
  });
});

describe("formatINRCompact", () => {
  it("formats Lakhs and Crores accurately", () => {
    expect(formatINRCompact(447000)).toBe("₹4.47 L");
    expect(formatINRCompact(15000000)).toBe("₹1.50 Cr");
    expect(formatINRCompact(2500)).toBe("₹2.5k");
    expect(formatINRCompact(68)).toBe("₹68");
  });
});

describe("formatDateIN", () => {
  it("formats ISO date string into Indian locale format", () => {
    const formatted = formatDateIN("2026-11-19T12:00:00Z");
    expect(formatted).toContain("Nov");
    expect(formatted).toContain("2026");
  });

  it("returns dash for null or invalid dates", () => {
    expect(formatDateIN(null)).toBe("—");
    expect(formatDateIN("invalid-date")).toBe("—");
  });
});

describe("formatQuantity", () => {
  it("formats weight with unit", () => {
    expect(formatQuantity(45.5, "kg")).toBe("45.5 kg");
    expect(formatQuantity(250, "g")).toBe("250 g");
    expect(formatQuantity(0, "L")).toBe("0 L");
  });
});

describe("formatPercentage", () => {
  it("formats decimal percentage to 1 decimal place", () => {
    expect(formatPercentage(6.234)).toBe("6.2%");
    expect(formatPercentage(0)).toBe("0.0%");
  });
});
