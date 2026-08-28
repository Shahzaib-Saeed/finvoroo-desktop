export const GL_STANDARD_COLUMNS = [
  { id: "account", label: "Account", can_hide: true },
  { id: "date", label: "Date", can_hide: true },
  { id: "aging", label: "Paid", can_hide: true },
  { id: "reference", label: "Reference", can_hide: false },
  { id: "journal", label: "Type", can_hide: true },
  { id: "description", label: "Description", can_hide: true },
  { id: "debit", label: "Debit", can_hide: false },
  { id: "credit", label: "Credit", can_hide: false },
  { id: "balance", label: "Balance", can_hide: false },
];

export const GL_MONEY_COLUMN_IDS = ["debit", "credit", "balance"];

export const STATEMENT_COLUMNS = [
  { id: "date", label: "Date", can_hide: true },
  { id: "reference", label: "Reference", can_hide: false },
  { id: "description", label: "Memo / Narrative", can_hide: true },
  { id: "debit", label: "Debit", can_hide: true },
  { id: "credit", label: "Credit", can_hide: true },
  { id: "balance", label: "Balance", can_hide: true },
];

export const TRIAL_BALANCE_COLUMNS = [
  { id: "code", label: "Account Code", can_hide: false },
  { id: "name", label: "Account Description", can_hide: true },
  { id: "balance_debit", label: "Debit", can_hide: true },
  { id: "balance_credit", label: "Credit", can_hide: true },
];

export const BALANCE_SHEET_COLUMNS = [
  { id: "code", label: "Account ID", can_hide: false },
  { id: "name", label: "Account Description", can_hide: true },
  { id: "balance", label: "Balance", can_hide: true },
];

export const PROFIT_LOSS_BY_JOB_COLUMNS = [
  { id: "job", label: "Job", can_hide: false },
  { id: "customer", label: "Customer", can_hide: true },
  { id: "revenue", label: "Revenue", can_hide: true },
  { id: "production", label: "Production", can_hide: true },
  { id: "expenses", label: "Expenses", can_hide: true },
  { id: "bills", label: "Bills", can_hide: true },
  { id: "labor", label: "Labor", can_hide: true },
  { id: "total_cost", label: "Total cost", can_hide: true },
  { id: "gross_profit", label: "Gross profit", can_hide: true },
  { id: "margin", label: "Margin", can_hide: true },
  { id: "actions", label: "", can_hide: false },
];

export const PROFIT_LOSS_COLUMNS = [
  { id: "name", label: "Account", can_hide: false },
  { id: "current_amount", label: "Current month", can_hide: true },
  { id: "current_pct", label: "Current %", can_hide: true },
  { id: "ytd_amount", label: "Year to date", can_hide: true },
  { id: "ytd_pct", label: "YTD %", can_hide: true },
];

export const INCOME_STATEMENT_COLUMNS = [
  { id: "name", label: "Account", can_hide: false },
  { id: "current_amount", label: "Period amount", can_hide: true },
  { id: "current_pct", label: "Period %", can_hide: true },
  { id: "ytd_amount", label: "Year to date", can_hide: true },
  { id: "ytd_pct", label: "YTD %", can_hide: true },
];

export const INVENTORY_MOVEMENTS_COLUMNS = [
  { id: "when", label: "Date", can_hide: true },
  { id: "type", label: "Type", can_hide: true },
  { id: "product", label: "Product", can_hide: false },
  { id: "document", label: "Source / detail", can_hide: true },
  { id: "party", label: "Customer / Vendor", can_hide: true },
  { id: "warehouse", label: "Warehouse", can_hide: true },
  { id: "qty", label: "Qty (inventory)", can_hide: true },
  { id: "unit", label: "Unit", can_hide: true },
  { id: "cost", label: "Unit cost", can_hide: true },
  { id: "total", label: "Total cost", can_hide: true },
];

export const INVENTORY_VALUATION_COLUMNS = [
  { id: "sku", label: "SKU", can_hide: true },
  { id: "name", label: "Product", can_hide: false },
  { id: "quantity", label: "Qty", can_hide: true },
  { id: "unit_cost", label: "Unit cost", can_hide: true },
  { id: "value", label: "Value", can_hide: true },
  { id: "potential_value", label: "Resale", can_hide: true },
];

export const INVENTORY_LOW_STOCK_COLUMNS = [
  { id: "sku", label: "SKU", can_hide: true },
  { id: "name", label: "Product", can_hide: false },
  { id: "category", label: "Category", can_hide: true },
  { id: "reorder_level", label: "Reorder", can_hide: true },
  { id: "current_stock", label: "Stock", can_hide: true },
  { id: "shortage", label: "Shortage", can_hide: true },
  { id: "alert", label: "Alert", can_hide: true },
];

export function mergeReportColumns(standardColumns, extraColumns = []) {
  const byId = new Map(standardColumns.map((col) => [col.id, col]));
  const merged = [...standardColumns];
  for (const col of extraColumns) {
    if (!col || !col.id || byId.has(col.id)) continue;
    byId.set(col.id, col);
    merged.push(col);
  }
  return merged;
}

const GL_COLUMN_ORDER = ["account", "date", "aging", "reference", "journal"];

export function mergeGlReportColumns(standardColumns, customFieldColumns = []) {
  const byId = new Map(standardColumns.map((col) => [col.id, col]));
  const merged = [...standardColumns];
  const journalIndex = merged.findIndex((col) => col.id === "journal");
  const insertAt = journalIndex >= 0 ? journalIndex + 1 : merged.length;
  const customFields = [];
  for (const col of customFieldColumns) {
    if (!col || !col.id || byId.has(col.id)) continue;
    byId.set(col.id, col);
    customFields.push(col);
  }
  if (customFields.length === 0) return merged;
  merged.splice(insertAt, 0, ...customFields);
  return merged;
}

