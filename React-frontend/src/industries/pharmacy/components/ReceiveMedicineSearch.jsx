import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pill, ScanBarcode, SearchX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PharmacyKbd } from './PharmacyKbd';
import { posApi } from '@/pages/accounting/pos/api/pos.api';
import { cn } from '@/lib/utils';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `Rs.${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function productMeta(p) {
  return [
    p?.pharmacy?.generic_name,
    p?.pharmacy?.strength_text,
    p?.pharmacy?.manufacturer?.name || p?.manufacturer,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Fast POS-backed medicine search for purchase receiving.
 * Barcode scan → instant add; text search → rich autocomplete.
 */
export function ReceiveMedicineSearch({ onSelect, className, autoFocus = false, inputRef: externalRef }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const [emptyTerm, setEmptyTerm] = useState('');
  const localRef = useRef(null);
  const inputRef = externalRef || localRef;
  const wrapRef = useRef(null);
  const timer = useRef(null);
  const reqId = useRef(0);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus?.();
  }, [autoFocus, inputRef]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    itemRefs.current[focusIdx]?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx, open]);

  const clearResults = useCallback(() => {
    setRows([]);
    setOpen(false);
    setEmptyTerm('');
    setFocusIdx(0);
  }, []);

  const pick = useCallback(
    (product) => {
      if (!product?.id) return;
      onSelect?.(product);
      setQ('');
      clearResults();
      requestAnimationFrame(() => inputRef.current?.focus?.());
    },
    [clearResults, inputRef, onSelect],
  );

  const runCatalog = useCallback(
    async (term, { silent = false } = {}) => {
      const value = String(term || '').trim();
      if (!value) {
        clearResults();
        return [];
      }

      const id = ++reqId.current;
      if (!silent) setLoading(true);
      try {
        const res = await posApi.catalog({ search: value, per_page: 20 });
        if (id !== reqId.current) return [];

        const list = normalizeList(unwrap(res));
        setRows(list);
        setFocusIdx(0);
        setEmptyTerm(list.length ? '' : value);
        setOpen(true);
        return list;
      } catch {
        if (id === reqId.current) {
          setRows([]);
          setEmptyTerm(value);
          setOpen(true);
        }
        return [];
      } finally {
        if (id === reqId.current && !silent) setLoading(false);
      }
    },
    [clearResults],
  );

  const tryBarcode = useCallback(
    async (code) => {
      const value = String(code || '').trim();
      if (!value) return null;
      try {
        const product = unwrap(await posApi.barcode(value));
        return product?.id ? product : null;
      } catch {
        return null;
      }
    },
    [],
  );

  const resolveAndPick = useCallback(
    async (raw) => {
      const value = String(raw || '').trim();
      if (!value) return;

      setLoading(true);
      try {
        const scanned = await tryBarcode(value);
        if (scanned) {
          pick(scanned);
          return;
        }

        const list = await runCatalog(value, { silent: true });
        if (list.length === 1) {
          pick(list[0]);
          return;
        }
        if (list.length > 1) {
          setOpen(true);
          return;
        }
        setEmptyTerm(value);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [pick, runCatalog, tryBarcode],
  );

  const onChange = (e) => {
    const value = e.target.value;
    setQ(value);
    clearTimeout(timer.current);

    if (!value.trim()) {
      clearResults();
      return;
    }

    timer.current = setTimeout(() => runCatalog(value), 50);
  };

  const onKeyDown = async (e) => {
    if (e.key === 'ArrowDown' && open && rows.length) {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, rows.length - 1));
      return;
    }
    if (e.key === 'ArrowUp' && open && rows.length) {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && rows[focusIdx]) {
        pick(rows[focusIdx]);
        return;
      }
      if (q.trim()) await resolveAndPick(q);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQ('');
      clearResults();
    }
  };

  const showDropdown = open && (rows.length > 0 || emptyTerm);

  return (
    <div ref={wrapRef} className={cn('relative w-full', className)} data-pharmacy-grn-scan>
      <div
        className={cn(
          'relative flex items-center rounded-xl border border-foreground/[0.14] bg-card',
          'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.06)]',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25',
        )}
      >
        <ScanBarcode className="pointer-events-none absolute left-4 size-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={q}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (rows.length || emptyTerm) setOpen(true);
          }}
          placeholder="Scan barcode or type medicine name / SKU…"
          className="h-14 border-0 bg-transparent pl-12 pr-16 text-[15px] shadow-none focus-visible:ring-0 rounded-xl"
          autoComplete="off"
          data-pharmacy-typing
        />
        <div className="absolute right-3 flex items-center gap-2">
          {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          <PharmacyKbd className="h-6 min-w-7 text-[11px]">F2</PharmacyKbd>
        </div>
      </div>

      {showDropdown ? (
        <div
          className={cn(
            'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden',
            'rounded-xl border border-foreground/[0.14] bg-card',
            'shadow-[0_8px_30px_rgba(15,23,42,0.12)]',
          )}
        >
          {rows.length > 0 ? (
            <ul className="max-h-[min(420px,55vh)] overflow-auto p-1.5">
              {rows.map((p, idx) => {
                const meta = productMeta(p);
                const stock = p.current_stock ?? p.quantity_on_hand ?? p.stock;
                const active = idx === focusIdx;
                return (
                  <li key={p.id} ref={(el) => { itemRefs.current[idx] = el; }}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                        active ? 'bg-primary/8 ring-1 ring-inset ring-primary/15' : 'hover:bg-muted/50',
                      )}
                      onMouseEnter={() => setFocusIdx(idx)}
                      onClick={() => pick(p)}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg',
                          'bg-muted/70 text-muted-foreground',
                        )}
                      >
                        <Pill className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                          {p.name}
                        </p>
                        {meta ? (
                          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{meta}</p>
                        ) : null}
                        <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[12px] tabular-nums text-muted-foreground">
                          <span>Stock {stock != null ? Number(stock).toLocaleString() : '—'}</span>
                          <span aria-hidden>·</span>
                          <span>MRP {money(p.mrp ?? p.unit_price)}</span>
                          <span aria-hidden>·</span>
                          <span>Cost {money(p.purchase_price)}</span>
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
              <SearchX className="size-5 shrink-0 opacity-60" />
              <span>No medicine found for “{emptyTerm}”. Check spelling or create a new product.</span>
            </div>
          )}
          <div className="border-t border-foreground/[0.09] bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Scan barcode · type to search · ↑↓ navigate · Enter add · Esc dismiss
          </div>
        </div>
      ) : null}
    </div>
  );
}
