import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtCurrency } from '@/pages/workspace/dashboard/dashboard-ui';

function CustomerTable({ rows, base, currency, valueKey = 'revenue' }) {
  if (!rows?.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No customer data in this period.</p>;
  }

  const max = Math.max(...rows.map((r) => r[valueKey] ?? 0), 1);

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const pct = Math.round(((row[valueKey] ?? 0) / max) * 100);
        const filterUrl = `${base}?customer_id=${row.customer_id}`;

        return (
          <Link
            key={row.customer_id}
            to={filterUrl}
            className="block rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{row.customer_name}</p>
                <p className="text-xs text-muted-foreground">{row.job_count} jobs</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums">
                  {valueKey === 'job_count' ? row.job_count : fmtCurrency(row.revenue, currency)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Avg {fmtCurrency(row.avg_job_value, currency)}
                </p>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 4)}%` }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function JobOrderCustomerAnalysis({ analysis, currency = 'USD', base, loading }) {
  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-semibold">Customer analysis</CardTitle>
        <CardDescription className="text-xs">
          Rankings by revenue and job volume · Avg job value{' '}
          {fmtCurrency(analysis?.avg_job_value ?? 0, currency)}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-4">
        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-muted/40" />
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Top by revenue
              </p>
              <CustomerTable rows={analysis?.by_revenue} base={base} currency={currency} valueKey="revenue" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Top by job count
              </p>
              <CustomerTable rows={analysis?.by_job_count} base={base} currency={currency} valueKey="job_count" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
