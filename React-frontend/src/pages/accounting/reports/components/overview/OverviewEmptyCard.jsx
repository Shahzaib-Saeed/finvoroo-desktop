import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Compact empty state — never a tall white box. */
export function OverviewEmptyCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionTo,
  className,
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3.5 py-3',
        className,
      )}
    >
      {Icon ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200/80">
          <Icon className="size-4" strokeWidth={1.5} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      {actionLabel && actionTo ? (
        <Button variant="outline" size="sm" className="h-8 shrink-0" asChild>
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      ) : actionLabel && onAction ? (
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
