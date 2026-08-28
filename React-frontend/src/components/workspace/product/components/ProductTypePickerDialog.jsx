import {
  Box,
  ChevronRight,
  Factory,
  FlaskConical,
  Layers,
  Package,
  Sprout,
  Wrench,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PRODUCT_TYPE_HINTS, PRODUCT_TYPE_SHORT } from '../constants';

const TYPE_ICONS = {
  finished_good: FlaskConical,
  manufactured: Wrench,
  raw_material: Sprout,
  inventory: Layers,
  non_inventory: Package,
  service: Factory,
};

/** Flat overlay — no blur (blur tanks performance on large pages). */
const FAST_OVERLAY = 'bg-black/20 backdrop-blur-none [backdrop-filter:none]';

export function ProductTypePickerDialog({
  open,
  onOpenChange,
  typeOptions = {},
  onSelect,
}) {
  const entries = Object.keys(typeOptions).length
    ? Object.entries(typeOptions)
    : [
        ['inventory', 'Inventory Product'],
        ['non_inventory', 'Non-Inventory Product'],
        ['service', 'Service'],
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={FAST_OVERLAY}
        className={cn(
          'sm:max-w-md p-0 gap-0 overflow-hidden border shadow-xl',
          'duration-100 data-[state=open]:animate-in data-[state=closed]:animate-out',
        )}
      >
        <DialogHeader className="px-5 pt-5 pb-4 mb-0 text-start space-y-1 border-b bg-muted/20">
          <DialogTitle className="text-[15px] font-semibold tracking-tight">
            New product
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-snug">
            Choose the type that best matches this item.
          </DialogDescription>
        </DialogHeader>

        <ul className="py-1.5" role="listbox" aria-label="Product type">
          {entries.map(([key, label]) => {
            const Icon = TYPE_ICONS[key] || Box;
            const short = PRODUCT_TYPE_SHORT[key] || label;
            const hint = PRODUCT_TYPE_HINTS[key] || '';

            return (
              <li key={key}>
                <button
                  type="button"
                  role="option"
                  onClick={() => {
                    onSelect?.(key);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'group flex w-full items-center gap-3 px-5 py-3.5 text-left',
                    'transition-colors hover:bg-muted/50',
                    'focus-visible:outline-none focus-visible:bg-muted/50',
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background border text-muted-foreground group-hover:border-primary/30 group-hover:text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {short}
                    </span>
                    {hint ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
                        {hint}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
