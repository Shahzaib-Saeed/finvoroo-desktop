import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { isRunningInDesktopApp } from '@/lib/desktop-app';

/**
 * How long the cashier can leave the "Restart to update" toast open with no
 * mouse/keyboard/touch activity before the update is applied automatically.
 * Keeps the update fully automatic (no manual reinstall) without ever
 * yanking the app out from under an in-progress sale.
 */
const IDLE_AUTO_APPLY_MS = 5 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 10 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];

/**
 * Signed Windows-shell auto-updater UI.
 *
 * The Rust side (finvoroo-desktop/src-tauri/src/updater.rs) checks for, downloads,
 * and signature-verifies a new release entirely in the background, then emits
 * `finvoroo://update-ready`. This component only surfaces that: a small toast with
 * a "Restart now" button, applied automatically after a period of user inactivity
 * if the cashier never clicks it. No download link, no manual installer — see
 * DesktopAppDownloadPanel.jsx (Settings) for the separate, explicit "check for
 * updates" panel, which still uses the older desktop-latest.json version check.
 */
export function DesktopUpdateWatcher() {
  const toastIdRef = useRef(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !isRunningInDesktopApp()) return undefined;

    let cancelled = false;
    let unlisten = null;
    let idleInterval = null;
    let lastActivityAt = Date.now();

    const onActivity = () => {
      lastActivityAt = Date.now();
    };

    const clearIdleWatch = () => {
      if (idleInterval) clearInterval(idleInterval);
      idleInterval = null;
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
    };

    const restartNow = async () => {
      clearIdleWatch();
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('install_pending_update');
      } catch (err) {
        // Restart itself exits the process, so an error here means install failed
        // before restart — the next background check will pick the update back up.
        toast.error('Could not apply the update. It will retry automatically.');
        console.error('[Finvoroo] install_pending_update failed', err);
      }
    };

    const armIdleAutoApply = () => {
      lastActivityAt = Date.now();
      ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
      idleInterval = setInterval(() => {
        if (Date.now() - lastActivityAt >= IDLE_AUTO_APPLY_MS) {
          restartNow();
        }
      }, IDLE_CHECK_INTERVAL_MS);
    };

    (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen('finvoroo://update-ready', (event) => {
          if (cancelled) return;
          const version = event?.payload?.version;
          toastIdRef.current = toast.info('Update ready', {
            description: version
              ? `Version v${version} downloaded and verified. Restart to apply — your data and settings stay on this PC.`
              : 'A verified update downloaded in the background. Restart to apply.',
            duration: Infinity,
            action: {
              label: 'Restart now',
              onClick: restartNow,
            },
          });
          armIdleAutoApply();
        });
      } catch (err) {
        // Older shell build without the updater plugin, or the Tauri API isn't
        // reachable in this context — nothing to watch for, fail silently.
        console.warn('[Finvoroo] desktop update watcher not active', err);
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
      clearIdleWatch();
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    };
  }, []);

  return null;
}
