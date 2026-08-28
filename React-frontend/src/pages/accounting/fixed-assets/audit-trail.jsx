import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fixedAssetsApi } from './api/fixed-assets.api';
import { formatStatus } from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataGridLayout } from '@/components/ui/data-grid-layout';

function formatChanges(log) {
  const oldV = log.old_values;
  const newV = log.new_values;
  if (!oldV && !newV) return '—';
  try {
    const parts = [];
    if (newV && typeof newV === 'object') {
      Object.keys(newV).slice(0, 5).forEach((k) => {
        const from = oldV?.[k];
        const to = newV[k];
        if (from !== to) parts.push(`${k}: ${from ?? '—'} → ${to ?? '—'}`);
      });
    }
    return parts.length ? parts.join('; ') : '—';
  } catch {
    return '—';
  }
}

export function FixedAssetAuditTrailPage() {
  const { id: workspaceId, assetId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/fixed-assets`;

  const [asset, setAsset] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fixedAssetsApi
      .auditTrail(assetId)
      .then((res) => {
        const data = res.data?.data || {};
        setAsset(data.asset || null);
        setLogs(Array.isArray(data.logs) ? data.logs : []);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load audit trail');
      })
      .finally(() => setLoading(false));
  }, [assetId]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Date / time',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.created_at || '—'}</span>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.original.action || '—'}
          </Badge>
        ),
      },
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.user_name || 'System'}</span>
        ),
      },
      {
        id: 'changes',
        header: 'Changes',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground max-w-md block truncate">
            {formatChanges(row.original)}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: logs,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        Loading audit trail…
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={asset ? `Audit trail — ${asset.asset_name}` : 'Audit trail'}
        subtitle="History of changes and lifecycle events for this asset."
        actions={
          <div className="flex gap-2">
            {asset && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`${base}/${assetId}`}>
                  View asset
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>
                <ArrowLeft className="size-4 mr-1" /> Back to list
              </Link>
            </Button>
          </div>
        }
      />

      {asset && (
        <p className="text-sm text-muted-foreground">
          Status: <span className="text-foreground">{formatStatus(asset.status)}</span>
        </p>
      )}

      <div className="rounded-lg border bg-card p-4">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No audit entries yet.</p>
        ) : (
          <DataGridLayout table={table} recordCount={logs.length} showPagination={false} />
        )}
      </div>
    </div>
  );
}
