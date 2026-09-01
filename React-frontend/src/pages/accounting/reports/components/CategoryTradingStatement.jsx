import { cn } from '@/lib/utils';
import {
  PharmacyReportFooter,
  PharmacyReportHeader,
  formatReportDate,
  formatReportMoney,
} from '@/industries/pharmacy/pages/reports/PharmacyReportChrome';
import { formatBsAmount } from './BalanceSheetStatement';
import { STATEMENT_AMOUNT_COL } from './report-typography';
import { categoryLabel } from './CategoryTradingPartnerCards';

const GROUP_SALES =
  'border-b border-sky-200 bg-sky-50/80 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-sky-800';
const GROUP_PURCHASE =
  'border-b border-amber-200 bg-amber-50/80 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-amber-900';
const GROUP_RESULT =
  'border-b border-emerald-200 bg-emerald-50/80 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-800';
const SUB_TH =
  'px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const DIVIDER = 'border-l-2 border-slate-300';

function formatPct(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1)}%`;
}

function profitColor(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) < 0.004) return 'text-slate-400';
  return n < 0 ? 'text-red-700' : 'text-emerald-700';
}

function Amount({ value, className, emphasize = false }) {
  return (
    <span
      className={cn(
        STATEMENT_AMOUNT_COL,
        'text-slate-800',
        emphasize && 'font-semibold text-slate-900',
        className,
      )}
    >
      {formatBsAmount(value) || '—'}
    </span>
  );
}

function PanelLine({ label, value, profit = false, bold = false, muted = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span
        className={cn(
          'text-sm',
          muted ? 'text-slate-500' : 'text-slate-700',
          bold && 'font-semibold text-slate-900',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          STATEMENT_AMOUNT_COL,
          bold && 'text-base font-bold',
          profit && profitColor(value),
          !profit && Number(value) < -0.004 && 'text-red-700',
        )}
      >
        {formatReportMoney(value)}
      </span>
    </div>
  );
}

function MoneyLine({ label, value, profit = false, bold = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className={cn('text-sm text-slate-700', bold && 'font-semibold text-slate-900')}>
        {label}
      </span>
      <span
        className={cn(
          STATEMENT_AMOUNT_COL,
          bold && 'font-bold',
          profit && profitColor(value),
          !profit && Number(value) < -0.004 && 'text-red-700',
        )}
      >
        {formatBsAmount(value) || '—'}
      </span>
    </div>
  );
}

export function CategoryTradingStatement({
  companyName,
  logoUrl,
  periodFrom,
  periodTo,
  currency,
  fiscalYear,
  generatedBy,
  printedAt,
  rows = [],
  totals = {},
  expenses = null,
  includeExpenses = false,
}) {
  const grossProfit = Number(totals.gross_profit ?? totals.net_profit ?? 0);
  const expenseTotal = Number(totals.operating_expenses ?? expenses?.total ?? 0);
  const netAfterExpenses = Number(
    totals.net_profit_after_expenses ?? grossProfit - expenseTotal,
  );
  const expenseRows = expenses?.rows ?? [];
  const sale = Number(totals.sale || 0);
  const cogs = Number(totals.cogs || 0);
  const purchase = Number(totals.purchase || 0);
  const marginPct = totals.margin_percent;

  return (
    <div className="category-trading-statement bg-white">
      <PharmacyReportHeader
        compact
        companyName={companyName}
        logoUrl={logoUrl}
        subtitle={`${formatReportDate(periodFrom)} – ${formatReportDate(periodTo)}`}
        currency={currency}
        fiscalYear={fiscalYear}
        generatedBy={generatedBy}
        printedAt={printedAt}
      />

      <div className="grid grid-cols-1 divide-y divide-slate-200 border-b border-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-800">
            Sales — what you sold
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Revenue and the cost of goods that left stock for those sales.
          </p>
          <div className="mt-3 space-y-0 divide-y divide-slate-100">
            <PanelLine label="Sales revenue" value={sale} bold />
            <PanelLine label="Cost of goods sold (COGS)" value={cogs} muted />
            <PanelLine
              label={grossProfit < 0 ? 'Gross loss' : 'Gross profit'}
              value={grossProfit}
              profit
              bold
            />
            {marginPct != null ? (
              <div className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-sm text-slate-500">Margin on sales</span>
                <span
                  className={cn(
                    STATEMENT_AMOUNT_COL,
                    'text-sm font-semibold tabular-nums',
                    profitColor(marginPct),
                  )}
                >
                  {formatPct(marginPct)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-slate-50/40 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900">
            Purchases — stock you bought
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Inventory received in this period. Not subtracted from gross profit.
          </p>
          <div className="mt-3">
            <PanelLine label="Stock purchased" value={purchase} bold />
          </div>
          <p className="mt-3 rounded-md border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-[11px] leading-snug text-amber-950/80">
            Purchases add to inventory. Profit is only{' '}
            <span className="font-semibold">sales − COGS</span>, not sales minus purchases.
          </p>
        </div>
      </div>

      <div className="px-5 py-4 print:px-4 sm:px-6">
        <div className="overflow-x-auto">
          <table className="category-trading-table w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="w-[22%] border-b border-slate-900 pb-2 pl-0 pr-4 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  Category
                </th>
                <th colSpan={3} className={GROUP_SALES}>
                  Sales
                </th>
                <th colSpan={1} className={cn(GROUP_PURCHASE, DIVIDER)}>
                  Purchases
                </th>
                <th rowSpan={2} className={cn(GROUP_RESULT, DIVIDER, 'align-bottom')}>
                  Gross profit
                </th>
              </tr>
              <tr className="border-b border-slate-300">
                <th className={SUB_TH}>Revenue</th>
                <th className={SUB_TH}>COGS</th>
                <th className={SUB_TH}>Margin</th>
                <th className={cn(SUB_TH, DIVIDER)}>Stock purchased</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm italic text-slate-400">
                    No posted sales or purchases in this period.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const label = categoryLabel(row.category_name, row.category_code);
                  return (
                    <tr
                      key={row.category_id ?? `row-${index}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-2.5 pl-0 pr-4">
                        <span
                          className={cn(
                            'text-sm font-medium text-slate-800',
                            row.uncategorized && 'italic font-normal text-slate-500',
                          )}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <Amount value={row.sale} />
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <Amount value={row.cogs} className="text-slate-600" />
                      </td>
                      <td
                        className={cn(
                          'px-2 py-2.5 text-right text-sm tabular-nums',
                          profitColor(row.margin_percent),
                        )}
                      >
                        {formatPct(row.margin_percent)}
                      </td>
                      <td className={cn('px-2 py-2.5 text-right', DIVIDER)}>
                        <Amount value={row.purchase} className="text-slate-600" />
                      </td>
                      <td className={cn('px-2 py-2.5 text-right', DIVIDER)}>
                        <Amount
                          value={row.net_profit}
                          emphasize
                          className={profitColor(row.net_profit)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-y-[3px] border-double border-slate-900 bg-slate-50/50">
                  <td className="py-2.5 pl-0 pr-4 text-sm font-semibold text-slate-900">
                    Total
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <Amount value={sale} emphasize />
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <Amount value={cogs} emphasize />
                  </td>
                  <td
                    className={cn(
                      'px-2 py-2.5 text-right text-sm font-semibold tabular-nums',
                      profitColor(marginPct),
                    )}
                  >
                    {formatPct(marginPct)}
                  </td>
                  <td className={cn('px-2 py-2.5 text-right', DIVIDER)}>
                    <Amount value={purchase} emphasize className="text-slate-700" />
                  </td>
                  <td className={cn('px-2 py-2.5 text-right', DIVIDER)}>
                    <Amount
                      value={grossProfit}
                      emphasize
                      className={cn('font-bold', profitColor(grossProfit))}
                    />
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        {includeExpenses ? (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Operating expenses
            </p>
            {expenseRows.length === 0 ? (
              <p className="mt-2 text-sm italic text-slate-400">
                No approved expenses in this period.
              </p>
            ) : (
              <div className="mt-2 space-y-0 divide-y divide-slate-100">
                {expenseRows.map((row, index) => (
                  <MoneyLine
                    key={row.account_id ?? `expense-${index}`}
                    label={row.label}
                    value={row.amount}
                  />
                ))}
              </div>
            )}
            <div className="mt-3 space-y-0 border-t border-slate-200 pt-2">
              <MoneyLine label="Gross profit" value={grossProfit} profit />
              <MoneyLine
                label="Operating expenses"
                value={expenseTotal > 0.004 ? -expenseTotal : 0}
              />
              <MoneyLine
                label={
                  netAfterExpenses < 0
                    ? 'Net loss after expenses'
                    : 'Net profit after expenses'
                }
                value={netAfterExpenses}
                profit
                bold
              />
            </div>
          </div>
        ) : null}
      </div>

      <PharmacyReportFooter note="Left side = sales activity (revenue and COGS). Right side = stock purchased (inventory in). Gross profit = sales − COGS only." />
    </div>
  );
}
