import api from '@/lib/api';
import { buildThermalHtmlDocument, absolutizeReceiptImages } from '@/lib/thermal-receipt-html';
import { getApiBaseUrl } from '@/lib/desktop-app';

export { buildThermalHtmlDocument, absolutizeReceiptImages };

export const QZ_PRINTER_KEY = 'finvoroo.pos.qz_printer';
export const QZ_ENABLED_KEY = 'finvoroo.pos.qz_enabled';

const CONNECT_TIMEOUT_MS = 25000;
const API_TIMEOUT_MS = 10000;

let qzModule = null;
let connectPromise = null;
let securityConfigured = false;
let qzSkipUntil = 0;

function markQzUnavailable(ms = 60000) {
  qzSkipUntil = Date.now() + ms;
}

export function clearQzUnavailable() {
  qzSkipUntil = 0;
}

export function resetQzSecurity() {
  securityConfigured = false;
}

function isQzSkipped() {
  return Date.now() < qzSkipUntil;
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function formatApiError(err) {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data?.message) return String(data.message);
  return err?.message || 'Request failed';
}

function readStorage(key, fallback = '') {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getQzPrinterName() {
  return readStorage(QZ_PRINTER_KEY, '').trim();
}

export function setQzPrinterName(name) {
  try {
    localStorage.setItem(QZ_PRINTER_KEY, String(name || '').trim());
  } catch {
    /* ignore */
  }
}

export function isQzPrintEnabled() {
  return readStorage(QZ_ENABLED_KEY, 'true') !== 'false';
}

export function setQzPrintEnabled(enabled) {
  try {
    localStorage.setItem(QZ_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

function apiRoot() {
  const base = getApiBaseUrl();
  return base.replace(/\/api\/v1\/?$/, '');
}

function certificateUrls() {
  const base = import.meta.env.BASE_URL || '/';
  const appRoot = `${window.location.origin}${base}`.replace(/\/+$/, '');
  const api = apiRoot();
  return [
    `${appRoot}/qz-certificate.txt`,
    `${api}/qz-certificate.txt`,
    `${api}/api/v1/qz-certificate.txt`,
  ];
}

async function fetchCertificateText() {
  for (const url of certificateUrls()) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes('BEGIN CERTIFICATE')) return text;
    } catch {
      /* try next */
    }
  }

  const res = await api.request({
    url: '/qz/certificate',
    method: 'GET',
    skipCacheBust: true,
    skipCompanyHeader: true,
    timeout: API_TIMEOUT_MS,
    responseType: 'text',
    transformResponse: [(payload) => payload],
    headers: { Accept: 'text/plain' },
  });
  const text = typeof res.data === 'string' ? res.data : String(res.data ?? '');
  if (!text.includes('BEGIN CERTIFICATE')) {
    throw new Error(text.trim() || 'QZ certificate missing on server');
  }
  return text;
}

async function signRequest(toSign) {
  try {
    const res = await api.request({
      url: '/qz/sign',
      method: 'POST',
      data: { request: toSign },
      skipCacheBust: true,
      skipCompanyHeader: true,
      timeout: API_TIMEOUT_MS,
      responseType: 'text',
      transformResponse: [(payload) => payload],
      headers: { Accept: 'text/plain' },
    });
    const sig = typeof res.data === 'string' ? res.data : String(res.data ?? '');
    if (!sig.trim()) throw new Error('Empty signature from server');
    return sig;
  } catch (err) {
    throw new Error(formatApiError(err));
  }
}

export async function probeQzBackend() {
  try {
    const res = await api.get('/qz/status', { skipCacheBust: true, skipCompanyHeader: true });
    const data = res?.data?.data ?? res?.data ?? {};
    return {
      ok: !!data.ready,
      certificate: !!data.certificate,
      privateKey: !!data.private_key,
      reason: data.ready
        ? null
        : 'Server keys missing — SSH to api server and run: php artisan qz:generate-keys',
    };
  } catch (err) {
    return {
      ok: false,
      certificate: false,
      privateKey: false,
      reason: formatApiError(err),
    };
  }
}

async function loadQz() {
  if (!qzModule) {
    const mod = await import('qz-tray');
    qzModule = mod.default ?? mod;
  }
  return qzModule;
}

function configureSecurity(qz) {
  qz.security.setCertificatePromise((resolve, reject) => {
    withTimeout(
      fetchCertificateText(),
      API_TIMEOUT_MS,
      'Could not load QZ certificate — run php artisan qz:generate-keys on the API server',
    )
      .then(resolve)
      .catch((err) => reject(new Error(formatApiError(err))));
  });
  qz.security.setSignatureAlgorithm('SHA512');
  qz.security.setSignaturePromise(
    (toSign) => (resolve, reject) => {
      withTimeout(signRequest(toSign), API_TIMEOUT_MS, 'Signing timed out')
        .then(resolve)
        .catch(reject);
    },
  );
  securityConfigured = true;
}

async function connectQzInternal({ force = false } = {}) {
  if (!isQzPrintEnabled()) {
    return { ok: false, reason: 'Silent print is turned off' };
  }
  if (!force && isQzSkipped()) {
    return { ok: false, reason: 'QZ Tray unavailable — click Connect to retry' };
  }

  if (force) {
    resetQzSecurity();
    clearQzUnavailable();
  }

  const qz = await loadQz();
  if (!securityConfigured || force) {
    configureSecurity(qz);
  }

  if (!force && qz.websocket.isActive()) {
    return { ok: true, via: 'qz', connected: true };
  }

  if (!force && connectPromise) {
    return connectPromise;
  }

  connectPromise = qz.websocket
    .connect({ retries: 3, delay: 0.5 })
    .then(() => {
      qzSkipUntil = 0;
      return { ok: true, via: 'qz', connected: true };
    })
    .catch((err) => {
      markQzUnavailable();
      const msg = err?.message || 'Could not connect to QZ Tray';
      if (/timed out|timeout/i.test(msg)) {
        return {
          ok: false,
          reason:
            'Connection timed out. QZ Tray is running but this website is not allowed yet. Look for a QZ popup (may be behind Chrome) → click Allow + Remember.',
          connected: false,
        };
      }
      return { ok: false, reason: msg, connected: false };
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
}

export async function connectQz(options = {}) {
  try {
    return await withTimeout(
      connectQzInternal(options),
      CONNECT_TIMEOUT_MS,
      'QZ Tray connection timed out. Open QZ Tray from the system tray, then click Allow on the security popup for this website.',
    );
  } catch (err) {
    markQzUnavailable();
    return {
      ok: false,
      reason: err?.message || 'QZ connection timed out',
      connected: false,
    };
  }
}

async function probeQzInternal({ force = false, onStep } = {}) {
  onStep?.('server');
  const backend = await probeQzBackend();
  if (!backend.ok) {
    return { ...backend, connected: false, printers: [], step: 'server' };
  }

  onStep?.('desktop');
  const result = await connectQz({ force });
  if (!result.ok) {
    return { ...result, printers: [], backend, step: 'desktop' };
  }

  onStep?.('printers');
  try {
    const qz = await loadQz();
    const printers = await withTimeout(qz.printers.find(), 8000, 'Timed out listing printers');
    const list = Array.isArray(printers) ? printers : [];
    const saved = getQzPrinterName();
    const defaultPrinter = await qz.printers.getDefault().catch(() => null);
    onStep?.('ready');
    return {
      ok: true,
      connected: true,
      backend,
      printers: list,
      defaultPrinter: defaultPrinter || null,
      selectedPrinter: saved || defaultPrinter || list[0] || null,
      step: 'ready',
    };
  } catch (err) {
    return {
      ok: false,
      connected: true,
      backend,
      reason: err?.message || 'Could not list printers',
      printers: [],
      step: 'printers',
    };
  }
}

export async function probeQz(options = {}) {
  try {
    return await probeQzInternal(options);
  } catch (err) {
    return {
      ok: false,
      connected: false,
      reason: err?.message || 'QZ setup check failed',
      printers: [],
    };
  }
}

export async function testQzPrint() {
  const connected = await connectQz({ force: true });
  if (!connected.ok) return connected;

  const qz = await loadQz();
  const printer = getQzPrinterName() || (await qz.printers.getDefault().catch(() => null));
  if (!printer) return { ok: false, reason: 'Choose a printer first' };

  const config = qz.configs.create(printer);
  await qz.print(config, [
    {
      type: 'raw',
      format: 'plain',
      data: '*** Finvoroo test print OK ***\n\n',
    },
  ]);
  return { ok: true, via: 'qz', printer };
}

async function resolvePrinter(qz) {
  const saved = getQzPrinterName();
  if (saved) return saved;
  const fallback = await qz.printers.getDefault().catch(() => null);
  if (fallback) return fallback;
  const list = await qz.printers.find();
  if (Array.isArray(list) && list.length > 0) return list[0];
  throw new Error('No thermal printer found in QZ Tray');
}

export async function printEscPosBase64(bytesBase64, { openDrawer = false } = {}) {
  if (!bytesBase64) return { ok: false, reason: 'no_bytes' };

  const connected = await connectQz();
  if (!connected.ok) return connected;

  const qz = await loadQz();
  const printer = await resolvePrinter(qz);
  const config = qz.configs.create(printer);

  const payload = [
    {
      type: 'raw',
      format: 'command',
      flavor: 'base64',
      data: bytesBase64,
    },
  ];

  if (openDrawer) {
    payload.push({
      type: 'raw',
      format: 'command',
      flavor: 'hex',
      data: '1B700019FA',
    });
  }

  await qz.print(config, payload);
  return { ok: true, via: 'qz', printer, silent: true };
}

export async function printHtmlReceipt(
  html,
  { paper = 'thermal_80', elementId = null, printerName = null } = {},
) {
  const el = elementId ? document.getElementById(elementId) : null;
  const content = el?.innerHTML?.trim() ? el.innerHTML : html;
  if (!content?.trim()) return { ok: false, reason: 'no_html' };

  const connected = await connectQz();
  if (!connected.ok) return connected;

  const qz = await loadQz();
  const printer = printerName || (await resolvePrinter(qz));
  const widthIn = paper === 'thermal_58' ? 2.28 : 3.15;
  const config = qz.configs.create(printer, {
    size: { width: widthIn, height: 11 },
    units: 'in',
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    scaleContent: true,
  });

  const doc = buildThermalHtmlDocument(content, paper);

  await qz.print(config, [
    {
      type: 'pixel',
      format: 'html',
      flavor: 'plain',
      data: doc,
    },
  ]);

  return { ok: true, via: 'qz', printer, silent: true };
}

export async function openQzCashDrawer() {
  const connected = await connectQz();
  if (!connected.ok) return connected;

  const qz = await loadQz();
  const printer = await resolvePrinter(qz);
  const config = qz.configs.create(printer);
  await qz.print(config, [
    {
      type: 'raw',
      format: 'command',
      flavor: 'hex',
      data: '1B700019FA',
    },
  ]);
  return { ok: true, via: 'qz' };
}
