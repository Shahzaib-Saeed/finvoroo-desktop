/**
 * Client-side fallback matching for OCR review rows against loaded product options.
 * Mirrors backend brand/token/strength matching so unmatched history rows can auto-fill.
 */

import { scoreInvoiceCatalogMatch } from './invoice-match-quality';

function tokensFromName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|iu|%)\b/g, ' ')
    .split(/[\s/|,.\-–—()+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !/^\d+$/.test(t));
}

/**
 * Auto-fill unmatched rows when a clear product option exists.
 */
export function applyClientProductMatches(rows, productOptions) {
  if (!Array.isArray(rows) || !Array.isArray(productOptions) || !productOptions.length) {
    return rows;
  }

  return rows.map((row) => {
    if (row.matched_product_id && row.match_status === 'matched') return row;
    const invoiceName = row.product_description || '';
    if (!String(invoiceName).trim()) return row;

    let best = null;
    let bestScore = 0;
    const brandHits = [];
    const invBrand = tokensFromName(invoiceName)[0];

    for (const opt of productOptions) {
      const sc = scoreInvoiceCatalogMatch(invoiceName, opt.label || '');
      if (sc > bestScore) {
        bestScore = sc;
        best = opt;
      }
      const optBrand = tokensFromName(opt.label || '')[0];
      if (invBrand && invBrand.length >= 3 && invBrand === optBrand) {
        brandHits.push({ opt, sc });
      }
    }

    if (brandHits.length === 1 && brandHits[0].sc >= 0.84) {
      best = brandHits[0].opt;
      bestScore = Math.max(brandHits[0].sc, bestScore);
    }

    if (!best || bestScore < 0.78) return row;

    return {
      ...row,
      matched_product_id: Number(best.value),
      matched_product_name: best.label,
      matched_product_image: best.image_url || row.matched_product_image || '',
      match_confidence: bestScore,
      match_status: bestScore >= 0.92 ? 'matched' : 'suggested',
    };
  });
}
