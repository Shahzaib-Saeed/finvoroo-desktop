import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { productionOrdersApi } from './api/production-orders.api';
import { downloadProductionOrdersCsv } from './lib/export-csv';
import {
  PO_STATUSES,
  PO_STATUS_COLORS,
  formatCurrency,
  formatProductionProductName,
  formatStatus,
} from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGridLayout } from '@/components/ui/data-grid-layout';
import { DatePicker } from '@/components/ui/date-picker';
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
import { cn } from '@/lib/utils';

export function ProductionOrdersPage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/production-orders`;

  const [rows, setRows] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
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
    product_id: 'all',
    shortage: false,
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
      if (filters.product_id && filters.product_id !== 'all') {
        params.product_id = filters.product_id;
      }
      if (filters.shortage) params.shortage = true;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await productionOrdersApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);

      if (finishedProducts.length === 0 && items.length) {
        const prods = new Map();
        items.forEach((o) => {
          if (o.product) prods.set(o.product.id, o.product);
        });
        setFinishedProducts([...prods.values()]);
      }

      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load production orders');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters, finishedProducts.length]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    productionOrdersApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.product_id !== 'all') params.product_id = filters.product_id;
      if (filters.shortage) params.shortage = true;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      await downloadProductionOrdersCsv(params);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleBulkStatus = async () => {
    if (!selectedIds.length || !bulkStatus) return;
    setBulkApplying(true);
    try {
      const res = await productionOrdersApi.bulkStatus({
        ids: selectedIds,
        status: bulkStatus,
      });
      toast.success(res.data?.message || 'Status updated');
      setSelectedIds([]);
      setBulkStatus('');
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk update failed');
    } finally {
      setBulkApplying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await productionOrdersApi.destroy(confirmDelete.id);
      toast.success(res.data?.message || 'Order deleted');
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete order');
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await productionOrdersApi.duplicate(id);
      toast.success(res.data?.message || 'Order duplicated');
      const newId = res.data?.data?.id;
      if (newId) {
        navigate(`${base}/${newId}`);
      } else {
        fetchRows();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Duplicate failed');
    }
  };

  const toggleSelect = (id, checked) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: () => null,
        cell: ({ row }) => {
          const o = row.original;
          const flags = o.flags || {};
          if (!flags.can_edit && o.status !== 'draft' && o.status !== 'planned') return null;
          return (
            <Checkbox
              checked={selectedIds.includes(o.id)}
              onCheckedChange={(c) => toggleSelect(o.id, !!c)}
            />
          );
        },
        size: 40,
      },
      {
        accessorKey: 'po_number',
        header: 'Order #',
        cell: ({ row }) => (
          <Link to={`${base}/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.po_number}
          </Link>
        ),
      },
      {
        id: 'product',
        header: 'Product',
        cell: ({ row }) => (
          <span className="text-sm block truncate">
            {formatProductionProductName(row.original.product)}
          </span>
        ),
      },
      {
        id: 'qty',
        header: () => <span className="block text-right w-full">Quantity</span>,
        cell: ({ row }) => (
          <span className="block text-right text-sm tabular-nums">
            {Number(row.original.quantity).toLocaleString()} {row.original.uom || 'pcs'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = row.original.status;
          return (
            <Badge variant="outline" className={cn('capitalize', PO_STATUS_COLORS[s] || '')}>
              {formatStatus(s)}
            </Badge>
          );
        },
      },
      {
        id: 'shortage',
        header: () => <span className="block text-center w-full">Shortage</span>,
        cell: ({ row }) =>
          row.original.material_shortage_count > 0 ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
              {row.original.material_shortage_count}
            </Badge>
          ) : (
            <span className="block text-center text-muted-foreground">—</span>
          ),
      },
      {
        id: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.production_date_display || row.original.production_date}
          </span>
        ),
      },
      {
        accessorKey: 'total_cost',
        header: () => <span className="block text-right w-full">Total cost</span>,
        cell: ({ row }) => (
          <span className="block text-right text-sm font-medium tabular-nums">
            {formatCurrency(
              Number(row.original.total_cost || 0) + Number(row.original.production_overhead || 0)
            )}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const o = row.original;
          const flags = o.flags || {};
          return (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" asChild>
                <Link to={`${base}/${o.id}`}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              {flags.can_edit && (
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`${base}/${o.id}/edit`}>
                    <Edit3 className="size-4" />
                  </Link>
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => handleDuplicate(o.id)} title="Duplicate">
                <Copy className="size-4" />
              </Button>
              {flags.can_delete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(o)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          );
        },
        size: 140,
      },
    ],
    [base, selectedIds]
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
        title="Production orders"
        subtitle="Manufacturing orders, BOM, and completion."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="size-4 mr-1" />
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            {canCreate && (
              <Button asChild>
                <Link to={`${base}/create`}>
                  <Plus className="size-4 mr-1" /> Create order
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Order # or product…"
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
            value={filters.product_id}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, product_id: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {finishedProducts.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={filters.shortage}
              onCheckedChange={(c) => {
                setFilters((f) => ({ ...f, shortage: !!c }));
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
            Has shortage
          </label>
          <DatePicker
            className="w-[180px]"
            value={filters.dateFrom}
            onChange={(v) => {
              setFilters((f) => ({ ...f, dateFrom: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            placeholder="From"
          />
          <DatePicker
            className="w-[180px]"
            value={filters.dateTo}
            onChange={(v) => {
              setFilters((f) => ({ ...f, dateTo: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            placeholder="To"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-md bg-muted/40 border">
            <span className="text-sm">{selectedIds.length} selected</span>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Change status to…" />
              </SelectTrigger>
              <SelectContent>
                {PO_STATUSES.filter((s) => s.value !== 'all').map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleBulkStatus} disabled={!bulkStatus || bulkApplying}>
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        )}

        {!loading && rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="size-10 mx-auto mb-3 opacity-40" />
            <p>No production orders found.</p>
            <Button className="mt-4" asChild>
              <Link to={`${base}/create`}>Create one</Link>
            </Button>
          </div>
        ) : (
          <DataGridLayout table={table} recordCount={pagination.total} isLoading={loading} />
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete production order?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete order {confirmDelete?.po_number}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
