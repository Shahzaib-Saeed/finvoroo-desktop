import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { applyPurchaseLineDefaults } from '../lib/pharmacy-purchase-defaults';
import { rememberOcrProductMapping } from '../lib/remember-ocr-product-mapping';
import {
  emptyExtractionRow,
  extractionRowToProductPrefill,
} from '../lib/purchase-extraction-adapter';
import { expiryDisplayMask } from '../lib/expiry-mask';
import { ItemNameSearchCell } from './ItemNameSearchCell';
import { ExpiryMaskInput } from './ExpiryMaskInput';
import { useProductDialog } from '@/components/workspace/product/product-dialog-provider';
import { productToPickerOption } from './CatalogueMatchPicker';
import { rowNeedsVerify } from '../lib/invoice-match-quality';
import { describeMatchDiagnostics } from '../lib/pharmacy-match-engine';
import {
  PURCHASE_CELL_INPUT,
  PURCHASE_CELL_NUMBER,
  PURCHASE_GRID_COLOR,
  PurchaseGridCellText,
  PurchaseGridTd,
  PurchaseGridTh,
  buildPurchaseCellEnterHandler,
  focusPurchaseField,
  focusPurchaseItem,
} from './purchase-grid-ui';

function isoToMask(value) {
  return expiryDisplayMask(value) || String(value || '');
}

/**
 * OCR invoice review grid — same spreadsheet UX as Create Purchase (Receive GRN).
 */
