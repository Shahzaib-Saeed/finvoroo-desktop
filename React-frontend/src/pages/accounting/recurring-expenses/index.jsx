import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { Edit3, Plus, Repeat, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { recurringExpensesApi } from '../expenses/api/recurring-expenses.api';
import {
  APPROVAL_COLORS,
  accountLabel,
  formatCurrency,
  formatFrequency,
} from '../expenses/constants';
import { ApprovalActions } from '../expenses/components/ApprovalActions';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataGridLayout } from '@/components/ui/data-grid-layout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const FREQUENCY_FILTER = [
  { value: 'all', label: 'All frequencies' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const ACTIVE_FILTER = [
  { value: 'all', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Paused' },
];

export function RecurringExpensesPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/recurring-expenses`;
  const expensesBase = `/workspace/${workspaceId}/accounting/expenses`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    frequency: 'all',
    isActive: 'all',
  });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    recurringExpensesApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, per_page: pagination.perPage };
      if (filters.search) params.search = filters.search;
      if (filters.frequency && filters.frequency !== 'all') params.frequency = filters.frequency;
      if (filters.isActive !== 'all') params.is_active = filters.isActive === 'true';

      const res = await recurringExpensesApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load recurring expenses');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await recurringExpensesApi.destroy(confirmDelete.id);
      toast.success(res.data?.message || 'Recurring expense deleted');
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.name}</span>
        ),
      },
      {
        id: 'expense_account',
        header: 'Expense account',
        cell: ({ row }) => (
          <span className="text-sm">{accountLabel(row.original.expense_account)}</span>
        ),
      },
      {
        id: 'payment',
        header: 'Payment from',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {accountLabel(row.original.payment_account)}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: () => <span className="block text-right w-full">Amount</span>,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums block text-right">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'frequency',
        header: 'Frequency',
        cell: ({ row }) => (
          <span className="text-sm">{formatFrequency(row.original.frequency)}</span>
        ),
      },
      {
        id: 'next_run',
        header: 'Next run',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.next_run_date_display || row.original.next_run_date}
          </span>
        ),
      },
      {
        id: 'active',
        header: 'Status',
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
              Active
            </Badge>
          ) : (
            <Badge variant="outline">Paused</Badge>
          ),
      },
      {
        id: 'approval',
        header: 'Approval',
        cell: ({ row }) => {
          const s = row.original.approval_status || 'approved';
          return (
            <Badge variant="outline" className={cn('capitalize', APPROVAL_COLORS[s] || '')}>
              {s}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex justify-end items-center gap-1">
              <ApprovalActions
                type="recurring_expense"
                recordId={item.id}
                status={item.approval_status}
                onUpdated={fetchRows}
                compact
              />
              <Button size="sm" variant="ghost" asChild>
                <Link to={`${base}/${item.id}/edit`} title="Edit">
                  <Edit3 className="size-4" />
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => setConfirmDelete(item)}
                title="Delete"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        },
        size: 140,
      },
    ],
    [base, fetchRows]
  );

  const table = useReactTable({
    columns,
    data: rows,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
    },
    manualPagination: true,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: pagination.page - 1, pageSize: pagination.perPage })
          : updater;
      setPagination((p) => ({
        ...p,
        page: next.pageIndex + 1,
        perPage: next.pageSize,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Recurring expenses"
        subtitle="Templates that automatically generate expenses on a schedule."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={expensesBase}>
                <Repeat className="size-4 mr-1" /> All expenses
              </Link>
            </Button>
            {canCreate && (
              <Button asChild>
                <Link to={`${base}/create`}>
                  <Plus className="size-4 mr-1" /> Add recurring
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center flex-wrap">
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.frequency}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, frequency: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_FILTER.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.isActive}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, isActive: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVE_FILTER.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!loading && rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No recurring expenses yet.</p>
            <Button className="mt-4" asChild>
              <Link to={`${base}/create`}>Add one</Link>
            </Button>
          </div>
        ) : (
          <DataGridLayout table={table} recordCount={pagination.total} isLoading={loading} />
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{confirmDelete?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
