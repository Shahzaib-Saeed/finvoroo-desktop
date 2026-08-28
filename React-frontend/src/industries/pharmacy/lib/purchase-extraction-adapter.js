/**
 * Adapter between Gemini OCR review rows and ReceiveGrn emptyLine shape.
 * Does not post bills — handoff only.
 */

export function emptyExtractionRow() {
  return {
    item_code: '',
    product_description: '',
    units: '',
    batch_no: '',
    expiry_date: '',
    qty: '',
    bonus: '',
    trade_price: '',
    gross_amount: '',
    discount_percent: '',
    discount_amount: '',
    tax_percent: '',
    tax_amount: '',
    further_tax: '',
    line_total: '',
    matched_product_id: null,
    matched_product_name: '',
    matched_product_image: '',
    match_confidence: 0,
    match_status: 'unmatched',
  };
}

export function apiItemsToExtractionRows(items) {
  return (items || []).map((item) =>
    normalizeExtractionRow({
      ...emptyExtractionRow(),
      item_code: item.item_code ?? '',
      product_description: item.product_description ?? '',
      units: item.units ?? '',
      batch_no: item.batch_no ?? '',
      expiry_date: item.expiry_date ?? '',
      qty: numOrEmpty(item.qty),
      bonus: numOrEmpty(item.bonus),
      trade_price: numOrEmpty(item.trade_price),
      gross_amount: numOrEmpty(item.gross_amount),
      discount_percent: numOrEmpty(item.discount_percent),
      discount_amount: numOrEmpty(item.discount_amount),
      tax_percent: numOrEmpty(item.tax_percent),
      tax_amount: numOrEmpty(item.tax_amount),
      further_tax: numOrEmpty(item.further_tax),
      line_total: numOrEmpty(item.line_total),
      matched_product_id: item.matched_product_id ?? null,
      matched_product_name: item.matched_product_name ?? '',
      matched_product_image: item.matched_product_image ?? item.image_url ?? '',
      match_confidence: Number(item.match_confidence) || 0,
      match_status: item.match_status || 'unmatched',
    }),
  );
}

function numOrEmpty(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? String(v) : '';
}

/** Paid qty on supplier bill — bonus-only lines (no paid qty) must stay 0, not default to 1. */
function resolveExtractionQuantity(row) {
  if (hasValue(row?.qty)) return String(row.qty);
  const bonus = n(row?.bonus);
  if (bonus > 0) return '0';
  return '';
}

export function normalizeExtractionRow(row) {
  if (!row || typeof row !== 'object') return row;
  const qty = resolveExtractionQuantity(row);
  return {
    ...row,
    qty: qty !== '' ? qty : numOrEmpty(row.qty),
    bonus: numOrEmpty(row.bonus),
  };
}

