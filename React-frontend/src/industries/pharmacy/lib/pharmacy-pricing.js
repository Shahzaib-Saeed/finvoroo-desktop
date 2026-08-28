/**
 * Pharmacy pack vs unit pricing.
 *
 * Catalog/import stores last pack sale (`unit_price`) and last pack purchase
 * (`purchase_price`) — e.g. 740 sale / 630 cost for Panadol 200's. POS sells in
 * **base units** (tablets/pcs). Qty 1 = one tablet; qty 200 = one full pack.
 * FIFO/average cost stays on inventory reports, not in this POS lookup.
 */

function parsePackSizeFromName(name) {
  const s = String(name || '').trim();
  if (!s) return null;
  // Panadol 200's Tab, Augmentin 14's, etc.
  const apostropheMatch = s.match(/(\d+(?:\.\d+)?)\s*[''′]?\s*s\b/i);
  if (apostropheMatch) {
    const n = Number(apostropheMatch[1]);
    if (Number.isFinite(n) && n > 1) return n;
  }
  // Blister notation: 10x10, 1x14
  const blisterMatch = s.match(/\b(\d+)\s*[x×]\s*(\d+)\b/i);
  if (blisterMatch) {
    const n = Number(blisterMatch[1]) * Number(blisterMatch[2]);
    if (Number.isFinite(n) && n > 1) return n;
  }
  return null;
}

export function parsePackSize(row) {
  const pharmacy = row?.pharmacy || {};
  const raw =
    pharmacy.pack_size ||
    pharmacy.units_per_pack ||
    row?.pack_size ||
    row?.units_per_pack ||
    row?.pack_count ||
    row?.unit ||
    '';
  const match = String(raw).match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const fromName = parsePackSizeFromName(row?.name || row?.label);
  if (fromName != null) return fromName;
  return 1;
}

/** Units on hand expressed as packs (e.g. 4198 tabs ÷ 200 = 21 packs). */
export function formatPackStock(stockUnits, packCount) {
  const stock = Number(stockUnits) || 0;
  const pack = Number(packCount) || 1;
  if (pack <= 1) return String(stock);
  const packs = stock / pack;
  if (!Number.isFinite(packs)) return '—';
  if (Math.abs(packs - Math.round(packs)) < 0.05) {
    return String(Math.round(packs));
  }
  return packs.toFixed(1);
}

function perUnitPrice(packPrice, packSize) {
  const pack = Number(packPrice);
  if (!Number.isFinite(pack)) return null;
  if (packSize > 1) return pack / packSize;
  return pack;
}

/** Round POS unit rates to 2 decimal places (e.g. pack ÷ 14 tabs). */
export function roundUnitPrice(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * factor) / factor;
}

export function formatUnitPriceInput(value) {
  const n = roundUnitPrice(value);
  return n.toFixed(2);
}

/**
 * @param {object} row Product or catalog row with pharmacy pack metadata.
 */
export function getMedicinePricing(row) {
  const packPrice =
    row?.unit_price ?? row?.mrp ?? row?.sale_price ?? row?.purchase_price ?? null;
  const packPurchase = row?.purchase_price ?? row?.last_cost ?? row?.cost_price ?? null;
  const packMrp = row?.mrp ?? row?.unit_price ?? row?.sale_price ?? null;
  const packSize = parsePackSize(row);

  const unitPrice = perUnitPrice(packPrice, packSize);
  const unitPurchase = perUnitPrice(packPurchase, packSize);
  const unitMrp = perUnitPrice(packMrp, packSize);

  return {
    packPrice,
    packPurchase,
    packMrp,
    packCount: packSize,
    packSize: row?.pharmacy?.pack_size || row?.pack_size || row?.unit || '—',
    unitPrice: unitPrice ?? 0,
    unitPurchase,
    unitMrp,
  };
}

/** Apply per-unit rates on a product clone for cart/checkout. */
export function productWithUnitPricing(product) {
  const pricing = getMedicinePricing(product);
  return {
    ...product,
    unit_price: roundUnitPrice(pricing.unitPrice),
    purchase_price:
      pricing.unitPurchase != null ? roundUnitPrice(pricing.unitPurchase) : product?.purchase_price ?? null,
    mrp: pricing.unitMrp != null ? roundUnitPrice(pricing.unitMrp) : product?.mrp ?? null,
    _pack_pricing: pricing,
  };
}
