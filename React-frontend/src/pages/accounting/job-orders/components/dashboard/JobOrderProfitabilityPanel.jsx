import { Link } from 'react-router';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fmtCurrency } from '@/pages/workspace/dashboard/dashboard-ui';

function SummaryRow({ label, amount, currency, tone = 'default' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm font-semibold tabular-nums',
          tone === 'profit' && amount >= 0 && 'text-emerald-600 dark:text-emerald-400',
          tone === 'profit' && amount < 0 && 'text-red-600 dark:text-red-400',
          tone === 'cost' && 'text-amber-700 dark:text-amber-400',
        )}
      >
        {fmtCurrency(amount, currency)}
      </span>
    </div>
  );
}

function JobRankList({ title, jobs, base, currency, variant = 'top' }) {
  if (!jobs?.length) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          {title}
        </p>
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">No data in this period.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="space-y-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            to={`${base}/${job.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs text-primary">{job.job_number}</p>
              <p className="text-sm truncate">{job.title || job.customer_name || 'Untitled job'}</p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={cn(
                  'text-sm font-bold tabular-nums',
                  variant === 'loss' || job.net_profit < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {fmtCurrency(job.net_profit, currency)}
              </p>
              {job.margin_percent != null ? (
                <p className="text-[10px] text-muted-foreground">{job.margin_percent}% margin</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function JobOrderProfitabilityPanel({ profitability, currency = 'USD', base, loading, reportsBase }) {
  const summary = profitability?.summary || {};
  const breakdown = profitability?.breakdown || [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Profitability analysis</CardTitle>
            <CardDescription className="text-xs">
              Actual revenue and costs from tagged invoices, bills, labor, and expenses
            </CardDescription>
          </div>
          {reportsBase ? (
            <Link
              to={reportsBase}
              className="inline-flex items-center text-xs text-primary hover:underline"
            >
              Full P&amp;L report <ArrowRight className="size-3.5 ml-1" />
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-5 py-4">
        {loading ? (
          <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
        ) : (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-1">
              <SummaryRow label="Job revenue" amount={summary.revenue ?? 0} currency={currency} />
              <SummaryRow label="Material / bills" amount={summary.material_cost ?? 0} currency={currency} tone="cost" />
              <SummaryRow label="Labor cost" amount={summary.labor_cost ?? 0} currency={currency} tone="cost" />
              <SummaryRow
                label="Additional expenses"
                amount={(summary.expenses ?? 0) + (summary.other_cost ?? 0)}
                currency={currency}
                tone="cost"
              />
              <SummaryRow label="Net profit" amount={summary.net_profit ?? 0} currency={currency} tone="profit" />
              <div className="pt-3 flex items-center gap-2">
                <Badge variant="outline" className="tabular-nums">
                  Margin {summary.margin_percent != null ? `${summary.margin_percent}%` : '—'}
                </Badge>
                <Badge variant="secondary" className="tabular-nums">
                  {summary.job_count ?? 0} jobs with activity
                </Badge>
                {(profitability?.loss_making_count ?? 0) > 0 ? (
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    {profitability.loss_making_count} loss-making
                  </Badge>
                ) : null}
              </div>

              {breakdown.length ? (
                <div className="pt-4 space-y-2">
                  {breakdown.map((row) => {
                    const max = Math.max(...breakdown.map((b) => Math.abs(b.amount || 0)), 1);
                    const pct = Math.round((Math.abs(row.amount || 0) / max) * 100);
                    return (
                      <div key={row.key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{row.label}</span>
                          <span className="tabular-nums">{fmtCurrency(row.amount, currency)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              row.key === 'net_profit'
                                ? row.amount >= 0
                                  ? 'bg-emerald-500'
                                  : 'bg-red-500'
                                : row.key === 'revenue'
                                  ? 'bg-primary'
                                  : 'bg-amber-500',
                            )}
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-5">
              <JobRankList
                title={
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="size-3.5" /> Most profitable
                  </span>
                }
                jobs={profitability?.top_jobs}
                base={base}
                currency={currency}
                variant="top"
              />
              <JobRankList
                title={
                  <span className="inline-flex items-center gap-1">
                    <TrendingDown className="size-3.5" /> Least profitable
                  </span>
                }
                jobs={profitability?.loss_making_jobs?.length ? profitability.loss_making_jobs : profitability?.bottom_jobs}
                base={base}
                currency={currency}
                variant="loss"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
