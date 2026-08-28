import { format } from 'date-fns';
import { formatCurrency } from '../invoices/constants';

export { formatCurrency };

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

export const APPROVAL_COLORS = {
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export const EMPTY_ALLOCATION_ROW = {
  invoice_id: '',
  invoice_number: '',
  invoice_date: '',
  due_date_display: '',
  balance_due: 0,
  currency: '',
  selected: false,
  discount: '',
  cash: '',
  cn_id: '',
  cn_amt: '',
  src_id: '',
  src_amt: '',
};

export const EMPTY_PAYMENT_FORM = {
  customer_id: '',
  job_order_id: '',
  payment_date: format(new Date(), 'yyyy-MM-dd'),
  amount: '',
  currency: 'USD',
  payment_method: 'cash',
  deposit_account_id: '',
  reference: '',
  memo: '',
  billing_address: '',
  opening_balance_amount: '',
};

export function invoiceRowFromApi(inv) {
  return {
    ...EMPTY_ALLOCATION_ROW,
    invoice_id: String(inv.id),
    invoice_number: inv.invoice_number || '',
    invoice_date: inv.invoice_date || '',
    due_date_display: inv.due_date_display || inv.due_date || '',
    balance_due: Number(inv.balance_due) || 0,
    currency: inv.currency || '',
    selected: false,
  };
}

export function applyPrefillToRow(row, prefill) {
  if (!prefill) return row;
  const cash = Number(prefill.cash) || 0;
  const discount = Number(prefill.discount) || 0;
  const cnAmt = Number(prefill.cn_amt) || 0;
  const srcAmt = Number(prefill.src_amt) || 0;
  const hasAlloc = cash > 0 || discount > 0 || cnAmt > 0 || srcAmt > 0;
  if (!hasAlloc) return row;

  return normalizeAllocationRow(row, {
    selected: true,
    cash: cash > 0 ? String(cash) : '',
    discount: discount > 0 ? String(discount) : '',
    cn_id: prefill.cn_id ? String(prefill.cn_id) : '',
    cn_amt: cnAmt > 0 ? String(cnAmt) : '',
    src_id: prefill.src_id ? String(prefill.src_id) : '',
    src_amt: srcAmt > 0 ? String(srcAmt) : '',
  });
}

export function rowHasAllocation(row) {
  return (
    row.selected &&
    ((Number(row.cash) || 0) > 0 ||
      (Number(row.discount) || 0) > 0 ||
      (Number(row.cn_amt) || 0) > 0 ||
      (Number(row.src_amt) || 0) > 0)
  );
}

/** Sum cash + credits on selected rows, plus any opening-balance allocation → amount received field. */
export function amountReceivedFromRows(rows, openingBalanceAmount = 0) {
  let sum = Number(openingBalanceAmount) || 0;
  (rows || []).forEach((row) => {
    if (!row.selected) return;
    sum +=
      (Number(row.cash) || 0) + (Number(row.cn_amt) || 0) + (Number(row.src_amt) || 0);
  });
  const rounded = Math.round(sum * 100) / 100;
  return rounded > 0 ? String(rounded) : '';
}

export function moneyRound(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Remaining open balance after cash + discount + credits on a row. */
export function rowRemainingDue(row) {
  const due = Number(row?.balance_due) || 0;
  const used =
    (Number(row?.cash) || 0) +
    (Number(row?.discount) || 0) +
    (Number(row?.cn_amt) || 0) +
    (Number(row?.src_amt) || 0);
  return moneyRound(due - used);
}

function formatAllocAmount(n) {
  return n > 0 ? String(moneyRound(n)) : '';
}

/**
 * Sage-style clamp: discount/credits cannot exceed open balance, and cash
 * payment is reduced so cash + discount + credits never exceeds the invoice.
 *
 * Example: due 10,000 + discount 5,000 → cash auto-caps at 5,000.
 */
export function normalizeAllocationRow(row, patch = {}) {
  const next = { ...row, ...patch };
  if (patch.cn_id === '' || patch.cn_id === '_none') {
    next.cn_id = '';
    next.cn_amt = '';
  }
  if (patch.src_id === '' || patch.src_id === '_none') {
    next.src_id = '';
    next.src_amt = '';
  }

  const due = Math.max(0, Number(next.balance_due) || 0);
  let discount = Math.max(0, Number(next.discount) || 0);
  let cn = next.cn_id ? Math.max(0, Number(next.cn_amt) || 0) : 0;
  let src = next.src_id ? Math.max(0, Number(next.src_amt) || 0) : 0;
  let cash = Math.max(0, Number(next.cash) || 0);

  discount = Math.min(discount, due);
  const afterDiscount = Math.max(0, due - discount);
  cn = Math.min(cn, afterDiscount);
  src = Math.min(src, Math.max(0, afterDiscount - cn));

  const roomForCash = Math.max(0, due - discount - cn - src);
  cash = Math.min(cash, roomForCash);

  return {
    ...next,
    selected: !!(next.selected || cash > 0 || discount > 0 || cn > 0 || src > 0),
    discount: formatAllocAmount(discount),
    cn_amt: next.cn_id ? formatAllocAmount(cn) : '',
    src_amt: next.src_id ? formatAllocAmount(src) : '',
    cash: formatAllocAmount(cash),
  };
}

export function defaultCashForRow(row) {
  const balance = Number(row.balance_due) || 0;
  const discount = Number(row.discount) || 0;
  const cn = Number(row.cn_amt) || 0;
  const src = Number(row.src_amt) || 0;
  const cash = Math.max(0, balance - discount - cn - src);
  return cash > 0 ? String(moneyRound(cash)) : '';
}

/**
 * Receipt summary totals (cash vs write-off kept separate — Sage-style).
 * - cashApplied: money taken from Amount received
 * - discountTotal: settlement write-off (not cash)
 * - settled: cash + discount + credits clearing invoices
 * - unapplied: Amount received left as prepaid
 */
export function calcAllocationTotals(rows, amountReceived, openingBalanceAmount = 0) {
  const openingCash = Number(openingBalanceAmount) || 0;
  let invoiceCash = 0;
  let creditApplied = 0;
  let discountTotal = 0;
  let selectedDue = 0;

  rows.forEach((row) => {
    if (!row.selected) return;
    selectedDue += Number(row.balance_due) || 0;
    discountTotal += Number(row.discount) || 0;
    invoiceCash += Number(row.cash) || 0;
    creditApplied += (Number(row.cn_amt) || 0) + (Number(row.src_amt) || 0);
  });

  const received = Number(amountReceived) || 0;
  const cashApplied = moneyRound(invoiceCash + openingCash);
  const credits = moneyRound(creditApplied);
  const discount = moneyRound(discountTotal);
  const invoiceSettled = moneyRound(invoiceCash + discount + credits);
  const settled = moneyRound(invoiceSettled + openingCash);
  const unapplied = moneyRound(Math.max(0, received - cashApplied));
  const stillDue = moneyRound(Math.max(0, selectedDue - invoiceSettled));

  return {
    /** @deprecated use settled — kept so older UI bindings don't break */
    applied: settled,
    settled,
    cashApplied,
    creditApplied: credits,
    discountTotal: discount,
    selectedDue: moneyRound(selectedDue),
    stillDue,
    received,
    unapplied,
  };
}

export function buildPaymentPayload(form, rows) {
  const target_invoice_ids = [];
  const cash_amounts = [];
  const discount_amounts = [];
  const cn_ids = [];
  const cn_amounts = [];
  const src_invoice_ids = [];
  const src_amounts = [];

  rows.forEach((row) => {
    if (!row.invoice_id) return;
    const cash = Number(row.cash) || 0;
    const discount = Number(row.discount) || 0;
    const cnAmt = Number(row.cn_amt) || 0;
    const srcAmt = Number(row.src_amt) || 0;
    if (!row.selected && cash <= 0 && discount <= 0 && cnAmt <= 0 && srcAmt <= 0) return;

    target_invoice_ids.push(Number(row.invoice_id));
    cash_amounts.push(cash);
    discount_amounts.push(discount);
    cn_ids.push(row.cn_id ? Number(row.cn_id) : '');
    cn_amounts.push(cnAmt);
    src_invoice_ids.push(row.src_id ? Number(row.src_id) : '');
    src_amounts.push(srcAmt);
  });

  return {
    customer_id: Number(form.customer_id),
    payment_date: form.payment_date,
    amount: form.amount === '' ? 0 : Number(form.amount) || 0,
    currency: form.currency || null,
    payment_method: form.payment_method || 'cash',
    deposit_account_id: form.deposit_account_id ? Number(form.deposit_account_id) : null,
    reference: form.reference || null,
    memo: form.memo || null,
    job_order_id: form.job_order_id ? Number(form.job_order_id) : null,
    target_invoice_ids,
    cash_amounts,
    discount_amounts,
    cn_ids,
    cn_amounts,
    src_invoice_ids,
    src_amounts,
    opening_balance_amount:
      form.opening_balance_amount === '' ? 0 : Number(form.opening_balance_amount) || 0,
  };
}

const APPLICATION_TYPE_LABELS = {
  cash_invoice: 'Payment on invoice',
  credit_note: 'Credit note applied',
  credit_note_application: 'Credit note applied',
  overpayment: 'Overpayment applied',
  overpayment_transfer: 'Overpayment applied',
  unapplied: 'On account',
  unapplied_cash: 'On account',
  opening_balance: 'Opening balance applied',
};

export function applicationTypeLabel(type) {
  if (!type) return '—';
  const key = String(type).trim();
  if (APPLICATION_TYPE_LABELS[key]) return APPLICATION_TYPE_LABELS[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resolveDepositAccountLabel(depositAccounts, accountId) {
  if (!accountId || !depositAccounts?.length) return null;
  const id = Number(accountId);
  const match = depositAccounts.find((a) => Number(a.id) === id);
  if (!match) return null;
  const num = match.account_number || match.number;
  const name = match.name || match.label;
  if (num && name) return `${num} — ${name}`;
  return name || num || null;
}

export function sumPaymentApplications(applications) {
  return Math.round(
    (applications || []).reduce((sum, a) => sum + (Number(a.amount_applied) || 0), 0) * 100,
  ) / 100;
}

export function mapPaymentToForm(payment, baseCurrency = 'USD') {
  if (!payment) return { ...EMPTY_PAYMENT_FORM };

  return {
    ...EMPTY_PAYMENT_FORM,
    customer_id: payment.customer_id ? String(payment.customer_id) : '',
    job_order_id: payment.job_order_id ? String(payment.job_order_id) : '',
    payment_date: payment.payment_date || EMPTY_PAYMENT_FORM.payment_date,
    amount: payment.amount != null ? String(payment.amount) : '',
    currency: payment.currency || baseCurrency,
    payment_method: payment.payment_method || 'cash',
    deposit_account_id: payment.deposit_account_id
      ? String(payment.deposit_account_id)
      : '',
    reference: payment.reference || '',
    memo: payment.memo || '',
    opening_balance_amount: '',
  };
}
