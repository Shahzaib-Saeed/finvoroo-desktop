const RECEIVE_PREFIX = 'pharmacy.receive.draft';
const SCAN_PREFIX = 'pharmacy.scan.draft';

function safeParse(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

function receiveKey(companyId, billId) {
  const base = `${RECEIVE_PREFIX}.${companyId}`;
  return billId ? `${base}.${billId}` : base;
}

function scanKey(companyId) {
  return `${SCAN_PREFIX}.${companyId}`;
}

function hasFilledReceiveLine(line) {
  if (!line || typeof line !== 'object') return false;
  return Boolean(
    line.product_id ||
      line._needsMatch ||
      String(line.name || '').trim() ||
      String(line.batch_number || '').trim() ||
      (Number(line.quantity) || 0) > 0,
  );
}

export function receiveDraftHasContent(draft) {
  if (!draft) return false;
  const hasHeader =
    String(draft.vendorId || '').trim() ||
    String(draft.reference || '').trim() ||
    String(draft.remarks || '').trim();
  const hasLines = Array.isArray(draft.lines) && draft.lines.some(hasFilledReceiveLine);
  return hasHeader || hasLines;
}

export function loadReceiveDraft(companyId, billId = null) {
  if (!companyId) return null;
  return safeParse(localStorage.getItem(receiveKey(companyId, billId)));
}

export function saveReceiveDraft(companyId, billId, payload) {
  if (!companyId || !payload) return false;
  try {
    const data = {
      ...payload,
      savedAt: Date.now(),
      version: 1,
    };
    if (!receiveDraftHasContent(data)) {
      clearReceiveDraft(companyId, billId);
      return false;
    }
    localStorage.setItem(receiveKey(companyId, billId), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearReceiveDraft(companyId, billId = null) {
  if (!companyId) return;
  try {
    localStorage.removeItem(receiveKey(companyId, billId));
  } catch {
    /* ignore */
  }
}

function hasFilledScanRow(row) {
  if (!row || typeof row !== 'object') return false;
  return Boolean(
    row.matched_product_id ||
      String(row.product_description || '').trim() ||
      String(row.batch_no || '').trim(),
  );
}

export function scanDraftHasContent(draft) {
  if (!draft) return false;
  return Array.isArray(draft.rows) && draft.rows.some(hasFilledScanRow);
}

export function loadScanDraft(companyId) {
  if (!companyId) return null;
  return safeParse(localStorage.getItem(scanKey(companyId)));
}

export function saveScanDraft(companyId, payload) {
  if (!companyId || !payload) return false;
  try {
    const data = {
      ...payload,
      savedAt: Date.now(),
      version: 1,
    };
    if (!scanDraftHasContent(data)) {
      clearScanDraft(companyId);
      return false;
    }
    localStorage.setItem(scanKey(companyId), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearScanDraft(companyId) {
  if (!companyId) return;
  try {
    localStorage.removeItem(scanKey(companyId));
  } catch {
    /* ignore */
  }
}

export function formatDraftSavedAt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
