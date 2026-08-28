/**
 * Choose how the custom report viewer should render based on dataset_key.
 * Accounting ledgers/statements use a dense report sheet; other datasets
 * keep a simpler analytical table (still without dashboard KPI/chart chrome).
 */

export const VIEWER_PRESENTATION = {
  LEDGER: 'ledger_statement',
  TRIAL_BALANCE: 'trial_balance_sheet',
  LEDGER_PARTY: 'party_ledger',
  TABLE: 'report_table',
};

export function getViewerPresentation(datasetKey) {
  switch (datasetKey) {
    case 'accounting.general_ledger':
      return VIEWER_PRESENTATION.LEDGER;
    case 'accounting.trial_balance':
      return VIEWER_PRESENTATION.TRIAL_BALANCE;
    case 'sales.ar_ledger':
    case 'purchasing.ap_ledger':
      return VIEWER_PRESENTATION.LEDGER_PARTY;
    default:
      return VIEWER_PRESENTATION.TABLE;
  }
}

export function statementTitleForDataset(datasetKey, fallback) {
  if (String(fallback || '').trim()) return String(fallback).trim();

  switch (datasetKey) {
    case 'accounting.general_ledger':
      return 'General Ledger';
    case 'accounting.trial_balance':
      return 'Trial Balance';
    case 'sales.ar_ledger':
      return 'Accounts Receivable Ledger';
    case 'purchasing.ap_ledger':
      return 'Accounts Payable Ledger';
    case 'inventory.stock_summary':
      return 'Inventory Stock Summary';
    default:
      return 'Custom Report';
  }
}

function pickMoneyColumn(moneyCols, patterns) {
  return (
    moneyCols.find((c) =>
      patterns.some((re) => re.test(c.key) || re.test(c.label || '')),
    ) || null
  );
}

/** Sum money columns from result rows / grand_totals for totals strip. */
export function deriveMoneyTotals(result) {
  if (!result) return null;
  const grand = result.grand_totals || {};
  if (grand.debit != null || grand.credit != null) {
    return {
      total_debit: Number(grand.debit) || 0,
      total_credit: Number(grand.credit) || 0,
      debitKey: 'debit',
      creditKey: 'credit',
    };
  }
  if (!result.columns?.length) return null;
  const moneyCols = result.columns.filter(
    (c) => c.type === 'money' || c.formatter === 'money',
  );
  if (!moneyCols.length) return null;

  // Prefer exact TB / GL keys, then label/key patterns.
  const debitCol =
    moneyCols.find((c) =>
      ['debit', 'total_debit', 'balance_debit'].includes(c.key),
    ) ||
    pickMoneyColumn(moneyCols, [/debit/i]);
  const creditCol =
    moneyCols.find((c) =>
      ['credit', 'total_credit', 'balance_credit'].includes(c.key),
    ) ||
    pickMoneyColumn(moneyCols, [/credit/i]);

  const sumCol = (col) => {
    if (!col) return null;
    if (grand[col.key] != null && grand[col.key] !== '') return Number(grand[col.key]);
    return (result.rows || []).reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0);
  };

  if (debitCol || creditCol) {
    return {
      total_debit: sumCol(debitCol) ?? 0,
      total_credit: sumCol(creditCol) ?? 0,
      debitKey: debitCol?.key,
      creditKey: creditCol?.key,
    };
  }

  return null;
}

function resolveGroupKeys(columns, sampleRow, mode) {
  const keys = new Set([
    ...(columns || []).map((c) => c.key),
    ...Object.keys(sampleRow || {}),
  ]);

  if (mode === 'party') {
    const partyKey = ['party_name', 'customer_name', 'vendor_name', 'contact_name'].find(
      (k) => keys.has(k),
    );
    if (partyKey) return { codeKey: null, nameKey: partyKey };
  }

  const codeKey = ['code', 'account_code'].find((k) => keys.has(k)) || null;
  const nameKey =
    ['account_name', 'name', 'account'].find((k) => keys.has(k)) || null;

  if (!codeKey && !nameKey) return null;
  return { codeKey, nameKey };
}

/**
 * Group ledger rows by account (or party) for statement rendering.
 * Uses identity fields even when they were not selected as display columns.
 * @returns {Array<{ key: string, code: string, name: string, rows: object[] }>|null}
 */
export function groupLedgerRows(result, { mode = 'account' } = {}) {
  if (!result?.rows?.length) return null;

  const resolved = resolveGroupKeys(result.columns, result.rows[0], mode);
  if (!resolved) return null;

  const { codeKey, nameKey } = resolved;
  const groups = [];
  const indexByKey = new Map();

  for (const row of result.rows) {
    const code = codeKey ? String(row[codeKey] ?? '').trim() : '';
    const name = nameKey ? String(row[nameKey] ?? '').trim() : '';
    const groupKey = code || name ? `${code}||${name}` : '—';
    let group = indexByKey.get(groupKey);
    if (!group) {
      group = { key: groupKey, code, name, rows: [] };
      indexByKey.set(groupKey, group);
      groups.push(group);
    }
    group.rows.push(row);
  }

  return groups.length ? groups : null;
}
