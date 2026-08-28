import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../invoices/constants';

function MetricTile({ label, value, sub, className }) {
  return (
    <div className={cn('rounded-lg border bg-muted/30 p-3', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums mt-1">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground mt-0.5">{sub}</p> : null}
    </div>
  );
}

const BASIS_LABELS = {
  posted_invoices: 'Posted invoices (tagged)',
  draft_invoices: 'Draft invoices (tagged)',
  none: 'No tagged income yet',
};

const panelHeaderClass =
  'min-h-0 items-start py-5 px-5 max-sm:px-4 border-b border-border';
const panelContentClass = 'px-5 pb-5 pt-5 max-sm:px-4';

export function JobOrderProfitabilityPanel({ summary }) {
  if (!summary) return null;

  const currency = summary.currency || 'USD';
  const revenue = summary.revenue || {};
  const cost = summary.cost || {};
  const profit = summary.profitability || {};
  const estimates = summary.estimates || {};
  const counts = summary.counts || {};

  const recognized = revenue.recognized ?? 0;
  const paymentsReceived = revenue.payments_received ?? 0;
  const totalCost = cost.total ?? 0;
  const pendingTagged = cost.pending_tagged ?? 0;
  const grossProfit = profit.gross_profit ?? 0;
  const margin = profit.margin_percent;
  const basis = profit.basis || 'none';

  const hasEstimates =
    estimates.estimated_revenue != null || estimates.estimated_cost != null;

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className={panelHeaderClass}>
          <div className="flex flex-wrap items-start justify-between gap-3 w-full">
            <div className="space-y-1.5 min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="size-4 text-muted-foreground shrink-0" />
                Job financial summary
              </CardTitle>
              <CardDescription>
                Profit uses tagged posted invoices for revenue. Costs include tagged bills,
                expenses, journals, labor, and vendor payments.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-normal shrink-0">
              {BASIS_LABELS[basis] || basis}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className={cn(panelContentClass, 'space-y-4')}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Recognized revenue"
              value={formatCurrency(recognized, currency)}
              sub={
                revenue.posted_invoice_count > 0
                  ? `${revenue.posted_invoice_count} tagged posted invoice(s)`
                  : 'Tag and post invoices on this job'
              }
            />
            <MetricTile
              label="Payments received"
              value={formatCurrency(paymentsReceived, currency)}
              sub={
                revenue.customer_payment_count > 0
                  ? `${revenue.customer_payment_count} tagged payment(s)`
                  : 'Optional cash tracking'
              }
            />
            <MetricTile
              label="Total cost"
              value={formatCurrency(totalCost, currency)}
              sub={
                pendingTagged > 0
                  ? `+ ${formatCurrency(pendingTagged, currency)} pending`
                  : 'Tagged costs only'
              }
            />
            <MetricTile
              label="Gross profit"
              value={formatCurrency(grossProfit, currency)}
              sub={margin != null ? `${margin}% margin` : 'Margin when revenue is posted'}
              className={cn(
                profit.is_profitable === false && recognized > 0
                  ? 'border-destructive/30 bg-destructive/5'
                  : recognized > 0
                    ? 'border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : '',
              )}
            />
          </div>

          {(cost.expenses > 0 ||
            cost.bills > 0 ||
            cost.journals > 0 ||
            cost.labor > 0 ||
            cost.vendor_payments > 0) && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm border rounded-lg p-3 bg-muted/20">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Expenses</p>
                <p className="font-semibold tabular-nums">{formatCurrency(cost.expenses ?? 0, currency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Bills</p>
                <p className="font-semibold tabular-nums">{formatCurrency(cost.bills ?? 0, currency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Vendor payments</p>
                <p className="font-semibold tabular-nums">
                  {formatCurrency(cost.vendor_payments ?? 0, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Journals</p>
                <p className="font-semibold tabular-nums">{formatCurrency(cost.journals ?? 0, currency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Labor</p>
                <p className="font-semibold tabular-nums">{formatCurrency(cost.labor ?? 0, currency)}</p>
              </div>
            </div>
          )}

          {revenue.draft_invoices > 0 && recognized === 0 ? (
            <div className="rounded-md border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
              <p className="font-medium">Draft tagged invoices</p>
              <p className="text-xs mt-0.5 text-amber-800/90 dark:text-amber-200/90">
                {formatCurrency(revenue.draft_invoices, currency)} not yet posted to the ledger.
              </p>
            </div>
          ) : null}

          {hasEstimates ? (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                Budget vs actual
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {estimates.estimated_revenue != null && (
                  <MetricTile
                    label="Est. revenue"
                    value={formatCurrency(estimates.estimated_revenue, currency)}
                    sub={
                      estimates.revenue_variance != null
                        ? `Variance ${formatCurrency(estimates.revenue_variance, currency)}`
                        : null
                    }
                  />
                )}
                {estimates.estimated_cost != null && (
                  <MetricTile
                    label="Est. cost"
                    value={formatCurrency(estimates.estimated_cost, currency)}
                    sub={
                      estimates.cost_variance != null
                        ? `Variance ${formatCurrency(estimates.cost_variance, currency)}`
                        : null
                    }
                  />
                )}
                {estimates.estimated_profit != null && (
                  <MetricTile
                    label="Est. profit"
                    value={formatCurrency(estimates.estimated_profit, currency)}
                  />
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {(counts.open_invoices > 0 || counts.unpaid_bills > 0) ? (
        <Card className="shadow-sm">
          <CardHeader className={panelHeaderClass}>
            <div className="space-y-1.5">
              <CardTitle className="text-base">Open items</CardTitle>
              <CardDescription>Tagged documents with outstanding balance.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className={cn(panelContentClass, 'flex flex-wrap gap-6 text-sm')}>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Open invoices</p>
              <p className="font-semibold tabular-nums mt-0.5">{counts.open_invoices ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Unpaid bills</p>
              <p className="font-semibold tabular-nums mt-0.5">{counts.unpaid_bills ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
