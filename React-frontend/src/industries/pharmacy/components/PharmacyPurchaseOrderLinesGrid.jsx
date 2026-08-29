import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProductDialog } from '@/components/workspace/product/product-dialog-provider';
import { calcLineTotals, NO_NUMBER_SPINNER } from '@/pages/accounting/invoices/constants';
import { cn } from '@/lib/utils';
import { ItemNameSearchCell } from './ItemNameSearchCell';
import { prefetchMedicineCatalog } from '../lib/medicine-catalog-cache';
import { resolveProductImage } from '../lib/upload-medicine-image';

const ROW_H = 'h-11 min-h-11';
const PURCHASE_CELL_INPUT = cn(
  ROW_H,
  'w-full border-0 rounded-none shadow-none bg-white px-2.5 text-[13px] tabular-nums leading-snug text-slate-900 outline-none focus:bg-emerald-50/90 focus:ring-2 focus:ring-inset focus:ring-emerald-500/35 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
);
const PURCHASE_CELL_NUMBER = cn(PURCHASE_CELL_INPUT, NO_NUMBER_SPINNER);
const READONLY_CELL = cn(
  ROW_H,
  'flex items-center bg-[var(--grn-readonly-bg,#f1f5f9)] px-2.5 text-[13px] tabular-nums leading-snug text-slate-700',
);

