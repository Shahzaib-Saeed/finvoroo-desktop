/**
 * Pharmacy catalog search benchmark.
 *
 *   npm run bench:pharmacy-search
 *
 * Generates synthetic catalogs at 7k / 35k / 100k / 350k rows and reports index
 * build time, exact barcode/SKU lookup, name search, and the cost of the previous
 * linear-scan filter for comparison.
 *
 * Run with --expose-gc for meaningful heap numbers:
 *   node --expose-gc src/industries/pharmacy/lib/pharmacy-catalog-index.bench.js
 */
import {
  buildCatalogIndex,
  compactAlnum,
  lookupBarcode,
  lookupSku,
  searchCatalog,
} from './pharmacy-catalog-index.js';

const SIZES = [7_000, 35_000, 100_000, 350_000];

const BRANDS = [
  'Panadol', 'Amoxil', 'Augmentin', 'Brufen', 'Calpol', 'Ciproxin', 'Disprin',
  'Flagyl', 'Glucophage', 'Hydryllin', 'Imodium', 'Klaricid', 'Lipitor',
  'Motilium', 'Nexium', 'Ospamox', 'Panadeine', 'Risek', 'Septran', 'Tegral',
  'Velosef', 'Wilshire', 'Xanax', 'Zantac', 'Zithromax', 'Bfl', 'Novidat',
];
const GENERICS = [
  'Paracetamol', 'Amoxicillin', 'Ibuprofen', 'Ciprofloxacin', 'Aspirin',
  'Metronidazole', 'Metformin', 'Loperamide', 'Clarithromycin', 'Atorvastatin',
  'Domperidone', 'Esomeprazole', 'Omeprazole', 'Alprazolam', 'Ranitidine',
];
const FORMS = ['Tab', 'Cap', 'Syp', 'Inj', 'Drops', 'Susp', 'Cream', 'Sachet'];
const MAKERS = ['GSK', 'Getz', 'Abbott', 'Searle', 'Hilton', 'Sami', 'Wilshire', 'Bosch'];
const STRENGTHS = ['250mg', '500mg', '625mg', '1g', '100mg', '20mg', '40mg', '5ml'];

/** Deterministic PRNG so numbers are comparable between runs. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCatalog(size) {
  const rand = rng(20260826);
  const rows = new Array(size);
  for (let i = 0; i < size; i += 1) {
    const brand = BRANDS[(rand() * BRANDS.length) | 0];
    const generic = GENERICS[(rand() * GENERICS.length) | 0];
    const form = FORMS[(rand() * FORMS.length) | 0];
    const strength = STRENGTHS[(rand() * STRENGTHS.length) | 0];
    const maker = MAKERS[(rand() * MAKERS.length) | 0];
    const pack = 1 + ((rand() * 200) | 0);
    rows[i] = {
      id: i + 1,
      name: `${brand} ${strength} ${form} ${pack}'s`,
      sku: `SKU${100000 + i}`,
      barcode: `${8900000000000 + i}`,
      generic,
      strength,
      maker,
      price: Math.round(rand() * 500000) / 100,
      stock: (rand() * 120) | 0,
    };
  }
  return rows;
}

/* ---- replica of the previous implementation, for comparison only ---- */

function legacyIndexRow(row) {
  const haystack = [row.name, row.sku, row.barcode, row.generic, row.strength, row.maker]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return { ...row, _lookup: { haystack, compact: compactAlnum(haystack) } };
}

function legacyScore(row, q, tokens, compactQ) {
  const label = String(row.name || '').toLowerCase();
  const compactName = compactAlnum(row.name);
  let score = 0;
  if (label === q || compactName === compactQ) score += 80;
  else if (label.startsWith(q) || (compactQ && compactName.startsWith(compactQ))) score += 40;
  else if (label.includes(q) || (compactQ && compactName.includes(compactQ))) score += 20;
  if (tokens[0] && label.startsWith(tokens[0])) score += 15;
  if (String(row.barcode || '').toLowerCase() === q) score += 50;
  if (String(row.sku || '').toLowerCase() === q) score += 35;
  return score;
}

