import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatInventoryQty,
  formatStockForDisplay,
  getMovementQtyHint,
  movementDocumentVerb,
  movementShowsDocumentQty,
  productHasStockConversion,
} from '@/lib/units';

function movementRowAsProduct(row) {
  return {
    unit: row?.unit_key,
    unit_label: row?.unit_label,
    qty_conversion: row?.qty_conversion,
  };
}

export function MovementQtyDisplay({ row, className }) {
  if (row?.quantity == null) {
    return <span className={cn('text-sm text-muted-foreground', className)}>—</span>;
  }

  const absQty = Math.abs(Number(row.quantity) || 0);
  const product = movementRowAsProduct(row);
  const text = formatStockForDisplay(absQty, product);
  const hint = getMovementQtyHint(absQty, row);
  const showDocQty = movementShowsDocumentQty(row);
  const hasTooltip = Boolean(hint) || productHasStockConversion(product);

  const main = hasTooltip ? (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'cursor-help border-b border-dotted border-muted-foreground/35 text-sm font-semibold tabular-nums',
              className,
            )}
          >
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px]">
          {hint
            ? hint.split('\n').map((line) => (
                <p key={line} className="text-xs leading-relaxed">
                  {line}
                </p>
              ))
            : (
              <p className="text-xs">{text}</p>
            )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <span className={cn('text-sm font-semibold tabular-nums', className)}>{text}</span>
  );

  return (
    <div className="text-right">
      {main}
      {showDocQty ? (
        <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
          {movementDocumentVerb(row)}{' '}
          {formatInventoryQty(row.entered_quantity)} {row.entered_unit_label}
        </div>
      ) : null}
    </div>
  );
}
