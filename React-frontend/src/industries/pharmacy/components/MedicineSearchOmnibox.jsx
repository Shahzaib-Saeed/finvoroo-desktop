import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Loader2, PackageSearch, ScanBarcode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  filterMedicineCatalog,
  getCachedMedicineCatalog,
  indexMedicineRow,
  loadMedicineCatalog,
  MEDICINE_LOOKUP_VISIBLE,
  mergeMedicineHits,
  prefetchMedicineCatalog,
  searchMedicineCatalogRemote,
} from '../lib/medicine-catalog-cache';
import { MedicinePickSheet } from './MedicinePickSheet';

const NO_AUTOCOMPLETE = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other',
};

/** Counter-speed medicine search — opens a right-side lookup sheet. */
export const MedicineSearchOmnibox = forwardRef(function MedicineSearchOmnibox(
  {
    onSelect,
    onSubmitRaw,
    onMultipleResults,
    onSheetOpenChange,
    placeholder = 'Scan barcode or search medicine…',
    className,
    autoFocus = false,
    preferPosCatalog: _preferPosCatalog = false,
    compact = false,
    scannerReady = false,
    inputRef: externalRef,
  },
  ref,
) {
  const [q, setQ] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pool, setPool] = useState(() => getCachedMedicineCatalog() || []);
  const [remoteRows, setRemoteRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const localRef = useRef(null);
  const inputRef = externalRef || localRef;
  const remoteTimer = useRef(null);
  const remoteReq = useRef(0);
  const onSheetOpenChangeRef = useRef(onSheetOpenChange);

  useEffect(() => {
    onSheetOpenChangeRef.current = onSheetOpenChange;
  }, [onSheetOpenChange]);

  const displayRows = useMemo(() => {
    const local = filterMedicineCatalog(pool, q, MEDICINE_LOOKUP_VISIBLE);
    if (!String(q || '').trim()) return local;
    if (remoteRows == null) return local;
    return mergeMedicineHits(remoteRows, local, MEDICINE_LOOKUP_VISIBLE);
  }, [pool, q, remoteRows]);

  const displayRowsRef = useRef(displayRows);
  const focusIdxRef = useRef(focusIdx);
  const sheetOpenRef = useRef(sheetOpen);
  const qRef = useRef(q);
  const poolRef = useRef(pool);

  useEffect(() => {
    displayRowsRef.current = displayRows;
  }, [displayRows]);
  useEffect(() => {
    focusIdxRef.current = focusIdx;
  }, [focusIdx]);
  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
    onSheetOpenChangeRef.current?.(sheetOpen);
  }, [sheetOpen]);
  useEffect(() => {
    qRef.current = q;
  }, [q]);
  useEffect(() => {
    poolRef.current = pool;
  }, [pool]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus?.();
  }, [autoFocus, inputRef]);

  /** Warm the catalog as soon as the page mounts — sheet open should feel instant. */
  useEffect(() => {
    let cancelled = false;
    prefetchMedicineCatalog();
    const cached = getCachedMedicineCatalog();
    if (cached?.length) {
      setPool(cached);
      return undefined;
    }
    setLoading(true);
    loadMedicineCatalog()
      .then((list) => {
        if (!cancelled) setPool(list);
      })
      .catch(() => {
        if (!cancelled) setPool([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ensurePool = useCallback(async () => {
    const cached = getCachedMedicineCatalog();
    if (cached?.length) {
      setPool(cached);
      return cached;
    }
    setLoading(true);
    try {
      const list = await loadMedicineCatalog();
      setPool(list);
      return list;
    } catch {
      setPool([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const openSheet = useCallback(() => {
    setSheetOpen(true);
    setFocusIdx(0);
    if (!getCachedMedicineCatalog()?.length && !poolRef.current.length) {
      void ensurePool();
    }
  }, [ensurePool]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setRemoteRows(null);
    setFocusIdx(0);
  }, []);

  const pick = useCallback(
    (product) => {
      if (!product) return;
      onSelect?.(product);
      closeSheet();
      setQ('');
    },
    [closeSheet, onSelect],
  );

  const runRemoteSearch = useCallback(
    async (term) => {
      const id = ++remoteReq.current;
      setLoading(true);
      try {
        const list = await searchMedicineCatalogRemote(term, MEDICINE_LOOKUP_VISIBLE);
        if (id !== remoteReq.current) return;
        setRemoteRows(list);
        setFocusIdx(0);
        onMultipleResults?.(list, term);
      } catch {
        if (id === remoteReq.current) setRemoteRows([]);
      } finally {
        if (id === remoteReq.current) setLoading(false);
      }
    },
    [onMultipleResults],
  );

  const onChange = (e) => {
    const value = e.target.value;
    setQ(value);
    if (!sheetOpenRef.current) openSheet();
    setRemoteRows(null);
    setFocusIdx(0);

    clearTimeout(remoteTimer.current);
    const term = value.trim();
    if (!term || term.length < 2) return;

    // Always ask the server. The in-memory pool is only recently sold items
    // (~100), not the full catalogue — skipping the API hid products that exist.
    remoteTimer.current = setTimeout(() => runRemoteSearch(term), 140);
  };

  const shouldHandleSheetKeys = useCallback((target) => {
    if (!target) return true;
    if (target.closest?.('[data-pharmacy-grn-scan]')) return true;
    if (target.closest?.('[data-pharmacy-pick-sheet]')) return true;
    if (target === document.body || target === document.documentElement) return true;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return false;
    if (target.tagName === 'INPUT' || target.isContentEditable) return false;
    return true;
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;

    const onWindowKey = (e) => {
      if (!sheetOpenRef.current) return;
      if (!shouldHandleSheetKeys(e.target)) return;

      const currentRows = displayRowsRef.current;
      const key = e.key;

      if (key === 'ArrowDown' && currentRows.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        setFocusIdx((i) => Math.min(i + 1, currentRows.length - 1));
        return;
      }
      if (key === 'ArrowUp' && currentRows.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        setFocusIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const row = currentRows[focusIdxRef.current] ?? currentRows[0];
        if (row) pick(row);
        return;
      }
      if (key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeSheet();
        requestAnimationFrame(() => inputRef.current?.focus?.({ preventScroll: true }));
      }
    };

    window.addEventListener('keydown', onWindowKey, true);
    return () => window.removeEventListener('keydown', onWindowKey, true);
  }, [sheetOpen, closeSheet, inputRef, pick, shouldHandleSheetKeys]);

  const onKeyDown = (e) => {
    if (sheetOpenRef.current) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      openSheet();
      const currentRows = displayRowsRef.current;
      if (currentRows.length === 1) {
        pick(currentRows[0]);
        return;
      }
      const term = qRef.current.trim();
      if (term && onSubmitRaw) {
        onSubmitRaw(term);
        setQ('');
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setQ('');
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      showResults(term, list) {
        setQ(String(term || '').trim());
        setRemoteRows(
          (list || [])
            .map(indexMedicineRow)
            .filter(Boolean)
            .slice(0, MEDICINE_LOOKUP_VISIBLE),
        );
        setFocusIdx(0);
        setSheetOpen(true);
        void ensurePool();
      },
      open(term = '') {
        setQ(String(term || ''));
        setRemoteRows(null);
        setFocusIdx(0);
        openSheet();
        requestAnimationFrame(() => inputRef.current?.focus?.({ preventScroll: true }));
      },
      clear() {
        setQ('');
        closeSheet();
      },
      focus() {
        inputRef.current?.focus?.();
        openSheet();
      },
    }),
    [closeSheet, ensurePool, inputRef, openSheet],
  );

  return (
    <>
      <div className={cn(className)} data-pharmacy-grn-scan>
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <div
            className={cn(
              'relative flex w-full items-center overflow-hidden rounded-lg border bg-background shadow-xs transition-[border-color,box-shadow]',
              compact ? 'h-9' : 'h-10',
              sheetOpen
                ? 'border-primary/50 ring-2 ring-primary/15'
                : 'border-border hover:border-border/90',
            )}
          >
            <div className="flex shrink-0 items-center border-r border-border/80 bg-muted/30 px-3 text-muted-foreground">
              <ScanBarcode className="size-4 text-primary" />
            </div>
            <Input
              ref={inputRef}
              type="text"
              name="finvoroo-pharmacy-grn-scan"
              role="searchbox"
              enterKeyHint="search"
              value={q}
              onChange={onChange}
              onKeyDown={onKeyDown}
              onFocus={openSheet}
              placeholder={placeholder}
              className={cn(
                'h-full w-full min-w-0 border-0 bg-transparent pl-3 text-sm shadow-none focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
                scannerReady ? 'pr-36' : 'pr-10',
              )}
              data-pharmacy-typing
              {...NO_AUTOCOMPLETE}
            />
            <div className="pointer-events-none absolute right-3 flex items-center gap-2 text-muted-foreground">
              {loading ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : scannerReady ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Scanner Ready
                </span>
              ) : (
                <PackageSearch className="size-4 opacity-40" />
              )}
            </div>
          </div>
        </form>
      </div>

      <MedicinePickSheet
        open={sheetOpen}
        onOpenChange={(next) => {
          setSheetOpen(next);
          if (!next) {
            setRemoteRows(null);
            setFocusIdx(0);
          }
        }}
        rows={displayRows}
        loading={loading && displayRows.length === 0}
        catalogCount={pool.length}
        query={q.trim()}
        focusIdx={focusIdx}
        onFocusIdx={setFocusIdx}
        onPick={pick}
      />
    </>
  );
});
