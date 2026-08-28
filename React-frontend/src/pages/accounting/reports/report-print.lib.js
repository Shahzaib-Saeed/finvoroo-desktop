function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collectDocumentStyles() {
  return Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style'),
  )
    .map((node) => node.outerHTML)
    .join("\n");
}

function prepareClone(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    try {
      img.src = new URL(src, window.location.origin).href;
    } catch {
      /* keep original */
    }
  });
  clone.querySelectorAll("a").forEach((anchor) => {
    anchor.removeAttribute("href");
    anchor.classList.remove("hover:underline");
  });
  clone.querySelectorAll("[data-print-table]").forEach((table) => {
    table.style.minWidth = "0";
    table.style.width = "100%";
  });
  return clone;
}

function buildPrintHtml(element, options = {}) {
  const { title = "Report", rootClass = "balance-sheet-report-root" } = options;

  if (!element) {
    throw new Error("Nothing to print.");
  }

  const clone = prepareClone(element);
  const styles = collectDocumentStyles();
  const isGeneralLedger = rootClass.includes("general-ledger");
  const isAccountStatement = rootClass.includes("account-statement");
  const isAccountBalances = rootClass.includes("account-balances");
  const isCustomerLedger = rootClass.includes("customer-ledger");
  const isAgedPayables = rootClass.includes("aged-payables");
  const isAgedReceivables = rootClass.includes("aged-receivables");
  const isAgedAging = isAgedPayables || isAgedReceivables;

  const pageRule =
    isGeneralLedger || isCustomerLedger || isAccountBalances || isAccountStatement || isAgedAging
      ? "@page { size: landscape; margin: 8mm 10mm; }"
      : "@page { size: auto; margin: 10mm; }";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
${styles}
<style>
  ${pageRule}
  html, body {
    margin: 0;
    padding: 0;
    background: #fff !important;
    color: #0f172a;
    width: 100%;
    height: auto;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .no-print,
  .print\\:hidden {
    display: none !important;
  }
  .hidden.print\\:block,
  .print\\:block {
    display: block !important;
  }
  .report-print-root {
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
  }
  .report-print-sheet {
    overflow: visible !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding-bottom: 0 !important;
  }
  .report-sticky-filters,
  .report-sticky-sheet-header,
  .report-sticky-thead,
  thead.report-sticky-thead {
    position: static !important;
    top: auto !important;
    max-height: none !important;
    overflow: visible !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
  }
  ${
    isGeneralLedger || isAccountStatement
      ? `
  .general-ledger-table {
    width: 100% !important;
    min-width: 0 !important;
    table-layout: fixed !important;
    font-size: 11px !important;
    border: none !important;
  }
  .general-ledger-table thead { display: table-header-group !important; }
  .general-ledger-table th {
    background: #f8fafc !important;
    border: none !important;
    border-bottom: 1px solid #e2e8f0 !important;
    font-size: 10px !important;
    font-weight: 600 !important;
  }
  .general-ledger-table td {
    border: none !important;
    padding: 2px 6px !important;
    vertical-align: middle !important;
  }
  .gl-account-spacer td {
    height: 14px !important;
    padding: 0 !important;
  }
  .general-ledger-table tfoot td {
    border-top: 2px solid #94a3b8 !important;
    border-bottom: none !important;
  }
  .gl-balance-forward-row td,
  .gl-account-total td {
    font-weight: 600 !important;
    color: #0f172a !important;
  }
  .overflow-x-auto { overflow: visible !important; padding: 0 !important; }
  .account-statement-ref { white-space: nowrap !important; word-break: normal !important; }
  .balance-sheet-header h1 { font-size: 16px !important; font-weight: 600 !important; margin: 0 !important; }
  .balance-sheet-header p { font-size: 11px !important; line-height: 1.35 !important; }
  `
      : ""
  }
  ${
    isAccountStatement
      ? `
  .account-statement-statement {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  }
  .general-ledger-table,
  .general-ledger-table th,
  .general-ledger-table td {
    font-family: inherit !important;
  }
  .account-statement-header img {
    max-height: 32px !important;
    max-width: 120px !important;
  }
  `
      : ""
  }
  ${
    isCustomerLedger
      ? `
  .customer-ledger-print .general-ledger-table {
    width: 100% !important;
    min-width: 0 !important;
    table-layout: fixed !important;
    font-size: 9px !important;
    line-height: 1.3 !important;
    border: none !important;
  }
  .customer-ledger-print .general-ledger-table thead { display: table-header-group !important; }
  .customer-ledger-print .general-ledger-table tfoot { display: table-footer-group !important; }
  .customer-ledger-print .general-ledger-table th {
    background: #f8fafc !important;
    border: none !important;
    border-bottom: 1px solid #cbd5e1 !important;
    font-size: 8px !important;
    font-weight: 700 !important;
    letter-spacing: 0 !important;
    text-transform: none !important;
    padding: 3px 4px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  .customer-ledger-print .general-ledger-table td {
    border: none !important;
    padding: 2px 4px !important;
    vertical-align: top !important;
    font-size: 9px !important;
  }
  .customer-ledger-print col.ledger-col-money { width: 8.5% !important; }
  .customer-ledger-print .ledger-col-money,
  .customer-ledger-print td.ledger-col-money,
  .customer-ledger-print th.ledger-col-money {
    white-space: nowrap !important;
    word-break: keep-all !important;
    text-align: right !important;
    font-variant-numeric: tabular-nums !important;
  }
  .customer-ledger-print .ledger-col-type,
  .customer-ledger-print td.ledger-col-type,
  .customer-ledger-print th.ledger-col-type {
    white-space: nowrap !important;
    text-align: center !important;
    font-size: 8px !important;
  }
  .customer-ledger-print .ledger-col-cf,
  .customer-ledger-print td.ledger-col-cf {
    white-space: normal !important;
    word-break: break-all !important;
    font-size: 7.5px !important;
    line-height: 1.15 !important;
  }
  .customer-ledger-print .ledger-col-desc,
  .customer-ledger-print td.ledger-col-desc {
    white-space: normal !important;
    word-break: break-word !important;
    font-size: 8px !important;
  }
  .customer-ledger-print .ledger-col-ref,
  .customer-ledger-print td.ledger-col-ref {
    white-space: nowrap !important;
    font-size: 8px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  .customer-ledger-print .gl-balance-forward-row td,
  .customer-ledger-print .gl-account-total td,
  .customer-ledger-print .general-ledger-table tfoot td {
    font-weight: 600 !important;
    color: #0f172a !important;
  }
  .customer-ledger-print .general-ledger-table tfoot td {
    border-top: 2px solid #64748b !important;
    padding-top: 4px !important;
  }
  .customer-ledger-print .overflow-x-auto { overflow: visible !important; padding: 0 !important; }
  .customer-ledger-print tr {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  html, body { height: auto !important; min-height: 0 !important; }
  .report-print-root, .report-print-sheet { min-height: 0 !important; page-break-after: avoid; }
  `
      : ""
  }
  ${
    isAgedAging
      ? `
  .aged-aging-print.general-ledger-print .general-ledger-statement header h1 {
    font-size: 15px !important;
    line-height: 1.25 !important;
  }
  .aged-aging-print.general-ledger-print .general-ledger-statement header p,
  .aged-aging-print.general-ledger-print .general-ledger-statement header span {
    font-size: 10px !important;
    line-height: 1.35 !important;
  }
  .aged-aging-print .general-ledger-table {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    table-layout: fixed !important;
    font-size: 11px !important;
    line-height: 1.35 !important;
    border: none !important;
  }
  .aged-aging-print .general-ledger-table thead { display: table-header-group !important; }
  .aged-aging-print .general-ledger-table th {
    background: #f8fafc !important;
    border: none !important;
    border-bottom: 1px solid #e2e8f0 !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    padding: 4px 6px !important;
    text-align: center !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  .aged-aging-print .general-ledger-table th.ledger-col-party { text-align: left !important; }
  .aged-aging-print .general-ledger-table td {
    border: none !important;
    padding: 3px 6px !important;
    font-size: 11px !important;
    vertical-align: top !important;
    overflow: hidden !important;
    max-width: 0 !important;
    text-align: center !important;
  }
  .aged-aging-print .general-ledger-table td.ledger-col-party {
    text-align: left !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    text-overflow: ellipsis !important;
  }
  .aged-aging-print .general-ledger-table td.ledger-col-cf,
  .aged-aging-print .general-ledger-table th.ledger-col-cf {
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
    font-size: 10px !important;
    line-height: 1.25 !important;
  }
  .aged-aging-print .general-ledger-table td.ledger-col-date,
  .aged-aging-print .general-ledger-table td.ledger-col-ref,
  .aged-aging-print .general-ledger-table td.ledger-col-age,
  .aged-aging-print .general-ledger-table td.ledger-col-money {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  .aged-aging-print .general-ledger-table td.ledger-col-data {
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
    font-size: 10px !important;
    line-height: 1.25 !important;
  }
  .aged-aging-print .gl-account-total td {
    border-top: 2px solid #64748b !important;
    font-weight: 600 !important;
    font-size: 11px !important;
    overflow: visible !important;
    max-width: none !important;
    text-align: left !important;
  }
  .aged-aging-print .aging-detail-table {
    width: 100% !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  .aged-aging-print .overflow-x-auto { overflow: visible !important; padding: 0 !important; width: 100% !important; }
  `
      : ""
  }
</style>
</head>
<body>
<div class="report-print-root ${escapeHtml(rootClass)}">
${clone.outerHTML}
</div>
</body>
</html>`;
}

/**
 * Print via a hidden iframe — no pop-up window, so browser blockers do not apply.
 */
function printHtmlInHiddenFrame(html) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Report print");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
        resolve();
      }, 300);
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        iframe.remove();
        reject(new Error("Could not open print preview."));
        return;
      }

      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch (err) {
          iframe.remove();
          reject(err);
          return;
        }

        if ("onafterprint" in win) {
          win.onafterprint = cleanup;
        } else {
          cleanup();
        }
      }, 400);
    };

    iframe.onerror = () => {
      iframe.remove();
      reject(new Error("Could not load print preview."));
    };

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      reject(new Error("Could not open print preview."));
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();
  });
}

/**
 * Print or save as PDF (choose "Save as PDF" in the system print dialog).
 * Uses a hidden iframe — no pop-ups required.
 */
export async function openReportPrintWindow(element, options = {}) {
  const html = buildPrintHtml(element, options);
  await printHtmlInHiddenFrame(html);
}

export function printReportSheet(element, options = {}) {
  return openReportPrintWindow(element, options);
}

export function downloadReportPdf(element, options = {}) {
  return openReportPrintWindow(element, options);
}

export function buildReportFilename(prefix, companyName, asOf) {
  const safeCompany = String(companyName || "company")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  const safeDate = String(asOf || "report").slice(0, 10);
  return `${prefix}-${safeCompany || "report"}-${safeDate}`;
}
