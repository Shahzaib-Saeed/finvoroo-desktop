/**
 * Match quality for the OCR review UI.
 *
 * Both the score and the "does a human need to look at this?" decision come
 * from the shared pharmacy engine, so the amber verify flag in the grid means
 * the same thing as the backend's `suggested` status.
 */

import { CONFIDENCE, parseLabel, scoreLabels } from './pharmacy-match-engine.js';

/**
 * Weighted pharmacy score for an invoice line against a catalog name, in 0..1.
 * Zero means the two cannot be the same product.
 */
export function scoreInvoiceCatalogMatch(invoiceName, catalogName) {
  return scoreLabels(parseLabel(invoiceName), parseLabel(catalogName)).score;
}

/** Full breakdown — component scores, blockers and rejection reason. */
export function explainInvoiceCatalogMatch(invoiceName, catalogName, catalogExtra = {}) {
  return scoreLabels(parseLabel(invoiceName), parseLabel(catalogName, catalogExtra));
}

/** Whether OCR review should flag this link for manual verification. */
export function rowNeedsVerify(row) {
  if (!row?.matched_product_id) return false;

  // Cashier confirmed the link in the match sheet — treat as verified (green).
  if (row.match_user_confirmed === true) return false;
  if (String(row.match_source || '') === 'learned_verified') return false;
  if (String(row.match_source || '') === 'global_knowledge' && row.match_status === 'matched') {
    return false;
  }
  // An exact barcode or SKU hit is a deterministic identifier, not a guess.
  if (Number(row.match_confidence) >= 0.999 && row.match_status === 'matched') return false;

  const bill = String(row.product_description || '').trim();
  const catalog = String(row.matched_product_name || '').trim();
  if (!bill || !catalog) {
    return row.match_status === 'suggested';
  }

  if (row.match_status === 'suggested') return true;
  const conf = Number(row.match_confidence);
  if (conf > 0 && conf < 0.92) return true;

  // Re-check the link against the pharmacy rules rather than trusting the
  // confidence number alone: a conflicting form or strength must surface here
  // even if something upstream reported the match as settled.
  return scoreInvoiceCatalogVerdict(bill, catalog) !== CONFIDENCE.HIGH;
}

function scoreInvoiceCatalogVerdict(invoiceName, catalogName) {
  return scoreLabels(parseLabel(invoiceName), parseLabel(catalogName)).confidence;
}

export function countVerifyRows(rows) {
  return (rows || []).filter((r) => rowNeedsVerify(r)).length;
}

/** Verify flag for Receive GRN lines (OCR handoff shape). */
export function receiveLineNeedsVerify(line) {
  if (!line?.product_id) return false;
  return rowNeedsVerify({
    matched_product_id: line.product_id,
    product_description: line.supplier_invoice_label || '',
    matched_product_name: line.name || '',
    match_status: line.match_status,
    match_confidence: line.match_confidence,
    match_user_confirmed: line.match_user_confirmed,
    match_source: line.match_source,
  });
}

export function countVerifyReceiveLines(lines) {
  return (lines || []).filter((l) => receiveLineNeedsVerify(l)).length;
}
