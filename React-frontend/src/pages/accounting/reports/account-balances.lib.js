import { format, parseISO, startOfYear } from 'date-fns';

function escapeCsv(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportAccountBalancesCsv(data, { asOf, currency }) {
  const rows = data?.rows || [];
  const summary = data?.summary || {};
  const lines = [
    ['Account Balances'],
    ['As of', asOf || ''],
    ['Currency', currency || ''],
    [],
    ['Account Code', 'Account Name', 'Account Type', 'Normal Balance', 'Current Balance', 'Debit Total', 'Credit Total'],
    ...rows.map((row) => [
      row.code,
      row.name,
      row.account_type,
      row.normal_balance,
      row.current_balance,
      row.debit_total,
      row.credit_total,
    ]),
    [],
    ['Summary', `Accounts: ${summary.account_count ?? 0}`, '', '', summary.net_balance ?? 0, summary.total_debit ?? 0, summary.total_credit ?? 0],
  ];

  const csv = lines.map((line) => line.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `account-balances-${asOf || 'report'}.csv`);
}

export function exportAccountBalancesExcel(data, { asOf, currency }) {
  const rows = data?.rows || [];
  const summary = data?.summary || {};
  const header = `
    <tr><th colspan="7" style="font-size:16px;font-weight:bold;">Account Balances</th></tr>
    <tr><td>As of</td><td colspan="6">${asOf || ''}</td></tr>
    <tr><td>Currency</td><td colspan="6">${currency || ''}</td></tr>
    <tr></tr>
    <tr>
      <th>Account Code</th>
      <th>Account Name</th>
      <th>Account Type</th>
      <th>Normal Balance</th>
      <th>Current Balance</th>
      <th>Debit Total</th>
      <th>Credit Total</th>
    </tr>`;

  const body = rows
    .map(
      (row) => `<tr>
        <td>${row.code ?? ''}</td>
        <td>${row.name ?? ''}</td>
        <td>${row.account_type ?? ''}</td>
        <td>${row.normal_balance ?? ''}</td>
        <td>${row.current_balance ?? 0}</td>
        <td>${row.debit_total ?? 0}</td>
        <td>${row.credit_total ?? 0}</td>
      </tr>`,
    )
    .join('');

  const footer = `<tr></tr><tr>
    <td><b>Summary</b></td>
    <td colspan="3">Accounts: ${summary.account_count ?? 0}</td>
    <td>${summary.net_balance ?? 0}</td>
    <td>${summary.total_debit ?? 0}</td>
    <td>${summary.total_credit ?? 0}</td>
  </tr>`;

  const html = `<html><head><meta charset="UTF-8"></head><body><table border="1">${header}${body}${footer}</table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `account-balances-${asOf || 'report'}.xls`);
}

export function glPeriodThroughAsOf(asOf) {
  const date = asOf ? parseISO(asOf) : new Date();
  return {
    from: format(startOfYear(date), 'yyyy-MM-dd'),
    to: format(date, 'yyyy-MM-dd'),
  };
}

export function defaultAsOfDate() {
  return format(new Date(), 'yyyy-MM-dd');
}
