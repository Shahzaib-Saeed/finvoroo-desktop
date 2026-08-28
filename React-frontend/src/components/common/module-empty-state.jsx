import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Professional empty state for brand-new workspaces (no demo data).
 */
export function ModuleEmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  icon: Icon,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" />
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {actionLabel && (actionTo || onAction) ? (
        <div className="mt-5">
          {actionTo ? (
            <Button asChild>
              <Link to={actionTo}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button type="button" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
