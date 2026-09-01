import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, RotateCcw, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { customersApi } from '@/pages/accounting/customers/api/customers.api';
import { pharmacyApi } from '../api/pharmacy.api';
import { ExpiryMaskInput } from './ExpiryMaskInput';
import { ItemNameSearchCell } from './ItemNameSearchCell';
import {
  PURCHASE_CELL_INPUT,
  PURCHASE_CELL_NUMBER,
  PurchaseGridTd,
  PurchaseGridTh,
} from './purchase-grid-ui';
import {
  buildOpenReturnPayload,
  computeOpenReturnTotals,
  defaultBatchPlaceholder,
  defaultExpiryPlaceholder,
  emptyOpenReturnLine,
  formatOpenReturnMoney,
  isWalkInCustomer,
  openReturnLineGross,
  openReturnQtyHint,
  purchaseSettingsFromContext,
  resolveOpenReturnUnitPrice,
  validateOpenReturnLines,
} from '../lib/pharmacy-open-return';
import { isMedicinePickSheetOpen } from '../lib/medicine-pick-sheet-state';
import {
  buildOpenReturnTabHandler,
  focusOpenReturnDiscountAmount,
  focusOpenReturnDiscountPercent,
  focusOpenReturnField,
  focusOpenReturnNextField,
  focusOpenReturnNextProductRow,
  focusOpenReturnSubmit,
  handleOpenReturnArrowNav,
  navigateOpenReturnRow,
  openReturnFieldFocusProps,
} from '../lib/open-return-grid-keyboard';
import { getMedicinePricing } from '../lib/pharmacy-pricing';
import { sanitizeDecimalInput, sanitizeIntegerInput, money as cartMoney } from '../lib/pharmacy-cart';

