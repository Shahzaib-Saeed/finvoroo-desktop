import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const RUNNING_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';
const POLL_MS = 10 * 60 * 1000;
const CHECK_COOLDOWN_MS = 60 * 1000;
const BOOT_DELAY_MS = 15 * 1000;
const RELOAD_FOR_KEY = 'erp-app-reload-for-build';
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

async function fetchFrontendBuildId() {
  const res = await fetch(`${BASE}version.json?_=${Date.now()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.buildId ? String(data.buildId) : null;
}

function reloadApp(targetBuildId) {
  try {
    sessionStorage.setItem(RELOAD_FOR_KEY, String(targetBuildId || ''));
  } catch {
    // Private mode / blocked storage — still attempt reload.
  }
  const url = new URL(window.location.href);
  url.searchParams.set('_v', Date.now());
  window.location.replace(url.toString());
}

function alreadyReloadedFor(buildId) {
  try {
    return sessionStorage.getItem(RELOAD_FOR_KEY) === String(buildId);
  } catch {
    return false;
  }
}

/**
 * Polls /version.json after deploys. Only compares the frontend build id baked
 * into this bundle — backend file mtimes must not trigger refresh prompts.
 */
export function AppVersionWatcher() {
  const updatePendingRef = useRef(false);
  const toastIdRef = useRef(null);
  const lastCheckRef = useRef(0);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD) return undefined;
    // Embedded offline bundle only — version.json is baked in and never changes until
    // a new installer. When online, the shell proxies the live browser build from
    // app.finvoroo.com (VITE_DESKTOP_BUILD=false), so this watcher runs normally.
    if (import.meta.env.VITE_DESKTOP_BUILD === 'true') return undefined;

    const clearUpdateToast = () => {
      updatePendingRef.current = false;
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    };

    const notifyUpdate = (remoteBuildId) => {
      if (updatePendingRef.current) return;

      // After a normal reload Chrome on Windows may still serve cached JS while
      // version.json is already new — suppress repeat prompts for the same deploy.
      if (alreadyReloadedFor(remoteBuildId)) return;

      updatePendingRef.current = true;

      toastIdRef.current = toast.info('Update available', {
        description: 'A new version was deployed. Refresh to load the latest changes.',
        duration: Infinity,
        action: {
          label: 'Refresh now',
          onClick: () => reloadApp(remoteBuildId),
        },
      });
    };

    const check = async () => {
      const now = Date.now();
      if (checkingRef.current || now - lastCheckRef.current < CHECK_COOLDOWN_MS) return;

      checkingRef.current = true;
      lastCheckRef.current = now;

      try {
        const frontendId = await fetchFrontendBuildId();

        if (!frontendId || frontendId === RUNNING_BUILD_ID) {
          clearUpdateToast();
          try {
            sessionStorage.removeItem(RELOAD_FOR_KEY);
          } catch {
            // ignore
          }
          return;
        }

        notifyUpdate(frontendId);
      } catch {
        // Ignore network errors during background checks.
      } finally {
        checkingRef.current = false;
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
