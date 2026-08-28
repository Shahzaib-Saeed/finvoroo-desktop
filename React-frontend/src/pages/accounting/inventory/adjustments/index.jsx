import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { Edit3, Eye, EllipsisVertical, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { stockAdjustmentsApi } from '../api/stock-adjustments.api';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataGridLayout } from '@/components/ui/data-grid-layout';
import { DatePicker } from '@/components/ui/date-picker';

export function StockAdjustmentsPage() {
  const { id: workspaceId } = useParams();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/adjustments`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    warehouse_id: '',
    date_from: '',
    date_to: '',
  });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    stockAdjustmentsApi
      .formOptions()
      .then((res) => {
        const data = res.data?.data || {};
        setWarehouseOptions(data.warehouses ?? []);
        setCanCreate(!!data.can_create);
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
      if (filters.warehouse_id) params.warehouse_id = Number(filters.warehouse_id);
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const res = await stockAdjustmentsApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load stock adjustments');
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
      const res = await stockAdjustmentsApi.destroy(confirmDelete.id);
      toast.success(res.data?.message || 'Stock adjustment deleted');
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete stock adjustment');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'adjustment_number',
        header: '#',
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {row.original.adjustment_number || row.original.id}
          </Link>
        ),
      },
      {
        id: 'warehouse',
        header: 'Warehouse',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.warehouse?.name || '—'}</span>
        ),
      },
      {
        accessorKey: 'adjustment_date_display',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.adjustment_date_display || row.original.adjustment_date || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'reason_label',
        header: 'Reason',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.reason_label || row.original.reason || '—'}</span>
        ),
      },
      {
        id: 'posted',
        header: 'GL',
        cell: ({ row }) =>
          row.original.is_posted ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Posted
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              —
            </Badge>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const adj = row.original;
          const canEdit = adj.flags?.can_edit;
          const canDelete = adj.flags?.can_delete;
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button variant="ghost" size="icon" className="size-8" title="View adjustment" asChild>
                <Link to={`${base}/${adj.id}`}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              {canEdit || canDelete ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {canEdit ? (
                      <DropdownMenuItem asChild>
                        <Link to={`${base}/${adj.id}/edit`}>
                          <Edit3 className="size-4 mr-2" /> Edit
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    {canDelete ? (
                      <>
                        {canEdit ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setConfirmDelete(adj)}
                        >
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="size-8 shrink-0" aria-hidden="true" />
              )}
            </div>
          );
        },
      },
    ],
    [base]
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
        page: (next.pageIndex ?? 0) + 1,
        perPage: next.pageSize ?? p.perPage,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Stock adjustments"
        subtitle="Count corrections and inventory write-ups/downs."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={invBase}>Overview</Link>
            </Button>
            {canCreate && (
              <Button size="sm" asChild>
                <Link to={`${base}/create`}>
                  <Plus className="size-4 mr-2" /> New adjustment
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search number or notes…"
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select
            value={filters.warehouse_id || '__all__'}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, warehouse_id: v === '__all__' ? '' : v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All warehouses</SelectItem>
              {warehouseOptions.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground block">From</span>
            <DatePicker
              value={filters.date_from}
              onChange={(v) => {
                setFilters((f) => ({ ...f, date_from: v || '' }));
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground block">To</span>
            <DatePicker
              value={filters.date_to}
              onChange={(v) => {
                setFilters((f) => ({ ...f, date_to: v || '' }));
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
          </div>
        </div>
      </div>

      <DataGridLayout table={table} recordCount={pagination.total} isLoading={loading} />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete stock adjustment?"
        description={
          confirmDelete
            ? `Delete ${confirmDelete.adjustment_number || `#${confirmDelete.id}`}? This will restore the pre-adjustment quantity${confirmDelete.is_posted ? ' and remove its GL journal entry' : ''}. This cannot be undone.`
            : 'This cannot be undone.'
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
