import { cn } from '@/lib/utils';
import { reportStickyFiltersClass } from './report-sticky';

/**
 * Minimal single-row filter strip for report pages — avoids the tall
 * "filter card" header + padded body pattern that pushes tables down.
 */
export function ReportCompactFilterBar({ children, className, footer, sticky = true }) {
  return (
    <div className={cn('no-print w-full space-y-1.5', className)}>
      <div
        className={cn(
          'flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-muted/35 px-2 py-2 sm:px-3',
          sticky && reportStickyFiltersClass,
        )}
      >
        {children}
      </div>
      {footer ? (
        <div className="flex flex-wrap items-center gap-1.5 px-0.5">{footer}</div>
      ) : null}
    </div>
  );
}
