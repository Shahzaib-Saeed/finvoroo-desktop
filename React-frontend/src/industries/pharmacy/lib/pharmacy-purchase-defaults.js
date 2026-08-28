import { expiryDisplayMask, isValidExpiryInput, normalizeExpiry } from './expiry-mask';

function hasText(v) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

function settingsEnabled(settings, key, fallback = true) {
  if (settings[key] === false) return false;
  return fallback;
}

/** Effective batch for a line — typed value wins, else pharmacy default. */
export function resolvePurchaseLineBatch(line, settings = {}) {
  const typed = String(line?.batch_number ?? line?.batch_no ?? '').trim();
  if (typed) return typed;
  if (!settingsEnabled(settings, 'use_default_batch_when_missing')) return '';
  return String(settings.default_batch_when_missing || '').trim();
}

/** Effective expiry mask (MM/YY) for a line — typed value wins, else pharmacy default. */
export function resolvePurchaseLineExpiry(line, settings = {}) {
  const typed = String(line?.expiry_date ?? '').trim();
  if (typed) {
    return isValidExpiryInput(typed) ? expiryDisplayMask(typed) : typed;
  }
  if (!settingsEnabled(settings, 'use_default_expiry_when_missing')) return '';
  const def = String(settings.default_expiry_when_missing || '').trim();
  if (!def) return '';
  return expiryDisplayMask(def) || def;
}

/** ISO expiry for API payloads. */
export function resolvePurchaseLineExpiryIso(line, settings = {}) {
  const mask = resolvePurchaseLineExpiry(line, settings);
  if (!mask) return '';
  return normalizeExpiry(mask) || '';
}

export function lineHasEffectiveBatch(line, settings = {}) {
  return Boolean(resolvePurchaseLineBatch(line, settings));
}

export function lineHasEffectiveExpiry(line, settings = {}) {
  const mask = resolvePurchaseLineExpiry(line, settings);
  return Boolean(mask && isValidExpiryInput(mask));
}

/** Apply company pharmacy defaults when invoice/OCR omitted batch or expiry. */
export function applyPurchaseLineDefaults(row, settings = {}) {
  if (!row || typeof row !== 'object') return row;
  const next = { ...row };

  const batch = resolvePurchaseLineBatch(next, settings);
  if (batch && !hasText(next.batch_no) && !hasText(next.batch_number)) {
    next.batch_no = batch;
    next.batch_number = batch;
  }

  const expiry = resolvePurchaseLineExpiry(next, settings);
  if (expiry && !hasText(next.expiry_date)) {
    next.expiry_date = expiry;
  }

  return next;
}

export function applyPurchaseDefaultsToRows(rows, settings = {}) {
  return (rows || []).map((row) => applyPurchaseLineDefaults(row, settings));
}
