import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CloudOff, RefreshCw, Smartphone, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { syncApi } from '@/offline/sync.api';
import { runSyncCycle, getOfflinePendingCount } from '@/offline/sync-manager';
import { isOnline } from '@/offline/connectivity';
import { setMeta } from '@/offline/db';
import { settingsApi } from '@/pages/accounting/settings/api/settings.api';

/**
 * Phase 5 — Sync Admin ops view (enable flag, devices, recent acks, change log).
 */
export function SyncAdminPage() {
  const { id: companyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, count] = await Promise.all([
        syncApi.status(),
        getOfflinePendingCount(companyId),
      ]);
      const on = !!statusRes?.data?.data?.offline_sync_enabled;
      setEnabled(on);
      setPending(count);
      if (companyId) {
        await setMeta(companyId, 'offline_sync_enabled', on);
      }

      if (on) {
        try {
          const adminRes = await syncApi.admin();
          setData(adminRes?.data?.data || null);
        } catch {
          setData(null);
        }
      } else {
        setData(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load sync status');
      setEnabled(false);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (next) => {
    setToggling(true);
    try {
      const res = await settingsApi.updateOfflineSync({ offline_sync_enabled: next });
      const on = !!res.data?.data?.offline_sync_enabled;
      setEnabled(on);
      if (companyId) {
        await setMeta(companyId, 'offline_sync_enabled', on);
      }
      toast.success(
        res.data?.message || (on ? 'Offline sync enabled.' : 'Offline sync disabled.'),
      );
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update offline sync setting');
    } finally {
      setToggling(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await runSyncCycle(companyId, { reason: 'manual' });
      if (result.ok) toast.success('Sync completed');
      else toast.message(result.reason || 'Sync skipped');
      await load();
    } catch (err) {
      toast.error(err?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Offline sync"
        subtitle="Enable offline drafting for this company, then monitor devices and sync activity."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{isOnline() ? 'Online' : 'Offline'}</Badge>
            <Badge variant="secondary">{pending} pending locally</Badge>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing || !isOnline() || !enabled}
            >
              <RefreshCw className={`size-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              Sync now
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CloudOff className="size-4" /> Company setting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/80 bg-muted/15 p-4 flex items-start gap-3">
            <Switch
              id="syncAdminOfflineToggle"
              checked={enabled}
              disabled={loading || toggling || !isOnline()}
              onCheckedChange={handleToggle}
            />
            <div>
              <Label htmlFor="syncAdminOfflineToggle" className="font-medium cursor-pointer text-sm">
                Enable offline sync for this company
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                When on, draft documents can be saved offline and synced later. Posting, payments,
                and stock still require a connection. You can also change this under Accounting
                Settings → Posting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !enabled ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Offline sync is off. Turn it on above to register devices and view sync activity.
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Could not load sync admin details. Try Sync now or refresh the page.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="size-4" /> Devices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(data.devices || []).length === 0 ? (
                <p className="text-muted-foreground">No devices registered yet.</p>
              ) : (
                (data.devices || []).map((d) => (
                  <div key={d.id} className="rounded border px-3 py-2">
                    <div className="font-medium">{d.name || d.device_uuid}</div>
                    <div className="text-xs text-muted-foreground">
                      cursor {d.last_pull_cursor} · last seen{' '}
                      {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : '—'}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="size-4" /> Change log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">
                Total events: {data.change_log_total ?? 0}
              </p>
              {(data.recent_changes || []).slice(0, 15).map((c) => (
                <div key={c.id} className="flex justify-between gap-2 rounded border px-3 py-1.5 text-xs">
                  <span>
                    {c.entity}.{c.op}
                  </span>
                  <span className="text-muted-foreground truncate max-w-[45%]">{c.entity_uuid}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent mutation acks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(data.recent_acks || []).length === 0 ? (
                <p className="text-muted-foreground">No acks yet.</p>
              ) : (
                (data.recent_acks || []).map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-2 rounded border px-3 py-1.5 text-xs">
                    <Badge variant="outline">
                      {a.entity}.{a.op}
                    </Badge>
                    <span className="text-muted-foreground">{a.client_mutation_id}</span>
                    <span className="ms-auto">
                      {a.response_json?.status || 'ok'}
                      {a.response_json?.invoice_number
                        ? ` · ${a.response_json.invoice_number}`
                        : ''}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Supported push mutations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(data.supported_mutations || []).map((m) => (
                <Badge key={m} variant="secondary">
                  {m}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
