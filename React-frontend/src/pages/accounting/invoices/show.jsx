import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  CreditCard,
  Edit3,
  Trash2,
  Send,
  Loader2,
  FileText,
  XCircle,
  ExternalLink,
  CheckCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { DocumentCreateRelatedDropdown } from '../components/DocumentCreateRelatedDropdown';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { invoicesApi } from './api/invoices.api';
import { DocumentAttachmentsReadOnly } from '@/components/accounting/DocumentAttachmentsSection';
import { formatCurrency } from './constants';
import { PaymentReceiveDialog } from '../payments/components/PaymentReceiveDialog';
import { InvoiceDocument } from './components/InvoiceDocument';
import { InvoicePrintDocument } from './components/InvoicePrintDocument';
import { InvoiceAppearancePanel } from './components/InvoiceAppearancePanel';
import {
  DISPLAY_DEFAULTS,
  loadSectionOrderLocal,
  mergePrintDisplay,
  resolveSectionOrder,
  sanitizePrintDisplayForSave,
  saveSectionOrderLocal,
  buildCustomFieldSections,
} from './invoice-print-display';
import { printInvoiceDocument, printThermalReceipt, saveInvoicePdf } from '@/lib/print-invoice';
import { DocumentPrintMenu } from '@/pages/accounting/document-output/components/DocumentPrintMenu';
import {
  ThermalReceiptBody,
  thermalReceiptFromInvoice,
} from '@/pages/accounting/document-output/components/ThermalReceiptBody';
import { cn } from '@/lib/utils';
import { documentNumberLabel } from '@/pages/accounting/lib/documentNumber';
import { resolveUiPack } from '@/industries';
import { useAuthStore } from '@/store/authStore';

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

