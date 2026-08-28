import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function MetaItem({ label, value, highlight, className }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <span className={cn('inline-flex items-center gap-1 min-w-0', className)}>
      {label ? <span className="text-muted-foreground">{label}</span> : null}
      <span
        className={cn(
          'font-medium truncate',
          highlight ? 'text-amber-700 dark:text-amber-400 tabular-nums' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </span>
  );
}

export function formatPaymentTerms(ctx, form) {
  const t = ctx?.payment_terms_type || form?.payment_terms_type || 'net_days';
  if (ctx?.payment_terms) return ctx.payment_terms;
  if (t === 'prepaid') return 'Prepaid';
  if (t === 'cod') return 'C.O.D.';
  if (t === 'end_of_next_month') return 'Due end of next month';
  if (t === 'fixed_day_next_month') {
    return `Due day ${form?.payment_terms_fixed_day || ctx?.payment_terms_fixed_day || 1} next month`;
  }
  const days = form?.payment_terms_days ?? ctx?.payment_terms_days ?? 30;
  return `Net ${days}`;
}

/**
 * Compact customer context strip — shown below the customer picker.
 */
export function InvoiceCustomerInfoPanel({
  customerContext,
  form,
  className,
  loading = false,
  trailingAction = null,
  expandedContent = null,
}) {
  if (!customerContext && !loading) return null;

  const currency = customerContext?.currency || form?.currency;
  const outstanding = customerContext?.outstanding_balance_due_formatted;
  const terms = formatPaymentTerms(customerContext, form);
  const credit = customerContext?.credit_limit_formatted;
  const email = customerContext?.email;

  return (
    <div
      className={cn(
        'rounded-md border border-border/60 bg-muted/10 px-2.5 py-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Loading…
            </span>
          ) : (
            <>
              {currency ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium shrink-0">
                  {currency}
                </Badge>
              ) : null}
              <MetaItem label="Outstanding" value={outstanding} highlight />
              {terms ? (
                <span className="text-muted-foreground before:content-['·'] before:mx-0.5 first:before:content-none">
                  {terms}
                </span>
              ) : null}
              <MetaItem
                label="Credit"
                value={credit}
                className="before:content-['·'] before:mx-0.5 before:text-muted-foreground"
              />
              {email ? (
                <MetaItem
                  label=""
                  value={email}
                  className="hidden sm:inline before:content-['·'] before:mx-0.5 before:text-muted-foreground max-w-[180px]"
                />
              ) : null}
            </>
          )}
        </div>
        {trailingAction && !loading ? (
          <div className="shrink-0">{trailingAction}</div>
        ) : null}
      </div>

      {expandedContent && !loading ? (
        <div className="mt-2 border-t border-border/40 pt-2">{expandedContent}</div>
      ) : null}
    </div>
  );
}
