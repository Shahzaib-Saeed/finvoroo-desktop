import { Van } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function CustomerVendorSupplierToggle({
  checked,
  onChange,
  disabled = false,
  compact = false,
}) {
  const inputId = 'customer-also-vendor';

  return (
    <Label
      htmlFor={inputId}
      className={cn(
        'flex items-center gap-3 rounded-lg border transition-colors text-left w-full cursor-pointer',
        compact ? 'p-3' : 'p-3.5',
        disabled && 'opacity-60 pointer-events-none',
        checked
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card hover:bg-muted/40',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md',
          compact ? 'size-9' : 'size-10',
          checked
            ? 'bg-primary/15 text-primary'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <Van className={compact ? 'size-4' : 'size-5'} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id={inputId}
            checked={checked}
            disabled={disabled}
            onCheckedChange={(v) => onChange(!!v)}
            className="shrink-0"
          />
          <span className="text-sm font-medium leading-snug">
            Also use as vendor / supplier
          </span>
        </div>
        <p
          className={cn(
            'text-xs text-muted-foreground ps-6',
            compact ? 'mt-1' : 'mt-1.5',
          )}
        >
          Use on bills, purchase orders, and vendor payments.
        </p>
      </div>
    </Label>
  );
}
