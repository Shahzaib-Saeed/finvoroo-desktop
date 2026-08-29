/**
 * Finvoroo Print Agent client (React).
 * Talks to the local Tauri agent on 127.0.0.1 — never uses window.print() or QZ Tray.
 */

import thermalReceiptCss from '@/styles/thermal-receipt-print.css?inline';
import { getSystemBrandName, getSystemBrandTagline } from '@/lib/helpers';
import {
  PRINT_DRIVERS,
  resolvePrintDriver,
  formatPrintAgentError,
  agentOfflineMessage,
  agentNotInstalledMessage,
  printerIsThermal,
} from './print-agent-core';

export {
  PRINT_DRIVERS,
  resolvePrintDriver,
  formatPrintAgentError,
  agentOfflineMessage,
  agentNotInstalledMessage,
  printerIsThermal,
};

export const PRINT_AGENT_PORT = 17392;
export const PRINT_AGENT_BASE = `http://127.0.0.1:${PRINT_AGENT_PORT}`;
export const PRINT_AGENT_TOKEN_KEY = 'finvoroo.print_agent.token';
export const PRINT_AGENT_PRINTER_KEY = 'finvoroo.print_agent.printer_id';
export const PRINT_AGENT_RECEIPT_PRINTER_KEY = 'finvoroo.print_agent.receipt_printer';
export const PRINT_AGENT_INVOICE_PRINTER_KEY = 'finvoroo.print_agent.invoice_printer';
export const PRINT_AGENT_LABEL_PRINTER_KEY = 'finvoroo.print_agent.label_printer';
export const PRINT_AGENT_ENABLED_KEY = 'finvoroo.print_agent.enabled';
export const PRINT_DRIVER_KEY = 'finvoroo.print_driver';
export const RECEIPT_PAPER_KEY = 'finvoroo.receipt_paper';
export const PRINT_AGENT_DOWNLOAD_URL = '/downloads/FinvorooPrintAgent-Setup.exe';
/** Latest Windows installer release — keep in sync with finvoroo-print-agent/package.json */
export const PRINT_AGENT_LATEST_VERSION = '1.1.6';

const STATUS_TIMEOUT_MS = 1500;
const REQUEST_TIMEOUT_MS = 30000;

function readStorage(key, fallback = '') {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value ?? ''));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getPrintAgentToken() {
  return readStorage(PRINT_AGENT_TOKEN_KEY, '').trim();
}

export function setPrintAgentToken(token) {
  writeStorage(PRINT_AGENT_TOKEN_KEY, String(token || '').trim());
}

export function getReceiptPrinterId() {
  return (
    readStorage(PRINT_AGENT_RECEIPT_PRINTER_KEY, '').trim() ||
    readStorage(PRINT_AGENT_PRINTER_KEY, '').trim()
  );
}

export function setReceiptPrinterId(id) {
  const value = String(id || '').trim();
  writeStorage(PRINT_AGENT_RECEIPT_PRINTER_KEY, value);
  writeStorage(PRINT_AGENT_PRINTER_KEY, value);
}

/** @deprecated use getReceiptPrinterId */
export function getPrintAgentPrinterId() {
  return getReceiptPrinterId();
}

/** @deprecated use setReceiptPrinterId */
export function setPrintAgentPrinterId(id) {
  setReceiptPrinterId(id);
}

export function getInvoicePrinterId() {
  return readStorage(PRINT_AGENT_INVOICE_PRINTER_KEY, '').trim();
}

export function setInvoicePrinterId(id) {
  writeStorage(PRINT_AGENT_INVOICE_PRINTER_KEY, String(id || '').trim());
}

export function getLabelPrinterId() {
  return readStorage(PRINT_AGENT_LABEL_PRINTER_KEY, '').trim();
}

export function setLabelPrinterId(id) {
  writeStorage(PRINT_AGENT_LABEL_PRINTER_KEY, String(id || '').trim());
}

export function isPrintAgentEnabled() {
  return readStorage(PRINT_AGENT_ENABLED_KEY, 'false') === 'true';
}

export function setPrintAgentEnabled(enabled) {
  writeStorage(PRINT_AGENT_ENABLED_KEY, enabled ? 'true' : 'false');
  if (enabled) setPrintDriver(PRINT_DRIVERS.AGENT);
}

