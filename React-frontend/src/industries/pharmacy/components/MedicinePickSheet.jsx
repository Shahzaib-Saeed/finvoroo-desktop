import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  History,
  Loader2,
  PackageSearch,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { buildMedicineLookupFields } from "../lib/medicine-catalog-cache";
import { formatPackStock } from "../lib/pharmacy-pricing";
import { PharmacyShortcutHint } from "./PharmacyKbd";
import { MedicineThumb } from "./MedicineThumb";
import "../pharmacy-density.css";

const LOOKUP_COLS_SALE = [
  { key: "image", className: "w-[7%]" },
  { key: "medicine", className: "w-[22%]" },
  { key: "form", className: "w-[9%]" },
  { key: "stock", className: "w-[8%]" },
  { key: "packStock", className: "w-[8%]" },
  { key: "purchase", className: "w-[9%]" },
  { key: "sale", className: "w-[9%]" },
  { key: "unitSale", className: "w-[8%]" },
  { key: "manufacturer", className: "w-[13%]" },
  { key: "pack", className: "w-[7%]" },
];

const LOOKUP_SHEET_WIDTH = 900;

function useLookupSheetWidth(open) {
  const [widthPx, setWidthPx] = useState(() => (open ? LOOKUP_SHEET_WIDTH : null));

  useLayoutEffect(() => {
    if (!open) {
      setWidthPx(null);
      return undefined;
    }

    const measure = () => {
      const vw = window.innerWidth;
      const share = vw < 1280 ? 0.5 : vw < 1440 ? 0.52 : 0.48;
      setWidthPx(Math.min(LOOKUP_SHEET_WIDTH, Math.max(640, Math.round(vw * share))));
    };

    measure();
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  return open ? (widthPx ?? LOOKUP_SHEET_WIDTH) : null;
}

/** Shared grid — emerald header only; body uses neutral lines. */
const GRID_LINE = "border-r border-b border-slate-200 last:border-r-0";
const GRID_HEAD = "border-r border-emerald-700/35 border-b-2 border-emerald-900 last:border-r-0";

function Th({ children, align = "left", title }) {
  return (
    <th
      title={title}
      className={cn(
        GRID_HEAD,
        "sticky top-0 z-10 bg-emerald-800 px-2.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-white/95 whitespace-nowrap",
        align === "center" && "text-center",
        align === "right" && "text-right",
        align === "left" && "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  align = "left",
  selected = false,
  lead = false,
  suggested = false,
  compact = false,
}) {
  return (
    <td
      className={cn(
        GRID_LINE,
        "px-2.5 align-middle leading-snug text-slate-900",
        compact ? "py-1.5 text-[12px]" : "py-2 text-[13px]",
        selected && lead && (suggested ? "shadow-[inset_3px_0_0_0_#f59e0b]" : "shadow-[inset_3px_0_0_0_#10b981]"),
        align === "center" && "text-center",
        align === "right" && "text-right",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}

function fallbackLookup(row) {
  return buildMedicineLookupFields(row);
}

function resolveLookup(row) {
  const computed = fallbackLookup(row);
  const cached = row?._lookup || {};
  const stockN = Number(cached.stock ?? computed.stock) || 0;
  const packCount = cached.packCount ?? computed.packCount ?? 1;
  return {
    ...computed,
    ...cached,
    packCount,
    packStockLabel: formatPackStock(stockN, packCount),
    unitSaleLabel: cached.unitSaleLabel ?? computed.unitSaleLabel,
    unitPurchaseLabel: cached.unitPurchaseLabel ?? computed.unitPurchaseLabel,
  };
}

function formatMakerLabel(raw) {
  const s = String(raw || "").trim();
  if (!s) return "—";
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) {
    return s
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

function PriceCell({ children, muted = false, accent = false }) {
  return (
    <span
      className={cn(
        "tabular-nums text-[12px]",
        accent
          ? "font-semibold text-emerald-700"
          : muted
            ? "font-medium text-slate-500"
            : "font-medium text-slate-700",
      )}
    >
      {children}
    </span>
  );
}

function NumCell({ children, className, warn = false }) {
  return (
    <span
      className={cn(
        "tabular-nums text-[13px] font-medium text-slate-900",
        warn && "font-semibold text-amber-800",
        className,
      )}
    >
      {children}
    </span>
  );
}

function StockCell({ stock, outOfStock }) {
  if (outOfStock) {
    return (
      <span className="inline-flex h-5 items-center rounded-full bg-red-50 px-1.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
        Out
      </span>
    );
  }

  const n = Number(stock);
  const low = Number.isFinite(n) && n > 0 && n <= 5;

  return (
    <div className="inline-flex items-center justify-center gap-1">
      <NumCell warn={low}>{stock ?? "0"}</NumCell>
      {low ? (
        <span className="inline-flex h-4 items-center rounded bg-amber-100/80 px-1 text-[9px] font-bold uppercase tracking-wide text-amber-800">
          Low
        </span>
      ) : null}
    </div>
  );
}

const LookupRow = memo(function LookupRow({
  row,
  selected,
  idx,
  blockZeroStock = true,
  showStock = true,
  suggested = false,
  priceMode = "sale",
  layout = "compact",
  onEdit = null,
}) {
  const lookup = resolveLookup(row);
  const generic = lookup.generic || "";
  const strength = lookup.strength || "";
  const outOfStock =
    blockZeroStock && (lookup.outOfStock || Number(lookup.stock) <= 0);
  const sub = [generic, strength].filter(Boolean).join(" · ");
  const isSaleLayout = layout === "sale";
  const isSaleNarrow = false;
  const cellCompact = false;
  const cellTone = { selected, suggested, compact: cellCompact };
  const makerLabel = formatMakerLabel(lookup.manufacturer);

  return (
    <tr
      data-lookup-idx={idx}
      data-out-of-stock={outOfStock ? "1" : undefined}
      data-suggested-link={suggested ? "1" : undefined}
      className={cn(
        "group transition-colors",
        outOfStock ? "cursor-not-allowed opacity-55" : "cursor-pointer",
        selected
          ? suggested
            ? "bg-amber-50/90 shadow-[inset_0_0_0_1px_rgb(245_158_11_/_0.45)]"
            : "bg-emerald-50/80 shadow-[inset_0_0_0_1px_rgb(16_185_129_/_0.4)]"
          : "bg-white even:bg-slate-50/40",
        !selected && !outOfStock && "hover:bg-slate-50",
      )}
    >
      <Td align="center" lead {...cellTone}>
        <div className="flex justify-center">
          <MedicineThumb
            src={lookup.image || null}
            alt=""
            letter={row.name}
            size="sm"
            className={cn(outOfStock && "opacity-70 grayscale-[0.15]")}
          />
        </div>
      </Td>
      <Td {...cellTone}>
        <div className="flex min-w-0 items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-left text-[13px] font-medium leading-snug text-slate-900 line-clamp-2 group-hover:text-emerald-900">
              {row.name || "—"}
            </p>
            {sub ? (
              <p className="mt-0.5 min-w-0 truncate text-left text-[11px] text-slate-500">
                {sub}
              </p>
            ) : null}
            {isSaleNarrow && lookup.form ? (
              <p className="mt-0.5 truncate text-left text-[11px] text-slate-500">
                {lookup.form}
              </p>
            ) : null}
            {lookup.controlled ? (
              <div className="mt-0.5">
                <span className="inline-flex h-4 shrink-0 items-center rounded bg-red-600 px-1 text-[9px] font-bold text-white">
                  CD
                </span>
              </div>
            ) : null}
          </div>
          {suggested ? (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-800">
              <AlertTriangle className="size-2.5" />
              Verify
            </span>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              data-lookup-edit
              className={cn(
                "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition-opacity hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800",
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
              title="Edit medicine"
            >
              <Pencil className="size-3.5" />
            </button>
          ) : null}
        </div>
      </Td>
      {!isSaleNarrow ? (
        <Td
          align="center"
          {...cellTone}
          className="text-[12px] font-medium text-slate-600"
        >
          {lookup.form || "—"}
        </Td>
      ) : null}
      {showStock ? (
        <Td align="center" {...cellTone}>
          <StockCell stock={lookup.stock} outOfStock={outOfStock} />
        </Td>
      ) : null}
      {isSaleLayout && !isSaleNarrow && showStock ? (
        <Td align="center" {...cellTone}>
          <NumCell>{lookup.packStockLabel ?? "—"}</NumCell>
        </Td>
      ) : null}
      {isSaleLayout ? (
        <>
          {!isSaleNarrow ? (
            <Td align="right" {...cellTone}>
              <PriceCell muted>{lookup.purchaseLabel || "—"}</PriceCell>
            </Td>
          ) : null}
          <Td align="right" {...cellTone}>
            <PriceCell accent>{lookup.saleLabel || "—"}</PriceCell>
          </Td>
          <Td align="right" {...cellTone}>
            <PriceCell>{lookup.unitSaleLabel || "—"}</PriceCell>
          </Td>
        </>
      ) : (
        <Td align="center" {...cellTone} className="tabular-nums font-medium">
          {priceMode === "purchase"
            ? lookup.purchaseLabel || lookup.saleLabel || "—"
            : lookup.saleLabel || "—"}
        </Td>
      )}
      {!isSaleNarrow ? (
        <Td
          align={isSaleLayout ? "left" : "center"}
          {...cellTone}
          className="text-[12px] font-medium text-slate-600"
        >
          <span className="block truncate" title={makerLabel}>
            {makerLabel}
          </span>
        </Td>
      ) : null}
      <Td align="center" {...cellTone}>
        <NumCell>{lookup.packPcs || "—"}</NumCell>
      </Td>
    </tr>
  );
});

/** Right-side medicine lookup sheet with images + product details. */
export function MedicinePickSheet({
  open,
  onOpenChange,
  rows,
  loading,
  catalogCount = 0,
  query,
  focusIdx,
  onFocusIdx: _onFocusIdx,
  onPick,
  blockZeroStock = true,
  showStock: _showStock = true,
  anchorSelector = "[data-pharmacy-grn-scan],[data-pharmacy-item-search],[data-dispense-qty],[data-dispense-price],[data-dispense-disc]",
  invoiceNeedsVerify = false,
  invoiceLinkedProductId = "",
  priceMode: _priceMode = "sale",
  onCreateNew = null,
  createNameHint = "",
  onEditProduct = null,
  onViewHistory = null,
  posSale = false,
}) {
  const bodyRef = useRef(null);
  const onPickRef = useRef(onPick);
  const rowsRef = useRef(rows);
  const onCreateNewRef = useRef(onCreateNew);
  const onEditProductRef = useRef(onEditProduct);
  const onViewHistoryRef = useRef(onViewHistory);
  const focusIdxRef = useRef(focusIdx);
  const sheetWidthPx = useLookupSheetWidth(open);
  const linkedId = invoiceLinkedProductId ? String(invoiceLinkedProductId) : "";
  const lookupLayout = "sale";
  const lookupCols = LOOKUP_COLS_SALE;
  const colCount = lookupCols.length;
  const createLabel = String(createNameHint || query || "").trim();
  const showCreate = Boolean(onCreateNew);
  const showEdit = Boolean(onEditProduct);
  const showHistory = Boolean(onViewHistory);
  const focusedRow = rows[focusIdx] || null;

  const handleCreate = () => {
    onCreateNewRef.current?.({ typedName: createLabel });
  };

  const handleEdit = (row) => {
    if (row?.id) onEditProductRef.current?.(row);
  };

  const handleHistory = (row) => {
    if (row?.id) onViewHistoryRef.current?.(row);
  };

  useEffect(() => {
    onCreateNewRef.current = onCreateNew;
  }, [onCreateNew]);

  useEffect(() => {
    onEditProductRef.current = onEditProduct;
  }, [onEditProduct]);

  useEffect(() => {
    onViewHistoryRef.current = onViewHistory;
  }, [onViewHistory]);

  useEffect(() => {
    focusIdxRef.current = focusIdx;
  }, [focusIdx]);

  useEffect(() => {
    if (!open || !showEdit) return;
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "e") return;
      const row = rowsRef.current?.[focusIdxRef.current];
      if (!row?.id) return;
      e.preventDefault();
      e.stopPropagation();
      onEditProductRef.current?.(row);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, showEdit]);

  useEffect(() => {
    if (!open || !showHistory) return;
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "h") return;
      const row = rowsRef.current?.[focusIdxRef.current];
      if (!row?.id) return;
      e.preventDefault();
      e.stopPropagation();
      onViewHistoryRef.current?.(row);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, showHistory]);

  useEffect(() => {
    if (!open || !showCreate) return;
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "n") return;
      e.preventDefault();
      e.stopPropagation();
      onCreateNewRef.current?.({ typedName: createLabel });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, showCreate, createLabel]);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (!open || !bodyRef.current) return;
    bodyRef.current
      .querySelector(`[data-lookup-idx="${focusIdx}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [focusIdx, open]);

  const panelWidth = sheetWidthPx;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        close={false}
        overlay
        data-pharmacy-pick-sheet
        overlayClassName="pointer-events-none !z-[70] bg-slate-900/25"
        style={
          panelWidth
            ? {
                "--pick-sheet-w": `${panelWidth}px`,
                width: panelWidth,
                maxWidth: panelWidth,
                minWidth: panelWidth,
              }
            : undefined
        }
        className={cn(
          "!z-[70] flex h-full !max-w-none flex-col gap-0 overflow-hidden border-s border-slate-200/80 bg-white p-0 text-slate-900 antialiased",
          "[width:var(--pick-sheet-w)] !w-[var(--pick-sheet-w)]",
          "shadow-[-12px_0_40px_rgba(15,23,42,0.12)]",
          "data-pharmacy-pick-sheet",
          "data-[state=open]:duration-200 data-[state=closed]:duration-150",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (e.target.closest?.(anchorSelector)) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (e.target.closest?.(anchorSelector)) e.preventDefault();
        }}
        onFocusOutside={(e) => {
          if (e.target.closest?.(anchorSelector)) e.preventDefault();
        }}
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-slate-200 bg-white px-4 py-3.5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <PackageSearch className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[15px] font-semibold tracking-tight !text-slate-900">
                Medicine lookup
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-[12px] font-medium !text-slate-500">
                {query ? (
                  <>
                    Searching{" "}
                    <span className="font-semibold text-slate-800">{query}</span>
                  </>
                ) : (
                  "Keep typing — Enter adds the highlighted row"
                )}
              </SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {showHistory && focusedRow ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 shadow-none hover:bg-slate-50"
                  onClick={() => handleHistory(focusedRow)}
                >
                  <History className="size-3.5" />
                  History
                </Button>
              ) : null}
              {showEdit && focusedRow ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 shadow-none hover:bg-slate-50"
                  onClick={() => handleEdit(focusedRow)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              ) : null}
              {showCreate ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 shadow-none hover:bg-slate-50"
                  onClick={handleCreate}
                >
                  <Plus className="size-3.5" />
                  {createLabel
                    ? `Create “${createLabel.slice(0, 18)}${createLabel.length > 18 ? "…" : ""}”`
                    : "New"}
                </Button>
              ) : null}
              {loading ? (
                <Loader2 className="size-4 animate-spin text-slate-400" />
              ) : null}
              <span
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-2.5 text-[11px] font-semibold tabular-nums",
                  rows.length
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-500",
                )}
                title={
                  catalogCount > rows.length
                    ? `${catalogCount.toLocaleString()} in catalog`
                    : undefined
                }
              >
                {rows.length} {rows.length === 1 ? "match" : "matches"}
              </span>
              <SheetClose
                type="button"
                aria-label="Close medicine lookup"
                className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/25"
              >
                <X className="size-4 stroke-[2]" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="min-h-0 flex-1 overflow-hidden bg-slate-50/60 p-3">
          <div
            ref={bodyRef}
            className="h-full overflow-x-hidden overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100"
            onMouseDown={(e) => {
              if (e.target.closest?.("[data-lookup-idx]")) e.preventDefault();
            }}
            onClick={(e) => {
              if (e.target.closest?.("[data-lookup-edit]")) return;
              if (e.target.closest?.("[data-lookup-history]")) return;
              const tr = e.target.closest?.("[data-lookup-idx]");
              if (!tr) return;
              if (tr.getAttribute("data-out-of-stock") === "1") return;
              const idx = Number(tr.getAttribute("data-lookup-idx"));
              const row = rowsRef.current?.[idx];
              if (row) onPickRef.current?.(row);
            }}
          >
            <table className="w-full table-fixed border-collapse text-[13px] [&_tbody_tr:last-child_td]:border-b-0">
              <colgroup>
                {lookupCols.map((col) => (
                  <col key={col.key} className={col.className} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr>
                  <Th align="center" title="Product photo">
                    Photo
                  </Th>
                  <Th align="left">Medicine</Th>
                  <Th align="center" title="Tablet, syrup, injection…">
                    Form
                  </Th>
                  <Th align="center" title="Units in stock">
                    Stock
                  </Th>
                  <Th align="center" title="How many full packs are in stock">
                    Packs
                  </Th>
                  <Th align="right" title="Purchase cost of one pack">
                    Cost
                  </Th>
                  <Th align="right" title="Selling price of one pack">
                    Sale
                  </Th>
                  <Th align="right" title="Selling price per tablet / unit">
                    /Unit
                  </Th>
                  <Th align="left" title="Manufacturer">
                    Maker
                  </Th>
                  <Th align="center" title="Pieces in one pack">
                    Size
                  </Th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colCount}
                      className="border-b border-slate-200 px-6 py-24 text-center text-slate-600"
                    >
                      <Loader2 className="mx-auto size-6 animate-spin text-emerald-600" />
                      <p className="mt-3 text-sm font-semibold">Loading medicines…</p>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colCount}
                      className="border-b border-slate-200 px-6 py-16 text-center text-slate-600"
                    >
                      <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                        <PackageSearch className="size-6 text-slate-400" />
                      </div>
                      <p className="mt-3 text-sm font-bold">No medicines match</p>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        Try generic name, strength, or supplier code
                      </p>
                      {showCreate ? (
                        <Button
                          type="button"
                          className="mt-4 h-9 gap-1.5 bg-emerald-700 px-4 text-[13px] font-semibold text-white hover:bg-emerald-800"
                          onClick={handleCreate}
                        >
                          <Plus className="size-4" />
                          {createLabel
                            ? `Create “${createLabel.slice(0, 40)}${createLabel.length > 40 ? "…" : ""}”`
                            : "Create new product"}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <LookupRow
                      key={row.id}
                      row={row}
                      idx={idx}
                      blockZeroStock={blockZeroStock}
                      showStock
                      selected={idx === focusIdx}
                      suggested={
                        invoiceNeedsVerify &&
                        linkedId &&
                        String(row.id) === linkedId
                      }
                      priceMode={_priceMode}
                      layout={lookupLayout}
                      onEdit={showEdit ? handleEdit : null}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SheetBody>

        <SheetFooter className="shrink-0 !flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="text-[12px] text-slate-500">
            {blockZeroStock ? (
              <>
                <span className="font-medium text-red-600">Out of stock</span> rows cannot be added
              </>
            ) : (
              "Press Enter to add the highlighted medicine"
            )}
          </p>
          <span className="inline-flex shrink-0 flex-wrap items-center gap-2.5">
            <PharmacyShortcutHint keys={["↑↓"]} label="Move" className="text-slate-500" />
            {showEdit ? (
              <PharmacyShortcutHint keys={["⌘E"]} label="Edit" className="text-slate-500" />
            ) : null}
            {showHistory ? (
              <PharmacyShortcutHint keys={["⌘H"]} label="History" className="text-slate-500" />
            ) : null}
            <PharmacyShortcutHint keys={["Enter"]} label="Add" className="text-slate-500" />
            <PharmacyShortcutHint keys={["Esc"]} label="Close" className="text-slate-500" />
          </span>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
