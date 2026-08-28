import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { VendorForm } from './components/VendorForm';

export function VendorCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/vendors`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Vendor"
        subtitle="Create a new vendor with profile, accounting defaults, and address."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back to Vendors
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-6">
        <VendorForm
          variant="page"
          onCancel={() => navigate(base)}
          onSuccess={() => navigate(base)}
        />
      </div>
    </div>
  );
}
