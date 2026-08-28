import { cn } from '@/lib/utils';
import { DocumentDrillLink } from '@/components/workspace/invoice/components/DocumentDrillLink';
import { buildApLedgerRowUrl, buildArLedgerRowUrl } from '../report-drilldown';
import { getReportDisplayReference } from '../report-reference';

/**
 * Clickable reference / label that opens the source document preview sheet.
 */
export function ReportSourceDrillLink({
  workspaceId,
  row,
  ledgerType = 'ar',
  label,
  className,
}) {
  const href =
    ledgerType === 'ap'
      ? buildApLedgerRowUrl(workspaceId, row)
      : buildArLedgerRowUrl(workspaceId, row);
  const text = label ?? getReportDisplayReference(row);

  if (!href && ledgerType === 'ar' && !row?.invoice_id && !row?.payment_id && !row?.credit_note_id) {
    return <span className={className}>{text}</span>;
  }

  if (!href && ledgerType === 'ap' && !row?.bill_id && !row?.payment_id && !row?.vendor_credit_id) {
    return <span className={className}>{text}</span>;
  }

  return (
    <DocumentDrillLink
      workspaceId={workspaceId}
      href={href}
      row={row}
      ledgerType={ledgerType}
      navigateToPage
      className={cn('font-medium text-primary hover:underline underline-offset-2', className)}
      title="Edit source document"
    >
      {text}
    </DocumentDrillLink>
  );
}
