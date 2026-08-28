import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { RecurringExpenseForm } from '../expenses/components/RecurringExpenseForm';
import { useRecurringExpenseForm } from '../expenses/hooks/useRecurringExpenseForm';

export function RecurringExpenseEditPage() {
  const { id: workspaceId, recurringId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/recurring-expenses`;

  const formProps = useRecurringExpenseForm({
    mode: 'edit',
    recurringId,
    onSuccess: () => navigate(base),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Edit recurring expense"
        subtitle="Update schedule, accounts, or pause the template."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 max-w-3xl">
        <RecurringExpenseForm
          {...formProps}
          onSubmit={formProps.handleSubmit}
          onCancel={() => navigate(base)}
        />
      </div>
    </div>
  );
}