export function sortGlReportColumns(columns) {
  const rank = (col) => {
    if (col.id && col.id.startsWith("cf:")) return 500;
    const tailRank = {
      description: 501,
      debit: 502,
      credit: 503,
      balance: 504,
    };
    if (tailRank[col.id] !== undefined) return tailRank[col.id];
    const idx = GL_COLUMN_ORDER.indexOf(col.id);
    return idx >= 0 ? idx : 400;
  };

  return [...columns].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return String(a.label).localeCompare(String(b.label));
  });
}

/** Move custom-field columns after Jrnl when they were appended at the end. */
export function normalizeGlColumnOrder(columnOrder) {
  return normalizeCustomFieldsAfterAnchor(columnOrder, "journal");
}

/**
 * Party / customer ledger: custom fields sit after Type (Jrnl equivalent).
 */
export function normalizePartyLedgerColumnOrder(columnOrder) {
  return normalizeCustomFieldsAfterAnchor(columnOrder, "type");
}

/**
 * Keep all cf:* ids as a contiguous block immediately after `anchorId`,
 * preserving relative custom-field order (selection / drag order).
 */
export function normalizeCustomFieldsAfterAnchor(columnOrder, anchorId) {
  if (!columnOrder || !columnOrder.length || !anchorId) return columnOrder;

  const anchorIdx = columnOrder.indexOf(anchorId);
  if (anchorIdx < 0) return columnOrder;

  const cfIds = columnOrder.filter((id) => String(id).startsWith("cf:"));
  if (!cfIds.length) return columnOrder;

  const without = columnOrder.filter((id) => !String(id).startsWith("cf:"));
  const insertAt = without.indexOf(anchorId) + 1;
  without.splice(insertAt, 0, ...cfIds);
  return without;
}

/**
 * When enabling a custom field, place it at the end of the CF block after the
 * anchor so click sequence becomes display sequence.
 */
export function placeCustomFieldAfterAnchor(columnOrder, columnId, anchorId) {
  if (!columnId || !String(columnId).startsWith("cf:")) {
    return columnOrder;
  }

  const base = Array.isArray(columnOrder) ? columnOrder.filter((id) => id !== columnId) : [];
  if (!anchorId || !base.includes(anchorId)) {
    base.push(columnId);
    return base;
  }

  let insertAt = base.indexOf(anchorId) + 1;
  while (insertAt < base.length && String(base[insertAt]).startsWith("cf:")) {
    insertAt += 1;
  }
  base.splice(insertAt, 0, columnId);
  return base;
}

/**
 * Aging-style: custom fields sit as a block immediately before `beforeId`
 * (e.g. Amount Due). New enables append to the end of that block.
 */
export function placeCustomFieldBeforeAnchor(columnOrder, columnId, beforeId) {
  if (!columnId || !String(columnId).startsWith("cf:")) {
    return columnOrder;
  }

  const base = Array.isArray(columnOrder) ? columnOrder.filter((id) => id !== columnId) : [];
  if (!beforeId || !base.includes(beforeId)) {
    base.push(columnId);
    return base;
  }

  const beforeIdx = base.indexOf(beforeId);
  base.splice(beforeIdx, 0, columnId);
  return base;
}

const CUSTOMER_AGING_COLUMN_RANK = {
  customer: 0,
  date: 10,
  invoice_number: 20,
  due_date: 30,
  po_number: 40,
  ship_via: 50,
  sales_rep: 60,
  amount_due: 80,
  age: 10000,
};

const VENDOR_AGING_COLUMN_RANK = {
  vendor: 0,
  date: 10,
  bill_number: 20,
  due_date: 30,
  po_number: 40,
  amount_due: 60,
  age: 10000,
  aging_label: 10001,
};

function sortAgingColumns(columns, rankMap, customFieldRank) {
  const rank = (col) => {
    if (col.id && col.id.startsWith("cf:")) return customFieldRank;
    if (rankMap[col.id] !== undefined) return rankMap[col.id];
    return 4000;
  };

  return [...columns].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return String(a.label).localeCompare(String(b.label));
  });
}

export function sortCustomerAgingReportColumns(columns) {
  return sortAgingColumns(columns, CUSTOMER_AGING_COLUMN_RANK, 70);
}

export function sortVendorAgingReportColumns(columns) {
  return sortAgingColumns(columns, VENDOR_AGING_COLUMN_RANK, 50);
}

function normalizeAgingColumnOrder(columnOrder, beforeId) {
  if (!columnOrder || !columnOrder.length) return columnOrder;

  const beforeIdx = columnOrder.indexOf(beforeId);
  if (beforeIdx < 0) return columnOrder;

  const cfIds = columnOrder.filter((id) => id.startsWith("cf:"));
  if (!cfIds.length) return columnOrder;

  const without = columnOrder.filter((id) => !id.startsWith("cf:"));
  const insertAt = without.indexOf(beforeId);
  if (insertAt < 0) return columnOrder;
  without.splice(insertAt, 0, ...cfIds);
  return without;
}

export function normalizeCustomerAgingColumnOrder(columnOrder) {
  return normalizeAgingColumnOrder(columnOrder, "amount_due");
}

export function normalizeVendorAgingColumnOrder(columnOrder) {
  return normalizeAgingColumnOrder(columnOrder, "amount_due");
}
