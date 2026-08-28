import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { creditNotesApi } from '../api/credit-notes.api';
import { formatCurrency } from '../constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { LIFECYCLE_COLORS } from '../constants';

export function ManageCreditNoteDialog({ open, onOpenChange, creditNoteId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [applyInvoiceId, setApplyInvoiceId] = useState('');
  const [applyAmount, setApplyAmount] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundAccountId, setRefundAccountId] = useState('');
  const [refundDate, setRefundDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [applying, setApplying] = useState(false);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    if (!open || !creditNoteId) return;
    setLoading(true);
    setApplyInvoiceId('');
    setApplyAmount('');
    setRefundAmount('');
    setRefundAccountId('');
    setRefundDate(format(new Date(), 'yyyy-MM-dd'));
    creditNotesApi
      .manageModal(creditNoteId)
      .then((res) => setData(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load credit note');
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, creditNoteId, onOpenChange]);

  const remaining = Number(data?.remaining) || 0;
  const currency = data?.currency || 'USD';

  const selectedInvoice = useMemo(
    () => (data?.invoices || []).find((inv) => String(inv.id) === applyInvoiceId),
    [data, applyInvoiceId]
  );

  const applyMax = useMemo(() => {
    let cap = remaining;
    if (selectedInvoice) {
      cap = Math.min(cap, Number(selectedInvoice.balance_due) || 0);
    }
    return Math.max(0, cap);
  }, [remaining, selectedInvoice]);

  useEffect(() => {
    if (!data || remaining <= 0) return;
    if (applyInvoiceId && selectedInvoice) {
      setApplyAmount(applyMax > 0 ? applyMax.toFixed(2) : '');
    }
  }, [applyInvoiceId, applyMax, data, remaining, selectedInvoice]);

  useEffect(() => {
    if (data && remaining > 0 && !refundAmount) {
      setRefundAmount(remaining.toFixed(2));
    }
  }, [data, remaining, refundAmount]);

  const handleApply = async (e) => {
    e.preventDefault();
    const amount = Number(applyAmount);
    if (!applyInvoiceId || amount <= 0) {
      toast.error('Select an invoice and enter an amount to apply');
      return;
    }
    if (amount > applyMax + 0.01) {
      toast.error('Amount exceeds available credit or invoice balance');
      return;
    }
    setApplying(true);
    try {
      const res = await creditNotesApi.apply(creditNoteId, {
        invoice_id: Number(applyInvoiceId),
        amount,
      });
      toast.success(res.data?.message || 'Credit applied to invoice');
      onSuccess?.(res.data?.data?.credit_note);
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to apply credit');
    } finally {
      setApplying(false);
    }
  };

  const handleRefund = async (e) => {
    e.preventDefault();
    const amount = Number(refundAmount);
    if (amount <= 0 || !refundAccountId) {
      toast.error('Enter refund amount and select a bank/cash account');
      return;
    }
    if (amount > remaining + 0.01) {
      toast.error('Refund exceeds remaining credit');
      return;
    }
    setRefunding(true);
    try {
      const res = await creditNotesApi.refund(creditNoteId, {
        refund_amount: amount,
        payment_account_id: Number(refundAccountId),
        refund_date: refundDate,
      });
      toast.success(res.data?.message || 'Credit refunded to customer');
      onSuccess?.(res.data?.data);
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to refund credit');
    } finally {
      setRefunding(false);
    }
  };

  const lifecycle = data?.lifecycle_status || 'open';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage customer credit</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 p-3 text-sm flex flex-wrap items-center gap-2">
              <strong>{data?.credit_note_number}</strong>
              {data?.customer_name && (
                <span className="text-muted-foreground">— {data.customer_name}</span>
              )}
              <Badge
                variant="outline"
                className={cn('capitalize', LIFECYCLE_COLORS[lifecycle] || '')}
              >
                {data?.lifecycle_label || lifecycle}
              </Badge>
              <span>
                Remaining:{' '}
                <strong className="tabular-nums">
                  {formatCurrency(remaining, currency)}
                </strong>
              </span>
            </div>

            {remaining <= 0.001 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No remaining credit to apply or refund.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Apply to invoice</h3>
                  <form onSubmit={handleApply} className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Invoice</Label>
                      <Select
                        value={applyInvoiceId ? String(applyInvoiceId) : undefined}
                        onValueChange={setApplyInvoiceId}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select invoice" />
                        </SelectTrigger>
                        <SelectContent>
                          {(data?.invoices || []).map((inv) => (
                            <SelectItem key={inv.id} value={String(inv.id)}>
                              {inv.invoice_number} — due{' '}
                              {formatCurrency(inv.balance_due, inv.currency || currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount to apply</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={applyMax}
                        className="h-9 tabular-nums"
                        value={applyAmount}
                        onChange={(e) => setApplyAmount(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={applying || !(data?.invoices || []).length}>
                      {applying ? <Loader2 className="size-4 animate-spin" /> : 'Apply credit'}
                    </Button>
                  </form>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Refund to customer</h3>
                  <form onSubmit={handleRefund} className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount to refund</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={remaining}
                        className="h-9 tabular-nums"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">From (bank/cash)</Label>
                      <Select
                        value={refundAccountId ? String(refundAccountId) : undefined}
                        onValueChange={setRefundAccountId}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {(data?.accounts || []).map((acc) => (
                            <SelectItem key={acc.id} value={String(acc.id)}>
                              {acc.code ? `${acc.code} — ` : ''}
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Refund date</Label>
                      <DatePicker value={refundDate} onChange={setRefundDate} allowClear={false} />
                    </div>
                    <Button type="submit" variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={refunding}>
                      {refunding ? <Loader2 className="size-4 animate-spin" /> : 'Refund credit'}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
