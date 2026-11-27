import { toast } from "sonner";

/**
 * FoodFlow Pro Max - Real File Export Engine
 * Generates and triggers actual client downloads for CSV, Excel (.xls), and iframe-safe printable PDF/HTML receipts.
 */

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCSV(val: unknown): string {
  if (val == null) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function escapeHtml(val: unknown): string {
  return String(val ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function exportToCSV<T extends Record<string, unknown>>(
  filename: string,
  headers: Array<{ key: keyof T; label: string }>,
  rows: T[],
): void {
  const headerLine = headers.map((h) => escapeCSV(h.label)).join(",");
  const rowLines = rows.map((row) => headers.map((h) => escapeCSV(row[h.key])).join(","));

  const csvContent = "\uFEFF" + [headerLine, ...rowLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function exportToExcel<T extends Record<string, unknown>>(
  filename: string,
  sheetName: string,
  headers: Array<{ key: keyof T; label: string }>,
  rows: T[],
): void {
  const tableRows = rows
    .map(
      (r) =>
        `<tr>${headers.map((h) => `<td>${r[h.key] != null ? escapeHtml(r[h.key]) : ""}</td>`).join("")}</tr>`,
    )
    .join("\n");

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          th { background-color: #087E8B; color: #FFFFFF; font-weight: bold; padding: 6px; }
          td { border: 0.5pt solid #CCCCCC; padding: 4px; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${escapeHtml(h.label)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}

function printHtmlInsideIframe(html: string, downloadFallbackFilename: string): void {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDoc) {
      document.body.removeChild(iframe);
      downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), downloadFallbackFilename);
      toast.info("Downloaded printable report HTML.");
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        downloadBlob(
          new Blob([html], { type: "text/html;charset=utf-8" }),
          downloadFallbackFilename,
        );
        toast.info("Downloaded printable report HTML.");
      }
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    }, 150);
  } catch {
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), downloadFallbackFilename);
    toast.info("Downloaded printable report HTML.");
  }
}

export function exportToPrintablePDF(params: {
  title: string;
  institutionName: string;
  subtitle?: string;
  dateRange?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  summary?: Array<{ label: string; value: string }>;
}): void {
  const { title, institutionName, subtitle, dateRange, headers, rows, summary } = params;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)} - ${escapeHtml(institutionName)}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #172B3A; margin: 0; padding: 14px; font-size: 12px; }
          .header { border-bottom: 2px solid #087E8B; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 20px; font-weight: 800; color: #087E8B; }
          .inst { font-size: 13px; color: #555; }
          .title { font-size: 16px; font-weight: 700; margin-top: 4px; }
          .meta { font-size: 11px; color: #666; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #087E8B; color: #fff; text-align: left; padding: 8px; font-weight: 600; font-size: 11px; }
          td { border-bottom: 1px solid #E5EAF0; padding: 6px 8px; font-size: 11px; }
          tr:nth-child(even) { background-color: #F8FAFC; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 16px; background: #FFF6E5; border: 1px solid #FFE1D0; padding: 12px; border-radius: 6px; }
          .summary-card { font-size: 11px; }
          .summary-label { color: #666; font-size: 10px; text-transform: uppercase; font-weight: 600; }
          .summary-val { font-size: 14px; font-weight: 700; color: #0F3D3A; margin-top: 2px; }
          .footer { margin-top: 24px; border-top: 1px solid #E5EAF0; padding-top: 8px; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">FoodFlow Mess Records</div>
            <div class="inst">${escapeHtml(institutionName)}</div>
            <div class="title">${escapeHtml(title)}</div>
            ${subtitle ? `<div style="color: #666; font-size: 11px; margin-top: 2px;">${escapeHtml(subtitle)}</div>` : ""}
          </div>
          <div class="meta">
            ${dateRange ? `<div><strong>Period:</strong> ${escapeHtml(dateRange)}</div>` : ""}
            <div><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString("en-IN"))}</div>
          </div>
        </div>

        ${
          summary && summary.length > 0
            ? `<div class="summary-grid">
              ${summary
                .map(
                  (s) =>
                    `<div class="summary-card"><div class="summary-label">${escapeHtml(s.label)}</div><div class="summary-val">${escapeHtml(s.value)}</div></div>`,
                )
                .join("")}
            </div>`
            : ""
        }

        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) =>
                  `<tr>${r.map((c) => `<td>${c != null ? escapeHtml(c) : "—"}</td>`).join("")}</tr>`,
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <div>Official Mess &amp; Hostel Records &middot; FoodFlow</div>
          <div>Page 1 of 1</div>
        </div>
      </body>
    </html>
  `;

  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40) || "report";
  printHtmlInsideIframe(html, `foodflow-${slug}.html`);
}

export function exportPaymentReceiptHTML(params: {
  receiptNumber: string;
  institutionName: string;
  studentName: string;
  studentCode?: string;
  monthKey?: string;
  amountRupees: number;
  method: string;
  referenceNo: string;
  paidAt: string;
}): void {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Receipt ${escapeHtml(params.receiptNumber)}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #172B3A; margin: 0; padding: 24px; font-size: 13px; }
          .card { max-width: 620px; margin: 0 auto; border: 1.5px solid #087E8B; border-radius: 10px; padding: 20px; }
          .top { display: flex; justify-content: space-between; border-bottom: 1px solid #E5EAF0; padding-bottom: 12px; margin-bottom: 16px; }
          .brand { font-size: 18px; font-weight: 800; color: #087E8B; }
          .badge { background: #E9F7F1; color: #0D7A52; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
          .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #E5EAF0; }
          .total { font-size: 16px; font-weight: 800; color: #087E8B; padding-top: 12px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="top">
            <div>
              <div class="brand">${escapeHtml(params.institutionName)}</div>
              <div style="font-size:12px;color:#666;">Official Mess Fee Payment Receipt</div>
            </div>
            <div class="badge">PAID</div>
          </div>
          <div class="row"><span>Receipt No</span><strong>${escapeHtml(params.receiptNumber)}</strong></div>
          <div class="row"><span>Student</span><strong>${escapeHtml(params.studentName)}${params.studentCode ? ` (${escapeHtml(params.studentCode)})` : ""}</strong></div>
          ${params.monthKey ? `<div class="row"><span>Billing Cycle</span><strong>${escapeHtml(params.monthKey)}</strong></div>` : ""}
          <div class="row"><span>Payment Mode</span><strong>${escapeHtml(params.method.toUpperCase())}</strong></div>
          <div class="row"><span>Transaction / UPI Ref</span><strong>${escapeHtml(params.referenceNo)}</strong></div>
          <div class="row"><span>Paid Timestamp</span><strong>${escapeHtml(new Date(params.paidAt).toLocaleString("en-IN"))}</strong></div>
          <div class="total"><span>Amount Received</span><span>₹${params.amountRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
        </div>
      </body>
    </html>
  `;
  printHtmlInsideIframe(html, `receipt-${params.receiptNumber}.html`);
}
