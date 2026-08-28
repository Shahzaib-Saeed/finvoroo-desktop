import { cn } from '@/lib/utils';
import { BillClassicBody } from './BillClassicBody';

/**
 * Hidden print fallback — prefers on-screen #bill-document when present.
 * Kept so older print entry points still resolve a document node.
 */
export function BillPrintDocument({ bill, className }) {
  return (
    <div
      id="bill-print-document"
      className={cn('hidden', className)}
      aria-hidden="true"
    >
      <BillClassicBody bill={bill} />
    </div>
  );
}
