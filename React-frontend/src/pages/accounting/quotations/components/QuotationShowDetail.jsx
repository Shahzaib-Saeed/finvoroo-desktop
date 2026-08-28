import { Link } from 'react-router';
import { AlertTriangle, CheckCircle2, ClipboardList, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatLineQty,
  QUOTATION_STATUSES,
  STATUS_COLORS,
} from '../constants';
function StatTile({ label, value, sub, variant = 'default' }) {
  const variants = {
    default: 'bg-muted/40 border-border',
    primary: 'bg-primary/5 border-primary/20',
    warning: 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30',
    success: 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30',
    muted: 'bg-muted/30 border-transparent',
  };
  return (
    <div className={cn('rounded-lg border px-3 py-2.5', variants[variant])}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums mt-0.5">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground mt-0.5">{sub}</p> : null}
    </div>
  );
}

function RelatedLink({ to, label, meta }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors group"
    >
      <span className="font-medium group-hover:text-primary">{label}</span>
      <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        {meta ? (
          <Badge variant="outline" className="text-[10px] font-normal capitalize">
            {meta}
          </Badge>
        ) : null}
        <ExternalLink className="size-3.5 opacity-60" />
      </span>
    </Link>
  );
}

function isExpiryPast(expiryDate) {
  if (!expiryDate) return false;
  const d = new Date(expiryDate);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function QuotationShowDetail({ quotation, workspaceId }) {
  const base = `/workspace/${workspaceId}/accounting/quotations`;
  const salesOrderBase = `/workspace/${workspaceId}/accounting/sales-orders`;
  const customerBase = `/workspace/${workspaceId}/accounting/customers`;

  const currency = quotation.currency || 'USD';
  const status = quotation.status || 'draft';
  const statusLabel =
    QUOTATION_STATUSES.find((s) => s.value === status)?.label || status;
  const lines = quotation.lines || [];
  const linkedSalesOrder = quotation.sales_order;
  const isConverted = status === 'converted' || !!linkedSalesOrder?.id;
  const isExpired = status === 'expired' || (status !== 'converted' && isExpiryPast(quotation.expiry_date));
  const isAccepted = status === 'accepted';
  const lineCount = lines.length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        {isConverted && linkedSalesOrder && (
          <Card className="border-violet-200/60 dark:border-violet-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="size-4 text-violet-600" />
                Converted to sales order
              </CardTitle>
              <CardDescription>
                This quotation was accepted and linked to a sales order. Further edits are locked.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelatedLink
                to={`${salesOrderBase}/${linkedSalesOrder.id}`}
                label={linkedSalesOrder.so_number || `SO-${linkedSalesOrder.id}`}
                meta={linkedSalesOrder.status}
              />
            </CardContent>
          </Card>
        )}

        {isExpired && !isConverted && status !== 'cancelled' && (
          <Card className="border-amber-200/60 dark:border-amber-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-4" />
                Quotation expired
              </CardTitle>
              <CardDescription>
                The expiry date has passed. Update the quote or create a new quotation for the customer.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {isAccepted && !isConverted && (
          <Card className="border-emerald-200/60 dark:border-emerald-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-4" />
                Accepted by customer
              </CardTitle>
              <CardDescription>
                Ready to convert — use Create sales order in the toolbar to start fulfilment.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card className="print:shadow-none print:border">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                  Quotation
                </p>
                <CardTitle className="text-2xl">{quotation.quote_number}</CardTitle>
                <CardDescription className="mt-1">
                  {quotation.customer?.name || 'No customer'}
                  {quotation.customer?.email ? ` · ${quotation.customer.email}` : ''}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge
                  variant="outline"
                  className={cn('capitalize text-sm px-2.5 py-0.5', STATUS_COLORS[status])}
                >
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Bill to
                </h3>
                {quotation.customer?.id ? (
                  <Link
                    to={`${customerBase}/${quotation.customer.id}`}
                    className="font-semibold hover:text-primary"
                  >
                    {quotation.customer.name}
                  </Link>
                ) : (
                  <p className="font-semibold">—</p>
                )}
                {quotation.billing_address ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-line mt-1.5 leading-relaxed">
                    {quotation.billing_address}
                  </p>
                ) : null}
              </div>
              {quotation.shipping_address ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Ship to
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {quotation.shipping_address}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="px-3 py-2.5 text-left font-medium w-10">#</th>
                    <th className="px-3 py-2.5 text-left font-medium min-w-[180px]">Item</th>
                    <th className="px-3 py-2.5 text-center font-medium w-16">Qty</th>
                    <th className="px-3 py-2.5 text-right font-medium w-24">Unit price</th>
                    <th className="px-3 py-2.5 text-right font-medium w-28">Tax</th>
                    <th className="px-3 py-2.5 text-right font-medium w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineCount === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        No line items.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, i) => (
                      <tr key={line.id || i} className="border-b last:border-0">
                        <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{line.description}</p>
                          {(line.product?.name || line.product_name) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {line.product?.name || line.product_name}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums font-medium">
                          {formatLineQty(line.quantity)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatCurrency(line.unit_price, currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                          {line.tax_rate ? (
                            <>
                              <span className="block">
                                {line.tax_rate.name} ({line.tax_rate.rate}%)
                              </span>
                              {Number(line.tax_amount) > 0 && (
                                <span className="block tabular-nums mt-0.5">
                                  {formatCurrency(line.tax_amount, currency)}
                                </span>
                              )}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                          {formatCurrency(line.amount, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={5} className="px-3 py-2 text-right text-muted-foreground">
                      Subtotal
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {formatCurrency(quotation.subtotal, currency)}
                    </td>
                  </tr>
                  {Number(quotation.invoice_discount) > 0 && (
                    <tr className="border-t">
                      <td colSpan={5} className="px-3 py-2 text-right text-muted-foreground">
                        Discount
                      </td>
                      <td className="px-3 py-2 text-right text-destructive tabular-nums">
                        − {formatCurrency(quotation.invoice_discount, currency)}
                      </td>
                    </tr>
                  )}
                  {Number(quotation.tax_amount) > 0 && (
                    <tr className="border-t">
                      <td colSpan={5} className="px-3 py-2 text-right text-muted-foreground">
                        Tax
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(quotation.tax_amount, currency)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t bg-muted/50">
                    <td colSpan={5} className="px-3 py-3 text-right font-semibold">
                      Total
                    </td>
                    <td className="px-3 py-3 text-right text-lg font-bold text-primary tabular-nums">
                      {formatCurrency(quotation.total, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {quotation.notes ? (
              <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {quotation.notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 print:hidden">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Line items" value={lineCount} />
              <StatTile
                label="Total"
                value={formatCurrency(quotation.total, currency)}
                sub={currency}
                variant="primary"
              />
              <StatTile
                label="Subtotal"
                value={formatCurrency(quotation.subtotal, currency)}
                variant="muted"
              />
              {Number(quotation.tax_amount) > 0 && (
                <StatTile
                  label="Tax"
                  value={formatCurrency(quotation.tax_amount, currency)}
                  variant="muted"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Quote date</span>
              <span className="font-medium tabular-nums">
                {quotation.quote_date_display || quotation.quote_date || '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Expiry date</span>
              <span
                className={cn(
                  'font-medium tabular-nums',
                  isExpired && !isConverted && 'text-amber-700 dark:text-amber-400'
                )}
              >
                {quotation.expiry_date_display || quotation.expiry_date || '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium">{currency}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant="outline"
                className={cn('capitalize text-xs', STATUS_COLORS[status])}
              >
                {statusLabel}
              </Badge>
            </div>
            {quotation.created_at && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{quotation.created_at}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <ClipboardList className="size-4" />
              Related documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedSalesOrder?.id ? (
              <RelatedLink
                to={`${salesOrderBase}/${linkedSalesOrder.id}`}
                label={linkedSalesOrder.so_number || `SO-${linkedSalesOrder.id}`}
                meta={linkedSalesOrder.status}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No sales order linked yet. Convert this quotation when the customer accepts.
              </p>
            )}
          </CardContent>
        </Card>

        {quotation.customer?.id && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                to={`${customerBase}/${quotation.customer.id}`}
                className="font-medium hover:text-primary"
              >
                {quotation.customer.name}
              </Link>
              {quotation.customer.email && (
                <p className="text-muted-foreground">{quotation.customer.email}</p>
              )}
              <ButtonLink
                to={`${base}?search=${encodeURIComponent(quotation.customer.name || '')}`}
                label="View customer quotations"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ButtonLink({ to, label }) {
  return (
    <Link
      to={to}
      className="inline-flex text-xs font-medium text-primary hover:text-primary/80 mt-1"
    >
      {label} →
    </Link>
  );
}
