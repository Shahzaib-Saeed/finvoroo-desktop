import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ItemNameSearchCell } from './ItemNameSearchCell';
import { getLineWarnings, isPriceOverridden, lineTotal, formatLineUnitDisplay, formatRateForDisplay, sanitizeIntegerInput, sanitizeDecimalInput } from '../lib/pharmacy-cart';

const GRID_FONT =
  "Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

const CELL_INPUT =
  'h-12 w-full min-h-12 border-0 rounded-none shadow-none bg-transparent px-3 text-[14px] font-bold leading-snug text-black outline-none placeholder:text-black/70 focus:bg-transparent focus:ring-0 focus-visible:!outline-none disabled:opacity-50';

function Th({ children, align = 'left', className, ...rest }) {
  return (
    <th
      {...rest}
      className={cn(
        'border border-slate-400 bg-emerald-800 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white whitespace-nowrap',
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

function Td({ children, className, align = 'left', onClick, style, selected = false, lead = false }) {
  return (
    <td
      onClick={onClick}
      style={{
        ...style,
        ...(selected && lead ? { boxShadow: 'inset 4px 0 0 0 #065f46' } : null),
      }}
      className={cn(
        'border border-slate-400 p-0 align-middle text-black',
        selected ? 'bg-emerald-100' : 'bg-white',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

function CellText({ children, className }) {
  return (
    <div className={cn('flex h-12 items-center px-3 text-[14px] font-semibold leading-snug text-black', className)}>
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
function rowHighlightClass(selected) {
  if (!selected) return 'hover:[&>td]:bg-emerald-50';
  return '[&>td]:!bg-emerald-100';
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
  const slotCount = lines.length + (entryRowVisible ? 1 : 0);
  const navMaxIndex = maxCartRowIndex ?? (entryRowVisible ? lines.length : Math.max(0, lines.length - 1));

  return (
    <div className="flex h-full min-w-0 flex-col antialiased" style={{ fontFamily: GRID_FONT }}>
      <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-3.5">
        <div>
          <h2 className="text-[16px] font-bold tracking-tight text-black">Sale list</h2>
          <p className="mt-0.5 text-[13px] font-medium text-black">
            Scan barcode or search by medicine name
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-3 py-1 text-[12px] font-bold text-white">
          <span>Lines</span>
          <span className="tabular-nums">{lines.length}</span>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="overflow-hidden border border-slate-400 bg-white">
          <table className="w-full table-fixed border-collapse text-[14px] text-black">
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
                <Th className="min-w-0">Product</Th>
                <Th align="center" className="w-[88px]" data-lookup-stop="qty">
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
              {Array.from({ length: slotCount }, (_, index) => {
                const line = lines[index] || null;
                const selected = cartFocus === index;
                const isEmpty = !line;

                if (isEmpty) {
                  return (
                    <tr
                      key={`empty-${index}`}
                      data-dispense-row={index}
                      className={cn('transition-colors', rowHighlightClass(selected))}
                      onClick={() => onSelectRow(index)}
                    >
                      <Td align="center" selected={selected} lead className="w-10">
                        <CellText className="justify-center text-black">
                          <GripVertical className="size-4" />
                        </CellText>
                      </Td>
                      <Td selected={selected} className="p-0">
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
                          placeholder=""
                        />
                      </Td>
                      <Td align="center" selected={selected}>
                        <CellText className="justify-center tabular-nums">—</CellText>
                      </Td>
                      <Td align="center" selected={selected}>
                        <CellText className="justify-center">—</CellText>
                      </Td>
                      <Td align="right" selected={selected}>
                        <CellText className="justify-end tabular-nums">—</CellText>
                      </Td>
                      <Td align="right" selected={selected}>
                        <CellText className="justify-end tabular-nums">—</CellText>
                      </Td>
                      <Td align="right" selected={selected}>
                        <CellText className="justify-end font-bold tabular-nums text-black">
                          {formatMoney(0)}
                        </CellText>
                      </Td>
                      <Td selected={selected} />
                    </tr>
                  );
                }

                const warnings = getLineWarnings(line);
                const priceOverride = isPriceOverridden(line);
                const lineTot = lineTotal(line, taxRatesById);

                return (
                  <tr
                    key={line.key}
                    data-dispense-row={index}
                    className={cn('transition-colors', rowHighlightClass(selected))}
                    onClick={() => onSelectRow(index)}
                  >
                    <Td align="center" selected={selected} lead className="w-10">
                      <CellText className="justify-center text-black">
                        <GripVertical className="size-4" />
                      </CellText>
                    </Td>

                    <Td selected={selected} onClick={(e) => e.stopPropagation()} className="p-0">
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
                            : [line.generic_name, line.strength_text]
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
                        className={cn(CELL_INPUT, 'text-center text-[14px] font-bold tabular-nums')}
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
                          'text-right font-semibold tabular-nums',
                          priceOverride && 'bg-amber-50 text-amber-800',
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
                        className={cn(CELL_INPUT, 'text-right font-bold tabular-nums')}
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

                    <Td align="right" selected={selected}>
                      <CellText className="justify-end text-[14px] font-bold tabular-nums text-black">
                        {formatMoney(lineTot)}
                      </CellText>
                    </Td>

                    <Td align="center" selected={selected}>
                      <CellText className="justify-center">
                        <button
                          type="button"
                          title="Remove line (Ctrl+D)"
                          className="inline-flex size-8 items-center justify-center rounded-md text-black hover:bg-rose-100 hover:text-rose-700"
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
