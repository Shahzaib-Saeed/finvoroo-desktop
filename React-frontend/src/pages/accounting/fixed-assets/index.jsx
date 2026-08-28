import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Calculator,
  CalendarClock,
  ClipboardList,
  Edit3,
  Eye,
  FileText,
  History,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { fixedAssetsApi } from './api/fixed-assets.api';
import {
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  formatCurrency,
  formatStatus,
  STATUS_COLORS,
} from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataGridLayout } from '@/components/ui/data-grid-layout';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function FixedAssetsPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/fixed-assets`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    location: '',
    dateFrom: '',
    dateTo: '',
  });
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    fixedAssetsApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, per_page: pagination.perPage };
      if (filters.category && filters.category !== 'all') params.category = filters.category;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.location?.trim()) params.location = filters.location.trim();
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await fixedAssetsApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load fixed assets');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const columns = useMemo(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        cell: ({ row }) => {
          const a = row.original;
          return (
            <div>
              <Link
                to={`${base}/${a.id}`}
                className="font-medium text-sm text-primary hover:underline"
              >
                {a.asset_name}
              </Link>
              {a.asset_code && (
                <p className="text-xs text-muted-foreground mt-0.5">{a.asset_code}</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <span className="text-sm">{row.original.category || '—'}</span>,
      },
      {
        id: 'purchase_date',
        header: 'Purchase date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.purchase_date_display || row.original.purchase_date || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'purchase_cost',
        header: () => <span className="block text-right w-full">Cost</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right">
            {formatCurrency(row.original.purchase_cost)}
          </span>
        ),
      },
      {
        accessorKey: 'accumulated_depreciation',
        header: () => <span className="block text-right w-full">Accum. dep.</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right text-muted-foreground">
            {formatCurrency(row.original.accumulated_depreciation)}
          </span>
        ),
      },
      {
        accessorKey: 'net_book_value',
        header: () => <span className="block text-right w-full">Net book value</span>,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums block text-right">
            {formatCurrency(row.original.net_book_value)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = row.original.status || 'active';
          return (
            <Badge variant="outline" className={cn('capitalize', STATUS_COLORS[s] || '')}>
              {formatStatus(s)}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const a = row.original;
          const flags = a.flags || {};
          return (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" asChild>
                <Link to={`${base}/${a.id}`} title="View">
                  <Eye className="size-4" />
                </Link>
              </Button>
              {flags.can_edit && (
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`${base}/${a.id}/edit`} title="Edit">
                    <Edit3 className="size-4" />
                  </Link>
                </Button>
              )}
              <Button size="sm" variant="ghost" asChild>
                <Link to={`${base}/${a.id}/audit-trail`} title="Audit trail">
                  <History className="size-4" />
                </Link>
              </Button>
            </div>
          );
        },
        size: 120,
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
        title="Fixed assets"
        subtitle="Track capital assets, depreciation, and disposals."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/reports/asset-register`}>
                <ClipboardList className="size-4 mr-1" /> Asset register
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/reports/depreciation-schedule`}>
                <CalendarClock className="size-4 mr-1" /> Depreciation schedule
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/reports/net-book-value`}>
                <Calculator className="size-4 mr-1" /> NBV by category
              </Link>
            </Button>
            {canCreate && (
              <Button asChild>
                <Link to={`${base}/create`}>
                  <Plus className="size-4 mr-1" /> Add asset
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center flex-wrap">
          <Select
            value={filters.category}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, category: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ASSET_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, status: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {ASSET_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-[160px]"
            placeholder="Location"
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
            onBlur={() => setPagination((p) => ({ ...p, page: 1 }))}
          />
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

        {!loading && rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="size-10 mx-auto mb-3 opacity-40" />
            <p>No fixed assets yet.</p>
            <Button className="mt-4" asChild>
              <Link to={`${base}/create`}>Add your first asset</Link>
            </Button>
          </div>
        ) : (
          <DataGridLayout table={table} recordCount={pagination.total} isLoading={loading} />
        )}
      </div>
    </div>
  );
}
