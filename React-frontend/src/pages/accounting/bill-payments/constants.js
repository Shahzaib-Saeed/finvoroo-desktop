import { format } from 'date-fns';
import { formatCurrency } from '../invoices/constants';

export { formatCurrency };

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'card', label: 'Card' },
  { value: 'vendor_credit', label: 'Vendor Credit' },
];

export const APPROVAL_COLORS = {
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export const BILL_STATUS_COLORS = {
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  open: 'bg-secondary text-secondary-foreground',
};

export const EMPTY_BILL_ROW = {
  bill_id: '',
  bill_number: '',
  vendor_name: '',
  bill_date: '',
  due_date_display: '',
  balance_due: 0,
  currency: '',
  selected: false,
  cash: '',
  vc_id: '',
  vc_amount: '',
};

export const EMPTY_BILL_PAYMENT_FORM = {
  vendor_id: '',
  job_order_id: '',
  payment_date: format(new Date(), 'yyyy-MM-dd'),
  amount: '',
  currency: 'USD',
  payment_method: 'cash',
  payment_account_id: '',
  reference: '',
  memo: '',
  opening_balance_amount: '',
};

export function billRowFromApi(bill, vendorName = '') {
  return {
    ...EMPTY_BILL_ROW,
    bill_id: String(bill.id),
    bill_number: bill.bill_number || '',
    vendor_name: vendorName,
    bill_date: bill.bill_date || '',
    due_date_display: bill.due_date_display || bill.due_date || '',
    balance_due: Number(bill.balance_due) || 0,
    currency: bill.currency || '',
    selected: false,
  };
}

export function applyBillPrefill(row, prefill) {
  if (!prefill) return row;
  const cash = Number(prefill.cash) || 0;
  const vcAmt = Number(prefill.vc_amount) || 0;
  if (cash <= 0 && vcAmt <= 0) return row;

  return {
    ...row,
    selected: true,
    cash: cash > 0 ? String(cash) : '',
    vc_id: prefill.vc_id ? String(prefill.vc_id) : '',
    vc_amount: vcAmt > 0 ? String(vcAmt) : '',
  };
}

/** Unwrap Laravel `{ data: [...] }` resource collections. */
export function unwrapResourceList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.data)) return value.data;
  return [];
}

/** Normalize server prefill map (object keyed by bill id). */
export function normalizePrefillMap(prefill) {
  if (!prefill || Array.isArray(prefill)) return {};
  return Object.fromEntries(
    Object.entries(prefill).map(([billId, row]) => [
      String(billId),
      {
        cash: Number(row?.cash) || 0,
        vc_id: row?.vc_id ?? null,
        vc_amount: Number(row?.vc_amount) || 0,
      },
    ]),
  );
}

/** Build allocation prefill from payment.applications when server prefill is missing. */
export function buildPrefillFromPaymentApplications(payment) {
  const prefill = {};
  unwrapResourceList(payment?.applications).forEach((app) => {
    if (!app?.bill_id) return;
    const key = String(app.bill_id);
    if (!prefill[key]) {
      prefill[key] = { cash: 0, vc_id: null, vc_amount: 0 };
    }
    const amt = Number(app.amount_applied) || 0;
    const isCredit = Boolean(app.vendor_credit_id) || app.is_cash === false;
    if (isCredit && app.vendor_credit_id) {
      prefill[key].vc_id = app.vendor_credit_id;
      prefill[key].vc_amount += amt;
    } else {
      prefill[key].cash += amt;
    }
  });
  return prefill;
}

/** Merge prefill sources for edit mode (server map, payment apps, per-bill fields). */
export function resolveBillPaymentPrefillMap(payment, allocationPrefill, bills = []) {
  const merged = {
    ...buildPrefillFromPaymentApplications(payment),
    ...normalizePrefillMap(allocationPrefill),
  };

  (bills || []).forEach((bill) => {
    const cash = Number(bill.applied_cash) || 0;
    const vcAmt = Number(bill.applied_vc_amount) || 0;
    if (cash <= 0 && vcAmt <= 0) return;
    const key = String(bill.id);
    merged[key] = {
      cash,
      vc_id: bill.applied_vc_id ?? merged[key]?.vc_id ?? null,
      vc_amount: vcAmt,
    };
  });

  return merged;
}

