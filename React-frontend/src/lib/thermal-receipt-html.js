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
