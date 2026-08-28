import { Link } from "react-router";
import { CreditCard, FileText, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "../constants";
import { getPaymentDisplayReference } from "../payment-reference";

function statusBadge(status) {
  const s = (status || "draft").toLowerCase();
  const map = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    cancelled: "bg-gray-100 text-gray-500 border-gray-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <Badge
      variant="outline"
      className={`capitalize text-[10px] ${map[s] || ""}`}
    >
      {status || "—"}
    </Badge>
  );
}

export function CustomerDetailsRecentList({
  title,
  icon: Icon,
  rows = [],
  emptyMessage,
  viewAllHref,
  onViewAll,
  renderPrimary,
  renderSecondary,
  renderAmount,
  getHref,
}) {
  return (
    <Card className="bg-accent/70 rounded-md shadow-none h-full overflow-hidden">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="flex items-center justify-between pt-3.5 pb-2.5 px-3.5">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            {Icon ? <Icon className="size-4 text-primary" /> : null}
            {title}
          </h3>
          {viewAllHref ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to={viewAllHref}>View all</Link>
            </Button>
          ) : onViewAll ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onViewAll}
            >
              View all
            </Button>
          ) : null}
        </div>
        <div className="bg-background rounded-md mx-1 mb-1 mt-0 border border-border pt-4 pb-4 px-3.5 flex-1">
          {!rows.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {emptyMessage}
            </p>
          ) : (
            <div className="space-y-0">
              {rows.map((row, index) => (
                <div key={row.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={getHref(row)}
                        className="text-sm font-medium text-foreground hover:text-primary block truncate"
                      >
                        {renderPrimary(row)}
                      </Link>
                      {renderSecondary ? (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {renderSecondary(row)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {renderAmount ? (
                        <span className="text-sm font-medium tabular-nums">
                          {renderAmount(row)}
                        </span>
                      ) : null}
                      {row.status != null ? statusBadge(row.status) : null}
                    </div>
                  </div>
                  {index < rows.length - 1 ? (
                    <Separator className="my-3.5" />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerDetailsRecentOrders({
  orders,
  workspaceId,
  tabLink,
  onViewAll,
}) {
  const recent = orders.slice(0, 5);
  const base = `/workspace/${workspaceId}/accounting/sales-orders`;

  return (
    <CustomerDetailsRecentList
      title="Recent Orders"
      icon={ShoppingCart}
      rows={recent}
      emptyMessage="No sales orders yet."
      viewAllHref={tabLink}
      onViewAll={onViewAll}
      getHref={(row) => `${base}/${row.id}`}
      renderPrimary={(row) => row.so_number || `SO-${row.id}`}
      renderSecondary={(row) => row.order_date_display || row.order_date || "—"}
      renderAmount={(row) => formatMoney(row.total, row.currency)}
    />
  );
}

export function CustomerDetailsRecentReceipts({
  payments,
  workspaceId,
  tabLink,
  onViewAll,
}) {
  const recent = payments.slice(0, 5);
  const base = `/workspace/${workspaceId}/accounting/payments`;

  return (
    <CustomerDetailsRecentList
      title="Recent Receipts"
      icon={CreditCard}
      rows={recent}
      emptyMessage="No receipts recorded yet."
      viewAllHref={tabLink}
      onViewAll={onViewAll}
      getHref={() => base}
      renderPrimary={(row) => getPaymentDisplayReference(row)}
      renderSecondary={(row) =>
        row.payment_date_display || row.payment_date || "—"
      }
      renderAmount={(row) => formatMoney(row.amount, row.currency)}
    />
  );
}

export function CustomerDetailsRecentInvoices({
  invoices,
  workspaceId,
  tabLink,
}) {
  const recent = invoices.slice(0, 3);
  const base = `/workspace/${workspaceId}/accounting/invoices`;

  return (
    <CustomerDetailsRecentList
      title="Recent Invoices"
      icon={FileText}
      rows={recent}
      emptyMessage="No invoices yet."
      viewAllHref={tabLink}
      getHref={(row) => `${base}/${row.id}`}
      renderPrimary={(row) => row.invoice_number || '—'}
      renderSecondary={(row) =>
        row.invoice_date_display || row.invoice_date || "—"
      }
      renderAmount={(row) => formatMoney(row.total, row.currency)}
    />
  );
}
