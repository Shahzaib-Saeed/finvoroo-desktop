/** Lightweight online/offline helpers for Phase 0 sync. */

const REACHABILITY_TIMEOUT_MS = 4000;

export function isOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function subscribeConnectivity(onChange) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = () => onChange(isOnline());
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}

/**
 * navigator.onLine only reflects the link layer (e.g. Wi-Fi associated) — it
 * can report `true` behind a captive portal, a broken VPN, or a down ISP with
 * no route to the Finvoroo API. Confirms real reachability with a
 * short-timeout call to the existing sync/status endpoint before the caller
 * trusts a reported "online" transition and starts a sync cycle. Matters most
 * for the desktop app (no user-visible browser chrome to hint at the real
 * network state), but is safe and cheap for the web app too.
 */
export async function isReallyOnline() {
  if (!isOnline()) return false;
  if (typeof fetch === 'undefined') return true;

  try {
    const { default: api } = await import('@/lib/api');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);
    try {
      await api.get('/workspace/sync/status', { signal: controller.signal });
      return true;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}
