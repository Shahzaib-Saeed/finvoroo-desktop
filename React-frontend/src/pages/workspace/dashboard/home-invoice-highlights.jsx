import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, FileText, Receipt, Wallet } from 'lucide-react';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtCurrency } from './dashboard-ui';

export function HomeInvoiceHighlights({ companyId, stats, currency, loading }) {
  const base = `/workspace/${companyId}/accounting`;
  const totalInvoiced = Number(stats?.total_invoiced) || 0;
  const totalPaid = Number(stats?.total_paid) || 0;
  const balanceDue = Number(stats?.balance_due) || 0;
  const overdueCount = Number(stats?.overdue_count) || 0;
  const openCount = Number(stats?.open_invoice_count) || 0;
  const collected = Number(stats?.payment_total) || 0;

  const paidShare = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
  const dueShare = totalInvoiced > 0 ? Math.round((balanceDue / totalInvoiced) * 100) : 0;
  const overdueShare = totalInvoiced > 0 ? Math.min(Math.round((overdueCount / Math.max(openCount, 1)) * 100), 100) : 0;

  const rows = [
    {
      icon: FileText,
      text: 'Open invoices',
      total: openCount,
      stats: dueShare,
      increase: openCount === 0,
      to: `${base}/reports/accounts-receivable`,
    },
    {
      icon: Wallet,
      text: 'Collected',
      total: collected,
      stats: paidShare,
      increase: true,
      isCurrency: true,
      to: `${base}/payments`,
    },
    {
      icon: Receipt,
      text: 'Overdue',
      total: overdueCount,
      stats: overdueShare,
      increase: false,
      to: `${base}/reports/aged-receivables`,
    },
  ];

  const legend = [
    { color: 'bg-emerald-500', label: 'Paid' },
    { color: 'bg-primary', label: 'Outstanding' },
    { color: 'bg-destructive', label: 'Overdue' },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="py-5 min-h-0">
        <CardTitle>Invoice highlights</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 lg:pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-normal text-secondary-foreground">All time invoiced</span>
          {loading ? (
            <Skeleton className="h-9 w-36" />
          ) : (
            <Link
              to={`${base}/invoices`}
              className="flex items-center gap-2.5 w-fit hover:opacity-80 transition-opacity"
              title="View invoices"
            >
              <span className="text-3xl font-semibold text-mono tabular-nums">
                {fmtCurrency(totalInvoiced, currency)}
              </span>
              {paidShare > 0 && (
                <Badge size="sm" variant="success" appearance="light">
                  {paidShare}% collected
                </Badge>
              )}
            </Link>
          )}
        </div>

        {!loading && totalInvoiced > 0 && (
          <div className="flex items-center gap-1 mb-1">
            <div
              className="bg-emerald-500 h-2 rounded-xs"
              style={{ width: `${Math.max(paidShare, 4)}%` }}
            />
            <div
              className="bg-primary h-2 rounded-xs flex-1 max-w-[40%]"
              style={{ width: `${Math.max(dueShare, 4)}%` }}
            />
            {overdueCount > 0 && (
              <div className="bg-destructive h-2 rounded-xs max-w-[20%]" style={{ width: `${Math.max(overdueShare, 4)}%` }} />
            )}
          </div>
        )}

        <div className="flex items-center flex-wrap gap-4 mb-1">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <BadgeDot className={item.color} />
              <span className="text-sm font-normal text-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="border-b border-input" />

        <div className="grid gap-3">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <Link
                key={row.text}
                to={row.to}
                className="flex items-center justify-between flex-wrap gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="size-4.5 text-muted-foreground" />
                  <span className="text-sm font-normal text-mono">{row.text}</span>
                </div>
                <div className="flex items-center text-sm font-medium text-foreground gap-6">
                  <span className="lg:text-right tabular-nums">
                    {loading
                      ? '—'
                      : row.isCurrency
                        ? fmtCurrency(row.total, currency)
                        : row.total}
                  </span>
                  {!loading && (
                    <span className="flex items-center justify-end gap-1 tabular-nums">
                      {row.increase ? (
                        <ArrowUp className="text-green-500 size-4" />
                      ) : (
                        <ArrowDown className="text-destructive size-4" />
                      )}
                      {row.stats}%
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
