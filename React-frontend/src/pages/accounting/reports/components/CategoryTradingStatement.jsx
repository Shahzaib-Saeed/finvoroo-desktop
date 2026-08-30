import { cn } from '@/lib/utils';
import {
  PharmacyReportFooter,
  formatReportDate,
  formatReportMoney,
} from '@/industries/pharmacy/pages/reports/PharmacyReportChrome';
import { categoryLabel } from './CategoryTradingPartnerCards';

function formatPct(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1)}%`;
}

function Amount({ value, signed = false, emphasize = false, className }) {
  const n = Number(value);
  const negative = Number.isFinite(n) && n < -0.004;
  const positive = signed && Number.isFinite(n) && n > 0.004;

  return (
    <span
      className={cn(
        'block text-right text-sm tabular-nums text-slate-800',
        emphasize && 'font-semibold text-slate-900',
        negative && 'font-medium text-red-700',
        positive && 'font-medium text-emerald-700',
        className,
      )}
    >
      {formatReportMoney(value)}
    </span>
  );
}

function SheetMetaHeader({
  companyName,
  logoUrl,
  periodFrom,
  periodTo,
  currency,
  fiscalYear,
  generatedBy,
  printedAt,
}) {
  return (
    <header className="border-b border-slate-200 px-5 py-4 print:px-3 print:py-3 sm:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-auto max-w-[120px] shrink-0 object-contain print:h-8"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">
              {companyName || 'Company'}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {formatReportDate(periodFrom)} – {formatReportDate(periodTo)}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-xs leading-relaxed text-slate-500 sm:text-right">
          {currency ? <p className="font-medium text-slate-600">{currency}</p> : null}
          {fiscalYear ? <p className="mt-0.5">{fiscalYear}</p> : null}
          {generatedBy ? <p className="mt-0.5">Prepared by {generatedBy}</p> : null}
          {printedAt ? <p className="mt-0.5">{printedAt}</p> : null}
        </div>
      </div>
    </header>
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
}) {
  return (
    <div className="category-trading-statement bg-white">
      <SheetMetaHeader
        companyName={companyName}
        logoUrl={logoUrl}
        periodFrom={periodFrom}
        periodTo={periodTo}
        currency={currency}
        fiscalYear={fiscalYear}
        generatedBy={generatedBy}
        printedAt={printedAt}
      />

      <div className="px-5 py-4 print:px-3 print:py-3 sm:px-7 sm:py-5">
        <p className="mb-3 text-xs text-slate-500">
          Each row is a product category. Net result is sales minus purchases for
          the period — use it for month-end settlement between partners.
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2.5 pl-4 pr-3 text-left">Category</th>
                <th className="px-3 py-2.5 text-right">Purchases</th>
                <th className="px-3 py-2.5 text-right">Sales</th>
                <th className="px-3 py-2.5 text-right">Net result</th>
                <th className="py-2.5 pl-3 pr-4 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                    No posted sales or purchases in this period.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const label = categoryLabel(row.category_name, row.category_code);
                  return (
                    <tr
                      key={row.category_id ?? `uncategorized-${index}`}
                      className={cn(
                        'border-b border-slate-100',
                        index % 2 === 1 && 'bg-slate-50/50',
                      )}
                    >
                      <td className="py-3 pl-4 pr-3 align-middle">
                        <span className="text-sm font-medium text-slate-900">
                          {label}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Amount value={row.purchase} />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Amount value={row.sale} />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Amount value={row.net_profit} signed />
                      </td>
                      <td className="py-3 pl-3 pr-4 align-middle text-right text-sm tabular-nums text-slate-600">
                        <span
                          className={cn(
                            Number(row.margin_percent) < 0 && 'font-medium text-red-700',
                            Number(row.margin_percent) > 0 && 'font-medium text-emerald-700',
                          )}
                        >
                          {formatPct(row.margin_percent)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100/80">
                  <td className="py-3 pl-4 pr-3 text-sm font-bold text-slate-900">
                    Total
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Amount value={totals.purchase} emphasize />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Amount value={totals.sale} emphasize />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Amount value={totals.net_profit} signed emphasize />
                  </td>
                  <td className="py-3 pl-3 pr-4 align-middle text-right text-sm font-semibold tabular-nums text-slate-900">
                    <span
                      className={cn(
                        Number(totals.margin_percent) < 0 && 'text-red-700',
                        Number(totals.margin_percent) > 0 && 'text-emerald-700',
                      )}
                    >
                      {formatPct(totals.margin_percent)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      <PharmacyReportFooter note="Posted invoices and bills only. Net result = sales − purchases per category for the selected period." />
    </div>
  );
}
