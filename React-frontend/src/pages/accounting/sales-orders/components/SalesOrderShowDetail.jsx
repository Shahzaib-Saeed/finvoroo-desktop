import { Link } from 'react-router';
import { ExternalLink, Package, Receipt, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  computeSalesOrderFulfilment,
  DN_STATUS_COLORS,
  formatCurrency,
  formatLineQty,
  SALES_ORDER_STATUSES,
  STATUS_COLORS,
} from '../constants';

function ProgressBar({ value, className, barClassName }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className={cn('h-2 w-full rounded-full bg-muted overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatTile({ label, value, sub, variant = 'default' }) {
  const variants = {
    default: 'bg-muted/40 border-border',
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

export function SalesOrderShowDetail({
  salesOrder,
  workspaceId,
  salesOrderId,
  canCreateDelivery,
}) {
  const base = `/workspace/${workspaceId}/accounting/sales-orders`;
  const invoiceBase = `/workspace/${workspaceId}/accounting/invoices`;
  const quotationBase = `/workspace/${workspaceId}/accounting/quotations`;
  const deliveryBase = `/workspace/${workspaceId}/accounting/delivery-notes`;
  const jobBase = `/workspace/${workspaceId}/accounting/job-orders`;
  const productionBase = `/workspace/${workspaceId}/accounting/production-orders`;

  const currency = salesOrder.currency || 'USD';
  const status = salesOrder.status || 'draft';
  const statusLabel =
    SALES_ORDER_STATUSES.find((s) => s.value === status)?.label || status;
  const fulfilment = computeSalesOrderFulfilment(
    salesOrder.lines,
    salesOrder.fulfilment
  );
  const deliveryNotes = salesOrder.delivery_notes || [];
  const productionOrders = salesOrder.production_orders || [];

  const showFulfilmentPanel =
    status !== 'cancelled' &&
    (fulfilment.total_ordered > 0 ||
      fulfilment.is_partial_delivery ||
      fulfilment.is_partial_invoice ||
      status === 'partial');

  const cardHeaderTight =
    'min-h-0 items-start border-0 py-4 px-5 max-sm:px-4';
  const cardContentTight = 'px-5 pb-5 max-sm:px-4';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-4">
        {showFulfilmentPanel && (
          <Card className="border-amber-200/60 dark:border-amber-900/40">
            <CardHeader className={cn(cardHeaderTight, 'pb-2')}>
              <div className="flex flex-wrap items-start justify-between gap-3 w-full">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="size-4 text-amber-600" />
                    Fulfilment summary
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {status === 'partial'
                      ? 'This order is partially fulfilled — quantities below show what is done and what is still outstanding.'
                      : 'Delivery and invoicing progress across all line items.'}
                  </CardDescription>
                </div>
                {canCreateDelivery && fulfilment.total_remaining_delivery > 0.00001 && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`${deliveryBase}/create?from_sales_order=${salesOrderId}`}>
                      <Truck className="size-4 mr-1" />
                      Deliver remaining
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className={cn(cardContentTight, 'pt-0 space-y-5')}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile
                  label="Ordered"
                  value={formatLineQty(fulfilment.total_ordered)}
                  sub="Total units"
                />
                <StatTile
                  label="Delivered"
                  value={formatLineQty(fulfilment.total_delivered)}
                  sub={
                    fulfilment.is_fully_delivered
                      ? 'Fully delivered'
                      : `${formatLineQty(fulfilment.total_remaining_delivery)} remaining`
                  }
                  variant={fulfilment.is_fully_delivered ? 'success' : 'warning'}
                />
                <StatTile
                  label="Invoiced"
                  value={formatLineQty(fulfilment.total_invoiced)}
                  sub={
                    fulfilment.is_fully_invoiced
                      ? 'Fully invoiced'
                      : `${formatLineQty(fulfilment.total_remaining_invoice)} not invoiced`
                  }
                  variant={fulfilment.is_fully_invoiced ? 'success' : 'muted'}
                />
                <StatTile
                  label="Order total"
                  value={formatCurrency(salesOrder.total, currency)}
                  sub={currency}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-1.5">
                      <Truck className="size-3.5 text-muted-foreground" />
                      Delivery
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatLineQty(fulfilment.total_delivered)} /{' '}
                      {formatLineQty(fulfilment.total_ordered)} (
                      {Number(fulfilment.delivery_percent || 0).toFixed(0)}%)
                    </span>
                  </div>
                  <ProgressBar
                    value={fulfilment.delivery_percent}
                    barClassName="bg-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-1.5">
                      <Receipt className="size-3.5 text-muted-foreground" />
                      Invoiced
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatLineQty(fulfilment.total_invoiced)} /{' '}
                      {formatLineQty(fulfilment.total_ordered)} (
                      {Number(fulfilment.invoice_percent || 0).toFixed(0)}%)
                    </span>
                  </div>
                  <ProgressBar
                    value={fulfilment.invoice_percent}
                    barClassName="bg-blue-500"
                  />
                </div>
              </div>

              {fulfilment.lines?.some((l) => l.remainingDelivery > 0.00001) && (
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Lines awaiting delivery
                  </p>
                  <ul className="space-y-1.5">
                    {fulfilment.lines
                      .filter((l) => l.remainingDelivery > 0.00001)
                      .map((l) => (
                        <li
                          key={l.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span className="min-w-0 truncate font-medium">
                            {l.description || l.product_name || 'Line'}
                          </span>
                          <span className="tabular-nums text-amber-700 dark:text-amber-400 shrink-0">
                            {formatLineQty(l.remainingDelivery)} of {formatLineQty(l.qty)}{' '}
                            remaining
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="print:shadow-none print:border">
          <CardHeader className={cn(cardHeaderTight, 'border-b border-border pb-4')}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 w-full">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                  Sales order
                </p>
                <CardTitle className="text-2xl">{salesOrder.so_number}</CardTitle>
                <CardDescription className="mt-1">
                  {salesOrder.customer?.name || 'No customer'}
                  {salesOrder.customer?.email ? ` · ${salesOrder.customer.email}` : ''}
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

          <CardContent className={cn(cardContentTight, 'pt-5 space-y-6')}>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Bill to
                </h3>
                <p className="font-semibold">{salesOrder.customer?.name || '—'}</p>
                {salesOrder.billing_address ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-line mt-1.5 leading-relaxed">
                    {salesOrder.billing_address}
                  </p>
                ) : null}
              </div>
              {salesOrder.shipping_address ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Ship to
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {salesOrder.shipping_address}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="px-3 py-2.5 text-left font-medium w-10">#</th>
                    <th className="px-3 py-2.5 text-left font-medium min-w-[180px]">
                      Item
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium w-16">Qty</th>
                    <th className="px-3 py-2.5 text-center font-medium w-20">Delivered</th>
                    <th className="px-3 py-2.5 text-center font-medium w-20">Remaining</th>
                    <th className="px-3 py-2.5 text-center font-medium w-20">Invoiced</th>
                    <th className="px-3 py-2.5 text-right font-medium w-24">Unit price</th>
                    <th className="px-3 py-2.5 text-right font-medium w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(salesOrder.lines || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        No line items.
                      </td>
                    </tr>
                  ) : (
                    salesOrder.lines.map((line, i) => {
                      const qty = Number(line.quantity) || 0;
                      const delivered = Number(line.quantity_delivered) || 0;
                      const invoiced = Number(line.quantity_invoiced) || 0;
                      const remaining =
                        line.quantity_remaining ?? Math.max(0, qty - delivered);
                      const lineFulfil = fulfilment.lines?.find((l) => l.id === line.id);
                      const isPartialLine =
                        remaining > 0.00001 && delivered > 0.00001;

                      return (
                        <tr
                          key={line.id || i}
                          className={cn(
                            'border-b last:border-0',
                            isPartialLine && 'bg-amber-50/50 dark:bg-amber-950/20'
                          )}
                        >
                          <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{line.description}</p>
                            {(line.product_name || line.product?.name) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {line.product_name || line.product?.name}
                                {line.product_sku ? ` · ${line.product_sku}` : ''}
                              </p>
                            )}
                            {isPartialLine && lineFulfil ? (
                              <div className="mt-2 max-w-[200px]">
                                <ProgressBar
                                  value={lineFulfil.deliveryPercent}
                                  barClassName="bg-amber-500 h-1"
                                  className="h-1"
                                />
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums font-medium">
                            {formatLineQty(qty)}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums">
                            <span
                              className={cn(
                                delivered >= qty - 0.00001 && qty > 0
                                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                  : delivered > 0
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-muted-foreground'
                              )}
                            >
                              {formatLineQty(delivered)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums">
                            {remaining > 0.00001 ? (
                              <span className="font-medium text-amber-700 dark:text-amber-400">
                                {formatLineQty(remaining)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">
                            {formatLineQty(invoiced)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatCurrency(line.unit_price, currency)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                            {formatCurrency(line.amount, currency)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={7} className="px-3 py-2 text-right text-muted-foreground">
                      Subtotal
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {formatCurrency(salesOrder.subtotal, currency)}
                    </td>
                  </tr>
                  {Number(salesOrder.invoice_discount) > 0 && (
                    <tr className="border-t">
                      <td colSpan={7} className="px-3 py-2 text-right text-muted-foreground">
                        Discount
                      </td>
                      <td className="px-3 py-2 text-right text-destructive tabular-nums">
                        − {formatCurrency(salesOrder.invoice_discount, currency)}
                      </td>
                    </tr>
                  )}
                  {Number(salesOrder.tax_amount) > 0 && (
                    <tr className="border-t">
                      <td colSpan={7} className="px-3 py-2 text-right text-muted-foreground">
                        Tax
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(salesOrder.tax_amount, currency)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t bg-muted/50">
                    <td colSpan={7} className="px-3 py-3 text-right font-semibold">
                      Total
                    </td>
                    <td className="px-3 py-3 text-right text-lg font-bold text-primary tabular-nums">
                      {formatCurrency(salesOrder.total, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {salesOrder.notes ? (
              <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {salesOrder.notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 print:hidden">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Order date</span>
              <span className="font-medium tabular-nums">
                {salesOrder.order_date_display || salesOrder.order_date || '—'}
              </span>
            </div>
            {(salesOrder.ship_date_display || salesOrder.ship_date) && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Ship date</span>
                <span className="font-medium tabular-nums">
                  {salesOrder.ship_date_display || salesOrder.ship_date}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium">{currency}</span>
            </div>
            {salesOrder.created_at && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{salesOrder.created_at}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Related documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {salesOrder.quotation?.id ? (
              <RelatedLink
                to={`${quotationBase}/${salesOrder.quotation.id}`}
                label={salesOrder.quotation.quote_number || `QT-${salesOrder.quotation.id}`}
                meta={salesOrder.quotation.status}
              />
            ) : null}
            {salesOrder.invoice?.id ? (
              <RelatedLink
                to={`${invoiceBase}/${salesOrder.invoice.id}`}
                label={salesOrder.invoice.invoice_number}
                meta={salesOrder.invoice.status}
              />
            ) : null}
            {salesOrder.job_order?.id ? (
              <RelatedLink
                to={`${jobBase}/${salesOrder.job_order.id}`}
                label={salesOrder.job_order.job_number || `JO-${salesOrder.job_order.id}`}
                meta={salesOrder.job_order.status}
              />
            ) : null}
            {productionOrders.map((po) => (
              <RelatedLink
                key={po.id}
                to={`${productionBase}/${po.id}`}
                label={po.po_number || `MO-${po.id}`}
                meta={po.status}
              />
            ))}
            {!salesOrder.quotation?.id &&
              !salesOrder.invoice?.id &&
              !salesOrder.job_order?.id &&
              productionOrders.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No linked documents yet.</p>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Truck className="size-4" />
                Delivery notes
              </CardTitle>
              {canCreateDelivery && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                  <Link to={`${deliveryBase}/create?from_sales_order=${salesOrderId}`}>
                    + New
                  </Link>
                </Button>
              )}
            </div>
            <CardDescription>
              {deliveryNotes.length === 0
                ? 'No deliveries recorded for this order.'
                : `${deliveryNotes.length} delivery note(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {deliveryNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a delivery note to ship stock against this sales order.
              </p>
            ) : (
              deliveryNotes.map((dn) => (
                <Link
                  key={dn.id}
                  to={`${deliveryBase}/${dn.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{dn.dn_number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dn.delivery_date_display || dn.delivery_date || '—'}
                      {dn.quantity_delivered > 0
                        ? ` · ${formatLineQty(dn.quantity_delivered)} units`
                        : ''}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize shrink-0 text-[10px]',
                      DN_STATUS_COLORS[dn.status] || ''
                    )}
                  >
                    {dn.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
