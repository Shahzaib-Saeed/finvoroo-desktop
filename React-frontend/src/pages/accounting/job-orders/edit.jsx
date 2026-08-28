import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { JobOrderForm } from './components/JobOrderForm';
import { useJobOrderForm } from './hooks/useJobOrderForm';

export function JobOrderEditPage() {
  const { id: workspaceId, jobOrderId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/job-orders`;

  const formProps = useJobOrderForm({
    mode: 'edit',
    jobOrderId,
    onSuccess: (updated) => {
      if (updated?.id) navigate(`${base}/${updated.id}`);
      else navigate(`${base}/${jobOrderId}`);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Edit job order"
        subtitle="Update job details, budget estimates, and assignment."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/${jobOrderId}`}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <div className="rounded-xl border bg-card shadow-sm p-6 sm:p-8">
        <JobOrderForm
          {...formProps}
          onSubmit={formProps.handleSubmit}
          onCancel={() => navigate(`${base}/${jobOrderId}`)}
        />
      </div>
    </div>
  );
}
