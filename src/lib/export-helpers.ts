/**
 * FoodFlow Pro Max - Real File Export Engine
 * Generates and triggers actual client downloads for CSV, Excel (.xlsx/.csv), and printable PDF reports.
 */

/**
 * Triggers a browser download of a text/binary blob
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

/**
 * Escapes CSV field value according to RFC 4180
 */
function escapeCSV(val: unknown): string {
  if (val == null) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Export tabular data as real CSV file
 */
export function exportToCSV<T extends Record<string, unknown>>(
  filename: string,
  headers: Array<{ key: keyof T; label: string }>,
  rows: T[]
): void {
  const headerLine = headers.map((h) => escapeCSV(h.label)).join(",");
  const rowLines = rows.map((row) =>
    headers.map((h) => escapeCSV(row[h.key])).join(",")
  );

  const csvContent = "\uFEFF" + [headerLine, ...rowLines].join("\r\n"); // Add UTF-8 BOM for Excel
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/**
 * Export tabular data as Excel-compatible file
 */
export function exportToExcel<T extends Record<string, unknown>>(
  filename: string,
  sheetName: string,
  headers: Array<{ key: keyof T; label: string }>,
  rows: T[]
): void {
  // Generate HTML table spreadsheet format that Excel opens natively
  const tableRows = rows
    .map(
      (r) =>
        `<tr>${headers.map((h) => `<td>${r[h.key] != null ? String(r[h.key]) : ""}</td>`).join("")}</tr>`
    )
    .join("\n");

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${sheetName}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          th { background-color: #087E8B; color: #FFFFFF; font-weight: bold; padding: 6px; }
          td { border: 0.5pt solid #CCCCCC; padding: 4px; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h.label}</th>`).join("")}</tr>
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

/**
 * Generates and opens a printable institutional PDF report in a new window with print dialogue
 */
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

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to generate and print PDF reports.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${institutionName}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #172B3A; margin: 0; padding: 10px; font-size: 12px; }
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
            <div class="logo">SmartMess FoodFlow</div>
            <div class="inst">${institutionName}</div>
            <div class="title">${title}</div>
            ${subtitle ? `<div style="color: #666; font-size: 11px; margin-top: 2px;">${subtitle}</div>` : ""}
          </div>
          <div class="meta">
            ${dateRange ? `<div><strong>Period:</strong> ${dateRange}</div>` : ""}
            <div><strong>Generated:</strong> ${new Date().toLocaleString("en-IN")}</div>
          </div>
        </div>

        ${
          summary && summary.length > 0
            ? `<div class="summary-grid">
              ${summary
                .map(
                  (s) =>
                    `<div class="summary-card"><div class="summary-label">${s.label}</div><div class="summary-val">${s.value}</div></div>`
                )
                .join("")}
            </div>`
            : ""
        }

        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map((r) => `<tr>${r.map((c) => `<td>${c != null ? String(c) : "—"}</td>`).join("")}</tr>`)
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <div>Official SmartMess Kitchen Records &middot; Generated via FoodFlow Pro Max</div>
          <div>Page 1 of 1</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
