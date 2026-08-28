import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { expensesApi } from './api/expenses.api';
import { ExpenseShowActions } from './components/ExpenseShowActions';
import { ExpenseShowDetail } from './components/ExpenseShowDetail';
import { ExpensePrintDocument } from './components/ExpensePrintDocument';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { printExpenseDocument } from '@/lib/print-expense';

export function ExpenseShowPage() {
  const { id: workspaceId, expenseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const base = `/workspace/${workspaceId}/accounting/expenses`;

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    expensesApi
      .show(expenseId)
      .then((res) => setExpense(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load expense');
        setExpense(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [expenseId]);

  useEffect(() => {
    if (searchParams.get('print') === '1' && expense && !loading) {
      const t = setTimeout(() => printExpenseDocument(), 400);
      return () => clearTimeout(t);
    }
  }, [expense, loading, searchParams]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await expensesApi.destroy(expenseId);
      toast.success(res.data?.message || 'Expense deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete expense');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Expense not found.</p>
        <Button asChild>
          <Link to={base}>Back to expenses</Link>
        </Button>
      </div>
    );
  }

  const flags = expense.flags || {};
  const canEdit = flags.can_edit !== false;
  const canDelete = flags.can_delete !== false;
  const title = expense.reference?.trim() || `Expense #${expense.id}`;
  const approval = expense.approval_status || 'approved';
  const subtitle = [
    expense.vendor?.name,
    expense.expense_date_display || expense.expense_date,
    approval !== 'approved' ? approval : null,
    expense.is_posted ? 'Posted' : 'Unposted',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-6 w-full min-w-0 print:space-y-4">
      <div className="print:hidden">
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={
            <ExpenseShowActions
              base={base}
              expenseId={expenseId}
              workspaceId={workspaceId}
              expense={expense}
              canEdit={canEdit}
              canDelete={canDelete}
              onDelete={() => setConfirmDelete(true)}
              onUpdated={load}
              busy={deleting}
            />
          }
        />
      </div>

      <div className="print:hidden">
        <ExpenseShowDetail expense={expense} workspaceId={workspaceId} />
      </div>

      <ExpensePrintDocument expense={expense} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete expense?"
        description="This removes the expense and reverses any posted journal entry. This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={deleting}
      />
    </div>
  );
}
