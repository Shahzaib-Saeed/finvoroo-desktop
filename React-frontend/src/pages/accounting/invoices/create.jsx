import { lazy, Suspense } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { parseConversionSourceFromSearchParams } from '@/components/accounting/invoice-conversion';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoiceTemplateSelector } from './components/InvoiceTemplateSelector';
import { useInvoiceForm } from './hooks/useInvoiceForm';
import { useDashboardRefresh } from '@/pages/workspace/dashboard/DashboardRefreshContext';
import { resolveUiPack } from '@/industries';
import { useAuthStore } from '@/store/authStore';
import { pharmacyDispensePath } from '@/industries/pharmacy/paths';

const InvoiceSettingsDialog = lazy(() =>
  import('./components/InvoiceCreateSettingsDialog').then((m) => ({
    default: m.InvoiceSettingsDialog,
  })),
);

export function InvoiceCreatePage() {
  const { id: workspaceId } = useParams();
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSource = parseConversionSourceFromSearchParams(searchParams);
  const base = `/workspace/${workspaceId}/accounting/invoices`;

  const presetJobOrderId = searchParams.get('job_order_id') || '';
  const jobOrdersBase = `/workspace/${workspaceId}/accounting/job-orders`;

  const { triggerDashboardRefresh } = useDashboardRefresh();

  const invoiceForm = useInvoiceForm({
    mode: 'create',
    fromSource,
    onSuccess: (created, saveMode = 'view') => {
      triggerDashboardRefresh();
      const id = created?.id;
      if (!id) {
        navigate(base);
        return;
      }
      switch (saveMode) {
        case 'close':
          navigate(base);
          break;
        case 'job':
          if (presetJobOrderId) navigate(`${jobOrdersBase}/${presetJobOrderId}`);
          else navigate(`${base}/${id}`);
          break;
        case 'payment':
          navigate(`${base}/${id}?pay=1`);
          break;
        case 'print':
          navigate(`${base}/${id}?print=1`);
          break;
        case 'new':
          break;
        default:
          navigate(`${base}/${id}`);
      }
    },
  });

  if (resolveUiPack(activeCompany) === 'pharmacy' && !fromSource && !presetJobOrderId) {
    return <Navigate to={pharmacyDispensePath(workspaceId)} replace />;
  }

  return (
    <div className="space-y-4 w-full min-w-0 pb-2">
      <PageHeader
        title="Create Invoice"
        subtitle="Enter for next field · Ctrl+S save · Ctrl+Shift+S save & close · Ctrl+Enter save & new"
        actions={
          <div className="flex flex-wrap items-end justify-end gap-2">
            <Suspense
              fallback={
                <Button type="button" variant="outline" size="sm" disabled className="gap-1.5">
                  <Settings className="size-3.5" />
                  Settings
                </Button>
              }
            >
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
            </Suspense>
            <InvoiceTemplateSelector
              templates={invoiceForm.templates}
              value={invoiceForm.templateSelectValue ?? invoiceForm.form?.invoice_template_id}
              onValueChange={invoiceForm.setTemplateId}
              disabled={invoiceForm.postedLocked}
            />
          </div>
        }
      />

      <InvoiceForm
        {...invoiceForm}
        onSubmit={invoiceForm.handleSubmit}
        onCancel={() => navigate(base)}
      />
    </div>
  );
}
