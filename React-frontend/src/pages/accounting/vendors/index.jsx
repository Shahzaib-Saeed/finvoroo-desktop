import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { arrayMove } from '@dnd-kit/sortable';
import {
  Search,
  Edit3,
  Trash2,
  Eye,
  EllipsisVertical,
  Building2,
  Filter,
  Mail,
  Ban,
  CheckCircle2,
  X,
  Settings2,
  Clock3,
} from 'lucide-react';
import { toast } from 'sonner';
import { isOnline } from '@/offline/connectivity';
import { getMeta } from '@/offline/db';
import { loadCachedLookups } from '@/offline/invoices-repository';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import {
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import { DataGridTableDnd } from '@/components/ui/data-grid-table-dnd';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useDataGridColumnPreferences } from '@/hooks/use-data-grid-column-preferences';
import { useVendorDialog } from '@/components/workspace/vendor/vendor-dialog-provider';
import { vendorsApi } from './api/vendors.api';
import { formatMoney, vendorInitials } from './constants';
import { VendorDeleteDialog } from './components/VendorDeleteDialog';
import { VendorDetailsSheet } from './components/VendorDetailsSheet';
import { ModuleEmptyState } from '@/components/common/module-empty-state';

const DEFAULT_COLUMN_ORDER = [
  'select',
  'name',
  'vendor_code',
  'payment_terms',
  'total_billed',
  'balance_due',
  'is_active',
  'actions',
];

function paymentTermsLabel(vendor) {
  if (vendor.payment_terms) return vendor.payment_terms;
  if (vendor.payment_terms_type === 'net_days') {
    return `Net ${Number(vendor.payment_terms_days) || 0}`;
  }
  if (vendor.payment_terms_type === 'due_on_receipt') return 'Due on receipt';
  if (vendor.payment_terms_type === 'fixed_day') {
    return `Day ${Number(vendor.payment_terms_fixed_day) || 1}`;
  }
  return '—';
}

