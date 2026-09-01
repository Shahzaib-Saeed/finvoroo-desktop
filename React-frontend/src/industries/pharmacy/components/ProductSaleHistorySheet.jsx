import { useEffect, useMemo, useState } from 'react';
import { History, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { pharmacyApi } from '../api/pharmacy.api';
import { PharmacyShortcutHint } from './PharmacyKbd';

function unwrapPayload(res) {
  return res?.data?.data ?? res?.data ?? res;
}

function formatQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function formatDateTime(date, time) {
  if (!date) return '—';
  const d = String(date);
  const display = d.includes('-') ? d.split('-').reverse().join('/') : d;
  return time ? `${display} ${time.slice(0, 5)}` : display;
}

const GRID_HEAD =
  'border-r border-emerald-700/35 border-b-2 border-emerald-900 last:border-r-0 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-white/95 whitespace-nowrap';
const GRID_CELL =
  'border-r border-b border-slate-200 px-2.5 py-2 text-[12px] text-slate-900 last:border-r-0';

function costProfitCell(value, available, formatMoney) {
  if (available === false) {
    return (
      <span className="text-amber-700" title="Inventory cost unavailable — profit cannot be calculated">
        —
      </span>
    );
  }
  return formatMoney?.(value) ?? value;
}

/** Full sale register for one product — opened from POS medicine lookup (Ctrl+H). */
export function ProductSaleHistorySheet({
  open,
  onOpenChange,
  productId,
  productName = '',
  companyId,
  formatMoney,
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !productId) {
      setRows([]);
      setTotals(null);
      setTruncated(false);
      setError('');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    pharmacyApi
      .saleHistory(productId)
      .then((res) => {
        if (cancelled) return;
        const payload = unwrapPayload(res) || {};
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
        setTotals(payload.totals || null);
        setTruncated(Boolean(payload.truncated));
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setTotals(null);
        setError(err?.response?.data?.message || 'Could not load sale history');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  const title = productName?.trim() || 'Product';

  const invoiceBase = companyId
    ? `/workspace/${companyId}/accounting/invoices`
    : '/workspace/accounting/invoices';

  const summary = useMemo(() => {
    if (!totals) return null;
    const items = [
      { label: 'Lines', value: totals.lines ?? rows.length },
      { label: 'Qty', value: formatQty(totals.qty) },
      { label: 'Discount', value: formatMoney?.(totals.discount) ?? totals.discount },
      { label: 'Net sale', value: formatMoney?.(totals.sale) ?? totals.sale },
    ];
    if (totals.profit_complete === false) {
      items.push({
        label: 'Profit',
        value: `${totals.missing_ledger_cogs_lines ?? 0} line(s) missing cost`,
      });
    } else if (totals.profit != null) {
      items.push({ label: 'Profit', value: formatMoney?.(totals.profit) ?? totals.profit });
    }
    return items;
  }, [formatMoney, rows.length, totals]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        close={false}
        overlay
        data-product-sale-history
        overlayClassName="bg-slate-900/35"
        className="flex h-full w-full max-w-none flex-col gap-0 overflow-hidden border-s p-0 sm:max-w-none lg:w-[min(960px,calc(100vw-1.5rem))]"
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-slate-200 bg-white px-4 py-3.5 text-left">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <History className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[15px] font-semibold tracking-tight text-slate-900">
                Sale history
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-[12px] font-medium text-slate-500">
                {title}
              </SheetDescription>
            </div>
            <SheetClose
              type="button"
              aria-label="Close sale history"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="size-4" />
            </SheetClose>
          </div>
        </SheetHeader>

        <SheetBody className="min-h-0 flex-1 overflow-hidden bg-slate-50/60 p-3">
          {summary ? (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {summary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[15px] font-bold tabular-nums text-slate-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="h-full min-h-[240px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
            {loading ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-slate-600">
                <Loader2 className="size-6 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm font-semibold">Loading sales…</p>
              </div>
            ) : error ? (
              <div className="flex h-full min-h-[240px] items-center justify-center px-6 text-center text-sm text-red-600">
                {error}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center text-slate-600">
                <History className="size-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold">No sales recorded yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Posted invoices for this product will appear here.
                </p>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-16rem)] overflow-auto">
                <table className="w-full min-w-[880px] border-collapse">
                  <thead className="sticky top-0 z-10 bg-emerald-800">
                    <tr>
                      <th className={cn(GRID_HEAD, 'text-left')}>Date / time</th>
                      <th className={cn(GRID_HEAD, 'text-left')}>Invoice #</th>
                      <th className={cn(GRID_HEAD, 'text-left')}>Sold by</th>
                      <th className={cn(GRID_HEAD, 'text-left')}>Customer</th>
                      <th className={cn(GRID_HEAD, 'text-right')}>Qty</th>
                      <th className={cn(GRID_HEAD, 'text-right')}>Rate</th>
                      <th className={cn(GRID_HEAD, 'text-right')}>Discount</th>
                      <th className={cn(GRID_HEAD, 'text-right')}>Net sale</th>
                      <th className={cn(GRID_HEAD, 'text-right')}>Cost</th>
                      <th className={cn(GRID_HEAD, 'text-right')}>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.line_id} className="bg-white even:bg-slate-50/50 hover:bg-emerald-50/40">
                        <td className={cn(GRID_CELL, 'whitespace-nowrap tabular-nums text-slate-700')}>
                          {formatDateTime(row.date, row.time)}
                        </td>
                        <td className={GRID_CELL}>
                          {row.invoice_id ? (
                            <Link
                              to={`${invoiceBase}/${row.invoice_id}`}
                              className="font-semibold text-emerald-800 hover:underline"
                              onClick={() => onOpenChange?.(false)}
                            >
                              {row.invoice_number || `#${row.invoice_id}`}
                            </Link>
                          ) : (
                            row.invoice_number || '—'
                          )}
                        </td>
                        <td className={cn(GRID_CELL, 'max-w-[8rem] truncate')} title={row.sold_by}>
                          {row.sold_by || '—'}
                        </td>
                        <td className={cn(GRID_CELL, 'max-w-[8rem] truncate')} title={row.customer_name}>
                          {row.customer_name || 'Walk-in'}
                        </td>
                        <td className={cn(GRID_CELL, 'text-right tabular-nums')}>
                          {formatQty(row.qty)}
                        </td>
                        <td className={cn(GRID_CELL, 'text-right tabular-nums')}>
                          {formatMoney?.(row.rate) ?? row.rate}
                        </td>
                        <td className={cn(GRID_CELL, 'text-right tabular-nums text-amber-800')}>
                          {Number(row.discount) > 0
                            ? formatMoney?.(row.discount) ?? row.discount
                            : '—'}
                        </td>
                        <td className={cn(GRID_CELL, 'text-right tabular-nums font-semibold text-emerald-800')}>
                          {formatMoney?.(row.sale) ?? row.sale}
                        </td>
                        <td className={cn(GRID_CELL, 'text-right tabular-nums')}>
                          {costProfitCell(row.cost, row.cost_available, formatMoney)}
                        </td>
                        <td className={cn(GRID_CELL, 'text-right tabular-nums font-semibold')}>
                          {costProfitCell(row.profit, row.profit_available, formatMoney)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {truncated ? (
            <p className="mt-2 text-[11px] font-medium text-amber-800">
              Showing the most recent 150 sales. Open reports for the full register.
            </p>
          ) : null}
          {totals?.profit_complete === false ? (
            <p className="mt-2 text-[11px] font-medium text-amber-800">
              Some sales are missing ledger COGS — profit uses FIFO/FEFO costs only, not catalog purchase price.
            </p>
          ) : null}
        </SheetBody>

        <SheetFooter className="shrink-0 !flex-row items-center justify-between border-t border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="text-[12px] text-slate-500">
            {rows.length
              ? `${rows.length} sale line${rows.length === 1 ? '' : 's'}`
              : 'Highlight a medicine and press Ctrl+H'}
          </p>
          <PharmacyShortcutHint keys={['Esc']} label="Close" className="text-slate-500" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
