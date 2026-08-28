import { Copy, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { ProductLinePicker } from "./ProductLinePicker";
import {
  productPickerLabel,
} from "@/components/workspace/product/lib/product-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LINE_CELL_INPUT,
  LINE_CELL_INPUT_NUMBER,
  NO_NUMBER_SPINNER,
  calcLineTotals,
  formatCurrency,
  formatDisplayUnitPrice,
  isLineMeaningful,
  lineQuantityForCalc,
  lineQuantityForFooter,
  maxQtyInLineBasis,
  productTracksStock,
  unitPriceForFormInput,
} from '../constants';
import {
  defaultEnteredUnitForProduct,
  formatStockForDisplay,
  getStockConversionHint,
  resolveEnteredUnit,
  unitLabelForLine,
} from '@/lib/units';
import { LINE_COL, visibleLineColumns } from "../invoice-template-constants";
import {
  INVOICE_LINE_AMOUNT_INPUT,
  INVOICE_LINE_ROW_H,
  invoiceLineColStyle,
  invoiceLineThClass,
} from "./invoice-line-column-layout";
import { useProductDialog } from "@/components/workspace/product/product-dialog-provider";
import { useTaxDialog } from "@/components/workspace/tax/tax-dialog-provider";
import { useCan } from "@/hooks/use-can";
import {
  findProductByScanValue,
  focusCell,
  getVisibleNavCols,
  handleInvoiceLinesKeyDown,
  moveEnterNextColumn,
  parseExcelPaste,
} from "./invoice-lines-keyboard";
import { moveToNextFormField, resolveEnterNavElement } from "./invoice-form-keyboard";
import { cn } from "@/lib/utils";

const NEW_PRODUCT = "__invoice_product_new__";
const NEW_TAX = "__invoice_tax_new__";

const MOBILE_FULL_WIDTH_COLS = new Set([
  LINE_COL.PRODUCT,
  LINE_COL.DESCRIPTION,
]);
const MOBILE_SKIP_COLS = new Set([LINE_COL.ACTIONS, LINE_COL.FINAL_TOTAL]);

function tableMinWidth(colCount) {
  return Math.max(720, colCount * 76);
}

function isVisibleFocusableElement(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.hidden) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

function moveToNextEnterField(currentEl, lineNavOptions = {}) {
  const navEl = resolveEnterNavElement(currentEl) || currentEl;
  if (!navEl || !(navEl instanceof HTMLElement)) return;
  const scope = navEl.closest('[data-enter-scope="invoice-lines-grid"]');
  if (!scope) return;
  const row = Number(navEl.dataset.row);
  const col = navEl.dataset.col;
  if (!Number.isNaN(row) && col) {
    moveEnterNextColumn(scope, row, col, {
      visibleCols: lineNavOptions.visibleCols,
      onAddLine: lineNavOptions.onAddLine,
      linesLength: lineNavOptions.linesLength,
      onLeaveGrid: (el) => moveToNextFormField(el),
    });
    return;
  }
  const all = Array.from(scope.querySelectorAll('[data-enter-nav="1"]')).filter(
    (el) => isVisibleFocusableElement(el),
  );
  const idx = all.indexOf(navEl);
  if (idx < 0 || idx >= all.length - 1) {
    moveToNextFormField(navEl);
    return;
  }
  const nextEl = all[idx + 1];
  if (!(nextEl instanceof HTMLElement) || typeof nextEl.focus !== "function") return;
  requestAnimationFrame(() => {
    nextEl.focus();
    if (nextEl instanceof HTMLInputElement) {
      nextEl.select();
    }
  });
}

function lineComboboxTriggerProps(index, col, onCellKeyDown) {
  return {
    "data-enter-nav": "1",
    "data-row": index,
    "data-col": col,
    onKeyDown: onCellKeyDown,
  };
}

function buildLineKeyboardCtx(scope, row, col, ctx) {
  return {
    scope,
    row,
    col,
    visibleCols: ctx.visibleCols,
    onDuplicateLine: ctx.onDuplicateLine,
    onAddLine: ctx.onAddLine,
    onRemoveLine: ctx.onRemoveLine,
    linesLength: ctx.linesLength,
    onUpdateLine: ctx.onUpdateLine,
    onUpdateLineDiscountFixed: ctx.onUpdateLineDiscountFixed,
    onUpdateLineDiscountPercent: ctx.onUpdateLineDiscountPercent,
    onUpdateLineNetTotal: ctx.onUpdateLineNetTotal,
  };
}

