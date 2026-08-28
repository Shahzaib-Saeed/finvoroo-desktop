import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '../constants';
import { cn } from '@/lib/utils';

const TH =
  'border-r border-b border-border bg-muted/40 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap last:border-r-0';
const TD = 'border-r border-b border-border align-middle p-0 last:border-r-0';
const TD_READ = 'border-r border-b border-border align-middle px-2.5 py-1.5 last:border-r-0';

const NO_SPINNER = [
  '[appearance:textfield]',
  '[-moz-appearance:textfield]',
  '[&::-webkit-outer-spin-button]:appearance-none',
  '[&::-webkit-inner-spin-button]:appearance-none',
].join(' ');

function cellInputClass(active) {
  return cn(
    'h-9 w-full min-w-0 rounded-none border-0 shadow-none tabular-nums text-sm text-right px-2',
    NO_SPINNER,
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35',
    active ? 'bg-background' : 'bg-muted/30 text-muted-foreground cursor-not-allowed',
  );
}

function cellSelectClass(active) {
  return cn(
    'h-9 w-full rounded-none border-0 shadow-none text-xs',
    active ? 'bg-background' : 'bg-muted/30',
  );
}

export function BillAllocationTable({
  rows,
  vendorCredits,
  currency,
  loading,
  amountPaid = 0,
  onUpdateRow,
  onToggleRow,
  onFillRowCashMax,
}) {
  const hasAmount = Number(amountPaid) > 0;
  const credits = (vendorCredits || []).filter((vc) => vc.remaining > 0);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">Loading open bills…</p>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No open bills</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a vendor above to load bills you can pay.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-10" />
          <col className="w-[88px]" />
          <col className="w-[110px]" />
          <col className="w-[100px]" />
          <col className="w-[100px]" />
          <col className="w-[120px]" />
          <col className="w-[140px]" />
          <col className="w-[100px]" />
        </colgroup>
        <thead>
          <tr>
            <th className={cn(TH, 'text-center')} title="Include this bill">
              Pay
            </th>
            <th className={TH}>Date</th>
            <th className={TH}>Bill #</th>
            <th className={cn(TH, 'text-right')}>Open balance</th>
            <th className={cn(TH, 'text-right')}>
              Discount
              <span className="block font-normal normal-case tracking-normal text-[9px] text-muted-foreground">
                Write-off at payment
              </span>
            </th>
            <th className={cn(TH, 'text-right text-primary')}>
              Cash payment
              <span className="block font-normal normal-case tracking-normal text-[9px] text-primary/80">
                From amount paid
              </span>
            </th>
            <th className={TH}>Vendor credit</th>
            <th className={cn(TH, 'text-right')}>Credit amt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const active = row.selected;
            const isLast = index === rows.length - 1;

            return (
              <tr
                key={row.bill_id || index}
                className={cn(row.selected && 'bg-emerald-50/40 dark:bg-emerald-950/15')}
              >
                <td className={cn(TD, isLast && 'border-b-0', 'text-center')}>
                  <div className="flex h-9 items-center justify-center">
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={(v) => onToggleRow(index, !!v)}
                      aria-label={`Pay bill ${row.bill_number}`}
                    />
                  </div>
                </td>
                <td
                  className={cn(
                    TD_READ,
                    isLast && 'border-b-0',
                    'text-xs text-muted-foreground whitespace-nowrap',
                  )}
                >
                  {row.bill_date || '—'}
                </td>
                <td className={cn(TD_READ, isLast && 'border-b-0', 'text-sm font-medium')}>
                  {row.bill_number}
                </td>
                <td
                  className={cn(
                    TD_READ,
                    isLast && 'border-b-0',
                    'text-right text-xs tabular-nums font-medium',
                  )}
                >
                  {formatCurrency(row.balance_due, row.currency || currency)}
                </td>
                <td className={cn(TD, isLast && 'border-b-0')}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className={cellInputClass(active)}
                    value={row.discount}
                    onChange={(e) =>
                      onUpdateRow(index, { discount: e.target.value, selected: true })
                    }
                    disabled={!row.selected}
                    placeholder={active ? '0.00' : '—'}
                    aria-label={`Settlement discount for ${row.bill_number}`}
                  />
                </td>
                <td className={cn(TD, isLast && 'border-b-0')}>
                  <div className="flex h-9 divide-x divide-border">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className={cn(cellInputClass(active), 'flex-1')}
                      value={row.cash}
                      onChange={(e) =>
                        onUpdateRow(index, { cash: e.target.value, selected: true })
                      }
                      disabled={!row.selected}
                      placeholder={active ? (hasAmount ? '0.00' : 'Set amount↑') : '—'}
                      aria-label={`Cash payment for ${row.bill_number}`}
                    />
                    {active && onFillRowCashMax ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 shrink-0 rounded-none px-2 text-[10px] font-semibold uppercase text-primary hover:bg-primary/10"
                        onClick={() => onFillRowCashMax(index)}
                      >
                        Max
                      </Button>
                    ) : (
                      <span className="flex w-10 shrink-0 items-center justify-center border-l border-border bg-muted/20" />
                    )}
                  </div>
                </td>
                <td className={cn(TD, isLast && 'border-b-0')}>
                  <Select
                    value={row.vc_id || '_none'}
                    onValueChange={(v) =>
                      onUpdateRow(index, {
                        vc_id: v === '_none' ? '' : v,
                        selected: true,
                      })
                    }
                    disabled={!row.selected || !credits.length}
                  >
                    <SelectTrigger className={cellSelectClass(active)}>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {credits.map((vc) => (
                        <SelectItem key={vc.id} value={String(vc.id)}>
                          {vc.credit_number} ({formatCurrency(vc.remaining, vc.currency)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className={cn(TD, isLast && 'border-b-0')}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className={cellInputClass(active && !!row.vc_id)}
                    value={row.vc_amount}
                    onChange={(e) =>
                      onUpdateRow(index, { vc_amount: e.target.value, selected: true })
                    }
                    disabled={!row.selected || !row.vc_id}
                    placeholder={row.vc_id ? '0.00' : '—'}
                    aria-label={`Credit amount for ${row.bill_number}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
