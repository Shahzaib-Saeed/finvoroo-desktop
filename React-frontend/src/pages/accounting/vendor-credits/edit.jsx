import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { vendorCreditsApi } from './api/vendor-credits.api';
import { VendorCreditForm } from './components/VendorCreditForm';
import { useVendorCreditForm } from './hooks/useVendorCreditForm';

export function VendorCreditEditPage() {
  const { id: workspaceId, vendorCreditId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/vendor-credits`;

  const [vendorCredit, setVendorCredit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    vendorCreditsApi
      .show(vendorCreditId)
      .then((res) => {
        if (!cancelled) setVendorCredit(res.data?.data || null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load vendor credit');
        if (!cancelled) setVendorCredit(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendorCreditId]);

  const formProps = useVendorCreditForm({
    mode: 'edit',
    vendorCredit,
    onSuccess: () => navigate(`${base}/${vendorCreditId}`),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendorCredit) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Vendor credit not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back
          </Link>
        </Button>
      </div>
    );
  }

  if (vendorCredit.flags?.can_edit === false) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">
          This vendor credit is pending approval and can't be edited until it's approved or rejected.
        </p>
        <Button asChild>
          <Link to={`${base}/${vendorCreditId}`}>View vendor credit</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={`Edit ${vendorCredit.credit_number}`}
        subtitle={vendorCredit.vendor?.name}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/${vendorCreditId}`}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <VendorCreditForm
        {...formProps}
        isEdit
        canCreateVendor={formProps.lookups?.can_create_vendor}
        onSubmit={formProps.handleSubmit}
        onCancel={() => navigate(`${base}/${vendorCreditId}`)}
      />
    </div>
  );
}