function SortableLineRow({ id, index, cols, line, lineHelpers, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b last:border-b-0 group hover:bg-muted/15 transition-colors",
        isDragging && "relative z-10 bg-muted/40 shadow-md opacity-95",
      )}
    >
      {!disabled ? (
        <td className="w-8 p-0 align-middle border-r bg-muted/20">
          <button
            type="button"
            className="flex h-8 w-full items-center justify-center cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none"
            aria-label={`Reorder line ${index + 1}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        </td>
      ) : null}
      {cols.map((col) => (
        <td
          key={col.key}
          className={cn(
            "p-0 align-middle border-r last:border-r-0",
            col.key === LINE_COL.DESCRIPTION && "align-top",
            col.key === LINE_COL.FINAL_TOTAL && "bg-muted/15",
          )}
        >
          {renderCell(
            buildRenderCtx({
              ...lineHelpers,
              col: col.key,
              line,
              index,
              layout: "table",
            }),
          )}
        </td>
      ))}
    </tr>
  );
}

function buildRenderCtx({
  col,
  line,
  index,
  layout,
  products,
  taxRates,
  taxRatesById,
  productsById,
  currency,
  currencySymbols,
  canCreateProduct,
  canEditProduct,
  canQuickCreateTax,
  productDialog,
  taxDialog,
  onUpdateLine,
  onUpdateLineDiscountFixed,
  onUpdateLineDiscountPercent,
  onUpdateLineNetTotal,
  onProductCreated,
  onProductUpdated,
  onTaxCreated,
  onSelectTax,
  onSelectProduct,
  onRemoveLine,
  onDuplicateLine,
  onAddLine,
  linesLength,
  restrictByStock,
  getMaxQtyForLine,
  showInlineUnitLabel,
  visibleCols,
  postedLocked,
  gridRef,
}) {
  const { total, tax } = calcLineTotals(line, taxRatesById);
  const product = productsById[line.product_id];
  const familyUnits = product?.qty_conversion?.family_units ?? [];
  const showUnitPicker = familyUnits.length > 1;

  return {
    col,
    line,
    index,
    layout,
    total,
    tax,
    product,
    showUnitPicker,
    familyUnits,
    products,
    taxRates,
    taxRatesById,
    canCreateProduct,
    canEditProduct,
    canQuickCreateTax,
    currency,
    currencySymbols,
    productDialog,
    taxDialog,
    onUpdateLine,
    onUpdateLineDiscountFixed,
    onUpdateLineDiscountPercent,
    onUpdateLineNetTotal,
    onProductCreated,
    onProductUpdated,
    onTaxCreated,
    onSelectTax,
  onSelectProduct,
    onRemoveLine,
    onDuplicateLine,
    onAddLine,
    linesLength,
    restrictByStock,
    getMaxQtyForLine,
    showInlineUnitLabel,
    visibleCols,
    postedLocked,
    gridRef,
  };
}

function MobileLineCard({
  lineIndex,
  cols,
  line,
  currency,
  currencySymbols,
  lineHelpers,
}) {
  const { total } = calcLineTotals(line, lineHelpers.taxRatesById);
  const fieldCols = cols.filter((c) => !MOBILE_SKIP_COLS.has(c.key));
  const showTotal = cols.some((c) => c.key === LINE_COL.FINAL_TOTAL);

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Line {lineIndex + 1}
          </p>
          {showTotal ? (
            <p className="text-base font-semibold text-primary tabular-nums mt-0.5">
              {formatCurrency(total, currency, currencySymbols)}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-destructive/80 hover:text-destructive"
          onClick={() => lineHelpers.onRemoveLine(lineIndex)}
          disabled={lineHelpers.linesLength <= 1}
          aria-label={`Remove line ${lineIndex + 1}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fieldCols.map((col) => {
          const ctx = buildRenderCtx({
            ...lineHelpers,
            col: col.key,
            line,
            index: lineIndex,
            layout: "mobile",
          });

          return (
            <div
              key={col.key}
              className={cn(
                "space-y-1.5 min-w-0",
                MOBILE_FULL_WIDTH_COLS.has(col.key) && "col-span-2",
              )}
            >
              <Label className="text-xs text-muted-foreground font-medium">
                {col.label}
              </Label>
              <div className="min-w-0">{renderCell(ctx)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const InvoiceLinesGrid = memo(function InvoiceLinesGrid({
  lines,
  lineColumns,
  products,
  taxRates,
  taxRatesById,
  productsById,
  currency,
  currencySymbols,
  canCreateProduct,
  canQuickCreateTax,
  onAddLine,
  onRemoveLine,
  onDuplicateLine,
  onReorderLines,
  onPasteLines,
  onUpdateLine,
  onUpdateLineDiscountFixed,
  onUpdateLineDiscountPercent,
  onUpdateLineNetTotal,
  onProductCreated,
  onProductUpdated,
  onTaxCreated,
  onSelectTax,
  onSelectProduct,
  restrictByStock = true,
  getMaxQtyForLine,
  postedLocked = false,
}) {
  const productDialog = useProductDialog();
  const taxDialog = useTaxDialog();
  const canEditProduct = useCan(["products.edit"]);
  const cols = visibleLineColumns(lineColumns);
  const gridRef = useRef(null);
  const barcodeRef = useRef(null);
  const [barcodeBuffer, setBarcodeBuffer] = useState("");

  const visibleCols = useMemo(() => {
    const set = new Set(cols.map((c) => c.key));
    return set;
  }, [cols]);

  const sortableIds = useMemo(() => lines.map((_, i) => `line-${i}`), [lines.length]);
  const dragDisabled = postedLocked || !onReorderLines;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorderLines) return;
      const fromIndex = sortableIds.indexOf(String(active.id));
      const toIndex = sortableIds.indexOf(String(over.id));
      if (fromIndex < 0 || toIndex < 0) return;
      onReorderLines(fromIndex, toIndex);
    },
    [onReorderLines, sortableIds],
  );

  const handleGridPaste = useCallback(
    (e) => {
      if (postedLocked || !onPasteLines) return;
      const text = e.clipboardData?.getData("text/plain");
      if (!text || !text.includes("\t")) return;
      e.preventDefault();
      const active = document.activeElement;
      const scope = gridRef.current;
      if (!scope || !(active instanceof HTMLElement)) return;
      const row = Number(active.dataset.row);
      const col = active.dataset.col;
      if (Number.isNaN(row) || !col) return;
      const rows = parseExcelPaste(text);
      onPasteLines(row, rows, col, getVisibleNavCols(visibleCols), products);
    },
    [onPasteLines, postedLocked, products, visibleCols],
  );

  const handleBarcodeSubmit = useCallback(
    (value) => {
      const product = findProductByScanValue(products, value);
      if (!product) return false;
      const emptyIndex = lines.findIndex((l) => !isLineMeaningful(l));
      const targetIndex = emptyIndex >= 0 ? emptyIndex : lines.length - 1;
      onSelectProduct(targetIndex, String(product.id));
      requestAnimationFrame(() => {
        focusCell(gridRef.current, targetIndex, LINE_COL.QUANTITY);
      });
      return true;
    },
    [lines, onSelectProduct, products],
  );

  const foot = useMemo(() => {
    let qty = 0;
    lines.forEach((l) => {
      qty += lineQuantityForFooter(l);
    });
    return { qty };
  }, [lines]);

  const hasUnitColumn = cols.some((c) => c.key === LINE_COL.UNIT);
  const showQtyCol = cols.some((c) => c.key === LINE_COL.QUANTITY);

  const lineHelpers = useMemo(
    () => ({
      products,
      taxRates,
      taxRatesById,
      productsById,
      currency,
      currencySymbols,
      canCreateProduct,
      canEditProduct,
      canQuickCreateTax,
      productDialog,
      taxDialog,
      onUpdateLine,
      onUpdateLineDiscountFixed,
      onUpdateLineDiscountPercent,
      onUpdateLineNetTotal,
      onProductCreated,
      onProductUpdated,
      onTaxCreated,
      onSelectTax,
      onSelectProduct,
      onRemoveLine,
      onDuplicateLine,
      onAddLine,
      linesLength: lines.length,
      restrictByStock,
      getMaxQtyForLine,
      showInlineUnitLabel: !hasUnitColumn,
      visibleCols,
      postedLocked,
      gridRef,
    }),
    [
      products,
      taxRates,
      taxRatesById,
      productsById,
      currency,
      currencySymbols,
      canCreateProduct,
      canEditProduct,
      canQuickCreateTax,
      productDialog,
      taxDialog,
      onUpdateLine,
      onUpdateLineDiscountFixed,
      onUpdateLineDiscountPercent,
      onUpdateLineNetTotal,
      onProductCreated,
      onProductUpdated,
      onTaxCreated,
      onSelectTax,
      onSelectProduct,
      onRemoveLine,
      onDuplicateLine,
      onAddLine,
      lines.length,
      restrictByStock,
      getMaxQtyForLine,
      hasUnitColumn,
      visibleCols,
      postedLocked,
    ],
  );

  return (
    <div
      ref={gridRef}
      className="w-full min-w-0"
      data-enter-scope="invoice-lines-grid"
      onPaste={handleGridPaste}
    >
      <input
        ref={barcodeRef}
        type="text"
        aria-label="Barcode scanner input"
        className="sr-only"
        value={barcodeBuffer}
        onChange={(e) => setBarcodeBuffer(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const ok = handleBarcodeSubmit(barcodeBuffer);
            setBarcodeBuffer("");
            if (!ok && barcodeBuffer.trim()) {
              focusCell(gridRef.current, 0, LINE_COL.PRODUCT);
            }
          }
        }}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-foreground/[0.09] bg-gradient-to-b from-muted/60 to-muted/30 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Line items</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
            Enter → next column · Tab next field · Ctrl+S save · Ctrl+Shift+S save &amp; close ·
            Ctrl+Enter add line · Ctrl+D duplicate · Shift+Delete remove · Paste from Excel
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddLine}
          disabled={postedLocked}
          className="shrink-0 w-full sm:w-auto bg-background/80"
        >
          <Plus className="size-4 mr-1" />
          Add line
        </Button>
      </div>

      <div className="space-y-3 px-4 sm:px-5 py-4 sm:py-5">
      {/* Mobile: stacked line cards */}
      <div className="md:hidden space-y-3">
        {lines.map((line, index) => (
          <MobileLineCard
            key={index}
            lineIndex={index}
            cols={cols}
            line={line}
            currency={currency}
            currencySymbols={currencySymbols}
            lineHelpers={lineHelpers}
          />
        ))}
        {showQtyCol && foot.qty > 0 ? (
          <p className="text-xs text-muted-foreground text-end tabular-nums px-1">
            Total qty:{" "}
            <span className="font-medium text-foreground">{foot.qty}</span>
          </p>
        ) : null}
      </div>

      {/* Tablet/desktop: scrollable table */}
      <div className="hidden md:block rounded-xl border border-foreground/[0.14] bg-background overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto overscroll-x-contain max-h-[min(70vh,640px)] overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table
              className="w-full text-xs border-collapse invoice-erp-lines-grid"
              style={{ minWidth: tableMinWidth(cols.length) + (dragDisabled ? 0 : 32) }}
            >
              <colgroup>
                {!dragDisabled ? <col style={{ width: 32 }} /> : null}
                {cols.map((col) => (
                  <col key={col.key} style={invoiceLineColStyle(col.key, cols)} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/80 backdrop-blur-sm border-b border-foreground/[0.09]">
                  {!dragDisabled ? (
                    <th className="w-8 p-0 border-r">
                      <span className="sr-only">Reorder</span>
                    </th>
                  ) : null}
                  {cols.map((col) => (
                    <th key={col.key} className={invoiceLineThClass(col.key)}>
                      {col.key === LINE_COL.ACTIONS ? (
                        <span className="sr-only">Actions</span>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <tbody>
                  {lines.map((line, index) => (
                    <SortableLineRow
                      key={sortableIds[index]}
                      id={sortableIds[index]}
                      index={index}
                      cols={cols}
                      line={line}
                      lineHelpers={lineHelpers}
                      disabled={dragDisabled}
                    />
                  ))}
                </tbody>
              </SortableContext>
              <tfoot>
                <tr className="bg-muted/25 border-t text-xs sticky bottom-0">
                  {!dragDisabled ? <td className="border-r" /> : null}
                  {cols.map((col) => (
                    <td
                      key={col.key}
                      className="p-1.5 border-r last:border-r-0 text-center"
                    >
                      {col.key === LINE_COL.QUANTITY && (
                        <span className="tabular-nums text-muted-foreground font-medium">
                          {foot.qty || ""}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </DndContext>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed hidden md:block">
        Use <strong>Disc $</strong> or <strong>Disc %</strong> (they stay in
        sync). Edit <strong>Net total</strong> to back-calculate the rate.
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed md:hidden">
        Swipe fields horizontally on larger screens for the full grid view.
      </p>
      </div>
    </div>
  );
});

function ProductSelectLabel({ product, compact = false, showStock = true }) {
  if (!showStock) {
    return <span className="truncate">{productPickerLabel(product)}</span>;
  }

  const tracks = productTracksStock(product);
  const stock = Number(
    product?.available_stock ??
      product?.current_stock ??
      product?.quantity_on_hand ??
      0,
  );
  const stockValue = tracks ? formatStockForDisplay(stock, product) : "Service";
  const stockConversionHint = tracks ? getStockConversionHint(stock, product) : null;
  const stockClass = !tracks
    ? "text-muted-foreground"
    : stock > 0
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-destructive";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-3",
        compact && "w-full",
      )}
    >
      <span className="flex-1 min-w-0 truncate text-left">{productPickerLabel(product)}</span>
      <span
        className={cn(
          "shrink-0 w-[8.5rem] text-right text-[11px] font-medium tabular-nums tracking-tight",
          stockClass,
        )}
      >
        {tracks ? (
          stockConversionHint ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">Stock: {stockValue}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px]">
                  {String(stockConversionHint)
                    .split("\n")
                    .map((line) => (
                      <p key={line} className="text-[10px] leading-relaxed">
                        {line}
                      </p>
                    ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            `Stock: ${stockValue}`
          )
        ) : (
          stockValue
        )}
      </span>
    </div>
  );
}

function formatStock(value, unitLabel) {
  const n = Number(value) || 0;
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

function formatTaxLabel(tax) {
  if (!tax) return "No tax";
  const rate = Number(tax.rate);
  const rateLabel = tax.type === "fixed" ? rate.toFixed(2) : `${rate}%`;
  return `${tax.name} (${rateLabel})`;
}

function RateInput({ line, index, className, onUpdateLine, onKeyDown }) {
  const [editing, setEditing] = useState(false);
  const stored = unitPriceForFormInput(line.unit_price);
  const displayValue = editing
    ? stored
    : formatDisplayUnitPrice(line.unit_price);

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      value={displayValue}
      placeholder="Rate"
      title={line.net_total_locked ? String(line.unit_price ?? "") : undefined}
      onFocus={() => setEditing(true)}
      onBlur={(e) => {
        setEditing(false);
        onUpdateLine(index, "unit_price", unitPriceForFormInput(e.target.value));
      }}
      onChange={(e) => {
        if (editing) onUpdateLine(index, "unit_price", e.target.value);
      }}
      data-enter-nav="1"
      data-row={index}
      data-col={LINE_COL.RATE}
      onKeyDown={onKeyDown}
    />
  );
}

function openEditProductDialog(productDialog, product, { onProductUpdated, onProductCreated } = {}) {
  if (!product?.id) return;
  productDialog.openEdit(product, {
    onSuccess: (saved) => {
      onProductUpdated?.(saved) || onProductCreated?.(saved);
    },
  });
}

function openNewTaxDialog(taxDialog, onSelectTax, lineIndex) {
  taxDialog.openCreate({
    onSuccess: (saved) => {
      if (saved?.id) {
        onSelectTax?.(lineIndex, saved);
      }
    },
  });
}

function renderCell(ctx) {
  const {
    col,
    line,
    index,
    layout = "table",
    total,
    product,
    showUnitPicker,
    familyUnits,
    products,
    taxRates,
    taxRatesById,
    canCreateProduct,
    canEditProduct,
    canQuickCreateTax,
    currency,
    currencySymbols,
    productDialog,
    taxDialog,
    onUpdateLine,
    onUpdateLineDiscountFixed,
    onUpdateLineDiscountPercent,
    onUpdateLineNetTotal,
    onProductCreated,
    onProductUpdated,
    onTaxCreated,
    onSelectTax,
    onSelectProduct,
  onRemoveLine,
  onDuplicateLine,
  onAddLine,
  linesLength,
    restrictByStock,
    getMaxQtyForLine,
    showInlineUnitLabel,
    visibleCols,
    postedLocked,
    gridRef,
  } = ctx;

  const isMobile = layout === "mobile";
  const cellInput = isMobile
    ? "h-10 w-full min-h-10 text-sm border border-input rounded-md shadow-none bg-background px-2.5 transition-shadow focus-visible:ring-2 focus-visible:ring-primary/20"
    : cn(LINE_CELL_INPUT, INVOICE_LINE_ROW_H, "transition-shadow focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30");
  const cellInputNum = isMobile
    ? cn(cellInput, NO_NUMBER_SPINNER, "text-right tabular-nums px-2")
    : cn(LINE_CELL_INPUT_NUMBER, INVOICE_LINE_ROW_H, INVOICE_LINE_AMOUNT_INPUT);
  const selectTrigger = isMobile
    ? "h-10 w-full min-h-10 text-sm border border-input rounded-md shadow-none bg-background px-2.5"
    : cn(LINE_CELL_INPUT, INVOICE_LINE_ROW_H, "border-0 shadow-none");
  const onCellKeyDown = (e) => {
    const scope =
      gridRef?.current ||
      e.currentTarget.closest('[data-enter-scope="invoice-lines-grid"]');
    const kbCtx = buildLineKeyboardCtx(scope, index, col, ctx);
    if (handleInvoiceLinesKeyDown(e, kbCtx)) return;
    if (e.key === "Enter") {
      e.preventDefault();
      moveToNextEnterField(e.currentTarget, {
        visibleCols: ctx.visibleCols,
        onAddLine: ctx.onAddLine,
        linesLength: ctx.linesLength,
      });
    }
  };

  switch (col) {
    case LINE_COL.PRODUCT:
      return (
        <ProductLinePicker
          value={line.product_id}
          onValueChange={(v) => {
            onSelectProduct(index, v);
            requestAnimationFrame(() => {
              const trigger = document.querySelector(
                `[data-enter-nav="1"][data-row="${index}"][data-col="${LINE_COL.PRODUCT}"]`,
              );
              moveToNextEnterField(trigger, {
                visibleCols: ctx.visibleCols,
                onAddLine: ctx.onAddLine,
                linesLength: ctx.linesLength,
              });
            });
          }}
          products={products}
          currency={currency}
          currencySymbols={currencySymbols}
          showStock={restrictByStock !== false}
          placeholder="Product / service"
          searchPlaceholder="Search by name, SKU, or barcode…"
          triggerClassName={selectTrigger}
          contentClassName={isMobile ? "max-w-[calc(100vw-2rem)]" : undefined}
          renderOptionTrailing={
            canEditProduct
              ? (option) =>
                  option?.product?.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      mode="icon"
                      className="size-7 shrink-0 text-muted-foreground opacity-70 hover:text-primary hover:bg-primary/10 group-hover:opacity-100"
                      aria-label={`Edit ${option.product.name}`}
                      title="Edit product"
                      onPointerDown={(e) => e.preventDefault()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEditProductDialog(productDialog, option.product, {
                          onProductUpdated,
                          onProductCreated,
                        });
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  ) : null
              : undefined
          }
          actionItems={
            canCreateProduct
              ? [
                  {
                    value: NEW_PRODUCT,
                    label: "+ New product…",
                    className: "text-primary font-medium",
                    onSelect: () => {
                      productDialog.openCreate({
                        onSuccess: (p) => {
                          const created = onProductCreated?.(p) || p;
                          if (created?.id) {
                            onSelectProduct(index, String(created.id), {
                              productOverride: created,
                            });
                          }
                        },
                      });
                    },
                  },
                ]
              : []
          }
          triggerProps={lineComboboxTriggerProps(index, LINE_COL.PRODUCT, onCellKeyDown)}
        />
      );

    case LINE_COL.DESCRIPTION:
      return (
        <Input
          className={cn(cellInput, "placeholder:text-muted-foreground/70")}
          value={line.description}
          onChange={(e) => onUpdateLine(index, "description", e.target.value)}
          placeholder="e.g. Product Name — Model, Variant, Specifications, Condition"
          data-enter-nav="1"
          data-row={index}
          data-col={LINE_COL.DESCRIPTION}
          onKeyDown={onCellKeyDown}
        />
      );

    case LINE_COL.QUANTITY: {
      const enforce = restrictByStock !== false;
      const stockMax = enforce
        ? (getMaxQtyForLine
            ? getMaxQtyForLine(line, index, product)
            : maxQtyInLineBasis(line, product))
        : null;
      const maxQty = stockMax != null && stockMax > 0 ? stockMax : null;
      const showStockHint = enforce && stockMax != null;
      const qtyValue =
        line.quantity === "" || line.quantity == null
          ? ""
          : String(line.quantity);
      const capUnitLabel = unitLabelForLine(line, product);
      const showUnitHint = showInlineUnitLabel && Boolean(capUnitLabel);
      return (
        <div className={cn("relative flex flex-col justify-center", isMobile ? "gap-0.5" : "")}>
          <div className="relative flex items-center">
          <Input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className={cn(
              cellInputNum,
              isMobile ? "text-center" : "text-center",
              showStockHint && "bg-muted/30",
            )}
            value={qtyValue}
            placeholder="0"
            title={
              showStockHint
                ? `Available stock: ${formatStock(stockMax, capUnitLabel)}`
                : undefined
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") {
                onUpdateLine(index, "quantity", "");
                return;
              }
              if (!/^\d*\.?\d*$/.test(raw)) return;
              if (raw === "." || raw.endsWith(".")) {
                onUpdateLine(index, "quantity", raw);
                return;
              }
              const typed = Number(raw);
              if (Number.isNaN(typed)) return;
              if (maxQty != null && maxQty > 0 && typed > maxQty) {
                onUpdateLine(
                  index,
                  "quantity",
                  String(Number(maxQty.toFixed(6))),
                );
              } else {
                onUpdateLine(index, "quantity", raw);
              }
            }}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              if (raw === "" || raw === ".") return;
              const typed = Number(raw);
              if (!Number.isFinite(typed) || typed < 0) {
                onUpdateLine(index, "quantity", "");
              }
            }}
            data-enter-nav="1"
            data-row={index}
            data-col={LINE_COL.QUANTITY}
            onKeyDown={onCellKeyDown}
          />
          </div>
          {showUnitHint ? (
            <span className="text-[10px] text-muted-foreground leading-tight px-0.5 truncate">
              Unit: {capUnitLabel}
            </span>
          ) : null}
        </div>
      );
    }

    case LINE_COL.UNIT: {
      const unitOptions = familyUnits.map((u) => ({
        value: u.unit_key,
        label: u.label,
      }));
      const selectedUnit =
        resolveEnteredUnit(line, product) ||
        defaultEnteredUnitForProduct(product) ||
        familyUnits[0]?.unit_key ||
        "";

      return (
        <div
          className={cn(
            "flex flex-col justify-center",
            isMobile ? "min-h-10" : "px-0.5",
            INVOICE_LINE_ROW_H,
          )}
        >
          {showUnitPicker ? (
            <SearchableCombobox
              value={selectedUnit}
              onValueChange={(v) => onUpdateLine(index, "entered_unit", v)}
              options={unitOptions}
              placeholder="Unit"
              searchPlaceholder="Search unit…"
              triggerClassName={
                isMobile
                  ? selectTrigger
                  : "h-8 text-xs border-0 shadow-none bg-transparent"
              }
              contentClassName="min-w-[140px]"
              triggerProps={lineComboboxTriggerProps(index, LINE_COL.UNIT, onCellKeyDown)}
            />
          ) : (
            <span className="text-[11px] text-muted-foreground truncate text-center block">
              {unitLabelForLine(line, product) || "—"}
            </span>
          )}
        </div>
      );
    }

    case LINE_COL.BATCH_NUMBER:
      return (
        <Input
          className={cn(cellInput, "text-center")}
          value={line.batch_number || ""}
          onChange={(e) => onUpdateLine(index, "batch_number", e.target.value)}
          onKeyDown={onCellKeyDown}
          data-enter-nav="1"
          data-row={index}
          data-col={LINE_COL.BATCH_NUMBER}
          placeholder="Lot"
          disabled={postedLocked}
        />
      );

    case LINE_COL.EXPIRY_DATE:
      return (
        <Input
          type="date"
          className={cn(cellInput, "text-center px-0.5")}
          value={line.expiry_date || ""}
          onChange={(e) => onUpdateLine(index, "expiry_date", e.target.value)}
          onKeyDown={onCellKeyDown}
          data-enter-nav="1"
          data-row={index}
          data-col={LINE_COL.EXPIRY_DATE}
          disabled={postedLocked}
        />
      );

    case LINE_COL.MANUFACTURED_DATE:
      return (
        <Input
          type="date"
          className={cn(cellInput, "text-center px-0.5")}
          value={line.manufactured_date || ""}
          onChange={(e) => onUpdateLine(index, "manufactured_date", e.target.value)}
          onKeyDown={onCellKeyDown}
          data-enter-nav="1"
          data-row={index}
          data-col={LINE_COL.MANUFACTURED_DATE}
          disabled={postedLocked}
        />
      );

    case LINE_COL.RATE:
      return (
        <RateInput
          line={line}
          index={index}
          className={cn(cellInputNum, "text-center")}
          onUpdateLine={onUpdateLine}
          onKeyDown={onCellKeyDown}
        />
      );

    case LINE_COL.DISCOUNT_FIXED:
      return (
        <Input
          type="number"
          min={0}
          step="0.01"
          className={cn(cellInputNum, "text-center")}
          value={line.discount_fixed ?? ""}
          onChange={(e) => onUpdateLineDiscountFixed(index, e.target.value)}
          title="Discount amount"
          placeholder="0"
          data-enter-nav="1"
          data-row={index}
          data-col={LINE_COL.DISCOUNT_FIXED}
          onKeyDown={onCellKeyDown}
        />
      );

    case LINE_COL.DISCOUNT_PERCENT:
      return (
        <Input
          type="number"
          min={0}
          max={100}
          step="0.01"
          className={cn(cellInputNum, "text-center")}
          value={line.discount_percent ?? ""}
          onChange={(e) => onUpdateLineDiscountPercent(index, e.target.value)}
          placeholder="0"
          data-enter-nav="1"
          data-row={index}
          data-col={LINE_COL.DISCOUNT_PERCENT}
          onKeyDown={onCellKeyDown}
        />
      );

    case LINE_COL.TAX: {
      const selectedTax = line.tax_rate_id
        ? taxRatesById?.[String(line.tax_rate_id)]
        : null;
      const taxOptions = [...taxRates];
      if (
        selectedTax &&
        !taxOptions.some((t) => String(t.id) === String(selectedTax.id))
      ) {
        taxOptions.push(selectedTax);
      }

      return (
        <SearchableCombobox
          value={line.tax_rate_id}
          onValueChange={(v) => onUpdateLine(index, "tax_rate_id", v)}
          options={taxOptions.map((t) => ({
            value: String(t.id),
            label: formatTaxLabel(t),
            keywords: [t.name, String(t.rate)],
          }))}
          placeholder="No tax"
          searchPlaceholder="Search tax rates…"
          triggerClassName={cn(selectTrigger, "min-w-0")}
          allowNone
          noneValue="_none"
          noneLabel="No tax"
          renderValue={(option) =>
            option ? (
              <span className="truncate">{option.label}</span>
            ) : selectedTax ? (
              <span className="truncate">{formatTaxLabel(selectedTax)}</span>
            ) : null
          }
          actionItems={
            canQuickCreateTax
              ? [
                  {
                    value: NEW_TAX,
                    label: "+ New tax…",
                    className: "text-primary font-medium",
                    onSelect: () => openNewTaxDialog(taxDialog, onSelectTax, index),
                  },
                ]
              : []
          }
          triggerProps={lineComboboxTriggerProps(index, LINE_COL.TAX, onCellKeyDown)}
        />
      );
    }

    case LINE_COL.SALE_TAX:
      return (
        <Input
          type="number"
          min={0}
          step="0.01"
          className={cn(cellInputNum, "text-center")}
          value={line.sale_tax_amount ?? ""}
          onChange={(e) =>
            onUpdateLine(index, "sale_tax_amount", e.target.value)
          }
          placeholder={line.tax_rate_id ? "0.00" : "—"}
          title={
            line.tax_rate_id
              ? "Calculated from tax rate; you can override manually"
              : "Select a tax rate or enter an amount"
          }
          data-enter-nav="1"
          data-row={index}
          data-col={LINE_COL.SALE_TAX}
          onKeyDown={onCellKeyDown}
        />
      );

    case LINE_COL.NET_TOTAL:
      return (
        <Input
          type="number"
          min={0}
          step="0.01"
          className={cn(cellInputNum, "font-medium text-center")}
          value={line.net_total ?? ""}
          onChange={(e) => onUpdateLineNetTotal(index, e.target.value)}
          placeholder="0.00"
          data-enter-nav="1"
          data-row={index}
          data-col={LINE_COL.NET_TOTAL}
          onKeyDown={onCellKeyDown}
        />
      );

    case LINE_COL.FINAL_TOTAL:
      return (
        <div
          className={cn(
            INVOICE_LINE_ROW_H,
            "flex items-center justify-center font-semibold tabular-nums text-xs px-1 text-primary truncate",
            isMobile && "h-10 rounded-md border border-border/60 bg-muted/20",
          )}
        >
          {formatCurrency(total, currency, currencySymbols)}
        </div>
      );

    case LINE_COL.ACTIONS:
      return (
        <div
          className={cn(INVOICE_LINE_ROW_H, "flex items-center justify-center gap-0.5 px-0.5")}
        >
          {onDuplicateLine && !postedLocked ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => onDuplicateLine(index)}
              title="Duplicate line (Ctrl+D)"
              aria-label={`Duplicate line ${index + 1}`}
            >
              <Copy className="size-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive/70 hover:text-destructive"
            onClick={() => onRemoveLine(index)}
            disabled={linesLength <= 1 || postedLocked}
            title="Remove line (Shift+Delete)"
            aria-label={`Remove line ${index + 1}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      );

    default:
      return null;
  }
}
