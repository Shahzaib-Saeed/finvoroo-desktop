import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import {
  parseInvoiceIdFromUrl,
  resolveArLedgerDocument,
  resolveApLedgerDocument,
  resolveDocumentFromHref,
  resolveJournalLineInvoiceId,
  resolveArLedgerInvoiceId,
} from '@/pages/accounting/reports/report-drilldown';
import { useDocumentPreview } from '../invoice-preview-provider';

/**
 * Drill-down control for mixed document types.
 * Opens preview sheets for invoices, payments, credit notes, bills, etc.
 */
export function DocumentDrillLink({
  workspaceId,
  href,
  invoiceId,
  row,
  ledgerType,
  children,
  className,
  title = 'View source document',
  onClick,
  navigateToPage = false,
}) {
  const {
    openInvoice,
    openPayment,
    openCreditNote,
    openBill,
    openBillPayment,
    openVendorCredit,
  } = useDocumentPreview();

  const resolved =
    (ledgerType === 'ap'
      ? resolveApLedgerDocument(row, href)
      : ledgerType === 'ar'
        ? resolveArLedgerDocument(row, href)
        : null) ||
    resolveDocumentFromHref(href) ||
    (() => {
      const invId =
        Number(invoiceId) ||
        resolveArLedgerInvoiceId(row) ||
        resolveJournalLineInvoiceId(row) ||
        parseInvoiceIdFromUrl(href);
      return invId ? { type: 'invoice', id: invId } : null;
    })();

  const label = children ?? '—';

  const openResolved = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
    if (!resolved) return;
    switch (resolved.type) {
      case 'invoice':
        openInvoice(resolved.id);
        break;
      case 'payment':
        openPayment(resolved.id);
        break;
      case 'credit_note':
        openCreditNote(resolved.id);
        break;
      case 'bill':
        openBill(resolved.id);
        break;
      case 'bill_payment':
        openBillPayment(resolved.id);
        break;
      case 'vendor_credit':
        openVendorCredit(resolved.id);
        break;
      default:
        break;
    }
  };

  if (navigateToPage && href) {
    return (
      <Link
        to={href}
        className={cn('font-medium text-primary hover:underline underline-offset-2', className)}
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
      >
        {label}
      </Link>
    );
  }

  if (resolved) {
    return (
      <button
        type="button"
        className={cn(
          'font-medium text-primary hover:underline underline-offset-2 text-left',
          className,
        )}
        title={title}
        onClick={openResolved}
      >
        {label}
      </button>
    );
  }

  if (href) {
    return (
      <Link
        to={href}
        className={cn('font-medium text-primary hover:underline underline-offset-2', className)}
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
      >
        {label}
      </Link>
    );
  }

  return <span className={className}>{label}</span>;
}
