import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SourceDocumentBanner } from '@/components/accounting/SourceDocumentBanner';
import { JobOrderForm } from './components/JobOrderForm';
import { useJobOrderForm } from './hooks/useJobOrderForm';
import {
  CREATE_MAINTENANCE_JOB_TYPE,
  getCreateJobTypeMeta,
} from './constants';

export function JobOrderCreatePage() {
  const { id: workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/job-orders`;
  const fixedAssetId = searchParams.get('from_fixed_asset') || '';
  const initialJobType =
    searchParams.get('job_type') === CREATE_MAINTENANCE_JOB_TYPE
      ? CREATE_MAINTENANCE_JOB_TYPE
      : 'internal';
  const typeMeta = getCreateJobTypeMeta(initialJobType);

  const formProps = useJobOrderForm({
    mode: 'create',
    fixedAssetId: fixedAssetId || undefined,
    initialJobType,
    onSuccess: (created) => {
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={typeMeta.createTitle}
        subtitle={typeMeta.createSubtitle}
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
          accent="emerald"
        />
      ) : null}
      <div className="rounded-xl border bg-card shadow-sm p-6 sm:p-8">
        <JobOrderForm
          {...formProps}
          onSubmit={formProps.handleSubmit}
          onCancel={() => navigate(base)}
        />
      </div>
    </div>
  );
}