export function getPrintDriver() {
  return resolvePrintDriver({
    storedDriver: readStorage(PRINT_DRIVER_KEY, ''),
    agentEnabled: isPrintAgentEnabled(),
    hasToken: Boolean(getPrintAgentToken()),
  });
}

export function setPrintDriver(driver) {
  const next = resolvePrintDriver({
    storedDriver: driver,
    agentEnabled: false,
    hasToken: false,
  });
  writeStorage(PRINT_DRIVER_KEY, next);
  writeStorage(PRINT_AGENT_ENABLED_KEY, next === PRINT_DRIVERS.AGENT ? 'true' : 'false');
}

/** Receipt paper width for POS / pharmacy thermal printing (58mm or 80mm). */
export function getReceiptPaper() {
  const stored = readStorage(RECEIPT_PAPER_KEY, 'thermal_80');
  return stored === 'thermal_58' ? 'thermal_58' : 'thermal_80';
}

export function setReceiptPaper(paper) {
  writeStorage(RECEIPT_PAPER_KEY, paper === 'thermal_58' ? 'thermal_58' : 'thermal_80');
}

async function request(path, { method = 'GET', body, timeout = REQUEST_TIMEOUT_MS, token } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const headers = { Accept: 'application/json' };
    const auth = (token ?? getPrintAgentToken()).trim();
    if (auth) {
      headers['X-Finvoroo-Print-Token'] = auth;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${PRINT_AGENT_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Print Agent HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    if (err?.name === 'AbortError' || err?.status) throw err;
    const wrapped = new Error(err?.message || 'failed to fetch');
    wrapped.status = 0;
    wrapped.name = 'AbortError';
    throw wrapped;
  } finally {
    clearTimeout(timer);
  }
}

export async function getStatus() {
  try {
    const data = await request('/status', { timeout: STATUS_TIMEOUT_MS, token: '' });
    return {
      running: data?.running === true,
      version: data?.version || null,
      previousVersion: data?.previous_version || null,
      installedVersion: data?.installed_version || data?.version || null,
      platform: data?.platform || null,
      installed: true,
      pairingAvailable: data?.pairing_available !== false,
    };
  } catch {
    return {
      running: false,
      version: null,
      platform: null,
      installed: false,
      pairingAvailable: false,
      message: agentOfflineMessage(),
    };
  }
}

export async function getPrinters() {
  const data = await request('/printers');
  return data.printers || [];
}

export async function getSettings() {
  return request('/settings');
}

export async function pair(code, { workstationId } = {}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const data = await request('/pair', {
    method: 'POST',
    token: '',
    body: {
      code: String(code || '').trim(),
      origin,
      workstation_id: workstationId || undefined,
    },
  });
  if (data?.token) {
    setPrintAgentToken(data.token);
    setPrintDriver(PRINT_DRIVERS.AGENT);
  }
  return data;
}

export async function printRaw(printerId, data, type = 'raw', encoding = 'plain') {
  return request('/print', {
    method: 'POST',
    body: {
      printer_id: printerId,
      type,
      data,
      encoding,
    },
  });
}

export async function printZpl(printerId, zpl) {
  return printRaw(printerId, zpl, 'zpl', 'plain');
}

export async function printLabelZpl(zpl) {
  const printerId = getLabelPrinterId() || getReceiptPrinterId();
  if (!printerId) {
    const err = new Error('Select a label printer in Print Agent settings.');
    err.status = 422;
    throw err;
  }
  return printZpl(printerId, zpl);
}

export async function printESCPOS(printerId, data, encoding = 'base64') {
  return printRaw(printerId, data, 'escpos', encoding);
}

export async function printPdf(printerId, pdfData) {
  const data =
    pdfData instanceof Blob
      ? await blobToBase64(pdfData)
      : pdfData instanceof ArrayBuffer
        ? arrayBufferToBase64(pdfData)
        : String(pdfData || '');
  return request('/print', {
    method: 'POST',
    body: {
      printer_id: printerId,
      type: 'pdf',
      data,
      encoding: 'base64',
    },
  });
}

/**
 * Silent HTML thermal receipt print via the Print Agent WebView2 engine.
 * @param {string} printerId Windows printer name
 * @param {string} htmlDocument Full HTML from buildThermalHtmlDocument()
 * @param {{ paper?: string, openDrawer?: boolean }} [opts]
 */
export async function printHtml(printerId, htmlDocument, { paper = 'thermal_80', openDrawer = false } = {}) {
  const paper_mm = paper === 'thermal_58' ? 58 : 80;
  return request('/print', {
    method: 'POST',
    body: {
      printer_id: printerId,
      type: 'html',
      data: htmlDocument,
      encoding: 'plain',
      options: {
        paper_mm,
        open_drawer: Boolean(openDrawer),
      },
    },
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read PDF'));
    reader.readAsDataURL(blob);
  });
}

/** Common ESC/POS cash-drawer pulse (pin 2). Used after PDF receipt jobs. */
const ESCPOS_OPEN_DRAWER_BYTES = Uint8Array.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

/**
 * html2canvas cannot parse Tailwind v4 oklch() colors from globals.css.
 * Strip app stylesheets in the clone and inject thermal receipt CSS only (hex/rgb).
 */
const THERMAL_CAPTURE_CSS = `
${thermalReceiptCss}
html, body {
  margin: 0;
  padding: 0;
  background: #fff !important;
  color: #000 !important;
}
[data-thermal-capture-root], [data-thermal-capture-root] * {
  --border: #000 !important;
  --table-border: #000 !important;
  --background: #fff !important;
  --foreground: #000 !important;
  --card: #fff !important;
  --card-foreground: #000 !important;
  --muted: #f4f4f5 !important;
  --muted-foreground: #71717a !important;
  --primary: #000 !important;
  --primary-foreground: #fff !important;
}
.thermal-print-source {
  position: static !important;
  left: auto !important;
  width: auto !important;
  pointer-events: auto !important;
}
.thermal-receipt-body,
.thermal-header,
.thermal-logo {
  margin-top: 0 !important;
  padding-top: 0 !important;
}
`;

function sanitizeThermalCaptureDocument(clonedDoc) {
  if (!clonedDoc?.head) return;
  clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => node.remove());
  const style = clonedDoc.createElement('style');
  style.textContent = THERMAL_CAPTURE_CSS;
  clonedDoc.head.appendChild(style);
}

