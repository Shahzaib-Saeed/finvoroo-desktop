import { cn } from '@/lib/utils';

export const invoiceFieldLabelClass = 'text-sm font-medium text-foreground';

/** Full-width surfaces with clear edges for ultrawide monitors. */
export const formSectionCardClass =
  'rounded-xl border border-foreground/[0.14] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.06)] overflow-hidden';

export const formSectionBodyClass = 'p-4 sm:p-5 space-y-4';

export const formInnerPanelClass =
  'rounded-xl border border-foreground/[0.14] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05)] overflow-hidden';

export function FormSectionHeader({ title, className, accent = false }) {
  return (
    <div
      className={cn(
        'border-b border-foreground/[0.09] bg-gradient-to-b from-muted/60 to-muted/30 px-4 py-3',
        accent && 'bg-primary/[0.05] from-primary/[0.06] to-muted/25',
        className,
      )}
    >
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
    </div>
  );
}

function SkeletonBlock({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-muted/70', className)} />;
}

/** Layout-preserving shell — feels faster than a centered spinner on first paint. */
export function InvoiceFormLoadingShell() {
  return (
    <div className="w-full min-w-0 pb-4 space-y-6" aria-busy="true" aria-label="Loading invoice form">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={cn(formSectionCardClass, 'lg:col-span-5')}>
          <FormSectionHeader title="Customer" />
          <div className={cn(formSectionBodyClass, 'space-y-3')}>
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-20 w-full" />
          </div>
        </div>
        <div className={cn(formSectionCardClass, 'lg:col-span-7')}>
          <FormSectionHeader title="Invoice details" />
          <div className={cn(formSectionBodyClass, 'space-y-3')}>
            <div className="grid grid-cols-2 gap-3">
              <SkeletonBlock className="h-10 w-full" />
              <SkeletonBlock className="h-10 w-full" />
              <SkeletonBlock className="h-10 w-full" />
              <SkeletonBlock className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
      <div className={cn(formSectionCardClass, 'p-4 space-y-3')}>
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-32 w-full" />
      </div>
    </div>
  );
}
