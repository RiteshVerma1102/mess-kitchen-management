// Store UTC, display IST.
export const DISPLAY_TZ = 'Asia/Kolkata';

export function formatIST(date: Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone: DISPLAY_TZ, dateStyle: 'medium', timeStyle: 'short', ...opts }).format(date);
}

// YYYY-MM-DD for a Date in IST (the service day used for grouping meals).
export function istDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DISPLAY_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
