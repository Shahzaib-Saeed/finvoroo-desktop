import { cn } from '@/lib/utils';
import { InvoiceClassicBody } from './InvoiceClassicBody';

/**
 * @deprecated Prefer printing #invoice-document (same layout as view).
 * Kept as a fallback mount point if needed by older callers.
 */
export function InvoicePrintDocument({ invoice, display, className }) {
  return (
    <div
      id="invoice-print-document"
      className={cn('hidden', className)}
      aria-hidden="true"
    >
      <InvoiceClassicBody invoice={invoice} display={display} />
    </div>
  );
}
