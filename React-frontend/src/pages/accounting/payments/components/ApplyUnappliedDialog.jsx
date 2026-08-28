import { useEffect, useMemo, useState } from 'react';
import { Banknote, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { paymentsApi } from '../api/payments.api';
import { formatCurrency, moneyRound } from '../constants';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

function emptyRowState() {
  return { selected: false, apply: '', discount: '' };
}

export function ApplyUnappliedDialog({ open, onOpenChange, paymentId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  /** @type {[Record<string, {selected:boolean, apply:string, discount:string}>, Function]} */
  const [rows, setRows] = useState({});

  useEffect(() => {
    if (!open || !paymentId) return;
    setLoading(true);
    setRows({});
    paymentsApi
      .applyUnappliedModal(paymentId)
      .then((res) => {
        const payload = res.data?.data || null;
        setData(payload);
        const next = {};
        (payload?.invoices || []).forEach((inv) => {
          next[String(inv.id)] = emptyRowState();
        });
        setRows(next);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load apply dialog');
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, paymentId, onOpenChange]);

  const currency = data?.currency;
  const maxCash = Number(data?.unapplied_amount) || 0;
  const invoices = data?.invoices || [];

  const totals = useMemo(() => {
    let cash = 0;
    let discount = 0;
    Object.values(rows).forEach((row) => {
      if (!row?.selected) return;
      cash += Number(row.apply) || 0;
      discount += Number(row.discount) || 0;
    });
    return {
      cash: moneyRound(cash),
      discount: moneyRound(discount),
      remainingCash: moneyRound(Math.max(0, maxCash - cash)),
    };
  }, [rows, maxCash]);

  const allSelected =
    invoices.length > 0 && invoices.every((inv) => rows[String(inv.id)]?.selected);

  const fillApplyForInvoice = (inv, selected, currentDiscount = '') => {
    const due = Number(inv.balance_due) || 0;
    const discount = Math.min(Math.max(0, Number(currentDiscount) || 0), due);
    const room = Math.max(0, due - discount);
    if (!selected) {
      return { selected: false, apply: '', discount: '' };
    }
    return {
      selected: true,
      apply: room > 0 ? String(moneyRound(room)) : '',
      discount: discount > 0 ? String(moneyRound(discount)) : '',
    };
  };

  /** Redistribute cash across selected rows from available pool (oldest first). */
  const redistributeCash = (nextRows) => {
    let remaining = maxCash;
    const ordered = invoices.map((inv) => String(inv.id));
    const out = { ...nextRows };

    ordered.forEach((id) => {
      const row = out[id];
      if (!row?.selected) {
        out[id] = { ...(row || emptyRowState()), apply: '', selected: false };
        return;
      }
      const inv = invoices.find((i) => String(i.id) === id);
      const due = Number(inv?.balance_due) || 0;
      const discount = Math.min(Math.max(0, Number(row.discount) || 0), due);
      const room = Math.max(0, due - discount);
      const cash = Math.min(room, remaining);
      remaining = moneyRound(remaining - cash);
      out[id] = {
        selected: true,
        discount: discount > 0 ? String(moneyRound(discount)) : '',
        apply: cash > 0 ? String(moneyRound(cash)) : '',
      };
    });

    return out;
  };

  const toggleRow = (inv, selected) => {
    setRows((prev) => {
      const id = String(inv.id);
      const current = prev[id] || emptyRowState();
      const patched = {
        ...prev,
        [id]: fillApplyForInvoice(inv, selected, current.discount),
      };
      return redistributeCash(patched);
    });
  };

  const toggleAll = (selected) => {
    setRows((prev) => {
      const patched = {};
      invoices.forEach((inv) => {
        const id = String(inv.id);
        const current = prev[id] || emptyRowState();
        patched[id] = fillApplyForInvoice(inv, selected, current.discount);
      });
      return redistributeCash(patched);
    });
  };

  const updateDiscount = (inv, raw) => {
    setRows((prev) => {
      const id = String(inv.id);
      const current = prev[id] || emptyRowState();
      const due = Number(inv.balance_due) || 0;
      let discount = Math.max(0, Number(raw) || 0);
      discount = Math.min(discount, due);
      const selected = current.selected || discount > 0 || (Number(current.apply) || 0) > 0;
      const patched = {
        ...prev,
        [id]: {
          selected,
          discount: raw === '' ? '' : String(moneyRound(discount)),
          apply: current.apply,
        },
      };
      return redistributeCash(patched);
    });
  };

  const updateApply = (inv, raw) => {
    setRows((prev) => {
      const id = String(inv.id);
      const current = prev[id] || emptyRowState();
      const due = Number(inv.balance_due) || 0;
      const discount = Math.min(Math.max(0, Number(current.discount) || 0), due);
      const room = Math.max(0, due - discount);

      let cashElsewhere = 0;
      Object.entries(prev).forEach(([otherId, row]) => {
        if (otherId === id || !row?.selected) return;
        cashElsewhere += Number(row.apply) || 0;
      });
      const poolLeft = Math.max(0, maxCash - cashElsewhere);
      let cash = Math.max(0, Number(raw) || 0);
      cash = Math.min(cash, room, poolLeft);

      return {
        ...prev,
        [id]: {
          selected: true,
          discount: discount > 0 ? String(moneyRound(discount)) : current.discount,
          apply: raw === '' ? '' : String(moneyRound(cash)),
        },
      };
    });
  };

  const autoApplyOldest = () => {
    setRows((prev) => {
      const patched = {};
      invoices.forEach((inv) => {
        const id = String(inv.id);
        const current = prev[id] || emptyRowState();
        patched[id] = {
          selected: true,
          discount: current.discount,
          apply: '',
        };
      });
      return redistributeCash(patched);
    });
    toast.success('Available cash applied to open invoices (oldest first).');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allocations = invoices
      .map((inv) => {
        const row = rows[String(inv.id)];
        if (!row?.selected) return null;
        const amount = Number(row.apply) || 0;
        const discount = Number(row.discount) || 0;
        if (amount <= 0 && discount <= 0) return null;
        return {
          invoice_id: inv.id,
          amount,
          discount,
        };
      })
      .filter(Boolean);

    if (!allocations.length) {
      toast.error('Select at least one invoice to apply cash or discount');
      return;
    }

    if (totals.cash > maxCash + 0.01) {
      toast.error('Total cash applied exceeds available on-account cash');
      return;
    }

    setSaving(true);
    try {
      const res = await paymentsApi.applyUnapplied(paymentId, allocations);
      toast.success(res.data?.message || 'Cash applied to invoices');
      onSuccess?.(res.data?.data);
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to apply cash');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[min(88vh,760px)]">
          <DialogHeader className="border-b px-5 py-4 space-y-1">
            <DialogTitle className="text-base">
              Apply on-account cash
              {data?.receipt_label ? (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  {data.receipt_label}
                </span>
              ) : null}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tick invoices to apply prepaid cash. Discount is a write-off (not taken from prepaid).
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-lg border bg-card px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Available prepaid
                  </p>
                  <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400 mt-0.5">
                    {formatCurrency(maxCash, currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Cash to apply
                  </p>
                  <p className="text-lg font-bold tabular-nums text-primary mt-0.5">
                    {formatCurrency(totals.cash, currency)}
                  </p>
                </div>
                <div className="rounded-lg border px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Left as prepaid
                  </p>
                  <p className="text-lg font-bold tabular-nums mt-0.5">
                    {formatCurrency(totals.remainingCash, currency)}
                  </p>
                </div>
              </div>

              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No open invoices for this customer.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {invoices.length} open invoice{invoices.length === 1 ? '' : 's'}
                      {totals.discount > 0 ? (
                        <>
                          {' '}
                          · Discount write-off{' '}
                          <span className="font-medium text-foreground">
                            {formatCurrency(totals.discount, currency)}
                          </span>
                        </>
                      ) : null}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={autoApplyOldest}
                    >
                      <Wand2 className="size-3.5 mr-1.5" />
                      Auto-apply cash
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <th className="w-10 px-2 py-2.5 text-center">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={(v) => toggleAll(!!v)}
                              aria-label="Select all invoices"
                            />
                          </th>
                          <th className="px-3 py-2.5 text-left">Invoice</th>
                          <th className="px-3 py-2.5 text-right">Open balance</th>
                          <th className="px-3 py-2.5 text-right w-[110px]">
                            Discount
                            <span className="block font-normal normal-case tracking-normal text-[9px]">
                              Write-off
                            </span>
                          </th>
                          <th className="px-3 py-2.5 text-right w-[120px] text-primary">
                            Apply cash
                            <span className="block font-normal normal-case tracking-normal text-[9px] text-primary/80">
                              From prepaid
                            </span>
                          </th>
                          <th className="px-3 py-2.5 text-right w-[100px]">Left</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => {
                          const id = String(inv.id);
                          const row = rows[id] || emptyRowState();
                          const due = Number(inv.balance_due) || 0;
                          const cash = Number(row.apply) || 0;
                          const discount = Number(row.discount) || 0;
                          const left = moneyRound(Math.max(0, due - cash - discount));
                          const settled = row.selected && left <= 0.001;

                          return (
                            <tr
                              key={inv.id}
                              className={cn(
                                'border-t',
                                row.selected && 'bg-emerald-50/40 dark:bg-emerald-950/15',
                              )}
                            >
                              <td className="px-2 py-2 text-center">
                                <Checkbox
                                  checked={!!row.selected}
                                  onCheckedChange={(v) => toggleRow(inv, !!v)}
                                  aria-label={`Apply to ${inv.invoice_number}`}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-medium">{inv.invoice_number}</span>
                                {inv.due_date_display ? (
                                  <span className="block text-xs text-muted-foreground">
                                    Due {inv.due_date_display}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium">
                                {formatCurrency(due, inv.currency || currency)}
                              </td>
                              <td className="px-2 py-1.5">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={due}
                                  className="h-8 text-right tabular-nums"
                                  placeholder="0.00"
                                  value={row.discount}
                                  disabled={!row.selected}
                                  onChange={(e) => updateDiscount(inv, e.target.value)}
                                  aria-label={`Discount for ${inv.invoice_number}`}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="h-8 text-right tabular-nums font-medium"
                                  placeholder="0.00"
                                  value={row.apply}
                                  disabled={!row.selected}
                                  onChange={(e) => updateApply(inv, e.target.value)}
                                  aria-label={`Apply cash for ${inv.invoice_number}`}
                                />
                              </td>
                              <td
                                className={cn(
                                  'px-3 py-2 text-right tabular-nums text-xs font-medium',
                                  settled
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {!row.selected
                                  ? '—'
                                  : settled
                                    ? 'Settled'
                                    : formatCurrency(left, inv.currency || currency)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="border-t px-5 py-3 sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground self-center">
              <Banknote className="size-3.5 inline mr-1 align-[-2px]" />
              Allocated{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(totals.cash, currency)}
              </span>{' '}
              of {formatCurrency(maxCash, currency)}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || loading || !invoices.length || totals.cash + totals.discount <= 0}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
