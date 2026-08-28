import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { Plus, Search, Edit3, Eye, MoreHorizontal, Trash2, FileInput } from 'lucide-react';
import { toast } from 'sonner';
import { tryLoadOfflineDocumentList } from '@/offline/form-lookups';
import { purchaseOrdersApi } from './api/purchase-orders.api';
import {
  formatCurrency,
  STATUS_COLORS,
  PO_STATUSES,
  APPROVAL_STATUSES,
  APPROVAL_COLORS,
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
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

export function PurchaseOrdersPage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/purchase-orders`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // Page-level permission only — row-level actions come from each PO's own
  // server-computed flags, never re-derived here.
  const [canCreate, setCanCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
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
    approval: 'all',
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
      const params = { page: pagination.page, per_page: pagination.perPage };
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.approval && filters.approval !== 'all') {
        params.approval_status = filters.approval;
      }
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await purchaseOrdersApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      const local = await tryLoadOfflineDocumentList(workspaceId, 'purchase_order', {
        search: filters.search,
        status: filters.status,
      });
      if (local) {
        setRows(local);
        setPagination((p) => ({ ...p, total: local.length, lastPage: 1 }));
        setCanCreate(true);
        toast.message('Showing offline draft POs — sync when you reconnect');
        return;
      }
      toast.error(err?.response?.data?.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters, workspaceId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    purchaseOrdersApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await purchaseOrdersApi.delete(confirmDelete.id);
      toast.success('Purchase order deleted');
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete purchase order');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConvert = async (po) => {
    setConvertingId(po.id);
    try {
      const res = await purchaseOrdersApi.convertToBill(po.id);
      toast.success(res.data?.message || 'Converted to bill');
      const billId = res.data?.data?.bill_id;
      if (billId) {
        navigate(`/workspace/${workspaceId}/accounting/bills/${billId}`);
      } else {
        fetchRows();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not convert to bill');
    } finally {
      setConvertingId(null);
    }
  };

  const statusBadge = (row) => {
    const approval = row.approval_status || 'approved';
    if (approval === 'pending') {
      return (
        <Badge variant="outline" className={cn(APPROVAL_COLORS.pending)}>
          Pending approval
        </Badge>
      );
    }
    if (approval === 'rejected') {
      return (
        <Badge variant="outline" className={cn(APPROVAL_COLORS.rejected)}>
          Rejected
        </Badge>
      );
    }
    const s = row.status || 'draft';
    return (
      <Badge variant="outline" className={cn('capitalize', STATUS_COLORS[s] || '')}>
        {s}
      </Badge>
    );
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'po_number',
        header: 'PO #',
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="font-medium text-sm text-primary hover:underline"
          >
            {row.original.po_number || `#${row.original.id}`}
          </Link>
        ),
      },
      {
        id: 'vendor',
        header: 'Vendor',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.vendor?.name || '—'}</span>
        ),
      },
      {
        accessorKey: 'order_date_display',
        header: 'Order date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.order_date_display || row.original.order_date || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'expected_delivery_display',
        header: 'Expected',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.expected_delivery_display ||
              row.original.expected_delivery ||
              '—'}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: () => <span className="block text-right w-full">Total</span>,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums block text-right">
            {formatCurrency(row.original.total)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => statusBadge(row.original),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const po = row.original;
          const flags = po.flags || {};
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`${base}/${po.id}`}>
                      <Eye className="size-4 mr-2" /> View
                    </Link>
                  </DropdownMenuItem>
                  {flags.can_edit && (
                    <DropdownMenuItem asChild>
                      <Link to={`${base}/${po.id}/edit`}>
                        <Edit3 className="size-4 mr-2" /> Edit
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {flags.can_convert_to_bill && (
                    <DropdownMenuItem
                      onClick={() => handleConvert(po)}
                      disabled={convertingId === po.id}
                    >
                      <FileInput className="size-4 mr-2" /> Convert to bill
                    </DropdownMenuItem>
                  )}
                  {po.bill_id && (
                    <DropdownMenuItem asChild>
                      <Link
                        to={`/workspace/${workspaceId}/accounting/bills/${po.bill_id}`}
                      >
                        <FileInput className="size-4 mr-2" /> View bill
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {flags.can_delete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmDelete(po)}
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
    [base, workspaceId, convertingId]
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
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Purchase orders"
        subtitle="Create POs for vendors and convert them to bills when goods arrive."
        actions={
          canCreate && (
            <Button asChild>
              <Link to={`${base}/create`}>
                <Plus className="size-4 mr-1" /> Create PO
              </Link>
            </Button>
          )
        }
      />

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center flex-wrap">
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search PO # or vendor…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
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
              {PO_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.approval}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, approval: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[160px]">
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
            className="w-[200px]"
            value={filters.dateFrom}
            onChange={(v) => {
              setFilters((f) => ({ ...f, dateFrom: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            placeholder="From date"
          />
          <DatePicker
            className="w-[200px]"
            value={filters.dateTo}
            onChange={(v) => {
              setFilters((f) => ({ ...f, dateTo: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            placeholder="To date"
          />
        </div>
        <DataGridLayout table={table} recordCount={pagination.total} isLoading={loading} />
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => !isDeleting && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete purchase order?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {confirmDelete?.po_number}? This cannot be undone.
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
