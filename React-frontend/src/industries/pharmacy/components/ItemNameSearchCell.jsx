import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Link2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  filterMedicineCatalog,
  getCachedMedicineCatalog,
  indexMedicineRow,
  loadMedicineCatalog,
  MEDICINE_LOOKUP_VISIBLE,
  mergeMedicineHits,
  searchMedicineCatalogRemote,
  withAvailableStock,
} from '../lib/medicine-catalog-cache';
import {
  isPharmacyCatalogReady,
  onPharmacyCatalogChange,
} from '../lib/pharmacy-catalog-store';
import {
  markKeystroke,
  markResultsRendered,
  measureSearch,
} from '../lib/pharmacy-search-perf';
import { MedicinePickSheet } from './MedicinePickSheet';
import { MedicineThumb } from './MedicineThumb';

const NO_AUTOCOMPLETE = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other',
};

function resolveFocusIndex(list, productId, label) {
  if (!list?.length) return 0;
  if (productId != null && productId !== '') {
    const idx = list.findIndex((r) => String(r.id) === String(productId));
    if (idx >= 0) return idx;
  }
  const norm = String(label || '')
    .trim()
    .toLowerCase();
  if (norm) {
    const exact = list.findIndex(
      (r) =>
        String(r.name || '')
          .trim()
          .toLowerCase() === norm,
    );
    if (exact >= 0) return exact;
    const partial = list.findIndex((r) =>
      String(r.name || '')
        .toLowerCase()
        .includes(norm),
    );
    if (partial >= 0) return partial;
  }
  return 0;
}

function findProductInPool(pool, productId) {
  if (productId == null || productId === '' || !productId) return null;
  const source = pool?.length ? pool : getCachedMedicineCatalog() || [];
  if (!source?.length) return null;
  return source.find((r) => String(r.id) === String(productId)) || null;
}

function InvoiceMatchDisplay({
  bill,
  catalog,
  linked,
  needsVerify,
  needsMatch,
  hideTitles = false,
  confidence = 0,
  learnedName = '',
  matchExplanation = '',
}) {
  const pct = Number(confidence) > 0 && Number(confidence) < 1
    ? ` · ${Math.round(Number(confidence) * 100)}%`
    : '';
  // Hovering the linked name shows which signals produced the link.
  const catalogTitle = hideTitles
    ? undefined
    : [catalog, matchExplanation].filter(Boolean).join('\n\n');
  return (
    <div className="min-w-0 flex-1 leading-snug">
      <p className="truncate text-[12px] font-medium text-slate-500" title={hideTitles ? undefined : bill}>
        {bill}
      </p>
      {linked && catalog ? (
        <p
          className={cn(
            'mt-0.5 truncate text-[13px] font-semibold',
            needsVerify ? 'text-amber-800' : 'text-emerald-800',
          )}
          title={catalogTitle}
        >
          {catalog}
          {needsVerify ? ` · verify${pct}` : ''}
        </p>
      ) : needsMatch ? (
        <p className="mt-0.5 text-[11px] font-medium text-red-600">
          {learnedName
            ? `Learned as ${learnedName} — pick your product`
            : 'Not linked'}
        </p>
      ) : null}
    </div>
  );
}

/** Full-height POS grid input — matches DispenseCartGrid CELL_INPUT. */
const POS_CELL_INPUT =
  'h-11 w-full min-h-11 border-0 rounded-none bg-transparent pl-9 pr-3 text-[13px] font-medium text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:bg-transparent focus:ring-0 focus-visible:!outline-none disabled:opacity-50';

/**
 * Purchase-grid item name cell — type to search, opens medicine lookup sheet.
 * Shows a compact selected product until the user clicks to change it.
 */
