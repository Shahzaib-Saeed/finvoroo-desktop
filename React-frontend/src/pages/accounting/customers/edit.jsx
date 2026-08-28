import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { customersApi } from './api/customers.api';
import { CustomerForm } from './components/CustomerForm';

export function CustomerEditPage() {
  const { id: workspaceId, customerId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/customers`;

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    customersApi
      .show(customerId)
      .then((res) => {
        if (!cancelled) setCustomer(res.data?.data || null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load customer');
        if (!cancelled) setCustomer(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4 text-center py-16">
        <p className="text-muted-foreground">Customer not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to Customers
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${customer.name}`}
        subtitle={customer.customer_code ? `Code: ${customer.customer_code}` : undefined}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/${customerId}`}>
              <ArrowLeft className="size-4 mr-1" /> Back to Wallet
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-6">
        <CustomerForm
          variant="page"
          customer={customer}
          customerId={customerId}
          onCancel={() => navigate(`${base}/${customerId}`)}
          onSuccess={() => navigate(`${base}/${customerId}`)}
        />
      </div>
    </div>
  );
}
