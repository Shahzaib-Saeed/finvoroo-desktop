import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
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
  CheckCircle2,
  FileText,
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesOrdersApi } from './api/sales-orders.api';
import { formatCurrency, STATUS_COLORS, SALES_ORDER_STATUSES } from './constants';
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
import { DocumentActionConfirmDialog } from '../components/DocumentActionConfirmDialog';
import {
  confirmCompleteMessage,
  confirmCreateInvoiceMessage,
  confirmDeleteMessage,
  confirmEditMessage,
} from '../components/document-confirm-messages';
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
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

export function SalesOrdersPage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/sales-orders`;
  const invoiceBase = `/workspace/${workspaceId}/accounting/invoices`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // Page-level permission only — row-level actions come from each order's
  // own server-computed flags, never re-derived here.
  const [canCreate, setCanCreate] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });

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
      const params = {
        page: pagination.page,
        per_page: pagination.perPage,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await salesOrdersApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load sales orders');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    salesOrdersApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  const confirmMessage = useMemo(() => {
    const order = confirmAction?.order;
    if (!confirmAction || !order) return null;
    const num = order.so_number;
    switch (confirmAction.type) {
      case 'delete':
        return confirmDeleteMessage('sales order', num);
      case 'edit':
        return confirmEditMessage('sales order', num);
      case 'convert':
        return confirmCreateInvoiceMessage(num);
      case 'complete':
        return confirmCompleteMessage('sales order', num);
      default:
        return null;
    }
  }, [confirmAction]);

  const closeConfirm = () => {
    if (!actionLoading) setConfirmAction(null);
  };

  const runConfirmedAction = async () => {
    const order = confirmAction?.order;
    if (!confirmAction || !order) return;

    if (confirmAction.type === 'edit') {
      setConfirmAction(null);
      navigate(`${base}/${order.id}/edit`);
      return;
    }

    setActionLoading(true);
    try {
      if (confirmAction.type === 'delete') {
        await salesOrdersApi.delete(order.id);
        toast.success('Sales order deleted');
        setRowSelection({});
        fetchRows();
      } else if (confirmAction.type === 'complete') {
        const res = await salesOrdersApi.complete(order.id);
        toast.success(res.data?.message || 'Sales order marked complete');
        fetchRows();
      } else if (confirmAction.type === 'convert') {
        const res = await salesOrdersApi.convertToInvoice(order.id);
        const invoiceId = res.data?.data?.invoice_id;
        toast.success(res.data?.message || 'Invoice created from sales order');
        if (invoiceId) {
          navigate(`${invoiceBase}/${invoiceId}`);
          return;
        }
        fetchRows();
      }
      setConfirmAction(null);
    } catch (err) {
      const messages = {
        delete: 'Could not delete sales order',
        complete: 'Could not complete sales order',
        convert: 'Could not create invoice',
      };
      toast.error(err?.response?.data?.message || messages[confirmAction.type]);
    } finally {
      setActionLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({ search: '', status: 'all', dateFrom: '', dateTo: '' });
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
        accessorKey: 'so_number',
        header: 'SO #',
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="font-medium text-sm text-primary hover:text-primary/80"
          >
            {row.original.so_number || `SO-${row.original.id}`}
          </Link>
        ),
        size: 120,
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <span className="text-sm truncate block max-w-[220px]">
            {row.original.customer?.name || '—'}
          </span>
        ),
        size: 200,
      },
      {
        accessorKey: 'order_date_display',
        header: 'Order date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.order_date_display || row.original.order_date || '—'}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: 'ship_date_display',
        header: 'Ship date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.ship_date_display || row.original.ship_date || '—'}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(row.original.total, row.original.currency)}
          </span>
        ),
        size: 110,
      },
      {
        id: 'invoice',
        header: 'Invoice',
        cell: ({ row }) => {
          const inv = row.original.invoice;
          if (!inv?.id) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <Link
              to={`${invoiceBase}/${inv.id}/edit`}
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              {inv.invoice_number || '—'}
            </Link>
          );
        },
        size: 110,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = row.original.status || 'draft';
          const label =
            SALES_ORDER_STATUSES.find((x) => x.value === s)?.label || s;
          return (
            <Badge variant="outline" className={cn('capitalize', STATUS_COLORS[s] || '')}>
              {label}
            </Badge>
          );
        },
        size: 100,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const order = row.original;
          const flags = order.flags || {};
          const canEdit = flags.can_edit !== false && order.status !== 'cancelled';
          const canDelete = flags.can_delete !== false;
          const canComplete = flags.can_mark_complete === true;
          const canConvert = flags.can_convert_to_invoice === true;
          const busy = actionLoading;

          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="View"
                asChild
              >
                <Link to={`${base}/${order.id}`}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    className="size-8"
                    disabled={busy}
                  >
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={() => setConfirmAction({ type: 'edit', order })}
                      disabled={busy}
                    >
                      <Edit3 className="size-4 mr-2" /> Edit
                    </DropdownMenuItem>
                  )}
                  {canComplete && (
                    <DropdownMenuItem
                      onClick={() => setConfirmAction({ type: 'complete', order })}
                      disabled={busy}
                    >
                      <CheckCircle2 className="size-4 mr-2" /> Mark complete
                    </DropdownMenuItem>
                  )}
                  {canConvert && (
                    <DropdownMenuItem
                      onClick={() => setConfirmAction({ type: 'convert', order })}
                      disabled={busy}
                    >
                      <FileText className="size-4 mr-2" /> Create invoice
                    </DropdownMenuItem>
                  )}
                  {canDelete && (canEdit || canComplete || canConvert) && (
                    <DropdownMenuSeparator />
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmAction({ type: 'delete', order })}
                    >
                      <Trash2 className="size-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 88,
      },
    ],
    [base, actionLoading]
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
        title="Sales orders"
        subtitle="Customer orders before invoicing and fulfilment."
        actions={
          canCreate && (
            <Button asChild size="sm" variant="mono">
              <Link to={`${base}/create`}>
                <Plus className="size-4 mr-1" /> New sales order
              </Link>
            </Button>
          )
        }
      />

      <Card>
        <CardHeader className="py-3 border-b">
          <CardToolbar className="w-full flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search SO # or customer…"
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
                  <SelectItem value="all">All statuses</SelectItem>
                  {SALES_ORDER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DatePicker
                className="w-[160px] h-9"
                value={filters.dateFrom}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateFrom: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="From date"
              />
              <DatePicker
                className="w-[160px] h-9"
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

      <DocumentActionConfirmDialog
        open={!!confirmAction}
        message={confirmMessage}
        isLoading={actionLoading}
        onConfirm={runConfirmedAction}
        onCancel={closeConfirm}
      />
    </div>
  );
}
