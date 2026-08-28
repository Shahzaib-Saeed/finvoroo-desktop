import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { tryLoadOfflineDocumentList } from '@/offline/form-lookups';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Edit3,
  EllipsisVertical,
  Eye,
  ExternalLink,
  Filter,
  Plus,
  Repeat,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { expensesApi } from './api/expenses.api';
import {
  APPROVAL_COLORS,
  APPROVAL_STATUSES,
  accountLabel,
  formatCurrency,
} from './constants';
import { ApprovalActions } from './components/ApprovalActions';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid } from '@/components/ui/data-grid';
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

export function ExpensesPage() {
  const { id: workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const base = `/workspace/${workspaceId}/accounting/expenses`;
  const recurringBase = `/workspace/${workspaceId}/accounting/recurring-expenses`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    approval: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    expensesApi
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
      if (filters.approval && filters.approval !== 'all') {
        params.approval_status = filters.approval;
      }
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await expensesApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      const local = await tryLoadOfflineDocumentList(workspaceId, 'expense', {
        search: filters.search,
      });
      if (local) {
        setRows(local);
        setPagination((p) => ({ ...p, total: local.length, lastPage: 1 }));
        toast.message('Showing offline draft expenses — sync when you reconnect');
        return;
      }
      toast.error(err?.response?.data?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters, workspaceId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);
  }, [rowSelection]);

  const selectedCount = selectedIds.length;

  const runBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const res = await expensesApi.bulk({ ids: selectedIds, action: 'delete' });
      toast.success(res.data?.message || 'Expenses deleted');
      setRowSelection({});
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk delete failed');
    } finally {
      setBulkBusy(false);
      setConfirmBulkDelete(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await expensesApi.destroy(confirmDelete.id);
      toast.success(res.data?.message || 'Expense deleted');
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete expense');
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setFilters({ search: '', approval: 'all', dateFrom: '', dateTo: '' });
    setSearchInput('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const columns = useMemo(
    () => [
      {
        id: 'select',
        accessorKey: 'id',
        header: () => <DataGridTableRowSelectAll size="sm" />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} size="sm" />,
        enableSorting: false,
        size: 44,
        meta: { cellClassName: 'ps-3' },
      },
      {
        id: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className={cn(
              'text-sm hover:text-primary',
              highlightId &&
                String(row.original.id) === String(highlightId) &&
                'font-semibold text-amber-700',
            )}
          >
            {row.original.expense_date_display || row.original.expense_date}
          </Link>
        ),
        size: 110,
      },
      {
        id: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            {row.original.reference || `#${row.original.id}`}
          </Link>
        ),
        size: 120,
      },
      {
        id: 'vendor',
        header: 'Vendor',
        cell: ({ row }) => (
          <span className="text-sm truncate block max-w-[180px]">
            {row.original.vendor?.name || '—'}
          </span>
        ),
        size: 160,
      },
      {
        id: 'expense_account',
        header: 'Expense account',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
            {accountLabel(row.original.expense_account)}
          </span>
        ),
        size: 180,
      },
      {
        accessorKey: 'amount',
        header: () => <span className="block text-right w-full">Amount</span>,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums block text-right">
            {formatCurrency(row.original.amount, row.original.currency)}
          </span>
        ),
        size: 110,
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
        size: 100,
      },
      {
        id: 'posted',
        header: 'GL',
        cell: ({ row }) =>
          row.original.is_posted ? (
            <Badge
              variant="outline"
              className="text-emerald-700 border-emerald-200 bg-emerald-50 text-xs"
            >
              Posted
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        size: 80,
      },
      {
        id: 'receipt',
        header: 'Receipt',
        cell: ({ row }) =>
          row.original.receipt_url ? (
            <Button size="sm" variant="ghost" className="size-8" asChild>
              <a
                href={row.original.receipt_url}
                target="_blank"
                rel="noreferrer"
                title="View receipt"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
        size: 70,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const e = row.original;
          const flags = e.flags || {};
          return (
            <div className="flex justify-end items-center gap-0.5">
              <ApprovalActions
                type="expense"
                recordId={e.id}
                status={e.approval_status}
                onUpdated={fetchRows}
                compact
              />
              <Button size="sm" variant="ghost" className="size-8" asChild title="View">
                <Link to={`${base}/${e.id}`}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              {flags.can_edit !== false && (
                <Button size="sm" variant="ghost" className="size-8" asChild title="Edit">
                  <Link to={`${base}/${e.id}/edit`}>
                    <Edit3 className="size-4" />
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" mode="icon" size="sm" className="size-8">
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link to={`${base}/${e.id}`}>
                      <Eye className="size-4 mr-2" /> View details
                    </Link>
                  </DropdownMenuItem>
                  {flags.can_edit !== false && (
                    <DropdownMenuItem asChild>
                      <Link to={`${base}/${e.id}/edit`}>
                        <Edit3 className="size-4 mr-2" /> Edit
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {e.receipt_url && (
                    <DropdownMenuItem asChild>
                      <a href={e.receipt_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4 mr-2" /> View receipt
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {flags.can_delete !== false && (
                    <DropdownMenuItem
                      onClick={() => setConfirmDelete(e)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 140,
      },
    ],
    [base, highlightId, fetchRows],
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
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
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
      setRowSelection({});
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Expenses"
        subtitle="Record business expenses and post them to the general ledger."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={recurringBase}>
                <Repeat className="size-4 mr-1" /> Recurring expenses
              </Link>
            </Button>
            {canCreate && (
              <Button size="sm" variant="mono" asChild>
                <Link to={`${base}/create`}>
                  <Plus className="size-4 mr-1" /> Add expense
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex flex-wrap gap-2 ms-auto">
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkBusy}
              onClick={() => setConfirmBulkDelete(true)}
            >
              <Trash2 className="size-4 mr-1" />
              Delete selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRowSelection({})}
              disabled={bulkBusy}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="py-3 border-b">
          <CardToolbar className="w-full flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search reference or description…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 pl-9 pr-9"
              />
              {searchInput ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 size-9"
                  onClick={() => {
                    setSearchInput('');
                    setFilters((f) => ({ ...f, search: '' }));
                  }}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Select
                value={filters.approval}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, approval: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPROVAL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DatePicker
                className="w-[160px]"
                value={filters.dateFrom}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateFrom: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="From date"
              />
              <DatePicker
                className="w-[160px]"
                value={filters.dateTo}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateTo: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="To date"
              />
              <Button
                variant="outline"
                size="icon"
                className="size-9"
                onClick={resetFilters}
                title="Reset filters"
              >
                <Filter className="size-4" />
              </Button>
            </div>
          </CardToolbar>
        </CardHeader>

        <DataGrid
          table={table}
          recordCount={pagination.total}
          isLoading={loading}
          tableLayout={{
            cellBorder: true,
            rowBorder: true,
            headerBackground: true,
            headerBorder: true,
            columnsVisibility: false,
          }}
        >
          <CardTable>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter className="border-t">
            <DataGridPagination sizes={[15, 25, 50, 100]} />
          </CardFooter>
        </DataGrid>
      </Card>

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedCount} expense(s)?`}
        description="Posted journal entries will be reversed for each deleted expense. This cannot be undone."
        confirmLabel="Delete all"
        confirmVariant="destructive"
        onConfirm={runBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
        isLoading={bulkBusy}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete expense?"
        description={
          confirmDelete
            ? `Delete expense ${confirmDelete.reference || `#${confirmDelete.id}`}? Posted journal entries will be reversed.`
            : ''
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleting}
      />
    </div>
  );
}
