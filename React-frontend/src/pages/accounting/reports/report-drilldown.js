/**
 * Build URLs to drill down from financial report lines into source transactions.
 */

export function buildAccountStatementUrl(workspaceId, { accountId, from, to } = {}) {
    if (!workspaceId || !accountId) return null;
    const params = new URLSearchParams();
    params.set('account_id', String(accountId));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return `/workspace/${workspaceId}/accounting/reports/account-statement?${params.toString()}`;
}

export function buildGeneralLedgerUrl(workspaceId, { accountId, from, to } = {}) {
    if (!workspaceId) return null;
    const params = new URLSearchParams();
    if (accountId) params.set('account_id', String(accountId));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return `/workspace/${workspaceId}/accounting/reports/general-ledger${qs ? `?${qs}` : ''}`;
}

export function buildJournalEntryUrl(workspaceId, journalEntryId) {
  if (!workspaceId || !journalEntryId) return null;
  return `/workspace/${workspaceId}/accounting/journal/${journalEntryId}/edit`;
}

export function buildCustomerLedgerUrl(workspaceId, { customerId, from, to } = {}) {
  if (!workspaceId || !customerId) return null;
  const params = new URLSearchParams();
  params.set('customer_id', String(customerId));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return `/workspace/${workspaceId}/accounting/reports/customer-ledger?${params.toString()}`;
}

export function buildVendorLedgerUrl(workspaceId, { vendorId, from, to } = {}) {
  if (!workspaceId || !vendorId) return null;
  const params = new URLSearchParams();
  params.set('vendor_id', String(vendorId));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return `/workspace/${workspaceId}/accounting/reports/vendor-ledger?${params.toString()}`;
}

export function buildInvoiceUrl(workspaceId, invoiceId) {
  if (!workspaceId || !invoiceId) return null;
  return `/workspace/${workspaceId}/accounting/invoices/${invoiceId}/edit`;
}