export function prefillForBill(bill, prefillMap = {}) {
  const fromMap = prefillMap[String(bill.id)] || prefillMap[bill.id];
  if (fromMap && ((Number(fromMap.cash) || 0) > 0 || (Number(fromMap.vc_amount) || 0) > 0)) {
    return fromMap;
  }
  const cash = Number(bill.applied_cash) || 0;
  const vcAmt = Number(bill.applied_vc_amount) || 0;
  if (cash <= 0 && vcAmt <= 0) return null;
  return {
    cash,
    vc_id: bill.applied_vc_id ?? null,
    vc_amount: vcAmt,
  };
}

/**
 * Build bill allocation rows for edit mode — always restores checked rows + cash/credit.
 */
export function buildBillRowsForEdit(bills, payment, prefillMap = {}) {
  const vendorName = payment?.vendor?.name || '';
  const paymentAmount = Number(payment?.amount) || 0;
  const mergedPrefill = { ...prefillMap, ...buildPrefillFromPaymentApplications(payment) };

  const rows = (bills || []).map((bill) => {
    let row = billRowFromApi(bill, vendorName);
    const pf = prefillForBill(bill, mergedPrefill);
    if (pf) {
      row = applyBillPrefill(row, {
        cash: pf.cash,
        vc_id: pf.vc_id,
        vc_amount: pf.vc_amount,
      });
    }
    return row;
  });

  // Add rows for applications whose bill is not in the open-bills list
  unwrapResourceList(payment?.applications).forEach((app) => {
    if (!app?.bill_id) return;
    const billId = String(app.bill_id);
    if (rows.some((r) => String(r.bill_id) === billId)) return;

    const isCredit = Boolean(app.vendor_credit_id) || app.is_cash === false;
    const amt = Number(app.amount_applied) || 0;
    rows.push(
      applyBillPrefill(
        {
          ...EMPTY_BILL_ROW,
          bill_id: billId,
          bill_number: app.bill_number || `#${app.bill_id}`,
          vendor_name: vendorName,
          balance_due: amt,
          currency: payment?.currency || '',
        },
        {
          cash: isCredit && app.vendor_credit_id ? 0 : amt,
          vc_id: isCredit ? app.vendor_credit_id : null,
          vc_amount: isCredit ? amt : 0,
        },
      ),
    );
  });

  let hasSelection = rows.some(
    (r) => r.selected && ((Number(r.cash) || 0) > 0 || (Number(r.vc_amount) || 0) > 0),
  );

  // Fallback: one open bill + payment amount (common edit case)
  if (!hasSelection && paymentAmount > 0 && rows.length === 1) {
    rows[0] = applyBillPrefill(rows[0], {
      cash: paymentAmount,
      vc_id: null,
      vc_amount: 0,
    });
    hasSelection = true;
  }

  // Fallback: match applications to rows by bill_id
  if (!hasSelection && paymentAmount > 0) {
    unwrapResourceList(payment?.applications).forEach((app) => {
      if (!app?.bill_id) return;
      const idx = rows.findIndex((r) => String(r.bill_id) === String(app.bill_id));
      if (idx < 0) return;
      const isCredit = Boolean(app.vendor_credit_id) || app.is_cash === false;
      const amt = Number(app.amount_applied) || 0;
      rows[idx] = applyBillPrefill(rows[idx], {
        cash: isCredit && app.vendor_credit_id ? 0 : amt,
        vc_id: isCredit ? app.vendor_credit_id : null,
        vc_amount: isCredit ? amt : 0,
      });
    });
  }

  return rows;
}

export function rowHasBillAllocation(row) {
  return (
    row.selected &&
    ((Number(row.cash) || 0) > 0 || (Number(row.vc_amount) || 0) > 0)
  );
}

/** Sum cash + vendor credits on selected rows (+ opening balance) → amount paid field. */
export function amountPaidFromRows(rows, openingBalanceAmount = 0) {
  let sum = Number(openingBalanceAmount) || 0;
  (rows || []).forEach((row) => {
    if (!row.selected) return;
    sum += (Number(row.cash) || 0) + (Number(row.vc_amount) || 0);
  });
  const rounded = Math.round(sum * 100) / 100;
  return rounded > 0 ? String(rounded) : '';
}

export function defaultCashForBillRow(row) {
  const balance = Number(row.balance_due) || 0;
  const vc = Number(row.vc_amount) || 0;
  const cash = Math.max(0, balance - vc);
  return cash > 0 ? String(Number(cash.toFixed(2))) : '';
}

