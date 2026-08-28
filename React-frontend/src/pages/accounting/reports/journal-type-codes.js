/**
 * Classic journal short codes for report display.
 *
 * Sales Invoice / Credit Note → SJ
 * Purchase Bill / Vendor Credit → PJ
 * Customer Receipt → CRJ
 * Vendor Payment → CDJ
 * Manual / general → GJ
 * Inventory adjustment / stock → IJ
 * Fixed asset → FAJ
 * Payroll → PRJ
 */

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

const JOURNAL_TYPE_META = {
  invoice: { code: "SJ", label: "Sales Journal" },
  credit_note: { code: "SJ", label: "Sales Journal" },
  bill: { code: "PJ", label: "Purchase Journal" },
  vendor_credit: { code: "PJ", label: "Purchase Journal" },
  payment_received: { code: "CRJ", label: "Cash Receipts Journal" },
  deposit: { code: "CRJ", label: "Cash Receipts Journal" },
  bill_payment: { code: "CDJ", label: "Cash Disbursements Journal" },
  withdrawal: { code: "CDJ", label: "Cash Disbursements Journal" },
  expense: { code: "CDJ", label: "Cash Disbursements Journal" },
  payroll: { code: "PRJ", label: "Payroll Journal" },
  general: { code: "GJ", label: "General Journal" },
  manual: { code: "GJ", label: "General Journal" },
  transfer: { code: "GJ", label: "General Journal" },
  adjustment: { code: "GJ", label: "General Journal" },
  opening_balance: { code: "GJ", label: "General Journal" },
  opening: { code: "GJ", label: "General Journal" },
  fixed_asset: { code: "FAJ", label: "Fixed Asset Journal" },
  fixed_assets: { code: "FAJ", label: "Fixed Asset Journal" },
  depreciation: { code: "FAJ", label: "Fixed Asset Journal" },
  inventory: { code: "IJ", label: "Inventory Journal" },
  stock_adjustment: { code: "IJ", label: "Inventory Journal" },
  stock_movement: { code: "IJ", label: "Inventory Journal" },
};

/** Party-ledger document types (AR / AP subledgers). */
const LEDGER_AR_META = {
  invoice: { code: "SJ", label: "Sales Invoice" },
  payment: { code: "CRJ", label: "Customer Receipt" },
  credit_note: { code: "SJ", label: "Credit Note" },
  opening_balance: { code: "GJ", label: "Opening Balance" },
};

const LEDGER_AP_META = {
  bill: { code: "PJ", label: "Purchase Bill" },
  payment: { code: "CDJ", label: "Vendor Payment" },
  vendor_credit: { code: "PJ", label: "Vendor Credit" },
  opening_balance: { code: "GJ", label: "Opening Balance" },
};

function isInventoryJournalHint(sourceKind, reference) {
  const sk = String(sourceKind || "").toLowerCase();
  if (
    sk.includes("inventory") ||
    sk.includes("stock") ||
    sk.includes("cogs")
  ) {
    return true;
  }
  const ref = String(reference || "").toUpperCase();
  return (
    ref.startsWith("ADJ-") ||
    ref.startsWith("INVRECON") ||
    ref.startsWith("COGSTRUEUP") ||
    ref.startsWith("STOCK")
  );
}

function fallbackMeta(key) {
  if (!key) return { code: "GJ", label: "General Journal" };
  const compact = key.replace(/_/g, "").toUpperCase();
  if (compact.length <= 4) {
    return { code: compact, label: key.replace(/_/g, " ") };
  }
  return {
    code: compact.slice(0, 3),
    label: key.replace(/_/g, " "),
  };
}

/**
 * @param {string|null|undefined} value  acc_journal_entries.type
 * @param {{ sourceKind?: string|null, reference?: string|null }} [hints]
 * @returns {{ code: string, label: string }}
 */
export function getJournalTypeMeta(value, hints = {}) {
  const key = normalizeKey(value);
  if (!key) return { code: "GJ", label: "General Journal" };

  if (
    (key === "adjustment" || key === "general") &&
    isInventoryJournalHint(hints.sourceKind, hints.reference)
  ) {
    return { code: "IJ", label: "Inventory Journal" };
  }

  return JOURNAL_TYPE_META[key] || fallbackMeta(key);
}

/** Short code only (GL Jrnl column / CSV). */
export function formatJournalTypeCode(value, hints = {}) {
  return getJournalTypeMeta(value, hints).code;
}

/**
 * @param {{ entry_type?: string, entry_type_label?: string }|null|undefined} entry
 * @param {"ar"|"ap"|"customer"|"vendor"} [mode]
 * @returns {{ code: string, label: string }}
 */
export function getLedgerEntryTypeMeta(entry, mode = "ar") {
  const key = normalizeKey(entry?.entry_type);
  const ap = mode === "ap" || mode === "vendor";
  const mapped = (ap ? LEDGER_AP_META : LEDGER_AR_META)[key];
  if (mapped) return mapped;

  const journal = JOURNAL_TYPE_META[key];
  if (journal) return journal;

  const label =
    entry?.entry_type_label ||
    (key ? key.replace(/_/g, " ") : "—");
  if (!key) return { code: "GJ", label: String(label) };
  return { ...fallbackMeta(key), label: String(label) };
}

export function formatLedgerEntryTypeCode(entry, mode = "ar") {
  return getLedgerEntryTypeMeta(entry, mode).code;
}
