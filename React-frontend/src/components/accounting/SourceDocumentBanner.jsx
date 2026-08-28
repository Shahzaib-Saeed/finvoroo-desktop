import { Link } from 'react-router';
import { ExternalLink, Info } from 'lucide-react';
import { documentNumberLabel } from '@/pages/accounting/lib/documentNumber';

/**
 * Banner shown on create forms pre-filled from another document (e.g. invoice → bill, job → invoice).
 * @param {string} [targetDocument] — e.g. "bill", "invoice", "expense" for job-order context copy
 */
export function SourceDocumentBanner({
  source,
  warnings = [],
  workspaceId,
  accent = 'amber',
  targetDocument,
}) {
  const sourceType = source?.source_type || 'invoice';
  const sourceId = source?.source_id || source?.invoice_id;
  if (!sourceId) return null;

  const sourcePathMap = {
    invoice: 'invoices',
    purchase_order: 'purchase-orders',
    bill: 'bills',
    quotation: 'quotations',
    sales_order: 'sales-orders',
    delivery_note: 'delivery-notes',
    fixed_asset: 'fixed-assets',
    job_order: 'job-orders',
  };
  const sourceBase = `/workspace/${workspaceId}/accounting/${sourcePathMap[sourceType] || 'invoices'}/${sourceId}`;
  const sourceLabelMap = {
    invoice: 'invoice',
    purchase_order: 'purchase order',
    bill: 'bill',
    quotation: 'quotation',
    sales_order: 'sales order',
    delivery_note: 'delivery note',
    fixed_asset: 'fixed asset',
    job_order: 'job order',
  };
  const palette =
    accent === 'violet'
      ? 'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-100'
      : accent === 'blue'
        ? 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100'
        : accent === 'emerald'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100'
          : accent === 'primary'
            ? 'border-primary/25 bg-primary/[0.06] text-foreground'
            : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100';

  const sourceLabel = sourceLabelMap[sourceType] || 'document';
  const docNumber = documentNumberLabel(
    source.source_number,
    source.invoice_number,
    source.bill_number,
    source.order_number,
    source.quote_number,
    source.po_number,
    source.job_number,
  );
  const party = source.party_name || source.customer_name;
  const target = targetDocument ? String(targetDocument).toLowerCase() : '';
  const fromJobOrder = sourceType === 'job_order';

  const lead =
    target && fromJobOrder
      ? `Recording a ${target} for `
      : target
        ? `Creating a ${target} from `
        : 'Pre-filled from ';

  const trail = fromJobOrder && target
    ? '. The job order is linked below — review details and save when ready.'
    : '. Review and save when ready — nothing is created until you save.';

  return (
    <div className={`rounded-xl border px-4 py-3.5 space-y-2 print:hidden shadow-sm ${palette}`}>
      <p className="text-sm flex items-start gap-2.5 leading-relaxed">
        <Info className="size-4 shrink-0 mt-0.5 opacity-80" />
        <span>
          {lead}
          {!fromJobOrder || !target ? (
            <span>{sourceLabel} </span>
          ) : null}
          <Link
            to={sourceBase}
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
          >
            {docNumber}
            <ExternalLink className="size-3.5" />
          </Link>
          {source.title && fromJobOrder ? (
            <span className="text-muted-foreground"> — {source.title}</span>
          ) : null}
          {party ? (
            <span className="text-muted-foreground"> · {party}</span>
          ) : null}
          {trail}
        </span>
      </p>
      {warnings.length > 0 ? (
        <ul className="text-xs space-y-1 ps-6 list-disc opacity-90">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