function legacyFilter(list, term, limit) {
  const q = String(term || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return list.slice(0, limit);
  const tokens = q.split(' ').filter(Boolean);
  const compactQ = compactAlnum(q);
  const scored = [];
  for (const row of list) {
    const hay = row._lookup.haystack;
    const compact = row._lookup.compact;
    const tokensHit = tokens.every((t) => hay.includes(t) || compact.includes(compactAlnum(t)));
    const gluedHit = compactQ.length >= 2 && compact.includes(compactQ);
    if (!tokensHit && !gluedHit) continue;
    scored.push({ row, score: legacyScore(row, q, tokens, compactQ) });
  }
  scored.sort(
    (a, b) => b.score - a.score || String(a.row.name || '').localeCompare(String(b.row.name || '')),
  );
  return scored.slice(0, limit).map((s) => s.row);
}

/* ---- timing helpers ---- */

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

function p95(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
}

function timeEach(runs, fn) {
  // Warm up so we measure steady state, not the first JIT pass.
  for (let i = 0; i < Math.min(20, runs); i += 1) fn(i);
  const samples = new Array(runs);
  for (let i = 0; i < runs; i += 1) {
    const started = performance.now();
    fn(i);
    samples[i] = performance.now() - started;
  }
  return { median: median(samples), p95: p95(samples) };
}

function ms(value) {
  return `${value.toFixed(3)} ms`;
}

function heapMb() {
  if (typeof global.gc === 'function') global.gc();
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

const QUERIES = ['p', 'pa', 'pan', 'panad', 'panadol', 'pan 500', 'amox 500', 'brufen tab', 'bfl24g'];

function run() {
  console.log('Pharmacy catalog search benchmark');
  console.log(`node ${process.version}   gc:${typeof global.gc === 'function' ? 'on' : 'off (use --expose-gc)'}`);

  for (const size of SIZES) {
    console.log(`\n${'='.repeat(72)}`);
    console.log(`Dataset: ${size.toLocaleString()} products`);
    console.log('='.repeat(72));

    const heapBefore = heapMb();
    const rows = makeCatalog(size);

    const buildStarted = performance.now();
    const index = buildCatalogIndex(rows);
    const buildMs = performance.now() - buildStarted;
    const heapAfter = heapMb();

    console.log(`  index build            ${ms(buildMs)}`);
    console.log(`  index + rows in heap   ${(heapAfter - heapBefore).toFixed(1)} MB`);
    console.log(`  token prefix buckets   ${index.postings.size.toLocaleString()}`);

    const barcode = timeEach(2000, (i) => lookupBarcode(index, `${8900000000000 + (i % size)}`));
    console.log(`  barcode lookup         ${ms(barcode.median)}  (p95 ${ms(barcode.p95)})   target < 2 ms`);

    const sku = timeEach(2000, (i) => lookupSku(index, `SKU${100000 + (i % size)}`));
    console.log(`  sku lookup             ${ms(sku.median)}  (p95 ${ms(sku.p95)})   target < 3 ms`);

    console.log('  name search            target < 10-15 ms');
    let worst = 0;
    for (const query of QUERIES) {
      const hits = searchCatalog(index, query, { limit: 50 });
      const timing = timeEach(300, () => searchCatalog(index, query, { limit: 50 }));
      worst = Math.max(worst, timing.p95);
      console.log(
        `    ${query.padEnd(12)} ${ms(timing.median).padStart(10)}  (p95 ${ms(timing.p95).padStart(10)})  ${hits.length} hits`,
      );
    }
    console.log(`  worst-case name p95    ${ms(worst)}`);

    // Same queries through the previous linear filter, for comparison. Skipped
    // past 100k because sampling it repeatedly takes minutes — which is the point.
    if (size <= 100_000) {
      const legacyRows = rows.map(legacyIndexRow);
      for (const query of ['pan', 'pan 500']) {
        const old = timeEach(20, () => legacyFilter(legacyRows, query, 50));
        const now = timeEach(300, () => searchCatalog(index, query, { limit: 50 }));
        const speedup = old.median / Math.max(now.median, 1e-6);
        console.log(
          `  old vs new "${query}"`.padEnd(25) +
            `${ms(old.median).padStart(10)} -> ${ms(now.median).padStart(10)}  (${speedup.toFixed(0)}x faster)`,
        );
      }
    }
  }

  console.log(`\n${'='.repeat(72)}`);
  console.log('Exact code lookups are Map hits, so they stay flat as the catalog grows.');
  console.log('Name search scans one token-prefix posting list, not the catalog.');
}

run();
