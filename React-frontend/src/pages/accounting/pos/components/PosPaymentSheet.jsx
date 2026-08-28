import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney, money } from '../lib/cart-math';

const NUMPAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

export function PosPaymentSheet({
  open,
  onOpenChange,
  currency,
  totals,
  payments,
  onPaymentsChange,
  paymentMethods,
  remaining,
  changeDue,
  allowCredit,
  onAllowCredit,
  canCredit,
  checkingOut,
  onComplete,
  tenderRef,
  lines,
}) {
  const methods = paymentMethods?.length
    ? paymentMethods
    : [
        { value: 'cash', label: 'Cash' },
        { value: 'card', label: 'Card' },
        { value: 'bank', label: 'Bank' },
        { value: 'wallet', label: 'Wallet' },
        { value: 'other', label: 'Other' },
      ];

  const activeIdx = 0;
  const update = (idx, patch) => {
    onPaymentsChange(payments.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const appendDigit = (key) => {
    const cur = String(payments[activeIdx]?.amount ?? '');
    if (key === '⌫') {
      update(activeIdx, { amount: cur.slice(0, -1) });
      return;
    }
    if (key === '.' && cur.includes('.')) return;
    update(activeIdx, { amount: cur === '0' && key !== '.' ? key : cur + key });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-pos-no-scan
        className="max-h-[92vh] max-w-3xl gap-0 overflow-hidden rounded-2xl border-foreground/12 p-0"
      >
        <DialogHeader className="border-b border-foreground/10 px-5 py-4">
          <DialogTitle className="text-lg font-semibold tracking-tight">Payment</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Due{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {formatMoney(totals.total, currency)}
            </span>
          </p>
        </DialogHeader>

        <div className="grid gap-0 md:grid-cols-[1fr_16rem]">
          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {methods.slice(0, 4).map((m) => (
                <Button
                  key={m.value}
                  type="button"
                  variant={payments[0]?.method === m.value ? 'default' : 'outline'}
                  className="h-14 rounded-xl text-sm font-semibold"
                  onClick={() =>
                    onPaymentsChange([
                      {
                        method: m.value,
                        amount: String(totals.total || ''),
                        reference: payments[0]?.reference || '',
                      },
                      ...payments.slice(1),
                    ])
                  }
                >
                  {m.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                totals.total,
                money(Math.ceil(totals.total)),
                money(Math.ceil(totals.total / 10) * 10),
                money(Math.ceil(totals.total / 50) * 50),
              ]
                .filter((v, i, a) => a.indexOf(v) === i && v > 0)
                .map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    className="h-12 rounded-xl border-foreground/15 tabular-nums"
                    onClick={() =>
                      onPaymentsChange([{ ...payments[0], method: 'cash', amount: String(amt) }])
                    }
                  >
                    {formatMoney(amt, currency)}
                  </Button>
                ))}
            </div>

            <div className="space-y-3">
              {payments.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <Input
                      ref={idx === 0 ? tenderRef : undefined}
                      data-pos-typing
                      className="mt-1 h-12 rounded-xl text-right text-base tabular-nums"
                      value={row.amount}
                      onChange={(e) => update(idx, { amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Reference</Label>
                    <Input
                      data-pos-typing
                      className="mt-1 h-12 rounded-xl"
                      value={row.reference || ''}
                      onChange={(e) => update(idx, { reference: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-12"
                    onClick={() =>
                      payments.length > 1 &&
                      onPaymentsChange(payments.filter((_, i) => i !== idx))
                    }
                    disabled={payments.length <= 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl border-dashed"
              onClick={() =>
                onPaymentsChange([
                  ...payments,
                  {
                    method: 'card',
                    amount: remaining > 0 ? String(remaining) : '',
                    reference: '',
                  },
                ])
              }
            >
              <Plus className="mr-1 size-4" /> Mixed payment
            </Button>

            <div className="rounded-xl border border-foreground/10 bg-muted/30 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(remaining, currency)}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(changeDue, currency)}
                </span>
              </div>
            </div>

            {canCredit && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={allowCredit}
                  onCheckedChange={(v) => onAllowCredit(Boolean(v))}
                />
                Allow credit / leave balance on account
              </label>
            )}
          </div>

          <div className="border-t border-foreground/10 bg-muted/20 p-4 md:border-l md:border-t-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Receipt preview
            </p>
            <div className="mb-3 max-h-40 space-y-1 overflow-y-auto text-xs">
              {lines.slice(0, 8).map((l) => (
                <div key={l.key} className="flex justify-between gap-2">
                  <span className="truncate">{l.quantity}× {l.name}</span>
                  <span className="tabular-nums">{Number(l.unit_price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {NUMPAD.map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl text-base font-medium"
                  onClick={() => appendDigit(key)}
                >
                  {key}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-foreground/10 bg-muted/20 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-14 flex-1 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={checkingOut}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-14 flex-[1.6] rounded-xl bg-foreground text-background hover:bg-foreground/90"
            onClick={onComplete}
            disabled={checkingOut || (remaining > 0.009 && !allowCredit)}
          >
            {checkingOut ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Complete sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
