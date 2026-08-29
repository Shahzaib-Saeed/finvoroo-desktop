/**
 * Pharmacy-aware matching of supplier invoice text to catalog products.
 *
 * Port of the authoritative engine in
 * `app/Services/Pharmacy/PharmacyLabelParser.php` + `PharmacyMatchScorer.php`.
 * The backend decides every match that reaches the UI; this exists for the
 * client-side fallback that runs when the catalog finishes loading after a
 * scan, and it must reach the same verdicts.
 *
 * The rule that matters: a capsule is never a syrup and 500mg is never 250mg,
 * regardless of how alike two strings look. Conflicts are decided before any
 * similarity is computed, and similarity is only ever a tie-breaker.
 */

/** Written form => canonical dosage form. */
const FORM_WORDS = {
  tab: 'tablet', tabs: 'tablet', tablet: 'tablet', tablets: 'tablet',
  tabt: 'tablet', tablte: 'tablet', tb: 'tablet',
  cap: 'capsule', caps: 'capsule', capsule: 'capsule', capsules: 'capsule',
  capl: 'capsule', cpsl: 'capsule',
  syp: 'syrup', syr: 'syrup', syrp: 'syrup', syrup: 'syrup', sirup: 'syrup',
  susp: 'suspension', suspension: 'suspension', sus: 'suspension',
  drop: 'drops', drops: 'drops', drp: 'drops', gtt: 'drops',
  inj: 'injection', injection: 'injection', amp: 'injection',
  ampoule: 'injection', vial: 'injection',
  infusion: 'infusion', iv: 'infusion',
  cream: 'cream', crm: 'cream',
  oint: 'ointment', ointment: 'ointment', ung: 'ointment',
  gel: 'gel', lotion: 'lotion', lot: 'lotion',
  sachet: 'sachet', sachets: 'sachet', sach: 'sachet',
  powder: 'powder', pdr: 'powder',
  spray: 'spray', nasal: 'spray',
  inhaler: 'inhaler', mdi: 'inhaler', rotacap: 'inhaler',
  rotacaps: 'inhaler', puff: 'inhaler', nebule: 'inhaler',
  supp: 'suppository', suppository: 'suppository', pessary: 'suppository',
  soln: 'solution', solution: 'solution',
  shampoo: 'shampoo',
};

/**
 * Forms in different groups are physically different products. Forms with no
 * group ("solution") appear across oral, topical and injectable products, so
 * they never reject anything.
 */
const FORM_GROUPS = {
  tablet: 'oral_solid',
  capsule: 'oral_solid',
  syrup: 'oral_liquid',
  suspension: 'oral_liquid',
  drops: 'drops',
  injection: 'injectable',
  infusion: 'injectable',
  cream: 'topical',
  ointment: 'topical',
  gel: 'topical',
  lotion: 'topical',
  shampoo: 'topical',
  sachet: 'oral_powder',
  powder: 'oral_powder',
  spray: 'respiratory',
  inhaler: 'respiratory',
  suppository: 'rectal',
};

/** Suffixes that keep the brand family but change the product. */
const VARIANT_WORDS = new Set([
  'plus', 'forte', 'ds', 'sr', 'cr', 'xr', 'er', 'mr',
  'junior', 'jr', 'kid', 'kids', 'paed', 'paeds', 'pediatric',
  'extra', 'advance', 'max', 'mini',
]);

/** Unit => [family, factor into that family's base unit]. */
const UNITS = {
  mcg: ['mass', 0.001], ug: ['mass', 0.001], 'µg': ['mass', 0.001],
  mg: ['mass', 1], mgs: ['mass', 1],
  gm: ['mass', 1000], gms: ['mass', 1000], g: ['mass', 1000], gr: ['mass', 1000],
  kg: ['mass', 1000000],
  ml: ['volume', 1], mls: ['volume', 1], cc: ['volume', 1],
  ltr: ['volume', 1000], litre: ['volume', 1000], l: ['volume', 1000],
  iu: ['iu', 1], ius: ['iu', 1], u: ['iu', 1],
  '%': ['percent', 1],
};

