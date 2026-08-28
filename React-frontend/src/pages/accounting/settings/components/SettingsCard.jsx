import { cn } from '@/lib/utils';

/**
 * Settings tab panel — flat content wrapper (no nested card chrome).
 */
export function SettingsCard({
  title,
  description,
  headerExtra,
  children,
  footer,
  className,
  contentClassName,
  hideHeader = false,
  useStickyFooter = false,
}) {
  return (
    <div
      className={cn(
        'min-w-0 flex flex-col',
        useStickyFooter && 'flex-1 min-h-0 pb-0',
        className,
      )}
    >
      {!hideHeader && (title || description || headerExtra) ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-3xl">
                {description}
              </p>
            ) : null}
          </div>
          {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
        </div>
      ) : null}
      <div className={cn(useStickyFooter && 'flex flex-col flex-1 min-h-0', contentClassName)}>
        {children}
      </div>
      {footer && !useStickyFooter ? (
        <div className="mt-6 flex justify-end gap-2 border-t border-border/60 pt-4">{footer}</div>
      ) : null}
    </div>
  );
}