export function parseInvoiceIdFromUrl(url) {
  const match = String(url ?? '').match(/\/invoices\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function parseIdFromUrl(url, segment) {
  const match = String(url ?? '').match(new RegExp(`/${segment}/(\\d+)`));
  return match ? Number(match[1]) : null;
}

export function parsePaymentIdFromUrl(url) {
  return parseIdFromUrl(url, 'payments');
}

export function parseCreditNoteIdFromUrl(url) {
  return parseIdFromUrl(url, 'credit-notes');
}

export function parseBillIdFromUrl(url) {
  return parseIdFromUrl(url, 'bills');
}

export function parseBillPaymentIdFromUrl(url) {
  return parseIdFromUrl(url, 'bill-payments');
}

export function parseVendorCreditIdFromUrl(url) {
  return parseIdFromUrl(url, 'vendor-credits');
}

/** Resolve AR ledger row + href into a previewable document. */
export function resolveArLedgerDocument(row, href) {
  const invoiceId =
    resolveArLedgerInvoiceId(row) || parseInvoiceIdFromUrl(href);
  if (invoiceId) return { type: 'invoice', id: invoiceId };

  let paymentId = row?.payment_id ? Number(row.payment_id) : null;
  if (!paymentId && row?.entry_type === 'payment' && row?.source_id) {
    paymentId = Number(row.source_id);
  }
  if (!paymentId) paymentId = parsePaymentIdFromUrl(href);
  if (paymentId) return { type: 'payment', id: paymentId };

  let creditNoteId = row?.credit_note_id ? Number(row.credit_note_id) : null;
  if (!creditNoteId && row?.entry_type === 'credit_note' && row?.source_id) {
    creditNoteId = Number(row.source_id);
  }
  if (!creditNoteId) creditNoteId = parseCreditNoteIdFromUrl(href);
  if (creditNoteId) return { type: 'credit_note', id: creditNoteId };

  return null;
}

/** Resolve AP ledger row + href into a previewable document. */
export function resolveApLedgerDocument(row, href) {
  let billId = row?.bill_id ? Number(row.bill_id) : null;
  if (!billId && row?.entry_type === 'bill' && row?.source_id) {
    billId = Number(row.source_id);
  }
  if (!billId) billId = parseBillIdFromUrl(href);
  if (billId) return { type: 'bill', id: billId };

  let billPaymentId = row?.payment_id ? Number(row.payment_id) : null;
  if (!billPaymentId && row?.entry_type === 'payment' && row?.source_id) {
    billPaymentId = Number(row.source_id);
  }
  if (!billPaymentId) billPaymentId = parseBillPaymentIdFromUrl(href);
  if (billPaymentId) return { type: 'bill_payment', id: billPaymentId };

  let vendorCreditId = row?.vendor_credit_id ? Number(row.vendor_credit_id) : null;
  if (!vendorCreditId && row?.entry_type === 'vendor_credit' && row?.source_id) {
    vendorCreditId = Number(row.source_id);
  }
  if (!vendorCreditId) vendorCreditId = parseVendorCreditIdFromUrl(href);
  if (vendorCreditId) return { type: 'vendor_credit', id: vendorCreditId };

  return null;
}

/** Resolve any drill-down href into a previewable document. */
export function resolveDocumentFromHref(href) {
  if (!href) return null;

  const invoiceId = parseInvoiceIdFromUrl(href);
  if (invoiceId) return { type: 'invoice', id: invoiceId };

  const billPaymentId = parseBillPaymentIdFromUrl(href);
  if (billPaymentId) return { type: 'bill_payment', id: billPaymentId };

  const paymentId = parsePaymentIdFromUrl(href);
  if (paymentId) return { type: 'payment', id: paymentId };

  const creditNoteId = parseCreditNoteIdFromUrl(href);
  if (creditNoteId) return { type: 'credit_note', id: creditNoteId };

  const billId = parseBillIdFromUrl(href);
  if (billId) return { type: 'bill', id: billId };

  const vendorCreditId = parseVendorCreditIdFromUrl(href);
  if (vendorCreditId) return { type: 'vendor_credit', id: vendorCreditId };

  return null;
}

/** Invoice id from AR ledger / customer-aging rows. */
export function resolveArLedgerInvoiceId(row) {
  if (!row) return null;
  if (row.invoice_id) return Number(row.invoice_id);
  if (row.entry_type === 'invoice' && row.source_id) return Number(row.source_id);
  return null;
}

/** Invoice id from GL / account-statement journal lines. */
export function resolveJournalLineInvoiceId(row) {
  if (!row) return null;
  if (row.source_invoice_id) return Number(row.source_invoice_id);
  const parsed = parseJournalReference(row.reference);
  return parsed.invoiceId ?? null;
}

export function buildBillUrl(workspaceId, billId) {
  if (!workspaceId || !billId) return null;
  return `/workspace/${workspaceId}/accounting/bills/${billId}/edit`;
}

export function buildJobOrderUrl(workspaceId, jobOrderId) {
  if (!workspaceId || !jobOrderId) return null;
  return `/workspace/${workspaceId}/accounting/job-orders/${jobOrderId}/edit`;
}

export function buildVendorCreditUrl(workspaceId, vendorCreditId) {
  if (!workspaceId || !vendorCreditId) return null;
  return `/workspace/${workspaceId}/accounting/vendor-credits/${vendorCreditId}`;
}

export function buildCustomerPaymentUrl(workspaceId, paymentId) {
  if (!workspaceId || !paymentId) return null;
  return `/workspace/${workspaceId}/accounting/payments/${paymentId}/edit`;
}

/** Bill payments have no dedicated edit route — opens the record page. */
export function buildBillPaymentUrl(workspaceId, paymentId) {
  if (!workspaceId || !paymentId) return null;
  return `/workspace/${workspaceId}/accounting/bill-payments/${paymentId}`;
}

export function buildCreditNoteUrl(workspaceId, creditNoteId) {
  if (!workspaceId || !creditNoteId) return null;
  return `/workspace/${workspaceId}/accounting/credit-notes/${creditNoteId}/edit`;
}

export function buildJournalUrl(workspaceId, journalId) {
  if (!workspaceId || !journalId) return null;
  return `/workspace/${workspaceId}/accounting/journal/${journalId}`;
}

export function buildStockAdjustmentUrl(workspaceId, adjustmentId) {
  if (!workspaceId || !adjustmentId) return null;
  return `/workspace/${workspaceId}/accounting/inventory/adjustments/${adjustmentId}`;
}

export function buildStockTransferUrl(workspaceId, transferId) {
  if (!workspaceId || !transferId) return null;
  return `/workspace/${workspaceId}/accounting/inventory/stock-transfers/${transferId}`;
}

/** Inventory activity / movement rows → source document edit or detail page. */
export function buildInventoryActivityDocumentUrl(workspaceId, row) {
  if (!workspaceId || !row?.document_kind || !row?.document_id) return null;

  switch (row.document_kind) {
    case 'invoice':
    case 'invoice_cancel':
      return buildInvoiceUrl(workspaceId, row.document_id);
    case 'bill':
    case 'bill_cancel':
      return buildBillUrl(workspaceId, row.document_id);
    case 'credit_note':
      return buildCreditNoteUrl(workspaceId, row.document_id);
    case 'stock_adjustment':
      return buildStockAdjustmentUrl(workspaceId, row.document_id);
    case 'stock_transfer':
    case 'transfer':
      return buildStockTransferUrl(workspaceId, row.document_id);
    default:
      return null;
  }
}

/** Parse internal GL reference into source document ids (mirrors backend JournalReferenceDisplay). */
function parseJournalReference(reference) {
  const ref = String(reference ?? '').trim();
  if (!ref) return {};

  let match = ref.match(/^INVCOGS(?:REV)?-(\d+)$/);
  if (match) return { invoiceId: Number(match[1]) };

  match = ref.match(/^INV(?:ADJ|REV|NETREV)?-(\d+)$/);
  if (match) return { invoiceId: Number(match[1]) };

  match = ref.match(/^BILL(?:ADJ|NETREV)?-(\d+)$/);
  if (match) return { billId: Number(match[1]) };

  match = ref.match(/^BILLREV-(?:CANCEL|DEL)-(\d+)-/);
  if (match) return { billId: Number(match[1]) };

  match = ref.match(/^PAY-(\d+)$/);
  if (match) return { paymentId: Number(match[1]) };

  match = ref.match(/^BP-(\d+)$/);
  if (match) return { billPaymentId: Number(match[1]) };

  match = ref.match(/^CN(?:COGS|COGSREV|REF)?-(\d+)/);
  if (match) return { creditNoteId: Number(match[1]) };

  match = ref.match(/^VC-(\d+)$/);
  if (match) return { vendorCreditId: Number(match[1]) };

  return {};
}

/** Resolve drill-down URL for general-ledger / account-statement journal lines. */
export function buildJournalLineSourceUrl(workspaceId, row) {
  if (!workspaceId || !row) return null;

  if (row.source_invoice_id) return buildInvoiceUrl(workspaceId, row.source_invoice_id);
  if (row.source_bill_id) return buildBillUrl(workspaceId, row.source_bill_id);
  if (row.source_payment_id) return buildCustomerPaymentUrl(workspaceId, row.source_payment_id);
  if (row.source_bill_payment_id) return buildBillPaymentUrl(workspaceId, row.source_bill_payment_id);
  if (row.source_credit_note_id) return buildCreditNoteUrl(workspaceId, row.source_credit_note_id);
  if (row.source_vendor_credit_id) return buildVendorCreditUrl(workspaceId, row.source_vendor_credit_id);

  const parsed = parseJournalReference(row.reference);
  if (parsed.invoiceId) return buildInvoiceUrl(workspaceId, parsed.invoiceId);
  if (parsed.billId) return buildBillUrl(workspaceId, parsed.billId);
  if (parsed.paymentId) return buildCustomerPaymentUrl(workspaceId, parsed.paymentId);
  if (parsed.billPaymentId) return buildBillPaymentUrl(workspaceId, parsed.billPaymentId);
  if (parsed.creditNoteId) return buildCreditNoteUrl(workspaceId, parsed.creditNoteId);
  if (parsed.vendorCreditId) return buildVendorCreditUrl(workspaceId, parsed.vendorCreditId);

  // Manual journals, opening balances, banking entries, expenses, payroll,
  // fixed assets, inventory adjustments, and other system postings may not
  // have a dedicated source-document resolver. Their journal entry is still
  // the authoritative and useful drill-down destination.
  return row.journal_entry_id
    ? buildJournalUrl(workspaceId, row.journal_entry_id)
    : null;
}

/** Resolve a drill-down URL for accounts-payable ledger rows. */
export function buildApLedgerRowUrl(workspaceId, row) {
  if (!workspaceId || !row) return null;
  const base = `/workspace/${workspaceId}/accounting`;

  if (row.bill_id) return `${base}/bills/${row.bill_id}/edit`;
  if (row.payment_id) return `${base}/bill-payments/${row.payment_id}`;
  if (row.vendor_credit_id) return `${base}/vendor-credits/${row.vendor_credit_id}`;

  if (row.entry_type === 'bill' && row.source_id) return `${base}/bills/${row.source_id}/edit`;
  if (row.entry_type === 'payment' && row.source_id) return `${base}/bill-payments/${row.source_id}`;
  if (row.entry_type === 'vendor_credit' && row.source_id) {
    return `${base}/vendor-credits/${row.source_id}`;
  }

  return null;
}

/** Resolve a drill-down URL for accounts-receivable / customer-ledger rows. */
export function buildArLedgerRowUrl(workspaceId, row) {
  if (!workspaceId || !row) return null;
  const base = `/workspace/${workspaceId}/accounting`;

  if (row.invoice_id) return `${base}/invoices/${row.invoice_id}/edit`;
  if (row.payment_id) return `${base}/payments/${row.payment_id}/edit`;
  if (row.credit_note_id) return `${base}/credit-notes/${row.credit_note_id}/edit`;

  if (row.entry_type === 'invoice' && row.source_id) return `${base}/invoices/${row.source_id}/edit`;
  if (row.entry_type === 'payment' && row.source_id) return `${base}/payments/${row.source_id}/edit`;
  if (row.entry_type === 'credit_note' && row.source_id) {
    return `${base}/credit-notes/${row.source_id}/edit`;
  }

  return null;
}