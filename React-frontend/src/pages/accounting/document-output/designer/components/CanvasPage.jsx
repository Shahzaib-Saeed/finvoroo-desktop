import * as React from "react";
import { Rnd } from "react-rnd";
import {
  Lock,
  Type,
  Image as ImageIcon,
  Table2,
  Calculator,
  Minus,
  Square,
  Tag,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid3x3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDocumentDesignerStore } from "../store/useDocumentDesignerStore";
import { ElementBox } from "./TemplateRenderer";
import {
  documentOutputApi,
  unwrapDoc,
} from "@/pages/accounting/document-output/api/document-output.api";
import { asNumber, pinFlowElementsBelowTable, resolveElementsGeometry } from "../lib/geometry";
import { computeSmartGuides } from "../lib/smartGuides";

const MM_TO_PX = 96 / 25.4;
const mmToPx = (mm) => asNumber(mm, 0) * MM_TO_PX;
const pxToMm = (px) => Math.round((asNumber(px, 0) / MM_TO_PX) * 100) / 100;
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];
const GUIDE_COLOR = "#F24822";
/** Peachtree-style alignment dots — 5mm pitch reads well on A4 without clutter. */
const DOT_GRID_MM = 5;

/**
 * Designer-only paper grid (never printed). Light gray dots — visible for
 * alignment, soft enough that black invoice text stays dominant.
 */
function PaperDotGrid({ spacingMm = DOT_GRID_MM }) {
  const step = mmToPx(spacingMm);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(148, 163, 184, 0.55) 0.75px, transparent 0.9px)",
        backgroundSize: `${step}px ${step}px`,
        backgroundPosition: "0.5px 0.5px",
      }}
    />
  );
}

/** Drag column dividers on the selected items table (Sr shorter / Description wider). */
function ItemsTableColumnResizers({ el, geom, live, onLiveColumns, onCommitColumns }) {
  const columns = el?.columns || [];
  const dragRef = React.useRef(null);
  if (!el || el.type !== "items_table" || columns.length < 2 || !geom) return null;

  const x = live?.x ?? mmToPx(asNumber(geom.x, 0));
  const y = live?.y ?? mmToPx(asNumber(geom.y, 0));
  const w = live?.w ?? mmToPx(asNumber(geom.w, 40));
  const h = Math.max(live?.h ?? mmToPx(asNumber(geom.h, 12)), mmToPx(10));
  const total = columns.reduce((s, c) => s + (Number(c.width_pct) || 0), 0) || 100;

  const onPointerDown = (boundaryIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    const snapshot = columns.map((c) => ({ ...c }));
    const pairTotal =
      (Number(snapshot[boundaryIndex].width_pct) || 10) + (Number(snapshot[boundaryIndex + 1].width_pct) || 10);
    dragRef.current = { boundaryIndex, startX: e.clientX, snapshot, pairTotal, tableW: w };

    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const dxMm = pxToMm(ev.clientX - d.startX);
      const dxPct = (dxMm / pxToMm(d.tableW)) * total;
      const leftPct = (Number(d.snapshot[d.boundaryIndex].width_pct) || 10) + dxPct;
      const pair = d.pairTotal;
      const nextLeft = Math.min(pair - 1, Math.max(1, Math.round(leftPct * 10) / 10));
      const nextRight = Math.round((pair - nextLeft) * 10) / 10;
      const next = d.snapshot.map((c, i) => {
        if (i === d.boundaryIndex) return { ...c, width_pct: nextLeft };
        if (i === d.boundaryIndex + 1) return { ...c, width_pct: nextRight };
        return c;
      });
      onLiveColumns?.(next);
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!d) return;
      const current = useDocumentDesignerStore.getState().elements.find((e) => e.id === el.id)?.columns;
      onCommitColumns?.(d.snapshot, current || d.snapshot);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  let cum = 0;
  const handles = columns.slice(0, -1).map((_, i) => {
    cum += Number(columns[i].width_pct) || 0;
    return { index: i, leftPx: x + (w * cum) / total };
  });

  return (
    <div className="pointer-events-none absolute inset-0 z-[1100]">
      {handles.map((hnd) => (
        <div
          key={hnd.index}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize column"
          className="pointer-events-auto absolute w-3 -translate-x-1/2 cursor-col-resize"
          style={{ left: hnd.leftPx, top: y, height: h }}
          onPointerDown={(e) => onPointerDown(hnd.index, e)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-blue-500/70 shadow-[0_0_0_1px_rgba(255,255,255,0.8)]" />
        </div>
      ))}
    </div>
  );
}

const RESIZE_HANDLES = {
  top: true,
  right: true,
  bottom: true,
  left: true,
  topRight: true,
  topLeft: true,
  bottomRight: true,
  bottomLeft: true,
};

const TYPE_ICONS = {
  text: Type,
  field: Tag,
  image: ImageIcon,
  items_table: Table2,
  totals_block: Calculator,
  line: Minus,
  rect: Square,
};

const TYPE_LABELS = {
  text: "Text",
  field: "Field",
  image: "Image",
  items_table: "Items Table",
  totals_block: "Totals Block",
  line: "Line",
  rect: "Rectangle",
};

function resolvedIdToSchemaId(resolvedId, type) {
  if (type === "items_table_rows" && resolvedId.endsWith("_block")) {
    return resolvedId.slice(0, -6);
  }
  return resolvedId;
}

function hitsAtPoint(elements, geomById, xMm, yMm) {
  const hits = [];
  for (const el of elements) {
    if (el.hidden) continue;
    const g = geomById.get(el.id);
    if (!g) continue;
    if (xMm < g.x || yMm < g.y || xMm > g.x + g.w || yMm > g.y + g.h) continue;
    hits.push({ el, g });
  }
  hits.sort((a, b) => {
    const zDiff = (b.el.z ?? 0) - (a.el.z ?? 0);
    if (zDiff !== 0) return zDiff;
    return a.g.w * a.g.h - b.g.w * b.g.h;
  });
  return hits.map((h) => h.el);
}

function clientPointToMm(clientX, clientY, pageEl, pageWidthMm, pageHeightMm) {
  const rect = pageEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    xMm: ((clientX - rect.left) / rect.width) * pageWidthMm,
    yMm: ((clientY - rect.top) / rect.height) * pageHeightMm,
  };
}

