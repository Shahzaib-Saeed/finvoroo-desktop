import { INVOICE_LINE_AMOUNT_COL_KEYS, LINE_COL } from '../invoice-template-constants';

/** Compact row height for line grid */
export const INVOICE_LINE_ROW_H = 'h-8 min-h-8';

export const INVOICE_LINE_AMOUNT_INPUT =
  'w-full max-w-full text-right tabular-nums tracking-tight text-xs leading-none';

/**
 * Percent widths that always sum to 100% — table fits the card with no horizontal scroll.
 * Description gets the largest share; amount columns share the rest equally.
 */
export function invoiceLineColStyle(colKey, visibleCols) {
  const keys = visibleCols.map((c) => c.key);
  const amountCount = keys.filter((k) => INVOICE_LINE_AMOUNT_COL_KEYS.has(k)).length;

  const actionsW = keys.includes(LINE_COL.ACTIONS) ? 2.5 : 0;
  const descW = 18;
  const productW = keys.includes(LINE_COL.PRODUCT) ? 9 : 0;
  const taxW = keys.includes(LINE_COL.TAX) ? 6 : 0;
  const unitW = keys.includes(LINE_COL.UNIT) ? 5 : 0;
  const batchW = keys.includes(LINE_COL.BATCH_NUMBER) ? 6 : 0;
  const expiryW = keys.includes(LINE_COL.EXPIRY_DATE) ? 7 : 0;
  const mfgW = keys.includes(LINE_COL.MANUFACTURED_DATE) ? 7 : 0;

  const fixed = actionsW + descW + productW + taxW + unitW + batchW + expiryW + mfgW;
  const amountShare = amountCount > 0 ? (100 - fixed) / amountCount : 0;

  if (colKey === LINE_COL.DESCRIPTION) return { width: `${descW}%` };
  if (colKey === LINE_COL.PRODUCT) return { width: `${productW}%` };
  if (colKey === LINE_COL.TAX) return { width: `${taxW}%` };
  if (colKey === LINE_COL.UNIT) return { width: `${unitW}%` };
  if (colKey === LINE_COL.BATCH_NUMBER) return { width: `${batchW}%` };
  if (colKey === LINE_COL.EXPIRY_DATE) return { width: `${expiryW}%` };
  if (colKey === LINE_COL.MANUFACTURED_DATE) return { width: `${mfgW}%` };
  if (colKey === LINE_COL.ACTIONS) return { width: `${actionsW}%` };
  if (INVOICE_LINE_AMOUNT_COL_KEYS.has(colKey)) return { width: `${amountShare}%` };
  return undefined;
}

export function invoiceLineThClass(colKey) {
  const base =
    'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground py-1.5 border-r last:border-r-0 whitespace-nowrap leading-tight';
  if (colKey === LINE_COL.DESCRIPTION || colKey === LINE_COL.PRODUCT || colKey === LINE_COL.TAX) {
    return `${base} text-left px-1.5`;
  }
  if (INVOICE_LINE_AMOUNT_COL_KEYS.has(colKey)) {
    return `${base} text-center px-1`;
  }
  if (colKey === LINE_COL.UNIT) {
    return `${base} text-center px-0.5`;
  }
  return `${base} text-center px-0.5`;
}
