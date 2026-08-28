import { DocumentAttachmentsPanel } from './DocumentAttachmentsPanel';
import { invoicesApi } from '@/pages/accounting/invoices/api/invoices.api';
import { billsApi } from '@/pages/accounting/bills/api/bills.api';
import { customersApi } from '@/pages/accounting/customers/api/customers.api';
import { vendorsApi } from '@/pages/accounting/vendors/api/vendors.api';

const API_BY_TYPE = {
  invoice: invoicesApi,
  bill: billsApi,
  customer: customersApi,
  vendor: vendorsApi,
};

const COPY_BY_TYPE = {
  invoice: {
    title: 'Attachments',
    description:
      'Upload PDFs, images, or office documents (up to 30 MB each, multiple files allowed). View, download, or remove anytime.',
  },
  bill: {
    title: 'Attachments',
    description:
      'Upload vendor PDFs, receipts, or contracts (up to 30 MB each). View, download, or remove anytime.',
  },
  customer: {
    title: 'Attachments',
    description:
      'Upload contracts, agreements, or any documents for this customer (up to 30 MB each). View, download, or remove anytime.',
  },
  vendor: {
    title: 'Attachments',
    description:
      'Upload contracts, agreements, or any documents for this vendor (up to 30 MB each). View, download, or remove anytime.',
  },
};

export function DocumentAttachmentsSection({
  documentType,
  documentId = null,
  attachments = [],
  pendingFiles = [],
  onPendingFilesChange,
  onAttachmentsChange,
  readOnly = false,
  disabled = false,
  maxFiles,
  maxSize,
  compact = false,
  className,
}) {
  const copy = COPY_BY_TYPE[documentType] || COPY_BY_TYPE.invoice;
  const api = API_BY_TYPE[documentType];

  return (
    <DocumentAttachmentsPanel
      className={className}
      title={copy.title}
      description={copy.description}
      documentId={documentId}
      attachmentsApi={api}
      existingAttachments={attachments}
      pendingFiles={pendingFiles}
      onPendingFilesChange={onPendingFilesChange}
      onAttachmentsChange={onAttachmentsChange}
      readOnly={readOnly}
      disabled={disabled}
      maxFiles={maxFiles}
      maxSize={maxSize}
      compact={compact}
    />
  );
}

export function DocumentAttachmentsReadOnly({ documentType, documentId, attachments = [], className }) {
  if (!attachments?.length) return null;

  return (
    <DocumentAttachmentsSection
      documentType={documentType}
      documentId={documentId}
      attachments={attachments}
      readOnly
      className={className}
    />
  );
}
