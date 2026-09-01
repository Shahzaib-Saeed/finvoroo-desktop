import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, LaptopMinimal, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DESKTOP_APP_DOWNLOAD_URL,
  DESKTOP_APP_LATEST_VERSION,
  desktopShellUpdateAvailable,
  fetchDesktopShellStatus,
  fetchDesktopUpdateManifest,
  isRunningInDesktopApp,
} from '@/lib/desktop-app';

/**
 * Windows desktop app download + in-app update status.
 */
export function DesktopAppDownloadPanel({ embedded = false }) {
  const inDesktop = isRunningInDesktopApp();
  const [status, setStatus] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(inDesktop);

  const refresh = useCallback(async () => {
    if (!inDesktop) return;
    setLoading(true);
    try {
      const [shell, latest] = await Promise.all([
        fetchDesktopShellStatus(),
        fetchDesktopUpdateManifest(),
      ]);
      setStatus(shell);
      setManifest(latest);
    } finally {
      setLoading(false);
    }
  }, [inDesktop]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (inDesktop) {
    const installed = status?.version || '—';
    const latest =
      manifest?.version || manifest?.latest_version || DESKTOP_APP_LATEST_VERSION;
    const updateReady = desktopShellUpdateAvailable(installed, latest);
    const cloudLive = status?.cloud_spa === true;

    return (
      <div
        className={cn(
          'space-y-3 text-sm',
          !embedded && 'rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-4',
        )}
      >
        <div className="flex items-center gap-2 text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="font-medium">Finvoroo Desktop on this PC</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              App shell
            </p>
            <p className="mt-0.5 font-bold tabular-nums">v{installed}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              UI updates
            </p>
            <p className="mt-0.5 font-medium">
              {cloudLive ? 'Live from app.finvoroo.com' : 'Offline bundle (embedded)'}
            </p>
          </div>
        </div>

        {updateReady ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-950">
            <p className="font-semibold">Shell update v{latest} available</p>
            <p className="mt-1 leading-relaxed text-amber-900/90">
              Run the installer once to update the Windows app. Your offline data is kept.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2 h-8">
              <a
                href={manifest?.download_url || DESKTOP_APP_DOWNLOAD_URL}
                download="FinvorooDesktop-Setup.exe"
              >
                <Download className="mr-1.5 size-3.5" />
                Download v{latest}
              </a>
            </Button>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            When you deploy frontend changes to app.finvoroo.com, this app picks them up
            automatically on the next launch (online). Shell updates only when the .exe version
            changes.
          </p>
        )}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw className={cn('mr-1.5 size-3.5', loading && 'animate-spin')} />
          Refresh status
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'space-y-3',
        !embedded && 'rounded-lg border border-sky-200/80 bg-sky-50/40 p-4',
      )}
    >
      {!embedded ? (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <LaptopMinimal className="size-4 text-sky-700" />
            Finvoroo Desktop — Windows App
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            A native Windows app for this PC — no browser tab to keep open, keeps working through
            internet drops (invoices, POS, credit/debit notes, payments), and syncs automatically
            the moment you&apos;re back online. UI updates load automatically when online.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-foreground">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Latest Windows release
        </p>
        <p className="mt-0.5 text-sm font-bold tabular-nums">v{DESKTOP_APP_LATEST_VERSION}</p>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Download FinvorooDesktop-Setup.exe and run it on this PC. No admin rights, Node.js, PHP,
        MySQL, or Chrome required.
      </p>

      <Button asChild size="sm" variant="outline" className="h-8">
        <a href={DESKTOP_APP_DOWNLOAD_URL} download="FinvorooDesktop-Setup.exe">
          <Download className="mr-1.5 size-3.5" />
          Download v{DESKTOP_APP_LATEST_VERSION} installer
        </a>
      </Button>
    </div>
  );
}