function thermalHtml2CanvasOptions(extra = {}) {
  return {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: (clonedDoc) => sanitizeThermalCaptureDocument(clonedDoc),
    ...extra,
  };
}

/**
 * Clone the on-screen ThermalReceiptBody at the correct paper width, wait for assets,
 * then capture. Same DOM/CSS as Chrome print — not a second receipt template.
 */
async function prepareReceiptElementForCapture(element, paper = 'thermal_80') {
  if (!element) {
    throw new Error('Receipt preview not found');
  }
  const widthMm = paper === 'thermal_58' ? 58 : 80;
  const source = element.querySelector('.thermal-receipt-body') || element;

  const host = document.createElement('div');
  host.setAttribute('data-thermal-capture', '1');
  host.setAttribute('data-thermal-capture-root', '');
  host.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${widthMm}mm`,
    'background:#fff',
    'color:#000',
    'z-index:-1',
    'pointer-events:none',
    'overflow:visible',
  ].join(';');

  const localStyle = document.createElement('style');
  localStyle.textContent = THERMAL_CAPTURE_CSS;
  host.appendChild(localStyle);

  const clone = source.cloneNode(true);
  clone.classList.remove('thermal-print-source');
  clone.setAttribute('data-thermal-capture-root', '');
  clone.style.cssText = [
    'position:static',
    'left:auto',
    'top:auto',
    `width:${widthMm}mm`,
    `max-width:${widthMm}mm`,
    'background:#fff',
    'color:#000',
    'box-shadow:none',
  ].join(';');
  host.appendChild(clone);
  document.body.appendChild(host);

  const imgs = Array.from(clone.querySelectorAll('img'));
  await Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            if (typeof img.decode === 'function') {
              img.decode().then(done).catch(done);
            }
          }),
      ),
    ),
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]);
  if (document.fonts?.ready) {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 400))]);
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  return { host, clone, widthMm, cleanup: () => host.remove() };
}

/**
 * Rasterize the live React receipt (ThermalReceiptBody) to a thermal-sized PDF.
 * Margins/page width mirror printThermalReceipt() @page rules (58mm/80mm).
 */
export async function receiptElementToPdfBlob(element, { paper = 'thermal_80' } = {}) {
  const { clone, widthMm, cleanup } = await prepareReceiptElementForCapture(element, paper);
  try {
    const marginMm = paper === 'thermal_58' ? 2 : 3;
    const topMarginMm = 0;
    const rect = clone.getBoundingClientRect();
    const widthPx = Math.max(1, Math.ceil(rect.width || clone.scrollWidth));
    const heightPx = Math.max(1, Math.ceil(rect.height || clone.scrollHeight));
    const contentHeightMm = Math.ceil((heightPx / widthPx) * widthMm);
    const pageHeightMm = Math.max(contentHeightMm + topMarginMm + marginMm, 40);

    const html2pdf = (await import('html2pdf.js')).default;
    return await html2pdf()
      .set({
        margin: [topMarginMm, marginMm, marginMm, marginMm],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: thermalHtml2CanvasOptions({
          width: widthPx,
          height: heightPx,
          scrollX: 0,
          scrollY: 0,
          windowWidth: widthPx,
          windowHeight: heightPx,
        }),
        jsPDF: { unit: 'mm', format: [widthMm, pageHeightMm], orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(clone)
      .outputPdf('blob');
  } finally {
    cleanup();
  }
}

/** Open cash drawer via a tiny ESC/POS pulse (does not print receipt content). */
export async function openAgentCashDrawer(printerId) {
  const id = (printerId || getReceiptPrinterId()).trim();
  if (!id) return;
  await printESCPOS(id, bytesToBase64(ESCPOS_OPEN_DRAWER_BYTES), 'base64');
}

function canvasToEscPosBytes(source, maxDots) {
  const width = Math.floor(maxDots / 8) * 8;
  const scale = width / Math.max(1, source.width);
  const height = Math.max(1, Math.round(source.height * scale));
  const tmp = document.createElement('canvas');
  tmp.width = width;
  tmp.height = height;
  const ctx = tmp.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const widthBytes = width / 8;
  const raster = new Uint8Array(widthBytes * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (lum < 148) {
        raster[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  const out = [0x1b, 0x40, 0x1b, 0x61, 0x01];
  const strip = 24;
  for (let y0 = 0; y0 < height; y0 += strip) {
    const h = Math.min(strip, height - y0);
    out.push(
      0x1d,
      0x76,
      0x30,
      0x00,
      widthBytes & 0xff,
      (widthBytes >> 8) & 0xff,
      h & 0xff,
      (h >> 8) & 0xff,
    );
    for (let y = 0; y < h; y += 1) {
      const row = (y0 + y) * widthBytes;
      for (let b = 0; b < widthBytes; b += 1) {
        out.push(raster[row + b]);
      }
    }
  }
  out.push(0x1b, 0x64, 0x04, 0x1d, 0x56, 0x41, 0x00);
  return Uint8Array.from(out);
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function thermalTestEscPosBase64() {
  const bytes = [0x1b, 0x40, 0x1b, 0x61, 0x01];
  const text = '\n\n*** Finvoroo ***\nPrint Agent test\n\nTest print OK\n\n\n\n\n\n\n';
  for (let i = 0; i < text.length; i += 1) {
    bytes.push(text.charCodeAt(i) & 0xff);
  }
  bytes.push(0x1b, 0x64, 0x04, 0x1d, 0x56, 0x41, 0x00);
  return bytesToBase64(Uint8Array.from(bytes));
}

function pushAscii(bytes, text) {
  const normalized = String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '?');
  for (let i = 0; i < normalized.length; i += 1) {
    bytes.push(normalized.charCodeAt(i) & 0xff);
  }
}

function wrapReceiptLine(line, width) {
  const text = String(line || '').trimEnd();
  if (!text) return [''];
  if (text.length <= width) return [text];
  const out = [];
  for (let i = 0; i < text.length; i += width) {
    out.push(text.slice(i, i + width));
  }
  return out;
}

function encodeEscPosTextLines(lines, columns = 42) {
  const bytes = [0x1b, 0x40, 0x1b, 0x52, 0x00, 0x1b, 0x74, 0x00];
  let headerDone = false;
  for (const line of lines) {
    const trimmed = String(line || '').trim();
    const isRule = /^[-=_.•●]{3,}$/.test(trimmed.replace(/\s/g, ''));
    if (!headerDone && trimmed && !isRule && !/\d/.test(trimmed.slice(0, 3))) {
      bytes.push(0x1b, 0x61, 0x01);
    } else {
      headerDone = headerDone || Boolean(trimmed);
      bytes.push(0x1b, 0x61, 0x00);
    }
    if (isRule) {
      pushAscii(bytes, '-'.repeat(columns));
      bytes.push(0x0a);
      continue;
    }
    for (const part of wrapReceiptLine(line, columns)) {
      pushAscii(bytes, part);
      bytes.push(0x0a);
    }
  }
  bytes.push(0x0a, 0x0a, 0x1b, 0x64, 0x04, 0x1d, 0x56, 0x41, 0x00);
  return bytesToBase64(Uint8Array.from(bytes));
}

function padReceiptRow(left, right, width) {
  const l = String(left ?? '');
  const r = String(right ?? '');
  if (!r) return l;
  const gap = width - l.length - r.length;
  if (gap >= 1) return `${l}${' '.repeat(gap)}${r}`;
  const maxLeft = Math.max(0, width - r.length - 1);
  return `${l.slice(0, maxLeft)} ${r}`;
}

function fmtReceiptMoney(value, wholeRupees = false) {
  const n = Number(value);
  if (!Number.isFinite(n)) return wholeRupees ? '0' : '0.00';
  if (wholeRupees) return String(Math.round(n));
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtReceiptLineMoney(value) {
  const s = fmtReceiptMoney(value, false);
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function fmtReceiptDateTime(isoOrDisplay) {
  if (!isoOrDisplay) return '';
  const raw = String(isoOrDisplay).trim();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]} ${iso[4] ?? '00'}:${iso[5] ?? '00'}`;
  return fmtReceiptDate(isoOrDisplay);
}

