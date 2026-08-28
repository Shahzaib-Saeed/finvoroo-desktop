import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { productionOrdersApi } from '../api/production-orders.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function CompleteProductionDialog({ orderId, orderQty, open, onOpenChange, onSuccess }) {
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const payload = {};
      const parsed = parseInt(qty, 10);
      if (qty.trim() && Number.isFinite(parsed) && parsed >= 1) {
        payload.quantity = parsed;
      }
      const res = await productionOrdersApi.complete(orderId, payload);
      toast.success(res.data?.message || 'Production completed');
      onOpenChange(false);
      setQty('');
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not complete production');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete production</DialogTitle>
          <DialogDescription>
            This deducts raw materials from inventory, adds finished goods, and posts accounting
            entries.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="complete-qty">Quantity to complete (optional)</Label>
          <Input
            id="complete-qty"
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={`${Number(orderQty || 0).toLocaleString()} (full order)`}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to complete the full remaining quantity.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
