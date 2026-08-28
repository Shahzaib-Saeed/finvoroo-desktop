import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { isOnline, subscribeConnectivity } from './connectivity';
import {
  bindConnectivitySync,
  getOfflinePendingCount,
  runSyncCycle,
  subscribeSyncEvents,
} from './sync-manager';
import { getMeta } from './db';

/**
 * Compact Offline / Pending banner for workspace shell (Phase 0).
 * Only renders when company offline_sync_enabled is known true (meta or prop).
 */
export function OfflineSyncBanner({ companyId }) {
  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!companyId) return undefined;
    let cancelled = false;

    const refresh = async () => {
      try {
        const flag = await getMeta(companyId, 'offline_sync_enabled', false);
        const count = await getOfflinePendingCount(companyId);
        if (!cancelled) {
          setEnabled(Boolean(flag));
          setPending(count);
        }
      } catch {
        if (!cancelled) setEnabled(false);
      }
    };

    refresh();
    const unsubConn = subscribeConnectivity((on) => {
      setOnline(on);
      refresh();
    });
    const unbind = bindConnectivitySync(() => companyId);
    const unsubSync = subscribeSyncEvents((event) => {
      if (String(event.companyId) !== String(companyId)) return;
      if (event.type === 'sync:start') setSyncing(true);
      if (event.type === 'sync:done') {
        setSyncing(false);
        setPending(event.pending ?? 0);
        setMessage('');
      }
      if (event.type === 'sync:error') {
        setSyncing(false);
        setMessage(event.message || 'Sync error');
      }
      refresh();
    });

    // Initial status probe when online (sets meta flag).
    if (isOnline()) {
      runSyncCycle(companyId, { reason: 'banner-mount' }).finally(refresh);
    }

    return () => {
      cancelled = true;
      unsubConn();
      unbind();
      unsubSync();
    };
  }, [companyId]);

  if (!enabled) return null;
  if (online && pending <= 0 && !message) return null;

  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100"
      role="status"
    >
      {!online ? (
        <WifiOff className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <CloudOff className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="font-medium">
        {!online ? 'Offline' : 'Pending sync'}
      </span>
      {pending > 0 ? (
        <span className="text-amber-900/80 dark:text-amber-100/80">
          {pending} draft change{pending === 1 ? '' : 's'} waiting
        </span>
      ) : null}
      {message ? <span className="opacity-80">{message}</span> : null}
      {online && pending > 0 ? (
        <button
          type="button"
          className="ms-auto inline-flex items-center gap-1 rounded border border-amber-600/30 px-2 py-0.5 font-medium hover:bg-amber-500/20 disabled:opacity-50"
          disabled={syncing}
          onClick={() => runSyncCycle(companyId, { reason: 'manual' })}
        >
          <RefreshCw className={`size-3 ${syncing ? 'animate-spin' : ''}`} />
          Sync now
        </button>
      ) : null}
    </div>
  );
}
