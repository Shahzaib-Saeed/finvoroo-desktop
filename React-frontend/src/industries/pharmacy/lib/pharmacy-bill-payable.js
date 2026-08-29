/** Bill payable — whole rupees (.50+ rounds up, below .50 rounds down). */
export function roundBillPayable(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function money2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Keep total = subtotal − discount + tax + other after snapping to whole rupees.
 */
export function absorbBillPayable({ discount = 0, other = 0, payable = 0 } = {}) {
  const exact = money2(payable);
  const rounded = roundBillPayable(exact);
  const delta = money2(rounded - exact);
  let nextDiscount = money2(discount);
  let nextOther = money2(other);
  if (delta > 0) nextOther = money2(nextOther + delta);
  else if (delta < 0) nextDiscount = money2(nextDiscount - delta);
  return {
    discount_amount: nextDiscount,
    other_charges: nextOther,
    total: rounded,
    rounding: delta,
  };
}
