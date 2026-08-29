import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  formatPharmacyPosMoney,
  parseTenderInput,
  roundWholeRupee,
  suggestCashTenderAmounts,
} from '../lib/cash-tender-suggestions';
import { PharmacyKbd } from './PharmacyKbd';

const QUICK_COLS = 4;

const fieldClass =
  'h-10 rounded-lg border-slate-200 bg-white text-right text-[16px] font-semibold tabular-nums shadow-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus-visible:ring-emerald-600/25';

function sanitizeRupeesOffInput(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function sanitizePercentInput(value) {
  return String(value ?? '').replace(/[^\d]/g, '');
}

function prettyPercent(n) {
  const v = Math.round(Number(n) || 0);
  if (v <= 0) return '';
  return String(v);
}

function rupeesFromPercent(base, percentRaw) {
  const pct = Math.min(Math.max(Number(percentRaw) || 0, 0), 100);
  return money(Math.min(base, Math.round((base * pct) / 100)));
}

function percentFromRupees(base, amountRaw) {
  const amt = Math.min(base, Math.max(Number(amountRaw) || 0, 0));
  if (base <= 0 || amt <= 0) return 0;
  return Math.round((amt / base) * 100);
}

function navigateQuickIndex(fromIdx, key, total) {
  if (!total) return null;
  const row = Math.floor(fromIdx / QUICK_COLS);
  const col = fromIdx % QUICK_COLS;
  const lastRow = Math.floor((total - 1) / QUICK_COLS);

  if (key === 'ArrowLeft') return col > 0 ? fromIdx - 1 : fromIdx;
  if (key === 'ArrowRight') {
    const next = fromIdx + 1;
    return next < total && Math.floor(next / QUICK_COLS) === row ? next : fromIdx;
  }
  if (key === 'ArrowUp') {
    if (row > 0) return fromIdx - QUICK_COLS;
    return 'discount';
  }
  if (key === 'ArrowDown') {
    const next = fromIdx + QUICK_COLS;
    if (next < total) return next;
    if (row < lastRow) {
      const target = Math.min(lastRow * QUICK_COLS + col, total - 1);
      if (target > fromIdx) return target;
    }
    return 'tender';
  }
  return null;
}

function SummaryRow({ label, value, strong = false, accent = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[13px] font-medium text-slate-600">{label}</span>
      <span
        className={cn(
          'tabular-nums',
          strong
            ? 'text-[15px] font-bold text-slate-900'
            : accent
              ? 'text-[14px] font-semibold text-emerald-700'
              : 'text-[14px] font-semibold text-slate-800',
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function DispensePayDialog({
  open,
  onOpenChange,
  total = 0,
  subtotal = 0,
  formatMoney,
  printAfterPost = false,
  onConfirm,
  onUnpaid,
  checkingOut = false,
  invoiceDiscountAmount = '',
  invoiceDiscountPercent = '',
  invoiceDiscountType = 'fixed',
  onInvoiceDiscountAmountChange,
  onInvoiceDiscountPercentChange,
  onInvoiceDiscountTypeChange,
  canDiscount = true,
  isWalkIn = true,
  canCredit = false,
  customerName = '',
}) {
  const fmt = useCallback((amount) => formatPharmacyPosMoney(formatMoney, amount), [formatMoney]);

  const rawDue = money(total);
  const payDue = roundWholeRupee(rawDue);
  const discountBase = roundWholeRupee(subtotal);
  const suggestions = useMemo(() => suggestCashTenderAmounts(payDue), [payDue]);

  const [tenderRaw, setTenderRaw] = useState('');
  const tenderRef = useRef(null);
  const discountAmountRef = useRef(null);
  const discountPercentRef = useRef(null);
  const quickRefs = useRef([]);
  const prevPayDueRef = useRef(payDue);
  const wasOpenRef = useRef(false);

  const showUnpaid = !isWalkIn && Boolean(onUnpaid);
  const namedCustomer = String(customerName || '').trim() || 'this customer';

  const focusTender = useCallback(() => {
    tenderRef.current?.focus?.({ preventScroll: true });
    tenderRef.current?.select?.();
  }, []);

  const focusDiscountField = useCallback((which) => {
    const el = which === 'percent' ? discountPercentRef.current : discountAmountRef.current;
    if (!el) return false;
    el.focus({ preventScroll: true });
    el.select();
    return true;
  }, []);

  const focusRsOff = useCallback(() => {
    if (canDiscount && focusDiscountField('amount')) return;
    focusTender();
  }, [canDiscount, focusDiscountField, focusTender]);

  const focusQuickAt = useCallback(
    (index) => {
      if (index < 0 || index >= suggestions.length) return false;
      quickRefs.current[index]?.focus?.({ preventScroll: true });
      return true;
    },
    [suggestions.length],
  );

  useEffect(() => {
    quickRefs.current = quickRefs.current.slice(0, suggestions.length);
  }, [suggestions.length]);

  const tender = roundWholeRupee(parseTenderInput(tenderRaw));
  const changeDue = roundWholeRupee(Math.max(0, tender - payDue));
  const canConfirm = tender >= payDue && payDue > 0;

  const appliedDiscountRupees = useMemo(() => {
    if (invoiceDiscountType === 'percent') {
      return rupeesFromPercent(discountBase, invoiceDiscountPercent);
    }
    return money(Math.min(discountBase, Math.max(Number(invoiceDiscountAmount) || 0, 0)));
  }, [discountBase, invoiceDiscountAmount, invoiceDiscountPercent, invoiceDiscountType]);

  const writeFixedDiscount = useCallback(
    (rupees) => {
      const nextAmt = money(Math.min(discountBase, Math.max(Number(rupees) || 0, 0)));
      onInvoiceDiscountTypeChange?.('fixed');
      onInvoiceDiscountAmountChange?.(nextAmt > 0 ? String(Math.round(nextAmt)) : '');
      onInvoiceDiscountPercentChange?.(prettyPercent(percentFromRupees(discountBase, nextAmt)));
    },
    [
      discountBase,
      onInvoiceDiscountAmountChange,
      onInvoiceDiscountPercentChange,
      onInvoiceDiscountTypeChange,
    ],
  );

  const applyRupeesOff = useCallback(
    (raw) => {
      const next = sanitizeRupeesOffInput(raw);
      onInvoiceDiscountTypeChange?.('fixed');
      onInvoiceDiscountAmountChange?.(next);
      onInvoiceDiscountPercentChange?.(prettyPercent(percentFromRupees(discountBase, next)));
    },
    [
      discountBase,
      onInvoiceDiscountAmountChange,
      onInvoiceDiscountPercentChange,
      onInvoiceDiscountTypeChange,
    ],
  );

  const applyPercentOff = useCallback(
    (raw) => {
      const next = sanitizePercentInput(raw);
      onInvoiceDiscountTypeChange?.('percent');
      onInvoiceDiscountPercentChange?.(next);
      const rupees = rupeesFromPercent(discountBase, next);
      onInvoiceDiscountAmountChange?.(rupees > 0 ? String(rupees) : '');
    },
    [
      discountBase,
      onInvoiceDiscountAmountChange,
      onInvoiceDiscountPercentChange,
      onInvoiceDiscountTypeChange,
    ],
  );

  const applyOpeningWholeRupeeDiscount = useCallback(() => {
    if (!canDiscount) return;
    const paise = money(rawDue - payDue);
    if (paise < 0.009) return;

    const userDisc =
      invoiceDiscountType === 'percent'
        ? rupeesFromPercent(discountBase, invoiceDiscountPercent)
        : money(Math.min(discountBase, Math.max(Number(invoiceDiscountAmount) || 0, 0)));
    writeFixedDiscount(money(userDisc + paise));
  }, [
    canDiscount,
    discountBase,
    invoiceDiscountAmount,
    invoiceDiscountPercent,
    invoiceDiscountType,
    payDue,
    rawDue,
    writeFixedDiscount,
  ]);

  const confirmCash = useCallback(
    (amount = tender) => {
      if (checkingOut) return;
      const paid = roundWholeRupee(amount);
      if (paid >= payDue && payDue > 0) {
        onConfirm?.(paid);
      }
    },
    [checkingOut, onConfirm, payDue, tender],
  );

  const confirmUnpaid = useCallback(() => {
    if (checkingOut || !showUnpaid || !canCredit) return;
    onUnpaid?.();
  }, [canCredit, checkingOut, onUnpaid, showUnpaid]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      applyOpeningWholeRupeeDiscount();

      const seed = suggestions.find((a) => a >= payDue) ?? payDue;
      setTenderRaw(String(seed));
      prevPayDueRef.current = payDue;

      // Always land on Rs off. Radix auto-focus and a later due-total
      // update can steal it onto Cash received — pin it twice.
      const first = requestAnimationFrame(() => focusRsOff());
      const again = window.setTimeout(() => focusRsOff(), 40);
      wasOpenRef.current = true;
      return () => {
        cancelAnimationFrame(first);
        window.clearTimeout(again);
      };
    }
    wasOpenRef.current = open;
  }, [open, applyOpeningWholeRupeeDiscount, focusRsOff, payDue, suggestions]);

  useEffect(() => {
    if (!open) return;
    const prev = prevPayDueRef.current;
    if (prev === payDue) return;
    prevPayDueRef.current = payDue;
    setTenderRaw((current) => {
      const prevNum = roundWholeRupee(parseTenderInput(current));
      if (prevNum < payDue || prevNum === prev) {
        const seed = suggestions.find((a) => a >= payDue) ?? payDue;
        return String(seed);
      }
      return current;
    });
  }, [open, payDue, suggestions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'F8') {
        e.preventDefault();
        e.stopPropagation();
        confirmUnpaid();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, confirmUnpaid]);

  const handleTenderKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      confirmCash();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length) focusQuickAt(suggestions.length - 1);
    }
  };

  const handleDiscountKeyDown = (which) => (e) => {
    if (e.key === 'ArrowRight' && which === 'amount') {
      e.preventDefault();
      focusDiscountField('percent');
      return;
    }
    if (e.key === 'ArrowLeft' && which === 'percent') {
      e.preventDefault();
      focusDiscountField('amount');
      return;
    }
    if (e.key === 'ArrowRight' && which === 'percent') {
      e.preventDefault();
      if (suggestions.length) focusQuickAt(0);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      confirmCash();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length) focusQuickAt(0);
    }
  };

  const handleQuickKeyDown = (index) => (e) => {
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const dest = navigateQuickIndex(index, e.key, suggestions.length);
      if (dest === 'discount') {
        if (canDiscount) focusDiscountField('amount');
        return;
      }
      if (dest === 'tender') {
        focusTender();
        return;
      }
      if (typeof dest === 'number') focusQuickAt(dest);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      confirmCash(suggestions[index]);
    }
  };

  const invoiceDiscApplied = appliedDiscountRupees > 0;
  const compactCashLabel = (amount) => fmt(amount).replace(/^[A-Z]{3}\s*/i, '');
  const shortfall = payDue - tender;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-2xl sm:max-w-[400px]"
        overlayClassName="bg-slate-900/50 backdrop-blur-[2px]"
        data-pos-no-scan
        data-pharmacy-typing
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          focusRsOff();
        }}
      >
        <DialogHeader className="mb-0 space-y-0 border-b border-slate-200 bg-white px-5 py-3 pe-12 text-left">
          <DialogTitle className="text-[16px] font-bold text-slate-900">Complete sale</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm cash received and post the sale
          </DialogDescription>
        </DialogHeader>

        <div className="bg-zinc-950 px-5 py-4 text-white">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                Amount due
              </p>
              <p className="mt-1 text-[32px] font-bold tabular-nums leading-none">{fmt(payDue)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                Change
              </p>
              <p
                className={cn(
                  'mt-1 text-[28px] font-bold tabular-nums leading-none',
                  canConfirm && changeDue > 0 ? 'text-emerald-400' : 'text-zinc-500',
                )}
              >
                {canConfirm ? fmt(changeDue) : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3">
          <SummaryRow label="Subtotal" value={fmt(subtotal)} />
          {invoiceDiscApplied ? (
            <SummaryRow label="Discount" value={`−${fmt(appliedDiscountRupees)}`} accent />
          ) : null}
          <div className="mt-1 border-t border-slate-200/80 pt-2">
            <SummaryRow label="Pay now" value={fmt(payDue)} strong />
          </div>
        </div>

        {showUnpaid ? (
          <div className="border-b border-slate-200 px-4 py-2.5">
            <button
              type="button"
              disabled={checkingOut || !canCredit}
              title={!canCredit ? 'Credit sales are not permitted on this till' : 'F8'}
              onClick={confirmUnpaid}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px]',
                canCredit
                  ? 'border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100'
                  : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60',
              )}
            >
              <span className="font-semibold">
                Unpaid · {fmt(payDue)} to {namedCustomer}
              </span>
              <PharmacyKbd className="text-[9px]">F8</PharmacyKbd>
            </button>
          </div>
        ) : null}

        <div className="space-y-3 px-5 pt-3 pb-2">
          {canDiscount ? (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-slate-800">Discount (optional)</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Rs off</label>
                  <Input
                    ref={discountAmountRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    aria-label="Discount amount in rupees"
                    className={fieldClass}
                    value={invoiceDiscountAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => applyRupeesOff(e.target.value)}
                    onKeyDown={handleDiscountKeyDown('amount')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">% off</label>
                  <Input
                    ref={discountPercentRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    aria-label="Discount percent"
                    className={fieldClass}
                    value={invoiceDiscountPercent}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => applyPercentOff(e.target.value)}
                    onKeyDown={handleDiscountKeyDown('percent')}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[13px] font-semibold text-slate-800">Quick cash</p>
            <div className="grid grid-cols-4 gap-1.5" role="toolbar" aria-label="Quick cash amounts">
              {suggestions.map((amount, index) => {
                const active = tender === amount;
                return (
                  <button
                    key={amount}
                    ref={(el) => {
                      quickRefs.current[index] = el;
                    }}
                    type="button"
                    tabIndex={0}
                    onClick={() => {
                      setTenderRaw(String(amount));
                      confirmCash(amount);
                    }}
                    onKeyDown={handleQuickKeyDown(index)}
                    className={cn(
                      'h-9 rounded-lg border text-[13px] font-bold tabular-nums transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-400 hover:bg-emerald-50',
                    )}
                  >
                    {compactCashLabel(amount)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-semibold text-slate-800">
              Cash received
            </label>
            <Input
              ref={tenderRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="h-12 rounded-lg border-slate-200 bg-white text-center text-[24px] font-bold tabular-nums shadow-none focus-visible:ring-emerald-600/30"
              value={tenderRaw}
              onChange={(e) => setTenderRaw(sanitizeRupeesOffInput(e.target.value))}
              onKeyDown={handleTenderKeyDown}
            />
            {!canConfirm && tender > 0 && shortfall >= 1 ? (
              <p className="mt-2 text-center text-[12px] font-medium text-amber-800">
                Short {fmt(shortfall)}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="mb-0 flex-row gap-2.5 border-t border-slate-200 bg-white px-5 pt-4 pb-3 sm:justify-between sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl border-slate-200 bg-white text-[14px] font-semibold shadow-none"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 flex-[1.35] rounded-xl bg-emerald-700 text-[14px] font-bold shadow-none hover:bg-emerald-800"
            disabled={!canConfirm || checkingOut}
            onClick={() => confirmCash()}
          >
            {checkingOut ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {printAfterPost ? 'Post & print' : 'Post sale'}
          </Button>
        </DialogFooter>
        <p className="border-t border-slate-100 px-5 py-2 text-center text-[11px] text-slate-400">
          Enter to post · Esc to cancel
          {showUnpaid && canCredit ? ' · F8 unpaid' : ''}
        </p>
      </DialogContent>
    </Dialog>
  );
}
