import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../constants';
import { buildInventoryActivityDocumentUrl } from '@/pages/accounting/reports/report-drilldown';
import { MovementQtyDisplay } from './MovementQtyDisplay';

function formatMovementDate(value) {
  if (!value) return '—';
  try {
    const raw = String(value).slice(0, 10);
    const [y, m, d] = raw.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return raw;
  } catch {
    return String(value).slice(0, 10);
  }
}

function documentKindLabel(kind) {
  switch (kind) {
    case 'invoice':
      return 'Invoice';
    case 'bill':
      return 'Bill';
    case 'credit_note':
      return 'Credit note';
    case 'stock_adjustment':
      return 'Adjustment';
    case 'stock_transfer':
      return 'Transfer';
    default:
      return kind ? String(kind).replace(/_/g, ' ') : 'Movement';
  }
}

function CompactMovementTable({
  title,
  tone,
  rows,
  workspaceId,
  onProductClick,
  emptyLabel,
}) {
  const headerTone =
    tone === 'purchase'
      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
      : tone === 'sale'
        ? 'border-sky-200 bg-sky-50/80 text-sky-900'
        : 'border-slate-200 bg-slate-50/80 text-slate-700';

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
      <div
        className={cn(
          'border-b px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em]',
          headerTone,
        )}
      >
        {title}
        <span className="ml-2 font-normal normal-case tracking-normal text-slate-500">
          ({rows.length} on this page)
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm italic text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="max-h-[min(520px,60vh)] overflow-auto">
          <table className="w-full min-w-[320px] border-collapse text-sm">
            <thead className="sticky top-0 z-[1] bg-white shadow-[0_1px_0_0_rgb(226_232_240)]">
              <tr className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 text-left font-semibold">Date</th>
                <th className="px-3 py-2 text-left font-semibold">Product</th>
                <th className="px-3 py-2 text-right font-semibold">Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Cost</th>
                <th className="px-3 py-2 text-left font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const docUrl = buildInventoryActivityDocumentUrl(workspaceId, row);
                const kind = documentKindLabel(row.document_kind);
                return (
                  <tr
                    key={row.id ?? `${row.movement_date}-${row.product_id}-${index}`}
                    className="border-t border-slate-100 hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-slate-700">
                      {formatMovementDate(row.movement_date)}
                    </td>
                    <td className="max-w-[140px] px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onProductClick?.(row.product_id)}
                        className="truncate text-left text-sm font-medium text-foreground hover:text-primary"
                        title={row.product_name || row.product?.name}
                      >
                        {row.product_name || row.product?.name || '—'}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <MovementQtyDisplay row={row} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-slate-600">
                      {row.total_cost != null ? formatCurrency(row.total_cost) : '—'}
                    </td>
                    <td className="max-w-[120px] px-3 py-2">
                      {docUrl && row.document_id ? (
                        <Link
                          to={docUrl}
                          className="truncate text-xs font-medium text-primary hover:underline"
                          title={`${kind} ${row.document_number || ''}`}
                        >
                          {kind}
                          {row.document_number ? (
                            <span className="font-mono opacity-90"> #{row.document_number}</span>
                          ) : null}
                        </Link>
                      ) : (
                        <span className="truncate text-xs capitalize text-slate-500">
                          {row.type || kind}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function partitionMovementRows(rows = []) {
  const purchases = [];
  const sales = [];
  const other = [];

  for (const row of rows) {
    const type = row.type;
    if (type === 'purchase') purchases.push(row);
    else if (type === 'sale') sales.push(row);
    else other.push(row);
  }

  return { purchases, sales, other };
}

export function InventoryActivitySplitView({
  rows,
  workspaceId,
  onProductClick,
  highlight,
}) {
  const { purchases, sales, other } = partitionMovementRows(rows);

  const showPurchases = highlight !== 'sale';
  const showSales = highlight !== 'purchase';

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'grid gap-4',
          showPurchases && showSales ? 'lg:grid-cols-2' : 'grid-cols-1',
        )}
      >
        {showPurchases ? (
          <CompactMovementTable
            title="Purchases — stock in"
            tone="purchase"
            rows={purchases}
            workspaceId={workspaceId}
            onProductClick={onProductClick}
            emptyLabel="No purchase movements on this page."
          />
        ) : null}

        {showSales ? (
          <CompactMovementTable
            title="Sales — stock out"
            tone="sale"
            rows={sales}
            workspaceId={workspaceId}
            onProductClick={onProductClick}
            emptyLabel="No sale movements on this page."
          />
        ) : null}
      </div>

      {other.length > 0 && !highlight ? (
        <CompactMovementTable
          title="Adjustments, transfers & other"
          tone="other"
          rows={other}
          workspaceId={workspaceId}
          onProductClick={onProductClick}
          emptyLabel="No other movements."
        />
      ) : null}
    </div>
  );
}
