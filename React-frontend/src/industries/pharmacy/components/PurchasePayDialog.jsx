import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { money } from '../lib/pharmacy-cart';
import { parseTenderInput } from '../lib/cash-tender-suggestions';
import { PharmacyKbd } from './PharmacyKbd';

export function PurchasePayDialog({
  open,
  onOpenChange,
  due = 0,
  supplierName = '',
  formatMoney,
  saving = false,
  andNext = false,
  onConfirm,
}) {
  const amountDue = money(due);
  const [paid, setPaid] = useState(false);
  const [paidRaw, setPaidRaw] = useState('');
  const paidRef = useRef(null);
  const unpaidChoiceRef = useRef(null);
  const confirmRef = useRef(() => {});

  const paidAmount = parseTenderInput(paidRaw);
  const stillDue = money(Math.max(0, amountDue - paidAmount));
  const named = String(supplierName || '').trim() || 'this supplier';

  const focusPaid = useCallback(() => {
    requestAnimationFrame(() => {
      paidRef.current?.focus?.({ preventScroll: true });
      paidRef.current?.select?.();
    });
  }, []);

  const focusUnpaidChoice = useCallback(() => {
    requestAnimationFrame(() => {
      unpaidChoiceRef.current?.focus?.({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setPaid(false);
    setPaidRaw(amountDue > 0 ? String(amountDue) : '');
    focusUnpaidChoice();
  }, [open, amountDue, focusUnpaidChoice]);

  useEffect(() => {
    if (!open) return;
    if (paid) focusPaid();
    else focusUnpaidChoice();
  }, [open, paid, focusPaid, focusUnpaidChoice]);

  const confirm = useCallback(() => {
    if (saving) return;
    if (!paid) {
      onConfirm?.({ paid: false, amount: 0, andNext });
      return;
    }
    const cash = money(Math.min(Math.max(paidAmount, 0), amountDue));
    onConfirm?.({ paid: cash > 0.009, amount: cash, andNext });
  }, [amountDue, andNext, onConfirm, paid, paidAmount, saving]);

  useEffect(() => {
    confirmRef.current = confirm;
  }, [confirm]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setPaid(true);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setPaid(false);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        confirmRef.current();
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-md border-slate-300/90 p-0 shadow-[0_8px_30px_rgba(15,23,42,0.12)] sm:max-w-[400px]"
        overlayClassName="bg-slate-900/45 backdrop-blur-none"
        data-pos-no-scan
        data-pharmacy-typing
        data-purchase-pay-dialog
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          unpaidChoiceRef.current?.focus?.({ preventScroll: true });
        }}
      >
        <DialogHeader className="mb-0 space-y-0 border-b border-slate-200 bg-white px-5 py-3.5 pe-12 text-left">
          <DialogTitle className="text-[15px] font-semibold leading-tight text-slate-900">
            Post purchase
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose whether this supplier bill is paid or unpaid
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Amount due</p>
          <p className="mt-1 text-[28px] font-semibold tabular-nums leading-none tracking-tight text-slate-900">
            {formatMoney(amountDue)}
          </p>
          <p className="mt-1.5 truncate text-[12px] text-slate-500">{named}</p>
        </div>

        <div className="space-y-3 bg-white px-5 py-4">
          <p className="text-[13px] font-semibold text-slate-800">Is this bill paid?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              ref={unpaidChoiceRef}
              type="button"
              disabled={saving}
              onClick={() => setPaid(false)}
              className={cn(
                'rounded-md border px-3 py-2.5 text-left transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
                !paid
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-300 bg-white hover:border-amber-300 hover:bg-amber-50/50',
              )}
            >
              <span className="block text-[13px] font-semibold text-slate-900">Unpaid</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-600">
                Charge {formatMoney(amountDue)} to supplier
              </span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setPaid(true)}
              className={cn(
                'rounded-md border px-3 py-2.5 text-left transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
                paid
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/60',
              )}
            >
              <span className="block text-[13px] font-semibold text-slate-900">Paid</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-600">
                Record cash to this bill
              </span>
            </button>
          </div>

          {paid ? (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-slate-800">Amount paid</span>
              <Input
                ref={paidRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="h-11 rounded border-slate-300 bg-white text-center text-[22px] font-semibold tabular-nums shadow-none focus-visible:ring-emerald-600/30"
                value={paidRaw}
                onChange={(e) => setPaidRaw(e.target.value.replace(/[^\d.]/g, ''))}
              />
              {paidAmount + 0.009 < amountDue ? (
                <p className="mt-2 text-[11px] text-amber-800">
                  {formatMoney(stillDue)} stays unpaid on {named}
                </p>
              ) : paidAmount > amountDue + 0.009 ? (
                <p className="mt-2 text-[11px] text-amber-800">
                  Extra is not applied. Post will use {formatMoney(amountDue)}.
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">Full bill paid. Nothing due on supplier.</p>
              )}
            </label>
          ) : (
            <p className="text-[12px] leading-snug text-slate-500">
              Stock is received. {formatMoney(amountDue)} stays on the supplier balance until you pay it later.
            </p>
          )}
        </div>

        <DialogFooter className="mb-0 flex-col gap-0 border-t border-slate-200 bg-slate-50 px-5 py-3 pt-0 sm:flex-col">
          <p className="w-full py-2 text-center text-[11px] text-slate-500">
            Enter posts · ← unpaid · → paid · Esc cancel
          </p>
          <div className="flex w-full items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 min-w-[5.5rem] rounded border-slate-300 bg-white text-[13px] font-medium shadow-none hover:bg-slate-50"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className={cn(
                'h-9 min-w-[8.5rem] rounded text-[13px] font-semibold shadow-none',
                paid ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700',
              )}
              disabled={saving || amountDue <= 0}
              onClick={confirm}
            >
              {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              {paid ? (andNext ? 'Pay & next' : 'Post paid') : andNext ? 'Unpaid & next' : 'Post unpaid'}
              <PharmacyKbd className="ms-1.5 border-white/30 bg-white/15 text-[9px] text-white">
                Enter
              </PharmacyKbd>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