export function calcBillPaymentTotals(rows, amountPaid, openingBalanceAmount = 0) {
  let applied = 0;
  let cashTotal = 0;
  let creditTotal = 0;

  rows.forEach((row) => {
    if (!row.selected) return;
    const cash = Number(row.cash) || 0;
    const vc = Number(row.vc_amount) || 0;
    cashTotal += cash;
    creditTotal += vc;
    applied += cash + vc;
  });

  // Cash applied to the vendor's opening balance is a cash allocation too.
  const obAmount = Number(openingBalanceAmount) || 0;
  cashTotal += obAmount;
  applied += obAmount;

  const received = Number(amountPaid) || 0;
  const unapplied = Math.max(0, received - applied);

  return {
    applied: Math.round(applied * 100) / 100,
    cashTotal: Math.round(cashTotal * 100) / 100,
    creditTotal: Math.round(creditTotal * 100) / 100,
    received,
    unapplied: Math.round(unapplied * 100) / 100,
  };
}

export function distributeCashToBillRows(rows, amountPaid) {
  if (!rows.length) {
    return { next: rows, appliedAny: false, hasSelected: false };
  }

  const hasSelected = rows.some((r) => r.selected);
  let remaining = amountPaid;
  let appliedAny = false;

  const next = rows.map((row) => {
    const shouldApply = hasSelected ? row.selected : remaining > 0;

    if (!shouldApply) {
      return hasSelected ? { ...row, cash: '' } : { ...row, selected: false, cash: '' };
    }

    const due = Number(row.balance_due) || 0;
    const vc = Number(row.vc_amount) || 0;
    const room = Math.max(0, due - vc);

    if (room <= 0) {
      return hasSelected
        ? { ...row, selected: true, cash: '' }
        : { ...row, selected: false, cash: '' };
    }

    const cash = Math.min(room, remaining);
    remaining -= cash;
    if (cash > 0) appliedAny = true;

    return {
      ...row,
      selected: true,
      cash: cash > 0 ? String(Number(cash.toFixed(2))) : '',
    };
  });

  return { next, appliedAny, hasSelected };
}

export function buildBillPaymentPayload(form, rows) {
  const bill_ids = [];
  const cash_amounts = [];
  const vc_ids = [];
  const vc_amounts = [];

  rows.forEach((row) => {
    if (!row.bill_id) return;
    const cash = Number(row.cash) || 0;
    const vcAmt = Number(row.vc_amount) || 0;
    if (!row.selected && cash <= 0 && vcAmt <= 0) return;

    bill_ids.push(Number(row.bill_id));
    cash_amounts.push(cash);
    vc_ids.push(row.vc_id ? Number(row.vc_id) : null);
    vc_amounts.push(vcAmt);
  });

  return {
    vendor_id: Number(form.vendor_id),
    job_order_id: form.job_order_id ? Number(form.job_order_id) : null,
    payment_date: form.payment_date,
    amount: form.amount === '' ? 0 : Number(form.amount) || 0,
    currency: form.currency || undefined,
    payment_method: form.payment_method || 'cash',
    payment_account_id: form.payment_account_id
      ? Number(form.payment_account_id)
      : undefined,
    reference: form.reference || undefined,
    memo: form.memo || undefined,
    bill_ids,
    cash_amounts,
    vc_ids,
    vc_amounts,
    opening_balance_amount:
      form.opening_balance_amount === '' ? 0 : Number(form.opening_balance_amount) || 0,
  };
}

export function mapBillPaymentToForm(payment, baseCurrency = 'USD') {
  if (!payment) return { ...EMPTY_BILL_PAYMENT_FORM };

  return {
    vendor_id: payment.vendor_id ? String(payment.vendor_id) : '',
    job_order_id: payment.job_order_id ? String(payment.job_order_id) : '',
    payment_date: payment.payment_date || format(new Date(), 'yyyy-MM-dd'),
    amount: payment.amount != null && payment.amount !== '' ? String(payment.amount) : '',
    currency: payment.currency || baseCurrency,
    payment_method: payment.payment_method || 'cash',
    payment_account_id: payment.payment_account_id
      ? String(payment.payment_account_id)
      : '',
    reference: payment.reference || '',
    memo: payment.memo || '',
    opening_balance_amount: '',
  };
}
