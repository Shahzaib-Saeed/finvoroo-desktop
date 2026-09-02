/**
 * Finvoroo Desktop (Windows app) download + update metadata.
 */

export const DESKTOP_APP_DOWNLOAD_URL = '/downloads/FinvorooDesktop-Setup.exe';
/** Manifest on app.finvoroo.com — updated by finvoroo-desktop/scripts/publish-installer.mjs */
export const DESKTOP_APP_UPDATE_MANIFEST_URL = '/downloads/desktop-latest.json';
/** Keep in sync with finvoroo-desktop/{package.json,src-tauri/tauri.conf.json,src-tauri/Cargo.toml}. */
export const DESKTOP_APP_LATEST_VERSION = '0.1.6';

const DESKTOP_SHELL_ORIGIN = 'http://127.0.0.1:47391';

/** True when running inside the Finvoroo Desktop shell (embedded or live cloud SPA). */
export function isRunningInDesktopApp() {
  if (import.meta.env.VITE_DESKTOP_BUILD === 'true') return true;
  if (typeof window === 'undefined') return false;
  try {
    const { hostname, port, protocol } = window.location;
    return protocol.startsWith('http') && hostname === '127.0.0.1' && port === '47391';
  } catch {
    return false;
  }
}

/**
 * Axios base URL. Inside the Windows app this MUST stay on the local shell
 * (`http://127.0.0.1:47391/api/v1`) so requests hit the axum proxy instead of
 * calling api.finvoroo.com cross-origin (CORS) or a missing PHP sidecar.
 */
export function getApiBaseUrl() {
  if (isRunningInDesktopApp()) {
    return `${DESKTOP_SHELL_ORIGIN}/api/v1`;
  }
  return import.meta.env.VITE_API_BASE_URL || '/api/v1';
}

export function compareSemver(a, b) {
  const pa = String(a || '0')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

/** Installed shell version from the local axum server (desktop app only). */
export async function fetchDesktopShellStatus() {
  if (!isRunningInDesktopApp()) return null;
  try {
    const res = await fetch(`${DESKTOP_SHELL_ORIGIN}/__finvoroo/status`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Latest published Windows installer metadata (version, download URL, notes). */
export async function fetchDesktopUpdateManifest() {
  try {
    const res = await fetch(`${DESKTOP_APP_UPDATE_MANIFEST_URL}?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function desktopShellUpdateAvailable(installedVersion, manifestVersion) {
  if (!installedVersion || !manifestVersion) return false;
  return compareSemver(manifestVersion, installedVersion) > 0;
}
