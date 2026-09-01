/**
 * Adapter between OCR review rows and the ReceiveGrn emptyLine shape.
 * Does not post bills — handoff only.
 *
 * The row shape here mirrors the canonical invoice row the API returns, which
 * is deliberately independent of whichever OCR engine read the page.
 */

export function emptyExtractionRow() {
  return {
    item_code: '',
    product_description: '',
    units: '',
    batch_no: '',
    mfg_date: '',
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
    match_source: '',
    match_user_confirmed: false,
    match_suggestions: [],
    // Per-signal breakdown of why the product was (or was not) linked.
    match_diagnostics: null,
    global_corrected_name: '',
  };
}

export function apiItemsToExtractionRows(items) {
  const rows = (items || []).map((item) =>
    normalizeExtractionRow({
      ...emptyExtractionRow(),
      item_code: item.item_code ?? '',
      product_description: item.product_description ?? '',
      units: item.units ?? '',
      batch_no: item.batch_no ?? '',
      mfg_date: item.mfg_date ?? '',
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
      match_source: item.match_source || '',
      match_user_confirmed: item.match_user_confirmed === true,
      match_suggestions: Array.isArray(item.match_suggestions) ? item.match_suggestions : [],
      match_diagnostics: item.match_diagnostics ?? null,
      global_corrected_name: item.global_corrected_name || '',
    }),
  );

  return mergeBonusContinuationRows(rows);
}

/**
 * Same-product zero-price follow-on rows are bonus, not a second QTY line.
 * e.g. Hamza: Qty 10 / Bonus -, then Qty - / Bonus 3.
 */
export function mergeBonusContinuationRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return rows || [];
  const out = [];
  for (const row of rows) {
    if (out.length === 0) {
      out.push(row);
      continue;
    }
    const prev = out[out.length - 1];
    if (!isBonusContinuation(prev, row)) {
      out.push(row);
      continue;
    }
    const add = bonusContribution(prev, row);
    if (batchesCompatible(prev, row)) {
      out[out.length - 1] = {
        ...prev,
        bonus: String((n(prev.bonus) || 0) + add),
      };
      continue;
    }
    out.push({
      ...row,
      qty: '0',
      bonus: String(add > 0 ? add : n(row.bonus) || n(row.qty) || 0),
    });
  }
  return out;
}

function sameExtractionProduct(a, b) {
  const idA = a?.matched_product_id != null ? String(a.matched_product_id) : '';
  const idB = b?.matched_product_id != null ? String(b.matched_product_id) : '';
  if (idA && idA === idB) return true;
  const codeA = String(a?.item_code || '').trim().toLowerCase();
  const codeB = String(b?.item_code || '').trim().toLowerCase();
  if (codeA && codeA === codeB) return true;
  const nameA = String(a?.product_description || '').trim().toLowerCase();
  const nameB = String(b?.product_description || '').trim().toLowerCase();
  return Boolean(nameA) && nameA === nameB;
}

function lineMoney(row) {
  return Math.max(n(row?.trade_price) || 0, n(row?.gross_amount) || 0, n(row?.line_total) || 0);
}

function isPaidExtractionLine(row) {
  return (n(row?.qty) || 0) > 0 && lineMoney(row) > 0;
}

function isUnpaidExtractionLine(row) {
  return lineMoney(row) <= 0;
}

function bonusUnits(row) {
  const bonus = n(row?.bonus);
  if (bonus > 0) return bonus;
  const qty = n(row?.qty);
  return qty > 0 ? qty : 0;
}

function isBonusContinuation(prev, curr) {
  return (
    sameExtractionProduct(prev, curr) &&
    isPaidExtractionLine(prev) &&
    isUnpaidExtractionLine(curr) &&
    bonusUnits(curr) > 0
  );
}

function bonusContribution(prev, curr) {
  const explicit = n(curr?.bonus);
  if (explicit > 0) return explicit;
  const qty = n(curr?.qty) || 0;
  const prevBonus = n(prev?.bonus) || 0;
  if (qty <= 0) return 0;
  if (prevBonus > 0 && Math.abs(qty - prevBonus) < 0.0001) return 0;
  return qty;
}

