/**
 * Finvoroo Desktop (Windows app) download metadata — mirrors
 * src/lib/print-agent.js's PRINT_AGENT_DOWNLOAD_URL/PRINT_AGENT_LATEST_VERSION
 * pattern exactly, since it's the same "companion native app, installed
 * once per PC, downloaded from Settings" shape.
 */

export const DESKTOP_APP_DOWNLOAD_URL = '/downloads/FinvorooDesktop-Setup.exe';
/** Keep in sync with finvoroo-desktop/{package.json,src-tauri/tauri.conf.json,src-tauri/Cargo.toml}. */
export const DESKTOP_APP_LATEST_VERSION = '0.1.0';

/** True when this bundle itself IS the desktop app (built with VITE_DESKTOP_BUILD=true). */
export function isRunningInDesktopApp() {
  return import.meta.env.VITE_DESKTOP_BUILD === 'true';
}
