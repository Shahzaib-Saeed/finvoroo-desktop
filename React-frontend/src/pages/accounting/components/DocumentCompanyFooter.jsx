import { cn } from '@/lib/utils';
import { companyDocumentFooterFor } from '@/pages/accounting/lib/documentFooter';

/**
 * Company-wide footer text from Settings → Footer settings.
 * Only renders when enabled for the given document page.
 */
export function DocumentCompanyFooter({
  company,
  page,
  className,
  textClassName,
  label = 'Company notes',
  showLabel = false,
}) {
  const text = companyDocumentFooterFor(company, page);
  if (!text) return null;

  return (
    <div className={cn(className)}>
      {showLabel && label ? (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          {label}
        </p>
      ) : null}
      <p
        className={cn(
          'text-sm text-muted-foreground whitespace-pre-line leading-relaxed',
          textClassName,
        )}
      >
        {text}
      </p>
    </div>
  );
}
