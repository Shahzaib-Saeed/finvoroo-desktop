/**
 * Shared invoice line ↔ catalog match quality for OCR review UI.
 * Mirrors backend InvoiceProductMatcher penalties (strength, pack, brand).
 */

function normalize(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function canonical(name) {
  let s = normalize(name);
  s = s.replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|iu|%)\b/g, ' ');
  s = s.replace(/\b\d+\s*\/\s*\d+\s*(?:mg|mcg|g|ml)?\b/g, ' ');
  s = s.replace(/\b\d+\s*[xX×]\s*\d+\b/g, ' ');
  s = s.replace(/\b\d+\s*'?s\b/g, ' ');
  s = s.replace(/\s+[lLeE]\d+\b/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

const STOP = new Set([
  'tab', 'tabs', 'tablet', 'tablets', 'cap', 'caps', 'capsule', 'capsules',
  'syrup', 'inj', 'injection', 'susp', 'cream', 'gel', 'drop', 'drops',
  'oint', 'sachet', 'strip', 'pack', 'box', 'bottle', 'amp', 'vial',
  'mr', 'sr', 'cr', 'xr', 'er', 'plus', 'forte', 'co', 'n',
]);

function tokens(name) {
  return canonical(name)
    .split(/[\s/|,.\-–—()+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t));
}

export function extractStrengths(name) {
  const s = normalize(name);
  const values = [];
  const re = /\b(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+(?:[.,]\d+)?))?\s*(?:mg|mcg|g|ml|iu|%)\b/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    values.push(parseFloat(String(m[1]).replace(',', '.')));
    if (m[2]) values.push(parseFloat(String(m[2]).replace(',', '.')));
  }
  return [...new Set(values.filter((n) => Number.isFinite(n)))];
}

export function extractPackCount(name) {
  const m = normalize(name).match(/\b(\d+)\s*'?s\b/);
  return m ? Number(m[1]) : null;
}

function strengthsCompatible(invoiceName, catalogName) {
  const inv = extractStrengths(invoiceName);
  const cat = extractStrengths(catalogName);
  if (!inv.length || !cat.length) return true;
  return inv.some((v) => cat.some((c) => Math.abs(v - c) < 0.011));
}

function packCompatible(invoiceName, catalogName) {
  const inv = extractPackCount(invoiceName);
  const cat = extractPackCount(catalogName);
  if (inv == null || cat == null) return true;
  return inv === cat;
}

function catalogExtendsInvoice(invoiceName, catalogName) {
  const inv = canonical(invoiceName);
  const cat = normalize(catalogName);
  if (!inv || !cat) return false;
  if (cat === inv) return true;
  return (
    cat.startsWith(`${inv} `) ||
    new RegExp(`^${inv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+[lLeE]\\d+$`).test(cat)
  );
}

export function scoreInvoiceCatalogMatch(invoiceName, catalogName) {
  const a = normalize(invoiceName);
  const b = normalize(catalogName);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (canonical(a) === canonical(b)) return 0.94;
  if (catalogExtendsInvoice(a, b)) return 0.96;

  const ta = tokens(invoiceName);
  const tb = tokens(catalogName);
  if (!ta.length || !tb.length) return 0;

  let s = 0;
  const lead = ta[0];
  if (lead && lead.length >= 3 && lead === tb[0]) s = Math.max(s, 0.84);
  const overlap = ta.filter((t) => tb.includes(t)).length;
  if (overlap >= 2) s = Math.max(s, 0.9);
  if (overlap >= 3) s = Math.max(s, 0.94);
  if (b.includes(lead) || a.includes(tb[0] || '')) s = Math.max(s, 0.78);

  if (!strengthsCompatible(invoiceName, catalogName)) s = Math.min(s, 0.62);
  if (!packCompatible(invoiceName, catalogName)) s = Math.min(s, 0.72);

  return s;
}

/** Whether OCR review should flag this link for manual verification. */
export function rowNeedsVerify(row) {
  if (!row?.matched_product_id) return false;

  // Cashier confirmed the link in the match sheet — treat as verified (green).
  if (row.match_user_confirmed === true) return false;
  if (Number(row.match_confidence) >= 0.999 && row.match_status === 'matched') return false;

  const bill = String(row.product_description || '').trim();
  const catalog = String(row.matched_product_name || '').trim();
  if (!bill || !catalog) {
    return row.match_status === 'suggested';
  }

  const quality = scoreInvoiceCatalogMatch(bill, catalog);
  const conf = Number(row.match_confidence) || quality;

  if (row.match_status === 'suggested') return true;
  if (conf > 0 && conf < 0.92) return true;
  if (quality < 0.88) return true;
  if (!strengthsCompatible(bill, catalog)) return true;

  return false;
}

export function countVerifyRows(rows) {
  return (rows || []).filter((r) => rowNeedsVerify(r)).length;
}

/** Verify flag for Receive GRN lines (OCR handoff shape). */
export function receiveLineNeedsVerify(line) {
  if (!line?.product_id) return false;
  return rowNeedsVerify({
    matched_product_id: line.product_id,
    product_description: line.supplier_invoice_label || '',
    matched_product_name: line.name || '',
    match_status: line.match_status,
    match_confidence: line.match_confidence,
    match_user_confirmed: line.match_user_confirmed,
  });
}

export function countVerifyReceiveLines(lines) {
  return (lines || []).filter((l) => receiveLineNeedsVerify(l)).length;
}
