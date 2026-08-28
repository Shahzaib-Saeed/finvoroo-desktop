/**
 * Paid invoice/bill marker for party ledger reference columns.
 * Uses a fixed-width slot so references stay aligned whether paid or not.
 */

export function isPaidInvoiceLedgerEntry(entry) {
  if (entry?.is_paid === true) return true;
  if (String(entry?.entry_type || "").toLowerCase() !== "invoice") return false;
  if (String(entry?.invoice_status || "").toLowerCase() === "paid") return true;
  if (entry?.balance_due !== null && entry?.balance_due !== undefined) {
    return Number(entry.balance_due) <= 0.001;
  }
  return false;
}

export function isPaidBillLedgerEntry(entry) {
  if (entry?.is_paid === true) return true;
  if (String(entry?.entry_type || "").toLowerCase() !== "bill") return false;
  if (String(entry?.bill_status || "").toLowerCase() === "paid") return true;
  if (entry?.balance_due !== null && entry?.balance_due !== undefined) {
    return Number(entry.balance_due) <= 0.001;
  }
  return false;
}

export function isPaidPartyLedgerEntry(entry) {
  return isPaidInvoiceLedgerEntry(entry) || isPaidBillLedgerEntry(entry);
}

/** Fixed two-character prefix for CSV / plain-text exports. */
export function formatPaidReferenceExport(reference, paid) {
  const ref = String(reference ?? "").trim();
  if (!ref) return paid ? "*" : "";
  return paid ? `* ${ref}` : `  ${ref}`;
}

export function PaidReferenceMarker({ paid, className = "" }) {
  return (
    <span
      className={`inline-flex w-3 shrink-0 justify-center font-semibold leading-none text-emerald-600 ${className}`.trim()}
      title={paid ? "Paid" : undefined}
      aria-hidden={!paid}
      aria-label={paid ? "Paid" : undefined}
    >
      {paid ? "*" : "\u00a0"}
    </span>
  );
}

export function PaidReferenceLabel({ paid, children, className = "" }) {
  return (
    <span
      className={`flex min-w-0 items-center gap-0.5 ${className}`.trim()}
    >
      <PaidReferenceMarker paid={paid} />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

export function PaidReferenceLegend({ className = "" }) {
  return (
    <p
      className={`text-xs text-slate-500 ${className}`.trim()}
      aria-label="Paid document legend"
    >
      <span className="font-semibold text-emerald-600">*</span> Paid in full
    </p>
  );
}
