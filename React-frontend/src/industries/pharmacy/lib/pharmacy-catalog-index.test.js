import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCatalogIndex,
  compactAlnum,
  lookupBarcode,
  lookupSku,
  normalizeText,
  resolveScanCode,
  searchCatalog,
} from './pharmacy-catalog-index.js';

const CATALOG = [
  {
    id: 1,
    name: "Panadol 500mg 100's",
    sku: 'PAN500',
    barcode: '8901234567890',
    generic: 'Paracetamol',
    strength: '500 mg',
    maker: 'GSK',
  },
  {
    id: 2,
    name: 'Panadol Extra Tab 20s',
    sku: 'PANX20',
    barcode: '8901234567891',
    generic: 'Paracetamol Caffeine',
    strength: '500 mg',
    maker: 'GSK',
  },
  {
    id: 3,
    name: 'Amoxil 500mg Cap',
    sku: 'AMX500',
    barcode: '5001234567890,5001234567897',
    generic: 'Amoxicillin',
    strength: '500 mg',
    maker: 'Wilshire',
  },
  {
    id: 4,
    name: 'BFL-24G Syringe',
    sku: 'BFL24',
    barcode: '',
    generic: '',
    strength: '',
    maker: 'Becton',
  },
  {
    id: 5,
    name: 'Augmentin 625mg Tab',
    sku: 'AUG625',
    barcode: '7001234567890',
    generic: 'Amoxicillin Clavulanate',
    strength: '625 mg',
    maker: 'GSK',
  },
  {
    id: 6,
    name: 'برشام بنادول',
    sku: 'AR-PAN',
    barcode: '9001234567890',
    generic: '',
    strength: '',
    maker: '',
  },
];

const index = buildCatalogIndex(CATALOG);
const names = (rows) => rows.map((row) => row.name);

describe('normalization', () => {
  it('lowercases, strips punctuation, and collapses spaces', () => {
    assert.equal(normalizeText("  Panadol   500mg  100's "), 'panadol 500mg 100 s');
  });

  it('keeps non-Latin letters searchable', () => {
    assert.equal(normalizeText('برشام بنادول'), 'برشام بنادول');
  });

  it('glues alphanumerics for spacing-insensitive matching', () => {
    assert.equal(compactAlnum('BFL-24 G'), 'bfl24g');
  });
});

describe('exact code lookup', () => {
  it('finds a product by barcode', () => {
    assert.equal(lookupBarcode(index, '8901234567890').id, 1);
  });

  it('supports several barcodes on one product', () => {
    assert.equal(lookupBarcode(index, '5001234567890').id, 3);
    assert.equal(lookupBarcode(index, '5001234567897').id, 3);
  });

  it('ignores scanner formatting around the digits', () => {
    assert.equal(lookupBarcode(index, ' 890-1234-567890 ').id, 1);
  });

  it('finds a product by sku, case and punctuation insensitive', () => {
    assert.equal(lookupSku(index, 'pan500').id, 1);
    assert.equal(lookupSku(index, 'AUG-625').id, 5);
  });

  it('returns null for an unknown code', () => {
    assert.equal(lookupBarcode(index, '0000000000000'), null);
    assert.equal(resolveScanCode(index, 'nope'), null);
  });

  it('prefers barcode over sku when resolving a scan', () => {
    assert.equal(resolveScanCode(index, '8901234567891').id, 2);
  });
});

describe('name search', () => {
  it('matches a short prefix', () => {
    assert.deepEqual(names(searchCatalog(index, 'pan')), [
      "Panadol 500mg 100's",
      'Panadol Extra Tab 20s',
    ]);
  });

  it('matches a one-character prefix', () => {
    assert.ok(searchCatalog(index, 'a').length >= 2);
  });

  it('requires every token to match', () => {
    assert.deepEqual(names(searchCatalog(index, 'pan extra')), ['Panadol Extra Tab 20s']);
    assert.deepEqual(names(searchCatalog(index, 'pan tab')), ['Panadol Extra Tab 20s']);
  });

  it('matches a strength typed after the brand, name match ranked first', () => {
    // Both Panadols are 500 mg, so both are legitimate hits for "pan 500";
    // the one carrying 500 in its own name must come first.
    const hits = names(searchCatalog(index, 'pan 500'));
    assert.deepEqual(hits, ["Panadol 500mg 100's", 'Panadol Extra Tab 20s']);
  });

  it('is forgiving about case and extra spaces', () => {
    assert.deepEqual(
      names(searchCatalog(index, '   PaNaDoL    ExTrA  ')),
      ['Panadol Extra Tab 20s'],
    );
  });

  it('finds products through the generic name', () => {
    assert.deepEqual(names(searchCatalog(index, 'amoxicillin')), [
      'Amoxil 500mg Cap',
      'Augmentin 625mg Tab',
    ]);
  });

  it('handles missing spaces and punctuation in the query', () => {
    assert.deepEqual(names(searchCatalog(index, 'bfl 24g')), ['BFL-24G Syringe']);
    assert.deepEqual(names(searchCatalog(index, 'bfl24g')), ['BFL-24G Syringe']);
  });

  it('searches non-Latin names', () => {
    assert.deepEqual(names(searchCatalog(index, 'بنادول')), ['برشام بنادول']);
  });

  it('ranks an exact name above a longer prefix match', () => {
    const hits = searchCatalog(index, 'panadol extra tab 20s');
    assert.equal(hits[0].name, 'Panadol Extra Tab 20s');
  });

  it('puts an exact barcode first even when the query also matches names', () => {
    assert.equal(searchCatalog(index, '8901234567890')[0].id, 1);
  });

  it('returns nothing for a term that matches no product', () => {
    assert.deepEqual(searchCatalog(index, 'zzzzqqq'), []);
  });

  it('respects the result limit', () => {
    assert.equal(searchCatalog(index, 'a', { limit: 1 }).length, 1);
  });

  it('never returns duplicates', () => {
    const hits = searchCatalog(index, 'panadol');
    assert.equal(new Set(hits.map((row) => row.id)).size, hits.length);
  });

  it('returns the head of the catalog for an empty query', () => {
    assert.equal(searchCatalog(index, '', { limit: 3 }).length, 3);
  });

  it('ranks Azotek above Neudopa when the cashier types azotek', () => {
    const local = buildCatalogIndex([
      { id: 20, name: 'Neudopa Tab 100s F12', maker: 'Platinum Pharmaceuticals' },
      { id: 21, name: 'Azotek 500mg Tab 6s A23', maker: 'Saffron Pharmaceuticals' },
      { id: 22, name: 'Azotek 250mg Tab 6s A23', maker: 'Saffron Pharmaceuticals' },
    ]);
    assert.deepEqual(names(searchCatalog(local, 'azotek')), [
      'Azotek 250mg Tab 6s A23',
      'Azotek 500mg Tab 6s A23',
    ]);
  });
});

describe('index resilience', () => {
  it('builds from an empty catalog', () => {
    const empty = buildCatalogIndex([]);
    assert.deepEqual(searchCatalog(empty, 'pan'), []);
    assert.equal(lookupBarcode(empty, '1'), null);
  });

  it('tolerates rows with missing fields', () => {
    const sparse = buildCatalogIndex([{ id: 9, name: 'Loose Item' }, { id: 10 }]);
    assert.deepEqual(names(searchCatalog(sparse, 'loose')), ['Loose Item']);
  });

  it('handles very long product names', () => {
    const long = `Sodium ${'Chloride '.repeat(40)}Injection`;
    const built = buildCatalogIndex([{ id: 11, name: long }]);
    assert.equal(searchCatalog(built, 'injection').length, 1);
  });
});