function sanitizeRupeesOffInput(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function percentFromRupees(base, amountRaw) {
  const amt = Math.min(base, Math.max(Number(amountRaw) || 0, 0));
  if (base <= 0 || amt <= 0) return '';
  return String(cartMoney((amt / base) * 100));
}

function rupeesFromPercent(base, percentRaw) {
  const pct = Math.min(Math.max(Number(percentRaw) || 0, 0), 100);
  return cartMoney(Math.min(base, (base * pct) / 100));
}

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

/** Open sale return (no receipt) — for counter sale dialog. */
export function PharmacyOpenReturnPanel({
  context = null,
  posCustomer = null,
  walkIn = null,
  canRefund: canRefundProp = true,
  managerActive = false,
  onRequestManager,
  onComplete,
}) {
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState(() => context?.defaults || { batch: 'LOOSE', expiry_mask: '' });
  const [pharmacySettings, setPharmacySettings] = useState(() => context?.settings || {});
  const [contextWalkIn, setContextWalkIn] = useState(() => context?.walk_in_customer || null);
  const [canRefundCash, setCanRefundCash] = useState(() => context?.can_refund_cash !== false);
  const [customer, setCustomer] = useState(() => posCustomer || context?.walk_in_customer || null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerRows, setCustomerRows] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([emptyOpenReturnLine()]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [refundPromptOpen, setRefundPromptOpen] = useState(false);
  const [returnDiscountType, setReturnDiscountType] = useState('fixed');
  const [returnDiscountPercent, setReturnDiscountPercent] = useState('');
  const [returnDiscountAmount, setReturnDiscountAmount] = useState('');
  const qtyRefs = useRef([]);
  const discountAmountRef = useRef(null);
  const discountPercentRef = useRef(null);
  const submitRef = useRef(() => {});
  const handleSubmitClickRef = useRef(() => {});

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'r') return;
      if (refundPromptOpen || saving) return;
      const dialog = document.querySelector('[data-pharmacy-return-dialog]');
      if (!dialog) return;
      if (isMedicinePickSheetOpen()) return;
      const target = e.target;
      if (target?.closest?.('[role="alertdialog"]')) return;
      e.preventDefault();
      e.stopPropagation();
      submitRef.current?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [refundPromptOpen, saving]);

  const effectiveWalkIn = walkIn || contextWalkIn;
  const purchaseSettings = useMemo(
    () => purchaseSettingsFromContext(defaults, pharmacySettings),
    [defaults, pharmacySettings],
  );
  const defaultBatchLabel = defaultBatchPlaceholder(purchaseSettings);
  const defaultExpiryLabel = defaultExpiryPlaceholder(purchaseSettings);
  const walkInCustomer = isWalkInCustomer(customer, effectiveWalkIn);

  useEffect(() => {
    if (!context) return undefined;
    setDefaults(context.defaults || {});
    setPharmacySettings(context.settings || {});
    setContextWalkIn(context.walk_in_customer || null);
    setCanRefundCash(context.can_refund_cash !== false);
    setCustomer(posCustomer || context.walk_in_customer || null);
    setLines([emptyOpenReturnLine()]);
    setNotes('');
    setSelectedIdx(0);
    setReturnDiscountType('fixed');
    setReturnDiscountPercent('');
    setReturnDiscountAmount('');
    requestAnimationFrame(() => focusOpenReturnField(0, 'item', { selectAll: true }));
    return undefined;
  }, [context, posCustomer]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const res = await customersApi.list({
          search: customerQuery || undefined,
          per_page: 12,
        });
        const data = unwrap(res);
        const rows = Array.isArray(data) ? data : data?.data || [];
        if (!cancelled) setCustomerRows(rows);
      } catch {
        if (!cancelled) setCustomerRows([]);
      } finally {
        if (!cancelled) setCustomerSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [customerQuery]);

  const customerOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    const push = (row) => {
      if (!row?.id) return;
      const value = String(row.id);
      if (seen.has(value)) return;
      seen.add(value);
      options.push({
        value,
        label: row.name || 'Walk-in Customer',
        keywords: [row.customer_code].filter(Boolean),
      });
    };
    push(effectiveWalkIn);
    push(customer);
    customerRows.forEach((row) => push(row));
    return options;
  }, [effectiveWalkIn, customer, customerRows]);

  const totals = useMemo(
    () =>
      computeOpenReturnTotals(lines, {
        discountType: returnDiscountType,
        discountPercent: returnDiscountPercent,
        discountAmount: returnDiscountAmount,
      }),
    [lines, returnDiscountType, returnDiscountPercent, returnDiscountAmount],
  );

  const updateLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const applyReturnDiscountAmount = useCallback(
    (raw) => {
      const next = sanitizeRupeesOffInput(raw);
      setReturnDiscountType('fixed');
      setReturnDiscountAmount(next);
      setReturnDiscountPercent(percentFromRupees(totals.gross, next));
    },
    [totals.gross],
  );

  const applyReturnDiscountPercent = useCallback(
    (raw) => {
      const next = sanitizeDecimalInput(raw, { maxDecimals: 2 });
      setReturnDiscountType('percent');
      setReturnDiscountPercent(next);
      const rupees = rupeesFromPercent(totals.gross, next);
      setReturnDiscountAmount(rupees > 0 ? String(Math.round(rupees)) : '');
    },
    [totals.gross],
  );

  const addLine = () => {
    setLines((prev) => [...prev, emptyOpenReturnLine()]);
    const nextIdx = lines.length;
    setSelectedIdx(nextIdx);
    requestAnimationFrame(() => focusOpenReturnField(nextIdx, 'item', { selectAll: true }));
  };

  const ensureReturnRow = useCallback((nextIndex) => {
    setLines((prev) => {
      if (nextIndex < prev.length) return prev;
      const extra = [];
      for (let i = prev.length; i <= nextIndex; i += 1) {
        extra.push(emptyOpenReturnLine());
      }
      return [...prev, ...extra];
    });
  }, []);

  const advanceToNextProductRow = useCallback(
    (fromIndex) => {
      focusOpenReturnNextProductRow(fromIndex, {
        onEnsureRow: ensureReturnRow,
        onSelectRow: setSelectedIdx,
      });
    },
    [ensureReturnRow],
  );

  const removeLine = (index) => {
    setLines((prev) => {
      if (prev.length <= 1) return [emptyOpenReturnLine()];
      return prev.filter((_, i) => i !== index);
    });
    setSelectedIdx((idx) => Math.max(0, Math.min(idx, lines.length - 2)));
  };

  const pickProduct = (index, product) => {
    if (!product?.id) return;
    const pricing = getMedicinePricing(product);
    const unitRefund = resolveOpenReturnUnitPrice(product);
    updateLine(index, {
      product_id: String(product.id),
      name: product.name || product.label || '',
      image_url: product.image_url || product.thumb_url || null,
      sub: [product.generic_name, product.strength].filter(Boolean).join(' · '),
      pack_count: pricing.packCount,
      unit_price: unitRefund || lines[index]?.unit_price || '',
    });
    requestAnimationFrame(() => qtyRefs.current[index]?.focus?.());
  };

  const postReturn = async (refundCash) => {
    const check = validateOpenReturnLines(lines, purchaseSettings);
    if (check.error) {
      toast.error(check.error);
      return;
    }
    if (refundCash && !canRefundCash) {
      toast.error('No cash account set up. Return as credit only, or add a cash account.');
      return;
    }
    if (!canRefundProp && !managerActive && refundCash) {
      onRequestManager?.();
      toast.message('Manager approval required for cash refunds');
      return;
    }

    setSaving(true);
    try {
      const payload = buildOpenReturnPayload({
        lines: check.active,
        customerId: customer?.id || effectiveWalkIn?.id,
        notes,
        refundCash,
        purchaseSettings,
        discountType: returnDiscountType,
        discountPercent: returnDiscountPercent,
        discountAmount: returnDiscountAmount,
      });
      const res = await pharmacyApi.storeLooseSaleReturn(payload);
      const data = unwrap(res);
      toast.success(
        data?.refunded
          ? `Returned & refunded · ${data?.credit_note_number || ''}`
          : `Returned to stock · ${data?.credit_note_number || ''}`,
      );
      setLines([emptyOpenReturnLine()]);
      setNotes('');
      setSelectedIdx(0);
      setCustomer(posCustomer || effectiveWalkIn);
      onComplete?.(data);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Return failed.');
    } finally {
      setSaving(false);
      setRefundPromptOpen(false);
    }
  };

  const handleSubmitClick = () => {
    const check = validateOpenReturnLines(lines, purchaseSettings);
    if (check.error) {
      toast.error(check.error);
      return;
    }
    if (walkInCustomer) {
      void postReturn(canRefundCash);
      return;
    }
    setRefundPromptOpen(true);
  };

  submitRef.current = handleSubmitClick;
  handleSubmitClickRef.current = handleSubmitClick;

  const selectedCustomerId = customer?.id
    ? String(customer.id)
    : effectiveWalkIn?.id
      ? String(effectiveWalkIn.id)
      : undefined;

  return (
    <>
      <div data-pharmacy-density className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(200px,240px)_minmax(0,1fr)]">
            <div className="space-y-1">
              <span className="text-[12px] font-semibold text-slate-800">Customer</span>
              <SearchableCombobox
                value={selectedCustomerId}
                onValueChange={(value) => {
                  const hit =
                    [effectiveWalkIn, customer, ...customerRows].find(
                      (row) => String(row?.id) === String(value),
                    ) || null;
                  if (hit) setCustomer(hit);
                }}
                onSearchChange={setCustomerQuery}
                options={customerOptions}
                placeholder="Walk-in Customer"
                searchPlaceholder={customerSearching ? 'Searching…' : 'Search customer…'}
                disabled={saving}
                triggerClassName="h-9 border-slate-400"
                renderValue={(opt) => (
                  <span className="flex min-w-0 items-center gap-2">
                    <UserRound className="size-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">{opt?.label || 'Walk-in Customer'}</span>
                  </span>
                )}
              />
              {walkInCustomer ? (
                <p className="text-[11px] text-slate-500">Walk-in — cash refund on post</p>
              ) : (
                <p className="text-[11px] text-slate-500">Account customer — ask if cash returned</p>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[12px] font-semibold text-slate-800">Note</span>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional reason"
                rows={1}
                className="min-h-9 resize-none border-slate-400 py-2"
                disabled={saving}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-400 bg-white">
            <div className="flex items-center justify-between border-b border-slate-400 px-3 py-2">
              <p className="text-[12px] text-slate-600">
                Medicines to return · qty is{' '}
                <span className="font-semibold text-slate-800">tablets/pieces, not packs</span>
                {defaultBatchLabel || defaultExpiryLabel ? (
                  <span className="text-slate-500">
                    {' '}
                    · empty batch/expiry uses {defaultBatchLabel || '—'} /{' '}
                    {defaultExpiryLabel || '—'}
                  </span>
                ) : null}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-slate-400"
                onClick={addLine}
                disabled={saving}
              >
                <Plus className="me-1 size-3.5" />
                Line
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr>
                    <PurchaseGridTh align="center" className="w-9">
                      #
                    </PurchaseGridTh>
                    <PurchaseGridTh className="min-w-[200px]">Medicine</PurchaseGridTh>
                    <PurchaseGridTh align="right" className="w-16" title="Pieces returned, not packs">
                      Qty (pcs)
                    </PurchaseGridTh>
                    <PurchaseGridTh align="right" className="w-20" title="Refund per tablet/piece">
                      / unit
                    </PurchaseGridTh>
                    <PurchaseGridTh align="right" className="w-20">
                      Amount
                    </PurchaseGridTh>
                    <PurchaseGridTh className="w-20">Batch</PurchaseGridTh>
                    <PurchaseGridTh className="w-18">Expiry</PurchaseGridTh>
                    <PurchaseGridTh className="w-9" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const selected = selectedIdx === index;
                    const lineGross = openReturnLineGross(line);
                    const rowCount = lines.length;
                    const onSelectRow = setSelectedIdx;
                    return (
                      <tr
                        key={index}
                        data-open-return-row={index}
                        className={cn(!selected && 'hover:[&>td]:bg-emerald-50/60')}
                        onClick={() => setSelectedIdx(index)}
                      >
                        <PurchaseGridTd align="center" selected={selected} lead>
                          <span className="flex h-10 items-center justify-center text-[12px] font-semibold tabular-nums text-slate-700">
                            {index + 1}
                          </span>
                        </PurchaseGridTd>
                        <PurchaseGridTd selected={selected}>
                          <div data-open-return-item={index}>
                            <ItemNameSearchCell
                              rowIndex={index}
                              variant="cell"
                              selectedLabel={line.name}
                              selectedProductId={line.product_id}
                              selectedImage={line.image_url}
                              selectedSub={line.sub}
                              linked={!!line.product_id}
                              disabled={saving}
                              blockZeroStock={false}
                              onFocusRow={onSelectRow}
                              onNavigateRow={(delta) =>
                                navigateOpenReturnRow(index, delta, rowCount, onSelectRow)
                              }
                              onSelect={(product) => pickProduct(index, product)}
                            />
                          </div>
                        </PurchaseGridTd>
                        <PurchaseGridTd align="right" selected={selected}>
                          <Input
                            ref={(el) => {
                              qtyRefs.current[index] = el;
                            }}
                            data-open-return-qty={index}
                            data-pharmacy-typing
                            type="text"
                            inputMode="numeric"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(index, {
                                quantity: sanitizeIntegerInput(e.target.value),
                              })
                            }
                            placeholder={line.product_id ? openReturnQtyHint(line) : '1'}
                            title={
                              line.product_id
                                ? `Return count in ${openReturnQtyHint(line)} — not full packs`
                                : 'Pieces returned, not packs'
                            }
                            className={cn(PURCHASE_CELL_NUMBER, 'h-10 min-h-10')}
                            disabled={saving}
                            {...openReturnFieldFocusProps(index, onSelectRow, { selectAll: true })}
                            onKeyDown={(e) => {
                              if (handleOpenReturnArrowNav(e, index, rowCount, onSelectRow)) return;
                              if (e.key === 'Tab') {
                                buildOpenReturnTabHandler(index, 'qty', rowCount, onSelectRow)(e);
                                return;
                              }
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                advanceToNextProductRow(index);
                                return;
                              }
                              if (
                                e.key.length === 1 &&
                                !/\d/.test(e.key) &&
                                !e.ctrlKey &&
                                !e.metaKey
                              ) {
                                e.preventDefault();
                              }
                            }}
                          />
                        </PurchaseGridTd>
                        <PurchaseGridTd align="right" selected={selected}>
                          <Input
                            data-open-return-price={index}
                            data-pharmacy-typing
                            type="text"
                            inputMode="decimal"
                            value={line.unit_price}
                            onChange={(e) =>
                              updateLine(index, {
                                unit_price: sanitizeDecimalInput(e.target.value, { maxDecimals: 2 }),
                              })
                            }
                            placeholder="0.00"
                            className={cn(PURCHASE_CELL_NUMBER, 'h-10 min-h-10')}
                            disabled={saving}
                            {...openReturnFieldFocusProps(index, onSelectRow)}
                            onKeyDown={(e) => {
                              if (handleOpenReturnArrowNav(e, index, rowCount, onSelectRow)) return;
                              if (e.key === 'Tab') {
                                buildOpenReturnTabHandler(index, 'price', rowCount, onSelectRow)(e);
                                return;
                              }
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusOpenReturnNextField(index, 'price', rowCount, onSelectRow);
                              }
                            }}
                          />
                        </PurchaseGridTd>
                        <PurchaseGridTd align="right" selected={selected}>
                          <div className="px-2 py-1">
                            <p className="text-right text-[13px] font-semibold tabular-nums text-slate-900">
                              {lineGross > 0 ? formatOpenReturnMoney(lineGross) : '—'}
                            </p>
                          </div>
                        </PurchaseGridTd>
                        <PurchaseGridTd selected={selected}>
                          <Input
                            data-open-return-batch={index}
                            data-pharmacy-typing
                            value={line.batch_number}
                            onChange={(e) => updateLine(index, { batch_number: e.target.value })}
                            className={cn(
                              PURCHASE_CELL_INPUT,
                              'h-10 min-h-10 text-xs uppercase placeholder:text-slate-400',
                            )}
                            placeholder={defaultBatchLabel || 'Batch'}
                            disabled={saving}
                            {...openReturnFieldFocusProps(index, onSelectRow)}
                            onKeyDown={(e) => {
                              if (handleOpenReturnArrowNav(e, index, rowCount, onSelectRow)) return;
                              if (e.key === 'Tab') {
                                buildOpenReturnTabHandler(index, 'batch', rowCount, onSelectRow)(e);
                                return;
                              }
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusOpenReturnNextField(index, 'batch', rowCount, onSelectRow);
                              }
                            }}
                          />
                        </PurchaseGridTd>
                        <PurchaseGridTd selected={selected}>
                          <ExpiryMaskInput
                            data-open-return-expiry={index}
                            data-pharmacy-typing
                            value={line.expiry_date}
                            onChange={(v) => updateLine(index, { expiry_date: v })}
                            className={cn(
                              PURCHASE_CELL_INPUT,
                              'h-10 min-h-10 text-xs placeholder:text-slate-400',
                            )}
                            placeholder={defaultExpiryLabel || 'MM/YY'}
                            disabled={saving}
                            {...openReturnFieldFocusProps(index, onSelectRow)}
                            onKeyDown={(e) => {
                              if (handleOpenReturnArrowNav(e, index, rowCount, onSelectRow)) return;
                              if (e.key === 'Tab') {
                                buildOpenReturnTabHandler(index, 'expiry', rowCount, onSelectRow)(e);
                                return;
                              }
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusOpenReturnNextField(index, 'expiry', rowCount, onSelectRow);
                              }
                            }}
                          />
                        </PurchaseGridTd>
                        <PurchaseGridTd align="center" selected={selected}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-slate-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLine(index);
                            }}
                            disabled={saving}
                            aria-label="Remove line"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </PurchaseGridTd>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-400 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">Discount (optional)</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Tab from expiry reaches here · Enter posts return
                </p>
              </div>
              <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:w-auto">
                <label className="min-w-0">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-700">
                    Discount amount
                  </span>
                  <Input
                    ref={discountAmountRef}
                    data-open-return-discount-amount
                    data-pharmacy-typing
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={returnDiscountAmount}
                    onChange={(e) => applyReturnDiscountAmount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        focusOpenReturnDiscountPercent();
                        return;
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmitClickRef.current?.();
                      }
                    }}
                    className="h-10 border-slate-400 bg-white text-right text-[16px] font-semibold tabular-nums"
                    disabled={saving}
                  />
                </label>
                <label className="min-w-0">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-700">
                    Discount %
                  </span>
                  <Input
                    ref={discountPercentRef}
                    data-open-return-discount-percent
                    data-pharmacy-typing
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={returnDiscountPercent}
                    onChange={(e) => applyReturnDiscountPercent(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && e.shiftKey) {
                        e.preventDefault();
                        focusOpenReturnDiscountAmount();
                        return;
                      }
                      if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        focusOpenReturnSubmit();
                        return;
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmitClickRef.current?.();
                      }
                    }}
                    className="h-10 border-slate-400 bg-white text-right text-[16px] font-semibold tabular-nums"
                    disabled={saving}
                  />
                </label>
              </div>
            </div>
            {totals.gross > 0 ? (
              <div className="mt-3 grid gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] sm:max-w-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-600">Subtotal</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {formatOpenReturnMoney(totals.gross)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-600">Discount</span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      totals.discount > 0 ? 'text-red-700' : 'text-slate-400',
                    )}
                  >
                    {totals.discount > 0
                      ? `− ${formatOpenReturnMoney(totals.discount)}`
                      : formatOpenReturnMoney(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-1.5">
                  <span className="font-semibold text-slate-800">Refund</span>
                  <span className="text-[15px] font-bold tabular-nums text-emerald-800">
                    {formatOpenReturnMoney(totals.amount)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="rounded-lg border border-slate-400 bg-white xl:sticky xl:top-0">
          <div className="border-b border-slate-400 bg-emerald-800 px-4 py-3 text-white">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">
              {walkInCustomer ? 'Cash refund' : 'Return amount'}
            </p>
            <p className="mt-1 text-[28px] font-bold tabular-nums leading-none">
              {formatOpenReturnMoney(totals.amount)}
            </p>
            <p className="mt-2 text-[12px] text-emerald-100">
              {totals.items} item{totals.items === 1 ? '' : 's'} · stock goes back
            </p>
          </div>
          <div className="space-y-3 p-4">
            {totals.gross > 0 ? (
              <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px]">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold tabular-nums">{formatOpenReturnMoney(totals.gross)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Discount</span>
                  <span className={cn('font-semibold tabular-nums', totals.discount > 0 && 'text-red-700')}>
                    {totals.discount > 0
                      ? `− ${formatOpenReturnMoney(totals.discount)}`
                      : formatOpenReturnMoney(0)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 border-t border-dashed border-slate-200 pt-1.5">
                  <span className="font-semibold text-slate-800">Refund</span>
                  <span className="font-bold tabular-nums text-emerald-800">
                    {formatOpenReturnMoney(totals.amount)}
                  </span>
                </div>
              </div>
            ) : null}
            <p className="text-[12px] leading-relaxed text-slate-600">
              {walkInCustomer
                ? 'Walk-in — cash refund on post'
                : 'Account customer — ask if cash returned'}
            </p>
            <p className="text-[11px] text-slate-500">
              Tab: medicine → qty → price → batch → expiry → discount · Ctrl+R post
            </p>
            <Button
              type="button"
              data-open-return-submit
              className="mt-2 flex h-11 w-full items-center bg-emerald-800 hover:bg-emerald-900"
              disabled={saving || totals.items === 0}
              onClick={handleSubmitClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitClick();
                }
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" />
                  Posting…
                </>
              ) : (
                <>
                  <RotateCcw className="me-2 size-4 shrink-0" />
                  <span className="truncate">
                    {walkInCustomer ? 'Return & refund' : 'Post return'}
                  </span>
                  <kbd className="ms-auto shrink-0 rounded border border-emerald-600/60 bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-medium text-emerald-100">
                    Ctrl+R
                  </kbd>
                </>
              )}
            </Button>
          </div>
        </aside>
      </div>

      <AlertDialog open={refundPromptOpen} onOpenChange={setRefundPromptOpen}>
        <AlertDialogContent data-pos-no-scan className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Refund cash to customer?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  Customer:{' '}
                  <span className="font-semibold text-slate-900">
                    {customer?.name || 'Account customer'}
                  </span>
                </p>
                <p>
                  Amount:{' '}
                  <span className="font-semibold tabular-nums text-slate-900">
                    {formatOpenReturnMoney(totals.amount)}
                  </span>
                </p>
                <p>
                  Choose <strong>Yes</strong> if you paid cash back now. Choose <strong>No</strong>{' '}
                  to reduce their due balance only.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={saving} className="mt-0">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => postReturn(false)}
            >
              No — credit balance
            </Button>
            <AlertDialogAction
              disabled={saving || !canRefundCash}
              className="bg-emerald-800 hover:bg-emerald-900"
              onClick={(e) => {
                e.preventDefault();
                void postReturn(true);
              }}
            >
              Yes — cash refunded
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
