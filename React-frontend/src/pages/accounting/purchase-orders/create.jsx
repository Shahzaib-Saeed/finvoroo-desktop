import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { parseConversionSourceFromSearchParams } from '@/components/accounting/invoice-conversion';
import { PurchaseOrderForm } from './components/PurchaseOrderForm';
import { usePurchaseOrderForm } from './hooks/usePurchaseOrderForm';

export function PurchaseOrderCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSource = parseConversionSourceFromSearchParams(searchParams);
  const base = `/workspace/${workspaceId}/accounting/purchase-orders`;

  const poForm = usePurchaseOrderForm({
    mode: 'create',
    fromSource,
    onSuccess: (created) => {
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    },
  });

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
      <PurchaseOrderForm
        {...poForm}
        onSubmit={poForm.handleSubmit}
        onCancel={() => navigate(base)}
      />
    </div>
  );
}