function fmtReceiptDate(isoOrDisplay) {
  if (!isoOrDisplay) return '';
  const raw = String(isoOrDisplay).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) return `${String(dmy[1]).padStart(2, '0')}/${String(dmy[2]).padStart(2, '0')}/${dmy[3]}`;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
  }
  return raw;
}

function fmtReceiptQty(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return '-';
  if (Math.abs(n - Math.round(n)) < 0.00001) return String(Math.round(n));
  return n.toFixed(2).replace(/\.?0+$/, '');
}

function formatAddressOneLine(address) {
  if (!address) return '';
  return String(address)
    .replace(/\s*\n+\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** ESC/POS from receipt props — no DOM / logo wait. Same RAW path as Test print. */
export function thermalReceiptPropsToEscPosTextBase64(props, { columns = 42 } = {}) {
  if (!props) throw new Error('Receipt preview not ready');
  const wholeRupees = Boolean(props.wholeRupees);
  const summaryMoney = (value) => fmtReceiptMoney(value, wholeRupees);
  const lineMoney = (value) => fmtReceiptLineMoney(value);
  const company = props.company || {};
  const number = String(props.documentNumber || '').trim();
  const numberLabel = number ? (number.startsWith('#') ? number : `#${number}`) : '';
  const phone = company.phone ? String(company.phone).trim() : '';
  const addressLine = formatAddressOneLine(company.address_display);
  const linesOut = [];

  linesOut.push(company.name || 'Store');
  if (addressLine) linesOut.push(addressLine);
  if (phone) linesOut.push(phone);
  linesOut.push('---');
  if (numberLabel) linesOut.push(padReceiptRow('Receipt no', numberLabel, columns));
  const when = props.documentDateTime || fmtReceiptDateTime(props.documentDate);
  if (when) linesOut.push(padReceiptRow('Date & time', when, columns));
  if (props.customer) linesOut.push(padReceiptRow('Customer', props.customer, columns));
  linesOut.push('---');

  const itemLines = Array.isArray(props.lines) ? props.lines : [];
  for (const line of itemLines) {
    const name = line.description || line.product_name || line.name || 'Item';
    const qty = fmtReceiptQty(line.quantity);
    const rate = lineMoney(line.unit_price);
    const amount = lineMoney(
      line.line_total ?? line.amount ?? Number(line.quantity || 0) * Number(line.unit_price || 0),
    );
    linesOut.push(name);
    linesOut.push(padReceiptRow(`  ${qty} x ${rate}`, amount, columns));
  }

  linesOut.push('---');
  const total = props.total;
  const subtotal = props.subtotal ?? total;
  linesOut.push(padReceiptRow('Subtotal', summaryMoney(subtotal), columns));
  if (Number(props.discountAmount) > 0.0001) {
    linesOut.push(padReceiptRow('Discount', `-${summaryMoney(props.discountAmount)}`, columns));
  }
  const tax = Number(props.taxAmount) || 0;
  if (tax > 0.0001) {
    const sub = Number(subtotal) || 0;
    const pct = sub > 0.0001 ? Math.round((tax / sub) * 100) : 0;
    linesOut.push(padReceiptRow(`${props.taxLabel || 'Tax'} (${pct}%)`, summaryMoney(tax), columns));
  }
  if (Number(props.posFeeAmount) > 0.0001) {
    linesOut.push(
      padReceiptRow(props.posFeeLabel || 'POS Fee', summaryMoney(props.posFeeAmount), columns),
    );
  }
  const summaryTotal = wholeRupees ? Math.round(Number(total) || 0) : Number(total) || 0;
  const summaryPaid =
    wholeRupees ? Math.round(Number(props.amountPaid) || 0) : Number(props.amountPaid) || 0;
  const explicitChange = Number(props.changeDue) || 0;
  const summaryChange = wholeRupees
    ? Math.max(0, explicitChange > 0.0001 ? Math.round(explicitChange) : summaryPaid - summaryTotal)
    : Math.max(0, explicitChange || summaryPaid - summaryTotal);
  linesOut.push(padReceiptRow('Total', summaryMoney(total), columns));
  if (summaryPaid > 0.0001 || summaryChange > 0.0001) {
    linesOut.push('---');
  }
  if (summaryPaid > 0.0001) {
    linesOut.push(padReceiptRow('Cash', summaryMoney(props.amountPaid), columns));
  }
  if (summaryChange > 0.0001) {
    linesOut.push(padReceiptRow('Change', summaryMoney(summaryChange), columns));
  }
  if (Number(props.balanceDue) > 0.0001) {
    linesOut.push('---');
    linesOut.push('UNPAID');
    linesOut.push(padReceiptRow('Amount due', summaryMoney(props.balanceDue), columns));
  }
  linesOut.push('---');
  const brand = [getSystemBrandName(), getSystemBrandTagline()].filter(Boolean).join(' • ');
  if (brand) linesOut.push(brand.toUpperCase());
  if (!linesOut.join('').trim()) {
    throw new Error('Receipt preview not ready');
  }
  return encodeEscPosTextLines(linesOut, columns);
}

/** ESC/POS text of the on-screen receipt — same path as the working Test print. */
export function receiptElementToEscPosTextBase64(element, { columns = 42 } = {}) {
  if (!element) {
    throw new Error('Receipt preview not found');
  }
  const source = element.querySelector('.thermal-receipt-body') || element;
  const raw = String(source.innerText || source.textContent || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ');
  const lines = raw
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .filter((line, i, all) => line || all[i - 1]);
  if (!lines.join('').trim()) {
    throw new Error('Receipt preview not ready');
  }
  return encodeEscPosTextLines(lines, columns);
}

/** Raster ESC/POS fallback — prefer receiptElementToPdfBlob for visual receipts. */
export async function receiptElementToEscPosBase64(element, { paper = 'thermal_80' } = {}) {
  const { clone, cleanup } = await prepareReceiptElementForCapture(element, paper);
  const maxDots = paper === 'thermal_58' ? 384 : 512;
  const html2canvas = (await import('html2canvas')).default;

  try {
    const canvas = await html2canvas(clone, thermalHtml2CanvasOptions({
      scale: 1,
      scrollX: 0,
      scrollY: 0,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
    }));
    if (!canvas.width || !canvas.height) {
      throw new Error('Could not capture receipt');
    }
    return bytesToBase64(canvasToEscPosBytes(canvas, maxDots));
  } finally {
    cleanup();
  }
}

function base64ToBytes(b64) {
  const binary = atob(String(b64 || ''));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/** Split a GS v 0 raster payload into ~3.5KB jobs for older Windows thermal drivers. */
export function splitEscPosRasterJobs(base64, maxBytes = 3500) {
  const bytes = base64ToBytes(base64);
  const strips = [];
  let i = 0;
  if (bytes[0] === 0x1b && bytes[1] === 0x40) {
    i = 2;
    if (bytes[2] === 0x1b && bytes[3] === 0x61) i = 5;
  }
  const init = bytes.subarray(0, i);
  while (i + 8 <= bytes.length && bytes[i] === 0x1d && bytes[i + 1] === 0x76 && bytes[i + 2] === 0x30) {
    const widthBytes = bytes[i + 4] + (bytes[i + 5] << 8);
    const h = bytes[i + 6] + (bytes[i + 7] << 8);
    const end = i + 8 + widthBytes * h;
    if (end > bytes.length) break;
    strips.push(bytes.subarray(i, end));
    i = end;
  }
  const tail = bytes.subarray(i);
  if (strips.length === 0) return [base64];

  const concat = (parts) => {
    const len = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  };

  const jobs = [];
  let parts = init.length ? [init] : [];
  let size = init.length;
  for (let s = 0; s < strips.length; s += 1) {
    const strip = strips[s];
    const extra = s === strips.length - 1 ? tail.length : 0;
    if (parts.length && size + strip.length + extra > maxBytes) {
      jobs.push(bytesToBase64(concat(parts)));
      parts = [];
      size = 0;
    }
    parts.push(strip);
    size += strip.length;
    if (s === strips.length - 1 && tail.length) {
      parts.push(tail);
      size += tail.length;
    }
  }
  if (parts.length) jobs.push(bytesToBase64(concat(parts)));
  return jobs.length ? jobs : [base64];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryablePrintError(err) {
  const raw = String(err?.data?.error || err?.message || '');
  return err?.status === 429 || /already in progress/i.test(raw);
}

async function printESCPOSRetry(printerId, data, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i += 1) {
    try {
      await printESCPOS(printerId, data, 'base64');
      return;
    } catch (err) {
      lastErr = err;
      if (!isRetryablePrintError(err) || i === tries - 1) throw err;
      await sleep(160 * (i + 1));
    }
  }
  throw lastErr;
}

/** Send raster as small RAW jobs. Never send the full bitmap in one WritePrinter call. */
export async function printEscPosJobs(printerId, base64) {
  const jobs = splitEscPosRasterJobs(base64, 2800);
  for (let i = 0; i < jobs.length; i += 1) {
    await printESCPOSRetry(printerId, jobs[i]);
    if (i < jobs.length - 1) await sleep(160);
  }
}

export const THERMAL_TEST_ESCPOS_BASE64 = thermalTestEscPosBase64();

export const printAgent = {
  getStatus,
  getPrinters,
  getSettings,
  pair,
  printZpl,
  printZPL: printZpl,
  printLabelZpl,
  printPdf,
  printPDF: printPdf,
  printHtml,
  printRaw,
  printESCPOS,
  getPrintDriver,
  setPrintDriver,
  getReceiptPaper,
  setReceiptPaper,
};

/** Tiny one-page PDF for agent test prints (base64). */
export const FINVOROO_TEST_PDF_BASE64 =
  'JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDUgMCBSPj4+Pj4+ZW5kb2JqCjQgMCBvYmo8PC9MZW5ndGggNzI+PnN0cmVhbQpCVCAvRjEgMjQgVGYgNzIgNzIwIFRkIChGaW52b3JvbyBQcmludCBBZ2VudCkgVGogRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj5lbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjY2IDAwMDAwIG4gCjAwMDAwMDA0NDYgMDAwMDAgbiAKdHJhaWxlcjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjUyMwolJUVPRgo=';

export default printAgent;
