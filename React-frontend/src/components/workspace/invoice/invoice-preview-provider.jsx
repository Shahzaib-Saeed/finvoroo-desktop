import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { InvoiceDetailsSheet } from '../invoice/components/InvoiceDetailsSheet';
import { DocumentDetailsSheet } from '../document/DocumentDetailsSheet';
import { PaymentDetailsPanel } from '../document/PaymentDetailsPanel';
import { CreditNoteDetailsPanel } from '../document/CreditNoteDetailsPanel';
import { BillDetailsPanel } from '../document/BillDetailsPanel';
import { BillPaymentDetailsPanel } from '../document/BillPaymentDetailsPanel';
import { VendorCreditDetailsPanel } from '../document/VendorCreditDetailsPanel';
import {
  buildBillPaymentUrl,
  buildBillUrl,
  buildCreditNoteUrl,
  buildCustomerPaymentUrl,
  buildInvoiceUrl,
  buildVendorCreditUrl,
} from '@/pages/accounting/reports/report-drilldown';

const DocumentPreviewContext = createContext(null);

const DOCUMENT_TITLES = {
  invoice: 'Invoice details',
  payment: 'Payment receipt',
  credit_note: 'Credit note details',
  bill: 'Bill details',
  bill_payment: 'Bill payment details',
  vendor_credit: 'Vendor credit details',
};

function buildFullPageUrl(workspaceId, type, id) {
  if (!workspaceId || !id) return null;
  switch (type) {
    case 'invoice':
      return buildInvoiceUrl(workspaceId, id);
    case 'payment':
      return buildCustomerPaymentUrl(workspaceId, id);
    case 'credit_note':
      return buildCreditNoteUrl(workspaceId, id);
    case 'bill':
      return buildBillUrl(workspaceId, id);
    case 'bill_payment':
      return buildBillPaymentUrl(workspaceId, id);
    case 'vendor_credit':
      return buildVendorCreditUrl(workspaceId, id);
    default:
      return null;
  }
}

export function InvoicePreviewProvider({ children, workspaceId }) {
  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState(null);
  const [documentId, setDocumentId] = useState(null);

  const openDocument = useCallback((type, id) => {
    const numericId = Number(id);
    if (!type || !numericId) return;
    setDocumentType(type);
    setDocumentId(numericId);
    setOpen(true);
  }, []);

  const openInvoice = useCallback((id) => openDocument('invoice', id), [openDocument]);
  const openPayment = useCallback((id) => openDocument('payment', id), [openDocument]);
  const openCreditNote = useCallback((id) => openDocument('credit_note', id), [openDocument]);
  const openBill = useCallback((id) => openDocument('bill', id), [openDocument]);
  const openBillPayment = useCallback((id) => openDocument('bill_payment', id), [openDocument]);
  const openVendorCredit = useCallback(
    (id) => openDocument('vendor_credit', id),
    [openDocument],
  );

  const closeDocument = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOpenChange = useCallback((next) => {
    setOpen(next);
    if (!next) {
      setDocumentType(null);
      setDocumentId(null);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      openDocument,
      openInvoice,
      openPayment,
      openCreditNote,
      openBill,
      openBillPayment,
      openVendorCredit,
      closeDocument,
    }),
    [
      openDocument,
      openInvoice,
      openPayment,
      openCreditNote,
      openBill,
      openBillPayment,
      openVendorCredit,
      closeDocument,
    ],
  );

  const fullPageUrl = buildFullPageUrl(workspaceId, documentType, documentId);

  return (
    <DocumentPreviewContext.Provider value={contextValue}>
      {children}
      {documentType === 'invoice' ? (
        <InvoiceDetailsSheet
          open={open}
          onOpenChange={handleOpenChange}
          invoiceId={documentId}
          workspaceId={workspaceId}
        />
      ) : (
        <DocumentDetailsSheet
          open={open}
          onOpenChange={handleOpenChange}
          title={DOCUMENT_TITLES[documentType] || 'Document details'}
          fullPageUrl={fullPageUrl}
        >
          {documentType === 'payment' && documentId ? (
            <PaymentDetailsPanel paymentId={documentId} workspaceId={workspaceId} />
          ) : null}
          {documentType === 'credit_note' && documentId ? (
            <CreditNoteDetailsPanel creditNoteId={documentId} workspaceId={workspaceId} />
          ) : null}
          {documentType === 'bill' && documentId ? (
            <BillDetailsPanel billId={documentId} workspaceId={workspaceId} />
          ) : null}
          {documentType === 'bill_payment' && documentId ? (
            <BillPaymentDetailsPanel paymentId={documentId} workspaceId={workspaceId} />
          ) : null}
          {documentType === 'vendor_credit' && documentId ? (
            <VendorCreditDetailsPanel vendorCreditId={documentId} workspaceId={workspaceId} />
          ) : null}
        </DocumentDetailsSheet>
      )}
    </DocumentPreviewContext.Provider>
  );
}

export function useInvoicePreview() {
  const ctx = useContext(DocumentPreviewContext);
  if (!ctx) {
    throw new Error('useInvoicePreview must be used inside <InvoicePreviewProvider>');
  }
  return ctx;
}

export function useDocumentPreview() {
  return useInvoicePreview();
}
