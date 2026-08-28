import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SourceDocumentBanner } from '@/components/accounting/SourceDocumentBanner';
import { ProductionOrderForm } from './components/ProductionOrderForm';
import { useProductionOrderForm } from './hooks/useProductionOrderForm';

export function ProductionOrderCreatePage() {
  const { id: workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/production-orders`;
  const salesOrderId = searchParams.get('from_sales_order') || '';
  const salesOrderLineId = searchParams.get('sales_order_line_id') || '';

  const formProps = useProductionOrderForm({
    mode: 'create',
    salesOrderId: salesOrderId || undefined,
    salesOrderLineId: salesOrderLineId || undefined,
    onSuccess: (created) => {
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Create production order"
        subtitle="Confirm output, materials, and costs before manufacturing begins."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      {formProps.conversionSource ? (
        <SourceDocumentBanner
          source={formProps.conversionSource}
          workspaceId={workspaceId}
          accent="blue"
        />
      ) : null}
      <ProductionOrderForm
        {...formProps}
        onSubmit={formProps.handleSubmit}
        onCancel={() => navigate(base)}
      />
    </div>
  );
}
