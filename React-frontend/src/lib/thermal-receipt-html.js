/**
 * Isolated thermal receipt HTML for silent HTML print (QZ / future Print Agent html job).
 * Uses only thermal-receipt-print.css — no Tailwind oklch globals.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import thermalReceiptCss from '@/styles/thermal-receipt-print.css?inline';
import { ThermalReceiptBody } from '@/pages/accounting/document-output/components/ThermalReceiptBody';

export function absolutizeReceiptImages(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  wrap.querySelectorAll('img[src]').forEach((img) => {
    try {
      img.src = new URL(img.getAttribute('src'), window.location.origin).href;
    } catch {
      /* keep as-is */
    }
  });
  return wrap.innerHTML;
}

/** Full HTML document for 58mm / 80mm thermal receipt printing. */
export function buildThermalHtmlDocument(html, paper = 'thermal_80') {
  const width = paper === 'thermal_58' ? '58mm' : '80mm';
  const widthClass = paper === 'thermal_58' ? 'print-thermal-receipt-58' : 'print-thermal-receipt-80';
  const body = absolutizeReceiptImages(html);
  return `<!DOCTYPE html>
<html class="print-thermal-receipt-only ${widthClass}"><head><meta charset="utf-8"><style>
${thermalReceiptCss}
/* Chrome uses height:auto. WebView2 treats auto as ~0 and shrinks the receipt
   to a stamp — the print agent overrides this with an explicit height after measure. */
@page { size: ${width} auto; margin: 0; }
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #000;
  width: ${width};
  max-width: ${width};
}
#pos-receipt-print, .thermal-receipt-body, .thermal-receipt-sheet {
  width: ${width} !important;
  max-width: ${width} !important;
}
.thermal-print-source { position: static !important; left: auto !important; width: ${width} !important; }
.thermal-receipt-stage { background: #fff !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
.thermal-receipt-body { padding-top: 0 !important; }
</style></head><body><div id="pos-receipt-print">${body}</div></body></html>`;
}

export function buildThermalHtmlFromElement(elementId, paper = 'thermal_80') {
  const el = document.getElementById(elementId);
  const content = el?.innerHTML?.trim() || '';
  if (!content) return null;
  return buildThermalHtmlDocument(content, paper);
}

/** Render ThermalReceiptBody props to HTML without mounting React in the page. */
export function buildThermalReceiptInnerHtml(thermalProps) {
  if (!thermalProps) return '';
  return renderToStaticMarkup(createElement(ThermalReceiptBody, thermalProps));
}

/** Full print-ready HTML document from receipt props (no DOM wait). */
export function buildThermalHtmlFromProps(thermalProps, paper = 'thermal_80') {
  const content = buildThermalReceiptInnerHtml(thermalProps).trim();
  if (!content) return null;
  return buildThermalHtmlDocument(content, paper);
}

/** Roll width vs printable width (matches Finvoroo Print Agent escpos_raster::paper_geometry). */
export function thermalPrintGeometry(paper = 'thermal_80') {
  if (paper === 'thermal_58') {
    return { rollMm: 58, layoutMm: 48 };
  }
  return { rollMm: 80, layoutMm: 72 };
}

/**
 * Prepare server designer HTML (canvas or block thermal) for Print Agent WebView2.
 * Uses browser adapter output (forPrint styles) and fits 80mm canvas into 72mm printable width.
 */
export function prepareDesignerHtmlForPrintAgent(html, paper = 'thermal_80') {
  const raw = String(html || '').trim();
  if (!raw) return null;

  const { rollMm, layoutMm } = thermalPrintGeometry(paper);
  const fitScale = layoutMm / rollMm;

  if (typeof DOMParser === 'undefined') {
    return raw;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'text/html');
  const bodyHtml = doc.body?.innerHTML?.trim() || '';
  if (!bodyHtml) return null;

  const isCanvas = Boolean(doc.querySelector('.canvas-page'));
  const headStyles = Array.from(doc.head?.querySelectorAll('style') || [])
    .map((el) => el.textContent || '')
    .join('\n');

  const printOverrides = `
body{margin:0!important;padding:0!important;background:#fff!important;color:#000!important;}
.canvas-page{margin:0!important;box-shadow:none!important;background:#fff!important;}
.receipt{margin:0!important;}
`;

  let bodyContent = bodyHtml;
  let agentCss = printOverrides;

  if (isCanvas) {
    // Do not use #pos-receipt-print here — Print Agent resets transform on its descendants.
    agentCss += `
html,body{width:${layoutMm}mm!important;max-width:${layoutMm}mm!important;overflow:hidden!important;background:#fff!important;}
.finvoroo-canvas-fit{width:${rollMm}mm!important;transform:scale(${fitScale});transform-origin:top left;margin:0!important;padding:0!important;}
.finvoroo-canvas-fit .canvas-page{width:${rollMm}mm!important;height:auto!important;min-height:0!important;overflow:visible!important;}
`;
    bodyContent = `<div class="finvoroo-canvas-fit">${bodyHtml}</div>`;
  } else {
    agentCss += `
html.print-thermal-receipt-only,html.print-thermal-receipt-only body{width:${layoutMm}mm!important;max-width:${layoutMm}mm!important;margin:0!important;padding:0!important;}
#pos-receipt-print{width:${layoutMm}mm!important;max-width:${layoutMm}mm!important;margin:0!important;padding:0!important;}
`;
    bodyContent = `<div id="pos-receipt-print">${bodyHtml}</div>`;
  }

  const htmlClass = isCanvas ? '' : ' class="print-thermal-receipt-only"';
  return `<!DOCTYPE html>
<html${htmlClass}><head><meta charset="utf-8"><style>
${headStyles}
${agentCss}
</style></head><body>${bodyContent}</body></html>`;
}
