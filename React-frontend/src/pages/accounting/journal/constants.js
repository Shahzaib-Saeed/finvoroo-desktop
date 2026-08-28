import { formatCurrencyAmount, getWorkspaceDefaultCurrency, resolveCurrencyCode } from '@/lib/currency';

const today = () => new Date().toISOString().slice(0, 10);

export const EMPTY_JOURNAL_LINE = {
  account_id: '',
  debit: '',
  credit: '',
  description: '',
};

export const EMPTY_JOURNAL_FORM = {
  entry_date: today(),
  reference: '',
  description: '',
  job_order_id: '',
  type: 'general',
  currency: 'USD',
  exchange_rate: '1',
  lines: [
    { ...EMPTY_JOURNAL_LINE },
    { ...EMPTY_JOURNAL_LINE },
  ],
};

export const STATUS_COLORS = {
  draft: 'text-amber-700 border-amber-200 bg-amber-50',
  posted: 'text-emerald-700 border-emerald-200 bg-emerald-50',
  voided: 'text-slate-600 border-slate-200 bg-slate-100 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800/50',
};

export const TYPE_COLORS = {
  general: 'text-secondary-foreground border-border bg-muted/50',
  expense: 'text-orange-800 border-orange-200 bg-orange-50 dark:text-orange-300 dark:border-orange-900/50 dark:bg-orange-950/40',
  adjustment: 'text-violet-700 border-violet-200 bg-violet-50 dark:text-violet-300 dark:border-violet-900/50 dark:bg-violet-950/40',
  accrual: 'text-indigo-700 border-indigo-200 bg-indigo-50 dark:text-indigo-300 dark:border-indigo-900/50 dark:bg-indigo-950/40',
  payment: 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-900/50 dark:bg-emerald-950/40',
  transfer: 'text-sky-700 border-sky-200 bg-sky-50 dark:text-sky-300 dark:border-sky-900/50 dark:bg-sky-950/40',
  investment: 'text-amber-800 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-900/50 dark:bg-amber-950/40',
  invoice: 'text-primary border-primary/20 bg-primary/5',
  bill: 'text-sky-700 border-sky-200 bg-sky-50',
};

/** Fallback when API omits journal_types; labels should match backend config. */
export const JOURNAL_TYPE_OPTIONS = [
  { value: 'general', label: 'General journal' },
  { value: 'expense', label: 'Expense' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'accrual', label: 'Accrual / deferral' },
  { value: 'payment', label: 'Payment' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'investment', label: 'Investment' },
];

export const JOURNAL_TYPE_HINTS = {
  general: 'Corrections, reclassifications, and other manual GL entries.',
  expense: 'Operating costs paid from cash, bank, or credit.',
  adjustment: 'Period-end or audit adjustments.',
  accrual: 'Accrued revenue or expenses not yet invoiced or paid.',
  payment: 'Customer receipts, vendor payments, or payroll.',
  transfer: 'Move amounts between cash, bank, or clearing accounts.',
  investment: 'Capital additions tagged to a job for profitability.',
};

/** Types that support optional job-order cost tagging. */
export const JOURNAL_TYPES_WITH_JOB_ORDER = ['general', 'expense', 'investment'];

export function formatCurrency(amount, currency) {
  return formatCurrencyAmount(
    amount,
    resolveCurrencyCode(currency, getWorkspaceDefaultCurrency()),
  );
}

export function lineTotals(lines) {
  let debit = 0;
  let credit = 0;
  for (const line of lines || []) {
    const d = parseFloat(line.debit);
    const c = parseFloat(line.credit);
    if (Number.isFinite(d)) debit += d;
    if (Number.isFinite(c)) credit += c;
  }
  return { debit, credit, diff: Math.abs(debit - credit) };
}

const BALANCE_EPSILON = 0.005;

/**
 * Human-readable balance guidance for the journal entry footer.
 */
export function getJournalBalanceSummary(totals, currency = 'USD') {
  const debit = totals.debit ?? 0;
  const credit = totals.credit ?? 0;
  const diff = totals.diff ?? Math.abs(debit - credit);
  const hasAmounts = debit > BALANCE_EPSILON || credit > BALANCE_EPSILON;

  if (diff < BALANCE_EPSILON && debit > BALANCE_EPSILON) {
    return {
      state: 'balanced',
      title: 'Entry is balanced',
      message: 'Total debits match total credits. You can save this entry.',
      hint: null,
      shortfallSide: null,
      shortfallAmount: 0,
    };
  }

  if (!hasAmounts) {
    return {
      state: 'empty',
      title: 'Add your journal lines',
      message: 'Pick accounts and enter amounts on at least two lines.',
      hint: 'Each line is a debit or a credit — both sides must total the same before saving.',
      shortfallSide: null,
      shortfallAmount: 0,
    };
  }

  if (debit > credit + BALANCE_EPSILON) {
    const amount = formatCurrency(diff, currency);
    return {
      state: 'unbalanced',
      title: 'Credits are short',
      message: `Add ${amount} more on the credit side to balance this entry.`,
      hint: `Alternatively, reduce debits by ${amount}.`,
      shortfallSide: 'credit',
      shortfallAmount: diff,
    };
  }

  const amount = formatCurrency(diff, currency);
  return {
    state: 'unbalanced',
    title: 'Debits are short',
    message: `Add ${amount} more on the debit side to balance this entry.`,
    hint: `Alternatively, reduce credits by ${amount}.`,
    shortfallSide: 'debit',
    shortfallAmount: diff,
  };
}

export function isJournalEntryBalanced(totals) {
  const debit = totals.debit ?? 0;
  const diff = totals.diff ?? Math.abs(debit - (totals.credit ?? 0));
  return diff < BALANCE_EPSILON && debit > BALANCE_EPSILON;
}

export function buildJournalPayload(form) {
  return {
    date: form.entry_date,
    entry_date: form.entry_date,
    reference: form.reference || null,
    description: form.description || null,
    type: form.type || 'general',
    job_order_id: form.job_order_id ? parseInt(form.job_order_id, 10) : null,
    currency: form.currency || null,
    exchange_rate:
      form.currency && form.exchange_rate ? parseFloat(form.exchange_rate) : undefined,
    lines: (form.lines || [])
      .filter((l) => l.account_id)
      .map((l) => ({
        account_id: parseInt(l.account_id, 10),
        debit: l.debit === '' || l.debit == null ? null : parseFloat(l.debit),
        credit: l.credit === '' || l.credit == null ? null : parseFloat(l.credit),
        description: l.description || null,
      })),
  };
}

export function formFromEntry(entry) {
  return {
    entry_date: entry.entry_date || today(),
    reference: entry.reference || entry.journal_number || '',
    description: entry.description || '',
    job_order_id: entry.job_order_id ? String(entry.job_order_id) : '',
    type: entry.type || 'general',
    currency: entry.currency || 'USD',
    exchange_rate: entry.exchange_rate != null ? String(entry.exchange_rate) : '1',
    lines: (entry.lines || []).length
      ? entry.lines.map((l) => ({
          account_id: l.account_id ? String(l.account_id) : '',
          debit: l.debit != null && l.debit !== 0 ? String(l.debit) : '',
          credit: l.credit != null && l.credit !== 0 ? String(l.credit) : '',
          description: l.description || '',
        }))
      : [{ ...EMPTY_JOURNAL_LINE }, { ...EMPTY_JOURNAL_LINE }],
  };
}
