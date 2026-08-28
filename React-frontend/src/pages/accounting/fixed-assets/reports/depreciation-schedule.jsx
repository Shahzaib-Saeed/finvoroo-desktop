import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { ArrowLeft, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { fixedAssetsApi } from '../api/fixed-assets.api';
import { calculateDepreciationForPeriod, currentYearMonth, formatCurrency } from '../constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { DataGridLayout } from '@/components/ui/data-grid-layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function periodEndDate(period) {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return null;
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

export function FixedAssetDepreciationSchedulePage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/fixed-assets`;

  const [period, setPeriod] = useState(currentYearMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmRun, setConfirmRun] = useState(false);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const end = periodEndDate(period);
      const res = await fixedAssetsApi.list({
        status: 'active',
        per_page: 100,
        page: 1,
        date_to: end || undefined,
      });
      let assets = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      if (meta.last_page > 1) {
        for (let p = 2; p <= meta.last_page; p += 1) {
          const r = await fixedAssetsApi.list({
            status: 'active',
            per_page: 100,
            page: p,
            date_to: end || undefined,
          });
          const chunk = r.data?.data ?? [];
          if (Array.isArray(chunk)) assets = assets.concat(chunk);
        }
      }

      const schedule = assets
        .map((asset) => {
          const amount = calculateDepreciationForPeriod(asset, period);
          const accum = Number(asset.accumulated_depreciation || 0);
          return {
            asset,
            amount,
            accumulated: accum + amount,
            nbv: Number(asset.purchase_cost || 0) - accum - amount,
          };
        })
        .filter((row) => row.amount > 0)
        .sort((a, b) =>
          (a.asset.asset_name || '').localeCompare(b.asset.asset_name || '')
        );

      setRows(schedule);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load depreciation schedule');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleRunDepreciation = async () => {
    setRunning(true);
    try {
      const res = await fixedAssetsApi.runDepreciation({ period });
      const count = res.data?.data?.processed_count;
      toast.success(
        res.data?.message ||
          `Depreciation processed${count != null ? ` (${count} assets)` : ''}.`
      );
      setConfirmRun(false);
      fetchSchedule();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to run depreciation');
    } finally {
      setRunning(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.asset.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {row.original.asset.asset_name}
          </Link>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => row.original.asset.category,
      },
      {
        id: 'cost',
        header: () => <span className="block text-right w-full">Cost</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {formatCurrency(row.original.asset.purchase_cost)}
          </span>
        ),
      },
      {
        id: 'accum',
        header: () => <span className="block text-right w-full">Accumulated</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-muted-foreground">
            {formatCurrency(row.original.asset.accumulated_depreciation)}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: () => (
          <span className="block text-right w-full">Depreciation {period}</span>
        ),
        cell: ({ row }) => (
          <span className="block text-right tabular-nums font-semibold">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'nbv',
        header: () => <span className="block text-right w-full">NBV after</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {formatCurrency(row.original.nbv)}
          </span>
        ),
      },
    ],
    [base, period]
  );

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Depreciation schedule"
        subtitle="Preview monthly depreciation and run bulk posting for a period."
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Link>
            </Button>
            <Button size="sm" onClick={() => setConfirmRun(true)} disabled={running}>
              <Play className="size-4 mr-1" />
              Run depreciation for {period}
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="period">Period</Label>
            <Input
              id="period"
              type="month"
              className="w-[180px]"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No active assets with depreciation due for {period}.
          </p>
        ) : (
          <DataGridLayout table={table} recordCount={rows.length} showPagination={false} />
        )}
      </div>

      <AlertDialog open={confirmRun} onOpenChange={setConfirmRun}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run depreciation for {period}?</AlertDialogTitle>
            <AlertDialogDescription>
              This posts depreciation journal entries for all eligible active assets in this
              period. Assets already depreciated for {period} are skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRunDepreciation} disabled={running}>
              {running ? 'Processing…' : 'Run depreciation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
