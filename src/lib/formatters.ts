/**
 * FoodFlow Pro Max - Standard Formatters for Indian Kitchens
 * Strict adherence to en-IN locale, INR currency grouping, and standard mess units.
 */

/**
 * Formats a numeric value into INR currency with Indian digit grouping (lakhs, crores).
 * Example: 447000 -> ₹4,47,000.00 or ₹4,47,000
 */
export function formatINR(amount: number, showDecimals: boolean = false): string {
  if (amount == null || isNaN(amount)) return "₹0";
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(absAmount);

  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Compact Indian currency formatting (e.g. ₹4.47L, ₹12.5K)
 */
export function formatINRCompact(amount: number): string {
  if (amount == null || isNaN(amount)) return "₹0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  }
  return `${sign}₹${abs.toFixed(0)}`;
}

/**
 * Format date in standard Indian institutional format (e.g. "19 Nov 2026")
 */
export function formatDateIN(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput.includes("T") ? dateInput : `${dateInput}T12:00:00`) : dateInput;
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Format full date with day name (e.g. "Thursday, 19 November 2026")
 */
export function formatFullDateIN(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput.includes("T") ? dateInput : `${dateInput}T12:00:00`) : dateInput;
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Standard Indian kitchen weight / volume units formatting
 */
export function formatQuantity(quantity: number, unit: string = "kg"): string {
  if (quantity == null || isNaN(quantity)) return `0 ${unit}`;
  const rounded = Math.round(quantity * 100) / 100;
  return `${rounded.toLocaleString("en-IN")} ${unit}`;
}

/**
 * Percentage formatter
 */
export function formatPercentage(val: number): string {
  if (val == null || isNaN(val)) return "0.0%";
  return `${val.toFixed(1)}%`;
}