/** Product dialog prefill from an OCR / scan review row. */
export function extractionRowToProductPrefill(row) {
  const packing = String(row?.units || '').trim();
  const packNum = /^\d+$/.test(packing) ? packing : '';
  const purchase = row?.trade_price ?? '';
  const metaBits = [
    packing && !packNum ? `Packing: ${packing}` : null,
    row?.item_code ? `Supplier code: ${row.item_code}` : null,
    row?.batch_no ? `Batch: ${row.batch_no}` : null,
    row?.expiry_date ? `Expiry: ${row.expiry_date}` : null,
  ].filter(Boolean);

  return {
    name: String(row?.product_description || row?.matched_product_name || '').trim(),
    type: 'inventory',
    sku: row?.item_code ? String(row.item_code).trim() : '',
    barcode: '',
    purchase_price: purchase === '' || purchase == null ? '' : String(purchase),
    unit_price: '',
    mrp: '',
    description: metaBits.join('\n'),
    manufacturer: '',
    pharmacy: {
      generic_name: '',
      strength_text: '',
      pack_size: packNum || '',
      units_per_pack: packNum || '',
    },
  };
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function hasValue(v) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

function moneyRound(v) {
  return Math.round(v * 100) / 100;
}

function lineDiscountAmount(normalized, gross) {
  if (hasValue(normalized.discount_amount)) return n(normalized.discount_amount);
  if (hasValue(normalized.discount_percent) && gross > 0) {
    return (gross * n(normalized.discount_percent)) / 100;
  }
  return 0;
}

/**
 * Resolve exclusive (pre-tax) unit price from OCR fields.
 * Serene-style bills sometimes OCR "Value Including / qty" as trade_price — detect and fix.
 */
export function resolveOcrUnitPrice(normalized, qty = 1) {
  const q = Math.max(n(qty), 1);
  const tradePrice = hasValue(normalized.trade_price) ? n(normalized.trade_price) : null;
  const grossAmount = hasValue(normalized.gross_amount) ? n(normalized.gross_amount) : null;
  const lineTotal = hasValue(normalized.line_total) ? n(normalized.line_total) : null;
  const taxAmount = hasValue(normalized.tax_amount) ? n(normalized.tax_amount) : 0;
  const furtherTax = hasValue(normalized.further_tax) ? n(normalized.further_tax) : 0;
  const combinedTax = taxAmount + furtherTax;
  const tol = (base) => Math.max(0.05, base * 0.002);

  if (grossAmount != null && grossAmount > 0) {
    return String(moneyRound(grossAmount / q));
  }

  if (tradePrice != null && lineTotal != null) {
    const tradeGross = tradePrice * q;
    const disc = lineDiscountAmount(normalized, tradeGross);
    const tradeLineNet = tradeGross - disc;

    if (Math.abs(tradeLineNet - lineTotal) <= tol(lineTotal)) {
      const exclusiveLine = lineTotal - combinedTax;
      if (exclusiveLine > 0) {
        return String(moneyRound(exclusiveLine / q));
      }
    }

    const expectedInc = tradeLineNet + combinedTax;
    if (Math.abs(expectedInc - lineTotal) <= tol(lineTotal)) {
      return String(tradePrice);
    }
  }

  if (tradePrice != null) return String(tradePrice);

  if (lineTotal != null) {
    const exclusiveLine = lineTotal - combinedTax;
    if (exclusiveLine > 0) {
      return String(moneyRound(exclusiveLine / q));
    }
  }

  return '';
}

/** Full line tax from bill (sales tax + further tax when OCR only captured one column). */
export function resolveOcrLineTaxAmount(normalized, exclusiveLineNet) {
  const lineTotal = hasValue(normalized.line_total) ? n(normalized.line_total) : null;
  let tax = hasValue(normalized.tax_amount) ? n(normalized.tax_amount) : 0;
  if (hasValue(normalized.further_tax)) {
    tax += n(normalized.further_tax);
  }

  if (lineTotal != null && exclusiveLineNet != null && exclusiveLineNet > 0) {
    const impliedTax = moneyRound(lineTotal - exclusiveLineNet);
    if (impliedTax > 0.001 && (tax <= 0 || impliedTax > tax + 0.02)) {
      tax = impliedTax;
    }
  }

  if (tax <= 0 && hasValue(normalized.tax_percent) && exclusiveLineNet != null && exclusiveLineNet > 0) {
    tax = moneyRound((exclusiveLineNet * n(normalized.tax_percent)) / 100);
  }

  return tax > 0 ? String(moneyRound(tax)) : '';
}

/** Fix lines imported before inclusive trade-price detection (e.g. Enziclor 855 vs 724). */
export function repairOcrReceiveLine(line) {
  if (!line?._fromOcr && !String(line?.supplier_invoice_label || '').trim()) {
    return line;
  }

  const qty = Math.max(Number(line.quantity) || 0, 1);
  const rate = Number(line.unit_price) || 0;
  const tax = Number(line.tax_amount) || 0;
  const billTotal = Number(line.invoice_line_total) || 0;
  const gross = rate * qty;
  const computedInc = gross + tax;
  const tol = (base) => Math.max(0.05, base * 0.002);

  let needsRepair = false;
  if (billTotal > 0) {
    if (tax > 0 && Math.abs(gross - billTotal) <= tol(billTotal)) {
      needsRepair = true;
    }
    if (Math.abs(computedInc - billTotal) > tol(billTotal)) {
      needsRepair = true;
    }
  } else if (tax > 0 && rate > 0 && computedInc > gross + 0.001) {
    needsRepair = true;
  }

  if (!needsRepair) {
    if (line._fromOcr && line.tax_rate_id) {
      return { ...line, tax_rate_id: '' };
    }
    return line;
  }

  const ocrRow = {
    trade_price: String(rate),
    qty: String(qty),
    tax_amount: tax > 0 ? String(tax) : '',
    line_total: billTotal > 0 ? String(billTotal) : String(computedInc),
    gross_amount: '',
    discount_amount: line.discount_type === 'fixed' ? line.discount : '',
    discount_percent: line.discount_type === 'percent' ? line.discount : '',
  };

  const unitPrice = resolveOcrUnitPrice(ocrRow, qty);
  const exclusiveGross = n(unitPrice) * qty;
  const disc = lineDiscountAmount(ocrRow, gross);
  const exclusiveNet = Math.max(0, exclusiveGross - disc);
  const resolvedTax = resolveOcrLineTaxAmount(ocrRow, exclusiveNet);
  const resolvedBillTotal =
    billTotal > 0 ? String(billTotal) : ocrRow.line_total;

  return {
    ...line,
    unit_price: unitPrice || line.unit_price,
    tax_amount: resolvedTax || line.tax_amount,
    tax_rate_id: '',
    invoice_line_total: resolvedBillTotal,
  };
}

export function repairOcrReceiveLines(lines) {
  return (lines || []).map(repairOcrReceiveLine);
}

export function isOcrReceiveLine(line) {
  return Boolean(line?._fromOcr || String(line?.supplier_invoice_label || '').trim());
}

/**
 * Line money for receive grid — scanned bill totals always win over recalculated GST.
 */
export function computeReceiveLineAmounts(line, invGstFallback = 0) {
  const qty = Number(line.quantity) || 0;
  const rate = Number(line.unit_price) || 0;
  const rawGst = String(line.gst_percent ?? '').trim();
  const gst =
    rawGst === '' ? Number(invGstFallback) || 0 : Number(rawGst) || 0;
  const bonus = Number(line.bonus) || 0;
  const gross = qty * rate;
  const discRaw = Number(line.discount) || 0;
  const discPct = line.discount_type === 'percent' ? discRaw : 0;
  const discount =
    line.discount_type === 'percent' ? (gross * discRaw) / 100 : discRaw;
  const fromInvoice = isOcrReceiveLine(line);
  const hasInvoiceTax =
    line.tax_amount != null && String(line.tax_amount).trim() !== '';
  const billLineTotal = Number(line.invoice_line_total);
  const hasBillTotal =
    fromInvoice && Number.isFinite(billLineTotal) && billLineTotal > 0;

  let tax = 0;
  let totalExc = Math.max(0, gross - discount);
  let totalInc = totalExc;

  if (hasBillTotal) {
    totalInc = billLineTotal;
    if (hasInvoiceTax) {
      tax = Number(line.tax_amount) || 0;
    } else if (totalExc > 0 && totalExc < billLineTotal) {
      tax = moneyRound(billLineTotal - totalExc);
    }
    totalExc = Math.max(0, billLineTotal - tax);
  } else {
    if (fromInvoice && hasInvoiceTax) {
      tax = Number(line.tax_amount) || 0;
    } else if (hasInvoiceTax && !line.tax_rate_id) {
      tax = Number(line.tax_amount) || 0;
    } else {
      tax = (Math.max(0, gross - discount) * gst) / 100;
    }
    totalExc = Math.max(0, gross - discount);
    totalInc = totalExc + tax;
  }

  const sale = Number(line.sale_price) || 0;
  const mrp = Number(line.mrp) || 0;
  // Landed cost per unit (incl. line tax) — basis for retail net margin in pharmacy.
  const netRate = qty > 0 ? totalInc / qty : rate;
  const netMargin = sale > 0 && netRate > 0 ? ((sale - netRate) / sale) * 100 : 0;
  const advTax = Number(line.adv_income_tax) || 0;

  return {
    qty,
    bonus,
    rate,
    discPct,
    discount,
    gst,
    gross,
    taxable: totalExc,
    tax,
    net: totalInc,
    totalExc,
    totalInc,
    sale,
    mrp,
    netRate,
    netMargin,
    advTax,
    received: qty + bonus,
    billLocked: hasBillTotal,
  };
}

/** Client summary from edited OCR rows (not Gemini invoice total). */
export function summarizeExtractionRows(rows) {
  let items = 0;
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let netAmount = 0;

  for (const row of rows || []) {
    if (!String(row.product_description || '').trim() && !row.matched_product_id) continue;
    items += 1;
    const qty = n(row.qty);
    const price = n(row.trade_price);
    const gross = hasValue(row.gross_amount) ? n(row.gross_amount) : qty * price;
    let disc = 0;
    if (hasValue(row.discount_amount)) disc = n(row.discount_amount);
    else if (hasValue(row.discount_percent)) disc = (gross * n(row.discount_percent)) / 100;
    const taxable = Math.max(0, gross - disc);
    let tax = 0;
    if (hasValue(row.tax_amount)) tax = n(row.tax_amount);
    else if (hasValue(row.tax_percent)) tax = (taxable * n(row.tax_percent)) / 100;
    const lineNet = hasValue(row.line_total) ? n(row.line_total) : taxable + tax;

    subtotal += gross;
    discountTotal += disc;
    taxTotal += tax;
    netAmount += lineNet;
  }

  return { items, subtotal, discountTotal, taxTotal, netAmount };
}

import { applyPurchaseLineDefaults } from './pharmacy-purchase-defaults';
import { getCachedMedicineCatalog } from './medicine-catalog-cache';
import {
  getPharmacyCatalogRows,
  isPharmacyCatalogReady,
} from './pharmacy-catalog-store';

/**
 * Map review rows → ReceiveGrn line shape (location.state.extractionLines).
 */
export function extractionRowsToReceiveLines(rows, pharmacySettings = {}) {
  const catalog = catalogRowsForEnrich();
  const byId = new Map(catalog.map((r) => [String(r.id), r]));

  const lines = (rows || [])
    .filter((r) => String(r.product_description || '').trim() || r.matched_product_id)
    .map((r) => {
      const normalized = normalizeExtractionRow(r);
      const withDefaults = applyPurchaseLineDefaults(
        {
          batch_no: normalized.batch_no || '',
          expiry_date: normalized.expiry_date || '',
        },
        pharmacySettings,
      );
      const discAmount = hasValue(normalized.discount_amount) ? n(normalized.discount_amount) : null;
      const discPercent = hasValue(normalized.discount_percent) ? n(normalized.discount_percent) : null;
      // Prefer fixed amount when present (invoice-visible money).
      const discount =
        discAmount != null
          ? String(discAmount)
          : discPercent != null
            ? String(discPercent)
            : '0';
      const discount_type = discAmount != null ? 'fixed' : discPercent != null ? 'percent' : 'fixed';

      const paidQty = resolveExtractionQuantity(normalized);
      const qtyNum = Math.max(n(paidQty) || n(normalized.qty), 1);
      const unitPrice = resolveOcrUnitPrice(normalized, qtyNum);
      const exclusiveGross = n(unitPrice) * qtyNum;
      const lineDisc = lineDiscountAmount(normalized, exclusiveGross || n(normalized.trade_price) * qtyNum);
      const exclusiveNet = Math.max(0, exclusiveGross - lineDisc);
      const resolvedTax = resolveOcrLineTaxAmount(normalized, exclusiveNet);
      const product = normalized.matched_product_id
        ? byId.get(String(normalized.matched_product_id))
        : null;
      const saleFromCatalog = catalogRetailPrice(product);
      const mrpFromCatalog =
        product?.mrp != null && product.mrp !== '' ? String(product.mrp) : '';

      return {
        product_id: normalized.matched_product_id ? String(normalized.matched_product_id) : '',
        name: product?.name || normalized.matched_product_name || normalized.product_description || '',
        generic: product?.pharmacy?.generic_name || product?.generic || '',
        strength: product?.pharmacy?.strength_text || product?.strength || '',
        packing: normalized.units || '',
        image_url: normalized.matched_product_image || product?.image_url || null,
        quantity: paidQty !== '' ? paidQty : n(normalized.bonus) > 0 ? '0' : '1',
        bonus: hasValue(normalized.bonus) ? String(normalized.bonus) : '0',
        unit_price: unitPrice,
        last_cost: unitPrice || (product?.purchase_price != null ? String(product.purchase_price) : ''),
        discount,
        discount_type,
        discount_percent: discPercent != null ? String(discPercent) : '',
        discount_amount: discAmount != null ? String(discAmount) : '',
        gst_percent: hasValue(normalized.tax_percent) ? String(normalized.tax_percent) : '',
        tax_amount: resolvedTax,
        tax_rate_id: '',
        mrp: mrpFromCatalog,
        sale_price: saleFromCatalog,
        batch_number: withDefaults.batch_no || withDefaults.batch_number || '',
        expiry_date: withDefaults.expiry_date || '',
        manufactured_date: '',
        item_code: normalized.item_code || '',
        supplier_invoice_label: String(normalized.product_description || '').trim(),
        invoice_line_total: hasValue(normalized.line_total) ? String(normalized.line_total) : '',
        match_status: normalized.match_status || (normalized.matched_product_id ? 'matched' : 'unmatched'),
        match_confidence: normalized.match_confidence ?? 0,
        match_user_confirmed: normalized.match_user_confirmed === true,
        _needsMatch: !normalized.matched_product_id,
        _fromOcr: true,
      };
    });

  return enrichReceiveLinesFromCatalog(repairOcrReceiveLines(lines));
}

function catalogRowsForEnrich() {
  if (isPharmacyCatalogReady()) return getPharmacyCatalogRows() || [];
  return getCachedMedicineCatalog() || [];
}

function catalogRetailPrice(product) {
  if (!product) return '';
  const raw = product.unit_price ?? product.mrp ?? null;
  if (raw == null || raw === '') return '';
  return Number.isFinite(Number(raw)) ? String(raw) : '';
}

/** Retail / POS sale price from catalog product (for receive grid). */
export function resolveCatalogSalePrice(product) {
  return catalogRetailPrice(product);
}

/** Fill system sale price / MRP on receive lines that already have a product link. */
export function enrichReceiveLinesFromCatalog(lineList) {
  const catalog = catalogRowsForEnrich();
  if (!catalog.length || !lineList?.length) return lineList;
  const byId = new Map(catalog.map((r) => [String(r.id), r]));
  let changed = false;
  const next = lineList.map((line) => {
    if (!line?.product_id) return line;
    const product = byId.get(String(line.product_id));
    if (!product) return line;
    const fromScan = Boolean(line._fromOcr || String(line.supplier_invoice_label || '').trim());
    const patch = {};
    if (!String(line.sale_price || '').trim()) {
      const sale = catalogRetailPrice(product);
      if (sale) patch.sale_price = sale;
    }
    if (!fromScan) {
      if (!String(line.mrp || '').trim() && product.mrp != null && product.mrp !== '') {
        patch.mrp = String(product.mrp);
      }
      if (!String(line.generic || '').trim()) {
        const generic = product.pharmacy?.generic_name || product.generic || '';
        if (generic) patch.generic = generic;
      }
      if (!String(line.strength || '').trim()) {
        const strength = product.pharmacy?.strength_text || product.strength || '';
        if (strength) patch.strength = strength;
      }
    }
    if (Object.keys(patch).length === 0) return line;
    changed = true;
    return { ...line, ...patch };
  });
  return changed ? next : lineList;
}
