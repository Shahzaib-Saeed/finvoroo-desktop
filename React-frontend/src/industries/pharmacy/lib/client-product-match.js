/**
 * Client-side fallback matching for OCR review rows.
 *
 * The backend matches every line during the scan. This runs afterwards, for
 * rows the backend left unmatched because the catalog was still loading, and
 * it applies the same pharmacy engine so it can never make a link the backend
 * would have refused.
 */

import {
  CONFIDENCE,
  ocrKey,
  parseLabel,
  rankCandidates,
  retrievalTokens,
  scoreLabels,
} from './pharmacy-match-engine.js';

/**
 * Word => options containing it. Built once per call so a 40-line invoice
 * scores each line against a handful of candidates instead of the whole
 * catalog.
 */
function buildTokenIndex(productOptions) {
  const index = new Map();
  for (const opt of productOptions) {
    const text = `${opt.label || ''} ${opt.generic || ''}`;
    for (const token of retrievalTokens(text)) {
      const bucket = index.get(token);
      if (bucket) bucket.push(opt);
      else index.set(token, [opt]);
    }
  }
  return index;
}

function shortlist(index, parsed, limit = 40) {
  const brand = parsed.brandHead;
  const tokens = parsed.tokens.includes(brand) || !brand
    ? parsed.tokens
    : [brand, ...parsed.tokens];

  const weights = new Map();
  const byOption = new Map();
  const collect = (token, weight) => {
    for (const opt of index.get(token) || []) {
      byOption.set(opt.value, opt);
      // A shared brand word counts for far more than a shared descriptive one.
      const bonus = token === brand ? 2 : 1;
      weights.set(opt.value, (weights.get(opt.value) || 0) + weight * bonus);
    }
  };

  for (const token of tokens) collect(token, 1);

  if (!weights.size && brand.length >= 4) {
    // Nothing matched literally — allow for the brand being misread, but only
    // against catalog tokens of similar length. "azotek" starting with "azo"
    // must not pull in every product whose name happens to contain "azo".
    const brandKey = ocrKey(brand);
    for (const indexed of index.keys()) {
      if (indexed.length < 4) continue;
      const lengthGap = Math.abs(indexed.length - brand.length);
      if (lengthGap > 2) continue;
      if (ocrKey(indexed) === brandKey || indexed.startsWith(brand) || brand.startsWith(indexed)) {
        collect(indexed, 0.6);
      }
    }
  }

  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => byOption.get(value));
}

const parsedCache = new WeakMap();

function parseOption(opt) {
  const cached = parsedCache.get(opt);
  if (cached) return cached;
  const parsed = parseLabel(opt.label || '', {
    generic: opt.generic || '',
    strength: opt.strength || '',
  });
  parsedCache.set(opt, parsed);
  return parsed;
}

/**
 * Attaches a product to rows the backend could not match, but only where the
 * evidence is strong enough. Medium-confidence hits are attached as
 * suggestions so the review grid asks for confirmation; weak ones are left
 * untouched for the pharmacist to pick.
 */
export function applyClientProductMatches(rows, productOptions) {
  if (!Array.isArray(rows) || !Array.isArray(productOptions) || !productOptions.length) {
    return rows;
  }

  const index = buildTokenIndex(productOptions);

  return rows.map((row) => {
    const invoiceName = String(row.product_description || '').trim();
    const catalogName = String(row.matched_product_name || '').trim();

    // A green link that names a different medicine is worse than no link.
    // Drop it even if the backend or a previous confirmation attached it.
    if (row.matched_product_id && invoiceName && catalogName && row.match_user_confirmed !== true) {
      const existing = scoreLabels(parseLabel(invoiceName), parseLabel(catalogName));
      if (existing.rejected) {
        row = {
          ...row,
          matched_product_id: null,
          matched_product_name: '',
          match_confidence: 0,
          match_status: 'unmatched',
          match_source: '',
          match_diagnostics: {
            decided_by: 'rejected_existing_link',
            rejection_reason: existing.rejectionReason,
          },
        };
      } else {
        return row;
      }
    } else if (row.matched_product_id && row.match_status === 'matched') {
      return row;
    }

    if (row.match_user_confirmed === true) return row;
    if (String(row.match_source || '').startsWith('learned') && row.matched_product_id) return row;

    const learnedName = String(row.global_corrected_name || '').trim();
    const fromGlobal = String(row.match_source || '') === 'global_knowledge';
    if (fromGlobal && row.matched_product_id) return row;

    const searchName = fromGlobal && learnedName ? learnedName : row.product_description || '';
    if (!String(searchName).trim()) return row;

    const parsed = parseLabel(searchName);
    const candidates = shortlist(index, parsed).map((opt) => ({
      item: opt,
      parsed: parseOption(opt),
    }));
    if (!candidates.length) return row;

    const verdict = rankCandidates(parsed, candidates);
    if (!verdict.best) return row;

    // A corrected name from cross-tenant knowledge is itself a guess, so it
    // only earns a link when the pharmacy signals fully agree.
    if (fromGlobal && verdict.confidence !== CONFIDENCE.HIGH) return row;

    const matched = verdict.confidence === CONFIDENCE.HIGH;

    return {
      ...row,
      matched_product_id: Number(verdict.best.value),
      matched_product_name: verdict.best.label,
      matched_product_image: verdict.best.image_url || row.matched_product_image || '',
      match_confidence: matched
        ? Math.max(0.92, Math.min(0.99, verdict.score))
        : Math.min(0.89, verdict.score),
      match_status: matched ? 'matched' : 'suggested',
      match_source: fromGlobal ? 'global_knowledge' : row.match_source,
      match_diagnostics: verdict.diagnostics,
      match_suggestions: verdict.alternatives
        .filter((alt) => alt.item.value !== verdict.best.value)
        .map((alt) => ({
          product_id: Number(alt.item.value),
          product_name: alt.item.label,
          confidence: alt.score,
          source: 'client_catalog',
        })),
      global_corrected_name: learnedName || row.global_corrected_name || '',
    };
  });
}
