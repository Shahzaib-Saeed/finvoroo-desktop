import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  buildProductComboboxOptions,
  productPickerLabel,
} from '@/components/workspace/product/lib/product-picker';
import {
  LINE_CELL_INPUT,
  LINE_CELL_INPUT_NUMBER,
  NO_NUMBER_SPINNER,
  productTracksStock,
} from '@/pages/accounting/invoices/constants';
import { INVOICE_LINE_ROW_H } from '@/pages/accounting/invoices/components/invoice-line-column-layout';
import { cn } from '@/lib/utils';
import { UnitPickerCell } from '@/components/workspace/product/components/UnitPickerCell';
import {
  computeClientShortages,
  formatCurrency,
  isMaterialRowMeaningful,
  materialQtyForCalc,
  materialsCost,
  productPickerSubtitle,
} from '../constants';

const ROW_H = INVOICE_LINE_ROW_H;
const CELL = cn(LINE_CELL_INPUT, ROW_H);
const CELL_NUM = cn(LINE_CELL_INPUT_NUMBER, ROW_H, 'text-center tabular-nums');
const NONE = '_none';

const TH =
  'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground py-1.5 border-r last:border-r-0 whitespace-nowrap leading-tight';

function formatStock(value, unitLabel) {
  const n = Number(value) || 0;
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

function productStock(product) {
  return Number(
    product?.available_stock ??
      product?.current_stock ??
      product?.quantity_on_hand ??
      product?.stock ??
      0,
  );
}

function MaterialProductLabel({ product, compact = false }) {
  if (!product) return null;
  const tracks = productTracksStock(product);
  const stock = productStock(product);
  const stockValue = tracks ? formatStock(stock, product?.unit_label) : '—';
  const stockClass = !tracks
    ? 'text-muted-foreground'
    : stock > 0
      ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-destructive';
  const subtitle = compact ? '' : productPickerSubtitle(product);

  return (
    <div className={cn('flex w-full min-w-0 items-center gap-2', compact && 'w-full')}>
      <div className="flex-1 min-w-0 text-left">
        <div className="truncate text-xs">{productPickerLabel(product)}</div>
        {subtitle ? (
          <div className="truncate text-[10px] text-muted-foreground">SKU: {subtitle}</div>
        ) : null}
      </div>
      <span
        className={cn(
          'shrink-0 text-right text-[11px] font-medium tabular-nums',
          stockClass,
        )}
      >
        {tracks ? stockValue : '—'}
      </span>
    </div>
  );
}

function resolveProduct(row, rawProducts) {
  if (!row.product_id) return null;
  return rawProducts.find((p) => String(p.id) === String(row.product_id)) || null;
}

export function ProductionMaterialsGrid({
  materials,
  rawProducts,
  loadingBom,
  onAddRow,
  onUpdate,
  onRemove,
  onLoadBom,
  onSaveBom,
  readOnly,
}) {
  const matCost = materialsCost(materials);
  const shortages = computeClientShortages(materials);
  const rows = materials || [];
  const productOptions = buildProductComboboxOptions(rawProducts);

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-foreground/[0.09] bg-gradient-to-b from-muted/60 to-muted/30 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Line items</h3>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 bg-background/80 flex-1 sm:flex-none"
              onClick={onLoadBom}
              disabled={loadingBom}
            >
              {loadingBom ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Load BOM
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 bg-background/80 flex-1 sm:flex-none"
              onClick={onSaveBom}
            >
              Save BOM
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddRow}
              className="shrink-0 w-full sm:w-auto bg-background/80"
            >
              <Plus className="size-4 mr-1" />
              Add line
            </Button>
          </div>
        )}
      </div>

      {shortages.length > 0 && (
        <div className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium mb-1.5">Stock shortage (save still allowed)</p>
          <ul className="list-disc ps-5 space-y-0.5 text-amber-900/90">
            {shortages.map((s) => (
              <li key={s.product_id}>
                {s.name}: need {s.required}, have {s.available} (short {s.short})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3 px-4 sm:px-5 py-4 sm:py-5">
        {/* Mobile */}
        <div className="md:hidden space-y-3">
          {rows.map((row, idx) => {
            const q = materialQtyForCalc(row);
            const uc = parseFloat(row.unit_cost) || 0;
            const product = resolveProduct(row, rawProducts);

            return (
              <div
                key={idx}
                className="rounded-xl border border-foreground/[0.14] bg-background p-4 space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Line {idx + 1}
                  </span>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive/70 hover:text-destructive"
                      onClick={() => onRemove(idx)}
                      disabled={rows.length <= 1}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Product</Label>
                  {readOnly ? (
                    <p className="text-sm">{product ? productPickerLabel(product) : '—'}</p>
                  ) : (
                    <SearchableCombobox
                      value={row.product_id ? String(row.product_id) : ''}
                      onValueChange={(v) => {
                        if (!v || v === NONE) onUpdate(idx, 'product_id', '');
                        else onUpdate(idx, 'product_id', v);
                      }}
                      options={productOptions}
                      placeholder="Product / material"
                      searchPlaceholder="Search materials…"
                      triggerClassName="h-10 w-full text-sm"
                      contentClassName="max-h-56 min-w-[calc(100vw-2rem)]"
                      allowNone
                      noneValue={NONE}
                      noneLabel="No product — custom description"
                      renderValue={(option) =>
                        option?.product ? (
                          <MaterialProductLabel product={option.product} compact />
                        ) : product ? (
                          <MaterialProductLabel product={product} compact />
                        ) : null
                      }
                      renderOption={(option) =>
                        option?.product ? (
                          <MaterialProductLabel product={option.product} />
                        ) : (
                          <span className="truncate text-xs">{option.label}</span>
                        )
                      }
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  {readOnly ? (
                    <p className="text-sm">{row.name || '—'}</p>
                  ) : (
                    <Input
                      className="h-10 text-sm"
                      value={row.name || ''}
                      onChange={(e) => onUpdate(idx, 'name', e.target.value)}
                      placeholder="Description or custom material name"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    {readOnly ? (
                      <p className="text-sm tabular-nums text-right">{q || '—'}</p>
                    ) : (
                      <Input
                        type="text"
                        inputMode="numeric"
                        className={cn('h-10 text-sm tabular-nums text-right', NO_NUMBER_SPINNER)}
                        placeholder="1"
                        value={
                          row.quantity === '' || row.quantity == null
                            ? ''
                            : String(row.quantity)
                        }
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (raw === '' || /^\d+$/.test(raw)) onUpdate(idx, 'quantity', raw);
                        }}
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Unit</Label>
                    {readOnly ? (
                      <p className="text-sm text-right">{product?.unit_label || '—'}</p>
                    ) : (
                      <UnitPickerCell
                        line={row}
                        product={product}
                        onChange={(v) => onUpdate(idx, 'entered_unit', v)}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Unit cost</Label>
                  {readOnly ? (
                    <p className="text-sm tabular-nums text-right">{formatCurrency(uc)}</p>
                  ) : (
                    <Input
                      type="text"
                      inputMode="decimal"
                      className={cn('h-10 text-sm tabular-nums text-right', NO_NUMBER_SPINNER)}
                      placeholder="0.00"
                      value={
                        row.unit_cost === '' || row.unit_cost == null
                          ? ''
                          : String(row.unit_cost)
                      }
                      onChange={(e) => onUpdate(idx, 'unit_cost', e.target.value)}
                    />
                  )}
                </div>
                <div className="flex justify-between text-sm border-t border-dashed border-foreground/10 pt-2">
                  <span className="text-muted-foreground">Line total</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {isMaterialRowMeaningful(row) && q > 0 ? formatCurrency(q * uc) : '—'}
                  </span>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground text-end tabular-nums px-1">
            Materials subtotal:{' '}
            <span className="font-medium text-foreground">{formatCurrency(matCost)}</span>
          </p>
        </div>

        {/* Desktop — same chrome as InvoiceLinesGrid */}
        <div className="hidden md:block rounded-xl border border-foreground/[0.14] bg-background overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full text-xs border-collapse invoice-erp-lines-grid min-w-[880px]">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                {!readOnly && <col style={{ width: '8%' }} />}
              </colgroup>
              <thead>
                <tr className="bg-muted/50 border-b border-foreground/[0.09]">
                  <th className={cn(TH, 'text-left px-1.5')}>Product</th>
                  <th className={cn(TH, 'text-left px-1.5')}>Description</th>
                  <th className={cn(TH, 'text-center px-1')}>Qty</th>
                  <th className={cn(TH, 'text-center px-0.5')}>Unit</th>
                  <th className={cn(TH, 'text-center px-1')}>Unit cost</th>
                  <th className={cn(TH, 'text-center px-1')}>Line total</th>
                  {!readOnly && (
                    <th className={cn(TH, 'text-center px-0.5')}>
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const q = materialQtyForCalc(row);
                  const uc = parseFloat(row.unit_cost) || 0;
                  const meaningful = isMaterialRowMeaningful(row);
                  const product = resolveProduct(row, rawProducts);

                  return (
                    <tr
                      key={idx}
                      className="border-b last:border-b-0 group hover:bg-muted/15"
                    >
                      <td className="p-0 align-middle border-r last:border-r-0">
                        {readOnly ? (
                          <div className={cn(CELL, 'flex items-center px-2')}>
                            <span className="truncate text-xs">
                              {product ? productPickerLabel(product) : row.name || '—'}
                            </span>
                          </div>
                        ) : (
                          <SearchableCombobox
                            value={row.product_id ? String(row.product_id) : ''}
                            onValueChange={(v) => {
                              if (!v || v === NONE) onUpdate(idx, 'product_id', '');
                              else onUpdate(idx, 'product_id', v);
                            }}
                            options={productOptions}
                            placeholder="Product / material"
                            searchPlaceholder="Search materials…"
                            triggerClassName={cn(CELL, 'border-0 shadow-none w-full')}
                            contentClassName="min-w-[26rem] max-h-64"
                            allowNone
                            noneValue={NONE}
                            noneLabel="No product — custom description"
                            renderValue={(option) =>
                              option?.product ? (
                                <MaterialProductLabel product={option.product} compact />
                              ) : product ? (
                                <MaterialProductLabel product={product} compact />
                              ) : null
                            }
                            renderOption={(option) =>
                              option?.product ? (
                                <MaterialProductLabel product={option.product} />
                              ) : (
                                <span className="truncate text-xs text-muted-foreground">
                                  {option.label}
                                </span>
                              )
                            }
                          />
                        )}
                      </td>
                      <td className="p-0 align-middle border-r last:border-r-0 align-top">
                        {readOnly ? (
                          <div className={cn(CELL, 'flex items-center px-2 truncate')}>
                            {row.name || '—'}
                          </div>
                        ) : (
                          <Input
                            className={cn(CELL, 'placeholder:text-muted-foreground/60')}
                            value={row.name || ''}
                            onChange={(e) => onUpdate(idx, 'name', e.target.value)}
                            placeholder="Description or custom material name"
                          />
                        )}
                      </td>
                      <td className="p-0 align-middle border-r last:border-r-0">
                        {readOnly ? (
                          <div className={cn(CELL_NUM, 'flex items-center justify-center')}>
                            {q || '—'}
                          </div>
                        ) : (
                          <Input
                            type="text"
                            inputMode="numeric"
                            className={CELL_NUM}
                            placeholder="1"
                            value={
                              row.quantity === '' || row.quantity == null
                                ? ''
                                : String(row.quantity)
                            }
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              if (raw === '' || /^\d+$/.test(raw)) onUpdate(idx, 'quantity', raw);
                            }}
                          />
                        )}
                      </td>
                      <td className="p-0 align-middle border-r last:border-r-0">
                        {readOnly ? (
                          <div className={cn(ROW_H, 'flex items-center justify-center')}>
                            <span className="text-[11px] text-muted-foreground truncate px-1">
                              {product?.unit_label || '—'}
                            </span>
                          </div>
                        ) : (
                          <UnitPickerCell
                            line={row}
                            product={product}
                            onChange={(v) => onUpdate(idx, 'entered_unit', v)}
                          />
                        )}
                      </td>
                      <td className="p-0 align-middle border-r last:border-r-0">
                        {readOnly ? (
                          <div className={cn(CELL_NUM, 'flex items-center justify-center font-medium')}>
                            {formatCurrency(uc)}
                          </div>
                        ) : (
                          <Input
                            type="text"
                            inputMode="decimal"
                            className={CELL_NUM}
                            placeholder="0.00"
                            value={
                              row.unit_cost === '' || row.unit_cost == null
                                ? ''
                                : String(row.unit_cost)
                            }
                            onChange={(e) => onUpdate(idx, 'unit_cost', e.target.value)}
                          />
                        )}
                      </td>
                      <td className="p-0 align-middle border-r last:border-r-0 bg-muted/15">
                        <div
                          className={cn(
                            ROW_H,
                            'flex items-center justify-center font-semibold tabular-nums text-xs px-1 text-primary truncate',
                          )}
                        >
                          {meaningful && q > 0 ? formatCurrency(q * uc) : '—'}
                        </div>
                      </td>
                      {!readOnly && (
                        <td className="p-0 align-middle">
                          <div className={cn(ROW_H, 'flex items-center justify-center')}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive/70 hover:text-destructive"
                              onClick={() => onRemove(idx)}
                              disabled={rows.length <= 1}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/25 border-t text-xs">
                  <td
                    colSpan={readOnly ? 5 : 5}
                    className="p-1.5 border-r text-right text-muted-foreground font-medium"
                  >
                    Materials subtotal
                  </td>
                  <td className="p-1.5 border-r text-center font-semibold tabular-nums text-foreground">
                    {formatCurrency(matCost)}
                  </td>
                  {!readOnly && <td className="p-1.5" />}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed hidden md:block">
          Pick a material product or enter a custom line description. Use Load BOM to pull a saved
          recipe for the selected finished product.
        </p>
      </div>
    </div>
  );
}
