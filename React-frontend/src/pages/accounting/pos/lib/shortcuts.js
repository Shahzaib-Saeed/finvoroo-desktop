export const SHORTCUTS_KEY = 'finvoroo.pos.shortcuts';
export const POS_SETTINGS_KEY = 'finvoroo.pos.settings';

export const DEFAULT_SHORTCUTS = {
  customer: 'F2',
  search: 'F3',
  hold: 'F4',
  payment: 'F5',
  complete: 'F6',
  returns: 'F7',
  cart: 'F8',
  tender: 'F9',
  close: 'Escape',
};

export const SHORTCUT_LABELS = [
  { id: 'customer', action: 'Customer' },
  { id: 'search', action: 'Focus search' },
  { id: 'hold', action: 'Hold sale' },
  { id: 'payment', action: 'Payment' },
  { id: 'complete', action: 'Complete sale' },
  { id: 'returns', action: 'Returns' },
  { id: 'cart', action: 'Focus cart' },
  { id: 'tender', action: 'Focus tender' },
  { id: 'close', action: 'Close dialog' },
];

export function loadShortcuts() {
  try {
    const raw = localStorage.getItem(SHORTCUTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SHORTCUTS, ...(parsed || {}) };
  } catch {
    return { ...DEFAULT_SHORTCUTS };
  }
}

export function saveShortcuts(map) {
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(map));
}

export function loadPosSettings() {
  try {
    const raw = localStorage.getItem(POS_SETTINGS_KEY);
    return {
      autoPrint: false,
      ...(raw ? JSON.parse(raw) : {}),
    };
  } catch {
    return { autoPrint: false };
  }
}

export function savePosSettings(settings) {
  localStorage.setItem(POS_SETTINGS_KEY, JSON.stringify(settings));
}

/** Match a KeyboardEvent against a shortcut string like "F2" or "Ctrl+F". */
export function eventMatchesShortcut(e, shortcut) {
  if (!shortcut) return false;
  const parts = String(shortcut).toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const wantCtrl = parts.includes('ctrl') || parts.includes('control') || parts.includes('meta') || parts.includes('cmd');
  const wantAlt = parts.includes('alt');
  const wantShift = parts.includes('shift');

  const eventKey = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  const keyOk =
    eventKey === key ||
    (key === 'escape' && e.key === 'Escape') ||
    (key.startsWith('f') && e.key.toLowerCase() === key);

  if (!keyOk) return false;
  if (wantCtrl !== (e.ctrlKey || e.metaKey)) return false;
  if (wantAlt !== e.altKey) return false;
  if (wantShift && !e.shiftKey) return false;
  return true;
}
