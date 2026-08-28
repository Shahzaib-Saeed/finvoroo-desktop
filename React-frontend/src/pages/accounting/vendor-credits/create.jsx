import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { VendorCreditForm } from './components/VendorCreditForm';
import { useVendorCreditForm } from './hooks/useVendorCreditForm';

export function VendorCreditCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/vendor-credits`;

  const vcForm = useVendorCreditForm({
    mode: 'create',
    onSuccess: (created) => {
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Create debit note"
        subtitle="Record a return or adjustment; use a single amount or returned line items."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <VendorCreditForm
        {...vcForm}
        canCreateVendor={vcForm.lookups?.can_create_vendor}
        onSubmit={vcForm.handleSubmit}
        onCancel={() => navigate(base)}
      />
    </div>
  );
}
