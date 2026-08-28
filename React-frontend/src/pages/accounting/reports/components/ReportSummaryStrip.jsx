import { cn } from '@/lib/utils';

/**
 * Dense KPI strip for report totals — strip (default) or boxed cards.
 */
export function ReportSummaryStrip({
  items = [],
  context,
  className,
  variant = 'strip',
}) {
  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length && !context) return null;

  if (variant === 'cards') {
    return (
      <div className={cn('no-print', className)}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {visibleItems.map((item) => (
            <div
              key={item.key || item.label}
              className="rounded-md border border-border bg-background px-3 py-2.5 shadow-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {item.label}
              </p>
              <div
                className={cn(
                  'mt-1 text-sm font-bold tabular-nums text-foreground',
                  item.tone === 'positive' && 'text-emerald-700',
                  item.tone === 'negative' && 'text-red-700',
                  item.tone === 'warning' && 'text-amber-700',
                )}
              >
                {item.value}
                {item.badge}
              </div>
            </div>
          ))}
        </div>
        {context ? (
          <p className="mt-2 text-right text-[11px] text-muted-foreground">{context}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-y border-border bg-muted/30 px-3 py-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-y-2">
        {visibleItems.map((item, index) => (
          <div
            key={item.key || item.label}
            className={cn(
              'min-w-[8rem] px-3 first:pl-0',
              index < visibleItems.length - 1 && 'border-r border-border',
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {item.label}
            </p>
            <div
              className={cn(
                'mt-0.5 flex items-center gap-1.5 text-sm font-bold tabular-nums text-foreground',
                item.tone === 'positive' && 'text-emerald-700',
                item.tone === 'negative' && 'text-red-700',
                item.tone === 'warning' && 'text-amber-700',
              )}
            >
              {item.value}
              {item.badge}
            </div>
          </div>
        ))}
        {context ? (
          <div className="ml-auto min-w-0 border-l border-border pl-3 text-right text-[11px] text-muted-foreground">
            {context}
          </div>
        ) : null}
      </div>
    </div>
  );
}
