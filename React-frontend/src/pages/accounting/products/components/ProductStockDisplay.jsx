import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatStockForDisplay,
  formatStockQtyOnly,
  getStockConversionHint,
  productHasStockConversion,
} from '@/lib/units';

/**
 * Stock quantity for product screens.
 * - qtyOnly: number in the grid (unit lives in its own column); conversions on hover.
 * - full: quantity + storage unit for detail panels.
 */
export function ProductStockDisplay({
  stock,
  product,
  className,
  qtyOnly = false,
}) {
  const stockNum = Number(stock) || 0;
  const text = qtyOnly
    ? formatStockQtyOnly(stockNum)
    : formatStockForDisplay(stockNum, product);
  const hint = getStockConversionHint(stockNum, product);
  const hasConversion = productHasStockConversion(product);

  if (!hasConversion && !hint) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'cursor-help border-b border-dotted border-muted-foreground/35',
              className,
            )}
          >
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px]">
          {hint ? (
            hint.split('\n').map((line) => (
              <p key={line} className="text-xs leading-relaxed">
                {line}
              </p>
            ))
          ) : (
            <p className="text-xs">{text}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
