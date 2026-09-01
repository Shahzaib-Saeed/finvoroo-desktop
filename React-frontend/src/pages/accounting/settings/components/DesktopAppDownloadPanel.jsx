import { CheckCircle2, Download, LaptopMinimal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DESKTOP_APP_DOWNLOAD_URL,
  DESKTOP_APP_LATEST_VERSION,
  isRunningInDesktopApp,
} from '@/lib/desktop-app';

/**
 * "Download the Windows app" — same shape as PrintAgentSetupPanel's download
 * section (companion native app, installed once per PC), just without a
 * live status check: a browser tab has no way to ask "is the desktop app
 * installed on this PC", unlike the Print Agent, which exposes a local HTTP
 * status endpoint the browser can call directly.
 */
export function DesktopAppDownloadPanel({ embedded = false }) {
  if (isRunningInDesktopApp()) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm text-emerald-700',
          !embedded && 'rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-4',
        )}
      >
        <CheckCircle2 className="size-4 shrink-0" />
        You&apos;re using the Finvoroo Desktop app on this PC.
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
            the moment you&apos;re back online.
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