/** Kill native browser text-selection / image-drag ghosts (Figma/Canva never show these). */
function suppressNativeSelectAndDrag() {
  const sel = window.getSelection?.();
  if (sel?.rangeCount) sel.removeAllRanges();
}

function htmlToPlain(html) {
  if (html == null || html === "") return "";
  const div = document.createElement("div");
  div.innerHTML = String(html);
  return (div.innerText || div.textContent || "").replace(/\u00a0/g, " ");
}

function plainToContent(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function typographyCss(style = {}) {
  const css = {};
  if (style.fontFamily) css.fontFamily = `${style.fontFamily}, DejaVu Sans, sans-serif`;
  if (style.fontSize != null) css.fontSize = `${Number(style.fontSize)}pt`;
  if (style.fontWeight === "bold") css.fontWeight = "bold";
  if (style.italic) css.fontStyle = "italic";
  if (style.underline) css.textDecoration = "underline";
  if (style.align) css.textAlign = style.align;
  if (style.color) css.color = style.color;
  if (style.letterSpacing != null) css.letterSpacing = `${Number(style.letterSpacing)}mm`;
  if (style.lineHeight != null) css.lineHeight = Number(style.lineHeight);
  return css;
}

function InlineTextEditor({ el, geom, initialValue, onCommit, onCancel }) {
  const ref = React.useRef(null);
  const [value, setValue] = React.useState(initialValue);
  const committedRef = React.useRef(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    node.select();
  }, []);

  const finish = React.useCallback(
    (next) => {
      if (committedRef.current) return;
      committedRef.current = true;
      onCommit(next);
    },
    [onCommit],
  );

  const w = Math.max(mmToPx(asNumber(geom?.w, 40)), 40);
  const h = Math.max(mmToPx(asNumber(geom?.h, 8)), 22);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          committedRef.current = true;
          onCancel();
          return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          finish(value);
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      spellCheck={false}
      className="absolute z-[3000] m-0 rounded-sm border border-blue-500 bg-white p-0.5 shadow-md outline-none ring-2 ring-blue-500/30"
      style={{
        left: mmToPx(asNumber(geom?.x, 0)),
        top: mmToPx(asNumber(geom?.y, 0)),
        width: w,
        height: h,
        resize: "none",
        overflow: "auto",
        lineHeight: 1.2,
        ...typographyCss(el.style || {}),
      }}
    />
  );
}

