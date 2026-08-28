import { money } from './pharmacy-cart';

/** Standard rounding — 2.49 → 2, 2.50 → 3 */
export function roundWholeRupee(value) {
  return money(Math.round(Number(value) || 0));
}

/** Pharmacy POS / pay dialog — always whole rupees, no paise. */
export function formatPharmacyPosMoney(formatMoney, amount) {
  const n = roundWholeRupee(amount);
  return String(formatMoney(n)).replace(/(\.\d{1,2})$/, '');
}

/** Quick cash buttons — whole-rupee due plus common PKR notes near/above the total. */
export function suggestCashTenderAmounts(total) {
  const due = roundWholeRupee(total);
  if (due <= 0) return [0];

  const amounts = new Set();
  amounts.add(due);

  const roundUp = (value, step) => Math.ceil(value / step) * step;

  for (const step of [10, 50, 100, 200, 500, 1000]) {
    const candidate = roundWholeRupee(roundUp(due, step));
    if (candidate >= due) amounts.add(candidate);
  }

  for (const note of [200, 300, 400, 500, 1000, 2000, 5000]) {
    if (note >= due) amounts.add(note);
  }

  return [...amounts].sort((a, b) => a - b).slice(0, 8);
}

export function parseTenderInput(value) {
  const cleaned = String(value ?? '')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');
  if (!cleaned || cleaned === '.') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? money(n) : 0;
}
