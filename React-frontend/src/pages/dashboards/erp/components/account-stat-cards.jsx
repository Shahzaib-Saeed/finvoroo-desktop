import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const ICON_TONES = {
  companies: 'bg-blue-500/10 text-blue-600',
  active: 'bg-emerald-500/10 text-emerald-600',
  revenue: 'bg-violet-500/10 text-violet-600',
  alerts: 'bg-orange-500/10 text-orange-600',
  default: 'bg-muted text-muted-foreground',
};

/**
 * Clean KPI tiles — same language as the company workspace snapshot cards.
 */
export function AccountStatCards({ items, loading }) {
  if (loading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[124px] rounded-xl" />
        ))}
      </>
    );
  }

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="h-full rounded-xl border bg-background p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-sm"
          >
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className="mt-3 truncate text-2xl font-bold tracking-tight tabular-nums text-foreground"
                    title={item.title || item.value}
                  >
                    {item.value}
                  </p>
                </div>
                {Icon ? (
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                      ICON_TONES[item.tone] || ICON_TONES.default,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                ) : null}
              </div>
              {item.hint ? (
                <p className="text-xs leading-relaxed text-muted-foreground">{item.hint}</p>
              ) : (
                <span className="h-4" />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
