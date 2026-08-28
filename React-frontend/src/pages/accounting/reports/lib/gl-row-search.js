import { format, parseISO } from "date-fns";
import { formatCurrency } from "../constants";
import { getReportDisplayReference, isInternalGlRef } from "../report-reference";
import { formatJournalTypeCode } from "../journal-type-codes";
import { formatAgingLabel } from "../report-aging";
import { hasPrepaidCash, prepaidCashAmount } from "../../shared/prepaid-cash";

function pushValue(parts, value) {
  if (value == null || value === "") return;
  parts.push(String(value));
}

function pushNumber(parts, value, currency) {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) < 0.000_001) return;
  parts.push(String(n));
  parts.push(n.toFixed(2));
  parts.push(n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  if (currency) {
    parts.push(formatCurrency(n, currency));
    parts.push(formatCurrency(Math.abs(n), currency));
  }
}

function collectCustomFieldValues(parts, customFields) {
  if (!customFields || typeof customFields !== "object") return;

  for (const payload of Object.values(customFields)) {
    if (payload == null) continue;
    if (typeof payload === "string" || typeof payload === "number") {
      pushValue(parts, payload);
      continue;
    }
    if (typeof payload !== "object") continue;

    pushValue(parts, payload.value);
    pushValue(parts, payload.label);
    pushValue(parts, payload.master_label);

    if (payload.by_template && typeof payload.by_template === "object") {
      for (const value of Object.values(payload.by_template)) {
        pushValue(parts, value);
      }
    }
  }
}

function collectRowCustomFieldKeys(parts, row) {
  for (const [key, value] of Object.entries(row || {})) {
    if (!key.startsWith("cf:")) continue;
    pushValue(parts, key.slice(3));
    pushValue(parts, value);
  }
}

/** Normalize user input and cell text for fuzzy amount / currency matching. */
export function normalizeGlSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[,\s_]/g, "")
    .replace(/rs\.?/g, "")
    .replace(/pkr/g, "")
    .replace(/usd/g, "")
    .replace(/\$/g, "");
}

/**
 * Build a searchable haystack for one GL row — includes hidden columns,
 * amounts, custom fields, and formatted display values.
 */
export function buildGlRowSearchHaystack(row, { currency } = {}) {
  if (!row) return "";

  const parts = [];

  pushValue(parts, row.code);
  pushValue(parts, row.account_name);
  pushValue(parts, row.account_code);
  if (!isInternalGlRef(row.reference)) {
    pushValue(parts, row.reference);
  }
  pushValue(parts, row.display_reference);
  pushValue(parts, row.source_document_number);
  pushValue(parts, row.reference_no);
  pushValue(parts, row.payment_reference);
  pushValue(parts, row.receipt_number);
  pushValue(parts, row.payment_number);
  pushValue(parts, getReportDisplayReference(row));
  pushValue(parts, row.line_description);
  pushValue(parts, row.entry_description);
  pushValue(parts, row.description);
  pushValue(parts, row.party_name);
  pushValue(parts, row.customer_name);
  pushValue(parts, row.vendor_name);
  pushValue(parts, row.contact_name);
  pushValue(parts, row.journal_type);
  pushValue(parts, row.source_kind);
  pushValue(parts, row.aging_label);
  pushValue(parts, formatAgingLabel(row));

  pushValue(
    parts,
    formatJournalTypeCode(row.journal_type, {
      sourceKind: row.source_kind,
      reference: row.reference,
    }),
  );

  if (row.entry_date) {
    pushValue(parts, row.entry_date);
    try {
      const d = parseISO(String(row.entry_date).slice(0, 10));
      pushValue(parts, format(d, "dd/MM/yy"));
      pushValue(parts, format(d, "yyyy-MM-dd"));
      pushValue(parts, format(d, "MM/dd/yyyy"));
    } catch {
      /* ignore */
    }
  }

  pushNumber(parts, row.debit, currency);
  pushNumber(parts, row.credit, currency);
  pushNumber(parts, row.balance, currency);
  pushNumber(parts, row.running_balance, currency);

  if (hasPrepaidCash(row)) {
    parts.push("prepaid");
    pushNumber(parts, prepaidCashAmount(row), currency);
  }

  collectCustomFieldValues(parts, row.custom_fields);
  collectRowCustomFieldKeys(parts, row);

  return parts
    .map((part) => normalizeGlSearchText(part))
    .filter(Boolean)
    .join(" ");
}

/** True when `row` matches a free-text GL search term. */
export function glRowMatchesSearch(row, searchTerm, options = {}) {
  const term = normalizeGlSearchText(searchTerm);
  if (!term) return true;

  const haystack = buildGlRowSearchHaystack(row, options);
  if (haystack.includes(term)) return true;

  // Also match the raw lowercased term for text the normalizer may not touch.
  const rawHaystack = buildGlRowSearchHaystack(row, options)
    .split(" ")
    .concat(
      [
        row.reference,
        row.line_description,
        row.entry_description,
        row.party_name,
        getReportDisplayReference(row),
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase()),
    )
    .join(" ");

  return rawHaystack.includes(String(searchTerm).trim().toLowerCase());
}

/** Filter GL rows client-side (custom viewer / supplemental pass). */
export function filterGlRowsBySearch(rows, searchTerm, options = {}) {
  const term = String(searchTerm ?? "").trim();
  if (!term) return rows;
  return rows.filter((row) => glRowMatchesSearch(row, term, options));
}
