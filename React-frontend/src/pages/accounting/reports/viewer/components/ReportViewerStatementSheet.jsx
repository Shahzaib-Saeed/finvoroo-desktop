import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatReportCell } from '../../lib/format-report-cell';
import { formatCurrency } from '../../constants';
import { formatBsDate } from '../../components/BalanceSheetStatement';
import { getJournalTypeMeta } from '../../journal-type-codes';
import { ReportAccountDrillLink } from '../../components/ReportAccountDrillLink';
import { ReportJournalSourceDrillLink } from '../../components/ReportJournalSourceDrillLink';
import { ReportSummaryStrip } from '../../components/ReportSummaryStrip';
import { getReportDisplayReference } from '../../report-reference';
import {
  deriveMoneyTotals,
  getViewerPresentation,
  groupLedgerRows,
  statementTitleForDataset,
  VIEWER_PRESENTATION,
} from '../lib/viewer-presentation';

const FINVOROO_LOGO = '/media/app/finvoroo.svg';

const GROUP_HEADER_KEYS = new Set([
  'code',
  'account_code',
  'account_name',
  'name',
  'account',
  'party_name',
  'customer_name',
  'vendor_name',
  'contact_name',
]);

function columnRole(col) {
  const k = col.key;
  if (k === 'entry_date' || k === 'date') return 'date';
  if (k === 'reference') return 'reference';
  if (k === 'journal_type' || k === 'journal') return 'journal';
  if (['entry_description', 'line_description', 'description'].includes(k)) {
    return 'description';
  }
  if (['debit', 'total_debit', 'balance_debit'].includes(k)) return 'debit';
  if (['credit', 'total_credit', 'balance_credit'].includes(k)) return 'credit';
  if (['balance', 'running_balance'].includes(k)) return 'balance';
  if (GROUP_HEADER_KEYS.has(k)) return 'group';
  return 'field';
}

function isMoneyCol(col) {
  const role = columnRole(col);
  return (
    role === 'debit' ||
    role === 'credit' ||
    role === 'balance' ||
    col.type === 'money' ||
    col.formatter === 'money'
  );
}

function formatEntryDate(value) {
  if (!value) return '';
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd/MM/yy');
  } catch {
    return String(value).slice(0, 10);
  }
}

function EmptyCell() {
  return <span className="text-slate-300">--</span>;
}

function AmountCell({
  value,
  currency,
  className,
  mutedWhenZero = true,
  workspaceId,
  row,
}) {
  const n = Number(value) || 0;
  if (mutedWhenZero && Math.abs(n) < 0.005) {
    return <EmptyCell />;
  }
  const formatted =
    n < 0
      ? `(${formatCurrency(Math.abs(n), currency)})`
      : formatCurrency(n, currency);
  if (!workspaceId || !row) {
    return (
      <span className={cn('tabular-nums text-slate-900', className)}>
        {formatted}
      </span>
    );
  }
  return (
    <ReportJournalSourceDrillLink
      workspaceId={workspaceId}
      row={row}
      label={formatted}
      className={cn(
        'tabular-nums text-slate-900 font-normal hover:underline underline-offset-2',
        className,
      )}
    />
  );
}

/** Cash / bank journal codes use soft indigo; everything else neutral slate. */
const CASH_BANK_JOURNAL_CODES = new Set(['CRJ', 'CDJ', 'BRJ', 'BPJ']);

