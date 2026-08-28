import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { CustomerForm } from './components/CustomerForm';

export function CustomerCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/customers`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Customer"
        subtitle="Add a new customer with contact, billing, and optional financial settings."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back to Customers
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-6">
        <CustomerForm
          variant="page"
          onCancel={() => navigate(base)}
          onSuccess={(created) => {
            const id = created?.id;
            if (id) navigate(`${base}/${id}`);
            else navigate(base);
          }}
        />
      </div>
    </div>
  );
}