const NOISE_TOKENS = new Set([
  'the', 'and', 'of', 'for', 'with', 'by', 'in', 'per', 'each', 'pack',
  'packs', 'box', 'boxes', 'bottle', 'bottles', 'strip', 'strips', 'pcs',
  'pc', 'piece', 'pieces', 'unit', 'units', 'set', 'nos', 'no',
]);

// Longest first so "gm" wins over "g" and "mls" over "ml".
const UNIT_PATTERN = Object.keys(UNITS)
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

const STRENGTH_RE = new RegExp(`(\\d+(?:[.,]\\d+)?(?:/\\d+(?:[.,]\\d+)?)*)(${UNIT_PATTERN})`, 'gu');
const STRENGTH_WORD_RE = new RegExp(`^\\d+(?:[.,]\\d+)?(?:/\\d+(?:[.,]\\d+)?)*(?:${UNIT_PATTERN})$`, 'u');
const MULTIPLIER_RE = /(\d+)x(\d+)(?:x(\d+))?s?/gu;
const PACK_RE = /(\d+)s/gu;
const WORD_SPLIT_RE = /[\s/|,.\-–—()+]+/u;

const CONFIDENCE_HIGH = 'high';
const CONFIDENCE_MEDIUM = 'medium';
const CONFIDENCE_LOW = 'low';

export const CONFIDENCE = {
  HIGH: CONFIDENCE_HIGH,
  MEDIUM: CONFIDENCE_MEDIUM,
  LOW: CONFIDENCE_LOW,
};

/** Auto-link threshold. */
export const HIGH_SCORE = 0.9;

/** Below this a candidate is not even worth suggesting. */
export const MEDIUM_SCORE = 0.66;

const WEIGHTS = {
  brand: 0.34,
  strength: 0.17,
  ingredient: 0.13,
  form: 0.12,
  pack: 0.1,
  variant: 0.07,
  manufacturer: 0.04,
  fuzzy: 0.08,
};

function isLetterOrDigit(ch) {
  return ch !== undefined && /[\p{L}\d]/u.test(ch);
}

function isLetter(ch) {
  return ch !== undefined && /\p{L}/u.test(ch);
}

/**
 * Case, punctuation and spacing fold. Strength and pack survive — they are
 * evidence, not noise.
 */
