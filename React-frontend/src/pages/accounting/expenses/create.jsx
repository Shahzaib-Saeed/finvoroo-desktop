import { Link, useNavigate, useParams } from 'react-router';
import { Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExpenseForm } from './components/ExpenseForm';
import { useExpenseForm } from './hooks/useExpenseForm';
import { useDashboardRefresh } from '@/pages/workspace/dashboard/DashboardRefreshContext';
import { resolveUiPack } from '@/industries';
import { pharmacyExpensesPath } from '@/industries/pharmacy/paths';
import { useAuthStore } from '@/store/authStore';

function UniversalExpenseCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/expenses`;

  const { triggerDashboardRefresh } = useDashboardRefresh();

  const formProps = useExpenseForm({
    onSuccess: (created) => {
      triggerDashboardRefresh();
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Add expense"
        subtitle="Record an expense and post it to accounting."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 max-w-3xl">
        <ExpenseForm
          {...formProps}
          onSubmit={formProps.handleSubmit}
          onCancel={() => navigate(base)}
        />
      </div>
    </div>
  );
}

export function ExpenseCreatePage() {
  const { id: workspaceId } = useParams();
  const activeCompany = useAuthStore((s) => s.activeCompany);

  if (resolveUiPack(activeCompany) === 'pharmacy') {
    return <Navigate to={pharmacyExpensesPath(workspaceId, { create: true })} replace />;
  }

  return <UniversalExpenseCreatePage />;
}
