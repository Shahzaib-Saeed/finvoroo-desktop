import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { LINE_CELL_INPUT_NUMBER } from '../../invoices/constants';
import { formatLineQty } from '../constants';

const TH =
  'border-r border-b border-border bg-muted/40 px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap last:border-r-0';
const TD =
  'border-r border-b border-border align-middle last:border-r-0';
const QTY_INPUT = cn(
  LINE_CELL_INPUT_NUMBER,
  'h-9 w-full min-w-0 rounded-none border-0 text-right tabular-nums font-medium px-2 shadow-none',
);

function remainingQty(line) {
  if (line.quantity_remaining !== '' && line.quantity_remaining != null) {
    return line.quantity_remaining;
  }
  return line.order_quantity;
}

function LineItemCell({ line }) {
  const primary = line.description?.trim() || line.product_name?.trim() || '—';
  const alt = line.product_name?.trim();
  const showAlt = alt && alt !== primary;

  return (
    <div
      className="min-w-0 px-2.5 py-1.5"
      title={[primary, showAlt ? alt : null].filter(Boolean).join(' · ')}
    >
      <p className="truncate text-sm font-medium leading-tight text-foreground">{primary}</p>
      {showAlt ? (
        <p className="truncate text-[11px] leading-tight text-muted-foreground">{alt}</p>
      ) : null}
    </div>
  );
}

function SkuCell({ sku }) {
  const value = sku?.trim() || '';
  if (!value) {
    return <span className="text-xs text-muted-foreground/70">—</span>;
  }
  return (
    <span
      className="block truncate font-mono text-[11px] text-muted-foreground"
      title={value}
    >
      {value}
    </span>
  );
}

export function DeliveryNoteLinesTable({
  lines = [],
  readOnly = false,
  errors = {},
  onQtyChange,
  onFillRemaining,
}) {
  if (!lines.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
        <p className="text-sm font-medium text-foreground">No deliverable lines</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          This sales order has no open quantities to ship.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-10" />
          <col className="w-[30%]" />
          <col className="w-[96px]" />
          <col className="w-[80px]" />
          <col className="w-[80px]" />
          <col className="w-[128px]" />
        </colgroup>
        <thead>
          <tr>
            <th className={cn(TH, 'text-center')}>#</th>
            <th className={TH}>Item</th>
            <th className={TH}>SKU</th>
            <th className={cn(TH, 'text-right')}>Ordered</th>
            <th className={cn(TH, 'text-right')}>Remaining</th>
            <th className={cn(TH, 'text-center')}>Deliver</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const remaining = remainingQty(line);
            const lineError = errors[`lines.${index}.quantity_delivered`];
            const errMsg = Array.isArray(lineError) ? lineError[0] : lineError;
            const isLast = index === lines.length - 1;

            return (
              <tr
                key={line.sales_order_line_id || index}
                className="group hover:bg-muted/15 transition-colors"
              >
                <td
                  className={cn(
                    TD,
                    isLast && 'border-b-0',
                    'px-2 py-1.5 text-center text-xs tabular-nums text-muted-foreground',
                  )}
                >
                  {index + 1}
                </td>
                <td className={cn(TD, isLast && 'border-b-0', 'p-0')}>
                  <LineItemCell line={line} />
                  {errMsg ? (
                    <p
                      className="truncate border-t border-destructive/20 bg-destructive/5 px-2.5 py-0.5 text-[11px] text-destructive"
                      title={errMsg}
                    >
                      {errMsg}
                    </p>
                  ) : null}
                </td>
                <td className={cn(TD, isLast && 'border-b-0', 'px-2.5 py-1.5')}>
                  <SkuCell sku={line.product_sku} />
                </td>
                <td
                  className={cn(
                    TD,
                    isLast && 'border-b-0',
                    'px-2.5 py-1.5 text-right text-xs tabular-nums text-muted-foreground',
                  )}
                >
                  {line.order_quantity ? formatLineQty(line.order_quantity) : '—'}
                </td>
                <td
                  className={cn(
                    TD,
                    isLast && 'border-b-0',
                    'px-2.5 py-1.5 text-right text-xs font-medium tabular-nums text-sky-700',
                  )}
                >
                  {remaining != null && remaining !== ''
                    ? formatLineQty(remaining)
                    : '—'}
                </td>
                <td className={cn(TD, isLast && 'border-b-0', 'p-0')}>
                  <div
                    className={cn(
                      'flex h-9 w-full',
                      !readOnly && remaining && 'divide-x divide-border',
                    )}
                  >
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className={QTY_INPUT}
                      value={line.quantity_delivered}
                      onChange={(e) => onQtyChange(index, e.target.value)}
                      disabled={readOnly}
                      aria-label={`Deliver quantity for line ${index + 1}`}
                    />
                    {!readOnly && remaining ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 shrink-0 rounded-none px-2.5 text-[10px] font-semibold uppercase tracking-wide text-primary hover:bg-primary/10"
                        onClick={() => onFillRemaining(index)}
                      >
                        Max
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
