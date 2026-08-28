import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { parseConversionSourceFromSearchParams } from '@/components/accounting/invoice-conversion';
import { SalesOrderForm } from './components/SalesOrderForm';
import { useSalesOrderForm } from './hooks/useSalesOrderForm';

export function SalesOrderCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSource = parseConversionSourceFromSearchParams(searchParams);
  const base = `/workspace/${workspaceId}/accounting/sales-orders`;

  const salesOrderForm = useSalesOrderForm({
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
        title="Create sales order"
        subtitle={
          fromSource
            ? 'Review the pre-filled sales order from the source document, then save when ready.'
            : 'Confirm customer order details before invoicing or fulfillment.'
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <SalesOrderForm
        {...salesOrderForm}
        onSubmit={salesOrderForm.handleSubmit}
        onCancel={() => navigate(base)}
      />
    </div>
  );
}
