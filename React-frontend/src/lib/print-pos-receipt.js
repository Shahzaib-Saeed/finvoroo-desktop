import { toast } from 'sonner';
import { PosHardwareBridge } from '@/pages/accounting/pos/lib/hardware-bridge';
import { printThermalReceipt } from '@/lib/print-invoice';
import {
  buildThermalHtmlFromElement,
  buildThermalHtmlFromProps,
  buildThermalReceiptInnerHtml,
} from '@/lib/thermal-receipt-html';
import { inlineReceiptImagesInDocument, warmReceiptLogoCache } from '@/lib/thermal-receipt-images';
import {
  documentOutputApi,
  unwrapDoc,
} from '@/pages/accounting/document-output/api/document-output.api';
import {
  PRINT_DRIVERS,
  formatPrintAgentError,
  getPrintDriver,
  getReceiptPrinterId,
  getPrintAgentToken,
  printESCPOS,
  printHtml,
} from '@/lib/print-agent';

export { warmReceiptLogoCache };

export const POS_BRIDGE_URL_KEY = 'finvoroo.pos.bridge_url';

let printInFlight = false;

export function getPosBridgeUrl() {
  try {
    return (localStorage.getItem(POS_BRIDGE_URL_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function setPosBridgeUrl(url) {
  try {
    localStorage.setItem(POS_BRIDGE_URL_KEY, String(url || '').trim());
  } catch {
    /* ignore */
  }
}

async function waitForReceiptImages(elementId, timeoutMs = 400) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const imgs = Array.from(el.querySelectorAll('img'));
  if (imgs.length === 0) return;

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
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/**
 * Fetch ESC/POS bytes from Laravel document-output.
 * Used only when no on-screen ThermalReceiptBody is available (DocumentPrintMenu fallback).
 */
export async function fetchEscPosReceipt({
  documentType = 'pos_receipt',
  documentId,
  layoutId = null,
  paper = 'thermal_80',
  openDrawer = false,
} = {}) {
  if (!documentId) {
    throw new Error('Receipt ID not ready');
  }

  const widthMm = paper === 'thermal_58' ? 58 : 80;
  const res = await documentOutputApi.render(documentType, documentId, {
    adapter: 'escpos',
    layout_id: layoutId || undefined,
    options: {
      open_drawer: openDrawer,
      cut_paper: true,
      thermal_width_mm: widthMm,
    },
  });

  const data = unwrapDoc(res);
  const bytes =
    data?.encoding === 'base64' && typeof data?.body === 'string'
      ? data.body
      : typeof data?.body === 'string'
        ? data.body
        : null;

  if (!bytes) {
    throw new Error('Thermal bytes unavailable');
  }

  return bytes;
}

/**
 * Print Agent — styled HTML receipt via WebView2 raster (silent thermal output).
 */
async function printViaAgent({ elementId, paper, openDrawer, htmlDocument = null }) {
  const printerId = getReceiptPrinterId();
  if (!printerId) {
    toast.error('Select a receipt printer in Print Agent settings.');
    return { ok: false, via: 'finvoroo-print-agent', silent: false, reason: 'no_printer' };
  }
  if (!getPrintAgentToken()) {
    toast.error('Finvoroo Print Agent is not paired on this PC.');
    return { ok: false, via: 'finvoroo-print-agent', silent: false, reason: 'unpaired' };
  }

  let doc = htmlDocument || buildThermalHtmlFromElement(elementId, paper);
  if (!doc) {
    toast.error('Receipt preview not ready');
    return { ok: false, via: 'finvoroo-print-agent', silent: false, reason: 'no_receipt_dom' };
  }

  try {
    if (!htmlDocument && elementId) {
      await waitForReceiptImages(elementId, 120);
    }
    doc = await inlineReceiptImagesInDocument(doc);
    await printHtml(printerId, doc, { paper, openDrawer });
    return { ok: true, via: 'finvoroo-print-agent', silent: true, type: 'html' };
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      formatPrintAgentError(err, printerId) ||
      err?.message ||
      'Printing failed. Please check the printer.';
    console.error('[Finvoroo print] receipt print failed', {
      printerId,
      elementId,
      status: err?.status,
      message: msg,
    });
    toast.error(msg);
    return { ok: false, via: 'finvoroo-print-agent', silent: false, reason: 'print_failed' };
  }
}

async function printViaQz({ elementId, paper }) {
  try {
    const qz = await import('@/lib/qz-print-service');
    const result = await qz.printHtmlReceipt(null, { paper, elementId });
    if (result?.ok === false) {
      toast.error(result.message || result.reason || 'QZ Tray print failed');
      return { ok: false, via: 'qz', silent: false };
    }
    return { ok: true, via: 'qz', silent: true };
  } catch (err) {
    toast.error(err?.message || 'QZ Tray print failed');
    return { ok: false, via: 'qz', silent: false };
  }
}

function mountTemporaryReceiptElement(innerHtml, elementId = 'pos-receipt-print-temp') {
  const host = document.createElement('div');
  host.id = elementId;
  host.className = 'thermal-print-source';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none;';
  host.innerHTML = innerHtml;
  document.body.appendChild(host);
  return host;
}

/**
 * Print the on-screen receipt (ThermalReceiptBody HTML/CSS).
 * Pass thermalProps to print immediately from checkout data (no React mount delay).
 * finvoroo-agent → styled HTML raster via Print Agent (logos inlined for speed)
 * qz → QZ HTML silent
 * browser → Chrome print (silent with kiosk shortcut)
 */
export async function printPosReceipt({
  elementId = 'pos-receipt-print',
  paper = 'thermal_80',
  openDrawer = true,
  invoiceId = null,
  documentType = 'pos_receipt',
  layoutId = null,
  thermalProps = null,
} = {}) {
  if (printInFlight) {
    return { ok: false, reason: 'print_in_progress', silent: false };
  }

  printInFlight = true;
  let tempHost = null;
  let activeElementId = elementId;

  try {
    const driver = getPrintDriver();

    if (thermalProps && driver === PRINT_DRIVERS.AGENT) {
      const directHtml = buildThermalHtmlFromProps(thermalProps, paper);
      if (directHtml) {
        return printViaAgent({ htmlDocument: directHtml, paper, openDrawer });
      }
    }

    if (thermalProps) {
      const innerHtml = buildThermalReceiptInnerHtml(thermalProps);
      if (!innerHtml.trim()) {
        toast.error('Receipt preview not ready');
        return { ok: false, via: 'none', silent: false };
      }
      tempHost = mountTemporaryReceiptElement(innerHtml);
      activeElementId = tempHost.id;
    }

    const el = document.getElementById(activeElementId);
    const hasHtml = Boolean(el?.innerHTML?.trim());
    if (!hasHtml) {
      toast.error('Receipt preview not ready');
      return { ok: false, via: 'none', silent: false };
    }

    await waitForReceiptImages(activeElementId);

    if (driver === PRINT_DRIVERS.AGENT) {
      return printViaAgent({ elementId: activeElementId, paper, openDrawer });
    }

    let result;
    if (driver === PRINT_DRIVERS.QZ) {
      result = await printViaQz({ elementId: activeElementId, paper });
    } else {
      const printed = await printThermalReceipt({ elementId: activeElementId, paper });
      result = { ok: printed !== false, via: 'browser', silent: false };
    }

    if (openDrawer && result.ok) await PosHardwareBridge.openCashDrawer().catch(() => {});
    return result;
  } finally {
    tempHost?.remove();
    printInFlight = false;
  }
}

export async function printEscPosPayload(bytesBase64) {
  if (!bytesBase64) return { ok: false, reason: 'no_bytes' };
  const driver = getPrintDriver();
  if (driver === PRINT_DRIVERS.AGENT) {
    const printerId = getReceiptPrinterId();
    if (!printerId) {
      return { ok: false, reason: 'no_printer' };
    }
    try {
      await printESCPOS(printerId, bytesBase64, 'base64');
      return { ok: true, via: 'finvoroo-print-agent' };
    } catch (err) {
      return { ok: false, reason: formatPrintAgentError(err, printerId) };
    }
  }
  return PosHardwareBridge.printEscPos({ bytesBase64 });
}

let browserPrintHintShown = false;

export function maybeHintBrowserPrintSetup() {
  if (browserPrintHintShown) return;
  const driver = getPrintDriver();
  if (driver !== PRINT_DRIVERS.BROWSER) return;
  browserPrintHintShown = true;
  toast.message(
    'For silent printing: install Finvoroo Print Agent, or use the Chrome kiosk shortcut from Pharmacy settings.',
    { duration: 10000 },
  );
}
