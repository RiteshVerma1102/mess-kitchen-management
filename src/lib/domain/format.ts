/** Indian formatting helpers: ₹ with lakh/crore grouping, en-IN dates, Asia/Kolkata by default. */

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹12,34,567.50 */
export function formatINR(amount: number, opts: { whole?: boolean } = {}): string {
  if (!Number.isFinite(amount)) return "—";
  return (opts.whole ? inrWhole : inr).format(amount);
}

/** Compact Indian notation: ₹950, ₹4.5K, ₹4.47L, ₹1.2Cr */
export function formatINRCompact(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const sign = amount < 0 ? "-" : "";
  const a = Math.abs(amount);
  const trim = (n: number) => String(Math.round(n * 100) / 100);
  if (a >= 1e7) return `${sign}₹${trim(a / 1e7)}Cr`;
  if (a >= 1e5) return `${sign}₹${trim(a / 1e5)}L`;
  if (a >= 1e3) return `${sign}₹${trim(a / 1e3)}K`;
  return `${sign}₹${trim(a)}`;
}

/** 1,842 or 12,34,567 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return num.format(value);
}

/** 6.2% — `ratio` is a fraction (0.062). */
export function formatPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** 19 Nov 2026 in the institution timezone. */
export function formatDate(input: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(d);
}

/** YYYY-MM-DD for a moment as seen in the institution timezone. */
export function toDateKey(input: Date, timeZone = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(input);
  return parts;
}
