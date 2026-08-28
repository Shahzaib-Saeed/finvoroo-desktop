import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UnitPickerCell } from '@/components/workspace/product/components/UnitPickerCell';
import { cn } from '@/lib/utils';
import { formatMoney, lineTax, lineTotal } from '../lib/cart-math';

export function PosCartPanel({
  customer,
  lines,
  currency,
  taxRatesById,
  totals,
  invoiceDiscount,
  onInvoiceDiscount,
  notes,
  onNotes,
  permissions,
  onUpdateLine,
  onRemoveLine,
  onOpenCustomer,
  onOpenPayment,
  onHold,
  onClear,
  checkingOut,
  cartFocus,
  onCartFocus,
  panelRef,
  online,
  shiftOpen,
}) {
  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      className="flex h-full w-full max-w-[26rem] shrink-0 flex-col border-l border-foreground/10 bg-background outline-none"
    >
      <div className="border-b border-foreground/10 px-4 py-3">
        <button
          type="button"
          onClick={onOpenCustomer}
          className="h-12 w-full rounded-xl border border-foreground/12 bg-muted/30 px-3 py-2 text-left transition hover:bg-muted/50"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Customer
          </p>
          <p className="truncate text-sm font-semibold">{customer?.name || 'Walk-in Customer'}</p>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {lines.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
            <p className="text-sm font-medium text-foreground/70">Cart is empty</p>
            <p className="mt-1 text-xs">Scan a barcode or select a product</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((line, idx) => (
              <li
                key={line.key}
                onClick={() => onCartFocus?.(idx)}
                className={cn(
                  'rounded-xl border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
                  cartFocus === idx
                    ? 'border-foreground/40 ring-1 ring-foreground/20'
                    : 'border-foreground/[0.1]',
                )}
              >
                <div className="flex gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {line.image_url ? (
                      <img src={line.image_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{line.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {line.sku || line.barcode || '—'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="flex size-9 items-center justify-center text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveLine(line.key)}
                        aria-label="Remove"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-foreground/12">
                        <button
                          type="button"
                          className="flex size-10 items-center justify-center"
                          onClick={() =>
                            onUpdateLine(line.key, {
                              quantity: Math.max(1, (Number(line.quantity) || 1) - 1),
                            })
                          }
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <Input
                          data-pos-typing
                          className="h-10 w-12 border-0 bg-transparent px-0 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
                          value={line.quantity}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '' || /^\d*\.?\d*$/.test(v)) {
                              onUpdateLine(line.key, { quantity: v });
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="flex size-10 items-center justify-center"
                          onClick={() =>
                            onUpdateLine(line.key, {
                              quantity: (Number(line.quantity) || 0) + 1,
                            })
                          }
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <div className="min-w-[4.5rem]">
                        <UnitPickerCell
                          line={line}
                          product={line.product || { unit_label: line.unit_label, qty_conversion: line.qty_conversion }}
                          onChange={(v) => onUpdateLine(line.key, { entered_unit: v })}
                          triggerClassName="h-10 text-xs border border-foreground/12 rounded-lg"
                          disabled={!permissions.can_sell}
                        />
                      </div>
                      <Input
                        data-pos-typing
                        className="h-10 flex-1 rounded-lg border-foreground/12 text-right text-sm tabular-nums"
                        value={line.unit_price}
                        disabled={!permissions.can_edit_price}
                        onChange={(e) => onUpdateLine(line.key, { unit_price: e.target.value })}
                      />
                    </div>

                    {permissions.can_discount && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Input
                          data-pos-typing
                          className="h-10 rounded-lg border-foreground/12 text-sm"
                          placeholder="Disc %"
                          value={line.discount_type === 'percent' ? line.discount || '' : ''}
                          onChange={(e) =>
                            onUpdateLine(line.key, {
                              discount: e.target.value,
                              discount_type: 'percent',
                            })
                          }
                        />
                        <Input
                          data-pos-typing
                          className="h-10 rounded-lg border-foreground/12 text-sm"
                          placeholder="Disc amt"
                          value={line.discount_type === 'fixed' ? line.discount || '' : ''}
                          onChange={(e) =>
                            onUpdateLine(line.key, {
                              discount: e.target.value,
                              discount_type: 'fixed',
                            })
                          }
                        />
                      </div>
                    )}

                    <Input
                      data-pos-typing
                      className="mt-2 h-10 rounded-lg border-foreground/12 text-sm"
                      placeholder="Line note"
                      value={line.notes || ''}
                      onChange={(e) => onUpdateLine(line.key, { notes: e.target.value })}
                    />

                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                      <span>
                        Tax {formatMoney(lineTax(line, taxRatesById), currency)}
                        {line.track_inventory ? ` · Stock ${line.stock}` : ''}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(lineTotal(line, taxRatesById), currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sticky bottom-0 shrink-0 space-y-3 border-t border-foreground/10 bg-muted/30 px-4 py-4 backdrop-blur">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums text-foreground">
              {formatMoney(totals.subtotal, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-muted-foreground">
            <span>Invoice discount</span>
            <Input
              data-pos-typing
              className="h-10 w-28 rounded-lg border-foreground/12 text-right text-sm tabular-nums"
              value={invoiceDiscount || ''}
              disabled={!permissions.can_discount}
              onChange={(e) => onInvoiceDiscount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span className="tabular-nums text-foreground">
              {formatMoney(totals.taxTotal, currency)}
            </span>
          </div>
          <div className="flex justify-between border-t border-foreground/10 pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(totals.total, currency)}</span>
          </div>
        </div>

        <Textarea
          data-pos-typing
          rows={2}
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Sale notes"
          className="min-h-[56px] resize-none rounded-xl border-foreground/12 bg-background text-sm"
        />

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl border-foreground/15"
            onClick={onHold}
            disabled={!lines.length || checkingOut}
          >
            Hold
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl border-foreground/15"
            onClick={onClear}
            disabled={!lines.length || checkingOut}
          >
            Clear
          </Button>
        </div>

        <Button
          type="button"
          className="h-14 w-full rounded-xl bg-foreground text-base font-semibold text-background hover:bg-foreground/90"
          onClick={onOpenPayment}
          disabled={!lines.length || checkingOut || !online || !shiftOpen}
        >
          {!online
            ? 'Offline — checkout paused'
            : !shiftOpen
              ? 'Open shift to charge'
              : `Charge ${formatMoney(totals.total, currency)}`}
        </Button>
      </div>
    </aside>
  );
}
