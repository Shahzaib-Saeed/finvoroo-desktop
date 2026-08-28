import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { Plus, Search, Edit3, Trash2, MoreHorizontal, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { taxRatesApi } from './api/tax-rates.api';
import {
  formatTaxRate,
  TAX_TYPE_COLORS,
  STATUS_FILTER_OPTIONS,
} from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGridLayout } from '@/components/ui/data-grid-layout';
import { useTaxDialog } from '@/components/workspace/tax/tax-dialog-provider';
import { cn } from '@/lib/utils';

export function TaxesPage() {
  const { id: workspaceId } = useParams();
  const taxDialog = useTaxDialog();
  const taxPaymentsBase = `/workspace/${workspaceId}/accounting/tax-payments`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    can_create: false,
    can_edit: false,
    can_delete: false,
  });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
  });

  useEffect(() => {
    taxRatesApi
      .formOptions()
      .then((res) => {
        const data = res.data?.data || {};
        setPermissions({
          can_create: !!data.can_create,
          can_edit: !!data.can_edit,
          can_delete: !!data.can_delete,
        });
      })
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
      if (filters.type && filters.type !== 'all') params.type = filters.type;
      if (filters.status === 'active') params.is_active = 1;
      if (filters.status === 'inactive') params.is_active = 0;

      const res = await taxRatesApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load tax rates');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      const res = await taxRatesApi.delete(confirmDelete.id);
      toast.success(res.data?.message || 'Tax rate deleted');
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not delete tax rate';
      toast.error(msg);
      if (msg.toLowerCase().includes('deactivated')) {
        setConfirmDelete(null);
        fetchRows();
      }
    } finally {
      setIsDeleting(false);
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
        id: 'rate',
        header: 'Rate',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{formatTaxRate(row.original)}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
          const t = row.original.type || 'percentage';
          return (
            <Badge variant="outline" className={cn('capitalize', TAX_TYPE_COLORS[t] || '')}>
              {t}
            </Badge>
          );
        },
      },
      {
        id: 'default',
        header: 'Default',
        cell: ({ row }) =>
          row.original.is_default ? (
            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
              Default
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">
              Inactive
            </Badge>
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const t = row.original;
          const canEdit = permissions.can_edit && t.flags?.can_edit !== false;
          const canDelete = permissions.can_delete && t.flags?.can_delete !== false;
          if (!canEdit && !canDelete) return null;

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => taxDialog.openEdit(t, { onSuccess: fetchRows })}>
                      <Edit3 className="size-4 mr-2" /> Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmDelete(t)}
                      >
                        <Trash2 className="size-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 80,
      },
    ],
    [permissions, taxDialog, fetchRows]
  );

  const showActionsColumn = permissions.can_edit || permissions.can_delete;

  const visibleColumns = useMemo(
    () => (showActionsColumn ? columns : columns.filter((c) => c.id !== 'actions')),
    [columns, showActionsColumn]
  );

  const table = useReactTable({
    columns: visibleColumns,
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
        page: (next.pageIndex ?? 0) + 1,
        perPage: next.pageSize ?? p.perPage,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Tax rates"
        subtitle="Manage VAT, GST, and sales tax rates for invoices and bills."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={taxPaymentsBase}>Tax payments</Link>
            </Button>
            {permissions.can_create && (
              <Button size="sm" onClick={() => taxDialog.openCreate({ onSuccess: fetchRows })}>
                <Plus className="size-4 mr-2" /> Add tax rate
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
              placeholder="Search tax name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.type}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, type: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, status: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!loading && rows.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Percent className="size-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No tax rates yet. Add VAT, GST, or sales tax for your invoices and bills.
            </p>
            {permissions.can_create && (
              <Button onClick={() => taxDialog.openCreate({ onSuccess: fetchRows })}>
                <Plus className="size-4 mr-2" /> Add tax rate
              </Button>
            )}
          </div>
        ) : (
        <DataGridLayout table={table} recordCount={pagination.total} isLoading={loading} />
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tax rate?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{confirmDelete?.name}</strong>? If this rate is used by products or
              invoices, it will be deactivated instead of removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
