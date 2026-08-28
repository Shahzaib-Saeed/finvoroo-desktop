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
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { quotationsApi } from './api/quotations.api';
import { formatCurrency, STATUS_COLORS, QUOTATION_STATUSES } from './constants';
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
import { tryLoadOfflineDocumentList } from '@/offline/form-lookups';

export function QuotationsPage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/quotations`;
  const salesOrderBase = `/workspace/${workspaceId}/accounting/sales-orders`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    quotationsApi
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
      const params = {
        page: pagination.page,
        per_page: pagination.perPage,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await quotationsApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      const local = await tryLoadOfflineDocumentList(workspaceId, 'quotation', {
        search: filters.search,
        status: filters.status,
      });
      if (local) {
        setRows(local);
        setPagination((p) => ({ ...p, total: local.length, lastPage: 1 }));
        setCanCreate(true);
        toast.message('Showing offline draft quotations — sync when you reconnect');
        return;
      }
      toast.error(err?.response?.data?.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters, workspaceId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const confirmMessage = useMemo(() => {
    const q = confirmAction?.quotation;
    if (!confirmAction || !q) return null;
    const num = q.quote_number;
    if (confirmAction.type === 'delete') {
      return confirmDeleteMessage('quotation', num);
    }
    if (confirmAction.type === 'edit') {
      return confirmEditMessage('quotation', num);
    }
    return null;
  }, [confirmAction]);

  const closeConfirm = () => {
    if (!actionLoading) setConfirmAction(null);
  };

  const runConfirmedAction = async () => {
    const q = confirmAction?.quotation;
    if (!confirmAction || !q) return;

    if (confirmAction.type === 'edit') {
      setConfirmAction(null);
      navigate(`${base}/${q.id}/edit`);
      return;
    }

    setActionLoading(true);
    try {
      await quotationsApi.delete(q.id);
      toast.success('Quotation deleted');
      setRowSelection({});
      fetchRows();
      setConfirmAction(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete quotation');
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
        accessorKey: 'quote_number',
        header: 'Quote #',
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="font-medium text-sm text-primary hover:text-primary/80"
          >
            {row.original.quote_number || `QT-${row.original.id}`}
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
        accessorKey: 'quote_date_display',
        header: 'Quote date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.quote_date_display || row.original.quote_date || '—'}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: 'expiry_date_display',
        header: 'Expiry',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.expiry_date_display || row.original.expiry_date || '—'}
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
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = row.original.status || 'draft';
          const label =
            QUOTATION_STATUSES.find((x) => x.value === s)?.label || s;
          return (
            <Badge variant="outline" className={cn('capitalize', STATUS_COLORS[s] || '')}>
              {label}
            </Badge>
          );
        },
        size: 100,
      },
      {
        id: 'sales_order',
        header: 'Sales order',
        cell: ({ row }) => {
          const so = row.original.sales_order;
          if (!so?.id) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <Link
              to={`${salesOrderBase}/${so.id}`}
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              {so.so_number || `SO-${so.id}`}
            </Link>
          );
        },
        size: 110,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const q = row.original;
          const canEdit =
            q.flags?.can_edit !== false &&
            q.status !== 'cancelled' &&
            q.status !== 'converted';
          const canDelete =
            q.flags?.can_delete !== false && q.status !== 'converted';

          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="View"
                asChild
              >
                <Link to={`${base}/${q.id}`}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" mode="icon" size="sm" className="size-8">
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={() => setConfirmAction({ type: 'edit', quotation: q })}
                    >
                      <Edit3 className="size-4 mr-2" /> Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && canEdit && <DropdownMenuSeparator />}
                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmAction({ type: 'delete', quotation: q })}
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
    [base, salesOrderBase]
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
        title="Quotations"
        subtitle="Estimates and price proposals sent to customers."
        actions={
          canCreate && (
            <Button asChild size="sm" variant="mono">
              <Link to={`${base}/create`}>
                <Plus className="size-4 mr-1" /> New quotation
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
                placeholder="Search quote # or customer…"
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
                  {QUOTATION_STATUSES.map((s) => (
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