function batchesCompatible(a, b) {
  const batchA = String(a?.batch_no || '').trim().toLowerCase();
  const batchB = String(b?.batch_no || '').trim().toLowerCase();
  return !batchA || !batchB || batchA === batchB;
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
    row?.mfg_date ? `Mfg: ${row.mfg_date}` : null,
    row?.expiry_date ? `Expiry: ${row.expiry_date}` : null,
  ].filter(Boolean);

  return {
    name: String(row?.global_corrected_name || row?.matched_product_name || row?.product_description || '').trim(),
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

function amountsNear(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= Math.max(0.05, Math.max(Math.abs(a), Math.abs(b)) * 0.002);
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
 *
 * Printed Rate / T.P is kept unless it is clearly tax-inclusive
 * (rate × qty equals the line total and a tax amount is present).
 * Never bake the discount into TP — discount stays in DISC AMT.
 */
export function resolveOcrUnitPrice(normalized, qty = 1) {
  const q = Math.max(n(qty), 1);
  const tradePrice = hasValue(normalized.trade_price) ? n(normalized.trade_price) : null;
  const grossAmount = hasValue(normalized.gross_amount) ? n(normalized.gross_amount) : null;
  const lineTotal = hasValue(normalized.line_total) ? n(normalized.line_total) : null;
  const taxAmount = hasValue(normalized.tax_amount) ? n(normalized.tax_amount) : 0;
  const furtherTax = hasValue(normalized.further_tax) ? n(normalized.further_tax) : 0;
  const combinedTax = taxAmount + furtherTax;

  if (tradePrice != null) {
    const tradeGross = tradePrice * q;
    const rateLooksTaxInclusive =
      combinedTax > 0 && lineTotal != null && amountsNear(tradeGross, lineTotal);

    if (rateLooksTaxInclusive) {
      if (grossAmount != null && grossAmount > 0) {
        return String(moneyRound(grossAmount / q));
      }
      const exclusiveLine = lineTotal - combinedTax;
      if (exclusiveLine > 0) {
        return String(moneyRound(exclusiveLine / q));
      }
    }

    return String(tradePrice);
  }

  if (grossAmount != null && grossAmount > 0) {
    return String(moneyRound(grossAmount / q));
  }

  if (lineTotal != null) {
    const exclusiveLine = lineTotal - combinedTax;
    if (exclusiveLine > 0) {
      return String(moneyRound(exclusiveLine / q));
    }
  }

  return '';
}

/** Full line tax from bill (sales tax + further tax when OCR only captured one column). */
export function resolveOcrLineTaxAmount(normalized, exclusiveLineNet, extras = {}) {
  const lineTotal = hasValue(normalized.line_total) ? n(normalized.line_total) : null;
  let tax = hasValue(normalized.tax_amount) ? n(normalized.tax_amount) : 0;
  if (hasValue(normalized.further_tax)) {
    tax += n(normalized.further_tax);
  }

  const exclusiveGross =
    extras.exclusiveGross != null && extras.exclusiveGross > 0
      ? extras.exclusiveGross
      : exclusiveLineNet != null
        ? exclusiveLineNet + lineDiscountAmount(normalized, exclusiveLineNet)
        : null;
  const discount =
    extras.discount != null
      ? extras.discount
      : exclusiveGross != null
        ? lineDiscountAmount(normalized, exclusiveGross)
        : lineDiscountAmount(normalized, 0);

  const taxLooksLikeDiscount = discount > 0.001 && amountsNear(tax, discount);
  const impliedTax =
    lineTotal != null && exclusiveLineNet != null && exclusiveLineNet > 0
      ? moneyRound(lineTotal - exclusiveLineNet)
      : null;
  const impliedIsDiscount = impliedTax != null && discount > 0.001 && amountsNear(impliedTax, discount);
  const totalIsGross =
    lineTotal != null && exclusiveGross != null && exclusiveGross > 0 && amountsNear(lineTotal, exclusiveGross);

  // Hamza-style: Tax Amount is "-" on most lines. OCR copies Disc Amount into
  // tax, or "line total − (gross − discount)" equals the discount because Net
  // was read as Gross. That is not GST.
  if (totalIsGross || impliedIsDiscount || (taxLooksLikeDiscount && (impliedTax == null || impliedTax <= 0.001))) {
    if (taxLooksLikeDiscount || tax <= 0 || impliedIsDiscount) {
      tax = 0;
    }
  } else if (impliedTax != null && impliedTax > 0.001 && tax > 0 && impliedTax > tax + 0.02) {
    // Only complete a tax that was already printed (further tax). Never invent GST from a gap.
    tax = impliedTax;
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
  const resolvedTax = resolveOcrLineTaxAmount(ocrRow, exclusiveNet, {
    exclusiveGross,
    discount: disc,
  });
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

/** Empty, "0", and "0.00" in the Tax column all mean no line tax. */
export function parseLineTaxAmount(line) {
  const raw = String(line?.tax_amount ?? '').trim();
  if (raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function formatTaxInputValue(value) {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return '';
  return raw;
}

export function normalizeTaxFieldPatch(value) {
  const raw = String(value ?? '').trim();
  if (raw === '') {
    return { tax_amount: '', gst_percent: '', tax_rate_id: '' };
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return { tax_amount: '', gst_percent: '', tax_rate_id: '' };
  }
  return { tax_amount: raw };
}

/**
 * Line money for the receive grid.
 *
 * Amount = Packs × Purchase price − Disc Amt + Tax.
 * Tax comes **only** from the Tax column when it is a positive number.
 * Empty / cleared / "0" tax → treated as 0 (never silent GST % from OCR or product).
 */
export function computeReceiveLineAmounts(line, _invGstFallback = 0) {
  const qty = Number(line.quantity) || 0;
  const rate = Number(line.unit_price) || 0;
  const bonus = Number(line.bonus) || 0;
  const gross = qty * rate;
  const discRaw = Number(line.discount) || 0;
  const discPct = line.discount_type === 'percent' ? discRaw : 0;
  const discount =
    line.discount_type === 'percent' ? (gross * discRaw) / 100 : discRaw;
  const printedTax = parseLineTaxAmount(line);
  const taxLooksLikeDiscount =
    discount > 0.001 && printedTax > 0 && amountsNear(printedTax, discount);

  const tax = taxLooksLikeDiscount ? 0 : printedTax;

  const totalExc = Math.max(0, gross - discount);
  const totalInc = totalExc + tax;

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
    gst: 0,
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
    billLocked: false,
  };
}

/**
 * Payable is always the sum of the Amount column the user can see, plus header
 * extras they typed. Never use an AI-printed grand total — that is the check
 * against the bill, not the figure we post.
 *
 * @param {boolean} scanLocked  scanned lines already include tax in Amount;
 *   header GST % is then an extra, not applied again on each row
 */
export function summarizeReceiveLineTotals(
  lines,
  {
    invGstPercent = 0,
    docDiscPercent = 0,
    docDiscount = 0,
    otherCharges = 0,
    purchaseExpense = 0,
    advIncomeTax = 0,
    scanLocked = false,
  } = {},
) {
  const gstFallback = scanLocked ? 0 : Number(invGstPercent) || 0;
  let subtotal = 0;
  let lineDiscount = 0;
  let tax = 0;
  let lineAmountTotal = 0;
  let saleTotal = 0;
  let count = 0;
  let strips = 0;
  let unmatched = 0;

  for (const line of lines || []) {
    if (!line.product_id && !line._needsMatch && !line.name) continue;
    if (!line.product_id && !line._needsMatch) continue;
    const a = computeReceiveLineAmounts(line, gstFallback);
    if (!line.product_id) unmatched += 1;
    count += 1;
    strips += a.received;
    subtotal += a.gross;
    lineDiscount += a.discount;
    tax += a.tax;
    lineAmountTotal += a.totalInc;
    saleTotal += a.sale * a.qty;
  }

  const afterLine = Math.max(0, subtotal - lineDiscount);
  const pctDisc = (afterLine * (Number(docDiscPercent) || 0)) / 100;
  const flatDisc = Number(docDiscount) || 0;
  const misc = Number(otherCharges) || 0;
  const purExp = Number(purchaseExpense) || 0;
  const advTax = Number(advIncomeTax) || 0;
  const taxableBase = Math.max(0, afterLine - pctDisc - flatDisc);
  const docIncGst = scanLocked ? (taxableBase * (Number(invGstPercent) || 0)) / 100 : 0;
  const payable = moneyRound(
    Math.max(0, lineAmountTotal - pctDisc - flatDisc + docIncGst + misc + purExp + advTax),
  );
  const avgPrice = count > 0 ? payable / Math.max(1, strips) : 0;

  return {
    count,
    strips,
    unmatched,
    subtotal,
    lineAmountTotal: moneyRound(lineAmountTotal),
    lineDiscount,
    pctDisc,
    headerDiscount: flatDisc,
    tax: moneyRound(tax),
    misc,
    purchaseExpense: purExp,
    advTax,
    docIncGst,
    saleTotal,
    avgPrice,
    payable,
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

      const paidQty = resolveExtractionQuantity(normalized);
      const qtyNum = Math.max(n(paidQty) || n(normalized.qty), 1);
      const unitPrice = resolveOcrUnitPrice(normalized, qtyNum);
      const exclusiveGross = n(unitPrice) * qtyNum;
      // DISC % from the bill; DISC AMT is always TP × Qty × % on the grid.
      let discount = '0';
      let discount_type = 'percent';
      if (discPercent != null) {
        discount = String(discPercent);
      } else if (discAmount != null && exclusiveGross > 0) {
        discount = String(moneyRound((discAmount / exclusiveGross) * 100));
      }
      const lineDisc = lineDiscountAmount(normalized, exclusiveGross || n(normalized.trade_price) * qtyNum);
      const exclusiveNet = Math.max(0, exclusiveGross - lineDisc);
      const resolvedTax = resolveOcrLineTaxAmount(normalized, exclusiveNet, {
        exclusiveGross,
        discount: lineDisc,
      });
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
        last_cost: catalogPurchasePrice(product),
        discount,
        discount_type,
        discount_percent: discount_type === 'percent' && discount !== '0' ? String(discount) : (discPercent != null ? String(discPercent) : ''),
        discount_amount: discAmount != null ? String(discAmount) : '',
        gst_percent: hasValue(normalized.tax_percent) ? String(normalized.tax_percent) : '',
        tax_amount: resolvedTax,
        tax_rate_id: '',
        mrp: mrpFromCatalog,
        sale_price: saleFromCatalog,
        batch_number: withDefaults.batch_no || withDefaults.batch_number || '',
        expiry_date: withDefaults.expiry_date || '',
        // Printed on some supplier invoices as an MFG column; blank when the
        // invoice does not carry one.
        manufactured_date: normalized.mfg_date || '',
        item_code: normalized.item_code || '',
        supplier_invoice_label: String(normalized.product_description || '').trim(),
        invoice_line_total: hasValue(normalized.line_total) ? String(normalized.line_total) : '',
        match_status: normalized.match_status || (normalized.matched_product_id ? 'matched' : 'unmatched'),
        match_confidence: normalized.match_confidence ?? 0,
        match_source: normalized.match_source || '',
        match_user_confirmed: normalized.match_user_confirmed === true,
        match_suggestions: Array.isArray(normalized.match_suggestions)
          ? normalized.match_suggestions
          : [],
        match_diagnostics: normalized.match_diagnostics ?? null,
        global_corrected_name: String(normalized.global_corrected_name || '').trim(),
        _needsMatch: !normalized.matched_product_id,
        _fromOcr: true,
        _ocrHighlight: Boolean(normalized._ocrHighlight),
        _ocrHighlightFields: Array.isArray(normalized._ocrHighlightFields)
          ? normalized._ocrHighlightFields
          : [],
        _ocrExtractionId: normalized._ocrExtractionId ?? null,
        _ocrLineIndex: normalized._ocrLineIndex ?? null,
      };
    });

  return enrichReceiveLinesFromCatalog(repairOcrReceiveLines(lines));
}

function catalogRowsForEnrich() {
  if (isPharmacyCatalogReady()) return getPharmacyCatalogRows() || [];
  return getCachedMedicineCatalog() || [];
}

function catalogPurchasePrice(product) {
  if (!product) return '';
  const raw = product.purchase_price ?? product.cost_price ?? product.last_cost ?? null;
  if (raw == null || raw === '') return '';
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? String(raw) : '';
}

function catalogRetailPrice(product) {
  if (!product) return '';
  const raw = product.unit_price ?? product.mrp ?? null;
  if (raw == null || raw === '') return '';
  return Number.isFinite(Number(raw)) ? String(raw) : '';
}

/** Previous pack cost from catalog (for receive TP change warning). */
export function resolveCatalogPurchasePrice(product) {
  return catalogPurchasePrice(product);
}

/**
 * True when this bill's TP differs from the product's last recorded cost.
 * No previous cost (new item) is not a warning.
 */
export function receiveCostChangedFromLast(line) {
  const prev = Number(line?.last_cost);
  const now = Number(line?.unit_price);
  if (!Number.isFinite(prev) || prev <= 0) return false;
  if (!Number.isFinite(now) || now <= 0) return false;
  return Math.abs(now - prev) > Math.max(0.05, Math.max(Math.abs(now), Math.abs(prev)) * 0.002);
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
    const prevCost = catalogPurchasePrice(product);
    if (prevCost && String(line.last_cost || '').trim() !== prevCost) {
      patch.last_cost = prevCost;
    }
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
