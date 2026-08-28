import { Link, useParams } from 'react-router';
import { ExternalLink, Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '../../invoices/constants';
import { cn } from '@/lib/utils';

const panelHeaderClass =
  'min-h-0 items-start py-5 px-5 max-sm:px-4 border-b border-border';
const panelContentClass = 'px-5 pb-5 pt-5 max-sm:px-4';

const TYPE_LABELS = {
  invoice: 'Invoice',
  customer_payment: 'Customer payment',
  expense: 'Expense',
  bill: 'Bill',
  vendor_payment: 'Vendor payment',
  journal: 'Journal',
  labor: 'Labor',
};

function docPath(workspaceId, item) {
  const base = `/workspace/${workspaceId}/accounting`;
  if (item.type === 'invoice') return `${base}/invoices/${item.id}`;
  if (item.type === 'customer_payment') return `${base}/payments/${item.id}`;
  if (item.type === 'expense') return `${base}/expenses/${item.id}`;
  if (item.type === 'bill') return `${base}/bills/${item.id}`;
  if (item.type === 'vendor_payment') return `${base}/bill-payments/${item.id}`;
  return `${base}/journal/${item.id}`;
}

function LinkedTransactionRow({ item, workspaceId, currency, compact }) {
  const statusLabel = item.is_posted ? 'posted' : item.status || 'pending';

  if (compact) {
    return (
      <Link
        to={docPath(workspaceId, item)}
        className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm hover:bg-muted/40 transition-colors group"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
              {TYPE_LABELS[item.type] || item.type}
            </span>
            <span className="font-mono text-xs font-medium truncate group-hover:text-primary">
              {item.number}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{item.date || '—'}</p>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <p className="text-xs font-semibold tabular-nums">
            {formatCurrency(item.amount, currency)}
          </p>
          <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
            {statusLabel}
          </Badge>
        </div>
        <ExternalLink className="size-3.5 text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100" />
      </Link>
    );
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 px-4 capitalize">{TYPE_LABELS[item.type] || item.type}</td>
      <td className="py-2 px-4 font-mono">{item.number}</td>
      <td className="py-2 px-4 text-muted-foreground">{item.date || '—'}</td>
      <td className="py-2 px-4 text-right tabular-nums font-medium">
        {formatCurrency(item.amount, currency)}
      </td>
      <td className="py-2 px-4 text-center">
        <Badge variant="outline" className="text-xs capitalize">
          {statusLabel}
        </Badge>
      </td>
      <td className="py-2 px-4">
        <Link
          to={docPath(workspaceId, item)}
          className="text-primary hover:underline inline-flex"
          title="Open"
        >
          <ExternalLink className="size-4" />
        </Link>
      </td>
    </tr>
  );
}

export function JobOrderLinkedCostsPanel({
  linkedCosts,
  currency = 'USD',
  compact = false,
  className,
}) {
  const { id: workspaceId } = useParams();
  const items = linkedCosts?.items || [];
  const postedTotal = linkedCosts?.posted_total ?? 0;
  const pendingTotal = linkedCosts?.pending_total ?? 0;

  const headerClass = compact
    ? 'min-h-0 items-start border-0 py-4 px-5 max-sm:px-4 pb-2'
    : panelHeaderClass;
  const contentClass = compact
    ? 'px-5 pb-5 pt-0 max-sm:px-4 space-y-2'
    : 'p-0 pt-0';

  if (!items.length) {
    return (
      <Card className={cn('shadow-sm', className)}>
        <CardHeader className={compact ? headerClass : 'pb-3'}>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="size-4 text-muted-foreground" />
            Linked transactions
          </CardTitle>
          {!compact ? (
            <CardDescription>
              Tag invoices, payments, bills, expenses, and journals to this job when you record them.
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className={compact ? contentClass : undefined}>
          <p className={cn('text-sm text-muted-foreground', compact ? 'py-3 text-center' : 'text-center py-8')}>
            No transactions linked yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className={headerClass}>
        <div className="flex flex-wrap items-start justify-between gap-2 w-full">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground shrink-0" />
              Linked transactions
            </CardTitle>
            {!compact ? (
              <CardDescription>
                Income and costs assigned to this job for profitability.
              </CardDescription>
            ) : (
              <CardDescription className="text-xs">
                {items.length} linked · {formatCurrency(postedTotal, currency)} posted
                {pendingTotal > 0 ? ` · ${formatCurrency(pendingTotal, currency)} pending` : ''}
              </CardDescription>
            )}
          </div>
          {!compact ? (
            <div className="text-right text-sm shrink-0">
              <p className="font-semibold tabular-nums">
                {formatCurrency(postedTotal, currency)} posted costs
              </p>
              {pendingTotal > 0 ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  + {formatCurrency(pendingTotal, currency)} pending
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={contentClass}>
        {compact ? (
          <div className="space-y-1.5 max-h-[min(320px,40vh)] overflow-y-auto pr-0.5">
            {items.map((item) => (
              <LinkedTransactionRow
                key={`${item.type}-${item.id}`}
                item={item}
                workspaceId={workspaceId}
                currency={currency}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground">
                  <th className="py-2 px-4 text-left font-medium">Type</th>
                  <th className="py-2 px-4 text-left font-medium">Document</th>
                  <th className="py-2 px-4 text-left font-medium">Date</th>
                  <th className="py-2 px-4 text-right font-medium">Amount</th>
                  <th className="py-2 px-4 text-center font-medium">Status</th>
                  <th className="py-2 px-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <LinkedTransactionRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    workspaceId={workspaceId}
                    currency={currency}
                    compact={false}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
