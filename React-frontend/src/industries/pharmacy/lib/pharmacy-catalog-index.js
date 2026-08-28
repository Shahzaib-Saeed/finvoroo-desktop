/**
 * In-memory pharmacy catalog search index.
 *
 * Built once when the POS opens, then queried synchronously on every keystroke —
 * no network, no debounce. Designed to stay under a few milliseconds from 7k rows
 * up to several hundred thousand.
 *
 * Shape of the work:
 *   - exact barcode / SKU are Map lookups, so scanning is O(1)
 *   - name search seeds candidates from a token-prefix posting list, so a query
 *     never walks the whole catalog
 *   - verification uses precomputed normalized strings and `indexOf`, so the hot
 *     loop allocates nothing
 *   - results are chosen with bounded top-K insertion instead of sorting every hit
 *
 * Dependency-free on purpose: `node --test` and the benchmark import it directly.
 */

/** Longest token prefix that gets its own posting list. */
const PREFIX_MAX = 3;

/** Upper bound on candidates examined for one query, so a 1-char query on a huge
 *  catalog still returns in about a millisecond. Real queries never reach it. */
const SCAN_CAP = 20000;

export const DEFAULT_LIMIT = 50;

const SCORE = {
  barcodeExact: 2000,
  skuExact: 1500,
  nameExact: 1000,
  namePrefix: 500,
  gluedPrefix: 220,
  gluedContains: 60,
  tokenTextStart: 60,
  tokenWordStart: 40,
  tokenSubstring: 12,
};

/**
 * Lowercase, strip punctuation to spaces, collapse runs of whitespace.
 * Keeps digits and any non-Latin letters (Arabic/Urdu names stay searchable).
 */
