import { useLayoutEffect, useRef, useState } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ItemNameSearchCell } from './ItemNameSearchCell';
import { getLineWarnings, isPriceOverridden, lineTotal, formatLineUnitDisplay, formatRateForDisplay, sanitizeIntegerInput, sanitizeDecimalInput } from '../lib/pharmacy-cart';

const GRID_FONT =
  "Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

/** Emerald-spine grid — branded header, readable body lines. */
const GRID_LINE = 'border-r border-b border-slate-200 last:border-r-0';
const GRID_HEAD = 'border-r border-slate-300/70 border-b-2 border-slate-300 last:border-r-0';

const CELL_INPUT =
  'h-11 w-full min-h-11 border-0 rounded-none shadow-none bg-transparent px-3 text-[13px] font-medium leading-snug text-slate-900 outline-none placeholder:text-slate-400 focus:bg-emerald-50/40 focus:ring-0 focus-visible:!outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/25 disabled:opacity-50';

function Th({ children, align = 'left', className, ...rest }) {
  return (
    <th
      {...rest}
      className={cn(
        GRID_HEAD,
        'sticky top-0 z-10 bg-slate-100 px-2.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-600 whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className, align = 'left', onClick, selected = false, lead = false, colSpan }) {
  return (
    <td
      colSpan={colSpan}
      onClick={onClick}
      className={cn(
        GRID_LINE,
        'p-0 align-middle text-slate-900',
        selected && lead && 'shadow-[inset_3px_0_0_0_#059669]',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

function CellText({ children, className, strong = false }) {
  return (
    <div
      className={cn(
        'flex h-11 items-center px-3 text-[13px] leading-snug text-slate-900',
        strong ? 'font-semibold tabular-nums' : 'font-medium',
        className,
      )}
    >
      {children}
    </div>
  );
}

const ROW_FIELDS = ['item', 'qty', 'price', 'disc'];

function focusRowField(rowIndex, field, linesLength) {
  if (field === 'item') {
    const cell =
      document.querySelector(`[data-dispense-item-search="${rowIndex}"]`) ||
      document.querySelector(`[data-grn-item="${rowIndex}"]`)?.closest('[data-pharmacy-item-search]');
    const input = cell?.querySelector?.('input');
    const button = cell?.querySelector?.('button');
    const target = input || button;
    target?.focus?.({ preventScroll: true });
    input?.select?.();
    return;
  }
  if (field === 'qty') {
    document.querySelector(`[data-dispense-qty="${rowIndex}"]`)?.focus?.({ preventScroll: true });
    return;
  }
  if (field === 'price') {
    document.querySelector(`[data-dispense-price="${rowIndex}"]`)?.focus?.({ preventScroll: true });
    return;
  }
  if (field === 'disc') {
    document.querySelector(`[data-dispense-disc="${rowIndex}"]`)?.focus?.({ preventScroll: true });
    return;
  }
  if (field === 'next-row') {
    const next = Math.min(rowIndex + 1, linesLength);
    focusRowField(next, 'item', linesLength);
  }
}

function focusNextField(rowIndex, currentField, linesLength, onSelectRow, onShowEntryRow) {
  const idx = ROW_FIELDS.indexOf(currentField);
  if (idx >= 0 && idx < ROW_FIELDS.length - 1) {
    focusRowField(rowIndex, ROW_FIELDS[idx + 1], linesLength);
    onSelectRow?.(rowIndex);
    return;
  }
  focusNextProductRow(rowIndex, linesLength, onSelectRow, onShowEntryRow);
}

function detectFocusedField() {
  const active = document.activeElement;
  if (active?.closest?.('[data-dispense-qty]')) return 'qty';
  if (active?.closest?.('[data-dispense-price]')) return 'price';
  if (active?.closest?.('[data-dispense-disc]')) return 'disc';
  return 'item';
}

/** Enter on qty — user is done with this line and wants the next product. */
function focusNextProductRow(_rowIndex, _linesLength, _onSelectRow, onShowEntryRow) {
  onShowEntryRow?.({ openSheet: true });
}

function navigateCartRow(rowIndex, delta, navMaxIndex, onSelectRow) {
  const next = Math.max(0, Math.min(rowIndex + delta, navMaxIndex));
  if (next === rowIndex) return;
  const field = detectFocusedField();
  onSelectRow?.(next);
  focusRowField(next, field, navMaxIndex);
}

function handleGridArrowNav(e, rowIndex, navMaxIndex, onSelectRow) {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return false;
  e.preventDefault();
  e.stopPropagation();
  navigateCartRow(rowIndex, e.key === 'ArrowDown' ? 1 : -1, navMaxIndex, onSelectRow);
  return true;
}

function closeMedicineSheetSilently() {
  window.dispatchEvent(
    new CustomEvent('pharmacy:close-medicine-sheet', { detail: { restoreFocus: false } }),
  );
}

function gridFieldFocusProps(index, onSelectRow, { selectAll = false } = {}) {
  return {
    onMouseDown: () => {
      closeMedicineSheetSilently();
    },
    onFocus: (e) => {
      closeMedicineSheetSilently();
      onSelectRow(index);
      if (selectAll) e.target.select?.();
    },
  };
}
/** Minimum grid rows when the scroll area has not been measured yet. */
const MIN_VISIBLE_ROWS = 2;
const CART_ROW_HEIGHT_PX = 44;

/**
 * FEFO already picked the batch when the line was added, so the batch number and
 * expiry are shown as plain text under the product name — no column, no input,
 * no tab stop. The cashier gets the traceability without a single extra
 * keystroke, which is the only way it can be shown on a counter that lives or
 * dies on scan speed.
 */
function batchLabel(line) {
  const batch = String(line?.fefo_batch_number || '').trim();
  const expiry = formatExpiryShort(line?.fefo_expiry);
  if (!batch && !expiry) return '';
  if (!expiry) return batch;
  return batch ? `${batch} · Exp ${expiry}` : `Exp ${expiry}`;
}

/** ISO date to the MM/YY a pharmacist reads off the strip. */
function formatExpiryShort(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[2]}/${iso[1].slice(2)}`;
  return raw;
}

function FillerRow() {
  return (
    <tr className="pointer-events-none select-none bg-white even:bg-slate-50/40" aria-hidden>
      <Td align="center" className="w-10">
        <div className="h-11" />
      </Td>
      <Td className="!border-r-slate-200">
        <div className="h-11" />
      </Td>
      <Td align="center">
        <div className="h-11" />
      </Td>
      <Td align="center">
        <div className="h-11" />
      </Td>
      <Td align="right">
        <div className="h-11" />
      </Td>
      <Td align="right">
        <div className="h-11" />
      </Td>
      <Td align="right">
        <div className="h-11" />
      </Td>
      <Td align="center">
        <div className="h-11" />
      </Td>
    </tr>
  );
}
function rowSurfaceClass(selected, { entry = false } = {}) {
  return cn(
    'group transition-colors',
    entry && !selected && 'bg-slate-50/50',
    selected
      ? 'bg-emerald-50/90 shadow-[inset_0_0_0_1px_rgb(5_150_105_/_0.45)]'
      : !entry && 'bg-white even:bg-slate-50/40',
    !selected && 'hover:bg-slate-50',
  );
}

export function DispenseCartGrid({
  lines,
  cartFocus,
  entryRowVisible = true,
  maxCartRowIndex,
  taxRatesById,
  permissions,
  formatMoney,
  unitLabel = 'pcs',
  itemSearchRef,
  onSelectRow,
  onShowEntryRow,
  onUpdateLine,
  onUpdateDiscPercent,
  onRemoveLine,
  onPickProduct,
  onSetLineProduct,
  onSubmitRaw,
  getAvailableStock,
  warehouseId = null,
}) {
  const navMaxIndex = maxCartRowIndex ?? (entryRowVisible ? lines.length : Math.max(0, lines.length - 1));
  const contentRowCount = lines.length + (entryRowVisible ? 1 : 0);
  const scrollRef = useRef(null);
  const [fillerCount, setFillerCount] = useState(() =>
    Math.max(0, MIN_VISIBLE_ROWS - contentRowCount),
  );

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    const update = () => {
      const thead = el.querySelector('thead');
      const theadHeight = thead?.offsetHeight ?? CART_ROW_HEIGHT_PX;
      const available = Math.max(0, el.clientHeight - theadHeight);
      const targetRows = Math.max(
        MIN_VISIBLE_ROWS,
        Math.floor(available / CART_ROW_HEIGHT_PX),
      );
      setFillerCount(Math.max(0, targetRows - contentRowCount));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [contentRowCount]);

  return (
    <div className="flex h-full min-w-0 flex-col antialiased" style={{ fontFamily: GRID_FONT }}>
      <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-2.5">
        <div className="min-w-0 border-s-[3px] border-emerald-600 ps-2.5 sm:ps-3">
          <h2 className="text-[14px] font-semibold tracking-tight text-slate-900 sm:text-[15px]">
            Sale list
          </h2>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-[12px]">
            Scan barcode or search by medicine name
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto"
      >
        <table className="w-full min-w-[640px] table-fixed border-collapse text-[13px] text-slate-900">
            <colgroup>
              <col style={{ width: '2.5rem' }} />
              <col style={{ width: '36%' }} />
              <col style={{ width: '5.5rem' }} />
              <col style={{ width: '6.25rem' }} />
              <col style={{ width: '6.25rem' }} />
              <col style={{ width: '4.5rem' }} />
              <col style={{ width: '7.5rem' }} />
              <col style={{ width: '3rem' }} />
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr>
                <Th align="center" className="w-10 px-0">
                  <span className="sr-only">Row</span>
                </Th>
                <Th className="min-w-0 !border-r-slate-300/70">Product</Th>
                <Th align="right" className="w-[88px]" data-lookup-stop="qty">
                  Qty
                </Th>
                <Th align="center" className="w-[100px]">
                  Unit
                </Th>
                <Th align="right" className="w-[100px]">
                  Rate
                </Th>
                <Th align="right" className="w-[72px]">
                  Disc %
                </Th>
                <Th align="right" className="w-[120px]">
                  Total
                </Th>
                <Th align="center" className="w-12" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const selected = cartFocus === index;
                const warnings = getLineWarnings(line);
                const priceOverride = isPriceOverridden(line);
                const lineTot = lineTotal(line, taxRatesById);

                return (
                  <tr
                    key={line.key}
                    data-dispense-row={index}
                    className={cn('transition-colors', rowSurfaceClass(selected))}
                    onClick={() => onSelectRow(index)}
                  >
                    <Td align="center" selected={selected} lead className="w-10">
                      <CellText className="justify-center text-slate-400">
                        <GripVertical className="size-4" />
                      </CellText>
                    </Td>

                    <Td selected={selected} onClick={(e) => e.stopPropagation()} className="!border-r-slate-200 p-0">
                      <ItemNameSearchCell
                        rowIndex={index}
                        variant="cell"
                        lookupMode="sale"
                        selectedLabel={line.name}
                        selectedProductId={line.product_id || ''}
                        selectedImage={line.image_url}
                        getAvailableStock={getAvailableStock}
                        warehouseId={warehouseId}
                        selectedSub={
                          warnings.length > 0
                            ? warnings.map((w) => w.label).join(' · ')
                            : [line.generic_name, line.strength_text, batchLabel(line)]
                                .filter(Boolean)
                                .join(' · ')
                        }
                        onFocusRow={onSelectRow}
                        onNavigateRow={(delta) =>
                          navigateCartRow(index, delta, navMaxIndex, onSelectRow)
                        }
                        onSelect={(product) =>
                          (onSetLineProduct || onPickProduct)?.(index, product)
                        }
                        onSubmitRaw={(term) => onSubmitRaw?.(term, index)}
                        placeholder=""
                      />
                    </Td>

                    <Td selected={selected} onClick={(e) => e.stopPropagation()}>
                      <input
                        data-dispense-qty={index}
                        data-pharmacy-typing
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        pattern="[0-9]*"
                        className={cn(CELL_INPUT, 'text-right tabular-nums')}
                        value={line.quantity}
                        onChange={(e) =>
                          onUpdateLine(index, { quantity: sanitizeIntegerInput(e.target.value) })
                        }
                        {...gridFieldFocusProps(index, onSelectRow, { selectAll: true })}
                        onKeyDown={(e) => {
                          if (handleGridArrowNav(e, index, navMaxIndex, onSelectRow)) return;
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            e.stopPropagation();
                            focusRowField(
                              index,
                              e.shiftKey ? 'item' : 'price',
                              lines.length,
                            );
                            onSelectRow?.(index);
                            return;
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            focusNextProductRow(index, lines.length, onSelectRow, onShowEntryRow);
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
                    </Td>

                    <Td align="center" selected={selected}>
                      <CellText className="justify-center text-[12px] font-medium">
                        {formatLineUnitDisplay(line, unitLabel)}
                      </CellText>
                    </Td>

                    <Td selected={selected} onClick={(e) => e.stopPropagation()}>
                      <input
                        data-dispense-price={index}
                        data-pharmacy-typing
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        disabled={!permissions.can_edit_price}
                        className={cn(
                          CELL_INPUT,
                          'text-right tabular-nums',
                          priceOverride && 'bg-amber-50/90 text-amber-900',
                        )}
                        value={formatRateForDisplay(line.unit_price)}
                        onChange={(e) =>
                          onUpdateLine(index, {
                            unit_price: sanitizeDecimalInput(e.target.value, { maxDecimals: 2 }),
                          })
                        }
                        {...gridFieldFocusProps(index, onSelectRow)}
                        onKeyDown={(e) => {
                          if (handleGridArrowNav(e, index, navMaxIndex, onSelectRow)) return;
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            e.stopPropagation();
                            focusRowField(
                              index,
                              e.shiftKey ? 'qty' : 'disc',
                              lines.length,
                            );
                            onSelectRow?.(index);
                            return;
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            focusNextField(index, 'price', lines.length, onSelectRow, onShowEntryRow);
                            return;
                          }
                          if (
                            e.key.length === 1 &&
                            !/[\d.]/.test(e.key) &&
                            !e.ctrlKey &&
                            !e.metaKey
                          ) {
                            e.preventDefault();
                          }
                          if (e.key === '.' && String(line.unit_price).includes('.')) {
                            e.preventDefault();
                          }
                        }}
                      />
                    </Td>

                    <Td selected={selected} onClick={(e) => e.stopPropagation()}>
                      <input
                        data-dispense-disc={index}
                        data-pharmacy-typing
                        disabled={!permissions.can_discount}
                        placeholder="0"
                        className={cn(CELL_INPUT, 'text-right tabular-nums')}
                        value={line.discount_type === 'percent' ? line.discount || '0' : '0'}
                        onChange={(e) => onUpdateDiscPercent(index, e.target.value)}
                        {...gridFieldFocusProps(index, onSelectRow)}
                        onKeyDown={(e) => {
                          if (handleGridArrowNav(e, index, navMaxIndex, onSelectRow)) return;
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.shiftKey) {
                              focusRowField(index, 'price', lines.length);
                              onSelectRow?.(index);
                            } else {
                              focusNextProductRow(
                                index,
                                lines.length,
                                onSelectRow,
                                onShowEntryRow,
                              );
                            }
                            return;
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            focusNextProductRow(
                              index,
                              lines.length,
                              onSelectRow,
                              onShowEntryRow,
                            );
                          }
                        }}
                      />
                    </Td>

                    <Td align="right" selected={selected} className="!border-r-slate-200">
                      <CellText strong className="justify-end text-emerald-700">
                        {formatMoney(lineTot)}
                      </CellText>
                    </Td>

                    <Td align="center" selected={selected}>
                      <CellText className="justify-center">
                        <button
                          type="button"
                          title="Remove line (Ctrl+D)"
                          className="inline-flex size-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveLine(index);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </CellText>
                    </Td>
                  </tr>
                );
              })}

              {entryRowVisible ? (() => {
                const index = lines.length;
                const selected = cartFocus === index;
                return (
                  <tr
                    key="entry-row"
                    data-dispense-row={index}
                    data-entry-row="1"
                    className={cn('transition-colors', rowSurfaceClass(selected, { entry: true }))}
                    onClick={() => onSelectRow(index)}
                  >
                    <Td align="center" selected={selected} lead className="w-10">
                      <CellText className="justify-center text-slate-300">
                        <GripVertical className="size-4" />
                      </CellText>
                    </Td>
                    <Td selected={selected} className="!border-r-slate-200 p-0">
                      <ItemNameSearchCell
                        rowIndex={index}
                        variant="cell"
                        lookupMode="sale"
                        isEntrySlot
                        autoFocus={lines.length === 0}
                        inputRef={itemSearchRef}
                        getAvailableStock={getAvailableStock}
                        warehouseId={warehouseId}
                        onFocusRow={onSelectRow}
                        onNavigateRow={(delta) =>
                          navigateCartRow(index, delta, navMaxIndex, onSelectRow)
                        }
                        onSelect={(product) =>
                          (onSetLineProduct || onPickProduct)?.(index, product)
                        }
                        onSubmitRaw={(term) => onSubmitRaw?.(term)}
                        placeholder="Type or scan next medicine…"
                      />
                    </Td>
                    <Td colSpan={6} selected={selected} className="text-slate-400">
                      <CellText className="text-[12px] italic text-slate-400">
                        Enter on qty moves to the next line
                      </CellText>
                    </Td>
                  </tr>
                );
              })() : null}

              {Array.from({ length: fillerCount }, (_, i) => (
                <FillerRow key={`filler-${i}`} />
              ))}
            </tbody>
          </table>
      </div>

      <div className="flex shrink-0 flex-col gap-1 border-t border-slate-200 bg-slate-50/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
        <p className="hidden text-[11px] font-medium text-slate-500 md:block">
          <span className="font-semibold text-slate-700">Tab</span> moves across fields ·{' '}
          <span className="font-semibold text-slate-700">Enter</span> on qty adds next item
        </p>
        <p className="text-[11px] font-medium text-slate-500 sm:ms-auto">
          {lines.length ? `${lines.length} item${lines.length === 1 ? '' : 's'} in cart` : 'Cart empty'}
        </p>
      </div>
    </div>
  );
}
