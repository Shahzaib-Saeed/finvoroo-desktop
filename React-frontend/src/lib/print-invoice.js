import { toast } from 'sonner';
import {
  PRINT_DRIVERS,
  formatPrintAgentError,
  printerIsThermal,
  getInvoicePrinterId,
  getPrintDriver,
  getStatus,
  printPdf,
  receiptElementToPdfBlob,
} from '@/lib/print-agent';

const PRINT_ROOT_CLASS = 'print-invoice-document-only';

const PAPER_CLASS = {
  a4: 'print-invoice-a4',
  a5: 'print-invoice-a5',
};

function resolveOptions(options) {
  if (typeof options === 'string') {
    return { elementId: options, paper: 'a4' };
  }
  return {
    elementId: 'invoice-document',
    paper: 'a4',
    ...options,
  };
}

/**
 * Print the on-screen invoice (#invoice-document) — WYSIWYG with the page preview.
 * Uses Finvoroo Print Agent silently when that driver is selected.
 */
export async function printInvoiceDocument(options = {}) {
  const { elementId, paper } = resolveOptions(options);
  const el = document.getElementById(elementId);

  if (getPrintDriver() === PRINT_DRIVERS.AGENT) {
    const status = await getStatus();
    if (!status.running) {
      toast.error('Finvoroo Print Agent is offline. Please start Finvoroo Print Agent.');
      return;
    }
    const printerId = getInvoicePrinterId();
    if (!printerId) {
      toast.error('Select an invoice printer in Print Agent settings.');
      return;
    }
    if (!el) {
      toast.error('Invoice preview not found');
      return;
    }
    try {
      if (printerIsThermal({ name: printerId, id: printerId })) {
        const thermalEl =
          document.getElementById('invoice-thermal-print') ||
          document.getElementById(elementId);
        const printed = await printThermalReceipt({
          elementId: thermalEl?.id || elementId,
          paper: 'thermal_80',
        });
        if (!printed) throw new Error('Print failed');
      } else {
        const html2pdf = (await import('html2pdf.js')).default;
        const format = paper === 'a5' ? 'a5' : 'a4';
        const blob = await html2pdf()
          .set({
            margin: [8, 8, 8, 8],
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
            },
            jsPDF: { unit: 'mm', format, orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] },
          })
          .from(el)
          .outputPdf('blob');
        await printPdf(printerId, blob);
      }
      toast.success('Invoice sent to printer');
    } catch (err) {
      toast.error(formatPrintAgentError(err, printerId));
    }
    return;
  }

  if (!el) {
    window.print();
    return;
  }

  const root = document.documentElement;
  const paperClass = PAPER_CLASS[paper] || PAPER_CLASS.a4;
  root.classList.add(PRINT_ROOT_CLASS, paperClass);

  const cleanup = () => {
    root.classList.remove(PRINT_ROOT_CLASS, paperClass);
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  requestAnimationFrame(() => window.print());
}

/**
 * Download PDF from the on-screen invoice — matches preview layout (A4 or A5).
 */
export async function saveInvoicePdf(options = {}) {
  const {
    elementId = 'invoice-document',
    paper = 'a4',
    filename = 'invoice.pdf',
  } = options;

  const el = document.getElementById(elementId);
  if (!el) {
    toast.error('Invoice preview not found');
    return;
  }

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const format = paper === 'a5' ? 'a5' : 'a4';

    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm', format, orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(el)
      .save();

    toast.success('PDF downloaded');
  } catch (err) {
    toast.error(err?.message || 'PDF export failed');
  }
}

const THERMAL_ROOT = 'print-thermal-receipt-only';
const THERMAL_WIDTH = {
  thermal_58: 'print-thermal-receipt-58',
  thermal_80: 'print-thermal-receipt-80',
};

/**
 * Print thermal receipt (58mm / 80mm) from #pos-receipt-print or #invoice-thermal-print.
 * Returns a promise that resolves after the print dialog closes.
 */
export function printThermalReceipt(options = {}) {
  const {
    elementId = document.getElementById('invoice-thermal-print')
      ? 'invoice-thermal-print'
      : 'pos-receipt-print',
    paper = 'thermal_80',
  } = options;

  const el = document.getElementById(elementId);
  if (!el) {
    toast.error('Receipt not found');
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const root = document.documentElement;
    const widthClass = THERMAL_WIDTH[paper] || THERMAL_WIDTH.thermal_80;
    root.classList.add(THERMAL_ROOT, widthClass);

    const style = document.createElement('style');
    style.id = 'thermal-print-page-size';
    const margin = paper === 'thermal_58' ? '2mm' : '3mm';
    const width = paper === 'thermal_58' ? '58mm' : '80mm';
    style.textContent = `@page { size: ${width} auto; margin: ${margin}; }`;
    document.head.appendChild(style);

    const cleanup = () => {
      root.classList.remove(THERMAL_ROOT, widthClass);
      document.getElementById('thermal-print-page-size')?.remove();
      window.removeEventListener('afterprint', cleanup);
      resolve(true);
    };

    window.addEventListener('afterprint', cleanup);
    requestAnimationFrame(() => window.print());
  });
}
