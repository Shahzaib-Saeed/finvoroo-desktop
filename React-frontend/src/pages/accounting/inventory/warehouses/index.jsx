import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  EllipsisVertical,
  Package,
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { warehousesApi } from '../api/warehouses.api';
import { WAREHOUSE_STATUS_FILTER_OPTIONS } from '../constants';
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
import { DataGrid } from '@/components/ui/data-grid';
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export function WarehousesPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/inventory/warehouses`;

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
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [rowSelection, setRowSelection] = useState({});

  useEffect(() => {
    warehousesApi
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
      if (filters.status === 'active') params.is_active = 1;
      if (filters.status === 'inactive') params.is_active = 0;

      const res = await warehousesApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters.search, filters.status]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const resetFilters = () => {
    setFilters({ search: '', status: 'all' });
    setSearchInput('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      const res = await warehousesApi.delete(confirmDelete.id);
      toast.success(res.data?.message || 'Warehouse deleted');
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete warehouse');
    } finally {
      setIsDeleting(false);
    }
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
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <span className="text-sm font-mono text-muted-foreground">
            {row.original.code || '—'}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'name',
        header: 'Warehouse',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-medium text-sm text-foreground truncate">
              {row.original.name || '—'}
            </span>
            {row.original.address ? (
              <span className="text-xs text-muted-foreground truncate">
                {row.original.address}
              </span>
            ) : null}
          </div>
        ),
        size: 220,
      },
      {
        id: 'default',
        header: 'Default',
        cell: ({ row }) =>
          row.original.is_default ? (
            <Badge variant="outline" className="rounded-full bg-primary/10 text-primary border-primary/20">
              Default
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
        size: 100,
      },
      {
        id: 'skus',
        header: 'SKUs',
        cell: ({ row }) => {
          const wh = row.original;
          const n = wh.stock_sku_count ?? 0;
          return (
            <Link
              to={`${base}/${wh.id}/stock`}
              className="text-sm tabular-nums text-primary hover:underline inline-flex items-center gap-1"
            >
              <Package className="size-3.5 shrink-0" />
              {n}
            </Link>
          );
        },
        size: 90,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) =>
          row.original.is_active !== false ? (
            <Badge
              variant="outline"
              className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-full bg-muted text-muted-foreground">
              Inactive
            </Badge>
          ),
        size: 90,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        meta: {
          headerClassName: 'text-center',
          cellClassName: 'text-center',
        },
        cell: ({ row }) => {
          const wh = row.original;
          const canEdit = permissions.can_edit;
          const canDelete = permissions.can_delete && !wh.is_default;
          const stockHref = `${base}/${wh.id}/stock`;
          const editHref = `${base}/${wh.id}/edit`;

          return (
            <div className="flex items-center justify-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                asChild
                title="View stock"
              >
                <Link to={stockHref}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" mode="icon" size="sm" className="size-8">
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {canEdit ? (
                      <DropdownMenuItem asChild>
                        <Link to={editHref}>
                          <Edit3 className="size-4 mr-2" /> Edit
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    {canDelete ? (
                      <>
                        {canEdit ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setConfirmDelete(wh)}
                        >
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        },
        size: 120,
      },
    ],
    [base, permissions],
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
        page: (next.pageIndex ?? 0) + 1,
        perPage: next.pageSize ?? p.perPage,
      }));
      setRowSelection({});
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        subtitle="Storage locations and stock by warehouse."
        actions={
          permissions.can_create ? (
            <Button size="sm" variant="mono" asChild>
              <Link to={`${base}/create`}>
                <Plus className="size-4 mr-1" /> Add warehouse
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader className="py-3 border-b">
          <CardToolbar className="w-full flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search name or code…"
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
            <div className="flex items-center gap-2 shrink-0">
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
                  {WAREHOUSE_STATUS_FILTER_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete warehouse?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently remove <strong>{confirmDelete?.name}</strong>? This only works if the
              warehouse has no stock.
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
