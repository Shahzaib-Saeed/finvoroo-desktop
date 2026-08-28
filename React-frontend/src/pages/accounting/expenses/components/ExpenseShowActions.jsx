import { Link } from 'react-router';
import { ArrowLeft, Briefcase, Edit3, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApprovalActions } from './ApprovalActions';
import { printExpenseDocument } from '@/lib/print-expense';
import { cn } from '@/lib/utils';

function ToolbarDivider() {
  return <div className="hidden sm:block w-px h-6 bg-border shrink-0" aria-hidden />;
}

export function ExpenseShowActions({
  base,
  expenseId,
  workspaceId,
  expense,
  canEdit,
  canDelete,
  onDelete,
  onUpdated,
  busy = false,
}) {
  const jobOrderBase = `/workspace/${workspaceId}/accounting/job-orders`;
  const hasJob = Boolean(expense?.job_order?.id);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link to={base}>
          <ArrowLeft className="size-4 mr-1" /> Back
        </Link>
      </Button>

      <ApprovalActions
        type="expense"
        recordId={expense?.id}
        status={expense?.approval_status}
        onUpdated={onUpdated}
      />

      {(canEdit || hasJob) && <ToolbarDivider />}

      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={busy}
          className="border-sky-200 bg-sky-50/50 text-sky-800 hover:bg-sky-100 hover:text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/70"
        >
          <Link to={`${base}/${expenseId}/edit`}>
            <Edit3 className="size-4 mr-1" /> Edit
          </Link>
        </Button>
      )}

      {hasJob && (
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-violet-200 bg-violet-50/50 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
        >
          <Link to={`${jobOrderBase}/${expense.job_order.id}`}>
            <Briefcase className="size-4 mr-1" /> View job
          </Link>
        </Button>
      )}

      <ToolbarDivider />

      <Button variant="outline" size="sm" onClick={() => printExpenseDocument()}>
        <Printer className="size-4 mr-1" /> Print voucher
      </Button>

      {canDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={busy}
          className={cn(busy && 'opacity-70')}
        >
          <Trash2 className="size-4 mr-1" /> Delete
        </Button>
      )}
    </div>
  );
}
