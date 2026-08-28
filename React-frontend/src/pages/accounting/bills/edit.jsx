import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useDashboardRefresh } from '@/pages/workspace/dashboard/DashboardRefreshContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { billsApi } from './api/bills.api';
import { BillForm } from './components/BillForm';
import { useBillForm } from './hooks/useBillForm';
import { DocumentCreateRelatedDropdown } from '../components/DocumentCreateRelatedDropdown';
import { resolveUiPack } from '@/industries';
import { useAuthStore } from '@/store/authStore';
import { pharmacyPurchasePath } from '@/industries/pharmacy/paths';

export function BillEditPage() {
  const { id: workspaceId, billId } = useParams();
  const activeCompany = useAuthStore((s) => s.activeCompany);

  if (resolveUiPack(activeCompany) === 'pharmacy') {
    return <Navigate to={pharmacyPurchasePath(workspaceId, billId)} replace />;
  }

  return <UniversalBillEditPage workspaceId={workspaceId} billId={billId} />;
}

function UniversalBillEditPage({ workspaceId, billId }) {
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/bills`;

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    billsApi
      .show(billId)
      .then((res) => {
        if (!cancelled) setBill(res.data?.data || null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load bill');
        if (!cancelled) setBill(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [billId]);

  const { triggerDashboardRefresh } = useDashboardRefresh();

  const billForm = useBillForm({
    mode: 'edit',
    bill,
    onSuccess: () => {
      triggerDashboardRefresh();
      navigate(`${base}/${billId}`);
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Bill not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to bills
          </Link>
        </Button>
      </div>
    );
  }

  const flags = bill.flags || {};
  if (!flags.can_edit) {
    const message =
      bill.approval_status === 'pending'
        ? 'Cannot edit bill while it is pending approval.'
        : 'This bill cannot be edited.';
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">{message}</p>
        <Button asChild>
          <Link to={`${base}/${billId}`}>
            <ArrowLeft className="size-4 mr-1" /> View bill
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={`Edit ${bill.bill_number}`}
        subtitle={bill.vendor?.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DocumentCreateRelatedDropdown
              workspaceId={workspaceId}
              sourceType="bill"
              sourceId={billId}
              targets={[
                { target: 'quotation' },
                { target: 'sales_order' },
                { target: 'invoice' },
                { target: 'bill' },
                { target: 'purchase_order' },
              ]}
            />
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/${billId}`}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Link>
            </Button>
          </div>
        }
      />
      <BillForm
        {...billForm}
        isEdit
        onSubmit={billForm.handleSubmit}
        onCancel={() => navigate(`${base}/${billId}`)}
      />
    </div>
  );
}