export function normalizeText(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Letters and digits only — lets "bfl 24g" find "BFL-24G". */
export function compactAlnum(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/** Digits only, for barcode comparison across scanner/label formatting. */
function digitsOnly(value) {
  if (!value) return '';
  return String(value).replace(/\D+/g, '');
}

function splitCodes(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(splitCodes);
  return String(value)
    .split(/[,;|\s]+/)
    .map((code) => code.trim())
    .filter(Boolean);
}

/**
 * How strongly `needle` occurs in `hay`:
 *   3 = hay starts with it, 2 = starts a word, 1 = inside a word, 0 = absent.
 * `hay` must already be normalized (single spaces).
 */
function matchStrength(hay, needle) {
  const at = hay.indexOf(needle);
  if (at < 0) return 0;
  if (at === 0) return 3;
  return hay.charCodeAt(at - 1) === 32 ? 2 : 1;
}

/**
 * Build the search index. `rows` are compact catalog rows and are kept by
 * reference — the index never copies or clones them.
 */
export function buildCatalogIndex(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const count = list.length;

  const name = new Array(count);
  const text = new Array(count);
  const glued = new Array(count);
  const byId = new Map();
  const byBarcode = new Map();
  const bySku = new Map();

  // Single pass. Postings accumulate in plain number arrays (V8 keeps these as
  // packed small integers) and are frozen into Int32Arrays at the end. Doing it
  // in one pass matters: normalization is the expensive part and a second pass
  // would double it.
  const buckets = new Map();
  const seenAt = new Map();
  const tokenBuf = [];

  for (let i = 0; i < count; i += 1) {
    const row = list[i];
    const normName = normalizeText(row?.name);
    const normGeneric = normalizeText(row?.generic);
    const normMaker = normalizeText(row?.maker);
    const normStrength = normalizeText(row?.strength);
    const sku = row?.sku ? String(row.sku) : '';

    name[i] = normName;

    let hay = normName;
    if (normGeneric) hay += ` ${normGeneric}`;
    if (normStrength) hay += ` ${normStrength}`;
    if (normMaker) hay += ` ${normMaker}`;
    if (sku) hay += ` ${sku.toLowerCase()}`;
    text[i] = hay;

    // Already normalized, so only spaces need removing — far cheaper than
    // running the unicode-property regex over the raw strings again.
    glued[i] = normGeneric
      ? `${normName} ${normGeneric}`.replace(/ /g, '')
      : normName.replace(/ /g, '');

    if (row?.id != null) byId.set(String(row.id), i);

    if (sku) {
      const key = sku.toLowerCase();
      if (!bySku.has(key)) bySku.set(key, i);
      const packed = compactAlnum(sku);
      if (packed && packed !== key && !bySku.has(packed)) bySku.set(packed, i);
    }

    for (const code of splitCodes(row?.barcode)) {
      const key = code.toLowerCase();
      if (!byBarcode.has(key)) byBarcode.set(key, i);
      const digits = digitsOnly(code);
      if (digits && digits !== key && !byBarcode.has(digits)) byBarcode.set(digits, i);
    }

    // Bucket every prefix (1..PREFIX_MAX chars) of every token the cashier might
    // type, so a query of any length lands on a posting list instead of a scan.
    tokenBuf.length = 0;
    collectTokens(normName, tokenBuf);
    collectTokens(normGeneric, tokenBuf);
    collectTokens(normMaker, tokenBuf);
    for (let t = 0; t < tokenBuf.length; t += 1) {
      const token = tokenBuf[t];
      const stop = token.length < PREFIX_MAX ? token.length : PREFIX_MAX;
      for (let len = 1; len <= stop; len += 1) {
        const key = len === token.length ? token : token.slice(0, len);
        // One row's tokens are visited together, so this dedupes repeats like
        // "panadol extra panadol" without allocating a per-row Set.
        if (seenAt.get(key) === i) continue;
        seenAt.set(key, i);
        const bucket = buckets.get(key);
        if (bucket) bucket.push(i);
        else buckets.set(key, [i]);
      }
    }
  }

  const postings = new Map();
  for (const [key, bucket] of buckets) postings.set(key, Int32Array.from(bucket));

  return { rows: list, count, name, text, glued, byId, byBarcode, bySku, postings };
}

function collectTokens(normalized, out) {
  if (!normalized) return;
  let start = 0;
  for (let i = 0; i <= normalized.length; i += 1) {
    if (i === normalized.length || normalized.charCodeAt(i) === 32) {
      if (i > start) out.push(normalized.slice(start, i));
      start = i + 1;
    }
  }
}

/** Exact barcode hit, or null. O(1). */
export function lookupBarcode(index, code) {
  if (!index || !code) return null;
  const raw = String(code).trim();
  if (!raw) return null;
  let at = index.byBarcode.get(raw.toLowerCase());
  if (at === undefined) {
    const digits = digitsOnly(raw);
    if (digits) at = index.byBarcode.get(digits);
  }
  return at === undefined ? null : index.rows[at];
}

/** Exact SKU hit, or null. O(1). */
export function lookupSku(index, code) {
  if (!index || !code) return null;
  const raw = String(code).trim();
  if (!raw) return null;
  let at = index.bySku.get(raw.toLowerCase());
  if (at === undefined) {
    const packed = compactAlnum(raw);
    if (packed) at = index.bySku.get(packed);
  }
  return at === undefined ? null : index.rows[at];
}

export function lookupId(index, id) {
  if (!index || id == null) return null;
  const at = index.byId.get(String(id));
  return at === undefined ? null : index.rows[at];
}

/**
 * What a scanner gun just sent us: barcode first, then SKU. Returns null for
 * anything that is not an exact code so the caller can fall through to search.
 */
export function resolveScanCode(index, code) {
  return lookupBarcode(index, code) || lookupSku(index, code);
}

/**
 * Search the catalog. Synchronous and allocation-light: safe to call directly
 * from an input's onChange on every keystroke.
 */
export function searchCatalog(index, query, options = {}) {
  const limit = options.limit || DEFAULT_LIMIT;
  if (!index || !index.count) return [];

  const q = normalizeText(query);
  if (!q) return index.rows.slice(0, limit);

  const compact = compactAlnum(query);
  const tokens = [];
  collectTokens(q, tokens);
  if (!tokens.length) return index.rows.slice(0, limit);

  const top = createTopK(limit);

  // Exact code wins outright — the cashier scanned or typed an identifier.
  const exact = resolveScanCode(index, query);
  if (exact) {
    const at = index.byId.get(String(exact.id));
    if (at !== undefined) {
      const isBarcode = lookupBarcode(index, query) != null;
      pushTopK(top, index, at, isBarcode ? SCORE.barcodeExact : SCORE.skuExact);
    }
  }

  const candidates = seedCandidates(index, tokens);
  const { text, name, glued } = index;
  const first = tokens[0];
  const multi = tokens.length > 1;
  let scanned = 0;

  for (let c = 0; c < candidates.length; c += 1) {
    const at = candidates[c];
    if (scanned >= SCAN_CAP) break;
    scanned += 1;

    const hay = text[at];
    let score = 0;
    let matchedAll = true;

    for (let t = 0; t < tokens.length; t += 1) {
      const strength = matchStrength(hay, tokens[t]);
      if (!strength) {
        matchedAll = false;
        break;
      }
      if (strength === 3) score += SCORE.tokenTextStart;
      else if (strength === 2) score += SCORE.tokenWordStart;
      else score += SCORE.tokenSubstring;
    }

    if (!matchedAll) {
      // "bfl 24g" / "bfl24g" style: fall back to the glued form.
      if (compact.length >= 3) {
        const gluedAt = glued[at].indexOf(compact);
        if (gluedAt === 0) score = SCORE.gluedPrefix;
        else if (gluedAt > 0) score = SCORE.gluedContains;
        else continue;
      } else {
        continue;
      }
    }

    const label = name[at];
    if (label === q) score += SCORE.nameExact;
    else if (label.startsWith(q)) score += SCORE.namePrefix;
    else if (!multi && label.startsWith(first)) score += SCORE.tokenWordStart;

    pushTopK(top, index, at, score);
  }

  return drainTopK(top, index);
}

/**
 * Pick the smallest posting list among the query's tokens. Seeding from the
 * rarest token is what keeps "pan 500" cheap — it scans the few rows containing
 * "500" rather than every row starting with "pan".
 */
function seedCandidates(index, tokens) {
  let best = null;
  for (let t = 0; t < tokens.length; t += 1) {
    const token = tokens[t];
    const key = token.slice(0, Math.min(PREFIX_MAX, token.length));
    const bucket = index.postings.get(key);
    if (!bucket) return EMPTY_SEED_FALLBACK(index, tokens);
    if (!best || bucket.length < best.length) best = bucket;
  }
  return best || EMPTY;
}

const EMPTY = new Int32Array(0);

/**
 * A token with no posting list means it is not the start of any indexed word
 * (e.g. someone typed a manufacturer fragment or a mid-word piece). Only then do
 * we widen to a capped linear pass.
 */
function EMPTY_SEED_FALLBACK(index, tokens) {
  let best = null;
  for (let t = 0; t < tokens.length; t += 1) {
    const token = tokens[t];
    const key = token.slice(0, Math.min(PREFIX_MAX, token.length));
    const bucket = index.postings.get(key);
    if (bucket && (!best || bucket.length < best.length)) best = bucket;
  }
  if (best) return best;
  const size = Math.min(index.count, SCAN_CAP);
  const all = new Int32Array(size);
  for (let i = 0; i < size; i += 1) all[i] = i;
  return all;
}

/* ---- bounded top-K: keeps the best `limit` hits without sorting every match ---- */

function createTopK(limit) {
  return { limit, size: 0, at: new Int32Array(limit), score: new Int32Array(limit), seen: new Set() };
}

function pushTopK(top, index, at, score) {
  if (top.seen.has(at)) return;

  if (top.size === top.limit && score <= top.score[top.size - 1]) {
    const worst = top.score[top.size - 1];
    if (score < worst) return;
    if (score === worst && !betterTie(index, at, top.at[top.size - 1])) return;
  }

  let pos = top.size < top.limit ? top.size : top.limit - 1;
  if (top.size === top.limit) top.seen.delete(top.at[pos]);
  while (pos > 0) {
    const prevScore = top.score[pos - 1];
    if (prevScore > score) break;
    if (prevScore === score && !betterTie(index, at, top.at[pos - 1])) break;
    top.at[pos] = top.at[pos - 1];
    top.score[pos] = prevScore;
    pos -= 1;
  }
  top.at[pos] = at;
  top.score[pos] = score;
  top.seen.add(at);
  if (top.size < top.limit) top.size += 1;
}

/** Shorter names first, then plain string order. Never `localeCompare` — Intl
 *  collation costs more than the entire search. */
function betterTie(index, a, b) {
  const nameA = index.name[a];
  const nameB = index.name[b];
  if (nameA.length !== nameB.length) return nameA.length < nameB.length;
  return nameA < nameB;
}

function drainTopK(top, index) {
  const out = new Array(top.size);
  for (let i = 0; i < top.size; i += 1) out[i] = index.rows[top.at[i]];
  return out;
}
