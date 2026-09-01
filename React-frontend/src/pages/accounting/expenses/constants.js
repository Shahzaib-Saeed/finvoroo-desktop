const today = () => new Date().toISOString().slice(0, 10);

export const APPROVAL_STATUSES = [
  { value: 'all', label: 'All approvals' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

export const APPROVAL_COLORS = {
  approved: 'text-emerald-700 border-emerald-200 bg-emerald-50',
  pending: 'text-amber-700 border-amber-200 bg-amber-50',
  rejected: 'text-destructive border-destructive/20 bg-destructive/5',
};

export const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const EMPTY_EXPENSE_FORM = {
  vendor_id: '',
  job_order_id: '',
  category_id: '',
  expense_account_id: '',
  payment_account_id: '',
  amount: '',
  currency: 'USD',
  expense_date: today(),
  reference: '',
  description: '',
  receipt: null,
  expense_metadata_custom_fields: {},
};

export const EMPTY_RECURRING_FORM = {
  name: '',
  expense_account_id: '',
  payment_account_id: '',
  amount: '',
  frequency: 'monthly',
  start_date: today(),
  end_date: '',
  next_run_date: today(),
  description: '',
  is_active: true,
};

export const DEFAULT_OPERATING_EXPENSE_CODE = '60000';

export function pickDefaultExpenseAccountId(accounts = []) {
  if (!Array.isArray(accounts) || accounts.length === 0) return '';
  const match = accounts.find((a) => {
    const code = String(a.code ?? a.account_number ?? '').trim();
    return code === DEFAULT_OPERATING_EXPENSE_CODE;
  });
  return String((match ?? accounts[0]).id);
}

export function buildPharmacyExpenseFormDefaults(expenseAccounts = [], currency = 'PKR') {
  return {
    ...EMPTY_EXPENSE_FORM,
    currency,
    expense_date: today(),
    expense_account_id: pickDefaultExpenseAccountId(expenseAccounts),
  };
}

export function formatCurrency(amount, currency = 'USD') {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

export function accountLabel(acc) {
  if (!acc) return '—';
  const code = acc.code ?? acc.account_number ?? '';
  const name = acc.name ?? '';
  return code ? `${code} — ${name}` : name || '—';
}

export function formatFrequency(freq) {
  if (!freq) return '—';
  return String(freq).charAt(0).toUpperCase() + String(freq).slice(1);
}

export function buildExpenseFormData(form) {
  const fd = new FormData();
  if (form.vendor_id) fd.append('vendor_id', form.vendor_id);
  if (form.category_id) fd.append('category_id', form.category_id);
  fd.append('expense_account_id', form.expense_account_id);
  if (form.payment_account_id) fd.append('payment_account_id', form.payment_account_id);
  fd.append('amount', String(parseFloat(form.amount)));
  if (form.currency) fd.append('currency', form.currency);
  fd.append('expense_date', form.expense_date);
  if (form.reference?.trim()) fd.append('reference', form.reference.trim());
  if (form.description?.trim()) fd.append('description', form.description.trim());
  if (form.receipt instanceof File) fd.append('receipt', form.receipt);
  if (form.job_order_id) fd.append('job_order_id', form.job_order_id);
  return fd;
}

export function formFromExpense(expense) {
  return {
    vendor_id: expense.vendor_id ? String(expense.vendor_id) : '',
    job_order_id: expense.job_order_id ? String(expense.job_order_id) : '',
    category_id: expense.category_id ? String(expense.category_id) : '',
    expense_account_id: expense.expense_account_id ? String(expense.expense_account_id) : '',
    payment_account_id: expense.payment_account_id ? String(expense.payment_account_id) : '',
    amount: expense.amount != null ? String(expense.amount) : '',
    currency: expense.currency || 'USD',
    expense_date: expense.expense_date || today(),
    reference: expense.reference || '',
    description: expense.description || '',
    receipt: null,
    existing_receipt_url: expense.receipt_url || null,
    expense_metadata_custom_fields: expense.expense_metadata_custom_fields || {},
  };
}

export function buildRecurringPayload(form) {
  return {
    name: form.name.trim(),
    expense_account_id: parseInt(form.expense_account_id, 10),
    payment_account_id: parseInt(form.payment_account_id, 10),
    amount: parseFloat(form.amount),
    frequency: form.frequency,
    start_date: form.start_date,
    end_date: form.end_date || null,
    next_run_date: form.next_run_date,
    description: form.description?.trim() || null,
    is_active: !!form.is_active,
  };
}

export function formFromRecurring(item) {
  return {
    name: item.name || '',
    expense_account_id: item.expense_account_id ? String(item.expense_account_id) : '',
    payment_account_id: item.payment_account_id ? String(item.payment_account_id) : '',
    amount: item.amount != null ? String(item.amount) : '',
    frequency: item.frequency || 'monthly',
    start_date: item.start_date || today(),
    end_date: item.end_date || '',
    next_run_date: item.next_run_date || today(),
    description: item.description || '',
    is_active: item.is_active !== false,
  };
}
