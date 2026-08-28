import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDashboardRefresh } from '@/pages/workspace/dashboard/DashboardRefreshContext';
import { parseConversionSourceFromSearchParams } from '@/components/accounting/invoice-conversion';
import { BillForm } from './components/BillForm';
import { BillTemplateSelector } from './components/BillTemplateSelector';
import { useBillForm } from './hooks/useBillForm';
import { resolveUiPack } from '@/industries';
import { useAuthStore } from '@/store/authStore';
import { pharmacyPurchasePath } from '@/industries/pharmacy/paths';

export function BillCreatePage() {
  const { id: workspaceId } = useParams();
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSource = parseConversionSourceFromSearchParams(searchParams);
  const base = `/workspace/${workspaceId}/accounting/bills`;
  const presetJobOrderId = searchParams.get('job_order_id') || '';

  const { triggerDashboardRefresh } = useDashboardRefresh();

  const billForm = useBillForm({
    mode: 'create',
    fromSource,
    onSuccess: (created) => {
      triggerDashboardRefresh();
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    },
  });

  if (resolveUiPack(activeCompany) === 'pharmacy' && !fromSource) {
    return <Navigate to={pharmacyPurchasePath(workspaceId)} replace />;
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Create bill"
        subtitle={
          fromSource
            ? 'Review the pre-filled bill from the source document, then save when ready.'
            : presetJobOrderId
              ? 'This bill is linked to the job order below. Add vendor lines and save to count costs toward job profitability.'
              : 'Enter a vendor bill with line items; stock is received when posted.'
        }
        actions={
          <BillTemplateSelector
            templates={billForm.templates}
            value={billForm.templateSelectValue}
            formTemplateId={billForm.form?.invoice_template_id}
            onChange={billForm.setTemplateId}
            workspaceId={workspaceId}
          />
        }
      />
      <BillForm
        {...billForm}
        hideTemplateToolbar
        onSubmit={billForm.handleSubmit}
        onCancel={() => navigate(base)}
      />
    </div>
  );
}
