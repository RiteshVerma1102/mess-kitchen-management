import { describe, expect, it } from "vitest";
import {
  canRoleWriteCollection,
  formatWorkspaceRole,
  isPageAllowedForRole,
} from "./workspace-types";
import {
  classifyOpenMeteoWeather,
  computeFormulaDemandForecast,
  computeFormulaMenuSuggestions,
  resolveCityCoordinates,
} from "../weather";
import { TRANSLATIONS } from "../i18n";

describe("workspace role access matrix", () => {
  it("grants admin full page and collection access", () => {
    expect(isPageAllowedForRole("users", "admin")).toBe(true);
    expect(isPageAllowedForRole("billing", "admin")).toBe(true);
    expect(canRoleWriteCollection("admin", "inventoryItems")).toBe(true);
    expect(canRoleWriteCollection("admin", "invoices")).toBe(true);
  });

  it("restricts student access to student-safe pages and collections", () => {
    expect(isPageAllowedForRole("weekly-menu", "student")).toBe(true);
    expect(isPageAllowedForRole("billing", "student")).toBe(true);
    expect(isPageAllowedForRole("inventory", "student")).toBe(false);
    expect(isPageAllowedForRole("users", "student")).toBe(false);
    expect(canRoleWriteCollection("student", "bookings")).toBe(true);
    expect(canRoleWriteCollection("student", "inventoryItems")).toBe(false);
    expect(canRoleWriteCollection("student", "invoices")).toBe(false);
  });

  it("scopes store_keeper and accountant writes cleanly", () => {
    expect(isPageAllowedForRole("inventory", "store_keeper")).toBe(true);
    expect(isPageAllowedForRole("billing", "store_keeper")).toBe(false);
    expect(canRoleWriteCollection("store_keeper", "purchaseOrders")).toBe(true);
    expect(canRoleWriteCollection("accountant", "invoices")).toBe(true);
    expect(canRoleWriteCollection("accountant", "kitchenTasks")).toBe(false);
  });

  it("formats workspace roles in English and Hindi", () => {
    expect(formatWorkspaceRole("kitchen_head", "en")).toBe("Kitchen Head");
    expect(formatWorkspaceRole("store_keeper", "hi")).toContain("भंडारपाल");
    expect(formatWorkspaceRole(null, "en")).toBe("No role");
  });
});

describe("Open-Meteo weather & deterministic forecast helpers", () => {
  it("resolves known Indian campus cities and classifies rain impact", () => {
    expect(resolveCityCoordinates("Bengaluru, Karnataka").label).toBe("Bengaluru");
    expect(classifyOpenMeteoWeather(12, 26).turnoutMultiplier).toBe(1.08);
    expect(classifyOpenMeteoWeather(0, 42).turnoutMultiplier).toBe(0.96);
  });

  it("computes deterministic demand formula with skips, guests, and weather", () => {
    const res = computeFormulaDemandForecast({
      activeStudents: 500,
      skippedCount: 40,
      guestCount: 10,
      eventFactor: 1.0,
      weatherMultiplier: 1.08,
      mealSlot: "lunch",
    });
    // (500 * 0.92 - 40 + 10) * 1.08 = 430 * 1.08 = 464.4 -> 464
    expect(res.expectedPortions).toBe(464);
    expect(res.confidence).toBe(84);
  });

  it("returns localized FEFO and waste suggestions in both languages", () => {
    const enTips = computeFormulaMenuSuggestions({
      expiringItems: [{ name: "Paneer", quantity: 10, unit: "kg", expiryDate: "2026-11-27" }],
      wasteLogs: [{ dishName: "Jeera Rice", wastedQuantity: 12, preparedQuantity: 60 }],
      lang: "en",
    });
    const hiTips = computeFormulaMenuSuggestions({
      expiringItems: [{ name: "Paneer", quantity: 10, unit: "kg", expiryDate: "2026-11-27" }],
      wasteLogs: [],
      lang: "hi",
    });
    expect(enTips.length).toBe(2);
    expect(hiTips[0]).toContain("FEFO");
  });

  it("maintains English and Hindi translation key parity", () => {
    expect(Object.keys(TRANSLATIONS.en.pages).sort()).toEqual(
      Object.keys(TRANSLATIONS.hi.pages).sort(),
    );
    expect(Object.keys(TRANSLATIONS.en.empty).sort()).toEqual(
      Object.keys(TRANSLATIONS.hi.empty).sort(),
    );
    expect(Object.keys(TRANSLATIONS.en.dataHealth).sort()).toEqual(
      Object.keys(TRANSLATIONS.hi.dataHealth).sort(),
    );
  });
});