export function normalizeLabel(raw) {
  let s = String(raw || '').toLowerCase().trim();
  s = s.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-');
  s = s.replace(/[\u2018\u2019\u201C\u201D`'"]/g, '');
  s = s.replace(/[®™©]/g, '');
  // Supplier trade/net-price markers, not part of the product name.
  s = s.replace(/\((?:t\/p|n\/m|n\/p|tp|nm)\)/g, ' ');
  s = s.replace(/[^\p{L}\p{N}\s\-/.%]/gu, ' ');
  s = s.replace(/\s*-\s*/g, '-');
  s = s.replace(/\s*\/\s*/g, '/');
  s = s.replace(/(\d)\s+(mg|mcg|gm|gms|g|ml|mls|iu|cc|%)\b/gu, '$1$2');
  s = s.replace(/(\d)\s*[x×]\s*(\d)/gu, '$1x$2');
  s = s.replace(/(\d)\s+s\b/gu, '$1s');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Aggressive fold of glyphs OCR routinely confuses. Supporting signal only —
 * it deliberately collapses characters that do distinguish real brands.
 */
export function ocrKey(normalized) {
  return String(normalized || '')
    .replace(/rn/g, 'n')
    .replace(/cl/g, 'd')
    .replace(/vv/g, 'w')
    .replace(/m/g, 'n')
    .replace(/0/g, 'o')
    .replace(/[1l]/g, 'i')
    .replace(/5/g, 's')
    .replace(/8/g, 'b')
    .replace(/[69]/g, 'g')
    .replace(/2/g, 'z')
    .replace(/[^a-z0-9]/g, '');
}

function words(normalized) {
  return String(normalized || '')
    .split(WORD_SPLIT_RE)
    .map((w) => w.trim())
    .filter(Boolean);
}

function isStrengthWord(word) {
  return STRENGTH_WORD_RE.test(word);
}

function isPackWord(word) {
  return /^\d+s$/u.test(word) || /^\d+x\d+(?:x\d+)?s?$/u.test(word);
}

/**
 * Strength values grouped by unit family and folded to one base unit, so "1g"
 * and "1000mg" compare equal while "625mg" never matches "1g".
 */
export function extractStrengthFamilies(normalized) {
  const text = String(normalized || '');
  const families = {};

  for (const match of text.matchAll(STRENGTH_RE)) {
    const before = text[match.index - 1];
    const after = text[match.index + match[0].length];
    if (isLetterOrDigit(before) || isLetter(after)) continue;

    const [family, factor] = UNITS[match[2]];
    for (const part of match[1].split('/')) {
      const value = Number.parseFloat(part.replace(',', '.'));
      if (!Number.isFinite(value)) continue;
      const scaled = Math.round(value * factor * 1e6) / 1e6;
      families[family] ??= [];
      if (!families[family].includes(scaled)) families[family].push(scaled);
    }
  }

  for (const family of Object.keys(families)) families[family].sort((a, b) => a - b);
  return families;
}

/**
 * Every pack count the label could plausibly mean. "10x10s" yields both 100
 * (the box) and 10 (the strip) because suppliers write either.
 */
export function extractPackCounts(normalized) {
  const text = String(normalized || '');
  const packs = [];
  const add = (value) => {
    if (value > 0 && value <= 100000 && !packs.includes(value)) packs.push(value);
  };

  for (const match of text.matchAll(MULTIPLIER_RE)) {
    const before = text[match.index - 1];
    const after = text[match.index + match[0].length];
    if (isLetterOrDigit(before) || isLetterOrDigit(after)) continue;
    let product = Number(match[1]) * Number(match[2]);
    if (match[3]) {
      product *= Number(match[3]);
      add(Number(match[3]));
    }
    add(product);
    add(Number(match[2]));
  }

  for (const match of text.matchAll(PACK_RE)) {
    const before = text[match.index - 1];
    const after = text[match.index + match[0].length];
    if (isLetterOrDigit(before) || isLetterOrDigit(after)) continue;
    add(Number(match[1]));
  }

  return packs.sort((a, b) => a - b);
}

/**
 * The brand is the run of words before the first strength, form, pack or
 * dosage marker — "betnovate n" in "Betnovate N Cream 20gm", so it never
 * collapses into plain "betnovate" and matches Betnovate C.
 */
function leadingBrandTokens(list) {
  const brand = [];
  for (const word of list) {
    if (isStrengthWord(word) || isPackWord(word)) break;
    if (FORM_WORDS[word] || NOISE_TOKENS.has(word)) {
      // Pakistani invoices lead with the form: "TAB. PANADOL 500MG".
      // Skip it there; once the brand has started it ends the brand.
      if (!brand.length) continue;
      break;
    }
    if (/^\d+$/.test(word)) break;
    if (VARIANT_WORDS.has(word)) continue;
    brand.push(word);
    if (brand.length >= 4) break;
  }
  return brand;
}

/** Words that identify the drug, with forms, packs, strengths and filler gone. */
function identityTokens(list) {
  const tokens = [];
  for (const word of list) {
    if (word.length < 2) continue;
    if (FORM_WORDS[word] || NOISE_TOKENS.has(word) || VARIANT_WORDS.has(word)) continue;
    if (isStrengthWord(word) || isPackWord(word)) continue;
    if (/^\d+$/.test(word)) continue;
    // Legacy catalog tier suffixes: "… Syp L6", "… Cream E11".
    if (/^[le]\d+$/.test(word)) continue;
    if (!tokens.includes(word)) tokens.push(word);
  }
  return tokens;
}

/**
 * Splits a medicine label into the parts a pharmacist actually compares.
 *
 * @param {string} raw
 * @param {{generic?: string, strength?: string, manufacturer?: string, dosageForm?: string, packSize?: number}} extra
 *   Structured catalog columns, which let a terse name like "Amoxil Cap" still
 *   be compared on strength, form and pack.
 */
export function parseLabel(raw, extra = {}) {
  const normalized = normalizeLabel(raw);
  const strengthText = String(extra.strength || '').trim();
  const strengths = extractStrengthFamilies(
    strengthText ? `${normalized} ${normalizeLabel(strengthText)}` : normalized,
  );

  const packs = extractPackCounts(normalized);
  const packSize = Number(extra.packSize || 0);
  if (packSize > 0 && !packs.includes(packSize)) packs.push(packSize);

  const forms = [];
  for (const word of words(normalized)) {
    const form = FORM_WORDS[word];
    if (form && !forms.includes(form)) forms.push(form);
  }
  const columnForm = FORM_WORDS[String(extra.dosageForm || '').toLowerCase().trim()];
  if (columnForm && !forms.includes(columnForm)) forms.push(columnForm);

  const list = words(normalized);
  const brandTokens = leadingBrandTokens(list);
  const generic = normalizeLabel(extra.generic || '');

  const formGroups = [];
  for (const form of forms) {
    const group = FORM_GROUPS[form];
    if (group && !formGroups.includes(group)) formGroups.push(group);
  }

  return {
    raw: String(raw || ''),
    normalized,
    ocrKey: ocrKey(normalized),
    brandTokens,
    brandHead: brandTokens[0] || '',
    tokens: identityTokens(list),
    generic,
    genericTokens: generic ? identityTokens(words(generic)) : [],
    strengths,
    forms,
    formGroups,
    packs: packs.sort((a, b) => a - b),
    variants: list.filter((w, i) => VARIANT_WORDS.has(w) && list.indexOf(w) === i),
    manufacturer: normalizeLabel(extra.manufacturer || ''),
  };
}

/** PHP's similar_text: recursive longest-common-substring character count. */
function similarChars(a, b) {
  let max = 0;
  let posA = 0;
  let posB = 0;
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      let k = 0;
      while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k += 1;
      if (k > max) {
        max = k;
        posA = i;
        posB = j;
      }
    }
  }
  if (max === 0) return 0;
  return max
    + similarChars(a.slice(0, posA), b.slice(0, posB))
    + similarChars(a.slice(posA + max), b.slice(posB + max));
}

export function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  return round((similarChars(a, b) * 2) / (a.length + b.length));
}

function round(n, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function intersects(a, b) {
  return a.some((v) => b.includes(v));
}

/** 0 means "different product". null means there is nothing to compare. */
function brandScore(invoice, catalog) {
  const inv = invoice.brandTokens;
  const cat = catalog.brandTokens;
  if (!inv.length || !cat.length) return null;
  if (inv.join(' ') === cat.join(' ')) return 1;

  const invHead = inv[0];
  const catHead = cat[0];

  if (invHead === catHead) {
    const invTail = inv.slice(1);
    const catTail = cat.slice(1);
    // "Betnovate" vs "Betnovate N": the catalog simply spells out more.
    if (!invTail.length || !catTail.length) return 0.95;
    if (intersects(invTail, catTail)) return 0.95;
    // "Betnovate N" vs "Betnovate C" — same family, different medicine.
    return 0.2;
  }

  if (ocrKey(invHead) === ocrKey(catHead) && invHead.length >= 4) return 0.9;

  const headSim = stringSimilarity(invHead, catHead);
  if (headSim >= 0.9) return 0.85;
  if (headSim >= 0.82) return 0.7;

  // The brand may sit later in the other label ("Paracetamol (Panadol)").
  if (catalog.tokens.includes(invHead) || invoice.tokens.includes(catHead)) return 0.72;

  return 0;
}

function ingredientScore(invoice, catalog) {
  const inv = invoice.genericTokens;
  const cat = catalog.genericTokens;
  if (inv.length && cat.length) return intersects(inv, cat) ? 1 : 0;

  // Only one side names the ingredient: finding it in the other label is
  // strong corroboration, not finding it proves nothing.
  const known = cat.length ? cat : inv;
  if (!known.length) return null;
  const other = cat.length ? invoice.tokens : catalog.tokens;
  return intersects(known, other) ? 1 : null;
}

function strengthScore(invoice, catalog) {
  const shared = Object.keys(invoice.strengths).filter((f) => catalog.strengths[f]);
  if (!shared.length) return null;

  for (const family of shared) {
    const overlap = invoice.strengths[family].some(
      (value) => catalog.strengths[family].some((c) => Math.abs(value - c) < 0.0011),
    );
    if (!overlap) return 0;
  }
  return 1;
}

function formScore(invoice, catalog) {
  if (!invoice.forms.length || !catalog.forms.length) return null;
  if (intersects(invoice.forms, catalog.forms)) return 1;
  if (!invoice.formGroups.length || !catalog.formGroups.length) return 0.6;
  // Tablet vs capsule: same shelf, still a different SKU.
  if (intersects(invoice.formGroups, catalog.formGroups)) return 0.45;
  return 0;
}

function packScore(invoice, catalog) {
  if (!invoice.packs.length || !catalog.packs.length) return null;
  return intersects(invoice.packs, catalog.packs) ? 1 : 0.15;
}

function variantScore(invoice, catalog) {
  const inv = invoice.variants;
  const cat = catalog.variants;
  if (!inv.length && !cat.length) return null;
  if (inv.join(' ') === cat.join(' ')) return 1;
  if (intersects(inv, cat)) return 0.8;
  // Supplier labels drop suffixes often enough that this only blocks
  // auto-linking rather than rejecting outright.
  return !inv.length || !cat.length ? 0.35 : 0.15;
}

function manufacturerScore(invoice, catalog) {
  const inv = invoice.manufacturer;
  const cat = catalog.manufacturer;
  if (inv && cat) {
    if (inv === cat) return 1;
    return stringSimilarity(inv, cat) >= 0.85 ? 0.9 : 0.2;
  }
  const known = cat || inv;
  if (!known || known.length < 4) return null;
  const haystack = cat ? invoice.normalized : catalog.normalized;
  return haystack.includes(known) ? 1 : null;
}

/**
 * Supporting signal only. Deliberately has no floor: two unrelated labels must
 * be able to score near zero.
 */
function fuzzyScore(invoice, catalog) {
  const plain = stringSimilarity(invoice.normalized, catalog.normalized);
  // Discounted because the OCR fold collapses characters that genuinely
  // separate some brands.
  const folded = stringSimilarity(invoice.ocrKey, catalog.ocrKey) * 0.98;

  let jaccard = 0;
  if (invoice.tokens.length && catalog.tokens.length) {
    const union = new Set([...invoice.tokens, ...catalog.tokens]).size;
    if (union) {
      jaccard = invoice.tokens.filter((t) => catalog.tokens.includes(t)).length / union;
    }
  }

  return round(Math.max(plain, folded, jaccard));
}

/**
 * Compares an invoice label to a catalog label and reports both the verdict
 * and the reasoning behind it.
 *
 * @returns {{
 *   score: number, confidence: string, rejected: boolean, rejectionReason: string|null,
 *   blockers: string[], evidence: number, brandScore: number|null, ingredientScore: number|null,
 *   strengthScore: number|null, formScore: number|null, packScore: number|null,
 *   variantScore: number|null, manufacturerScore: number|null, fuzzyScore: number,
 * }}
 */
export function scoreLabels(invoice, catalog) {
  const scores = {
    brand: brandScore(invoice, catalog),
    strength: strengthScore(invoice, catalog),
    ingredient: ingredientScore(invoice, catalog),
    form: formScore(invoice, catalog),
    pack: packScore(invoice, catalog),
    variant: variantScore(invoice, catalog),
    manufacturer: manufacturerScore(invoice, catalog),
    fuzzy: fuzzyScore(invoice, catalog),
  };

  const detail = {
    brandScore: scores.brand,
    ingredientScore: scores.ingredient,
    strengthScore: scores.strength,
    formScore: scores.form,
    packScore: scores.pack,
    variantScore: scores.variant,
    manufacturerScore: scores.manufacturer,
    fuzzyScore: scores.fuzzy,
  };

  // Hard gates: a conflict here means the two labels cannot be the same SKU,
  // so no similarity score is allowed to rescue the candidate.
  let rejection = null;
  if (scores.form === 0) rejection = 'dosage_form_conflict';
  else if (scores.strength === 0) rejection = 'strength_conflict';
  // A shared active ingredient is the one thing that can justify two different
  // brand words (generic substitution in the catalog).
  else if (scores.brand === 0) rejection = scores.ingredient === 1 ? null : 'brand_conflict';
  else if (scores.ingredient === 0) rejection = 'ingredient_conflict';

  if (rejection) {
    return {
      score: 0,
      confidence: CONFIDENCE_LOW,
      rejected: true,
      rejectionReason: rejection,
      blockers: [],
      evidence: 0,
      ...detail,
    };
  }

  const blockers = [];
  if (scores.pack !== null && scores.pack < 0.9) blockers.push('pack_size_mismatch');
  if (scores.form !== null && scores.form < 0.9) blockers.push('dosage_form_subtype_mismatch');
  if (scores.brand !== null && scores.brand < 0.9) blockers.push('brand_not_exact');
  if (scores.variant !== null && scores.variant < 0.9) blockers.push('variant_mismatch');
  if (scores.strength === null && scores.pack === null && scores.form === null) {
    blockers.push('no_corroborating_detail');
  }

  let weighted = 0;
  let total = 0;
  let evidence = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const value = scores[key];
    if (value === null) continue;
    weighted += weight * value;
    total += weight;
    if (key !== 'fuzzy' && value >= 0.9) evidence += 1;
  }

  const score = total > 0 ? round(weighted / total) : 0;

  // HIGH means "link it without a human looking". That needs a clean set of
  // signals and at least two independent ones agreeing — an exact brand on its
  // own is not enough to auto-link.
  let confidence = CONFIDENCE_LOW;
  if (score >= HIGH_SCORE && !blockers.length && evidence >= 2) confidence = CONFIDENCE_HIGH;
  else if (score >= MEDIUM_SCORE) confidence = CONFIDENCE_MEDIUM;

  return {
    score,
    confidence,
    rejected: false,
    rejectionReason: null,
    blockers,
    evidence,
    ...detail,
  };
}

/** Convenience wrapper for callers that only have two raw strings. */
export function scoreLabelPair(invoiceText, catalogText, catalogExtra = {}) {
  return scoreLabels(parseLabel(invoiceText), parseLabel(catalogText, catalogExtra));
}

const SIGNAL_LABELS = {
  brand_score: 'Brand',
  ingredient_score: 'Ingredient',
  strength_score: 'Strength',
  form_score: 'Dosage form',
  pack_score: 'Pack size',
  variant_score: 'Variant',
  manufacturer_score: 'Manufacturer',
  fuzzy_score: 'Text similarity',
};

const REASON_LABELS = {
  dosage_form_conflict: 'a different dosage form',
  strength_conflict: 'a different strength',
  brand_conflict: 'a different brand',
  ingredient_conflict: 'a different active ingredient',
  pack_size_mismatch: 'pack size differs',
  dosage_form_subtype_mismatch: 'dosage form differs (tablet/capsule)',
  brand_not_exact: 'brand is not an exact read',
  variant_mismatch: 'variant suffix differs',
  no_corroborating_detail: 'only the brand could be compared',
  no_compatible_candidate: 'nothing in the catalog is compatible',
  ambiguous_top_candidates: 'several products fit equally well',
  unique_brand_in_catalog: 'this brand has one product in the catalog',
};

/**
 * Plain-language explanation of a match, for the review grid tooltip.
 * Returns '' when there is nothing recorded.
 */
export function describeMatchDiagnostics(diagnostics) {
  if (!diagnostics || typeof diagnostics !== 'object') return '';

  const lines = [];
  for (const [key, label] of Object.entries(SIGNAL_LABELS)) {
    const value = diagnostics[key];
    if (value === null || value === undefined) continue;
    lines.push(`${label}: ${Math.round(Number(value) * 100)}%`);
  }

  const header = [];
  if (diagnostics.decided_by) {
    header.push(REASON_LABELS[diagnostics.decided_by] || diagnostics.decided_by.replace(/_/g, ' '));
  }
  if (diagnostics.rejection_reason) {
    header.push(`rejected: ${REASON_LABELS[diagnostics.rejection_reason] || diagnostics.rejection_reason}`);
  }
  for (const blocker of diagnostics.blockers || []) {
    header.push(REASON_LABELS[blocker] || blocker.replace(/_/g, ' '));
  }
  if (Number.isFinite(diagnostics.candidates_compatible)) {
    header.push(
      `${diagnostics.candidates_compatible} of ${diagnostics.candidates_considered} candidates compatible`,
    );
  }

  return [...header, ...lines].join('\n');
}

/** Words used to shortlist candidates before the (costlier) full scoring. */
export function retrievalTokens(text) {
  const seen = new Set();
  for (const part of String(text || '').toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (part.length >= 3 && !/^\d+$/.test(part)) seen.add(part);
  }
  return [...seen];
}

/** Two candidates this close together are not distinguishable evidence. */
const AMBIGUITY_GAP = 0.05;

/**
 * The pharmaceutical evidence behind a score, without the fuzzy term. Two
 * candidates sharing a signature are indistinguishable on anything that
 * actually identifies a medicine.
 */
function evidenceSignature(result) {
  return Object.keys(WEIGHTS)
    .filter((key) => key !== 'fuzzy')
    .map((key) => {
      const value = result[`${key}Score`];
      return value === null ? '-' : value.toFixed(2);
    })
    .join('|');
}

/**
 * Drops candidates that conflict pharmaceutically, ranks what is left and
 * decides whether the winner is strong enough to link without asking.
 * Mirrors `InvoiceProductMatcher::rankCandidates()`.
 *
 * @param {object} invoice parsed invoice label
 * @param {Array<{item: any, parsed: object}>} candidates
 * @returns {{ best: any|null, score: number, confidence: string, alternatives: Array<{item: any, score: number}>, diagnostics: object }}
 */
export function rankCandidates(invoice, candidates) {
  const survivors = [];
  const rejectedBy = {};

  for (const candidate of candidates) {
    const result = scoreLabels(invoice, candidate.parsed);
    if (result.rejected) {
      rejectedBy[result.rejectionReason] = (rejectedBy[result.rejectionReason] || 0) + 1;
      continue;
    }
    survivors.push({ item: candidate.item, result });
  }

  if (!survivors.length) {
    return {
      best: null,
      score: 0,
      confidence: CONFIDENCE_LOW,
      alternatives: [],
      diagnostics: {
        decided_by: 'no_compatible_candidate',
        candidates_considered: candidates.length,
        candidates_compatible: 0,
        rejected_by: rejectedBy,
      },
    };
  }

  survivors.sort((a, b) => b.result.score - a.result.score);
  const top = survivors[0];
  const { score } = top.result;
  let confidence = top.result.confidence;
  let decidedBy = 'weighted_score';

  // A brand that resolves to exactly one product in the catalog is strong
  // evidence on its own — "GRAMEX" with a single Gramex on the shelf.
  if (
    confidence === CONFIDENCE_MEDIUM
    && survivors.length === 1
    && score >= 0.88
    && (top.result.brandScore || 0) >= 0.95
    && top.result.blockers.length === 1
    && top.result.blockers[0] === 'no_corroborating_detail'
  ) {
    confidence = CONFIDENCE_HIGH;
    decidedBy = 'unique_brand_in_catalog';
  }

  // Two plausible products this close apart means the invoice text does not
  // say which one it is. Ask instead of guessing.
  let ambiguous = false;
  if (survivors.length > 1) {
    const runnerUp = survivors[1].result;
    // Equal pharmaceutical evidence must not be broken by the fuzzy
    // tie-breaker: "Amoxil Cap" cannot choose between the 250mg and the 500mg
    // just because one name reads a little closer.
    ambiguous = score - runnerUp.score < AMBIGUITY_GAP
      || evidenceSignature(top.result) === evidenceSignature(runnerUp);

    if (ambiguous && confidence === CONFIDENCE_HIGH) {
      confidence = CONFIDENCE_MEDIUM;
      decidedBy = 'ambiguous_top_candidates';
    }
  }

  return {
    best: confidence === CONFIDENCE_LOW ? null : top.item,
    score,
    confidence,
    alternatives: survivors.slice(0, 4).map((s) => ({ item: s.item, score: s.result.score })),
    diagnostics: {
      brand_score: top.result.brandScore,
      ingredient_score: top.result.ingredientScore,
      strength_score: top.result.strengthScore,
      form_score: top.result.formScore,
      pack_score: top.result.packScore,
      variant_score: top.result.variantScore,
      manufacturer_score: top.result.manufacturerScore,
      fuzzy_score: top.result.fuzzyScore,
      weighted_score: score,
      confidence_level: confidence,
      evidence_signals: top.result.evidence,
      blockers: top.result.blockers,
      decided_by: decidedBy,
      candidates_considered: candidates.length,
      candidates_compatible: survivors.length,
      rejected_by: rejectedBy,
      ambiguous,
    },
  };
}
