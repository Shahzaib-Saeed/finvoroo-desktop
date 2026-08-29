import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resolveIndustryFeatures } from '@/industries/resolve';
import { useAuthStore } from '@/store/authStore';
import { pharmacyApi } from '../api/pharmacy.api';

function formatQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PoSmartSuggestions({
  vendorId,
  excludeProductIds = [],
  currency = '',
  readOnly = false,
  onAdd,
  variant = 'default',
}) {
  const isPharmacy = variant === 'pharmacy';
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const enabled = !!resolveIndustryFeatures(activeCompany).pharmacy_shell;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [qtyById, setQtyById] = useState({});
  const [busyId, setBusyId] = useState(null);

  const vendorKey = vendorId ? String(vendorId) : '';
  const excludeSet = useMemo(
    () => new Set(excludeProductIds.map((id) => String(id)).filter(Boolean)),
    [excludeProductIds],
  );

  useEffect(() => {
    if (!enabled || !vendorKey || readOnly) {
      setRows([]);
      setQtyById({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    pharmacyApi
      .purchaseSuggestions({ vendor_id: vendorKey })
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.data?.suggestions || [];
        setRows(list);
        const next = {};
        list.forEach((row) => {
          next[row.product_id] = row.suggested_qty;
        });
        setQtyById(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 403) {
          setRows([]);
          return;
        }
        toast.error(err?.response?.data?.message || 'Could not load purchase suggestions');
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, vendorKey, readOnly]);

  const visibleRows = useMemo(
    () => rows.filter((row) => !excludeSet.has(String(row.product_id))),
    [rows, excludeSet],
  );

  const sendFeedback = useCallback(
    (row, action, acceptedQty) => {
      pharmacyApi
        .recordPurchaseSuggestionFeedback({
          vendor_id: Number(vendorKey),
          product_id: row.product_id,
          action,
          suggested_qty: row.suggested_qty,
          accepted_qty: acceptedQty ?? undefined,
          last_price: row.last_price ?? undefined,
          reason_codes: row.reason_codes || [],
        })
        .catch(() => {});
    },
    [vendorKey],
  );

  const removeRow = (productId) => {
    setRows((list) => list.filter((row) => row.product_id !== productId));
  };

  const handleAdd = (row) => {
    const qty = Number(qtyById[row.product_id] ?? row.suggested_qty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Enter a quantity greater than zero');
      return;
    }
    const ok = onAdd?.({
      product_id: row.product_id,
      product_name: row.product_name,
      quantity: qty,
      unit_price: row.last_price,
    });
    if (ok === false) return;
    const edited = Math.abs(qty - Number(row.suggested_qty)) > 0.0001;
    sendFeedback(row, edited ? 'edited' : 'accepted', qty);
    removeRow(row.product_id);
  };

  const handleIgnore = (row) => {
    setBusyId(row.product_id);
    sendFeedback(row, 'ignored', null);
    removeRow(row.product_id);
    setBusyId(null);
  };

  const handleAddAll = () => {
    visibleRows.forEach((row) => handleAdd(row));
  };

  if (!enabled || !vendorKey || readOnly) return null;

  return (
    <div
      className={
        isPharmacy
          ? 'shrink-0 border-b border-emerald-100 bg-emerald-50/50 px-4 py-3'
          : 'border-t bg-muted/15 px-4 py-4 sm:px-5'
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            className={
              isPharmacy
                ? 'flex items-center gap-1.5 text-sm font-semibold text-emerald-950'
                : 'flex items-center gap-1.5 text-sm font-semibold text-foreground'
            }
          >
            <Sparkles className={isPharmacy ? 'size-4 text-emerald-700' : 'size-4 text-primary'} />
            Suggested products
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Based on this supplier’s history, current stock, and recent sales. Nothing is added until you confirm.
          </p>
        </div>
        {visibleRows.length > 1 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddAll}
            disabled={loading}
            className={isPharmacy ? 'border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50' : undefined}
          >
            Add all ({visibleRows.length})
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Finding what this supplier usually covers…
        </div>
      ) : visibleRows.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No restock suggestions for this supplier right now.
        </p>
      ) : (
        <ul className="space-y-2">
          {visibleRows.map((row) => (
            <li
              key={row.product_id}
              className={
                isPharmacy
                  ? 'rounded-lg border border-emerald-100 bg-white px-3 py-3 sm:px-4'
                  : 'rounded-lg border border-border/80 bg-background px-3 py-3 sm:px-4'
              }
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{row.product_name}</p>
                  {row.sku ? (
                    <p className="font-mono text-[11px] text-muted-foreground">{row.sku}</p>
                  ) : null}
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
                    <div>
                      Current stock:{' '}
                      <span className="font-medium text-foreground">{formatQty(row.current_stock)}</span>
                    </div>
                    <div>
                      Suggested qty:{' '}
                      <span className="font-medium text-foreground">{formatQty(row.suggested_qty)}</span>
                    </div>
                    <div>
                      Last bought:{' '}
                      <span className="font-medium text-foreground">
                        {row.last_purchase_qty != null ? formatQty(row.last_purchase_qty) : '—'}
                      </span>
                    </div>
                    <div>
                      Last price:{' '}
                      <span className="font-medium text-foreground">
                        {row.last_price != null
                          ? `${currency ? `${currency} ` : ''}${formatMoney(row.last_price)}`
                          : '—'}
                      </span>
                    </div>
                    {row.supplier_product_name ? (
                      <div className="col-span-2 sm:col-span-3">
                        Supplier name:{' '}
                        <span className="font-medium text-foreground">{row.supplier_product_name}</span>
                      </div>
                    ) : null}
                  </dl>
                  <p className="mt-1.5 text-xs text-slate-600">{row.reason}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-end gap-2">
                  <label className="space-y-1">
                    <span className="block text-[11px] text-muted-foreground">Edit qty</span>
                    <Input
                      type="number"
                      min="0.0001"
                      step="1"
                      aria-label={`Quantity for ${row.product_name}`}
                      className="h-8 w-[5.5rem] text-right text-xs tabular-nums"
                      value={qtyById[row.product_id] ?? row.suggested_qty}
                      onChange={(e) =>
                        setQtyById((prev) => ({ ...prev, [row.product_id]: e.target.value }))
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    className={isPharmacy ? 'h-8 bg-emerald-800 text-white hover:bg-emerald-700' : 'h-8'}
                    disabled={busyId === row.product_id}
                    onClick={() => handleAdd(row)}
                  >
                    Add {formatQty(qtyById[row.product_id] ?? row.suggested_qty)}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-muted-foreground"
                    onClick={() => handleIgnore(row)}
                  >
                    Ignore
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
