/**
 * Client-side UUID helpers for offline sync identity.
 * Prefer crypto.randomUUID (UUIDv4). When a v7-style time-sortable id is useful,
 * fall back to a compatible 36-char hex form.
 */

export function newUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function newClientMutationId() {
  return newUuid();
}

export function provisionalInvoiceLabel(uuid) {
  const short = String(uuid || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  return short ? `OFFLINE-${short}` : `OFFLINE-${Date.now()}`;
}

const DEVICE_KEY = 'finvoroo.offline.device_uuid';

export function getOrCreateDeviceUuid() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = newUuid();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return newUuid();
  }
}
