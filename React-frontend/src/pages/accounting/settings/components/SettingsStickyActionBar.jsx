import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Compact save row — use at top or bottom of a settings form. */
export function SettingsStickyActionBar({
  dirty = false,
  saving = false,
  justSaved = false,
  onCancel,
  onReset,
  formId,
  saveLabel = 'Save',
  placement = 'top',
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2',
        placement === 'top'
          ? 'border-b border-border/60 mb-4 py-2'
          // Pinned to the bottom of the viewport: a settings form is long, and
          // a Save button that scrolls out of reach is the reason people lose
          // edits. The blur keeps content legible as it passes underneath.
          : 'sticky bottom-0 z-20 -mx-1 mt-6 border-t border-border/60 bg-background/85 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-xs min-h-7">
        {saving ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">Saving…</span>
          </>
        ) : justSaved && !dirty ? (
          <>
            <span className="flex size-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="size-2.5" aria-hidden />
            </span>
            <span className="text-emerald-700 font-medium">Saved</span>
          </>
        ) : dirty ? (
          <span className="text-amber-700 font-medium">Unsaved changes</span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {onReset && dirty ? (
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={onReset} disabled={saving}>
            Reset
          </Button>
        ) : null}
        {onCancel && dirty ? (
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" form={formId} size="sm" variant="mono" className="h-8" disabled={saving || !dirty}>
          {saving ? (
            <>
              <Loader2 className="size-3.5 mr-1 animate-spin" />
              Saving…
            </>
          ) : (
            saveLabel
          )}
        </Button>
      </div>
    </div>
  );
}
