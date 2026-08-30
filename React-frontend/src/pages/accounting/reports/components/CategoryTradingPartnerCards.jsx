import { cn } from '@/lib/utils';
import { formatReportMoney } from '@/industries/pharmacy/pages/reports/PharmacyReportChrome';

function categoryLabel(name, code) {
  const display = String(name || 'Uncategorized').trim();
  if (!code) return display;
  const normalizedName = display.replace(/\s+/g, '').toLowerCase();
  const normalizedCode = String(code).replace(/\s+/g, '').toLowerCase();
  if (normalizedCode === normalizedName) return display;
  return display;
}

function Metric({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-sm font-semibold tabular-nums text-slate-800',
          tone === 'positive' && 'text-emerald-700',
          tone === 'negative' && 'text-red-700',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * On-screen partner view — one card per category for month-end settlement review.
 */
export function CategoryTradingPartnerCards({ rows = [], currency }) {
  if (!rows.length) return null;

  return (
    <div className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, index) => {
        const net = Number(row.net_profit ?? 0);
        const label = categoryLabel(row.category_name, row.category_code);

        return (
          <div
            key={row.category_id ?? `category-${index}`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 border-b border-slate-100 pb-3">
              <Metric label="Purchases" value={formatReportMoney(row.purchase)} />
              <Metric label="Sales" value={formatReportMoney(row.sale)} />
              <Metric
                label="Margin"
                value={
                  row.margin_percent == null
                    ? '—'
                    : `${Number(row.margin_percent).toFixed(1)}%`
                }
                tone={Number(row.margin_percent) < 0 ? 'negative' : undefined}
              />
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Net result
              </p>
              <p
                className={cn(
                  'text-base font-bold tabular-nums',
                  net >= 0 ? 'text-emerald-700' : 'text-red-700',
                )}
              >
                {formatReportMoney(net)}
                {currency ? (
                  <span className="ms-1 text-[11px] font-medium text-slate-400">
                    {currency}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { categoryLabel };
