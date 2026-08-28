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
  Trash2,
  Eye,
  EllipsisVertical,
  Filter,
  X,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { deliveryNotesApi } from './api/delivery-notes.api';
import { DELIVERY_NOTE_STATUSES, STATUS_COLORS } from './constants';
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
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

export function DeliveryNotesPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/delivery-notes`;
  const salesOrderBase = `/workspace/${workspaceId}/accounting/sales-orders`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
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
    dateFrom: '',
    dateTo: '',
  });
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    deliveryNotesApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, per_page: pagination.perPage };
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await deliveryNotesApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load delivery notes');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const resetFilters = () => {
    setFilters({ search: '', status: 'all', dateFrom: '', dateTo: '' });
    setSearchInput('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await deliveryNotesApi.delete(confirmDelete.id);
      toast.success('Delivery note deleted');
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete delivery note');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'dn_number',
        header: 'DN #',
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="font-medium font-mono text-sm text-primary hover:text-primary/80 hover:underline"
          >
            {row.original.dn_number || '—'}
          </Link>
        ),
        size: 120,
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <span className="text-sm truncate">{row.original.customer?.name || '—'}</span>
        ),
        size: 160,
      },
      {
        id: 'sales_order',
        header: 'Sales order',
        cell: ({ row }) => {
          const so = row.original.sales_order;
          if (!so?.id) return <span className="text-muted-foreground">—</span>;
          return (
            <Link
              to={`${salesOrderBase}/${so.id}`}
              className="text-sm text-primary hover:underline font-mono"
            >
              {so.so_number || `#${so.id}`}
            </Link>
          );
        },
        size: 130,
      },
      {
        accessorKey: 'delivery_date_display',
        header: 'Delivery date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.delivery_date_display || row.original.delivery_date || '—'}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status || 'draft';
          const label =
            DELIVERY_NOTE_STATUSES.find((s) => s.value === status)?.label || status;
          return (
            <Badge
              variant="outline"
              className={cn('rounded-full capitalize', STATUS_COLORS[status] || STATUS_COLORS.draft)}
            >
              {label}
            </Badge>
          );
        },
        size: 110,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        meta: { headerClassName: 'text-center', cellClassName: 'text-center' },
        cell: ({ row }) => {
          const note = row.original;
          const flags = note.flags || {};
          const hasMenu = flags.can_delete;

          return (
            <div className="flex justify-center">
              <div className="inline-grid grid-cols-[2rem_2rem] items-center gap-0.5">
                <Button variant="ghost" size="icon" className="size-8" asChild title="View">
                  <Link to={`${base}/${note.id}`}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
                {hasMenu ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" mode="icon" size="sm" className="size-8">
                        <EllipsisVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => setConfirmDelete(note)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="size-8 shrink-0" aria-hidden="true" />
                )}
              </div>
            </div>
          );
        },
        size: 100,
      },
    ],
    [base, salesOrderBase],
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
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery notes"
        subtitle="Record shipments against sales orders before invoicing."
        actions={
          canCreate && (
            <Button size="sm" variant="mono" asChild>
              <Link to={`${salesOrderBase}`}>
                <Truck className="size-4 mr-1" /> Deliver from sales order
              </Link>
            </Button>
          )
        }
      />

      <Card>
        <CardHeader className="py-3 border-b">
          <CardToolbar className="w-full flex-col xl:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search DN #, customer, or SO…"
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
                  onClick={() => setSearchInput('')}
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
                  <SelectItem value="all">All status</SelectItem>
                  {DELIVERY_NOTE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DatePicker
                className="w-[200px]"
                placeholder="From"
                value={filters.dateFrom}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateFrom: v || '' }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
              <DatePicker
                className="w-[200px]"
                placeholder="To"
                value={filters.dateTo}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateTo: v || '' }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
              <Button variant="outline" size="icon" className="size-9" onClick={resetFilters} title="Reset filters">
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

      <AlertDialog open={!!confirmDelete} onOpenChange={() => !isDeleting && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete delivery note?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {confirmDelete?.dn_number}? Only draft delivery notes can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
