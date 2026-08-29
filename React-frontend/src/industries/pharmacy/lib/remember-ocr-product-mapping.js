import { pharmacyApi } from '../api/pharmacy.api';

/**
 * Persist a pharmacist-verified OCR label → catalog product mapping.
 * Failures are ignored so linking a medicine never blocks receiving.
 */
export function rememberOcrProductMapping({
  vendorId,
  invoiceLabel,
  productId,
  itemCode,
  ocrEngine,
} = {}) {
  const label = String(invoiceLabel || '').trim();
  const id = Number(productId);
  if (!label || !Number.isFinite(id) || id <= 0) return;

  void pharmacyApi
    .rememberSupplierProductAliases({
      vendor_id: vendorId ? Number(vendorId) : 0,
      verified: true,
      source: 'user_verify',
      ocr_engine: ocrEngine || undefined,
      lines: [
        {
          invoice_label: label,
          product_id: id,
          item_code: itemCode ? String(itemCode).trim() : undefined,
        },
      ],
    })
    .catch(() => {
      /* non-blocking */
    });
}