export function ItemNameSearchCell({
  rowIndex,
  selectedLabel = '',
  selectedProductId = '',
  selectedImage = '',
  selectedSub = '',
  linked = false,
  needsVerify = false,
  needsMatch = false,
  autoFocus = false,
  disabled = false,
  inputRef,
  onSelect,
  onSubmitRaw,
  onFocusRow,
  onNavigateRow,
  onCreateNew,
  getAvailableStock,
  blockZeroStock = true,
  warehouseId = null,
  placeholder = 'Type medicine name…',
  className,
  variant = 'default',
  highlightUnmatched = false,
  onEnterNext,
  isEntrySlot = false,
  keyboardBrowseMode = false,
  invoiceMatchMode = false,
  billLabel = '',
  catalogLabel = '',
  lookupMode = 'auto',
  onConfirmLink,
  matchSuggestions = [],
  matchConfidence = 0,
  learnedName = '',
  matchExplanation = '',
}) {
  const fillCell = variant === 'cell';
  // Same medicine lookup sheet as POS sale — everywhere.
  const priceModeResolved = 'sale';
  const hasSelection = Boolean(selectedLabel);
  const [editing, setEditing] = useState(!hasSelection && !keyboardBrowseMode);
  const [q, setQ] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pool, setPool] = useState(() => getCachedMedicineCatalog() || []);
  const [remoteRows, setRemoteRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const localRef = useRef(null);
  const ref = inputRef || localRef;
  const timer = useRef(null);
  const reqId = useRef(0);
  const poolRef = useRef(pool);
  const selectionFocusRef = useRef(null);
  const qRef = useRef(q);
  const autoFocusDoneRef = useRef(false);
  const userFocusRef = useRef(false);

  const applyAvailableToRows = useCallback(
    (list) => {
      if (!list?.length) return [];
      return list
        .map((r) => {
          const indexed = r._lookup ? r : indexMedicineRow(r);
          if (!indexed) return null;
          if (!blockZeroStock) return indexed;
          const gross = Number(indexed.current_stock ?? 0);
          const available = getAvailableStock
            ? getAvailableStock(indexed.id, gross, rowIndex)
            : gross;
          // Only clone when the cart actually reserves some of this product.
          // Reusing the row keeps its identity stable, so memoized result rows
          // skip re-rendering on every keystroke.
          if (available === gross) return indexed;
          return withAvailableStock(indexed, available);
        })
        .filter(Boolean);
    },
    [blockZeroStock, getAvailableStock, rowIndex],
  );

  const showCreateBtn = Boolean(
    onCreateNew &&
      (invoiceMatchMode
        ? Boolean(billLabel || q.trim() || needsMatch || needsVerify)
        : !linked &&
          (needsMatch ||
            q.trim().length >= 1 ||
            (fillCell && Boolean(selectedLabel || billLabel)))),
  );

  const fireCreateNew = (ctx) => {
    const typedName =
      ctx?.typedName || q.trim() || billLabel || selectedLabel || catalogLabel || '';
    onCreateNew?.(rowIndex, { typedName });
  };

  const createNameHint =
    q.trim() || billLabel || selectedLabel || catalogLabel || '';

  const sheetCreateProps = onCreateNew
    ? {
        onCreateNew: (ctx) => fireCreateNew(ctx),
        createNameHint,
      }
    : {};

  const rows = useMemo(() => {
    const effectiveQ =
      invoiceMatchMode && !String(q || '').trim() && billLabel
        ? billLabel
        : q;
    const local = measureSearch(() => filterMedicineCatalog(pool, effectiveQ, MEDICINE_LOOKUP_VISIBLE));
    let list = local;
    if (String(q || '').trim() && remoteRows != null) {
      list = mergeMedicineHits(remoteRows, local, MEDICINE_LOOKUP_VISIBLE);
    }

    const pinId =
      invoiceMatchMode && selectedProductId
        ? selectedProductId
        : selectionFocusRef.current?.productId;
    const pinLabel =
      (invoiceMatchMode && catalogLabel) ||
      selectionFocusRef.current?.label ||
      selectedLabel;

    const pinCurrent = () => {
      let current = findProductInPool(pool, pinId);
      if (!current && pinLabel) {
        const byLabel = filterMedicineCatalog(pool, pinLabel, 3);
        current =
          byLabel.find(
            (r) =>
              String(r.name || '')
                .trim()
                .toLowerCase() === String(pinLabel).trim().toLowerCase(),
          ) || byLabel[0];
      }
      if (!current) return list;
      if (list.some((r) => String(r.id) === String(current.id))) return list;
      return [
        current,
        ...list.filter((r) => String(r.id) !== String(current.id)).slice(0, MEDICINE_LOOKUP_VISIBLE - 1),
      ];
    };

    // Pin the currently linked product only while the pharmacist is browsing,
    // never while they are typing a different name. Pinning Neudopa above
    // "azotek" is what made the wrong green match look like the search winner.
    const typedQuery = String(q || '').trim();
    if (!typedQuery && invoiceMatchMode && (pinId || pinLabel)) {
      list = pinCurrent();
    } else if (!typedQuery && pinId) {
      list = pinCurrent();
    }

    if (invoiceMatchMode && list.length === 0) {
      const fallbackTerm = String(learnedName || catalogLabel || billLabel || q || '').trim();
      if (fallbackTerm) {
        const alt = filterMedicineCatalog(pool, fallbackTerm, MEDICINE_LOOKUP_VISIBLE);
        if (alt.length) list = alt;
      }
    }

    return applyAvailableToRows(list);
  }, [
    pool,
    q,
    remoteRows,
    applyAvailableToRows,
    invoiceMatchMode,
    selectedProductId,
    catalogLabel,
    billLabel,
    selectedLabel,
    learnedName,
  ]);

  const rowsRef = useRef(rows);
  const focusIdxRef = useRef(focusIdx);
  const sheetOpenRef = useRef(sheetOpen);

  useEffect(() => {
    rowsRef.current = rows;
    markResultsRendered();
  }, [rows]);
  useEffect(() => {
    focusIdxRef.current = focusIdx;
  }, [focusIdx]);
  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);
  useEffect(() => {
    poolRef.current = pool;
  }, [pool]);
  useEffect(() => {
    qRef.current = q;
  }, [q]);

  useEffect(() => {
    const cached = getCachedMedicineCatalog();
    if (cached?.length) setPool(cached);
    // Pick up the catalog when it finishes loading, and again after a sync or a
    // stock refresh, so an open sheet never shows stale rows.
    return onPharmacyCatalogChange((next) => setPool(next));
  }, []);

  useEffect(() => {
    if (!hasSelection) setEditing(true);
  }, [hasSelection]);

  const openSheet = useCallback(
    ({ seedQuery, productId, label } = {}) => {
      setSheetOpen(true);
      setRemoteRows(null);

      const reselect = Boolean(productId || label);
      if (reselect) {
        selectionFocusRef.current = { productId, label };
      } else {
        selectionFocusRef.current = null;
      }

      if (seedQuery !== undefined) {
        setQ(seedQuery);
        qRef.current = seedQuery;
      }

      const term = seedQuery !== undefined ? seedQuery : qRef.current;
      const list = filterMedicineCatalog(poolRef.current, term, MEDICINE_LOOKUP_VISIBLE);
      setFocusIdx(reselect ? resolveFocusIndex(list, productId, label) : 0);

      if (!getCachedMedicineCatalog()?.length) {
        setLoading(true);
        loadMedicineCatalog()
          .then((list) => setPool(list))
          .catch(() => setPool([]))
          .finally(() => setLoading(false));
      }
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (
          active?.closest?.(
            '[data-dispense-qty], [data-dispense-price], [data-dispense-disc]',
          )
        ) {
          return;
        }
        ref.current?.focus?.({ preventScroll: true });
      });
    },
    [ref],
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setRemoteRows(null);
    setFocusIdx(0);
    selectionFocusRef.current = null;
  }, []);

  const startEditing = useCallback(() => {
    if (disabled) return;

    // Keep bill label visible in the cell; only seed catalog name into the search box.
    const seed = invoiceMatchMode
      ? String(catalogLabel || learnedName || '').trim()
      : String(selectedLabel || '').trim();

    setEditing(true);

    if (hasSelection && (selectedProductId || selectedLabel || billLabel)) {
      openSheet({
        seedQuery: seed,
        productId: selectedProductId,
        label: catalogLabel || selectedLabel,
      });
    } else if (invoiceMatchMode && (billLabel || learnedName)) {
      openSheet({ seedQuery: String(learnedName || '').trim() });
    } else {
      openSheet({ seedQuery: '' });
    }

    requestAnimationFrame(() => {
      ref.current?.focus?.({ preventScroll: true });
    });
  }, [
    billLabel,
    catalogLabel,
    disabled,
    hasSelection,
    invoiceMatchMode,
    learnedName,
    openSheet,
    ref,
    selectedLabel,
    selectedProductId,
  ]);

  const editPlaceholder =
    hasSelection && editing ? 'Type to search another medicine…' : placeholder;

  const dismissEntrySlot = useCallback(() => {
    if (!isEntrySlot || hasSelection) return;
    window.dispatchEvent(new CustomEvent('pharmacy:cancel-entry-row'));
  }, [hasSelection, isEntrySlot]);

  useEffect(() => {
    const onCommit = (e) => {
      const except = Number(e.detail?.exceptRowIndex);
      if (Number.isFinite(except) && except === rowIndex) return;
      if (!hasSelection) return;
      setEditing(false);
      qRef.current = '';
      setQ('');
      if (sheetOpenRef.current) closeSheet();
    };
    window.addEventListener('pharmacy:commit-item-rows', onCommit);
    return () => window.removeEventListener('pharmacy:commit-item-rows', onCommit);
  }, [closeSheet, hasSelection, rowIndex]);

  useEffect(() => {
    if (!sheetOpen || !selectionFocusRef.current || q.trim()) return;
    const { productId, label } = selectionFocusRef.current;
    const idx = resolveFocusIndex(rows, productId, label);
    setFocusIdx(idx);
  }, [sheetOpen, rows, q]);

  useEffect(() => {
    if (!sheetOpen || !selectedProductId) return;
    const idx = rows.findIndex((r) => String(r.id) === String(selectedProductId));
    if (idx >= 0) setFocusIdx(idx);
  }, [sheetOpen, selectedProductId, rows]);

  useEffect(() => {
    if (!sheetOpen) return;
    const id = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (
        active?.closest?.(
          '[data-dispense-qty], [data-dispense-price], [data-dispense-disc]',
        )
      ) {
        return;
      }
      ref.current?.focus?.({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [sheetOpen, ref]);

  const pick = useCallback(
    (product) => {
      if (!product) return;
      if (blockZeroStock) {
        const lookup = product._lookup;
        const available = Number(product.current_stock ?? lookup?.stock ?? 0);
        if (lookup?.outOfStock || available <= 0) {
          toast.error(`${product.name || 'Product'} is out of stock (0 available)`);
          return;
        }
      }
      closeSheet();
      qRef.current = '';
      setQ('');
      setEditing(false);
      onSelect?.(product, rowIndex);
    },
    [blockZeroStock, closeSheet, onSelect, rowIndex],
  );

  const handleInputFocus = useCallback(() => {
    onFocusRow?.(rowIndex);
    if (keyboardBrowseMode && hasSelection && !editing) {
      userFocusRef.current = false;
      return;
    }
    if (!sheetOpenRef.current) {
      if (hasSelection && !editing) return;
      if (keyboardBrowseMode && !qRef.current.trim()) {
        userFocusRef.current = false;
        return;
      }
      if (hasSelection && (selectedProductId || selectedLabel)) {
        openSheet({
          seedQuery: '',
          productId: selectedProductId,
          label: selectedLabel,
        });
      } else {
        openSheet();
      }
    }
    userFocusRef.current = false;
  }, [
    editing,
    hasSelection,
    keyboardBrowseMode,
    onFocusRow,
    openSheet,
    rowIndex,
    selectedLabel,
    selectedProductId,
  ]);

  const handleInputMouseDown = useCallback((e) => {
    e.stopPropagation();
    userFocusRef.current = true;
    if (document.activeElement !== e.currentTarget) {
      e.currentTarget.focus();
    }
  }, []);

  useEffect(() => {
    const onOpenSheet = (e) => {
      if (Number(e.detail?.rowIndex) !== rowIndex) return;
      if (hasSelection && !editing) {
        startEditing();
        return;
      }
      openSheet();
    };
    window.addEventListener('pharmacy:open-medicine-sheet', onOpenSheet);
    return () => window.removeEventListener('pharmacy:open-medicine-sheet', onOpenSheet);
  }, [openSheet, rowIndex, hasSelection, editing, startEditing]);

  useEffect(() => {
    if (!autoFocus || autoFocusDoneRef.current) return;
    autoFocusDoneRef.current = true;
    startEditing();
  }, [autoFocus, startEditing]);

  useEffect(() => {
    const onCloseSheet = (e) => {
      if (!sheetOpenRef.current) return;
      closeSheet();
      if (hasSelection && !qRef.current.trim()) setEditing(false);
      if (e?.detail?.restoreFocus === false) return;
      const active = document.activeElement;
      if (active?.closest?.('[data-dispense-qty], [data-dispense-price], [data-dispense-disc]')) {
        return;
      }
      requestAnimationFrame(() => ref.current?.focus?.({ preventScroll: true }));
    };
    const onClearRow = (e) => {
      if (Number(e.detail?.rowIndex) !== rowIndex) return;
      qRef.current = '';
      setQ('');
      setRemoteRows(null);
      selectionFocusRef.current = null;
      setFocusIdx(0);
      closeSheet();
      if (hasSelection) {
        setEditing(true);
      }
      if (e?.detail?.restoreFocus === false) return;
      requestAnimationFrame(() => ref.current?.focus?.({ preventScroll: true }));
    };
    window.addEventListener('pharmacy:close-medicine-sheet', onCloseSheet);
    window.addEventListener('pharmacy:clear-item-row', onClearRow);
    return () => {
      window.removeEventListener('pharmacy:close-medicine-sheet', onCloseSheet);
      window.removeEventListener('pharmacy:clear-item-row', onClearRow);
    };
  }, [closeSheet, hasSelection, ref]);

  useEffect(() => {
    if (!sheetOpen) return;

    const onWindowKey = (e) => {
      if (!sheetOpenRef.current) return;
      const target = e.target;
      // Item search input handles its own keys — skip here to avoid double-stepping rows.
      if (target?.closest?.('[data-pharmacy-item-search] input')) return;

      // Never hijack keys while user edits grid fields (qty, rate, disc, etc.)
      if (target?.closest?.('[data-pharmacy-typing]')) return;

      const inOtherField = target?.closest?.(
        'input, textarea, select, [contenteditable="true"], [data-pos-no-scan]',
      );
      if (
        !inOtherField &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const input = ref.current;
        if (input) {
          input.focus({ preventScroll: true });
          const current = qRef.current;
          const start = input.selectionStart ?? current.length;
          const end = input.selectionEnd ?? current.length;
          const next = `${current.slice(0, start)}${e.key}${current.slice(end)}`;
          qRef.current = next;
          setQ(next);
          selectionFocusRef.current = null;
          setFocusIdx(0);
          requestAnimationFrame(() => {
            const pos = start + 1;
            input.setSelectionRange(pos, pos);
          });
        }
        return;
      }

      const inItemCell = target?.closest?.('[data-pharmacy-item-search]');
      const inSheet = target?.closest?.('[data-pharmacy-pick-sheet]');
      if (!inItemCell && !inSheet && target !== document.body) return;

      const list = rowsRef.current;
      if (e.key === 'ArrowDown' && list.length) {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, list.length - 1));
        return;
      }
      if (e.key === 'ArrowUp' && list.length) {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeSheet();
        qRef.current = '';
        setQ('');
        if (hasSelection) setEditing(false);
        else dismissEntrySlot();
        const active = document.activeElement;
        if (
          active?.closest?.(
            '[data-dispense-qty], [data-dispense-price], [data-dispense-disc]',
          )
        ) {
          return;
        }
        requestAnimationFrame(() => ref.current?.focus?.({ preventScroll: true }));
      }
    };

    window.addEventListener('keydown', onWindowKey, true);
    return () => window.removeEventListener('keydown', onWindowKey, true);
  }, [sheetOpen, closeSheet, ref, hasSelection, dismissEntrySlot]);

  const runRemoteFallback = useCallback(
    async (term) => {
      const id = ++reqId.current;
      setLoading(true);
      try {
        const list = await searchMedicineCatalogRemote(term, MEDICINE_LOOKUP_VISIBLE, {
          withStock: blockZeroStock,
          warehouseId,
        });
        if (id !== reqId.current) return;
        setRemoteRows(list);
        setFocusIdx(0);
        const updated = getCachedMedicineCatalog();
        if (updated?.length) setPool(updated);
      } catch {
        if (id === reqId.current) setRemoteRows([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [blockZeroStock, warehouseId],
  );

  // Controlled fallback: a product the local catalog does not know about (just
  // created on another till, say) is still findable. Gated on zero local hits,
  // so a normal search never issues a request.
  useEffect(() => {
    if (!sheetOpen || !isPharmacyCatalogReady()) return undefined;
    const term = q.trim();
    if (term.length < 3 || rows.length > 0 || remoteRows != null) return undefined;
    const id = setTimeout(() => void runRemoteFallback(term), 250);
    return () => clearTimeout(id);
  }, [sheetOpen, q, rows.length, remoteRows, runRemoteFallback]);

  const onChange = (e) => {
    markKeystroke();
    const value = e.target.value;
    qRef.current = value;
    setQ(value);
    if (!sheetOpenRef.current) openSheet();
    selectionFocusRef.current = null;
    setFocusIdx(0);

    clearTimeout(timer.current);
    const term = value.trim();
    const localReady = isPharmacyCatalogReady();

    // Drop anything the server previously returned so stale hits can never rank
    // above the fresh local ones. With the index loaded this leaves no gap: the
    // local results for this keystroke render in the same commit.
    setRemoteRows(null);

    // With the index loaded there is nothing else to do here — results are
    // already computed. A server fallback only happens if the local catalog
    // turns out to have no match at all (see the effect below).
    if (localReady) return;

    // Catalog still loading (very first open, or offline). Use the server so the
    // till is never left without results.
    if (term.length < 2) return;
    timer.current = setTimeout(() => void runRemoteFallback(term), 160);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (sheetOpen && rows.length) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'ArrowDown') {
          setFocusIdx((i) => Math.min(i + 1, rows.length - 1));
        } else {
          setFocusIdx((i) => Math.max(i - 1, 0));
        }
        return;
      }
      if (onNavigateRow) {
        e.preventDefault();
        e.stopPropagation();
        onNavigateRow(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (e.key === 'ArrowDown' && rows.length) {
        e.preventDefault();
        e.stopPropagation();
        openSheet();
        return;
      }
      if (e.key === 'ArrowUp' && rows.length) {
        e.preventDefault();
        e.stopPropagation();
        setFocusIdx((i) => Math.max(i - 1, 0));
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (sheetOpen && rows[focusIdx]) {
        pick(rows[focusIdx]);
        return;
      }
      const term = q.trim();
      if (term && onSubmitRaw) {
        onSubmitRaw(term, rowIndex);
        qRef.current = '';
        setQ('');
        closeSheet();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSheet();
      qRef.current = '';
      setQ('');
      if (hasSelection) setEditing(false);
      else dismissEntrySlot();
    }
    if (e.key === 'Tab' && !e.shiftKey && hasSelection && !q.trim()) {
      closeSheet();
      setEditing(false);
    }
  };

  const navigateRowFromCell = useCallback(
    (delta) => {
      closeSheet();
      qRef.current = '';
      setQ('');
      setEditing(false);
      onNavigateRow?.(delta);
    },
    [closeSheet, onNavigateRow],
  );

  const pickSheet = sheetOpen ? (
    <MedicinePickSheet
      open={sheetOpen}
      onOpenChange={(next) => {
        if (!next) {
          closeSheet();
          if (keyboardBrowseMode || invoiceMatchMode || hasSelection) setEditing(false);
        } else startEditing();
      }}
      rows={rows}
      loading={loading && rows.length === 0}
      catalogCount={pool.length}
      query={q.trim()}
      focusIdx={focusIdx}
      onFocusIdx={setFocusIdx}
      onPick={pick}
      blockZeroStock={blockZeroStock}
      showStock={priceModeResolved === 'sale' || blockZeroStock}
      invoiceNeedsVerify={needsVerify}
      invoiceLinkedProductId={selectedProductId}
      priceMode={priceModeResolved}
      anchorSelector="[data-pharmacy-item-search],[data-grn-field],[data-dispense-qty],[data-dispense-price],[data-dispense-disc],[data-open-return-qty],[data-open-return-price],[data-open-return-disc-pct],[data-open-return-disc-amt],[data-open-return-batch],[data-open-return-expiry]"
      {...sheetCreateProps}
    />
  ) : null;

  if (!editing && hasSelection) {
    const showInvoiceCell = invoiceMatchMode && billLabel;

    return (
      <div
        className={cn(fillCell ? 'h-11 w-full' : 'min-w-[220px]', className)}
        data-pharmacy-item-search
        data-dispense-item-search={rowIndex}
      >
        <div
          tabIndex={disabled ? -1 : 0}
          data-grn-item={rowIndex}
          onClick={() => {
            if (disabled) return;
            onFocusRow?.(rowIndex);
            startEditing();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              if (keyboardBrowseMode || showInvoiceCell) {
                startEditing();
              } else {
                onEnterNext?.();
              }
              return;
            }
            if (onNavigateRow && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              e.preventDefault();
              e.stopPropagation();
              navigateRowFromCell(e.key === 'ArrowDown' ? 1 : -1);
              return;
            }
            if (e.key === 'Tab' && !e.shiftKey) {
              e.preventDefault();
              onEnterNext?.();
            }
          }}
          className={cn(
            'flex w-full items-center gap-1.5 text-left transition-colors outline-none',
            fillCell
              ? cn(
                  'h-11 min-h-11 bg-transparent px-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/35',
                  highlightUnmatched && needsMatch && !linked && 'bg-red-50/40',
                  highlightUnmatched && needsVerify && linked && 'bg-amber-50/50',
                  highlightUnmatched && linked && !needsVerify && !needsMatch && 'bg-emerald-50/40',
                )
              : cn(
                  'rounded-md border px-2 py-1.5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                  linked
                    ? 'border-emerald-200/80 bg-emerald-50/70 hover:bg-emerald-50'
                    : needsMatch
                      ? highlightUnmatched
                        ? 'border-red-300 bg-red-50/90 hover:bg-red-50'
                        : 'border-amber-200 bg-amber-50/80 hover:bg-amber-50'
                      : needsVerify
                        ? 'border-amber-200 bg-amber-50/80 hover:bg-amber-50'
                        : 'border-border bg-background hover:bg-muted/40',
                ),
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          {showInvoiceCell ? (
            <>
              {needsVerify && linked ? (
                <AlertTriangle className="size-3.5 shrink-0 text-amber-600" strokeWidth={2.5} />
              ) : linked ? (
                <Link2 className="size-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} />
              ) : (
                <span className="size-2 shrink-0 rounded-full bg-red-400" />
              )}
              <InvoiceMatchDisplay
                bill={billLabel}
                catalog={catalogLabel}
                linked={linked}
                needsVerify={needsVerify}
                needsMatch={needsMatch}
                hideTitles={sheetOpen}
                confidence={matchConfidence}
                learnedName={learnedName}
                matchExplanation={matchExplanation}
              />
              {needsVerify && linked && onConfirmLink ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="shrink-0 rounded bg-amber-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white hover:bg-amber-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onConfirmLink();
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    e.stopPropagation();
                    onConfirmLink();
                  }}
                >
                  OK
                </span>
              ) : null}
            </>
          ) : (
            <>
              <MedicineThumb src={selectedImage || null} alt="" size="sm" />
              {needsVerify && linked ? (
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-950"
                  title="Verify catalog link — bill name may not fully match"
                >
                  <AlertTriangle className="size-3" strokeWidth={2.5} />
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate font-bold leading-snug text-black',
                    fillCell ? 'text-[13px]' : 'text-[13px]',
                    fillCell && highlightUnmatched && needsMatch && !linked && 'text-red-900',
                    fillCell && highlightUnmatched && needsVerify && linked && 'text-amber-950',
                  )}
                >
                  {selectedLabel}
                </p>
                {selectedSub ? (
                  <p
                    className={cn(
                      'truncate text-[10px] font-medium leading-tight',
                      fillCell ? 'text-slate-500' : 'text-black',
                    )}
                  >
                    {selectedSub}
                  </p>
                ) : null}
              </div>
            </>
          )}
          {showCreateBtn && fillCell ? (
            <button
              type="button"
              className="shrink-0 rounded border border-emerald-200 bg-white px-1 py-px text-[9px] font-semibold text-emerald-800 opacity-0 transition-opacity hover:bg-emerald-50 group-hover:opacity-100 group-focus-within:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fireCreateNew();
              }}
            >
              + New
            </button>
          ) : null}
        </div>
        {showInvoiceCell && matchSuggestions.length > 0 && !fillCell ? (
          <div className="flex flex-wrap gap-1 px-1 pb-1">
            {matchSuggestions.slice(0, 3).map((s) => (
              <button
                key={s.product_id}
                type="button"
                className="rounded border border-amber-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-950 hover:bg-amber-50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect?.({ id: s.product_id, name: s.product_name }, rowIndex);
                }}
              >
                {s.product_name}
                {s.confidence ? ` ${Math.round(Number(s.confidence) * 100)}%` : ''}
              </button>
            ))}
          </div>
        ) : null}
        {showCreateBtn && !fillCell ? (
          <button
            type="button"
            className="mt-1 w-full rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50"
            onClick={fireCreateNew}
          >
            Create new medicine
          </button>
        ) : null}
        {pickSheet}
      </div>
    );
  }

  if (editing && invoiceMatchMode && billLabel) {
    const onInvoiceSearchKeyDown = (e) => {
      if (
        onNavigateRow &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        !sheetOpenRef.current
      ) {
        e.preventDefault();
        e.stopPropagation();
        navigateRowFromCell(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      onKeyDown(e);
    };

    return (
      <div
        className={cn('relative w-full min-w-0', fillCell ? 'min-h-11' : 'min-w-[220px]', className)}
        data-pharmacy-item-search
        data-dispense-item-search={rowIndex}
      >
        <div
          className={cn(
            'flex w-full items-center gap-1.5 px-2 py-1',
            fillCell && 'min-h-11',
            highlightUnmatched && needsMatch && !linked && 'bg-red-50/30',
            highlightUnmatched && needsVerify && linked && 'bg-amber-50/40',
            highlightUnmatched && linked && !needsVerify && !needsMatch && 'bg-emerald-50/35',
          )}
        >
          {needsVerify && linked ? (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="size-3" strokeWidth={2.5} />
            </span>
          ) : linked ? (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Link2 className="size-3" strokeWidth={2.5} />
            </span>
          ) : (
            <MedicineThumb src={selectedImage || null} alt="" size="sm" className="shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[12px] font-semibold leading-tight text-slate-900"
              title={sheetOpen ? undefined : billLabel}
            >
              {billLabel}
            </p>
            <div className="relative mt-0.5">
              <Search className="pointer-events-none absolute top-1/2 left-0 z-10 size-3 -translate-y-1/2 text-slate-400" />
              <input
                ref={ref}
                type="text"
                value={q}
                disabled={disabled}
                onChange={onChange}
                onKeyDown={onInvoiceSearchKeyDown}
                onFocus={() => onFocusRow?.(rowIndex)}
                placeholder={
                  catalogLabel ? `Replace “${catalogLabel.slice(0, 28)}”…` : 'Search catalog to match…'
                }
                data-grn-item={rowIndex}
                data-pharmacy-typing
                className="h-6 w-full min-w-0 border-0 bg-transparent pl-4 pr-1 text-[11px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
                {...NO_AUTOCOMPLETE}
              />
            </div>
          </div>
          {showCreateBtn ? (
            <button
              type="button"
              className="shrink-0 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 hover:bg-emerald-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fireCreateNew();
              }}
            >
              + New
            </button>
          ) : null}
        </div>
        {pickSheet}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-full',
        fillCell ? 'h-12 min-h-12' : 'min-w-[220px]',
        className,
      )}
      data-pharmacy-item-search
      data-dispense-item-search={rowIndex}
    >
      {fillCell ? (
        <>
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-3.5 -translate-y-1/2 text-black" />
          <input
            ref={ref}
            type="text"
            value={q}
            disabled={disabled}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={handleInputFocus}
            onMouseDown={handleInputMouseDown}
            placeholder={editPlaceholder}
            data-grn-item={rowIndex}
            data-pharmacy-typing
            className={cn(
              POS_CELL_INPUT,
              showCreateBtn && 'pe-[4.5rem]',
            )}
            {...NO_AUTOCOMPLETE}
          />
          {showCreateBtn ? (
            <button
              type="button"
              className="absolute top-1/2 right-2 z-20 -translate-y-1/2 rounded border border-emerald-300 bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 hover:bg-emerald-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={fireCreateNew}
            >
              + New
            </button>
          ) : null}
        </>
      ) : (
        <div className="flex h-9 items-center gap-1.5 rounded-md border border-transparent bg-muted/35 px-1.5 focus-within:border-primary/30 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/15">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={ref}
            type="text"
            value={q}
            disabled={disabled}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={handleInputFocus}
            onMouseDown={handleInputMouseDown}
            placeholder={editPlaceholder}
            data-grn-item={rowIndex}
            data-pharmacy-typing
            className="h-full w-full min-w-0 border-0 bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
            {...NO_AUTOCOMPLETE}
          />
        </div>
      )}
      {showCreateBtn && selectedLabel && !fillCell ? (
        <button
          type="button"
          className="mt-1 w-full rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50"
          onClick={fireCreateNew}
        >
          Create “{selectedLabel}”
        </button>
      ) : null}

      {pickSheet}
    </div>
  );
}