function SmartGuidesOverlay({ guides, pageHeightMm, pageWidthMm }) {
  if (!guides) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[2000]">
      {guides.vGuides?.map((g, i) => (
        <div
          key={`v-${i}`}
          className="absolute top-0"
          style={{
            left: mmToPx(g.x),
            width: 1,
            height: mmToPx(pageHeightMm),
            background: GUIDE_COLOR,
            boxShadow: `0 0 0 0.5px ${GUIDE_COLOR}`,
          }}
        />
      ))}
      {guides.hGuides?.map((g, i) => (
        <div
          key={`h-${i}`}
          className="absolute left-0"
          style={{
            top: mmToPx(g.y),
            height: 1,
            width: mmToPx(pageWidthMm),
            background: GUIDE_COLOR,
            boxShadow: `0 0 0 0.5px ${GUIDE_COLOR}`,
          }}
        />
      ))}
      {guides.distances?.map((d, i) =>
        d.type === "v" ? (
          <div key={`dv-${i}`} className="absolute" style={{ left: mmToPx(d.x), top: mmToPx(d.y1) }}>
            <div
              style={{
                width: 1,
                height: mmToPx(d.y2 - d.y1),
                background: GUIDE_COLOR,
                marginLeft: -0.5,
              }}
            />
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded px-1 text-[9px] font-semibold text-white"
              style={{ background: GUIDE_COLOR }}
            >
              {d.label}
            </span>
          </div>
        ) : (
          <div key={`dh-${i}`} className="absolute" style={{ left: mmToPx(d.x1), top: mmToPx(d.y) }}>
            <div
              style={{
                height: 1,
                width: mmToPx(d.x2 - d.x1),
                background: GUIDE_COLOR,
                marginTop: -0.5,
              }}
            />
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded px-1 text-[9px] font-semibold text-white"
              style={{ background: GUIDE_COLOR }}
            >
              {d.label}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

const InteractiveBox = React.memo(function InteractiveBox({
  el,
  geom,
  selected,
  primary,
  zoom,
  live,
  showSize,
  disableResize,
  disableInteraction,
  onSelectClick,
  onDoubleClick,
  onCycleAtPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}) {
  const Icon = TYPE_ICONS[el.type] || Type;
  const baseX = asNumber(geom?.x, 0);
  const baseY = asNumber(geom?.y, 0);
  const baseW = asNumber(geom?.w, 40);
  const baseH = asNumber(geom?.h, 8);

  const x = live?.x ?? mmToPx(baseX);
  const y = live?.y ?? mmToPx(baseY);
  const w = live?.w ?? mmToPx(baseW);
  const h = live?.h ?? mmToPx(baseH);

  const sizeW = Math.round((live ? pxToMm(w) : baseW) * 10) / 10;
  const sizeH = Math.round((live ? pxToMm(h) : baseH) * 10) / 10;

  return (
    <Rnd
      scale={zoom}
      size={{ width: Math.max(w, 4), height: Math.max(h, 4) }}
      position={{ x, y }}
      bounds="parent"
      disableDragging={!!el.locked || !!disableInteraction}
      enableResizing={el.locked || disableResize || disableInteraction ? false : RESIZE_HANDLES}
      onDragStart={() => onDragStart?.(el.id, { x: baseX, y: baseY, w: baseW, h: baseH })}
      onDrag={(e, d) => onDragMove?.(el.id, d.x, d.y, baseW, baseH)}
      onDragStop={(e, d) => onDragEnd?.(el.id, d.x, d.y)}
      onResizeStart={() => onResizeStart?.(el.id, { x: baseX, y: baseY, w: baseW, h: baseH })}
      onResize={(e, dir, ref, delta, position) => {
        onResizeMove?.(el.id, {
          x: position.x,
          y: position.y,
          w: ref.offsetWidth,
          h: el.type === "items_table" ? mmToPx(baseH) : ref.offsetHeight,
        });
      }}
      onResizeStop={(e, dir, ref, delta, position) => {
        onResizeEnd?.(el.id, {
          x: pxToMm(position.x),
          y: pxToMm(position.y),
          w: pxToMm(ref.offsetWidth),
          h: el.type === "items_table" ? baseH : pxToMm(ref.offsetHeight),
        });
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        // Clear native selection ghosts without preventDefault — that would cancel react-rnd drag.
        suppressNativeSelectAndDrag();
        if (e.altKey) {
          e.preventDefault();
          onCycleAtPoint?.(e.clientX, e.clientY);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.altKey || disableInteraction) return;
        onSelectClick?.(el.id, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (el.locked || disableInteraction) return;
        onDoubleClick?.(el.id, e);
      }}
      className={cn(
        "group border border-dashed border-transparent hover:border-blue-300/70",
        selected && "border-solid border-blue-500",
        primary && "shadow-[0_0_0_1px_rgba(59,130,246,0.45)]",
        el.hidden && "opacity-30",
        disableInteraction && "opacity-0",
        (!selected || disableResize || disableInteraction) &&
          "[&_.react-resizable-handle]:pointer-events-none [&_.react-resizable-handle]:opacity-0",
        selected &&
          !disableResize &&
          !disableInteraction &&
          "[&_.react-resizable-handle]:opacity-100",
      )}
      style={{
        zIndex: selected ? 1000 : (el.z ?? 0) + 1,
        pointerEvents: el.hidden || disableInteraction ? "none" : "auto",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {selected && primary && !disableInteraction && (
        <div className="pointer-events-none absolute -top-5 left-0 z-10 flex max-w-[180px] items-center gap-1 truncate rounded bg-blue-500 px-1.5 py-0.5 text-[10px] text-white">
          <Icon className="size-3 shrink-0" />
          <span className="truncate">{TYPE_LABELS[el.type] || el.type}</span>
          {el.locked && <Lock className="size-3 shrink-0" />}
        </div>
      )}
      {showSize && selected && !disableInteraction && (
        <div
          className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style={{ bottom: -22, background: "#111827" }}
        >
          {sizeW} × {sizeH} mm
        </div>
      )}
    </Rnd>
  );
});

export function CanvasPage({
  documentType,
  sampleInvoiceId,
  invoices,
  onSampleInvoiceChange,
}) {
  const page = useDocumentDesignerStore((s) => s.page);
  const elements = useDocumentDesignerStore((s) => s.elements);
  const selectedIds = useDocumentDesignerStore((s) => s.selectedIds);
  const selectedId = useDocumentDesignerStore((s) => s.selectedId);
  const setSelectedId = useDocumentDesignerStore((s) => s.setSelectedId);
  const setSelectedIds = useDocumentDesignerStore((s) => s.setSelectedIds);
  const toggleSelectedId = useDocumentDesignerStore((s) => s.toggleSelectedId);
  const commitResize = useDocumentDesignerStore((s) => s.commitResize);
  const commitBatchMove = useDocumentDesignerStore((s) => s.commitBatchMove);
  const commitSetElement = useDocumentDesignerStore((s) => s.commitSetElement);
  const commitPropertyChange = useDocumentDesignerStore((s) => s.commitPropertyChange);
  const setPropertyLive = useDocumentDesignerStore((s) => s.setPropertyLive);
  const recordPropertyChange = useDocumentDesignerStore((s) => s.recordPropertyChange);
  const setInteractionGeom = useDocumentDesignerStore((s) => s.setInteractionGeom);
  const toConfig = useDocumentDesignerStore((s) => s.toConfig);

  const [resolvedModel, setResolvedModel] = React.useState(null);
  const [zoom, setZoom] = React.useState(1);
  const [showDotGrid, setShowDotGrid] = React.useState(true);
  /** Map id -> {x,y,w,h} in px during drag/resize */
  const [liveMap, setLiveMap] = React.useState(null);
  const [guides, setGuides] = React.useState(null);
  const [marquee, setMarquee] = React.useState(null);
  /** { id, initial } while double-click editing text/field on canvas */
  const [inlineEdit, setInlineEdit] = React.useState(null);
  const pageRef = React.useRef(null);
  const dragOriginRef = React.useRef(null);
  const resizeOriginRef = React.useRef(null);
  const marqueeRef = React.useRef(null);

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const isDragging = !!liveMap;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const configSnapshot = React.useMemo(() => JSON.stringify(toConfig()), [elements, page]);

  React.useEffect(() => {
    if (!sampleInvoiceId || isDragging) return undefined;
    const handle = setTimeout(async () => {
      try {
        const res = await documentOutputApi.previewWithConfig(
          documentType,
          sampleInvoiceId,
          JSON.parse(configSnapshot),
        );
        setResolvedModel(unwrapDoc(res));
      } catch {
        /* keep last preview */
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [configSnapshot, documentType, sampleInvoiceId, isDragging]);

  const resolvedById = React.useMemo(() => {
    const map = new Map();
    for (const el of resolvedModel?.pages?.[0]?.elements ?? []) {
      map.set(resolvedIdToSchemaId(el.id, el.type), el);
    }
    return map;
  }, [resolvedModel]);

  const isAutoHeight = page.height_mode === "auto";
  const effectivePageHeightMm =
    isAutoHeight && resolvedModel?.page?.height_mm
      ? resolvedModel.page.height_mm
      : page.height_mm;

  const pageForGeom = React.useMemo(
    () => ({ ...page, height_mm: effectivePageHeightMm }),
    [page, effectivePageHeightMm],
  );

  const geomById = React.useMemo(
    () => resolveElementsGeometry(elements, pageForGeom, resolvedById),
    [elements, pageForGeom, resolvedById],
  );

  React.useEffect(() => {
    setInteractionGeom(geomById);
  }, [geomById, setInteractionGeom]);

  // When sample invoice has more lines, absolute Y for totals / thank-you often
  // lands inside the taller table. Pin those blocks under the items table.
  React.useEffect(() => {
    if (isDragging) return;
    const { next, changed } = pinFlowElementsBelowTable(elements, geomById);
    if (!changed) return;
    useDocumentDesignerStore.setState({ elements: next, dirty: true });
  }, [elements, geomById, isDragging]);

  const pageWidthPx = mmToPx(page.width_mm);
  const pageHeightPx = mmToPx(effectivePageHeightMm);

  const cycleAtPoint = React.useCallback(
    (clientX, clientY) => {
      const pageEl = pageRef.current;
      if (!pageEl) return;
      const pt = clientPointToMm(clientX, clientY, pageEl, page.width_mm, effectivePageHeightMm);
      if (!pt) return;
      const hits = hitsAtPoint(elements, geomById, pt.xMm, pt.yMm);
      if (!hits.length) {
        setSelectedIds([]);
        return;
      }
      const currentIdx = hits.findIndex((h) => h.id === selectedId);
      setSelectedId(hits[currentIdx === -1 ? 0 : (currentIdx + 1) % hits.length].id);
    },
    [elements, geomById, effectivePageHeightMm, page.width_mm, selectedId, setSelectedId, setSelectedIds],
  );

  const handleSelectClick = React.useCallback(
    (id, e) => {
      if (inlineEdit) return;
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        toggleSelectedId(id);
      } else if (!selectedSet.has(id) || selectedIds.length > 1) {
        // Keep multi if clicking already-selected member without modifiers (for group drag).
        // Pure click on unselected → single select. Click on one of many → keep group.
        if (selectedSet.has(id) && selectedIds.length > 1) return;
        setSelectedId(id);
      }
    },
    [inlineEdit, selectedSet, selectedIds.length, setSelectedId, toggleSelectedId],
  );

  const startInlineEdit = React.useCallback(
    (id) => {
      const el = elements.find((e) => e.id === id);
      if (!el || el.locked || el.hidden) return;
      if (el.type !== "text" && el.type !== "field") return;

      let initial = "";
      if (el.type === "text") {
        initial = htmlToPlain(el.content);
      } else {
        const resolved = resolvedById.get(el.id);
        const value =
          resolved?.value != null && String(resolved.value).length
            ? String(resolved.value)
            : el.binding
              ? `{{${el.binding}}}`
              : "";
        initial = el.label ? `${el.label} ${value}`.trim() : value;
      }

      setSelectedId(id);
      setInlineEdit({ id, initial });
    },
    [elements, resolvedById, setSelectedId],
  );

  const cancelInlineEdit = React.useCallback(() => setInlineEdit(null), []);

  const commitInlineEdit = React.useCallback(
    (nextText) => {
      const editing = inlineEdit;
      setInlineEdit(null);
      if (!editing) return;

      const el = elements.find((e) => e.id === editing.id);
      if (!el) return;

      const trimmedInitial = editing.initial;
      if (nextText === trimmedInitial) return;

      if (el.type === "text") {
        commitPropertyChange(el.id, "content", el.content, plainToContent(nextText));
        return;
      }

      if (el.type === "field") {
        const after = {
          ...el,
          type: "text",
          content: plainToContent(nextText),
        };
        delete after.binding;
        delete after.label;
        delete after.value;
        commitSetElement(el.id, el, after);
      }
    },
    [inlineEdit, elements, commitPropertyChange, commitSetElement],
  );

  const handleDoubleClick = React.useCallback(
    (id) => {
      startInlineEdit(id);
    },
    [startInlineEdit],
  );

  React.useEffect(() => {
    if (!inlineEdit) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setInlineEdit(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [inlineEdit]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (inlineEdit) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (selectedIds.length !== 1) return;
      const el = elements.find((x) => x.id === selectedIds[0]);
      if (!el || (el.type !== "text" && el.type !== "field")) return;
      e.preventDefault();
      startInlineEdit(el.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inlineEdit, selectedIds, elements, startInlineEdit]);

  const handleDragStart = React.useCallback(
    (id, geom) => {
      suppressNativeSelectAndDrag();
      const ids = selectedIds.includes(id) ? selectedIds : [id];
      if (!selectedIds.includes(id)) setSelectedId(id);
      const origins = {};
      for (const sid of ids) {
        const g = geomById.get(sid);
        if (!g) continue;
        const el = elements.find((e) => e.id === sid);
        if (el?.locked) continue;
        origins[sid] = { x: g.x, y: g.y, w: g.w, h: g.h };
      }
      // Ensure primary drag target is included
      origins[id] = { x: geom.x, y: geom.y, w: geom.w, h: geom.h };
      dragOriginRef.current = { primaryId: id, origins };
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
    },
    [selectedIds, geomById, elements, setSelectedId],
  );

  const handleDragMove = React.useCallback(
    (id, xPx, yPx, baseW, baseH) => {
      const ctx = dragOriginRef.current;
      if (!ctx) return;
      const primary = ctx.origins[id] || ctx.origins[ctx.primaryId];
      if (!primary) return;

      let nextX = pxToMm(xPx);
      let nextY = pxToMm(yPx);
      const moving = { x: nextX, y: nextY, w: primary.w, h: primary.h };

      const others = [];
      geomById.forEach((g, gid) => {
        if (ctx.origins[gid]) return;
        others.push({ id: gid, ...g });
      });

      const snap = computeSmartGuides(moving, others, pageForGeom);
      nextX = snap.x;
      nextY = snap.y;
      setGuides(snap);

      const dx = nextX - primary.x;
      const dy = nextY - primary.y;
      const nextLive = {};
      for (const [sid, o] of Object.entries(ctx.origins)) {
        nextLive[sid] = {
          x: mmToPx(o.x + dx),
          y: mmToPx(o.y + dy),
          w: mmToPx(o.w),
          h: mmToPx(o.h),
        };
      }
      // Keep Rnd's controlled position in sync with snap for the dragged node
      nextLive[id] = {
        x: mmToPx(nextX),
        y: mmToPx(nextY),
        w: mmToPx(baseW),
        h: mmToPx(baseH),
      };
      setLiveMap(nextLive);
    },
    [geomById, pageForGeom],
  );

  const handleDragEnd = React.useCallback(
    (id, xPx, yPx) => {
      const ctx = dragOriginRef.current;
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      suppressNativeSelectAndDrag();
      setGuides(null);
      setLiveMap(null);
      if (!ctx) return;

      const primary = ctx.origins[id] || ctx.origins[ctx.primaryId];
      if (!primary) {
        dragOriginRef.current = null;
        return;
      }

      let nextX = pxToMm(xPx);
      let nextY = pxToMm(yPx);
      const others = [];
      geomById.forEach((g, gid) => {
        if (ctx.origins[gid]) return;
        others.push({ id: gid, ...g });
      });
      const snap = computeSmartGuides(
        { x: nextX, y: nextY, w: primary.w, h: primary.h },
        others,
        pageForGeom,
      );
      nextX = snap.x;
      nextY = snap.y;
      const dx = nextX - primary.x;
      const dy = nextY - primary.y;

      const moves = Object.entries(ctx.origins).map(([sid, o]) => ({
        elementId: sid,
        from: { x: o.x, y: o.y },
        to: {
          x: Math.round((o.x + dx) * 100) / 100,
          y: Math.round((o.y + dy) * 100) / 100,
        },
      }));
      commitBatchMove(moves);
      dragOriginRef.current = null;
    },
    [geomById, pageForGeom, commitBatchMove],
  );

  const handleResizeStart = React.useCallback((id, geom) => {
    resizeOriginRef.current = { id, ...geom };
    setSelectedId(id);
  }, [setSelectedId]);

  const handleResizeMove = React.useCallback(
    (id, livePx) => {
      const moving = {
        x: pxToMm(livePx.x),
        y: pxToMm(livePx.y),
        w: pxToMm(livePx.w),
        h: pxToMm(livePx.h),
      };
      const others = [];
      geomById.forEach((g, gid) => {
        if (gid === id) return;
        others.push({ id: gid, ...g });
      });
      const snap = computeSmartGuides(moving, others, pageForGeom);
      setGuides(snap);
      setLiveMap({
        [id]: {
          x: mmToPx(snap.x),
          y: mmToPx(snap.y),
          w: livePx.w,
          h: livePx.h,
        },
      });
    },
    [geomById, pageForGeom],
  );

  const handleResizeEnd = React.useCallback(
    (id, to) => {
      const from = resizeOriginRef.current;
      setGuides(null);
      setLiveMap(null);
      if (!from || from.id !== id) return;
      const others = [];
      geomById.forEach((g, gid) => {
        if (gid === id) return;
        others.push({ id: gid, ...g });
      });
      const snap = computeSmartGuides(to, others, pageForGeom);
      commitResize(
        id,
        { x: from.x, y: from.y, w: from.w, h: from.h },
        { x: snap.x, y: snap.y, w: to.w, h: to.h },
      );
      resizeOriginRef.current = null;
    },
    [geomById, pageForGeom, commitResize],
  );

  // Marquee selection on empty page — never allow native text/image selection ghosts.
  const handlePageMouseDown = React.useCallback(
    (e) => {
      if (e.target !== e.currentTarget && !e.target?.dataset?.canvasPage) return;
      const pageEl = pageRef.current;
      if (!pageEl) return;

      e.preventDefault();
      e.stopPropagation();
      suppressNativeSelectAndDrag();

      const pt = clientPointToMm(e.clientX, e.clientY, pageEl, page.width_mm, effectivePageHeightMm);
      if (!pt) return;

      const hits = hitsAtPoint(elements, geomById, pt.xMm, pt.yMm);
      if (hits.length > 0) {
        if (e.altKey && hits.length > 1) {
          cycleAtPoint(e.clientX, e.clientY);
          return;
        }
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          toggleSelectedId(hits[0].id);
        } else {
          setSelectedId(hits[0].id);
        }
        return;
      }

      // Start marquee
      const start = { x: pt.xMm, y: pt.yMm };
      marqueeRef.current = { start, additive: e.shiftKey || e.metaKey || e.ctrlKey };
      setMarquee({ x: start.x, y: start.y, w: 0, h: 0 });
      if (!marqueeRef.current.additive) setSelectedIds([]);

      const prevUserSelect = document.body.style.userSelect;
      const prevCursor = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
      document.body.style.cursor = "crosshair";

      const onMove = (ev) => {
        ev.preventDefault();
        suppressNativeSelectAndDrag();
        const p = clientPointToMm(ev.clientX, ev.clientY, pageEl, page.width_mm, effectivePageHeightMm);
        if (!p || !marqueeRef.current) return;
        const s = marqueeRef.current.start;
        setMarquee({
          x: Math.min(s.x, p.xMm),
          y: Math.min(s.y, p.yMm),
          w: Math.abs(p.xMm - s.x),
          h: Math.abs(p.yMm - s.y),
        });
      };
      const onUp = (ev) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = prevUserSelect;
        document.body.style.webkitUserSelect = prevUserSelect;
        document.body.style.cursor = prevCursor;
        suppressNativeSelectAndDrag();

        const p = clientPointToMm(ev.clientX, ev.clientY, pageEl, page.width_mm, effectivePageHeightMm);
        const s = marqueeRef.current?.start;
        const additive = marqueeRef.current?.additive;
        marqueeRef.current = null;
        setMarquee(null);
        if (!s || !p) return;
        const rect = {
          x: Math.min(s.x, p.xMm),
          y: Math.min(s.y, p.yMm),
          w: Math.abs(p.xMm - s.x),
          h: Math.abs(p.yMm - s.y),
        };
        if (rect.w < 1 && rect.h < 1) {
          if (!additive) setSelectedIds([]);
          return;
        }
        const picked = [];
        for (const el of elements) {
          if (el.hidden) continue;
          const g = geomById.get(el.id);
          if (!g) continue;
          const intersects =
            g.x < rect.x + rect.w &&
            g.x + g.w > rect.x &&
            g.y < rect.y + rect.h &&
            g.y + g.h > rect.y;
          if (intersects) picked.push(el.id);
        }
        if (additive) {
          const merged = Array.from(new Set([...selectedIds, ...picked]));
          setSelectedIds(merged);
        } else {
          setSelectedIds(picked);
        }
      };
      window.addEventListener("mousemove", onMove, { passive: false });
      window.addEventListener("mouseup", onUp);
    },
    [
      elements,
      geomById,
      page.width_mm,
      effectivePageHeightMm,
      cycleAtPoint,
      toggleSelectedId,
      setSelectedId,
      setSelectedIds,
      selectedIds,
    ],
  );

  const previewElements = resolvedModel?.pages?.[0]?.elements ?? [];

  const schemaById = React.useMemo(() => {
    const map = new Map();
    for (const el of elements) map.set(el.id, el);
    return map;
  }, [elements]);

  /** Overlay live schema props (label layout, etc.) onto server-resolved preview boxes. */
  const mergePreviewElement = React.useCallback(
    (resolvedEl) => {
      const schemaId = resolvedIdToSchemaId(resolvedEl.id, resolvedEl.type);
      const schemaEl = schemaById.get(schemaId);
      if (!schemaEl) return resolvedEl;
      return {
        ...resolvedEl,
        label: schemaEl.label ?? resolvedEl.label,
        label_layout: schemaEl.label_layout ?? resolvedEl.label_layout,
        label_width_mm: schemaEl.label_width_mm ?? resolvedEl.label_width_mm,
        binding: schemaEl.binding ?? resolvedEl.binding,
        // Prefer schema `src` (uploaded logo) so canvas updates immediately after upload.
        src: (schemaEl.src && String(schemaEl.src).trim()) || resolvedEl.src,
        content: schemaEl.type === 'text' ? (schemaEl.content ?? resolvedEl.content) : resolvedEl.content,
        fontSize: schemaEl.fontSize ?? resolvedEl.fontSize ?? resolvedEl.style?.fontSize,
        fontWeight: schemaEl.fontWeight ?? resolvedEl.fontWeight ?? resolvedEl.style?.fontWeight,
        fontFamily: schemaEl.fontFamily ?? resolvedEl.fontFamily ?? resolvedEl.style?.fontFamily,
        align: schemaEl.align ?? resolvedEl.align ?? resolvedEl.style?.align,
        color: schemaEl.color ?? resolvedEl.color ?? resolvedEl.style?.color,
        // Live column widths from schema while dragging / editing widths (before preview re-fetch).
        columns:
          Array.isArray(schemaEl.columns) && Array.isArray(resolvedEl.columns)
            ? resolvedEl.columns.map((rc, i) => {
                const sc = schemaEl.columns[i] || schemaEl.columns.find((c) => c.key && c.key === rc.key);
                if (!sc) return rc;
                return {
                  ...rc,
                  width_pct: sc.width_pct ?? rc.width_pct,
                  label: sc.label ?? rc.label,
                  align: sc.align ?? rc.align,
                };
              })
            : resolvedEl.columns,
        style: {
          ...(resolvedEl.style || {}),
          ...(schemaEl.fontSize != null ? { fontSize: schemaEl.fontSize } : {}),
          ...(schemaEl.fontWeight != null ? { fontWeight: schemaEl.fontWeight } : {}),
          ...(schemaEl.fontFamily != null ? { fontFamily: schemaEl.fontFamily } : {}),
          ...(schemaEl.align != null ? { align: schemaEl.align } : {}),
          ...(schemaEl.color != null ? { color: schemaEl.color } : {}),
          ...(schemaEl.italic != null ? { italic: schemaEl.italic } : {}),
          ...(schemaEl.underline != null ? { underline: schemaEl.underline } : {}),
          ...(schemaEl.objectFit != null ? { objectFit: schemaEl.objectFit } : {}),
        },
      };
    },
    [schemaById],
  );

  const displayGeom = React.useCallback(
    (schemaId, fallbackEl) => {
      if (liveMap?.[schemaId]) {
        const L = liveMap[schemaId];
        return {
          x: pxToMm(L.x),
          y: pxToMm(L.y),
          w: pxToMm(L.w),
          h: pxToMm(L.h),
        };
      }
      return (
        geomById.get(schemaId) || {
          x: asNumber(fallbackEl?.x, 0),
          y: asNumber(fallbackEl?.y, 0),
          w: asNumber(fallbackEl?.w, 0),
          h: asNumber(fallbackEl?.h, 0),
        }
      );
    },
    [geomById, liveMap],
  );

  const multiSelected = selectedIds.length > 1;

  return (
    <div
      className="relative flex-1 overflow-auto p-10"
      style={{
        backgroundColor: "#e8e8e8",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)",
        backgroundSize: "16px 16px",
      }}
      onClick={() => setSelectedIds([])}
    >
      {invoices && invoices.length > 0 && (
        <div className="sticky top-0 z-20 mx-auto mb-4 w-fit rounded-lg border border-[#d8d8d8] bg-white/95 px-2 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md">
          <Select
            value={sampleInvoiceId ? String(sampleInvoiceId) : undefined}
            onValueChange={(v) => onSampleInvoiceChange?.(Number(v))}
          >
            <SelectTrigger className="h-7 w-64 border-0 bg-transparent text-[12px] shadow-none" onClick={(e) => e.stopPropagation()}>
              <SelectValue placeholder="Sample invoice for live preview" />
            </SelectTrigger>
            <SelectContent onClick={(e) => e.stopPropagation()}>
              {invoices.map((inv) => (
                <SelectItem key={inv.id} value={String(inv.id)}>
                  {inv.number || inv.invoice_number || `#${inv.id}`} —{" "}
                  {inv.customer?.name || inv.customer_name || ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div
        className="mx-auto"
        style={{ width: `${pageWidthPx * zoom}px`, height: `${pageHeightPx * zoom}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={pageRef}
          data-canvas-page="1"
          className="relative bg-white select-none"
          style={{
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 12px 28px rgba(0,0,0,0.10)",
            width: `${pageWidthPx}px`,
            height: `${pageHeightPx}px`,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            cursor: marquee ? "crosshair" : "default",
          }}
          onMouseDown={handlePageMouseDown}
          onDragStart={(e) => e.preventDefault()}
        >
          {showDotGrid ? <PaperDotGrid /> : null}

          <div
            className="pointer-events-none absolute inset-0 z-[1] overflow-hidden text-black select-none"
            style={{ fontSize: "9pt", userSelect: "none", WebkitUserSelect: "none" }}
          >
            {previewElements
              .slice()
              .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
              .map((rawEl) => {
                const el = mergePreviewElement(rawEl);
                const schemaId = resolvedIdToSchemaId(el.id, el.type);
                if (inlineEdit?.id === schemaId) return null;
                // Trust server-resolved x/y/w/h for the paint layer so long invoices
                // (tall items table + after: anchors) match print. Schema geom is
                // only for interactive handles via geomById.
                const x = asNumber(el.x, 0);
                const y = asNumber(el.y, 0);
                const w = asNumber(el.w, 0);
                const h = asNumber(el.h, 0);
                return (
                  <ElementBox
                    key={el.id}
                    element={el}
                    style={{
                      left: `${mmToPx(x)}px`,
                      top: `${mmToPx(y)}px`,
                      width: `${mmToPx(w)}px`,
                      ...(h > 0 ? { height: `${mmToPx(h)}px` } : {}),
                    }}
                  />
                );
              })}
          </div>

          {elements
            .slice()
            .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
            .map((el) => (
              <InteractiveBox
                key={el.id}
                el={el}
                geom={geomById.get(el.id)}
                selected={selectedSet.has(el.id)}
                primary={el.id === selectedId}
                zoom={zoom}
                live={liveMap?.[el.id] || null}
                showSize={el.id === selectedId || (multiSelected && selectedSet.has(el.id))}
                disableResize={multiSelected && selectedSet.has(el.id)}
                disableInteraction={inlineEdit?.id === el.id}
                onSelectClick={handleSelectClick}
                onDoubleClick={handleDoubleClick}
                onCycleAtPoint={cycleAtPoint}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onResizeStart={handleResizeStart}
                onResizeMove={handleResizeMove}
                onResizeEnd={handleResizeEnd}
              />
            ))}

          {inlineEdit && (() => {
            const el = elements.find((e) => e.id === inlineEdit.id);
            const geom = geomById.get(inlineEdit.id);
            if (!el || !geom) return null;
            return (
              <InlineTextEditor
                key={inlineEdit.id}
                el={el}
                geom={geom}
                initialValue={inlineEdit.initial}
                onCommit={commitInlineEdit}
                onCancel={cancelInlineEdit}
              />
            );
          })()}

          <SmartGuidesOverlay
            guides={guides}
            pageWidthMm={page.width_mm}
            pageHeightMm={effectivePageHeightMm}
          />

          {(() => {
            const tableEl = elements.find((e) => e.id === selectedId && e.type === "items_table");
            if (!tableEl || multiSelected) return null;
            return (
              <ItemsTableColumnResizers
                el={tableEl}
                geom={geomById.get(tableEl.id)}
                live={liveMap?.[tableEl.id] || null}
                onLiveColumns={(nextCols) => setPropertyLive(tableEl.id, "columns", nextCols)}
                onCommitColumns={(before, after) =>
                  recordPropertyChange(tableEl.id, "columns", before, after)
                }
              />
            );
          })()}

          {marquee && marquee.w + marquee.h > 0 && (
            <div
              className="pointer-events-none absolute z-[2100] border border-blue-500 bg-blue-500/10"
              style={{
                left: mmToPx(marquee.x),
                top: mmToPx(marquee.y),
                width: mmToPx(marquee.w),
                height: mmToPx(marquee.h),
              }}
            />
          )}
        </div>
      </div>

      <div
        className="sticky bottom-3 z-20 mx-auto flex w-fit items-center gap-1 rounded-lg border border-[#d8d8d8] bg-white/95 px-1.5 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => setZoom((z) => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(z) - 1)] ?? z)}
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <Select value={String(zoom)} onValueChange={(v) => setZoom(Number(v))}>
          <SelectTrigger className="h-7 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ZOOM_LEVELS.map((z) => (
              <SelectItem key={z} value={String(z)}>
                {Math.round(z * 100)}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() =>
            setZoom(
              (z) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(z) + 1)] ?? z,
            )
          }
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="size-7" title="Reset zoom" onClick={() => setZoom(1)}>
          <RotateCcw className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={showDotGrid ? "secondary" : "ghost"}
          className="size-7"
          title={showDotGrid ? "Hide alignment dots" : "Show alignment dots"}
          onClick={() => setShowDotGrid((v) => !v)}
        >
          <Grid3x3 className="size-3.5" />
        </Button>
        <span className="ml-1 hidden text-[10px] text-muted-foreground sm:inline">
          Double-click text to edit · Shift/⌘ multi · dots + guides
        </span>
        {selectedIds.length > 0 && (
          <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
            {selectedIds.length} selected
          </span>
        )}
      </div>
    </div>
  );
}
