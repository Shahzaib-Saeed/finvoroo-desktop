/**
 * Reusable report column-width layout.
 * Per-report defaults live here; unknown columns get a safe generic range.
 */

export const REPORT_COLUMN_WIDTH_MIN = 40;
export const REPORT_COLUMN_WIDTH_MAX = 800;

const GENERIC = { defaultWidth: 120, minWidth: 72, maxWidth: 280 };

const GL_LAYOUT = {
  account: { defaultWidth: 240, minWidth: 190, maxWidth: 420 },
  date: { defaultWidth: 76, minWidth: 72, maxWidth: 96 },
  aging: { defaultWidth: 36, minWidth: 28, maxWidth: 72 },
  reference: { defaultWidth: 120, minWidth: 90, maxWidth: 220 },
  journal: { defaultWidth: 52, minWidth: 44, maxWidth: 80 },
  description: { defaultWidth: 200, minWidth: 140, maxWidth: 480 },
  debit: { defaultWidth: 108, minWidth: 92, maxWidth: 160 },
  credit: { defaultWidth: 108, minWidth: 92, maxWidth: 160 },
  balance: { defaultWidth: 116, minWidth: 100, maxWidth: 160 },
};

const GL_CUSTOM_FIELD_LAYOUT = {
  defaultWidth: 72,
  minWidth: 56,
  maxWidth: 140,
};

const CUSTOMER_LEDGER_LAYOUT = {
  customer: { defaultWidth: 168, minWidth: 128, maxWidth: 300 },
  vendor: { defaultWidth: 168, minWidth: 128, maxWidth: 300 },
  date: { defaultWidth: 76, minWidth: 72, maxWidth: 96 },
  paid: { defaultWidth: 32, minWidth: 28, maxWidth: 44 },
  reference: { defaultWidth: 112, minWidth: 88, maxWidth: 200 },
  type: { defaultWidth: 52, minWidth: 48, maxWidth: 72 },
  order_number: { defaultWidth: 88, minWidth: 72, maxWidth: 140 },
  description: { defaultWidth: 148, minWidth: 100, maxWidth: 360 },
  debit: { defaultWidth: 100, minWidth: 88, maxWidth: 150 },
  credit: { defaultWidth: 100, minWidth: 88, maxWidth: 150 },
  balance: { defaultWidth: 108, minWidth: 92, maxWidth: 150 },
  age: { defaultWidth: 44, minWidth: 36, maxWidth: 64 },
  aging_label: { defaultWidth: 96, minWidth: 72, maxWidth: 160 },
};

const ACCOUNT_STATEMENT_LAYOUT = {
  date: { defaultWidth: 76, minWidth: 72, maxWidth: 96 },
  reference: { defaultWidth: 112, minWidth: 88, maxWidth: 220 },
  description: { defaultWidth: 220, minWidth: 140, maxWidth: 480 },
  debit: { defaultWidth: 108, minWidth: 92, maxWidth: 160 },
  credit: { defaultWidth: 108, minWidth: 92, maxWidth: 160 },
  balance: { defaultWidth: 116, minWidth: 100, maxWidth: 160 },
};

const AGING_DETAIL_LAYOUT = {
  party: { defaultWidth: 168, minWidth: 128, maxWidth: 320 },
  vendor: { defaultWidth: 168, minWidth: 128, maxWidth: 320 },
  customer: { defaultWidth: 168, minWidth: 128, maxWidth: 320 },
  date: { defaultWidth: 92, minWidth: 80, maxWidth: 112 },
  bill_number: { defaultWidth: 92, minWidth: 80, maxWidth: 120 },
  invoice_number: { defaultWidth: 92, minWidth: 80, maxWidth: 120 },
  due_date: { defaultWidth: 92, minWidth: 80, maxWidth: 112 },
  po_number: { defaultWidth: 108, minWidth: 80, maxWidth: 160 },
  ship_via: { defaultWidth: 88, minWidth: 72, maxWidth: 140 },
  sales_rep: { defaultWidth: 88, minWidth: 72, maxWidth: 140 },
  amount_due: { defaultWidth: 112, minWidth: 96, maxWidth: 150 },
  age: { defaultWidth: 56, minWidth: 48, maxWidth: 72 },
};

const LAYOUT_BY_REPORT = {
  general_ledger: GL_LAYOUT,
  customer_ledger: CUSTOMER_LEDGER_LAYOUT,
  vendor_ledger: CUSTOMER_LEDGER_LAYOUT,
  account_statement: ACCOUNT_STATEMENT_LAYOUT,
  vendor_aging: AGING_DETAIL_LAYOUT,
  customer_aging: AGING_DETAIL_LAYOUT,
};

function isCustomFieldKey(key) {
  return String(key || "").startsWith("cf:");
}

export function normalizeReportPreferenceKey(reportKey) {
  return String(reportKey || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

export function getReportColumnLayout(reportKey, columnKey) {
  const report = normalizeReportPreferenceKey(reportKey);
  const key = String(columnKey || "");
  const map = LAYOUT_BY_REPORT[report] || GL_LAYOUT;
  if (map[key]) return map[key];
  if (isCustomFieldKey(key)) {
    return GL_CUSTOM_FIELD_LAYOUT;
  }
  return GENERIC;
}

export function clampReportColumnWidth(reportKey, columnKey, width) {
  const layout = getReportColumnLayout(reportKey, columnKey);
  const n = Number(width);
  if (!Number.isFinite(n)) return layout.defaultWidth;
  const rounded = Math.round(n);
  return Math.min(
    layout.maxWidth,
    Math.max(layout.minWidth, rounded),
  );
}

export function defaultReportColumnWidths(reportKey, columns = []) {
  const widths = {};
  for (const col of columns) {
    const id = col?.id;
    if (!id) continue;
    widths[id] = getReportColumnLayout(reportKey, id).defaultWidth;
  }
  return widths;
}

export function applySavedReportColumnWidths(reportKey, columns, saved = []) {
  const widths = defaultReportColumnWidths(reportKey, columns);
  for (const row of saved) {
    const key = row?.column_key || row?.columnKey;
    if (!key) continue;
    widths[key] = clampReportColumnWidth(reportKey, key, row.width);
  }
  return widths;
}

export function sumReportColumnWidths(columns, widths, reportKey = "general_ledger") {
  return columns.reduce((sum, col) => {
    const id = col?.id;
    if (!id) return sum;
    return (
      sum +
      (Number(widths[id]) ||
        getReportColumnLayout(reportKey, id).defaultWidth)
    );
  }, 0);
}
