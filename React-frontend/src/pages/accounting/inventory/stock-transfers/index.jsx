import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { arrayMove } from '@dnd-kit/sortable';
import {
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  Edit3,
  EllipsisVertical,
  Eye,
  Filter,
  Package,
  Plus,
  Search,
  Settings2,
  Trash2,
  Warehouse,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { stockTransfersApi } from '../api/stock-transfers.api';
import {
  STOCK_TRANSFER_STATUS_FILTER_OPTIONS,
  TRANSFER_STATUS_COLORS,
  formatCurrency,
} from '../constants';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { DataGridTableDnd } from '@/components/ui/data-grid-table-dnd';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { useDataGridColumnPreferences } from '@/hooks/use-data-grid-column-preferences';

const DEFAULT_COLUMN_ORDER = [
  'transfer_number',
  'route',
  'transfer_date',
  'line_count',
  'total_value',
  'status',
  'actions',
];

export function StockTransfersPage() {
  const { id: workspaceId } = useParams();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/stock-transfers`;

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
    status: 'all',
    from_warehouse_id: '',
    to_warehouse_id: '',
    date_from: '',
    date_to: '',
  });
  const [sorting, setSorting] = useState([{ id: 'transfer_date', desc: true }]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const columnPrefsKey = `erp:stock-transfers:columns:${workspaceId ?? 'default'}`;
  const {
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
  } = useDataGridColumnPreferences(columnPrefsKey, DEFAULT_COLUMN_ORDER);

  /* ── data fetching ────────────────────────────────────────────── */

  useEffect(() => {
    stockTransfersApi
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
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.from_warehouse_id) params.from_warehouse_id = Number(filters.from_warehouse_id);
      if (filters.to_warehouse_id) params.to_warehouse_id = Number(filters.to_warehouse_id);
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const res = await stockTransfersApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load stock transfers');
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
      const res = await stockTransfersApi.destroy(confirmDelete.id);
      toast.success(res.data?.message || 'Stock transfer deleted');
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete stock transfer');
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── filters ──────────────────────────────────────────────────── */

  const resetFilters = () => {
    setSearchInput('');
    setFilters({
      search: '',
      status: 'all',
      from_warehouse_id: '',
      to_warehouse_id: '',
      date_from: '',
      date_to: '',
    });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const activeFilterCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.from_warehouse_id ? 1 : 0) +
    (filters.to_warehouse_id ? 1 : 0) +
    (filters.date_from ? 1 : 0) +
    (filters.date_to ? 1 : 0);

  /* ── column DnD ───────────────────────────────────────────────── */

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (active && over && active.id !== over.id) {
        setColumnOrder((order) => {
          const oldIndex = order.indexOf(active.id);
          const newIndex = order.indexOf(over.id);
          if (oldIndex < 0 || newIndex < 0) return order;
          return arrayMove(order, oldIndex, newIndex);
        });
      }
    },
    [setColumnOrder],
  );

  /* ── columns ──────────────────────────────────────────────────── */

  const columns = useMemo(
    () => [
      {
        id: 'transfer_number',
        accessorKey: 'transfer_number',
        header: ({ column }) => <DataGridColumnHeader title="Transfer #" column={column} />,
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="text-sm font-semibold font-mono text-primary hover:text-primary/80 hover:underline"
          >
            {row.original.transfer_number || `#${row.original.id}`}
          </Link>
        ),
        size: 160,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: {
          headerTitle: 'Transfer #',
          skeleton: <Skeleton className="h-5 w-24" />,
        },
      },
      {
        id: 'route',
        accessorFn: (row) =>
          `${row.from_warehouse?.name || ''} → ${row.to_warehouse?.name || ''}`,
        header: ({ column }) => <DataGridColumnHeader title="Route" column={column} />,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-2 min-w-0 text-sm">
              <span className="inline-flex items-center gap-1.5 min-w-0 max-w-40">
                <Warehouse className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{r.from_warehouse?.name || '—'}</span>
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/70" />
              <span className="inline-flex items-center gap-1.5 min-w-0 max-w-40">
                <Warehouse className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{r.to_warehouse?.name || '—'}</span>
              </span>
            </div>
          );
        },
        size: 340,
        enableSorting: false,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Route',
          skeleton: <Skeleton className="h-5 w-56" />,
        },
      },
      {
        id: 'transfer_date',
        accessorKey: 'transfer_date',
        header: ({ column }) => <DataGridColumnHeader title="Date" column={column} />,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" />
            {row.original.transfer_date_display || row.original.transfer_date || '—'}
          </span>
        ),
        size: 140,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Date',
          skeleton: <Skeleton className="h-5 w-24" />,
        },
      },
      {
        id: 'line_count',
        accessorKey: 'line_count',
        header: ({ column }) => <DataGridColumnHeader title="Lines" column={column} />,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
            <Package className="size-3.5 shrink-0" />
            {row.original.line_count ?? row.original.lines?.length ?? 0}
          </span>
        ),
        size: 90,
        enableSorting: true,
        enableHiding: true,
        enableResizing: false,
        meta: {
          headerTitle: 'Lines',
          cellClassName: 'text-end',
          skeleton: <Skeleton className="h-5 w-10 ms-auto" />,
        },
      },
      {
        id: 'total_value',
        accessorKey: 'total_value',
        header: ({ column }) => <DataGridColumnHeader title="Total value" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums font-medium">
            {formatCurrency(row.original.total_value ?? 0)}
          </span>
        ),
        size: 130,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Total value',
          cellClassName: 'text-end',
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => {
          const s = row.original.status || 'draft';
          return (
            <Badge
              variant="outline"
              className={cn(
                'rounded-full capitalize font-medium',
                TRANSFER_STATUS_COLORS[s] || '',
              )}
            >
              {s.replace('_', ' ')}
            </Badge>
          );
        },
        size: 120,
        enableSorting: true,
        enableHiding: true,
        enableResizing: false,
        meta: {
          headerTitle: 'Status',
          skeleton: <Skeleton className="h-6 w-16" />,
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        cell: ({ row }) => {
          const transfer = row.original;
          const canEdit = transfer.flags?.can_edit;
          const canDelete = transfer.flags?.can_delete;
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="View transfer"
                asChild
              >
                <Link to={`${base}/${transfer.id}`}>
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
                        <Link to={`${base}/${transfer.id}/edit`}>
                          <Edit3 className="size-4 mr-2" /> Edit
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    {canDelete ? (
                      <>
                        {canEdit ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setConfirmDelete(transfer)}
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
        size: 90,
        meta: { headerTitle: 'Actions' },
      },
    ],
    [base],
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
      sorting,
      columnOrder,
      columnVisibility,
    },
    manualPagination: true,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
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
    getRowId: (row) => String(row.id),
  });

  /* ── render ───────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock transfers"
        subtitle="Move inventory between warehouses and track fulfilment history."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={invBase}>Overview</Link>
            </Button>
            {canCreate ? (
              <Button size="sm" variant="mono" asChild>
                <Link to={`${base}/create`}>
                  <Plus className="size-4 mr-1" /> New transfer
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader className="py-3 border-b flex-col items-stretch gap-3">
          <div className="flex items-center justify-between gap-2 w-full">
            <CardTitle className="text-base font-semibold inline-flex items-center gap-2">
              <ArrowRightLeft className="size-4 text-muted-foreground" />
              All transfers
            </CardTitle>
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button variant="outline" size="sm" className="h-9">
                  <Settings2 className="size-4" />
                  Columns
                </Button>
              }
            />
          </div>

          <CardToolbar className="w-full flex-col lg:flex-row gap-3 p-0 border-0 min-h-0">
            <div className="relative flex-1 min-w-0 lg:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search number or notes…"
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
                value={filters.status}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, status: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_TRANSFER_STATUS_FILTER_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.from_warehouse_id || '__all__'}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, from_warehouse_id: v === '__all__' ? '' : v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="From: any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">From: any</SelectItem>
                  {warehouseOptions.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.to_warehouse_id || '__all__'}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, to_warehouse_id: v === '__all__' ? '' : v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="To: any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">To: any</SelectItem>
                  {warehouseOptions.map((w) => (
                    <SelectItem key={`to-${w.id}`} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DatePicker
                value={filters.date_from}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, date_from: v || '' }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="From date"
                className="h-9 w-40"
              />
              <DatePicker
                value={filters.date_to}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, date_to: v || '' }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="To date"
                className="h-9 w-40"
              />

              <Button
                variant="outline"
                size="icon"
                className="size-9 relative"
                onClick={resetFilters}
                title="Reset filters"
              >
                <Filter className="size-4" />
                {activeFilterCount > 0 ? (
                  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                ) : null}
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
            columnsVisibility: true,
            columnsResizable: true,
            columnsPinnable: true,
            columnsMovable: true,
            columnsDraggable: true,
          }}
        >
          <CardTable>
            <ScrollArea>
              <DataGridTableDnd handleDragEnd={handleDragEnd} />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter className="border-t">
            <DataGridPagination sizes={[15, 25, 50, 100]} />
          </CardFooter>
        </DataGrid>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete stock transfer?"
        description={
          confirmDelete
            ? `Delete ${confirmDelete.transfer_number || `#${confirmDelete.id}`}? This will restore the source warehouse's quantity and remove the movement into the destination warehouse. This cannot be undone.`
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
