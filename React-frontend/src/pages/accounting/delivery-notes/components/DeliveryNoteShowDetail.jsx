import { Link } from 'react-router';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MapPin,
  Package,
  Truck,
  Warehouse,
  XCircle,
} from 'lucide-react';
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
  computeDeliveryNoteStats,
  DELIVERY_NOTE_STATUSES,
  formatLineQty,
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
    primary: 'bg-sky-50/80 border-sky-200 dark:bg-sky-950/30',
    success: 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30',
    warning: 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30',
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
          <Badge variant="outline" className={cn('text-[10px] font-normal capitalize', meta)}>
            {meta}
          </Badge>
        ) : null}
        <ExternalLink className="size-3.5 opacity-60" />
      </span>
    </Link>
  );
}

export function DeliveryNoteShowDetail({ note, workspaceId }) {
  const salesOrderBase = `/workspace/${workspaceId}/accounting/sales-orders`;
  const customerBase = `/workspace/${workspaceId}/accounting/customers`;
  const deliveryBase = `/workspace/${workspaceId}/accounting/delivery-notes`;

  const status = note.status || 'draft';
  const statusLabel =
    DELIVERY_NOTE_STATUSES.find((s) => s.value === status)?.label || status;
  const lines = note.lines || [];
  const stats = computeDeliveryNoteStats(lines, status);
  const isDraft = status === 'draft';
  const isConfirmed = status === 'confirmed';
  const isCancelled = status === 'cancelled';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        {isDraft && (
          <Card className="border-amber-200/60 dark:border-amber-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <Truck className="size-4" />
                Draft — awaiting confirmation
              </CardTitle>
              <CardDescription>
                Confirm this delivery note to deduct inventory from{' '}
                <strong>{note.warehouse?.name || 'the warehouse'}</strong> and update delivered
                quantities on the linked sales order.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {isConfirmed && (
          <Card className="border-emerald-200/60 dark:border-emerald-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-4" />
                Delivery confirmed
              </CardTitle>
              <CardDescription>
                Stock has been posted{note.confirmed_at ? ` on ${note.confirmed_at}` : ''}. This
                shipment is locked for editing.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {isCancelled && (
          <Card className="border-gray-200/80 dark:border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                <XCircle className="size-4" />
                Delivery note cancelled
              </CardTitle>
              <CardDescription>
                This note was voided and did not affect inventory or sales order fulfilment.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {stats.linesWithOrder > 0 && !isCancelled && (
          <Card className="border-sky-200/60 dark:border-sky-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-4 text-sky-600" />
                Shipment summary
              </CardTitle>
              <CardDescription>
                Quantities on this delivery note compared to the sales order line totals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile
                  label="Line items"
                  value={stats.lineCount}
                  sub={`${stats.rowCount} row(s) on note`}
                />
                <StatTile
                  label="Units shipped"
                  value={formatLineQty(stats.totalOnNote)}
                  sub="This delivery"
                  variant="primary"
                />
                <StatTile
                  label="Order qty (lines)"
                  value={formatLineQty(stats.totalOrdered)}
                  sub="Linked to SO"
                  variant="muted"
                />
                <StatTile
                  label="SO lines complete"
                  value={
                    isConfirmed
                      ? `${stats.fullyShippedLines} / ${stats.linesWithOrder}`
                      : '—'
                  }
                  sub={isConfirmed ? 'After this delivery' : 'Confirm to update SO'}
                  variant={isConfirmed ? 'success' : 'muted'}
                />
              </div>
              {stats.totalOrdered > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">This shipment vs order (on linked lines)</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatLineQty(stats.totalOnNote)} / {formatLineQty(stats.totalOrdered)} (
                      {stats.coveragePercent.toFixed(0)}%)
                    </span>
                  </div>
                  <ProgressBar value={stats.coveragePercent} barClassName="bg-sky-500" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="print:shadow-none print:border">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 mb-1">
                  Delivery note
                </p>
                <CardTitle className="text-2xl font-mono">{note.dn_number}</CardTitle>
                <CardDescription className="mt-1">
                  {note.customer?.name || 'No customer'}
                  {note.customer?.email ? ` · ${note.customer.email}` : ''}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'capitalize text-sm px-2.5 py-0.5 self-start',
                  STATUS_COLORS[status] || STATUS_COLORS.draft
                )}
              >
                {statusLabel}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> Ship to
                </h3>
                {note.shipping_address ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {note.shipping_address}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Warehouse className="size-3.5" /> Ship from
                </h3>
                <p className="font-semibold">{note.warehouse?.name || 'Default warehouse'}</p>
                {note.warehouse?.code ? (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {note.warehouse.code}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="px-3 py-2.5 text-left font-medium w-10">#</th>
                    <th className="px-3 py-2.5 text-left font-medium min-w-[160px]">Item</th>
                    <th className="px-3 py-2.5 text-left font-medium w-24">SKU</th>
                    <th className="px-3 py-2.5 text-right font-medium w-20">Ordered</th>
                    <th className="px-3 py-2.5 text-right font-medium w-24">On SO (del.)</th>
                    <th className="px-3 py-2.5 text-right font-medium w-24">This shipment</th>
                    <th className="px-3 py-2.5 text-right font-medium w-24">SO remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        No line items.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, i) => {
                      const ordered = Number(line.order_quantity);
                      const onNote = Number(line.quantity_delivered) || 0;
                      const soDelivered = Number(line.order_line_delivered);
                      const soRemaining = Number(line.order_line_remaining);
                      const hasOrder = Number.isFinite(ordered) && ordered > 0;
                      const linePct = hasOrder
                        ? Math.min(100, (onNote / ordered) * 100)
                        : 0;

                      return (
                        <tr key={line.id || i} className="border-b last:border-0">
                          <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{line.description}</p>
                            {line.product_name && line.product_name !== line.description ? (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {line.product_name}
                              </p>
                            ) : null}
                            {hasOrder && onNote > 0 ? (
                              <div className="mt-2 max-w-[140px]">
                                <ProgressBar
                                  value={linePct}
                                  barClassName="bg-sky-500 h-1"
                                  className="h-1"
                                />
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                            {line.product_sku || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                            {hasOrder ? formatLineQty(ordered) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {Number.isFinite(soDelivered) ? (
                              <span
                                className={cn(
                                  isConfirmed && soDelivered >= ordered - 0.00001
                                    ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {formatLineQty(soDelivered)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-sky-700 dark:text-sky-400">
                            {formatLineQty(onNote)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {Number.isFinite(soRemaining) ? (
                              soRemaining > 0.00001 ? (
                                <span className="font-medium text-amber-700 dark:text-amber-400">
                                  {formatLineQty(soRemaining)}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">—</span>
                              )
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {lines.length > 0 && (
                  <tfoot>
                    <tr className="border-t bg-muted/50">
                      <td
                        colSpan={5}
                        className="px-3 py-3 text-right font-semibold text-muted-foreground"
                      >
                        Total units this shipment
                      </td>
                      <td className="px-3 py-3 text-right text-lg font-bold text-sky-700 dark:text-sky-400 tabular-nums">
                        {formatLineQty(stats.totalOnNote)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {isDraft && stats.lineCount === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 flex items-start gap-2 text-sm text-amber-950">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>No quantities to deliver on this note. Edit or recreate from the sales order.</span>
              </div>
            )}

            {note.notes ? (
              <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {note.notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 print:hidden">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Shipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Units"
                value={formatLineQty(stats.totalOnNote)}
                sub="This note"
                variant="primary"
              />
              <StatTile label="Products" value={stats.lineCount} sub="With quantity" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Delivery date</span>
              <span className="font-medium tabular-nums">
                {note.delivery_date_display || note.delivery_date || '—'}
              </span>
            </div>
            {note.confirmed_at && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Confirmed</span>
                <span className="font-medium">{note.confirmed_at}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Warehouse</span>
              <span className="font-medium text-right">{note.warehouse?.name || '—'}</span>
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
            {note.created_at && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{note.created_at}</span>
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
            {note.sales_order?.id ? (
              <RelatedLink
                to={`${salesOrderBase}/${note.sales_order.id}`}
                label={note.sales_order.so_number || `SO-${note.sales_order.id}`}
                meta={note.sales_order.status}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No sales order linked.
              </p>
            )}
            {note.sales_order?.id && isDraft && (
              <Link
                to={`${deliveryBase}/create?from_sales_order=${note.sales_order.id}`}
                className="inline-flex text-xs font-medium text-primary hover:text-primary/80"
              >
                Create another delivery from SO →
              </Link>
            )}
          </CardContent>
        </Card>

        {note.customer?.id && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                to={`${customerBase}/${note.customer.id}`}
                className="font-medium hover:text-primary"
              >
                {note.customer.name}
              </Link>
              {note.customer.email && (
                <p className="text-muted-foreground">{note.customer.email}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
