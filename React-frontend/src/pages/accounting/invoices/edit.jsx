import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useDashboardRefresh } from '@/pages/workspace/dashboard/DashboardRefreshContext';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { invoicesApi } from './api/invoices.api';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoiceSettingsDialog } from './components/InvoiceCreateSettingsDialog';
import { InvoiceTemplateSelector } from './components/InvoiceTemplateSelector';
import { useInvoiceForm } from './hooks/useInvoiceForm';
import { DocumentCreateRelatedDropdown } from '../components/DocumentCreateRelatedDropdown';

function InvoiceEditLoaded({ invoice, invoiceId, workspaceId, base }) {
  const navigate = useNavigate();
  const { triggerDashboardRefresh } = useDashboardRefresh();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const invoiceForm = useInvoiceForm({
    mode: 'edit',
    invoiceId,
    invoice,
    onSuccess: (_saved, saveMode = 'view') => {
      triggerDashboardRefresh();
      switch (saveMode) {
        case 'close':
          navigate(base);
          break;
        case 'new':
          navigate(`${base}/create`);
          break;
        case 'payment':
          navigate(`${base}/${invoiceId}?pay=1`);
          break;
        default:
          navigate(`${base}/${invoiceId}`);
      }
    },
  });

  const canDelete = Boolean(invoice?.flags?.can_delete ?? invoice?.can_delete);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await invoicesApi.delete(invoiceId);
      toast.success('Invoice deleted');
      triggerDashboardRefresh();
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={`Edit ${invoice.invoice_number}`}
        subtitle={invoice.customer?.name}
        actions={
          <div className="flex flex-wrap items-end justify-end gap-2">
            <InvoiceSettingsDialog
              company={invoiceForm.lookups?.company}
              autoPostEnabled={invoiceForm.autoPostEnabled}
              invoiceBillingMode={invoiceForm.lookups?.company?.invoice_billing_mode}
              selectedTemplate={invoiceForm.selectedTemplate}
              templateId={invoiceForm.form?.invoice_template_id}
              invoiceNotes={invoiceForm.form?.notes}
              disabled={invoiceForm.postedLocked || invoiceForm.loadingLookups}
              onSaved={invoiceForm.patchInvoiceSettings}
              onApplyToInvoice={(notes) => invoiceForm.setField('notes', notes)}
              onTemplateFooterUpdated={invoiceForm.refreshTemplateFooter}
            />
            <InvoiceTemplateSelector
              templates={invoiceForm.templates}
              value={invoiceForm.templateSelectValue ?? invoiceForm.form?.invoice_template_id}
              onValueChange={invoiceForm.setTemplateId}
              disabled={invoiceForm.postedLocked}
            />
            {canDelete ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4 mr-1" />
                Delete
              </Button>
            ) : null}
            <DocumentCreateRelatedDropdown
              workspaceId={workspaceId}
              sourceType="invoice"
              sourceId={invoiceId}
              targets={[
                { target: 'quotation' },
                { target: 'sales_order' },
                { target: 'invoice' },
                { target: 'bill' },
                { target: 'purchase_order' },
              ]}
            />
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/${invoiceId}`}>
                <ArrowLeft className="size-4 mr-1" /> Back to invoice
              </Link>
            </Button>
          </div>
        }
      />

      <InvoiceForm
        {...invoiceForm}
        onSubmit={invoiceForm.handleSubmit}
        onCancel={() => navigate(`${base}/${invoiceId}`)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete invoice?"
        description={
          invoice.is_posted || invoice.journal_entry_id
            ? `Permanently delete invoice ${invoice.invoice_number}? The posted journal entry will be reversed and inventory restored.`
            : `Permanently delete invoice ${invoice.invoice_number}? This cannot be undone.`
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={isDeleting}
      />
    </div>
  );
}

export function InvoiceEditPage() {
  const { id: workspaceId, invoiceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/invoices`;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    invoicesApi
      .show(invoiceId)
      .then((res) => {
        if (!cancelled) setInvoice(res.data?.data || null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load invoice');
        if (!cancelled) setInvoice(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to Invoices
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <InvoiceEditLoaded
      invoice={invoice}
      invoiceId={invoiceId}
      workspaceId={workspaceId}
      base={base}
    />
  );
}
