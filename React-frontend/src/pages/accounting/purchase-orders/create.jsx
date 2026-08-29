import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { parseConversionSourceFromSearchParams } from '@/components/accounting/invoice-conversion';
import { resolveIndustryFeatures } from '@/industries/resolve';
import { useAuthStore } from '@/store/authStore';
import { PurchaseOrderForm } from './components/PurchaseOrderForm';
import { usePurchaseOrderForm } from './hooks/usePurchaseOrderForm';

export function PurchaseOrderCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSource = parseConversionSourceFromSearchParams(searchParams);
  const base = `/workspace/${workspaceId}/accounting/purchase-orders`;
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const isPharmacy = !!resolveIndustryFeatures(activeCompany).pharmacy_shell;

  const poForm = usePurchaseOrderForm({
    mode: 'create',
    fromSource,
    onSuccess: (created) => {
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    },
  });

  const form = (
    <PurchaseOrderForm
      {...poForm}
      onSubmit={poForm.handleSubmit}
      onCancel={() => navigate(base)}
      backTo={base}
      pageTitle="Create purchase order"
      pageSubtitle={
        fromSource
          ? 'Review the pre-filled order, then save when ready.'
          : 'Choose a supplier, add medicines, then save the order.'
      }
    />
  );

  if (isPharmacy) {
    return <div className="w-full min-w-0">{form}</div>;
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Create purchase order"
        subtitle={
          fromSource
            ? 'Review the pre-filled purchase order from the source document, then save when ready.'
            : 'Order goods or services from a vendor before receiving a bill.'
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      {form}
    </div>
  );
}
