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

function SummaryCell({ label, value, tone, hint }) {
  return (
    <div className="bg-white px-4 py-2.5 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-sm font-bold tabular-nums',
          tone === 'profit' && 'text-emerald-700',
          tone === 'loss' && 'text-red-700',
          !tone && 'text-slate-900',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

function MoneyLine({ label, value, profit = false, bold = false }) {
  const n = Number(value);
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
          !profit && n < -0.004 && 'text-red-700',
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

      <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
        <SummaryCell label="Sales" value={formatReportMoney(sale)} />
        <SummaryCell label="COGS" value={formatReportMoney(cogs)} />
        <SummaryCell
          label={grossProfit < 0 ? 'Gross loss' : 'Gross profit'}
          value={formatReportMoney(grossProfit)}
          tone={grossProfit < -0.004 ? 'loss' : grossProfit > 0.004 ? 'profit' : undefined}
          hint={marginPct != null ? `${formatPct(marginPct)} margin` : null}
        />
        <SummaryCell
          label="Stock purchased"
          value={formatReportMoney(purchase)}
          hint="Not in P&L"
        />
      </div>

      <div className="px-5 py-4 print:px-4 sm:px-6">
        <div className="overflow-x-auto">
          <table className="category-trading-table w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-slate-900">
                <th className="pb-2 pl-0 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Category
                </th>
                <th className="px-3 pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Sales
                </th>
                <th className="px-3 pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                  COGS
                </th>
                <th className="px-3 pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Gross profit
                </th>
                <th className="px-3 pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Margin
                </th>
                <th className="pb-2 pl-3 pr-0 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Stock purchased
                </th>
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
                    <tr key={row.category_id ?? `row-${index}`}>
                      <td className="py-2 pl-0 pr-4">
                        <span
                          className={cn(
                            'text-sm text-slate-800',
                            row.uncategorized && 'italic text-slate-500',
                          )}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Amount value={row.sale} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Amount value={row.cogs} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Amount
                          value={row.net_profit}
                          emphasize
                          className={profitColor(row.net_profit)}
                        />
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2 text-right text-sm tabular-nums',
                          profitColor(row.margin_percent),
                        )}
                      >
                        {formatPct(row.margin_percent)}
                      </td>
                      <td className="py-2 pl-3 pr-0 text-right">
                        <Amount value={row.purchase} className="text-slate-400" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-y-[3px] border-double border-slate-900">
                  <td className="py-2.5 pl-0 pr-4 text-sm font-semibold text-slate-900">
                    Total
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Amount value={sale} emphasize />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Amount value={cogs} emphasize />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Amount
                      value={grossProfit}
                      emphasize
                      className={cn('font-bold', profitColor(grossProfit))}
                    />
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2.5 text-right text-sm font-semibold tabular-nums',
                      profitColor(marginPct),
                    )}
                  >
                    {formatPct(marginPct)}
                  </td>
                  <td className="py-2.5 pl-3 pr-0 text-right">
                    <Amount value={purchase} className="font-semibold text-slate-400" />
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

      <PharmacyReportFooter note="Gross profit = sales − COGS. Stock purchased is inventory bought, not a profit deduction." />
    </div>
  );
}
