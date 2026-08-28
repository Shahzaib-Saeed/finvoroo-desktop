import { cn } from '@/lib/utils';

export const knowledgeCardClass =
  'rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden';

export const knowledgeCardHoverClass =
  'transition-all duration-200 hover:border-border hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:-translate-y-0.5';

export function KnowledgeSectionHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 mb-4', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-2xl">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function KnowledgeEmptyState({ title, description, className }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border/80 bg-muted/15 px-6 py-10 text-center',
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}

export function KnowledgeKbd({ children, className }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border/80 bg-muted/40 px-1.5 text-[11px] font-medium font-mono text-muted-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
