import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const COLORS = {
  pending: 'bg-slate-500',
  approved: 'bg-blue-500',
  in_progress: 'bg-primary',
  quality_check: 'bg-violet-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-muted-foreground/50',
};

export function JobOrderStatusChart({ rows = [], base, loading }) {
  const total = rows.reduce((sum, row) => sum + (row.count || 0), 0);

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-semibold">Job status overview</CardTitle>
        <CardDescription className="text-xs">Distribution across workflow states</CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-4 space-y-3">
        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-muted/40" />
        ) : rows.length === 0 || total === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No jobs in this period.</p>
        ) : (
          rows.map((row) => {
            const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
            const status = row.drill_down?.status || row.statuses?.[0];
            const to = status ? `${base}?status=${encodeURIComponent(status)}` : base;

            return (
              <Link
                key={row.key}
                to={to}
                className="block rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-medium">{row.label}</span>
                  <span className="text-sm font-bold tabular-nums">
                    {row.count} <span className="text-xs font-normal text-muted-foreground">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', COLORS[row.key] || 'bg-primary')}
                    style={{ width: `${Math.max(pct, row.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
