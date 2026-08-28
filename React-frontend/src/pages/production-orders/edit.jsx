import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProductionOrderForm } from './components/ProductionOrderForm';
import { useProductionOrderForm } from './hooks/useProductionOrderForm';

export function ProductionOrderEditPage() {
  const { id: workspaceId, orderId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/production-orders`;

  const formProps = useProductionOrderForm({
    mode: 'edit',
    orderId,
    onSuccess: (updated) => {
      if (updated?.id) navigate(`${base}/${updated.id}`);
      else navigate(`${base}/${orderId}`);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Edit production order"
        subtitle="Update order details, materials, and costs."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/${orderId}`}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <ProductionOrderForm
        {...formProps}
        onSubmit={formProps.handleSubmit}
        onCancel={() => navigate(`${base}/${orderId}`)}
      />
    </div>
  );
}
