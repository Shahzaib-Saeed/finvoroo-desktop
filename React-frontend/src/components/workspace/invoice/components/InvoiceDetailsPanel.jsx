import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentAttachmentsReadOnly } from '@/components/accounting/DocumentAttachmentsSection';
import { invoicesApi } from '@/pages/accounting/invoices/api/invoices.api';
import { formatCurrency } from '@/pages/accounting/invoices/constants';
import { InvoiceDocument } from '@/pages/accounting/invoices/components/InvoiceDocument';
import { InvoicePrintDocument } from '@/pages/accounting/invoices/components/InvoicePrintDocument';
import {
  DISPLAY_DEFAULTS,
  buildCustomFieldSections,
  loadSectionOrderLocal,
  mergePrintDisplay,
  resolveSectionOrder,
} from '@/pages/accounting/invoices/invoice-print-display';
import { cn } from '@/lib/utils';
import { documentNumberLabel } from '@/pages/accounting/lib/documentNumber';

const statusColors = {
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  partial: 'bg-amber-50 text-amber-800 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  overdue: 'bg-red-50 text-red-800 border-red-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
};

const statusLabels = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export function InvoiceDetailsPanel({ invoiceId, workspaceId }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [display, setDisplay] = useState(DISPLAY_DEFAULTS);
  const [sectionOrder, setSectionOrder] = useState([]);

  const applyInvoice = useCallback((data) => {
    setInvoice(data);
    const merged = mergePrintDisplay(data?.print_display_settings);
    setDisplay(merged);
    const customSections = buildCustomFieldSections(data);
    const localOrder = loadSectionOrderLocal(data?.id);
    const order = localOrder?.length
      ? resolveSectionOrder(data, customSections, { ...merged, section_order: localOrder })
      : resolveSectionOrder(data, customSections, merged);
    setSectionOrder(order);
  }, []);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await invoicesApi.show(invoiceId);
      applyInvoice(res.data?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load invoice');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, applyInvoice]);

  useEffect(() => {
    setInvoice(null);
    fetchInvoice();
  }, [fetchInvoice]);

  const lineMeta = useMemo(() => {
    const lines = invoice?.lines || [];
    return {
      hasNotes: Boolean((invoice?.notes || '').trim()),
    };
  }, [invoice]);

  if (!invoiceId) return null;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-3 py-16 text-muted-foreground">
        <FileText className="size-10 opacity-50" />
        <p className="text-sm">Invoice not found</p>
      </div>
    );
  }

  const currency = invoice.currency || 'USD';
  const payments = invoice.payment_applications || [];

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="px-5 py-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">
                {documentNumberLabel(invoice.invoice_number)}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full font-normal capitalize',
                  statusColors[invoice.status] || statusColors.draft,
                )}
              >
                {statusLabels[invoice.status] || invoice.status}
              </Badge>
            </div>
            {invoice.customer?.name ? (
              <p className="text-sm text-muted-foreground mt-0.5">{invoice.customer.name}</p>
            ) : null}
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Total</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatCurrency(invoice.total, currency)}
            </p>
            {Number(invoice.balance_due) > 0 ? (
              <p className="text-xs text-amber-700 mt-0.5 tabular-nums">
                Balance due: {formatCurrency(invoice.balance_due, currency)}
              </p>
            ) : null}
          </div>
        </div>

        {['sent', 'partial', 'overdue'].includes(invoice.status) &&
        Number(invoice.balance_due) > 0 ? (
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-4 py-2.5 text-sm">
            <span className="font-medium text-amber-900">Balance due: </span>
            <span className="font-semibold tabular-nums text-amber-800">
              {formatCurrency(invoice.balance_due, currency)}
            </span>
            <span className="text-muted-foreground">
              {' '}
              — open the full invoice page to record payments or edit.
            </span>
          </div>
        ) : null}

        <div className="max-w-[800px] mx-auto w-full">
          <InvoiceDocument
            invoice={invoice}
            display={display}
            sectionOrder={sectionOrder}
            workspaceId={workspaceId}
          />
          <InvoicePrintDocument invoice={invoice} display={display} />
        </div>

        {payments.length > 0 ? (
          <div className="max-w-[800px] mx-auto w-full border-t pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Payments applied
            </p>
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between text-sm p-2.5 rounded-lg border bg-emerald-50/50"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                    {documentNumberLabel(p.receipt_number)}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(p.amount_applied, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="max-w-[800px] mx-auto w-full">
          <DocumentAttachmentsReadOnly
            documentType="invoice"
            documentId={invoice.id}
            attachments={invoice.attachments}
          />
        </div>

        {lineMeta.hasNotes && !display.show_notes ? (
          <p className="max-w-[800px] mx-auto text-xs text-amber-700">
            Notes exist but are hidden in print layout.
          </p>
        ) : null}
      </div>
    </ScrollArea>
  );
}
