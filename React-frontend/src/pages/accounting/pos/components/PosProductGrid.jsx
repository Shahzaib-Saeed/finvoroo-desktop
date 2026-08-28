import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Loader2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '../lib/cart-math';

const ROW_ESTIMATE = 188;

export function PosProductGrid({
  products,
  loading,
  currency,
  favorites,
  onToggleFavorite,
  onAdd,
  onLoadMore,
  hasMore,
  gridFocus,
  onGridFocus,
}) {
  const scrollerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(800);
  const [cols, setCols] = useState(4);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const measure = () => {
      setViewportH(el.clientHeight);
      const w = el.clientWidth;
      if (w >= 1400) setCols(5);
      else if (w >= 1100) setCols(4);
      else if (w >= 800) setCols(3);
      else setCols(2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (gridFocus < 0 || !scrollerRef.current) return;
    const row = Math.floor(gridFocus / cols);
    const top = row * ROW_ESTIMATE;
    const el = scrollerRef.current;
    if (top < el.scrollTop) el.scrollTop = top;
    if (top + ROW_ESTIMATE > el.scrollTop + el.clientHeight) {
      el.scrollTop = top - el.clientHeight + ROW_ESTIMATE + 24;
    }
  }, [gridFocus, cols]);

  const rows = Math.ceil(products.length / cols) || 0;
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_ESTIMATE) - 1);
  const visibleRows = Math.ceil(viewportH / ROW_ESTIMATE) + 3;
  const endRow = Math.min(rows, startRow + visibleRows);
  const startIdx = startRow * cols;
  const endIdx = Math.min(products.length, endRow * cols);
  const slice = useMemo(
    () => products.slice(startIdx, endIdx),
    [products, startIdx, endIdx],
  );
  const padTop = startRow * ROW_ESTIMATE;
  const padBottom = Math.max(0, (rows - endRow) * ROW_ESTIMATE);

  return (
    <div
      ref={scrollerRef}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-5"
      onScroll={(e) => {
        const el = e.currentTarget;
        setScrollTop(el.scrollTop);
        if (hasMore && !loading && el.scrollTop + el.clientHeight > el.scrollHeight - 240) {
          onLoadMore?.();
        }
      }}
    >
      {loading && products.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Package className="size-8 opacity-40" />
          <p className="text-sm font-medium">No products match this view</p>
          <p className="text-xs">Try another category or scan a barcode</p>
        </div>
      ) : (
        <>
          <div style={{ height: padTop }} />
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {slice.map((p, i) => {
              const absIndex = startIdx + i;
              const stock = Number(p.current_stock ?? p.quantity_on_hand ?? 0) || 0;
              const reorder = Number(p.reorder_level ?? 0) || 0;
              const low = p.type !== 'service' && reorder > 0 && stock <= reorder;
              const fav = favorites.has(String(p.id));
              const focused = gridFocus === absIndex;
              const promo = p.promotion_badge || p.on_promotion;

              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onAdd(p)}
                  onFocus={() => onGridFocus?.(absIndex)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onAdd(p);
                    }
                  }}
                  className={cn(
                    'group relative flex min-h-[172px] cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition',
                    focused
                      ? 'border-foreground ring-2 ring-foreground/25'
                      : 'border-foreground/[0.12] hover:border-foreground/25 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]',
                    'active:scale-[0.99]',
                  )}
                >
                  <div className="relative aspect-[5/3] w-full bg-muted/50">
                    {p.image_url || p.image ? (
                      <img
                        src={p.image_url || p.image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground/40">
                        <Package className="size-7" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(p.id);
                      }}
                      className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full bg-background/90 shadow-sm ring-1 ring-foreground/10"
                      aria-label={fav ? 'Remove favorite' : 'Favorite'}
                    >
                      <Heart
                        className={cn(
                          'size-4',
                          fav ? 'fill-foreground text-foreground' : 'text-muted-foreground',
                        )}
                      />
                    </button>
                    {low && (
                      <span className="absolute left-2 top-2 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
                        Low stock
                      </span>
                    )}
                    {promo ? (
                      <span className="absolute bottom-2 left-2 rounded-md bg-background/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-foreground/15">
                        {typeof promo === 'string' ? promo : 'Promo'}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight">
                      {p.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {[p.sku || p.code, p.barcode].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-1">
                      <div>
                        <p className="text-base font-semibold tabular-nums tracking-tight">
                          {formatMoney(p.unit_price ?? p.selling_price, currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.unit_label || p.unit || 'pcs'}
                        </p>
                      </div>
                      <p
                        className={cn(
                          'text-[11px] font-medium tabular-nums',
                          stock <= 0 && p.type !== 'service'
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                        )}
                      >
                        {p.type === 'service' ? 'Service' : `${stock}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ height: padBottom }} />
          {loading && (
            <div className="flex justify-center py-4 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
