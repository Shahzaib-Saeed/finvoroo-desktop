import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fmtCurrency } from './dashboard-ui';

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3.5 shadow-lg">
      <div className="text-sm font-medium text-secondary-foreground">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <div
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold tabular-nums">{fmtCurrency(entry.value, currency)}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardRevenueChart({ chart, currency, loading, className }) {
  const labels = chart?.labels ?? [];
  const revenue = chart?.revenue ?? [];
  const expenses = chart?.expenses ?? [];

  const data = labels.map((label, i) => ({
    name: typeof label === 'string' ? label.split(' ')[0] : String(label),
    revenue: revenue[i] ?? 0,
    expenses: expenses[i] ?? 0,
  }));

  const revenueTotal = revenue.reduce((a, b) => a + b, 0);
  const expenseTotal = expenses.reduce((a, b) => a + b, 0);

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="py-5 min-h-0 lg:px-7.5">
        <CardTitle>Revenue vs Expenses</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-0 pb-4 lg:pt-2">
        <div className="flex flex-wrap items-center gap-6 px-5 lg:px-7.5 mb-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground">6-month revenue</span>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-28" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {fmtCurrency(revenueTotal, currency)}
              </p>
            )}
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">6-month expenses</span>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-28" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {fmtCurrency(expenseTotal, currency)}
              </p>
            )}
          </div>
        </div>

        <div className="h-44 w-full">
          {loading ? (
            <Skeleton className="mx-5 lg:mx-7.5 h-full rounded-lg" />
          ) : data.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">
              No chart data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0 72% 51%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="5 5"
                  stroke="var(--border)"
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  hide
                  domain={[0, (max) => Math.max(max * 1.15, 1)]}
                />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="var(--primary)"
                  fill="url(#revenueGradient)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'white', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="hsl(0 72% 51%)"
                  fill="url(#expenseGradient)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: 'hsl(0 72% 51%)', stroke: 'white', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
