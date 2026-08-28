/**
 * Shared typography scale for accounting reports.
 * Screen sizes target comfortable daily reading; print CSS tightens for paper.
 */
export const reportType = {
  /** In-sheet / printable document title */
  docTitle: 'text-xl font-bold tracking-tight text-foreground',
  /** Company / report eyebrow above the title */
  docEyebrow: 'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
  /** Period / currency meta beside the title */
  docMeta: 'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
  /** Filter / form labels */
  filterLabel: 'text-xs font-medium text-muted-foreground',
  /** Section / KPI card labels */
  sectionLabel: 'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
  /** Table column headers */
  tableHead: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  /** Standard body / table cells — primary on-screen reading size */
  body: 'text-sm',
  /** Statement row labels and ledger table body */
  statementBody: 'text-sm text-slate-700',
  /** Numeric amount columns in formal statements */
  amount: 'text-sm tabular-nums text-slate-900',
  /** Account codes beside names */
  accountCode: 'font-mono text-xs text-slate-400',
  /** KPI card primary values */
  kpiValue: 'text-xl font-bold tabular-nums tracking-tight',
  /** Inline strip / secondary KPI values */
  kpiInline: 'text-base font-bold tabular-nums',
  /** Empty states and helper copy */
  helper: 'text-sm text-muted-foreground',
};

/** Amount column class used across balance sheet / P&L / financial summary. */
export const STATEMENT_AMOUNT_COL =
  'balance-sheet-amount shrink-0 text-right text-sm tabular-nums text-slate-900';
