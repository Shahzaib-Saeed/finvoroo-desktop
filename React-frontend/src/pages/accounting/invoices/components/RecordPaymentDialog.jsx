import { useState } from 'react';
import { useParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { isOnline } from '@/offline/connectivity';
import { getMeta } from '@/offline/db';
import { enqueueOutbox } from '@/offline/outbox';
import { newUuid } from '@/offline/uuid';
import { runSyncCycle } from '@/offline/sync-manager';
import { invoicesApi } from '../api/invoices.api';
import { formatCurrency } from '../constants';

export function RecordPaymentDialog({ invoice, open, onOpenChange, onRecorded }) {
  const { id: companyId } = useParams();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    payment_method: '',
    reference: '',
    memo: '',
  });

  const maxAmount = Number(invoice?.balance_due) || 0;
  const currency = invoice?.currency || 'USD';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (amount > maxAmount) {
      toast.error(`Amount cannot exceed balance due (${formatCurrency(maxAmount, currency)})`);
      return;
    }

    setSaving(true);
    try {
      const offlineSyncEnabled = companyId
        ? Boolean(await getMeta(companyId, 'offline_sync_enabled', false))
        : false;

      if (offlineSyncEnabled && !isOnline()) {
        // Payment capture needs a real, already-synced invoice to attach to —
        // an invoice that's itself still an unsynced local draft has no
        // server id yet, so there's nothing to record the payment against
        // until that invoice syncs first.
        if (!invoice?.id) {
          toast.error("This invoice hasn't synced yet — connect to record a payment on it.");
          return;
        }
        await enqueueOutbox(companyId, {
          entity: 'payment',
          op: 'create',
          uuid: newUuid(),
          payload: { ...form, invoice_id: invoice.id, amount, currency },
        });
        toast.success('Payment saved offline — will sync when you reconnect');
        onOpenChange(false);
        onRecorded?.();
        return;
      }

      const res = await invoicesApi.recordPayment(invoice.id, {
        ...form,
        amount,
        currency,
      });
      toast.success(res?.data?.message || 'Payment recorded');
      onOpenChange(false);
      onRecorded?.();
      if (offlineSyncEnabled) {
        runSyncCycle(companyId, { reason: 'after-online-save' }).catch(() => {});
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Invoice {invoice?.invoice_number} — balance due{' '}
            <strong>{formatCurrency(maxAmount, currency)}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Payment date</Label>
            <Input
              type="date"
              required
              value={form.payment_date}
              onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input
              type="number"
              min={0.01}
              max={maxAmount}
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder={String(maxAmount)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Input
              value={form.payment_method}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
              placeholder="Cash, bank transfer…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reference</Label>
            <Input
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
