import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '../constants';

export function LoadFromPoDialog({ open, onOpenChange, orders, currency, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Load from purchase order</DialogTitle>
        </DialogHeader>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No open purchase orders for this vendor.
          </p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {orders.map((po) => (
              <li key={po.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-auto py-3"
                  onClick={() => {
                    onSelect(po);
                    onOpenChange(false);
                  }}
                >
                  <span className="text-left">
                    <span className="font-medium block">{po.po_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {po.order_date_display || po.order_date} · {po.status}
                    </span>
                  </span>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(po.total, currency)}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
