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
  UserPlus,
  Filter,
  Mail,
  MapPin,
  Ban,
  CheckCircle2,
  X,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { useCustomerDialog } from '@/components/workspace/customer/customer-dialog-provider';
import { customersApi } from './api/customers.api';
import { customerInitials, formatCustomerAddress, formatMoney } from './constants';
import { CustomerDeleteDialog } from './components/CustomerDeleteDialog';
import { CustomerDetailsSheet } from './components/CustomerDetailsSheet';
import { ModuleEmptyState } from '@/components/common/module-empty-state';
import {
  listCustomersFromCache,
  shouldUseOfflineBrowse,
} from '@/offline/masters-repository';
import { isOnline } from '@/offline/connectivity';

const DEFAULT_COLUMN_ORDER = [
  'select',
  'name',
  'customer_code',
  'email',
  'address',
  'balance_due',
  'total_invoiced',
  'is_active',
  'actions',
];

export function CustomersPage() {
  const { id: workspaceId } = useParams();
  const customerDialog = useCustomerDialog();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsCustomerId, setDetailsCustomerId] = useState(null);

  const [customers, setCustomers] = useState([]);
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
  const columnPrefsKey = `erp:customers:columns:${workspaceId ?? 'default'}`;
  const {
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
  } = useDataGridColumnPreferences(columnPrefsKey, DEFAULT_COLUMN_ORDER);

  useEffect(() => {
    customersApi
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

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        per_page: pagination.perPage,
        page: pagination.page,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;

      const useCache = await shouldUseOfflineBrowse(workspaceId);
      if (useCache) {
        const cached = await listCustomersFromCache(workspaceId, {
          page: pagination.page,
          perPage: pagination.perPage,
          search: filters.search,
          status: filters.status,
        });
        setCustomers(cached.data);
        setPagination((p) => ({
          ...p,
          total: cached.meta.total,
          lastPage: cached.meta.last_page,
        }));
        return;
      }

      const res = await customersApi.list(params);
      const payload = res.data;
      const items = payload?.data ?? [];
      const meta = payload?.meta ?? {};
      setCustomers(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      if (!isOnline() && workspaceId) {
        try {
          const cached = await listCustomersFromCache(workspaceId, {
            page: pagination.page,
            perPage: pagination.perPage,
            search: filters.search,
            status: filters.status,
          });
          if (cached.data.length || cached.meta.total === 0) {
            setCustomers(cached.data);
            setPagination((p) => ({
              ...p,
              total: cached.meta.total,
              lastPage: cached.meta.last_page,
            }));
            toast.message('Showing cached customers (offline)');
            return;
          }
        } catch {
          /* fall through */
        }
      }
      toast.error(err?.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters.search, filters.status, workspaceId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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
      const res = await customersApi.bulk({ ids: selectedIds, action });
      toast.success(res.data?.message || 'Bulk action completed');
      setRowSelection({});
      fetchCustomers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk action failed');
    } finally {
      setBulkBusy(false);
      setConfirmBulkDelete(false);
    }
  };

  const handleActivate = async (customer) => {
    setActivatingId(customer.id);
    try {
      const res = await customersApi.activate(customer.id);
      toast.success(res?.data?.message || 'Customer activated');
      fetchCustomers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to activate customer');
    } finally {
      setActivatingId(null);
    }
  };

  const openCustomerDetails = useCallback((customer) => {
    setDetailsCustomerId(customer.id);
    setDetailsOpen(true);
  }, []);

  const handleEditFromSheet = useCallback(
    (customer) => {
      setDetailsOpen(false);
      setDetailsCustomerId(null);
      window.setTimeout(() => {
        customerDialog.openEdit(customer, {
          onSuccess: fetchCustomers,
        });
      }, 0);
    },
    [customerDialog, fetchCustomers],
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
  }, []);

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
        id: 'name',
        accessorFn: (row) => row.name || row.email || '',
        header: ({ column }) => (
          <DataGridColumnHeader title="Customer" column={column} />
        ),
        cell: ({ row }) => {
          const customer = row.original;
          const initials = customerInitials(
            customer.name,
            customer.contact_first_name,
            customer.contact_last_name,
          );

          return (
            <div className="flex items-center gap-3 min-w-0 py-0.5">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback
                  className={cn(
                    'text-xs font-semibold',
                    customer.is_active
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => openCustomerDetails(customer)}
                className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate text-left min-w-0"
              >
                {customer.name || '—'}
              </button>
            </div>
          );
        },
        size: 220,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: {
          headerTitle: 'Customer',
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <Skeleton className="h-5 w-28" />
            </div>
          ),
        },
      },
      {
        id: 'customer_code',
        accessorKey: 'customer_code',
        header: ({ column }) => (
          <DataGridColumnHeader title="Customer ID" column={column} />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openCustomerDetails(row.original)}
            className="text-sm font-medium text-primary hover:text-primary/80 font-mono text-left"
          >
            {row.original.customer_code || '—'}
          </button>
        ),
        size: 120,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Customer ID',
          skeleton: <Skeleton className="h-5 w-20" />,
        },
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: ({ column }) => (
          <DataGridColumnHeader title="Email" column={column} />
        ),
        cell: ({ row }) => {
          const email = row.original.email;
          if (!email) return <span className="text-muted-foreground">—</span>;
          return (
            <a
              href={`mailto:${email}`}
              className="text-sm text-muted-foreground hover:text-primary truncate inline-flex items-center gap-1.5 max-w-[220px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{email}</span>
            </a>
          );
        },
        size: 220,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Email',
          skeleton: <Skeleton className="h-5 w-36" />,
        },
      },
      {
        id: 'address',
        accessorFn: (row) => formatCustomerAddress(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Address" column={column} />
        ),
        cell: ({ row }) => {
          const address = formatCustomerAddress(row.original);
          if (!address) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className="text-sm text-muted-foreground truncate inline-flex items-center gap-1.5 max-w-[260px]"
              title={address}
            >
              <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{address}</span>
            </span>
          );
        },
        size: 260,
        enableSorting: false,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Address',
          skeleton: <Skeleton className="h-5 w-40" />,
        },
      },
      {
        id: 'balance_due',
        accessorKey: 'balance_due',
        header: ({ column }) => (
          <DataGridColumnHeader title="Balance Due" column={column} />
        ),
        cell: ({ row }) => {
          const due = Number(row.original.balance_due);
          const isCredit = due < -0.001;
          return (
            <span
              className={cn(
                'text-sm tabular-nums font-medium',
                due > 0 ? 'text-amber-700' : isCredit ? 'text-emerald-600' : 'text-muted-foreground',
              )}
            >
              {isCredit ? `Cr ${formatMoney(Math.abs(due), row.original.currency)}` : formatMoney(due, row.original.currency)}
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
        id: 'total_invoiced',
        accessorKey: 'total_invoiced',
        header: ({ column }) => (
          <DataGridColumnHeader title="Total Invoiced" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatMoney(row.original.total_invoiced, row.original.currency)}
          </span>
        ),
        size: 130,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Total Invoiced',
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
          row.original.is_active ? (
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
          const customer = row.original;
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="View"
                onClick={() => openCustomerDetails(customer)}
              >
                <Eye className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="Edit"
                onClick={() =>
                  customerDialog.openEdit(customer, { onSuccess: fetchCustomers })
                }
              >
                <Edit3 className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" mode="icon" size="sm" className="size-8">
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => openCustomerDetails(customer)}>
                    <Eye className="size-4 mr-2" /> View details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      customerDialog.openEdit(customer, { onSuccess: fetchCustomers })
                    }
                  >
                    <Edit3 className="size-4 mr-2" /> Quick edit
                  </DropdownMenuItem>
                  {!customer.is_active && (
                    <DropdownMenuItem
                      onClick={() => handleActivate(customer)}
                      disabled={activatingId === customer.id}
                    >
                      <CheckCircle2 className="size-4 mr-2" /> Activate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmDelete(customer)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 88,
        meta: { headerTitle: 'Actions' },
      },
    ],
    [activatingId, customerDialog, fetchCustomers, openCustomerDetails],
  );

  const table = useReactTable({
    columns,
    data: customers,
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
        title="Customers"
        subtitle="Manage customers, contacts, and billing — view wallet balances from each row."
        actions={
          canCreate && (
            <Button
              size="sm"
              variant="mono"
              onClick={() => customerDialog.openCreate({ onSuccess: () => fetchCustomers() })}
            >
              <UserPlus className="size-4 mr-1" /> New Customer
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

      <Card>
        <CardHeader className="py-3 border-b flex-col items-stretch gap-3">
          <div className="flex items-center justify-between gap-2 w-full">
            <CardTitle className="text-base font-semibold">All customers</CardTitle>
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
          <CardToolbar className="w-full flex-col sm:flex-row gap-3 p-0 border-0 min-h-0">
            <div className="relative flex-1 min-w-0 sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, email, or customer ID…"
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
              icon={UserPlus}
              title="No customers yet"
              description="Add your first customer to start managing sales and receivables."
              actionLabel="Add Customer"
              onAction={
                canCreate
                  ? () => customerDialog.openCreate({ onSuccess: () => fetchCustomers() })
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
        title={`Delete ${selectedCount} customer(s)?`}
        description="Customers with activity may be marked inactive instead of deleted."
        confirmLabel="Delete all"
        confirmVariant="destructive"
        onConfirm={() => runBulk('delete')}
        onCancel={() => setConfirmBulkDelete(false)}
        isLoading={bulkBusy}
      />

      {confirmDelete ? (
        <CustomerDeleteDialog
          customer={confirmDelete}
          open
          onOpenChange={(open) => {
            if (!open) setConfirmDelete(null);
          }}
          onDeleted={fetchCustomers}
        />
      ) : null}

      {detailsCustomerId != null ? (
        <CustomerDetailsSheet
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) setDetailsCustomerId(null);
          }}
          customerId={detailsCustomerId}
          workspaceId={workspaceId}
          onEdit={handleEditFromSheet}
          onListRefresh={fetchCustomers}
        />
      ) : null}
    </div>
  );
}
