import { useCallback, useState } from 'react';
import { FileText, ShoppingCart, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const TAB_LINES = 'lines';
const TAB_SALES_ORDERS = 'sales_orders';

function orderLineCount(order) {
  return Array.isArray(order?.lines) ? order.lines.length : 0;
}

function orderRemainingQty(order) {
  if (!Array.isArray(order?.lines)) return 0;
  return order.lines.reduce((sum, line) => {
    const rem =
      typeof line.quantity_remaining === 'number'
        ? line.quantity_remaining
        : Math.max(
            0,
            (Number(line.quantity) || 0) - (Number(line.quantity_invoiced) || 0),
          );
    return sum + rem;
  }, 0);
}

/**
 * Source tabs above invoice line items — sales orders open in a picker dialog.
 */
export function InvoiceSalesOrderSourceBar({
  salesOrders = [],
  selectedSalesOrderId,
  onImportSalesOrder,
  onClearSalesOrder,
  disabled = false,
}) {
  const [activeTab, setActiveTab] = useState(TAB_LINES);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedOrder = salesOrders.find(
    (o) => String(o.id) === String(selectedSalesOrderId),
  );

  const openPicker = useCallback(() => {
    if (disabled || salesOrders.length === 0) return;
    setDialogOpen(true);
  }, [disabled, salesOrders.length]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    if (value === TAB_SALES_ORDERS) {
      openPicker();
    }
  };

  const handleSelectOrder = (orderId) => {
    onImportSalesOrder?.(orderId);
    setDialogOpen(false);
    setActiveTab(TAB_LINES);
  };

  const handleClear = () => {
    onClearSalesOrder?.();
    setActiveTab(TAB_LINES);
  };

  const handleDialogChange = (open) => {
    setDialogOpen(open);
    if (!open) {
      setActiveTab(TAB_LINES);
    }
  };

  if (!salesOrders.length) return null;

  return (
    <>
      <div className="border-b bg-muted/20 px-4 sm:px-5 py-3 space-y-2.5">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList variant="line" size="sm" className="w-full sm:w-auto">
            <TabsTrigger value={TAB_LINES} disabled={disabled}>
              <ShoppingCart className="size-3.5 mr-1.5 opacity-70" />
              Line items
            </TabsTrigger>
            <TabsTrigger value={TAB_SALES_ORDERS} disabled={disabled}>
              <FileText className="size-3.5 mr-1.5 opacity-70" />
              Sales orders
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] tabular-nums"
              >
                {salesOrders.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {selectedOrder ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
            <FileText className="size-4 text-primary shrink-0" />
            <span className="min-w-0">
              Lines from{' '}
              <span className="font-semibold text-foreground">{selectedOrder.so_number}</span>
              {selectedOrder.order_date ? (
                <span className="text-muted-foreground"> · {selectedOrder.order_date}</span>
              ) : null}
            </span>
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={openPicker}
                disabled={disabled}
              >
                Change
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleClear}
                disabled={disabled}
              >
                <X className="size-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Enter lines manually, or open{' '}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={openPicker}
              disabled={disabled}
            >
              Sales orders
            </button>{' '}
            to import open orders for this customer.
          </p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from sales order</DialogTitle>
            <DialogDescription>
              Choose an open sales order. Its remaining lines will replace the current line items
              table.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[min(60vh,420px)] overflow-y-auto space-y-2">
            {salesOrders.map((order) => {
              const lines = orderLineCount(order);
              const remaining = orderRemainingQty(order);
              const isSelected = String(order.id) === String(selectedSalesOrderId);

              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => handleSelectOrder(String(order.id))}
                  className={cn(
                    'w-full rounded-lg border px-3 py-3 text-left transition-colors',
                    'hover:border-primary hover:bg-primary/5',
                    isSelected && 'border-primary bg-primary/5 ring-1 ring-primary/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{order.so_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.order_date || '—'}
                        {order.status ? ` · ${order.status}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {lines} line{lines === 1 ? '' : 's'}
                        {remaining > 0 ? ` · ${remaining.toLocaleString()} qty remaining` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0">
                      {order.total_formatted || '—'}
                    </span>
                  </div>
                </button>
              );
            })}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
