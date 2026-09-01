import { getOrCreateDeviceUuid } from '@/offline/uuid';

export function posTerminalStorageKey(companyId) {
  return `finvoroo.pos.terminal_id.${companyId}`;
}

export function isDesktopPosBuild() {
  return typeof window !== 'undefined' && !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

export function readStoredPosTerminalId(companyId) {
  if (!companyId) return null;
  try {
    const raw = localStorage.getItem(posTerminalStorageKey(companyId));
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function writeStoredPosTerminalId(companyId, terminalId) {
  if (!companyId || !terminalId) return;
  try {
    localStorage.setItem(posTerminalStorageKey(companyId), String(terminalId));
  } catch {
    /* ignore quota / private mode */
  }
}

export function pharmacyBootstrapTerminalParams(companyId) {
  const stored = readStoredPosTerminalId(companyId);
  if (stored) {
    return { terminal_id: stored };
  }
  if (isDesktopPosBuild()) {
    return { terminal_code: 'SERVER-01' };
  }
  getOrCreateDeviceUuid();
  return { claim_terminal: 1 };
}