function journalBadgeClass(code) {
  if (CASH_BANK_JOURNAL_CODES.has(code)) {
    return 'border-primary/20 bg-primary/10 text-primary';
  }
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function JournalTypePill({ code, label }) {
  return (
    <span
      title={label}
      className={cn(
        'inline-flex h-[22px] min-w-[1.75rem] items-center justify-center rounded-sm border px-1.5 text-[10px] font-medium uppercase tracking-wide',
        journalBadgeClass(code),
      )}
    >
      {code}
    </span>
  );
}

function ReportSummaryMetricsBar({ totals, currency, companyName, fiscalYear }) {
  if (!totals) return null;

  const debit = Number(totals.total_debit) || 0;
  const credit = Number(totals.total_credit) || 0;
  const net = debit - credit;
  const balanced = Math.abs(net) < 0.005;

  const metrics = [
    {
      key: 'debit',
      label: 'Total period debit',
      value: formatCurrency(debit, currency),
    },
    {
      key: 'credit',
      label: 'Total period credit',
      value: formatCurrency(credit, currency),
    },
    {
      key: 'net',
      label: 'Net movement',
      value: formatCurrency(Math.abs(net), currency),
      tone: balanced ? 'positive' : 'negative',
      badge: balanced ? (
        <span className="ml-1.5 inline-flex h-5 items-center rounded-sm border border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
          Balanced
        </span>
      ) : (
        <span className="ml-1.5 inline-flex h-5 items-center rounded-sm border border-red-200 bg-red-50 px-1.5 text-[10px] font-medium uppercase tracking-wide text-red-700">
          Out of balance
        </span>
      ),
    },
  ];

  return (
    <ReportSummaryStrip
      items={metrics}
      context={
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">
            {companyName || 'Company'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {[
              fiscalYear ? `Fiscal Year: ${fiscalYear}` : null,
              currency ? `Currency: ${currency}` : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </p>
        </div>
      }
      className="border-t-0 print:px-3"
    />
  );
}

function CompanyLogoMark({ logoUrl, companyName }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="size-12 object-contain print:size-10"
      />
    );
  }
  const words = String(companyName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
      : (words[0] ?? 'C').slice(0, 2).toUpperCase();

  return (
    <div
      aria-hidden
      className="flex size-12 items-center justify-center border border-slate-300 bg-white text-xs font-semibold tracking-wide text-slate-600 print:size-10"
    >
      {initials}
    </div>
  );
}

function StatementHeaderPrint({
  reportTitle,
  periodFrom,
  periodTo,
  periodLabel,
  scopeLabel,
  companyName,
  logoUrl,
  currency,
  fiscalYear,
  generatedBy,
  printedAt,
  pageLabel,
}) {
  const periodLine =
    periodFrom && periodTo
      ? `${formatBsDate(periodFrom)} – ${formatBsDate(periodTo)}`
      : periodLabel || null;

  return (
    <header className="general-ledger-header hidden border-b border-slate-200 px-5 py-5 sm:px-6 lg:px-8 print:block print:px-4 print:py-3">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
        <div className="min-w-0 text-left lg:pt-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            {reportTitle}
          </p>
          {periodLine ? (
            <p className="mt-2 text-sm font-medium text-slate-900">{periodLine}</p>
          ) : null}
          {scopeLabel ? (
            <p className="mt-1.5 text-xs leading-snug text-slate-500">
              {scopeLabel}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-center justify-center text-center lg:px-6">
          <CompanyLogoMark logoUrl={logoUrl} companyName={companyName} />
          <h1 className="mt-2.5 max-w-[280px] text-lg font-semibold leading-tight tracking-tight text-slate-900 sm:text-xl print:text-base">
            {companyName || 'Company'}
          </h1>
        </div>

        <div className="min-w-0 text-left text-xs leading-relaxed text-slate-500 lg:pt-1 lg:text-right">
          {currency ? (
            <p className="font-semibold uppercase tracking-wide text-slate-600">
              {currency}
            </p>
          ) : null}
          {fiscalYear ? <p className="mt-0.5">Fiscal year: {fiscalYear}</p> : null}
          {generatedBy ? <p className="mt-0.5">Generated by {generatedBy}</p> : null}
          {printedAt ? <p className="mt-0.5">{printedAt}</p> : null}
          {pageLabel ? (
            <p className="mt-0.5 font-medium text-slate-600">{pageLabel}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function StatementFooter() {
  // Screen view already has the app footer logo — keep this strip print-only.
  return (
    <footer className="balance-sheet-footer hidden border-t border-slate-200 px-4 py-2 print:block">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <img
            src={FINVOROO_LOGO}
            alt=""
            className="size-4 shrink-0 object-contain"
          />
          <span className="text-xs font-semibold tracking-tight text-slate-800">
            Finvoroo ERP
          </span>
        </div>
        <p className="text-center text-xs text-slate-500 sm:text-right">
          Unaudited — For management purposes only
        </p>
      </div>
    </footer>
  );
}

function TrialBalanceIntegrity({ totals, currency }) {
  if (!totals) return null;
  const debit = Number(totals.total_debit) || 0;
  const credit = Number(totals.total_credit) || 0;
  const variance = Math.abs(debit - credit);
  const balanced = variance < 0.005;

  return (
    <div className="border-t border-slate-300 px-3 py-3 sm:px-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_140px] sm:items-center">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
          Total adjusted balance
        </span>
        <div className="text-right">
          <span className="inline-block border-b-2 border-double border-slate-900 pb-0.5 text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrency(debit, currency)}
          </span>
        </div>
        <div className="text-right">
          <span className="inline-block border-b-2 border-double border-slate-900 pb-0.5 text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrency(credit, currency)}
          </span>
        </div>
      </div>

      <div
        className={cn(
          'mt-3 border bg-white px-3 py-2.5',
          balanced ? 'border-emerald-200' : 'border-red-200',
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
              Double-entry integrity check
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Net trial balance variance should equal zero.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span
              className={cn(
                'inline-flex h-5 items-center rounded-sm border px-1.5 text-[10px] font-medium uppercase tracking-wide',
                balanced
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700',
              )}
            >
              {balanced ? 'System in equilibrium' : 'Out of balance'}
            </span>
            {!balanced ? (
              <p className="mt-1 text-xs font-medium tabular-nums text-red-600">
                Discrepancy: {formatCurrency(variance, currency)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function columnHeaderLabel(col, currency) {
  if (isMoneyCol(col)) {
    const base = String(col.label || col.key).replace(/\s*\([A-Z]{3}\)\s*$/i, '');
    return (
      <span className="block leading-tight">
        <span className="block">{base}</span>
        <span className="mt-0.5 block text-[9px] font-medium tracking-wide text-slate-500">
          ({currency})
        </span>
      </span>
    );
  }
  return col.label;
}

/**
 * Standard GL column layout (Date → Description). Applied when the report
 * exposes exactly 10 or 11 visible columns for header/data alignment.
 */
const STANDARD_TEN_COL_WIDTHS = [
  '8%',  // Date
  '10%', // Booking No.
  '9%',  // Ctnr No. / Wt
  '10%', // HBL / MBL / Vehicle
  '10%', // Debit
  '10%', // Credit
  '5%',  // Type
  '12%', // Running Balance
  '13%', // Reference
  '13%', // Line Memo (+ Description merged at 10-col)
];

const STANDARD_ELEVEN_COL_WIDTHS = [
  '7%',  // Date
  '9%',  // Booking No.
  '8%',  // Ctnr No. / Wt
  '9%',  // HBL / MBL / Vehicle
  '10%', // Debit
  '10%', // Credit
  '5%',  // Type
  '11%', // Running Balance
  '9%',  // Reference
  '11%', // Line Memo
  '11%', // Description
];

const LEDGER_SLOT_WIDTHS = {
  date: 7,
  booking: 9,
  container: 8,
  hbl: 9,
  debit: 10,
  credit: 10,
  journal: 5,
  balance: 11,
  reference: 9,
  line_memo: 11,
  description: 11,
  field: 8,
};

function detectLedgerColumnSlot(col) {
  const label = String(col.label || '').toLowerCase();
  const key = String(col.key || '').toLowerCase();
  const hay = `${label} ${key}`;

  if (columnRole(col) === 'date') return 'date';
  if (columnRole(col) === 'debit') return 'debit';
  if (columnRole(col) === 'credit') return 'credit';
  if (columnRole(col) === 'balance') return 'balance';
  if (columnRole(col) === 'journal') return 'journal';
  if (/booking/.test(hay)) return 'booking';
  if (/ctnr|container|weight|\bwt\b/.test(hay)) return 'container';
  if (/hbl|mbl|vehicle|invoice.?no/.test(hay)) return 'hbl';
  if (/line.?memo|line_memo/.test(hay)) return 'line_memo';
  if (columnRole(col) === 'description') return 'description';
  if (columnRole(col) === 'reference') return 'reference';
  return 'field';
}

function columnWidthPercent(col, cols) {
  const idx = cols.indexOf(col);
  if (cols.length === 11 && idx >= 0) {
    return STANDARD_ELEVEN_COL_WIDTHS[idx];
  }
  if (cols.length === 10 && idx >= 0) {
    return STANDARD_TEN_COL_WIDTHS[idx];
  }

  const totalWeight = cols.reduce(
    (sum, c) => sum + (LEDGER_SLOT_WIDTHS[detectLedgerColumnSlot(c)] ?? LEDGER_SLOT_WIDTHS.field),
    0,
  );
  const weight =
    LEDGER_SLOT_WIDTHS[detectLedgerColumnSlot(col)] ?? LEDGER_SLOT_WIDTHS.field;
  return `${((weight / totalWeight) * 100).toFixed(2)}%`;
}

function ledgerCellClass(col, extra) {
  const role = columnRole(col);
  return cn(
    'h-8 border-b border-slate-200 px-2 py-1 align-middle text-[13px] font-normal text-slate-800',
    isMoneyCol(col) && 'text-right tabular-nums whitespace-nowrap',
    role === 'date' && 'whitespace-nowrap text-slate-700',
    role === 'journal' && 'text-center whitespace-nowrap',
    (role === 'reference' || role === 'description' || role === 'field') &&
      'max-w-0 break-words',
    extra,
  );
}

function ledgerHeaderClass(col) {
  return cn(
    'sticky top-0 z-10 border-y border-slate-200 bg-white px-2 py-2 align-bottom text-[10px] font-bold uppercase tracking-wider text-slate-400',
    isMoneyCol(col) && 'text-right',
    columnRole(col) === 'journal' && 'text-center',
    (columnRole(col) === 'reference' ||
      columnRole(col) === 'description' ||
      columnRole(col) === 'field') &&
      'max-w-0',
  );
}

/** Merge trailing empty cells after the balance column into one full-width cell. */
function renderTrailingColspan(cols, balanceCol, cellClass, minSpan = 1) {
  if (!balanceCol) return null;
  const balanceIdx = cols.findIndex((c) => c.key === balanceCol.key);
  if (balanceIdx < 0 || balanceIdx >= cols.length - 1) return null;
  const span = cols.length - balanceIdx - 1;
  if (span < minSpan) return null;
  return (
    <td
      key={`${balanceCol.key}-trail`}
      colSpan={span}
      className={cellClass}
      aria-hidden
    />
  );
}

function buildBalanceSummaryCells({
  cols,
  variant,
  period,
  dateCol,
  labelCol,
  debitCol,
  creditCol,
  balanceCol,
  currency,
  initialBalance,
  endingBalance,
  totalDebit,
  totalCredit,
}) {
  const isForward = variant === 'forward';
  const balanceIdx = balanceCol
    ? cols.findIndex((c) => c.key === balanceCol.key)
    : -1;
  const labelText = isForward ? 'Balance forward' : 'Ending balance';
  const periodDate = isForward ? period?.from : period?.to;
  const cells = [];
  let labelPlaced = false;

  for (let i = 0; i < cols.length; i += 1) {
    const col = cols[i];
    const role = columnRole(col);
    const cellClass = ledgerCellClass(
      col,
      isForward
        ? 'bg-white'
        : 'border-t border-b border-slate-300 bg-slate-50 font-semibold',
    );

    if (balanceIdx >= 0 && i > balanceIdx) continue;

    if (dateCol && col.key === dateCol.key) {
      cells.push(
        <td
          key={col.key}
          className={cn(cellClass, 'text-xs text-slate-500')}
        >
          {periodDate ? formatEntryDate(periodDate) : ''}
        </td>,
      );
      continue;
    }

    if (
      !labelPlaced &&
      labelCol &&
      col.key === labelCol.key &&
      role !== 'date' &&
      !isMoneyCol(col) &&
      role !== 'journal'
    ) {
      labelPlaced = true;
      cells.push(
        <td
          key={col.key}
          className={cn(
            cellClass,
            isForward
              ? 'text-xs italic text-slate-500'
              : 'text-[13px] font-semibold text-slate-800',
          )}
        >
          {labelText}
        </td>,
      );
      continue;
    }

    if (debitCol && col.key === debitCol.key) {
      cells.push(
        <td key={col.key} className={cellClass}>
          {isForward ? (
            <EmptyCell />
          ) : (
            <AmountCell
              value={totalDebit}
              currency={currency}
              className="font-semibold"
            />
          )}
        </td>,
      );
      continue;
    }

    if (creditCol && col.key === creditCol.key) {
      cells.push(
        <td key={col.key} className={cellClass}>
          {isForward ? (
            <EmptyCell />
          ) : (
            <AmountCell
              value={totalCredit}
              currency={currency}
              className="font-semibold"
            />
          )}
        </td>,
      );
      continue;
    }

    if (balanceCol && col.key === balanceCol.key) {
      cells.push(
        <td key={col.key} className={cellClass}>
          <AmountCell
            value={isForward ? initialBalance : endingBalance}
            currency={currency}
            className={isForward ? 'font-medium' : 'font-bold'}
          />
        </td>,
      );
      continue;
    }

    if (role === 'debit' || role === 'credit') {
      cells.push(
        <td key={col.key} className={cellClass}>
          <EmptyCell />
        </td>,
      );
      continue;
    }

    cells.push(<td key={col.key} className={cellClass} />);
  }

  const trail = renderTrailingColspan(
    cols,
    balanceCol,
    ledgerCellClass(
      balanceCol || cols[0],
      isForward ? 'bg-white' : 'border-t border-b border-slate-300 bg-slate-50',
    ),
  );
  if (trail) cells.push(trail);

  return cells;
}

function renderLedgerCell(col, row, currency, workspaceId) {
  const role = columnRole(col);
  const raw = row[col.key];

  if (role === 'date') {
    if (!raw) return <EmptyCell />;
    return (
      <span className="text-slate-700">{formatEntryDate(raw)}</span>
    );
  }
  if (role === 'journal') {
    const jrnl = getJournalTypeMeta(raw, {
      sourceKind: row.source_kind,
      reference: row.reference,
    });
    return <JournalTypePill code={jrnl.code} label={jrnl.label} />;
  }
  if (role === 'reference') {
    const label =
      raw != null && String(raw).trim() !== ''
        ? String(raw)
        : getReportDisplayReference(row);
    return (
      <ReportJournalSourceDrillLink
        workspaceId={workspaceId}
        row={row}
        label={label || '—'}
        className="break-words text-slate-800 hover:underline underline-offset-2"
      />
    );
  }
  if (role === 'debit' || role === 'credit' || role === 'balance') {
    return (
      <AmountCell
        value={raw}
        currency={currency}
        workspaceId={workspaceId}
        row={row}
      />
    );
  }
  if (isMoneyCol(col)) {
    return (
      <AmountCell
        value={raw}
        currency={currency}
        workspaceId={workspaceId}
        row={row}
      />
    );
  }
  if (raw === null || raw === undefined || raw === '') {
    return <EmptyCell />;
  }
  return formatReportCell(raw, col, {});
}

/**
 * Ledger table matching GeneralLedgerTable: balance forward, dense lines,
 * ending balance — with dynamic builder columns (incl. custom fields).
 */
function LedgerStatementTable({
  columns,
  groups,
  currency,
  period,
  workspaceId,
}) {
  const visibleColumns = columns.filter((c) => columnRole(c) !== 'group');
  const cols = visibleColumns.length ? visibleColumns : columns;
  const colCount = cols.length;

  const accountLabelCol =
    cols.find((c) => columnRole(c) === 'reference') ||
    cols.find((c) => columnRole(c) === 'description') ||
    cols.find((c) => columnRole(c) === 'field') ||
    cols[0];
  const descriptionCol = cols.find((c) => columnRole(c) === 'description');
  const dateCol = cols.find((c) => columnRole(c) === 'date');
  const debitCol = cols.find((c) => columnRole(c) === 'debit');
  const creditCol = cols.find((c) => columnRole(c) === 'credit');
  const balanceCol = cols.find((c) => columnRole(c) === 'balance');
  const labelCol =
    cols.find((c) => {
      const idx = cols.indexOf(c);
      const debitIdx = debitCol ? cols.indexOf(debitCol) : cols.length;
      return (
        idx >= 0 &&
        idx < debitIdx &&
        columnRole(c) !== 'date' &&
        !isMoneyCol(c) &&
        columnRole(c) !== 'journal'
      );
    }) ||
    descriptionCol ||
    accountLabelCol;

  return (
    <div className="print:overflow-visible">
      <table className="general-ledger-table w-full min-w-[720px] table-fixed border-collapse bg-white text-[13px]">
        <colgroup>
          {cols.map((col) => (
            <col key={col.key} style={{ width: columnWidthPercent(col, cols) }} />
          ))}
        </colgroup>
        <thead className="bg-white">
          <tr>
            {cols.map((col) => (
              <th key={col.key} className={ledgerHeaderClass(col)}>
                {columnHeaderLabel(col, currency)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(() => {
            let entryIndex = 0;
            return groups.flatMap((group, groupIndex) => {
            const first = group.rows[0];
            const last = group.rows[group.rows.length - 1];
            const debitKey = debitCol?.key || 'debit';
            const creditKey = creditCol?.key || 'credit';
            const balanceKey = balanceCol?.key || 'balance';
            const initialBalance =
              (Number(first?.[balanceKey]) || 0) -
              (Number(first?.[debitKey]) || 0) +
              (Number(first?.[creditKey]) || 0);
            const endingBalance = Number(last?.[balanceKey] || 0);
            const totalDebit = group.rows.reduce(
              (s, r) => s + (Number(r[debitKey]) || 0),
              0,
            );
            const totalCredit = group.rows.reduce(
              (s, r) => s + (Number(r[creditKey]) || 0),
              0,
            );
            const accountTitle =
              [group.code, group.name].filter(Boolean).join(' – ') || 'Account';

            const accountHeaderRow = (
              <tr key={`${group.key}-acct`} className="gl-account-group-title">
                <td
                  colSpan={colCount}
                  className={cn(
                    'border-b border-slate-200 bg-white px-2 pb-1.5 text-[13px] font-semibold text-slate-900',
                    'border-l-[3px] border-l-primary pl-2.5',
                    groupIndex > 0 ? 'pt-3' : 'pt-1',
                  )}
                >
                  {workspaceId && first?.account_id ? (
                    <ReportAccountDrillLink
                      workspaceId={workspaceId}
                      accountId={first.account_id}
                      name={accountTitle}
                      from={period?.from}
                      to={period?.to}
                      showIcon={false}
                      className="text-slate-900 hover:text-primary hover:underline"
                    />
                  ) : (
                    accountTitle
                  )}
                </td>
              </tr>
            );

            const balanceForwardRow =
              balanceCol && Math.abs(initialBalance) >= 0.005 ? (
                <tr key={`${group.key}-fwd`} className="gl-balance-forward bg-white">
                  {buildBalanceSummaryCells({
                    cols,
                    variant: 'forward',
                    period,
                    dateCol,
                    labelCol,
                    debitCol,
                    creditCol,
                    balanceCol,
                    currency,
                    initialBalance,
                    endingBalance,
                    totalDebit,
                    totalCredit,
                  })}
                </tr>
              ) : null;

            const entryRows = group.rows.map((row, i) => {
              const stripe = entryIndex % 2 === 1;
              entryIndex += 1;
              return (
                <tr
                  key={`${group.key}-row-${i}`}
                  className={cn(
                    'gl-entry-row bg-white hover:bg-primary/5',
                    stripe && 'bg-slate-50/40',
                  )}
                >
                  {cols.map((col) => (
                    <td key={col.key} className={ledgerCellClass(col)}>
                      {renderLedgerCell(col, row, currency, workspaceId)}
                    </td>
                  ))}
                </tr>
              );
            });

            const totalRow = (
              <tr key={`${group.key}-end`} className="gl-account-total bg-slate-50">
                {buildBalanceSummaryCells({
                  cols,
                  variant: 'ending',
                  period,
                  dateCol,
                  labelCol,
                  debitCol,
                  creditCol,
                  balanceCol,
                  currency,
                  initialBalance,
                  endingBalance,
                  totalDebit,
                  totalCredit,
                })}
              </tr>
            );

            return [
              accountHeaderRow,
              ...(balanceForwardRow ? [balanceForwardRow] : []),
              ...entryRows,
              totalRow,
            ];
            });
          })()}
        </tbody>
      </table>
    </div>
  );
}

function FlatDenseTable({ columns, rows, currency, formatting }) {
  return (
    <div className="print:overflow-visible">
      <table className="w-full min-w-[640px] table-fixed border-collapse bg-white text-[13px]">
        <colgroup>
          {columns.map((col) => (
            <col
              key={col.key}
              style={{ width: columnWidthPercent(col, columns) }}
            />
          ))}
        </colgroup>
        <thead className="bg-white">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={ledgerHeaderClass(col)}>
                {columnHeaderLabel(col, currency)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                'bg-white hover:bg-primary/5',
                i % 2 === 1 && 'bg-slate-50/40',
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={ledgerCellClass(col)}>
                  {isMoneyCol(col) ||
                  columnRole(col) === 'journal' ||
                  columnRole(col) === 'date'
                    ? renderLedgerCell(col, row, currency)
                    : (() => {
                        const raw = row[col.key];
                        if (raw === null || raw === undefined || raw === '') {
                          return <EmptyCell />;
                        }
                        return formatReportCell(raw, col, formatting);
                      })()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportViewerStatementSheet({
  datasetKey,
  reportName,
  periodLabel,
  periodFrom,
  periodTo,
  fiscalYear,
  scopeLabel,
  companyName,
  logoUrl,
  currency = 'USD',
  generatedBy,
  printedAt,
  workspaceId,
  result,
  loading,
  error,
  page,
  perPage,
  onPageChange,
  formatting = {},
  searchQuery = '',
}) {
  const query = searchQuery;
  const presentation = getViewerPresentation(datasetKey);
  const reportTitle = statementTitleForDataset(datasetKey, reportName);
  const isTrialBalance = presentation === VIEWER_PRESENTATION.TRIAL_BALANCE;
  const isLedger =
    presentation === VIEWER_PRESENTATION.LEDGER ||
    presentation === VIEWER_PRESENTATION.LEDGER_PARTY;
  const isGl = presentation === VIEWER_PRESENTATION.LEDGER;

  const filteredResult = useMemo(() => {
    if (!result?.rows) return result;
    const q = query.trim().toLowerCase();
    if (!q) return result;
    const rows = result.rows.filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q),
      ),
    );
    return { ...result, rows };
  }, [result, query]);

  const totals = useMemo(
    () => deriveMoneyTotals(result),
    [result],
  );

  const genericSummaryItems = useMemo(() => {
    if (!result || totals) return [];
    const rows = result.rows || [];
    const items = [
      {
        key: 'records',
        label: 'Records',
        value: Number(result.total ?? rows.length).toLocaleString(),
      },
    ];
    const numericColumns = (result.columns || [])
      .filter((col) => ['number', 'money'].includes(col.type) || col.formatter === 'money')
      .slice(0, 3);
    for (const col of numericColumns) {
      const raw =
        result.grand_totals?.[col.key] ??
        rows.reduce((sum, row) => sum + (Number(row[col.key]) || 0), 0);
      items.push({
        key: col.key,
        label: col.label,
        value:
          col.type === 'money' || col.formatter === 'money'
            ? formatCurrency(raw, currency)
            : Number(raw).toLocaleString(),
      });
    }
    return items;
  }, [currency, result, totals]);

  const groups = useMemo(() => {
    if (!filteredResult || !isLedger) return null;
    return groupLedgerRows(filteredResult, {
      mode: presentation === VIEWER_PRESENTATION.LEDGER_PARTY ? 'party' : 'account',
    });
  }, [isLedger, presentation, filteredResult]);

  const totalPages = Math.max(
    1,
    Math.ceil((result?.total || 0) / (perPage || 50)),
  );
  const pageLabel =
    totalPages > 1
      ? isGl
        ? `Ledger page ${page} of ${totalPages}`
        : `Page ${page} of ${totalPages}`
      : null;

  const period = useMemo(
    () =>
      periodFrom && periodTo
        ? { from: periodFrom, to: periodTo }
        : null,
    [periodFrom, periodTo],
  );

  if (loading && !result) {
    return <Skeleton className="h-[640px] w-full rounded-lg" />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/50 px-6 py-12 text-center">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </div>
    );
  }

  if (!result?.columns?.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-800">No data to display</p>
        <p className="mt-1 text-sm text-slate-500">
          This report has no columns configured yet.
        </p>
      </div>
    );
  }

  const sheetWidth = isTrialBalance ? 'max-w-4xl mx-auto' : 'w-full max-w-none';

  return (
    <div className={cn(sheetWidth)}>
      <div className="report-print-sheet general-ledger-print w-full overflow-visible border border-slate-300 bg-white print:overflow-visible print:border-0">
        <StatementHeaderPrint
          reportTitle={reportTitle}
          periodFrom={periodFrom}
          periodTo={periodTo}
          periodLabel={
            isTrialBalance && periodLabel
              ? `As of period ending ${periodLabel}`
              : periodLabel
          }
          scopeLabel={
            scopeLabel ||
            (isGl
              ? 'All accounts with activity in this period.'
              : isTrialBalance
                ? 'Working ledger summary'
                : null)
          }
          companyName={companyName}
          logoUrl={logoUrl}
          currency={currency}
          fiscalYear={fiscalYear}
          generatedBy={generatedBy}
          printedAt={printedAt}
          pageLabel={pageLabel}
        />

        {totals ? (
          <ReportSummaryMetricsBar
            totals={totals}
            currency={currency}
            companyName={companyName}
            fiscalYear={fiscalYear}
          />
        ) : null}

        {!totals && genericSummaryItems.length ? (
          <ReportSummaryStrip
            items={genericSummaryItems}
            className="border-t-0 print:px-3"
          />
        ) : null}

        {filteredResult.rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-800">
              No records match your filters
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try widening the date range or editing the report filters.
            </p>
          </div>
        ) : groups?.length ? (
          <LedgerStatementTable
            columns={result.columns}
            groups={groups}
            currency={currency}
            period={period}
            workspaceId={workspaceId}
          />
        ) : (
          <FlatDenseTable
            columns={result.columns}
            rows={filteredResult.rows}
            currency={currency}
            formatting={formatting}
          />
        )}

        {isTrialBalance ? (
          <TrialBalanceIntegrity totals={totals} currency={currency} />
        ) : null}

        <StatementFooter />
      </div>

      {totalPages > 1 ? (
        <div className="no-print flex items-center justify-end gap-2 border-t border-slate-200 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-sm px-2 text-xs text-slate-600"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="mr-1 size-3.5" />
            Previous
          </Button>
          <span className="text-xs tabular-nums text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-sm px-2 text-xs text-slate-600"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="ml-1 size-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