export function InvoiceShowPage() {
  const { id: workspaceId, invoiceId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const base = `/workspace/${workspaceId}/accounting/invoices`;
  const salesOrderBase = `/workspace/${workspaceId}/accounting/sales-orders`;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [display, setDisplay] = useState(DISPLAY_DEFAULTS);
  const [sectionOrder, setSectionOrder] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingDisplay, setSavingDisplay] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [thermalPaper, setThermalPaper] = useState('thermal_80');
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const isPharmacy = resolveUiPack(activeCompany) === 'pharmacy';

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

  const fetchInvoice = async () => {
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
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  useEffect(() => {
    if (searchParams.get('pay') === '1' && invoice) {
      setPaymentOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, invoice, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('print') !== '1' || !invoice || loading) return;
    const t = window.setTimeout(() => printInvoiceDocument({ paper: 'a4' }), 400);
    setSearchParams({}, { replace: true });
    return () => window.clearTimeout(t);
  }, [searchParams, invoice, loading, setSearchParams]);

  const handleSectionOrderChange = (order) => {
    setSectionOrder(order);
    if (invoice?.id) {
      saveSectionOrderLocal(invoice.id, order);
    }
  };

  const handleSaveDisplay = async () => {
    setSavingDisplay(true);
    try {
      const payload = sanitizePrintDisplayForSave({
        ...display,
        section_order: sectionOrder,
      });
      const res = await invoicesApi.updatePrintDisplay(invoiceId, payload);
      const saved = res.data?.data?.print_display_settings;
      if (saved) {
        setDisplay(mergePrintDisplay(saved));
        setInvoice((prev) =>
          prev ? { ...prev, print_display_settings: saved } : prev,
        );
      }
      toast.success('Invoice appearance saved for print and PDF');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save appearance');
    } finally {
      setSavingDisplay(false);
    }
  };

  const handleResetDisplay = async () => {
    const defaults = structuredClone(DISPLAY_DEFAULTS);
    setDisplay(defaults);
    const customSections = invoice ? buildCustomFieldSections(invoice) : [];
    const order = invoice
      ? resolveSectionOrder(invoice, customSections, defaults)
      : [];
    setSectionOrder(order);
    if (invoice?.id) {
      saveSectionOrderLocal(invoice.id, order);
    }
    setSavingDisplay(true);
    try {
      await invoicesApi.updatePrintDisplay(invoiceId, sanitizePrintDisplayForSave(defaults));
      toast.success('Appearance reset to defaults');
      fetchInvoice();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not reset appearance');
    } finally {
      setSavingDisplay(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await invoicesApi.delete(invoiceId);
      toast.success('Invoice deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      const res = await invoicesApi.cancel(invoiceId);
      toast.success(res?.data?.message || 'Invoice cancelled');
      setConfirmCancel(false);
      fetchInvoice();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel invoice');
    } finally {
      setBusy(false);
    }
  };

  const handlePost = async () => {
    setBusy(true);
    try {
      const res = await invoicesApi.post(invoiceId);
      toast.success(res?.data?.message || 'Invoice posted');
      fetchInvoice();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to post invoice');
    } finally {
      setBusy(false);
    }
  };

  const lineMeta = useMemo(() => {
    const lines = invoice?.lines || [];
    return {
      anyLineDiscount: lines.some((l) => Number(l.discount) > 0.0001),
      anyLineTax: lines.some(
        (l) => Number(l.tax_amount) > 0.0001 || Number(l.sale_tax_amount) > 0.0001,
      ),
      hasNotes: Boolean((invoice?.notes || '').trim()),
    };
  }, [invoice]);

  const thermalReceiptProps = useMemo(() => {
    if (!invoice) return null;
    const widthMm = thermalPaper === 'thermal_58' ? 58 : 80;
    return thermalReceiptFromInvoice(invoice, { widthMm });
  }, [invoice, thermalPaper]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FileText className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground">Invoice not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to Invoices
          </Link>
        </Button>
      </div>
    );
  }

  const currency = invoice.currency || 'USD';
  const payments = invoice.payment_applications || [];
  const flags = invoice.flags || {};
  const canPay = flags.can_record_payment;
  const canDelete = flags.can_delete;
  const canCancel = flags.can_cancel;
  const canPost = flags.can_post;
  const canEdit = flags.can_edit !== false;
  const conversionTargets = flags.conversion_targets || [];
  const docLabel = isPharmacy ? 'Receipt' : 'Invoice';

  return (
    <div className="space-y-4 w-full min-w-0 print:space-y-2">
      {invoice.sales_order ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 print:hidden">
          <p className="text-sm text-violet-900">
            <span className="font-medium">From sales order</span>{' '}
            <Link
              to={`${salesOrderBase}/${invoice.sales_order.id}`}
              className="inline-flex items-center gap-1 font-semibold text-violet-700 hover:underline"
            >
              {invoice.sales_order.so_number || `SO-${invoice.sales_order.id}`}
              <ExternalLink className="size-3.5" />
            </Link>
          </p>
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to={base} className="hover:text-foreground">
              Invoices
            </Link>
            <span>/</span>
            <span>{invoice.invoice_number}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">
              {docLabel} {invoice.invoice_number}
            </h1>
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

        <div className="flex flex-wrap items-center gap-2">
          {!isPharmacy ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAppearanceOpen(true)}
            >
              <SlidersHorizontal className="size-4 mr-1" /> Appearance
            </Button>
          ) : null}
          <DocumentPrintMenu
            documentType="invoice"
            documentId={invoiceId}
            permission="invoices.print"
            onScreenPrint={async ({ paper, mode }) => {
              if (mode === 'pdf') {
                await saveInvoicePdf({
                  paper,
                  filename: `invoice-${invoice.invoice_number || invoiceId}.pdf`,
                });
                return;
              }
              printInvoiceDocument({ paper });
              toast.success('Print dialog opened');
            }}
            onThermalPrint={async ({ paper }) => {
              setThermalPaper(paper || 'thermal_80');
              await new Promise((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
              });
              printThermalReceipt({ elementId: 'invoice-thermal-print', paper });
            }}
            onLegacyPrint={() => printInvoiceDocument({ paper: 'a4' })}
          />
          {canPost ? (
            <Button variant="outline" size="sm" onClick={handlePost} disabled={busy}>
              <Send className="size-4 mr-1" /> Post
            </Button>
          ) : null}
          {canPay ? (
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              <CreditCard className="size-4 mr-1" /> Record payment
            </Button>
          ) : null}
          <DocumentCreateRelatedDropdown
            workspaceId={workspaceId}
            sourceType="invoice"
            sourceId={invoiceId}
            targets={conversionTargets}
          />
          {canEdit ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/${invoiceId}/edit`}>
                <Edit3 className="size-4 mr-1" /> Edit
              </Link>
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-600"
              onClick={() => setConfirmCancel(true)}
            >
              <XCircle className="size-4 mr-1" /> Cancel
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4 mr-1" /> Delete
            </Button>
          ) : null}
        </div>
      </div>

      {['sent', 'partial', 'overdue'].includes(invoice.status) &&
      Number(invoice.balance_due) > 0 ? (
        <div
          className={cn(
            'rounded-lg border px-4 py-2.5 text-sm print:hidden',
            'flex flex-wrap items-center gap-2',
            'border-amber-200/80 bg-amber-50/50',
          )}
        >
          <span className="font-medium text-amber-900">Balance due:</span>
          <span className="font-semibold tabular-nums text-amber-800">
            {formatCurrency(invoice.balance_due, currency)}
          </span>
          <span className="text-muted-foreground">— use Record payment when paid.</span>
        </div>
      ) : null}

      <div className="min-w-0 space-y-4">
        {isPharmacy && thermalReceiptProps ? (
          <div className="print:hidden mx-auto w-fit max-w-full">
            <ThermalReceiptBody {...thermalReceiptProps} preview />
            {payments.length > 0 ? (
              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Payments applied
                </p>
                <div className="space-y-2">
                  {payments.map((p) => {
                    const cash = Number(p.amount_applied) || 0;
                    const discount = Number(p.settlement_discount) || 0;
                    const hasDiscount = discount > 0.0001;
                    return (
                      <div
                        key={p.id}
                        className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0"
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex items-center gap-2">
                            <CheckCircle className="size-4 shrink-0 text-emerald-600" />
                            {p.payment_id ? (
                              <Link
                                to={`/workspace/${workspaceId}/accounting/payments/${p.payment_id}`}
                                className="font-medium hover:underline"
                              >
                                {documentNumberLabel(p.receipt_number)}
                              </Link>
                            ) : (
                              <span>{documentNumberLabel(p.receipt_number)}</span>
                            )}
                          </span>
                          {hasDiscount ? (
                            <span className="pl-6 text-[11px] text-muted-foreground">
                              Cash {formatCurrency(cash, currency)}
                              {' · '}
                              Settlement discount {formatCurrency(discount, currency)}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatCurrency(hasDiscount ? cash + discount : cash, currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {Number(invoice.settlement_discount_total) > 0.0001 ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Settlement discount on this receipt:{' '}
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCurrency(invoice.settlement_discount_total, currency)}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto w-full">
            <InvoiceDocument
              invoice={invoice}
              display={display}
              sectionOrder={sectionOrder}
              workspaceId={workspaceId}
            />
          </div>
        )}

        <div className={cn(isPharmacy && 'hidden print:block max-w-[800px] mx-auto w-full')}>
          {!isPharmacy ? null : (
            <InvoiceDocument
              invoice={invoice}
              display={display}
              sectionOrder={sectionOrder}
              workspaceId={workspaceId}
            />
          )}
        </div>

        {!isPharmacy ? (
          <div className="max-w-[800px] mx-auto w-full">
            <InvoicePrintDocument invoice={invoice} display={display} />
          </div>
        ) : (
          <div className="hidden">
            <InvoicePrintDocument invoice={invoice} display={display} />
          </div>
        )}
        {thermalReceiptProps ? (
          <div id="invoice-thermal-print" className="hidden" aria-hidden="true">
            <ThermalReceiptBody {...thermalReceiptProps} />
          </div>
        ) : null}

        {!isPharmacy && payments.length > 0 ? (
          <div className="max-w-[800px] mx-auto w-full border-t pt-4 print:hidden">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Payments applied
            </p>
            <div className="space-y-2">
              {payments.map((p) => {
                const cash = Number(p.amount_applied) || 0;
                const discount = Number(p.settlement_discount) || 0;
                const hasDiscount = discount > 0.0001;
                return (
                  <div
                    key={p.id}
                    className="flex justify-between gap-3 text-sm p-2.5 rounded-lg border bg-emerald-50/50"
                  >
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                        {p.payment_id ? (
                          <Link
                            to={`/workspace/${workspaceId}/accounting/payments/${p.payment_id}`}
                            className="font-medium hover:underline"
                          >
                            {documentNumberLabel(p.receipt_number)}
                          </Link>
                        ) : (
                          <span>{documentNumberLabel(p.receipt_number)}</span>
                        )}
                      </span>
                      {hasDiscount ? (
                        <span className="pl-6 text-[11px] text-muted-foreground">
                          Cash {formatCurrency(cash, currency)}
                          {' · '}
                          Settlement discount {formatCurrency(discount, currency)}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-medium tabular-nums shrink-0 text-right">
                      {formatCurrency(hasDiscount ? cash + discount : cash, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
            {Number(invoice.settlement_discount_total) > 0.0001 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Settlement discount on this invoice:{' '}
                <span className="font-medium tabular-nums text-foreground">
                  {formatCurrency(invoice.settlement_discount_total, currency)}
                </span>
                {' '}(write-off at receipt — not cash received)
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            'mx-auto w-full print:hidden mt-4',
            isPharmacy ? 'max-w-full w-fit' : 'max-w-[800px]',
          )}
        >
          <DocumentAttachmentsReadOnly
            documentType="invoice"
            documentId={invoice.id}
            attachments={invoice.attachments}
          />
        </div>

        {lineMeta.hasNotes && !display.show_notes ? (
          <p className="max-w-[800px] mx-auto text-xs text-amber-700 print:hidden">
            Notes exist but are hidden — enable Notes in Invoice appearance.
          </p>
        ) : null}
      </div>

      <Sheet open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 gap-0 print:hidden"
        >
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              Invoice appearance
            </SheetTitle>
          </SheetHeader>
          <SheetBody className="p-0 overflow-y-auto">
            <InvoiceAppearancePanel
              invoice={invoice}
              display={display}
              onDisplayChange={setDisplay}
              sectionOrder={sectionOrder}
              onSectionOrderChange={handleSectionOrderChange}
              onSave={handleSaveDisplay}
              onReset={handleResetDisplay}
              saving={savingDisplay}
              canSave
              hasNotes={lineMeta.hasNotes}
              anyLineDiscount={lineMeta.anyLineDiscount}
              anyLineTax={lineMeta.anyLineTax}
              sticky={false}
              className="border-0 shadow-none rounded-none"
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete invoice?"
        description={
          invoice.is_posted
            ? `Permanently delete invoice ${invoice.invoice_number}? The posted journal entry will be reversed and inventory restored.`
            : `Permanently delete invoice ${invoice.invoice_number}? This cannot be undone.`
        }
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={busy}
      />

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel invoice?"
        description={`Cancel invoice ${invoice.invoice_number}?`}
        confirmLabel="Cancel invoice"
        confirmVariant="destructive"
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
        isLoading={busy}
      />

      <PaymentReceiveDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        workspaceId={workspaceId}
        initialInvoice={invoice}
        onSuccess={fetchInvoice}
      />
    </div>
  );
}
