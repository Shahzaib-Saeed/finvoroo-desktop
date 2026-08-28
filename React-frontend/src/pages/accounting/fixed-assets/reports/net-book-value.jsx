import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fixedAssetsApi } from '../api/fixed-assets.api';
import { formatCurrency } from '../constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { DataGridLayout } from '@/components/ui/data-grid-layout';

export function FixedAssetNbvByCategoryPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/fixed-assets`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const statuses = ['active', 'under_maintenance'];
        let assets = [];
        for (const status of statuses) {
          const res = await fixedAssetsApi.list({ status, per_page: 100, page: 1 });
          let items = res.data?.data ?? [];
          const meta = res.data?.meta ?? {};
          for (let p = 2; p <= (meta.last_page || 1); p += 1) {
            const r = await fixedAssetsApi.list({ status, per_page: 100, page: p });
            const chunk = r.data?.data ?? [];
            if (Array.isArray(chunk)) items = items.concat(chunk);
          }
          assets = assets.concat(items);
        }

        const byCategory = {};
        assets.forEach((a) => {
          const cat = a.category || 'Uncategorized';
          if (!byCategory[cat]) {
            byCategory[cat] = { category: cat, count: 0, cost: 0, accumulated_depreciation: 0, net_book_value: 0 };
          }
          byCategory[cat].count += 1;
          byCategory[cat].cost += Number(a.purchase_cost || 0);
          byCategory[cat].accumulated_depreciation += Number(a.accumulated_depreciation || 0);
          const nbv =
            a.net_book_value ??
            Number(a.purchase_cost || 0) - Number(a.accumulated_depreciation || 0);
          byCategory[cat].net_book_value += Number(nbv || 0);
        });

        const summary = Object.values(byCategory).sort((a, b) =>
          a.category.localeCompare(b.category)
        );
        setRows(summary);
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to load NBV report');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns = useMemo(
    () => [
      { accessorKey: 'category', header: 'Category' },
      {
        accessorKey: 'count',
        header: () => <span className="block text-right w-full">Assets</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">{row.original.count}</span>
        ),
      },
      {
        accessorKey: 'cost',
        header: () => <span className="block text-right w-full">Total cost</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {formatCurrency(row.original.cost)}
          </span>
        ),
      },
      {
        accessorKey: 'accumulated_depreciation',
        header: () => <span className="block text-right w-full">Accum. depreciation</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-muted-foreground">
            {formatCurrency(row.original.accumulated_depreciation)}
          </span>
        ),
      },
      {
        accessorKey: 'net_book_value',
        header: () => <span className="block text-right w-full">Net book value</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums font-semibold text-primary">
            {formatCurrency(row.original.net_book_value)}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
  });

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          count: acc.count + r.count,
          cost: acc.cost + r.cost,
          accumulated_depreciation: acc.accumulated_depreciation + r.accumulated_depreciation,
          net_book_value: acc.net_book_value + r.net_book_value,
        }),
        { count: 0, cost: 0, accumulated_depreciation: 0, net_book_value: 0 }
      ),
    [rows]
  );

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="NBV by category"
        subtitle="Net book value summary for active and under-maintenance assets."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No active assets to summarize.
          </p>
        ) : (
          <>
            <DataGridLayout table={table} recordCount={rows.length} showPagination={false} />
            <div className="flex flex-wrap justify-end gap-6 border-t pt-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total assets: </span>
                <strong>{totals.count}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Total NBV: </span>
                <strong className="text-primary">{formatCurrency(totals.net_book_value)}</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
