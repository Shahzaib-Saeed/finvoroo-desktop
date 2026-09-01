import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  DESKTOP_APP_DOWNLOAD_URL,
  DESKTOP_APP_LATEST_VERSION,
  desktopShellUpdateAvailable,
  fetchDesktopShellStatus,
  fetchDesktopUpdateManifest,
  isRunningInDesktopApp,
} from '@/lib/desktop-app';

const POLL_MS = 30 * 60 * 1000;
const BOOT_DELAY_MS = 12 * 1000;

/**
 * When the Windows shell (.exe) is older than desktop-latest.json on the server,
 * prompt the user to run the new installer (in-place upgrade, data preserved).
 *
 * Frontend/UI updates do NOT require this — those load from app.finvoroo.com when online.
 */
export function DesktopUpdateWatcher() {
  const toastIdRef = useRef(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !isRunningInDesktopApp()) return undefined;

    const clearToast = () => {
      pendingRef.current = false;
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    };

    const check = async () => {
      try {
        const [status, manifest] = await Promise.all([
          fetchDesktopShellStatus(),
          fetchDesktopUpdateManifest(),
        ]);

        const installed = status?.version || null;
        const latest =
          manifest?.version || manifest?.latest_version || DESKTOP_APP_LATEST_VERSION;
        const downloadUrl = manifest?.download_url || DESKTOP_APP_DOWNLOAD_URL;

        if (!desktopShellUpdateAvailable(installed, latest)) {
          clearToast();
          return;
        }

        if (pendingRef.current) return;
        pendingRef.current = true;

        toastIdRef.current = toast.info('Desktop app update available', {
          description: `Version v${latest} is ready. Install once — your offline data stays on this PC.`,
          duration: Infinity,
          action: {
            label: 'Download update',
            onClick: () => {
              window.open(downloadUrl, '_blank', 'noopener,noreferrer');
            },
          },
        });
      } catch {
        // Offline or manifest not published yet — ignore.
      }
    };

    const bootTimer = setTimeout(check, BOOT_DELAY_MS);
    const interval = setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(bootTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    };
  }, []);

  return null;
}
