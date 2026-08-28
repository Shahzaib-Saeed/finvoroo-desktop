import { cn } from '@/lib/utils';

/**
 * PageHeader — consistent top-of-page title block for all module pages.
 *
 * Usage:
 *   <PageHeader
 *     title="Invoices"
 *     subtitle="Manage your sales invoices"
 *     actions={<Button>New Invoice</Button>}
 *   />
 */
export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 flex-wrap mb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-foreground leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
