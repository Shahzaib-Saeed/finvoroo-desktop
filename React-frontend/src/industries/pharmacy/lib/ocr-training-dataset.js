import { pharmacyApi } from '../api/pharmacy.api';

/**
 * Send pharmacist-verified invoice lines to the OCR training dataset.
 * Never blocks receiving — failures are ignored.
 */
export function submitOcrTrainingCorrections({
  extractionId,
  vendorId,
  billId,
  humanVerified = false,
  lines = [],
} = {}) {
  const payloadLines = (lines || [])
    .map((line, index) => toTrainingLine(line, index, extractionId))
    .filter(Boolean);
  if (!payloadLines.length) return;

  void pharmacyApi
    .submitOcrTrainingCorrections({
      extraction_id: extractionId ? Number(extractionId) : undefined,
      vendor_id: vendorId ? Number(vendorId) : 0,
      bill_id: billId ? Number(billId) : undefined,
      human_verified: Boolean(humanVerified),
      lines: payloadLines,
    })
    .catch(() => {
      /* non-blocking */
    });
}

function toTrainingLine(line, fallbackIndex, fallbackExtractionId) {
  const ocrText = String(line?.supplier_invoice_label || line?.ocr_text || '').trim();
  const productId = Number(line?.product_id);
  const fromOcr = Boolean(line?._fromOcr || ocrText);
  if (!fromOcr) return null;

  const extractionId = Number(line?._ocrExtractionId || fallbackExtractionId) || undefined;
  const lineIndex =
    line?._ocrLineIndex != null && line._ocrLineIndex !== ''
      ? Number(line._ocrLineIndex)
      : fallbackIndex;

  return {
    extraction_id: extractionId,
    line_index: Number.isFinite(lineIndex) ? lineIndex : fallbackIndex,
    ocr_text: ocrText || undefined,
    product_id: Number.isFinite(productId) && productId > 0 ? productId : undefined,
    product_name: String(line?.name || '').trim() || undefined,
    corrected: {
      product_description: ocrText || line?.name || null,
      item_code: line?.item_code || null,
      units: line?.packing || null,
      batch_no: line?.batch_number || null,
      mfg_date: line?.manufactured_date || null,
      expiry_date: line?.expiry_date || null,
      qty: line?.quantity ?? null,
      bonus: line?.bonus ?? null,
      trade_price: line?.unit_price ?? null,
      discount_percent: line?.discount_type === 'percent' ? line?.discount : line?.discount_percent,
      discount_amount: line?.discount_type === 'fixed' ? line?.discount : line?.discount_amount,
      tax_percent: line?.gst_percent ?? null,
      tax_amount: line?.tax_amount ?? null,
      line_total: line?.invoice_line_total ?? null,
      product_id: Number.isFinite(productId) && productId > 0 ? productId : null,
    },
  };
}

/** Stamp page extraction id + line index so multi-page bills map back to samples. */
export function stampOcrLineOrigins(rows, extractionId) {
  const id = extractionId != null ? Number(extractionId) : null;
  return (rows || []).map((row, index) => ({
    ...row,
    _ocrExtractionId: row._ocrExtractionId ?? id,
    _ocrLineIndex: row._ocrLineIndex ?? index,
  }));
}

/**
 * Restore merged history items onto per-page extraction ids using page item_counts.
 */
export function stampOcrLinesFromPages(rows, pages, fallbackExtractionId) {
  const list = rows || [];
  if (!Array.isArray(pages) || pages.length === 0) {
    return stampOcrLineOrigins(list, fallbackExtractionId);
  }
  const out = [];
  let offset = 0;
  pages.forEach((page) => {
    const count = Number(page?.item_count);
    const take = Number.isFinite(count) && count > 0 ? count : 0;
    const slice = take > 0 ? list.slice(offset, offset + take) : [];
    slice.forEach((row, i) => {
      out.push({
        ...row,
        _ocrExtractionId: page.id,
        _ocrLineIndex: i,
      });
    });
    offset += slice.length;
  });
  list.slice(offset).forEach((row, i) => {
    const last = pages[pages.length - 1];
    out.push({
      ...row,
      _ocrExtractionId: row._ocrExtractionId ?? last?.id ?? fallbackExtractionId,
      _ocrLineIndex: row._ocrLineIndex ?? i,
    });
  });
  return out;
}