function moneyPlain(v, digits = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function GrnTh({ children, align = 'left', className, ...rest }) {
  return (
    <th
      {...rest}
      className={cn('sticky top-0 z-20 border-b border-r p-0 last:border-r-0', className)}
      style={{
        borderColor: 'rgba(255,255,255,0.15)',
        background: '#047857',
      }}
    >
      <div
        className={cn(
          'flex min-h-[2.75rem] items-center px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/95',
          align === 'right' && 'justify-end text-right',
          align === 'center' && 'justify-center text-center',
          align === 'left' && 'justify-start text-left',
        )}
      >
        {children}
      </div>
    </th>
  );
}

function GrnTd({ children, className, align = 'left', onClick }) {
  return (
    <td
      onClick={onClick}
      style={{ borderColor: 'var(--grn-cell-border, #e2e8f0)' }}
      className={cn(
        'border-b border-r p-0 align-middle last:border-r-0',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

function ReadonlyCell({ children, align = 'right', className, tone, title }) {
  return (
    <GrnTd align={align} title={title}>
      <div
        title={title}
        className={cn(
          READONLY_CELL,
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center',
          tone === 'strong' && 'font-semibold text-slate-800',
          className,
        )}
      >
        {children}
      </div>
    </GrnTd>
  );
}

function productSub(product) {
  if (!product) return '';
  return [
    product.pharmacy?.generic_name || product.generic,
    product.pharmacy?.strength_text || product.strength,
  ]
    .filter(Boolean)
    .join(' · ');
}

function focusPoField(index, field) {
  requestAnimationFrame(() => {
    document.querySelector(`[data-po-field="${field}-${index}"]`)?.focus?.({ preventScroll: true });
  });
}

function focusPoItem(index) {
  requestAnimationFrame(() => {
    const el =
      document.querySelector(`input[data-grn-item="${index}"]`) ||
      document.querySelector(`[data-grn-item="${index}"]`);
    el?.focus?.({ preventScroll: true });
  });
}

export function PharmacyPurchaseOrderLinesGrid({
  lines,
  productsById,
  taxRatesById,
  canCreateProduct,
  readOnly,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
  onUpdateLineDiscountPercent,
  onSelectProduct,
}) {
  const productDialog = useProductDialog();
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    prefetchMedicineCatalog();
  }, []);

  useEffect(() => {
    if (readOnly || !onAddLine) return;
    const last = lines[lines.length - 1];
    if (last?.product_id) onAddLine();
  }, [lines, onAddLine, readOnly]);

  const filledCount = useMemo(
    () => lines.filter((l) => l.product_id || String(l.description || '').trim()).length,
    [lines],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-po-lines>
      <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
        <colgroup>
          <col style={{ width: '2.25rem' }} />
          <col />
          <col style={{ width: '5rem' }} />
          <col style={{ width: '7rem' }} />
          <col style={{ width: '4.25rem' }} />
          <col style={{ width: '5.5rem' }} />
          <col style={{ width: '5.5rem' }} />
          <col style={{ width: '6.5rem' }} />
          <col style={{ width: '2.25rem' }} />
        </colgroup>
        <thead>
          <tr>
            <GrnTh align="center">#</GrnTh>
            <GrnTh>Item</GrnTh>
            <GrnTh align="center">Qty</GrnTh>
            <GrnTh align="right">Purchase price</GrnTh>
            <GrnTh align="center" title="Discount percent">
              Disc %
            </GrnTh>
            <GrnTh align="right">Disc amt</GrnTh>
            <GrnTh align="right">Tax</GrnTh>
            <GrnTh align="right">Amount</GrnTh>
            <GrnTh align="center" className="w-9 px-0">
              <span className="sr-only">Remove</span>
            </GrnTh>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const product = productsById?.[String(line.product_id)] || null;
            const filled = Boolean(line.product_id);
            const isBlank = !filled && !String(line.description || '').trim();
            const editable = !readOnly && (filled || isBlank);
            const selected = selectedIdx === index;
            const amounts = calcLineTotals(line, taxRatesById);
            const displayName = String(line.description || product?.name || '').trim();
            const onCellEnter = (e, nextField) => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const next = Math.max(0, Math.min(lines.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)));
                setSelectedIdx(next);
                focusPoItem(next);
                return;
              }
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (nextField === 'next-row') {
                const next = Math.min(lines.length - 1, index + 1);
                setSelectedIdx(next);
                focusPoItem(next);
                return;
              }
              focusPoField(index, nextField);
            };

            return (
              <tr
                key={index}
                data-grn-row={index}
                onClick={() => setSelectedIdx(index)}
                className={cn(
                  'group scroll-mt-11 transition-colors',
                  selected ? 'bg-emerald-50/70' : index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white',
                  'hover:bg-emerald-50/40',
                )}
              >
                <GrnTd align="center">
                  <div className={cn(READONLY_CELL, 'justify-center bg-transparent text-slate-500')}>
                    {index + 1}
                  </div>
                </GrnTd>
                <GrnTd onClick={(e) => e.stopPropagation()}>
                  <ItemNameSearchCell
                    rowIndex={index}
                    variant="cell"
                    selectedLabel={displayName}
                    selectedProductId={line.product_id || ''}
                    selectedImage={resolveProductImage(product || line) || ''}
                    selectedSub={productSub(product)}
                    linked={filled}
                    needsMatch={!filled && !isBlank}
                    blockZeroStock={false}
                    keyboardBrowseMode={filled}
                    autoFocus={isBlank && index === 0}
                    disabled={readOnly}
                    onFocusRow={setSelectedIdx}
                    onNavigateRow={(delta) => {
                      const next = Math.max(0, Math.min(lines.length - 1, index + delta));
                      setSelectedIdx(next);
                      focusPoItem(next);
                    }}
                    onSelect={(picked, rowIndex) => {
                      if (!picked?.id) return;
                      onSelectProduct(rowIndex, String(picked.id), picked);
                      requestAnimationFrame(() => focusPoField(rowIndex, 'qty'));
                    }}
                    onCreateNew={
                      canCreateProduct && !readOnly
                        ? (rowIndex, ctx) => {
                            productDialog?.openCreate?.({
                              skipTypePicker: true,
                              type: 'inventory',
                              prefill: { name: String(ctx?.typedName || '').trim() },
                              onSuccess: (saved) => {
                                if (saved?.id) {
                                  onSelectProduct(rowIndex, String(saved.id), saved);
                                  requestAnimationFrame(() => focusPoField(rowIndex, 'qty'));
                                }
                              },
                            });
                          }
                        : undefined
                    }
                    placeholder="Type item name…"
                  />
                </GrnTd>
                <GrnTd>
                  <Input
                    data-po-field={`qty-${index}`}
                    className={PURCHASE_CELL_NUMBER}
                    value={isBlank ? '' : line.quantity}
                    onChange={(e) => onUpdateLine(index, 'quantity', e.target.value)}
                    onKeyDown={(e) => onCellEnter(e, 'rate')}
                    disabled={!editable || isBlank}
                  />
                </GrnTd>
                <GrnTd>
                  <Input
                    data-po-field={`rate-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    className={PURCHASE_CELL_NUMBER}
                    value={isBlank ? '' : line.unit_price}
                    onChange={(e) => onUpdateLine(index, 'unit_price', e.target.value)}
                    onKeyDown={(e) => onCellEnter(e, 'disc')}
                    disabled={!editable || isBlank}
                    title="Purchase price per unit from the supplier"
                  />
                </GrnTd>
                <GrnTd>
                  <Input
                    data-po-field={`disc-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    className={PURCHASE_CELL_NUMBER}
                    value={isBlank ? '' : line.discount}
                    onChange={(e) => onUpdateLineDiscountPercent(index, e.target.value)}
                    onKeyDown={(e) => onCellEnter(e, 'next-row')}
                    disabled={!editable || isBlank}
                  />
                </GrnTd>
                <ReadonlyCell>{!isBlank ? moneyPlain(amounts.discount) : ''}</ReadonlyCell>
                <ReadonlyCell title="Tax on this line">{!isBlank ? moneyPlain(amounts.tax) : ''}</ReadonlyCell>
                <ReadonlyCell tone="strong" title="Line total including tax">
                  {!isBlank ? moneyPlain(amounts.total) : ''}
                </ReadonlyCell>
                <GrnTd align="center">
                  {!isBlank && !readOnly ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-slate-400 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveLine(index);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </GrnTd>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filledCount > 0 ? (
        <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-500">
          {filledCount} {filledCount === 1 ? 'medicine' : 'medicines'} · Enter next field · Arrow keys move rows
        </p>
      ) : null}
    </div>
  );
}
