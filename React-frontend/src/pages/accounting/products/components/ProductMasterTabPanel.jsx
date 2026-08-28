import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ProductHistoryTable } from './ProductHistoryTable';

/**
 * Powers every lazy-loaded, server-paginated Product Master tab (Movements,
 * Purchases, Sales, Vendor Credits, Customer Returns, Transfers, Adjustments,
 * Production, Accounting, Audit). Fetches only when `active` first becomes
 * true, then again whenever the page or filters change — never eagerly, per
 * the "millions of transactions" performance requirement.
 */
export function ProductMasterTabPanel({
  active,
  fetcher,
  columns,
  emptyMessage,
  filters = null,
  perPage = 25,
  mapRow = null,
}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const filterKey = filters ? JSON.stringify(filters.values) : '';

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    fetcher({ page, per_page: perPage, ...(filters?.values || {}) })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setRows(mapRow ? list.map(mapRow) : list);
        setMeta(res.data?.meta || null);
        setLoadedOnce(true);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.response?.data?.message || 'Failed to load data');
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, page, perPage, filterKey]);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  if (!active) return null;

  if (loading && !loadedOnce) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPage = meta?.current_page ?? page;
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? rows.length;

  return (
    <div className="space-y-3">
      {filters ? <div className="flex flex-wrap items-center gap-2">{filters.render}</div> : null}

      <div className="relative">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 rounded-md">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        <ProductHistoryTable columns={columns} rows={rows} emptyMessage={emptyMessage} />
      </div>

      {total > 0 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>
            {total} record{total === 1 ? '' : 's'} · page {currentPage} of {lastPage}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= lastPage || loading}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
