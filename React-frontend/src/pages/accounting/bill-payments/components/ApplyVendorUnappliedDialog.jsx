import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { billPaymentsApi } from '../api/bill-payments.api';
import { formatCurrency } from '../constants';

export function ApplyVendorUnappliedDialog({
  open,
  paymentId,
  onOpenChange,
  onApplied,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState(null);
  const [amounts, setAmounts] = useState({});

  useEffect(() => {
    if (!open || !paymentId) return;
    let cancelled = false;
    setLoading(true);
    setMeta(null);
    setAmounts({});
    billPaymentsApi
      .applyUnappliedModal(paymentId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || null;
        setMeta(data);
        const next = {};
        (data?.bills || []).forEach((bill) => {
          next[bill.id] = '';
        });
        setAmounts(next);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.response?.data?.message || 'Could not load on-account cash');
        onOpenChange?.(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, paymentId, onOpenChange]);

  const appliedTotal = useMemo(
    () =>
      Object.values(amounts).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [amounts],
  );

  const remaining = Math.max(0, Number(meta?.unapplied_amount || 0) - appliedTotal);

  const autoFill = () => {
    if (!meta?.bills?.length) return;
    let left = Number(meta.unapplied_amount) || 0;
    const next = {};
    meta.bills.forEach((bill) => {
      const take = Math.min(left, Number(bill.balance_due) || 0);
      next[bill.id] = take > 0 ? String(Number(take.toFixed(2))) : '';
      left = Math.max(0, left - take);
    });
    setAmounts(next);
  };

  const handleSave = async () => {
    const allocations = Object.entries(amounts)
      .map(([billId, amount]) => ({
        bill_id: Number(billId),
        amount: Number(amount) || 0,
      }))
      .filter((row) => row.amount > 0);

    if (!allocations.length) {
      toast.error('Enter at least one amount to apply');
      return;
    }
    if (appliedTotal - (Number(meta?.unapplied_amount) || 0) > 0.02) {
      toast.error('Applied total cannot exceed on-account cash');
      return;
    }

    setSaving(true);
    try {
      const res = await billPaymentsApi.applyUnapplied(paymentId, { allocations });
      toast.success(res.data?.message || 'On-account cash applied to bill(s)');
      onApplied?.(res.data?.data);
      onOpenChange?.(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not apply on-account cash');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-base">
            Apply on-account cash
            {meta?.payment_label ? ` · ${meta.payment_label}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-sm">
                <p className="font-semibold text-amber-900">
                  Available{' '}
                  {formatCurrency(meta?.unapplied_amount, meta?.currency)}
                </p>
                <p className="mt-0.5 text-xs text-amber-800/80">
                  This cash was already paid to the vendor. Applying it here reduces
                  open bills without a new bank payment.
                </p>
              </div>

              {!meta?.bills?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No open bills available for this vendor.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Open bills
                    </p>
                    <Button type="button" variant="outline" size="sm" className="h-7" onClick={autoFill}>
                      Auto-fill
                    </Button>
                  </div>
                  <div className="rounded-lg border divide-y max-h-72 overflow-y-auto">
                    {meta.bills.map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{bill.bill_number}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {bill.due_date_display} · Balance{' '}
                            {formatCurrency(bill.balance_due, bill.currency || meta.currency)}
                          </p>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={bill.balance_due}
                          className="h-8 w-28 text-right tabular-nums"
                          value={amounts[bill.id] ?? ''}
                          onChange={(e) =>
                            setAmounts((current) => ({
                              ...current,
                              [bill.id]: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Applying {formatCurrency(appliedTotal, meta.currency)}</span>
                    <span>Still on account {formatCurrency(remaining, meta.currency)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || !meta?.bills?.length || appliedTotal <= 0}
          >
            {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
            Apply to bills
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
