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
import { formatCurrency, rowRemainingDue } from '../constants';
import { cn } from '@/lib/utils';

const TH =
  'border-b border-border/70 bg-muted/30 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground align-middle whitespace-nowrap';
const TD = 'border-b border-border/50 align-middle p-0';
const TD_READ = 'border-b border-border/50 align-middle px-3 py-2';

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

export function PaymentAllocationTable({
  rows,
  creditNotes,
  overpaymentInvoices,
  currency,
  readOnly,
  amountReceived = 0,
  showAdvanced = false,
  onUpdateRow,
  onToggleRow,
  onToggleAllRows,
  onFillRowCashMax,
}) {
  const allSelected = rows.length > 0 && rows.every((r) => r.selected);
  const hasAmount = Number(amountReceived) > 0;

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No open invoices</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a customer above to load invoices you can pay.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table
        className={cn(
          'w-full table-fixed border-collapse text-sm',
          showAdvanced ? 'min-w-[1100px]' : 'min-w-[760px]',
        )}
      >
        <colgroup>
          <col className="w-11" />
          <col className="w-[100px]" />
          <col className="w-[120px]" />
          <col className="w-[130px]" />
          <col className="w-[110px]" />
          <col className="w-[150px]" />
          <col className="w-[120px]" />
          {showAdvanced ? (
            <>
              <col className="w-[140px]" />
              <col className="w-[100px]" />
              <col className="w-[140px]" />
              <col className="w-[100px]" />
            </>
          ) : null}
        </colgroup>
        <thead>
          <tr>
            <th className={cn(TH, 'px-0 text-center')} title="Select all invoices">
              <div className="flex h-full items-center justify-center">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => onToggleAllRows?.(!!v)}
                  disabled={readOnly}
                  aria-label="Select all invoices"
                />
              </div>
            </th>
            <th className={TH}>Date</th>
            <th className={TH}>Invoice #</th>
            <th className={cn(TH, 'text-right')}>Open balance</th>
            <th className={cn(TH, 'text-right')} title="Optional settlement write-off">
              Discount
            </th>
            <th className={cn(TH, 'text-right text-emerald-800')}>Cash applied</th>
            <th className={cn(TH, 'text-right')}>Remaining</th>
            {showAdvanced ? (
              <>
                <th className={TH}>Credit note</th>
                <th className={cn(TH, 'text-right')}>Credit amt</th>
                <th className={TH}>Overpay from</th>
                <th className={cn(TH, 'text-right')}>Transfer</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const active = row.selected && !readOnly;
            const isLast = index === rows.length - 1;
            const remaining = row.selected ? rowRemainingDue(row) : Number(row.balance_due) || 0;
            const settled = row.selected && remaining <= 0.001;

            return (
              <tr
                key={row.invoice_id || index}
                className={cn(
                  'transition-colors',
                  row.selected && 'bg-emerald-50/50',
                )}
              >
                <td className={cn(TD, isLast && 'border-b-0', 'px-0 text-center')}>
                  <div className="flex h-10 items-center justify-center">
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={(v) => onToggleRow(index, !!v)}
                      disabled={readOnly}
                      aria-label={`Pay invoice ${row.invoice_number}`}
                    />
                  </div>
                </td>
                <td
                  className={cn(
                    TD_READ,
                    isLast && 'border-b-0',
                    'text-xs text-muted-foreground whitespace-nowrap tabular-nums',
                  )}
                >
                  {row.invoice_date || '—'}
                </td>
                <td className={cn(TD_READ, isLast && 'border-b-0', 'font-medium text-foreground')}>
                  {row.invoice_number}
                </td>
                <td
                  className={cn(
                    TD_READ,
                    isLast && 'border-b-0',
                    'text-right text-sm tabular-nums font-medium',
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
                    disabled={readOnly || !row.selected}
                    placeholder={active ? '0.00' : '—'}
                    aria-label={`Settlement discount for ${row.invoice_number}`}
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
                      disabled={readOnly || !row.selected}
                      placeholder={active ? (hasAmount ? '0.00' : '0.00') : '—'}
                      aria-label={`Cash payment for ${row.invoice_number}`}
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
                <td
                  className={cn(
                    TD_READ,
                    isLast && 'border-b-0',
                    'text-right text-sm tabular-nums font-semibold',
                    settled ? 'text-emerald-700' : 'text-muted-foreground',
                  )}
                >
                  {row.selected
                    ? formatCurrency(remaining, row.currency || currency)
                    : '—'}
                </td>
                {showAdvanced ? (
                  <>
                    <td className={cn(TD, isLast && 'border-b-0')}>
                      <Select
                        value={row.cn_id || '_none'}
                        onValueChange={(v) =>
                          onUpdateRow(index, {
                            cn_id: v === '_none' ? '' : v,
                            selected: true,
                          })
                        }
                        disabled={readOnly || !row.selected || !creditNotes.length}
                      >
                        <SelectTrigger className={cellSelectClass(active)}>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {creditNotes.map((cn) => (
                            <SelectItem key={cn.id} value={String(cn.id)}>
                              {cn.credit_note_number} (
                              {formatCurrency(cn.remaining, cn.currency)})
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
                        className={cellInputClass(active && !!row.cn_id)}
                        value={row.cn_amt}
                        onChange={(e) =>
                          onUpdateRow(index, { cn_amt: e.target.value, selected: true })
                        }
                        disabled={readOnly || !row.selected || !row.cn_id}
                        placeholder={row.cn_id ? '0.00' : '—'}
                        aria-label={`Credit amount for ${row.invoice_number}`}
                      />
                    </td>
                    <td className={cn(TD, isLast && 'border-b-0')}>
                      <Select
                        value={row.src_id || '_none'}
                        onValueChange={(v) =>
                          onUpdateRow(index, {
                            src_id: v === '_none' ? '' : v,
                            selected: true,
                          })
                        }
                        disabled={readOnly || !row.selected || !overpaymentInvoices.length}
                      >
                        <SelectTrigger className={cellSelectClass(active)}>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {overpaymentInvoices.map((inv) => (
                            <SelectItem key={inv.id} value={String(inv.id)}>
                              {inv.invoice_number} (
                              {formatCurrency(inv.available, inv.currency)})
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
                        className={cellInputClass(active && !!row.src_id)}
                        value={row.src_amt}
                        onChange={(e) =>
                          onUpdateRow(index, { src_amt: e.target.value, selected: true })
                        }
                        disabled={readOnly || !row.selected || !row.src_id}
                        placeholder={row.src_id ? '0.00' : '—'}
                        aria-label={`Transfer amount for ${row.invoice_number}`}
                      />
                    </td>
                  </>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
