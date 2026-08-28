import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FixedAssetForm } from './components/FixedAssetForm';
import { useFixedAssetForm } from './hooks/useFixedAssetForm';

export function FixedAssetCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/fixed-assets`;

  const formProps = useFixedAssetForm({
    mode: 'create',
    onSuccess: (created) => {
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Add fixed asset"
        subtitle="Record a new asset and post the purchase to accounting."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6">
        <FixedAssetForm
          {...formProps}
          onSubmit={formProps.handleSubmit}
          onCancel={() => navigate(base)}
        />
      </div>
    </div>
  );
}