export function PurchaseExtractionGrid({
  rows,
  onChange,
  productOptions = [],
  disabled = false,
  pharmacySettings = {},
  hideAddButton = false,
  vendorId = 0,
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const productDialog = useProductDialog();

  const update = useCallback(
    (index, patch) => {
      onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    },
    [onChange, rows],
  );

  const remove = useCallback(
    (index) => {
      const next = rows.filter((_, i) => i !== index);
      onChange(next.length ? next : [emptyExtractionRow()]);
      setSelectedIdx((prev) => Math.max(0, Math.min(prev, next.length - 1)));
    },
    [onChange, rows],
  );

  const add = () => {
    onChange([...rows, applyPurchaseLineDefaults(emptyExtractionRow(), pharmacySettings)]);
    setSelectedIdx(rows.length);
  };

  const openCreateProduct = useCallback(
    (index, ctx) => {
      const row = rows[index];
      if (!row) return;
      const typedName = String(ctx?.typedName || row.product_description || '').trim();
      productDialog?.openCreate?.({
        skipTypePicker: true,
        type: 'inventory',
        prefill: extractionRowToProductPrefill({ ...row, product_description: typedName || row.product_description }),
        onSuccess: (saved) => {
          const opt = productToPickerOption(saved);
          if (!opt) return;
          const patch = applyPurchaseLineDefaults(
            {
              matched_product_id: Number(opt.value),
              matched_product_name: opt.label || '',
              matched_product_image: opt.image_url || '',
              match_status: 'matched',
              match_confidence: 1,
              match_user_confirmed: true,
              product_description: row.product_description || opt.label || '',
              batch_no: row.batch_no,
              expiry_date: row.expiry_date,
            },
            pharmacySettings,
          );
          update(index, patch);
          rememberOcrProductMapping({
            vendorId,
            invoiceLabel: row.product_description,
            productId: opt.value,
            itemCode: row.item_code,
          });
          toast.success(`Created & linked · ${opt.label}`);
          requestAnimationFrame(() => focusPurchaseField(index, 'batch'));
        },
      });
    },
    [pharmacySettings, productDialog, rows, update, vendorId],
  );

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'd') {
        if (e.target?.closest?.('[data-pharmacy-item-search]')) return;
        const rowEl = e.target?.closest?.('[data-extract-row]');
        const idx = rowEl ? Number(rowEl.getAttribute('data-extract-row')) : selectedIdx;
        if (!Number.isFinite(idx)) return;
        e.preventDefault();
        remove(idx);
        return;
      }

      if (e.target?.closest?.('[data-pharmacy-typing]')) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const inGrid = e.target?.closest?.('[data-extract-lines]');
        if (!inGrid) return;
        e.preventDefault();
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const next = Math.max(0, Math.min(rows.length - 1, selectedIdx + delta));
        setSelectedIdx(next);
        focusPurchaseItem(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [remove, rows.length, selectedIdx]);

  return (
    <div className="min-h-0">
      <div
        className="min-w-[720px] overflow-hidden border-b bg-white"
        style={{ borderColor: PURCHASE_GRID_COLOR }}
        data-extract-lines
      >
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col style={{ width: '2rem' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '5.5rem' }} />
            <col style={{ width: '5.5rem' }} />
            <col style={{ width: '4.75rem' }} />
            <col style={{ width: '3.75rem' }} />
            <col style={{ width: '3.5rem' }} />
            <col style={{ width: '4.5rem' }} />
            <col style={{ width: '3.5rem' }} />
            <col style={{ width: '4.5rem' }} />
            <col style={{ width: '3.5rem' }} />
            <col style={{ width: '4.5rem' }} />
            <col style={{ width: '4.5rem' }} />
            <col style={{ width: '2.25rem' }} />
          </colgroup>
          <thead className="sticky top-0 z-20">
            <tr>
              <PurchaseGridTh align="center">#</PurchaseGridTh>
              <PurchaseGridTh>Item name</PurchaseGridTh>
              <PurchaseGridTh align="center">Code</PurchaseGridTh>
              <PurchaseGridTh align="center">Batch</PurchaseGridTh>
              <PurchaseGridTh align="center">Expiry</PurchaseGridTh>
              <PurchaseGridTh align="center" data-lookup-stop="qty">Qty</PurchaseGridTh>
              <PurchaseGridTh
                align="center"
                title="Bonus / free quantity from the supplier. These units go into stock but you do not pay for them."
              >
                Bonus
              </PurchaseGridTh>
              <PurchaseGridTh align="right">Purchase price</PurchaseGridTh>
              <PurchaseGridTh align="center">Disc %</PurchaseGridTh>
              <PurchaseGridTh align="right">Disc amt</PurchaseGridTh>
              <PurchaseGridTh align="center">Tax%</PurchaseGridTh>
              <PurchaseGridTh align="right">Tax amt</PurchaseGridTh>
              <PurchaseGridTh align="right">Total</PurchaseGridTh>
              <PurchaseGridTh align="center" className="w-9 px-0">
                <span className="sr-only">Remove</span>
              </PurchaseGridTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const linked = Boolean(row.matched_product_id);
              const needsVerify = rowNeedsVerify(row);
              const catalogName = String(row.matched_product_name || '').trim();
              const billName = String(row.product_description || '').trim();
              const displayName = billName || catalogName;
              const selected = selectedIdx === index;
              const onCellEnter = buildPurchaseCellEnterHandler(index, rows.length, setSelectedIdx);

              const applyProduct = (product) => {
                const opt = productToPickerOption(product);
                if (!opt) return;
                const patch = applyPurchaseLineDefaults(
                  {
                    matched_product_id: Number(opt.value),
                    matched_product_name: opt.label || '',
                    matched_product_image: opt.image_url || '',
                    match_status: 'matched',
                    match_confidence: 1,
                    match_user_confirmed: true,
                    product_description: row.product_description || opt.label || '',
                    batch_no: row.batch_no,
                    expiry_date: row.expiry_date,
                  },
                  pharmacySettings,
                );
                update(index, patch);
                rememberOcrProductMapping({
                  vendorId,
                  invoiceLabel: row.product_description,
                  productId: opt.value,
                  itemCode: row.item_code,
                });
                requestAnimationFrame(() => focusPurchaseField(index, 'batch'));
              };

              return (
                <tr
                  key={index}
                  data-extract-row={index}
                  data-grn-row={index}
                  onClick={() => setSelectedIdx(index)}
                  className={cn(
                    'group scroll-mt-11 transition-colors',
                    selected ? 'bg-emerald-50/80' : 'hover:bg-slate-50/80',
                    !linked && 'bg-red-50/25',
                    linked && needsVerify && 'bg-amber-50/30',
                    linked && !needsVerify && 'bg-emerald-50/35',
                  )}
                >
                  <PurchaseGridTd align="center">
                    <PurchaseGridCellText align="center" className="text-slate-500">
                      {index + 1}
                    </PurchaseGridCellText>
                  </PurchaseGridTd>

                  <PurchaseGridTd onClick={(e) => e.stopPropagation()}>
                    <ItemNameSearchCell
                      rowIndex={index}
                      variant="cell"
                      selectedLabel={displayName}
                      selectedProductId={row.matched_product_id ? String(row.matched_product_id) : ''}
                      selectedImage={row.matched_product_image || ''}
                      billLabel={billName}
                      catalogLabel={linked ? catalogName : ''}
                      learnedName={row.global_corrected_name || ''}
                      matchExplanation={describeMatchDiagnostics(row.match_diagnostics)}
                      invoiceMatchMode
                      linked={linked}
                      needsVerify={needsVerify}
                      needsMatch={!linked}
                      highlightUnmatched
                      blockZeroStock={false}
                      disabled={disabled}
                      placeholder={row.product_description ? String(row.product_description) : 'Type item name…'}
                      onFocusRow={setSelectedIdx}
                      onNavigateRow={(delta) => {
                        const next = Math.max(0, Math.min(rows.length - 1, index + delta));
                        setSelectedIdx(next);
                        focusPurchaseItem(next);
                      }}
                      onEnterNext={() => focusPurchaseField(index, 'code')}
                      onSelect={(product) => applyProduct(product)}
                      onCreateNew={openCreateProduct}
                      keyboardBrowseMode
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd>
                    <Input
                      data-grn-field={`code-${index}`}
                      data-pharmacy-typing
                      className={PURCHASE_CELL_INPUT}
                      value={row.item_code}
                      disabled={disabled}
                      onChange={(e) => update(index, { item_code: e.target.value })}
                      onKeyDown={(e) => onCellEnter(e, 'batch')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd>
                    <Input
                      data-grn-field={`batch-${index}`}
                      data-pharmacy-typing
                      className={PURCHASE_CELL_INPUT}
                      value={row.batch_no}
                      disabled={disabled}
                      placeholder={
                        pharmacySettings.default_batch_when_missing &&
                        !String(row.batch_no || '').trim()
                          ? String(pharmacySettings.default_batch_when_missing)
                          : 'Batch'
                      }
                      onChange={(e) => update(index, { batch_no: e.target.value })}
                      onKeyDown={(e) => onCellEnter(e, 'expiry')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd>
                    <ExpiryMaskInput
                      data-grn-field={`expiry-${index}`}
                      data-pharmacy-typing
                      className={PURCHASE_CELL_INPUT}
                      value={isoToMask(row.expiry_date)}
                      disabled={disabled}
                      placeholder={
                        pharmacySettings.default_expiry_when_missing &&
                        !String(row.expiry_date || '').trim()
                          ? expiryDisplayMask(pharmacySettings.default_expiry_when_missing) ||
                            String(pharmacySettings.default_expiry_when_missing)
                          : 'MM/YY'
                      }
                      onChange={(masked) => update(index, { expiry_date: masked })}
                      onKeyDown={(e) => onCellEnter(e, 'qty')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd>
                    <Input
                      data-grn-field={`qty-${index}`}
                      data-pharmacy-typing
                      className={PURCHASE_CELL_NUMBER}
                      value={row.qty}
                      disabled={disabled}
                      onChange={(e) => update(index, { qty: e.target.value })}
                      onKeyDown={(e) => onCellEnter(e, 'bonus')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd
                    className={
                      Number(row.bonus) > 0
                        ? 'bg-sky-50 shadow-[inset_0_0_0_2px_#0284c7]'
                        : undefined
                    }
                    title={
                      Number(row.bonus) > 0
                        ? 'This line includes free/bonus units. They go into stock; you do not pay for them.'
                        : undefined
                    }
                  >
                    <Input
                      data-grn-field={`bonus-${index}`}
                      data-pharmacy-typing
                      className={cn(
                        PURCHASE_CELL_NUMBER,
                        Number(row.bonus) > 0 && 'bg-sky-50 font-semibold text-sky-950 focus:bg-sky-50',
                      )}
                      value={row.bonus}
                      disabled={disabled}
                      onChange={(e) => update(index, { bonus: e.target.value })}
                      onKeyDown={(e) => onCellEnter(e, 'trade_price')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd align="right">
                    <Input
                      data-grn-field={`trade_price-${index}`}
                      data-pharmacy-typing
                      className={PURCHASE_CELL_NUMBER}
                      value={row.trade_price}
                      disabled={disabled}
                      onChange={(e) => update(index, { trade_price: e.target.value })}
                      onKeyDown={(e) => onCellEnter(e, 'discount_percent')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd>
                    <Input
                      data-grn-field={`discount_percent-${index}`}
                      data-pharmacy-typing
                      className={PURCHASE_CELL_NUMBER}
                      value={row.discount_percent}
                      disabled={disabled}
                      onChange={(e) => update(index, { discount_percent: e.target.value })}
                      onKeyDown={(e) => onCellEnter(e, 'discount_amount')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd align="right">
                    <Input
                      data-grn-field={`discount_amount-${index}`}
                      data-pharmacy-typing
                      className={PURCHASE_CELL_NUMBER}
                      value={row.discount_amount}
                      disabled={disabled}
                      onChange={(e) => update(index, { discount_amount: e.target.value })}
                      onKeyDown={(e) => onCellEnter(e, 'tax_percent')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd>
                    <Input
                      data-grn-field={`tax_percent-${index}`}
                      data-pharmacy-typing
                      className={PURCHASE_CELL_NUMBER}
                      value={row.tax_percent}
                      disabled={disabled}
                      onChange={(e) => update(index, { tax_percent: e.target.value })}
                      onKeyDown={(e) => onCellEnter(e, 'tax_amount')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd align="right">
                    <Input
                      data-grn-field={`tax_amount-${index}`}
                      data-pharmacy-typing
                      className={PURCHASE_CELL_NUMBER}
                      value={row.tax_amount}
                      disabled={disabled}
                      onChange={(e) => update(index, { tax_amount: e.target.value })}
                      onKeyDown={(e) => onCellEnter(e, 'line_total')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd align="right">
                    <Input
                      data-grn-field={`line_total-${index}`}
                      data-pharmacy-typing
                      className={cn(PURCHASE_CELL_NUMBER, 'font-medium')}
                      value={row.line_total}
                      disabled={disabled}
                      onChange={(e) => update(index, { line_total: e.target.value })}
                      onKeyDown={(e) => onCellEnter(e, 'next-row')}
                    />
                  </PurchaseGridTd>

                  <PurchaseGridTd align="center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      mode="icon"
                      className="size-11 rounded-none text-slate-400 hover:bg-red-50 hover:text-red-600"
                      disabled={disabled}
                      onClick={() => remove(index)}
                      title="Remove (Ctrl+D)"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </PurchaseGridTd>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!hideAddButton ? (
        <div className="border-t border-slate-100 px-4 py-2">
          <Button type="button" variant="outline" size="sm" className="h-8" disabled={disabled} onClick={add}>
            <Plus className="size-3.5 me-1" />
            Add row
          </Button>
        </div>
      ) : null}
    </div>
  );
}
