import { Building2, Coins, Layers } from 'lucide-react';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function fmtMoney(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function fmtCompactMoney(value, currency = 'USD') {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return `$${(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`;
  }
  if (abs >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (abs >= 10_000) {
    return `$${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return fmtMoney(n, currency);
}

const TYPE_COLORS = [
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
];

export function AccountHighlights({ totals, breakdown, usage, loading, limit = 4 }) {
  if (loading) {
    return <Skeleton className="h-full min-h-[360px] rounded-xl" />;
  }

  const currencyRows = breakdown?.by_currency ?? [];
  const typeRows = breakdown?.by_type ?? [];
  const totalCompanies = usage?.companies ?? 0;
  const activePct =
    totalCompanies > 0
      ? Math.round(((usage?.active_companies ?? 0) / totalCompanies) * 100)
      : 0;

  const currencySegments = currencyRows.map((row, i) => ({
    ...row,
    pct: totalCompanies > 0 ? Math.round((row.count / totalCompanies) * 100) : 0,
    color: TYPE_COLORS[i % TYPE_COLORS.length],
  }));

  const typeLegend = typeRows.slice(0, 3).map((row, i) => ({
    label: row.type,
    color: TYPE_COLORS[i % TYPE_COLORS.length],
  }));

  const detailRows = [
    {
      icon: Building2,
      text: 'Active companies',
      total: usage?.active_companies ?? 0,
      stats: activePct,
      increase: true,
      iconClass: 'text-emerald-600',
    },
    {
      icon: Layers,
      text: 'Company slots left',
      total: usage?.slots_remaining ?? 0,
      stats: usage?.company_limit ?? 0,
      increase: (usage?.slots_remaining ?? 0) > 0,
      suffix: `of ${usage?.company_limit ?? 0}`,
      iconClass: 'text-indigo-600',
    },
    {
      icon: Coins,
      text: 'Open invoices',
      total: totals.openInvoices,
      stats: totals.openBills,
      increase: totals.openInvoices >= totals.openBills,
      suffix: 'bills',
      iconClass: 'text-amber-600',
    },
  ];

  const arFull = fmtMoney(totals.arOutstanding);

  return (
    <Card className="h-full overflow-hidden border-teal-200/60 dark:border-teal-800/40">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-teal-50/80 to-transparent dark:from-teal-950/30">
        <CardTitle className="text-teal-950 dark:text-teal-50">Portfolio highlights</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-5 lg:p-6 lg:pt-4">
        <div className="min-w-0 space-y-1 rounded-xl border border-teal-100 bg-teal-50/50 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
          <span className="text-sm font-medium text-teal-800/80 dark:text-teal-200/80">
            Receivables outstanding
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <span
              className="min-w-0 truncate text-2xl font-bold tracking-tight text-teal-950 tabular-nums dark:text-teal-50 sm:text-3xl"
              title={arFull}
            >
              {fmtCompactMoney(totals.arOutstanding)}
            </span>
            <Badge size="sm" variant="success" appearance="light" className="shrink-0">
              {usage?.active_companies ?? 0} active
            </Badge>
          </div>
        </div>

        {currencySegments.length > 0 ? (
          <>
            <div className="mb-1.5 flex items-center gap-1">
              {currencySegments.map((seg) => (
                <div
                  key={seg.currency}
                  className={`${seg.color} h-2.5 w-full rounded-full`}
                  style={{ maxWidth: `${Math.max(seg.pct, 8)}%` }}
                />
              ))}
            </div>
            <div className="mb-1 flex flex-wrap items-center gap-4">
              {currencySegments.map((seg) => (
                <div key={seg.currency} className="flex items-center gap-1.5">
                  <BadgeDot className={seg.color} />
                  <span className="text-sm font-normal text-foreground">
                    {seg.currency} · {seg.count}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {typeLegend.length > 0 ? (
          <div className="mb-1 flex flex-wrap items-center gap-4">
            {typeLegend.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <BadgeDot className={item.color} />
                <span className="text-sm font-normal capitalize text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="border-b border-input" />

        <div className="grid gap-3">
          {detailRows.slice(0, limit).map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.text}
                className="flex min-w-0 items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <Icon className={`size-4.5 shrink-0 ${row.iconClass}`} />
                  <span className="truncate text-sm font-medium text-foreground">{row.text}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm font-semibold tabular-nums text-foreground">
                  <span>
                    {row.total}
                    {row.suffix ? ` ${row.suffix}` : ''}
                  </span>
                  {!row.suffix ? (
                    <span className="text-muted-foreground">{row.stats}%</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
