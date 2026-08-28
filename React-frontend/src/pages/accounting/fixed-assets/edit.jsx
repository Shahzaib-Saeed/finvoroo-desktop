import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FixedAssetForm } from './components/FixedAssetForm';
import { useFixedAssetForm } from './hooks/useFixedAssetForm';

export function FixedAssetEditPage() {
  const { id: workspaceId, assetId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/fixed-assets`;

  const formProps = useFixedAssetForm({
    mode: 'edit',
    assetId,
    onSuccess: (updated) => {
      if (updated?.id) navigate(`${base}/${updated.id}`);
      else navigate(`${base}/${assetId}`);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Edit fixed asset"
        subtitle="Update asset details. Changing purchase cost posts an FA-ADJ journal entry."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/${assetId}`}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6">
        <FixedAssetForm
          {...formProps}
          onSubmit={formProps.handleSubmit}
          onCancel={() => navigate(`${base}/${assetId}`)}
        />
      </div>
    </div>
  );
}
