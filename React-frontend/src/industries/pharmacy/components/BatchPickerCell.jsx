import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

function batchQty(b) {
  return Number(b.quantity_on_hand ?? b.qty ?? b.quantity ?? 0);
}

export function BatchPickerCell({
  line,
  open,
  onOpenChange,
  onSelect,
  disabled,
}) {
  const batches = Array.isArray(line.batches) ? line.batches : [];
  const label = line.fefo_batch_number || 'Auto FEFO';
  const expiry = line.fefo_expiry ? String(line.fefo_expiry).slice(0, 7) : '—';

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-dispense-cell={`${line._rowIndex}-batch`}
          data-pharmacy-typing
          className={cn(
            'h-10 w-full justify-between rounded-none border-0 bg-transparent px-2 text-[12px] font-mono font-normal shadow-none hover:bg-muted/30',
            line.batch_manual && 'bg-amber-50',
          )}
        >
          <span className="min-w-0 truncate text-left leading-tight">
            <span className="block truncate font-semibold text-foreground">{label}</span>
            <span className="block font-sans text-[10px] font-medium text-emerald-600">
              {expiry}
            </span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5 rounded-xl" data-pharmacy-typing>
        <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Select batch
        </p>
        {batches.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No batches available</p>
        ) : (
          <ul className="max-h-56 overflow-auto">
            {batches.map((b) => {
              const id = b.batch_id ?? b.id;
              const selected = String(id) === String(line.selected_batch_id);
              const qty = batchQty(b);
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left text-xs hover:bg-muted',
                      selected && 'bg-primary/10',
                      b.expired && 'opacity-50',
                    )}
                    onClick={() => onSelect(b)}
                  >
                    <span className="font-mono font-semibold">{b.batch_number || '—'}</span>
                    <span className="text-muted-foreground">
                      Exp {b.expiry_date ? String(b.expiry_date).slice(0, 10) : '—'} · Qty{' '}
                      {qty}
                      {b.near_expiry ? ' · near expiry' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
