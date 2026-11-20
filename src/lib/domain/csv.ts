import type { z } from "zod";

/** RFC-4180-ish CSV parser: quotes, escaped quotes, CRLF, embedded newlines. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/** Turn CSV text into header-keyed objects (headers trimmed + lower_snake_cased). */
export function csvToObjects(text: string): Record<string, string>[] {
  const [header, ...body] = parseCSV(text);
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

export interface RowError {
  row: number; // 1-based data row (excluding header)
  message: string;
}

/** Validate each row with a zod schema, collecting a preview of valid rows and an error report. */
export function validateRows<T>(rows: Record<string, string>[], schema: z.ZodType<T>) {
  const valid: T[] = [];
  const errors: RowError[] = [];
  rows.forEach((r, i) => {
    const res = schema.safeParse(r);
    if (res.success) valid.push(res.data);
    else
      errors.push({
        row: i + 1,
        message: res.error.issues.map((iss) => `${iss.path.join(".") || "row"}: ${iss.message}`).join("; "),
      });
  });
  return { valid, errors };
}

const escape = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Serialise rows to CSV with a header from `columns`. */
export function toCSV<T extends Record<string, unknown>>(rows: T[], columns: { key: keyof T; label: string }[]) {
  const head = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(r[c.key])).join(","));
  return [head, ...body].join("\r\n");
}
