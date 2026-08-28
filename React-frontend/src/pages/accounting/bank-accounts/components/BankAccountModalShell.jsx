import { Landmark } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Shared wide modal shell for bank account create / edit flows.
 */
export function BankAccountModalShell({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon = Landmark,
  loading = false,
  loadingLabel = 'Loading…',
  main,
  sidebar,
  className,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'left-[50%] top-[50%] w-[min(100vw-2rem,80rem)] max-w-none',
          'h-[min(92vh,900px)] translate-x-[-50%] translate-y-[-50%]',
          'flex flex-col p-0 gap-0 overflow-hidden',
          className,
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 mb-0 border-b px-8 py-6">
          <div className="flex items-start gap-4 pe-8">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="mt-1.5 text-sm leading-relaxed">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {loadingLabel}
            </span>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
            <div className="flex min-h-0 flex-col overflow-y-auto lg:col-span-7 xl:col-span-7">
              <div className="flex flex-1 flex-col gap-6 px-8 py-6">{main}</div>
            </div>
            <div className="flex min-h-0 flex-col border-t bg-muted/25 lg:col-span-5 lg:border-l lg:border-t-0 xl:col-span-5">
              {sidebar}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
