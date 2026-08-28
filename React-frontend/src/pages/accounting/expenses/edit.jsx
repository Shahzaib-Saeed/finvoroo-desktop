import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExpenseForm } from './components/ExpenseForm';
import { useExpenseForm } from './hooks/useExpenseForm';
import { useDashboardRefresh } from '@/pages/workspace/dashboard/DashboardRefreshContext';

export function ExpenseEditPage() {
  const { id: workspaceId, expenseId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/expenses`;

  const { triggerDashboardRefresh } = useDashboardRefresh();

  const formProps = useExpenseForm({
    mode: 'edit',
    expenseId,
    onSuccess: (updated) => {
      triggerDashboardRefresh();
      if (updated?.id) navigate(`${base}/${updated.id}`);
      else navigate(`${base}/${expenseId}`);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Edit expense"
        subtitle="Update expense details. Posted entries are re-posted to the ledger."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/${expenseId}`}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 max-w-3xl">
        <ExpenseForm
          {...formProps}
          onSubmit={formProps.handleSubmit}
          onCancel={() => navigate(`${base}/${expenseId}`)}
        />
      </div>
    </div>
  );
}
