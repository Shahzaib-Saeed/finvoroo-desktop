import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  ArrowLeft,
  Edit3,
  History,
  Loader2,
  Trash2,
  TrendingDown,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { fixedAssetsApi } from './api/fixed-assets.api';
import {
  depreciationMethodLabel,
  formatCurrency,
  formatStatus,
  STATUS_COLORS,
} from './constants';
import { RetireAssetDialog } from './components/RetireAssetDialog';
import { SellAssetDialog } from './components/SellAssetDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataGridLayout } from '@/components/ui/data-grid-layout';
import { cn } from '@/lib/utils';

function DetailRow({ label, children }) {
  return (
    <tr>
      <td className="text-muted-foreground align-top pe-4 py-2 w-1/3 text-sm">{label}</td>
      <td className="py-2 text-sm font-medium">{children}</td>
    </tr>
  );
}

export function FixedAssetShowPage() {
  const { id: workspaceId, assetId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/fixed-assets`;
  const journalBase = `/workspace/${workspaceId}/accounting/journal`;
  const jobBase = `/workspace/${workspaceId}/accounting/job-orders`;

  const [asset, setAsset] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retireOpen, setRetireOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  const load = () => {
    setLoading(true);
    fixedAssetsApi
      .show(assetId)
      .then((res) => {
        const data = res.data?.data || {};
        setAsset(data.asset || null);
        setSchedule(Array.isArray(data.schedule) ? data.schedule : []);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load fixed asset');
        setAsset(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [assetId]);

  const flags = asset?.flags || {};
  const depreciations = asset?.depreciations || [];
  const jobOrders = asset?.job_orders || [];
  const projectedSchedule = schedule.slice(0, 24);

  const historyColumns = useMemo(
    () => [
      { accessorKey: 'period', header: 'Period' },
      {
        id: 'date',
        header: 'Date',
        cell: ({ row }) => row.original.depreciation_date_display || row.original.depreciation_date,
      },
      {
        accessorKey: 'amount',
        header: () => <span className="block text-right w-full">Amount</span>,
        cell: ({ row }) => (
          <span className="tabular-nums block text-right">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'accumulated_after',
        header: () => <span className="block text-right w-full">Accumulated</span>,
        cell: ({ row }) => (
          <span className="tabular-nums block text-right text-muted-foreground">
            {formatCurrency(row.original.accumulated_after)}
          </span>
        ),
      },
      {
        id: 'journal',
        header: 'Journal',
        cell: ({ row }) => {
          const je = row.original.journal_entry_id;
          if (!je) return '—';
          return (
            <Link to={`${journalBase}/${je}`} className="text-primary hover:underline text-sm">
              #{je}
            </Link>
          );
        },
      },
    ],
    [journalBase]
  );

  const projectedColumns = useMemo(
    () => [
      { accessorKey: 'period', header: 'Period' },
      { accessorKey: 'date', header: 'Date' },
      {
        accessorKey: 'amount',
        header: () => <span className="block text-right w-full">Amount</span>,
        cell: ({ row }) => (
          <span className="tabular-nums block text-right">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'accumulated',
        header: () => <span className="block text-right w-full">Accumulated</span>,
        cell: ({ row }) => (
          <span className="tabular-nums block text-right text-muted-foreground">
            {formatCurrency(row.original.accumulated)}
          </span>
        ),
      },
      {
        accessorKey: 'net_book_value',
        header: () => <span className="block text-right w-full">Net book value</span>,
        cell: ({ row }) => (
          <span className="tabular-nums block text-right font-medium">
            {formatCurrency(row.original.net_book_value)}
          </span>
        ),
      },
    ],
    []
  );

  const historyTable = useReactTable({
    columns: historyColumns,
    data: depreciations,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const projectedTable = useReactTable({
    columns: projectedColumns,
    data: projectedSchedule,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        Loading asset…
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Fixed asset not found.</p>
        <Button asChild variant="outline">
          <Link to={base}>Back to list</Link>
        </Button>
      </div>
    );
  }

  const status = asset.status || 'active';

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={asset.asset_name}
        subtitle="Fixed asset register record and carrying amounts."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/${assetId}/audit-trail`}>
                <History className="size-4 mr-1" /> Audit trail
              </Link>
            </Button>
            {flags.can_create_maintenance_job && (
              <Button size="sm" asChild>
                <Link to={`${jobBase}/create?from_fixed_asset=${assetId}`}>
                  <Wrench className="size-4 mr-1" /> Maintenance job
                </Link>
              </Button>
            )}
            {flags.can_edit && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`${base}/${assetId}/edit`}>
                  <Edit3 className="size-4 mr-1" /> Edit
                </Link>
              </Button>
            )}
            {flags.can_sell && (
              <Button variant="outline" size="sm" onClick={() => setSellOpen(true)}>
                <TrendingDown className="size-4 mr-1" /> Sell
              </Button>
            )}
            {flags.can_retire && (
              <Button variant="destructive" size="sm" onClick={() => setRetireOpen(true)}>
                <Trash2 className="size-4 mr-1" /> Retire
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">{asset.asset_name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Fixed asset register record and carrying amounts.
            </p>
          </div>
          <Badge variant="outline" className={cn('capitalize', STATUS_COLORS[status] || '')}>
            {formatStatus(status)}
          </Badge>
        </div>
        <div className="p-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-4">
            <h3 className="text-sm font-semibold mb-3">Asset details</h3>
            <table className="w-full">
              <tbody>
                <DetailRow label="Code">{asset.asset_code || '—'}</DetailRow>
                <DetailRow label="Category">{asset.category}</DetailRow>
                <DetailRow label="Purchase date">
                  {asset.purchase_date_display || asset.purchase_date}
                </DetailRow>
                <DetailRow label="Vendor">{asset.vendor?.name || '—'}</DetailRow>
                <DetailRow label="Location">{asset.location || '—'}</DetailRow>
                <DetailRow label="Serial / reg">
                  {asset.serial_number || asset.registration_number || '—'}
                </DetailRow>
                <DetailRow label="Warranty">
                  {asset.warranty_expiry_display || asset.warranty_expiry || '—'}
                </DetailRow>
                {status === 'sold' && (
                  <>
                    <DetailRow label="Sale date">
                      {asset.sale_date_display || asset.sale_date}
                    </DetailRow>
                    <DetailRow label="Sale price">
                      {formatCurrency(asset.sale_price)}
                    </DetailRow>
                  </>
                )}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <h3 className="text-sm font-semibold mb-3">Accounting</h3>
            <table className="w-full">
              <tbody>
                <DetailRow label="Purchase cost">
                  {formatCurrency(asset.purchase_cost)}
                </DetailRow>
                <DetailRow label="Accum. depreciation">
                  {formatCurrency(asset.accumulated_depreciation)}
                </DetailRow>
                <DetailRow label="Net book value">
                  <span className="text-primary text-base font-bold">
                    {formatCurrency(asset.net_book_value)}
                  </span>
                </DetailRow>
                <DetailRow label="Useful life">
                  {asset.useful_life_years} years
                </DetailRow>
                <DetailRow label="Salvage value">
                  {formatCurrency(asset.salvage_value)}
                </DetailRow>
                <DetailRow label="Method">
                  {depreciationMethodLabel(asset.depreciation_method)}
                </DetailRow>
                {asset.purchase_journal_entry_id && (
                  <DetailRow label="Purchase JE">
                    <Link
                      to={`${journalBase}/${asset.purchase_journal_entry_id}`}
                      className="text-primary hover:underline"
                    >
                      #{asset.purchase_journal_entry_id}
                    </Link>
                  </DetailRow>
                )}
                {asset.sale_journal_entry_id && (
                  <DetailRow label="Sale / retire JE">
                    <Link
                      to={`${journalBase}/${asset.sale_journal_entry_id}`}
                      className="text-primary hover:underline"
                    >
                      #{asset.sale_journal_entry_id}
                    </Link>
                  </DetailRow>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {asset.notes && (
          <div className="mx-6 mb-6 rounded-md border bg-muted/30 p-4 text-sm">
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{asset.notes}</p>
          </div>
        )}
      </div>

      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-primary">Maintenance jobs</h3>
            <p className="text-xs text-muted-foreground">Repair and service work linked to this asset.</p>
          </div>
          {flags.can_create_maintenance_job && (
            <Button size="sm" variant="outline" asChild>
              <Link to={`${jobBase}/create?from_fixed_asset=${assetId}`}>
                <Wrench className="size-4 mr-1" /> New job
              </Link>
            </Button>
          )}
        </div>
        {jobOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No maintenance jobs recorded for this asset.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 px-2 text-left font-medium">Job #</th>
                  <th className="py-2 px-2 text-left font-medium">Title</th>
                  <th className="py-2 px-2 text-left font-medium">Due</th>
                  <th className="py-2 px-2 text-left font-medium">Assigned</th>
                  <th className="py-2 px-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobOrders.map((job) => (
                  <tr key={job.id} className="border-b last:border-0">
                    <td className="py-2 px-2">
                      <Link to={`${jobBase}/${job.id}`} className="font-mono text-primary hover:underline">
                        {job.job_number}
                      </Link>
                    </td>
                    <td className="py-2 px-2">{job.title || '—'}</td>
                    <td className="py-2 px-2 text-muted-foreground">{job.due_date || '—'}</td>
                    <td className="py-2 px-2">{job.assigned_user?.name || '—'}</td>
                    <td className="py-2 px-2 capitalize">{job.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-primary">Depreciation history</h3>
          <p className="text-xs text-muted-foreground">Posted amounts from depreciation runs.</p>
        </div>
        {depreciations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No depreciation recorded yet. Run depreciation from the{' '}
            <Link
              to={`${base}/reports/depreciation-schedule`}
              className="text-primary hover:underline"
            >
              depreciation schedule
            </Link>{' '}
            report.
          </p>
        ) : (
          <DataGridLayout
            table={historyTable}
            recordCount={depreciations.length}
            showPagination={depreciations.length > 10}
          />
        )}
      </section>

      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-primary">Projected depreciation schedule</h3>
          <p className="text-xs text-muted-foreground">
            Forward-looking schedule (first 24 periods when available).
          </p>
        </div>
        {projectedSchedule.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Schedule not available (fully depreciated or no depreciation setup).
          </p>
        ) : (
          <>
            <DataGridLayout
              table={projectedTable}
              recordCount={projectedSchedule.length}
              showPagination={false}
            />
            {schedule.length > 24 && (
              <p className="text-xs text-muted-foreground border-t pt-3">
                Showing first 24 of {schedule.length} periods.
              </p>
            )}
          </>
        )}
      </section>

      <RetireAssetDialog
        assetId={assetId}
        open={retireOpen}
        onOpenChange={setRetireOpen}
        onSuccess={() => load()}
      />
      <SellAssetDialog
        asset={asset}
        open={sellOpen}
        onOpenChange={setSellOpen}
        onSuccess={() => load()}
      />
    </div>
  );
}
