import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Full-size invoice page viewer. Pages is a list of { src, title, caption, error }.
 */
export function InvoiceImagePreview({
  open = false,
  onOpenChange,
  pages = [],
  index = 0,
  onIndexChange,
}) {
  const total = pages.length;
  const safeIndex = total ? Math.min(Math.max(0, index), total - 1) : 0;
  const page = total ? pages[safeIndex] : null;

  useEffect(() => {
    if (!open || total < 2) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIndexChange?.((safeIndex - 1 + total) % total);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onIndexChange?.((safeIndex + 1) % total);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onIndexChange, safeIndex, total]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-slate-950/80 backdrop-blur-[2px]"
        className="gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none !max-w-[min(72rem,calc(100vw-2.5rem))]"
        data-pharmacy-typing
      >
        <DialogTitle className="sr-only">{page?.title || 'Invoice page'}</DialogTitle>
        <DialogDescription className="sr-only">
          Full-size preview of the scanned invoice page
        </DialogDescription>

        <div className="flex items-center justify-between gap-3 px-1 pb-3 text-white">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{page?.title || 'Invoice page'}</p>
            {page?.caption ? (
              <p className="truncate text-xs text-white/70">{page.caption}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => onOpenChange?.(false)}
            aria-label="Close preview"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative flex min-h-[min(70vh,720px)] w-full items-center justify-center overflow-auto rounded-lg bg-zinc-950">
          {page?.src ? (
            <img
              src={page.src}
              alt={page.title || 'Invoice page'}
              className="h-auto max-h-[min(78vh,860px)] w-auto max-w-full object-contain"
            />
          ) : (
            <p className="px-6 py-16 text-sm text-white/70">No image available for this scan.</p>
          )}

          {total > 1 ? (
            <>
              <button
                type="button"
                className="absolute start-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white"
                onClick={() => onIndexChange?.((safeIndex - 1 + total) % total)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                className="absolute end-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white"
                onClick={() => onIndexChange?.((safeIndex + 1) % total)}
                aria-label="Next page"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>

        {page?.error ? (
          <p className="mt-2 rounded-md bg-red-500/90 px-3 py-1.5 text-xs text-white">{page.error}</p>
        ) : null}

        {total > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5">
            {pages.map((item, i) => (
              <button
                key={item.id || i}
                type="button"
                aria-label={`Page ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === safeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70',
                )}
                onClick={() => onIndexChange?.(i)}
              />
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
