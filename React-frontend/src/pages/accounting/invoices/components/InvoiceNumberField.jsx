import { AlertCircle, Hash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  formatInvoiceSequence,
  resolvePreviewInvoiceNumber,
} from '../constants';
import { invoiceFieldLabelClass } from './invoice-form-design';
import { createInvoiceEnterKeyDownHandler } from './invoice-form-keyboard';

const onEnterNextField = createInvoiceEnterKeyDownHandler();

export function InvoiceNumberField({
  preview,
  loading,
  checking,
  manual,
  sequence,
  error,
  isEdit = false,
  currentInvoiceNumber = '',
  currentNumber,
  label = 'Invoice number',
  autoAssignHint = 'Assigned automatically on save',
  currentEditHint = 'Current invoice number',
  sequenceErrorId = 'invoice-sequence-error',
  sequenceAriaLabel = 'Invoice sequence number',
  resolvePreviewNumber,
  onToggleManual,
  onSequenceChange,
  compact = false,
}) {
  const padding = preview?.padding ?? 4;
  const prefix = preview?.prefix ?? '';
  const hasError = Boolean(error);
  const savedNumber = currentNumber ?? currentInvoiceNumber;
  const previewResolver =
    resolvePreviewNumber ||
    ((form, previewData) =>
      resolvePreviewInvoiceNumber(form, previewData));
  const displayNumber =
    isEdit && !manual && savedNumber
      ? savedNumber
      : previewResolver(
          { invoice_number_manual: manual, invoice_sequence: sequence, bill_number_manual: manual, bill_sequence: sequence },
          preview,
        );

  return (
    <div className="space-y-1.5 min-w-0">
      <Label className={cn(invoiceFieldLabelClass, hasError && 'text-destructive')}>
        {label}
      </Label>

      {loading ? (
        <Skeleton className="h-10 w-full max-w-xs" />
      ) : manual ? (
        <div className="space-y-2">
          <div className="flex items-stretch gap-2 max-w-md">
            <div
              className={cn(
                'flex h-10 shrink-0 items-center rounded-md border px-3 font-mono text-sm',
                hasError
                  ? 'border-destructive/50 bg-destructive/5 text-destructive'
                  : 'border-input bg-muted/40 text-muted-foreground',
              )}
            >
              {prefix}
            </div>
            <div className="relative min-w-0 flex-1">
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={sequence}
                onChange={(e) => onSequenceChange(e.target.value.replace(/\D/g, ''))}
                placeholder={formatInvoiceSequence(preview?.sequence ?? 1, padding)}
                aria-invalid={hasError}
                aria-describedby={hasError ? sequenceErrorId : undefined}
                className={cn(
                  'h-10 pe-9 font-mono tabular-nums',
                  hasError &&
                    'border-destructive text-destructive focus-visible:border-destructive focus-visible:ring-destructive/30',
                )}
                aria-label={sequenceAriaLabel}
                data-enter-nav="1"
                onKeyDown={onEnterNextField}
              />
              {checking ? (
                <Loader2 className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : hasError ? (
                <AlertCircle className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-destructive" />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className={cn('text-xs', hasError ? 'text-destructive' : 'text-muted-foreground')}>
              Preview:{' '}
              <span
                className={cn(
                  'font-mono font-medium',
                  hasError ? 'text-destructive' : 'text-foreground',
                )}
              >
                {displayNumber || '—'}
              </span>
            </p>
            {checking ? (
              <span className="text-xs text-muted-foreground">Checking availability…</span>
            ) : null}
            {!isEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onToggleManual(false)}
              >
                Use auto number
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className={cn(compact ? 'space-y-1.5' : 'flex flex-wrap items-center gap-3')}>
          <div
            tabIndex={0}
            data-enter-nav="1"
            onKeyDown={onEnterNextField}
            className={cn(
              compact
                ? 'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-muted/20 px-3 font-mono text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
                : 'inline-flex h-10 items-center gap-2 rounded-md border border-input bg-muted/20 px-3 font-mono text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
            )}
          >
            <Hash className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{displayNumber || '—'}</span>
          </div>
          {compact ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground truncate">
                {isEdit ? currentEditHint : autoAssignHint}
              </span>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-[11px] shrink-0"
                onClick={() => onToggleManual(true)}
              >
                Customize
              </Button>
            </div>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                {isEdit ? currentEditHint : autoAssignHint}
              </span>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onToggleManual(true)}>
                Customize number
              </Button>
            </>
          )}
        </div>
      )}

      {error ? (
        <p id={sequenceErrorId} className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
