import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fixedAssetsApi } from '../api/fixed-assets.api';
import {
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  formatCurrency,
  formatStatus,
  STATUS_COLORS,
} from '../constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataGridLayout } from '@/components/ui/data-grid-layout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function FixedAssetRegisterReportPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/fixed-assets`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    location: '',
  });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { per_page: 100, page: 1 };
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.location?.trim()) params.location = filters.location.trim();

      const res = await fixedAssetsApi.list(params);
      let items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      if (meta.last_page > 1) {
        const pages = [];
        for (let p = 2; p <= meta.last_page; p += 1) pages.push(p);
        const rest = await Promise.all(
          pages.map((page) => fixedAssetsApi.list({ ...params, page }))
        );
        rest.forEach((r) => {
          const chunk = r.data?.data ?? [];
          if (Array.isArray(chunk)) items = items.concat(chunk);
        });
      }
      items.sort((a, b) => {
        const c = (a.category || '').localeCompare(b.category || '');
        if (c !== 0) return c;
        return (a.asset_name || '').localeCompare(b.asset_name || '');
      });
      setRows(items);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load asset register');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const columns = useMemo(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {row.original.asset_name}
          </Link>
        ),
      },
      { accessorKey: 'category', header: 'Category' },
      {
        accessorKey: 'purchase_date_display',
        header: 'Purchase date',
        cell: ({ row }) => row.original.purchase_date_display || row.original.purchase_date,
      },
      {
        accessorKey: 'purchase_cost',
        header: () => <span className="block text-right w-full">Cost</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {formatCurrency(row.original.purchase_cost)}
          </span>
        ),
      },
      {
        accessorKey: 'accumulated_depreciation',
        header: () => <span className="block text-right w-full">Accum. dep.</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-muted-foreground">
            {formatCurrency(row.original.accumulated_depreciation)}
          </span>
        ),
      },
      {
        accessorKey: 'net_book_value',
        header: () => <span className="block text-right w-full">NBV</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums font-medium">
            {formatCurrency(row.original.net_book_value)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = row.original.status;
          return (
            <Badge variant="outline" className={cn('capitalize', STATUS_COLORS[s] || '')}>
              {formatStatus(s)}
            </Badge>
          );
        },
      },
    ],
    [base]
  );

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Asset register"
        subtitle="Complete listing of fixed assets for reporting."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select
            value={filters.category}
            onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
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
            onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
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
            onBlur={fetchRows}
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <DataGridLayout table={table} recordCount={rows.length} showPagination={false} />
        )}
      </div>
    </div>
  );
}