export function VendorsPage() {
  const { id: workspaceId } = useParams();
  const vendorDialog = useVendorDialog();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsVendorId, setDetailsVendorId] = useState(null);

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [searchInput, setSearchInput] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const [sorting, setSorting] = useState([{ id: 'name', desc: false }]);
  const [canCreate, setCanCreate] = useState(false);
  const columnPrefsKey = `erp:vendors:columns:${workspaceId ?? 'default'}`;
  const {
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
  } = useDataGridColumnPreferences(columnPrefsKey, DEFAULT_COLUMN_ORDER);

  useEffect(() => {
    vendorsApi
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

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        per_page: pagination.perPage,
        page: pagination.page,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;

      const res = await vendorsApi.list(params);
      const payload = res.data;
      const items = payload?.data ?? [];
      const meta = payload?.meta ?? {};
      setVendors(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      if (!isOnline() && workspaceId) {
        try {
          const enabled = await getMeta(workspaceId, 'offline_sync_enabled', false);
          if (enabled) {
            const cached = await loadCachedLookups(workspaceId);
            let local = cached.vendors || [];
            if (filters.search) {
              const q = filters.search.toLowerCase();
              local = local.filter(
                (v) =>
                  String(v.name || '').toLowerCase().includes(q) ||
                  String(v.email || '').toLowerCase().includes(q),
              );
            }
            if (filters.status === 'inactive') {
              local = local.filter((v) => v.is_active === false);
            } else if (filters.status === 'active') {
              local = local.filter((v) => v.is_active !== false);
            }
            setVendors(local);
            setPagination((p) => ({ ...p, total: local.length, lastPage: 1 }));
            toast.message('Showing cached vendors (offline)');
            return;
          }
        } catch {
          /* fall through */
        }
      }
      toast.error(err?.response?.data?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters.search, filters.status, workspaceId]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);
  }, [rowSelection]);

  const selectedCount = selectedIds.length;

  const runBulk = async (action) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const res = await vendorsApi.bulk({ ids: selectedIds, action });
      toast.success(res.data?.message || 'Bulk action completed');
      setRowSelection({});
      fetchVendors();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk action failed');
    } finally {
      setBulkBusy(false);
      setConfirmBulkDelete(false);
    }
  };

  const handleActivate = useCallback(async (vendor) => {
    setActivatingId(vendor.id);
    try {
      const res = await vendorsApi.activate(vendor.id);
      toast.success(res?.data?.message || 'Vendor activated');
      fetchVendors();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to activate vendor');
    } finally {
      setActivatingId(null);
    }
  }, [fetchVendors]);

  const openVendorDetails = useCallback((vendor) => {
    setDetailsVendorId(vendor.id);
    setDetailsOpen(true);
  }, []);

  const handleEditFromSheet = useCallback(
    (vendor) => {
      setDetailsOpen(false);
      vendorDialog.openEdit(vendor, {
        onSuccess: fetchVendors,
      });
    },
    [vendorDialog, fetchVendors],
  );

  const resetFilters = () => {
    setSearchInput('');
    setFilters({ search: '', status: 'all' });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setColumnOrder((order) => {
        const oldIndex = order.indexOf(active.id);
        const newIndex = order.indexOf(over.id);
        if (oldIndex < 0 || newIndex < 0) return order;
        return arrayMove(order, oldIndex, newIndex);
      });
    }
  }, [setColumnOrder]);

  const columns = useMemo(
    () => [
      {
        id: 'select',
        accessorKey: 'id',
        header: () => <DataGridTableRowSelectAll size="sm" />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} size="sm" />,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 44,
        meta: { cellClassName: 'ps-3', headerTitle: 'Select' },
      },
      {
        id: 'vendor_code',
        accessorKey: 'vendor_code',
        header: ({ column }) => (
          <DataGridColumnHeader title="Vendor ID" column={column} />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openVendorDetails(row.original)}
            className="text-sm font-medium text-primary hover:text-primary/80 font-mono text-left"
          >
            {row.original.vendor_code || '—'}
          </button>
        ),
        size: 120,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Vendor ID',
          skeleton: <Skeleton className="h-5 w-20" />,
        },
      },
      {
        id: 'name',
        accessorFn: (row) => row.name || row.email || '',
        header: ({ column }) => (
          <DataGridColumnHeader title="Vendor" column={column} />
        ),
        cell: ({ row }) => {
          const vendor = row.original;
          const initials = vendorInitials(vendor.name);

          return (
            <div className="flex min-w-0 items-center gap-3 py-1.5">
              <Avatar className="size-9 shrink-0 rounded-xl">
                <AvatarFallback
                  className={cn(
                    'rounded-xl text-xs font-bold',
                    vendor.is_active !== false
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 min-w-0">
                <button
                  type="button"
                  onClick={() => openVendorDetails(vendor)}
                  className="truncate text-left text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {vendor.name || '—'}
                </button>
                {vendor.email ? (
                  <span className="text-xs text-muted-foreground truncate inline-flex items-center gap-1">
                    <Mail className="size-3 shrink-0" />
                    {vendor.email}
                  </span>
                ) : null}
              </div>
            </div>
          );
        },
        size: 280,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: {
          headerTitle: 'Vendor',
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          ),
        },
      },
      {
        id: 'payment_terms',
        accessorFn: paymentTermsLabel,
        header: ({ column }) => (
          <DataGridColumnHeader title="Payment Terms" column={column} />
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Clock3 className="size-3.5 text-slate-400" />
            {paymentTermsLabel(row.original)}
          </span>
        ),
        size: 145,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Payment Terms',
          skeleton: <Skeleton className="h-5 w-20" />,
        },
      },
      {
        id: 'balance_due',
        accessorKey: 'balance_due',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Balance Due"
            column={column}
            className="w-full justify-end"
          />
        ),
        cell: ({ row }) => {
          const due = Number(row.original.balance_due ?? 0);
          return (
            <span
              className={cn(
                'text-sm tabular-nums font-medium',
                due > 0 ? 'text-amber-700' : 'text-muted-foreground',
              )}
            >
              {formatMoney(row.original.balance_due, row.original.currency)}
            </span>
          );
        },
        size: 120,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Balance Due',
          cellClassName: 'text-end',
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
      {
        id: 'total_billed',
        accessorKey: 'total_billed',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Total Billed"
            column={column}
            className="w-full justify-end"
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatMoney(row.original.total_billed, row.original.currency)}
          </span>
        ),
        size: 130,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Total Billed',
          cellClassName: 'text-end',
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
      {
        id: 'is_active',
        accessorKey: 'is_active',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
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
        size: 100,
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
          const vendor = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                onClick={() => openVendorDetails(vendor)}
              >
                <Eye className="size-3.5 text-primary" />
                View details
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" mode="icon" size="sm" className="size-8">
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() =>
                      vendorDialog.openEdit(vendor, { onSuccess: fetchVendors })
                    }
                  >
                    <Edit3 className="size-4 mr-2" /> Quick edit
                  </DropdownMenuItem>
                  {vendor.is_active === false && (
                    <DropdownMenuItem
                      onClick={() => handleActivate(vendor)}
                      disabled={activatingId === vendor.id}
                    >
                      <CheckCircle2 className="size-4 mr-2" /> Activate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmDelete(vendor)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 120,
        meta: { headerTitle: 'Actions' },
      },
    ],
    [activatingId, vendorDialog, fetchVendors, handleActivate, openVendorDetails],
  );

  const table = useReactTable({
    columns,
    data: vendors,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
      rowSelection,
      sorting,
      columnOrder,
      columnVisibility,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === 'function'
          ? updater({ pageIndex: pagination.page - 1, pageSize: pagination.perPage })
          : updater;
      setPagination((p) => ({
        ...p,
        page: newState.pageIndex + 1,
        perPage: newState.pageSize,
      }));
      setRowSelection({});
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="Manage vendors, payment terms, and default GL accounts for bills."
        actions={
          canCreate && (
            <Button
              size="sm"
              variant="mono"
              onClick={() => vendorDialog.openCreate({ onSuccess: () => fetchVendors() })}
            >
              <Building2 className="size-4 mr-1" /> New Vendor
            </Button>
          )
        }
      />

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex flex-wrap gap-2 ms-auto">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => runBulk('activate')}
            >
              <CheckCircle2 className="size-4 mr-1" />
              Set active
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => runBulk('deactivate')}
            >
              <Ban className="size-4 mr-1" />
              Set inactive
            </Button>
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

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex-col items-stretch gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col items-stretch justify-between gap-3 w-full sm:flex-row sm:items-center">
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold text-slate-950">
                All vendors
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                {pagination.total} {pagination.total === 1 ? 'vendor' : 'vendors'} in this workspace
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
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
          </div>
          <CardToolbar className="min-h-0 w-full flex-col gap-3 border-0 p-0 sm:flex-row">
            <div className="relative min-w-0 flex-1 sm:max-w-lg">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, email, or vendor ID…"
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
                onValueChange={(val) => {
                  setFilters((f) => ({ ...f, status: val }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
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

        {!loading && pagination.total === 0 && !filters.search ? (
          <div className="p-6">
            <ModuleEmptyState
              icon={Building2}
              title="No vendors yet"
              description="Add your first vendor to start managing purchases and payables."
              actionLabel="Add Vendor"
              onAction={
                canCreate
                  ? () => vendorDialog.openCreate({ onSuccess: () => fetchVendors() })
                  : undefined
              }
            />
          </div>
        ) : (
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
            emptyMessage="No vendors match your current filters."
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
        )}
      </Card>

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedCount} vendor(s)?`}
        description="Vendors with activity may be marked inactive instead of deleted."
        confirmLabel="Delete all"
        confirmVariant="destructive"
        onConfirm={() => runBulk('delete')}
        onCancel={() => setConfirmBulkDelete(false)}
        isLoading={bulkBusy}
      />

      <VendorDeleteDialog
        vendor={confirmDelete}
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        onDeleted={fetchVendors}
      />

      <VendorDetailsSheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setDetailsVendorId(null);
        }}
        vendorId={detailsVendorId}
        workspaceId={workspaceId}
        onEdit={handleEditFromSheet}
        onListRefresh={fetchVendors}
      />
    </div>
  );
}
