/** True when a payment / GL row still has cash not allocated to documents. */
export function hasPrepaidCash(row, threshold = 0.001) {
  if (row?.is_prepaid === true) return true;
  return Number(row?.unapplied_amount) > threshold;
}

export function prepaidCashAmount(row) {
  return Math.max(0, Number(row?.unapplied_amount) || 0);
}

/** Tooltip / title text without currency formatting (caller may append amount). */
export function prepaidNarrative(entry, formattedAmount = "") {
  const money = formattedAmount ? ` (${formattedAmount})` : "";
  const side = entry?.party_type || entry?.prepaid_side;
  if (side === "vendor") {
    return `Prepaid vendor advance${money} — not applied to a bill yet`;
  }
  if (side === "customer") {
    return `Prepaid customer receipt${money} — not applied to an invoice yet`;
  }
  return `Prepaid cash${money} — not applied to a document yet`;
}
