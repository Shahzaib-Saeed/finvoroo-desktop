import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIDENCE,
  extractPackCounts,
  extractStrengthFamilies,
  normalizeLabel,
  parseLabel,
  rankCandidates,
  scoreLabelPair,
} from './pharmacy-match-engine.js';
import { applyClientProductMatches } from './client-product-match.js';

/**
 * These mirror tests/Unit/Pharmacy/PharmacyMatchEngineTest.php. The client
 * fallback must reach the same verdicts as the backend, so when a case is
 * added here it belongs in the PHP suite too.
 */

describe('pharmaceutically incompatible lines are rejected', () => {
  const cases = [
    // The reported failure: a capsule antibiotic reaching a syrup.
    ['Amoxil caps 500MG 100s', 'Broxol syp', 'dosage_form_conflict'],
    ['AMOXIL CAPS 500MG 100S', 'Nestle Water 5 Ltr', 'brand_conflict'],
    ['AMARYL TAB 4MG 30S', 'Amaryl 1mg Tab 30s', 'strength_conflict'],
    ['Augmentin 625mg Tab 6s', 'Augmentin 1g Tab 6s', 'strength_conflict'],
    ['Ventolin Inhaler 100mcg', 'Ventolin Syrup 2mg/5ml 120ml', 'dosage_form_conflict'],
    ['Ceftriaxone Tab 500mg', 'Ceftriaxone Inj 500mg', 'dosage_form_conflict'],
    ['Flagyl Tab 400mg 20s', 'Flagyl Gel 30gm', 'dosage_form_conflict'],
    ['GRAMEX', 'Gamma Extreme Pain Relief Gel 50g', 'brand_conflict'],
    ['Losec 20mg Cap 14s', 'Loprin 20mg Cap 14s', 'brand_conflict'],
    ['AZOTEK 250MG TAB 6S', 'Neudopa Tab 100s F12', 'brand_conflict'],
  ];

  for (const [invoice, catalog, reason] of cases) {
    it(`rejects ${invoice} against ${catalog}`, () => {
      const result = scoreLabelPair(invoice, catalog);
      assert.equal(result.rejected, true);
      assert.equal(result.rejectionReason, reason);
      assert.equal(result.score, 0);
    });
  }
});

describe('equivalent supplier wordings match with high confidence', () => {
  const cases = [
    ['Amoxil caps 500MG 100s', 'Amoxil cap 500mg 100s B6'],
    ['AZOTEK 250MG TAB 6S', 'Azotek 250mg Tab 6s A23'],
    ['AMARYL TAB 4MG 30S', 'Amaryl 4mg Tab 30s'],
    ['RISEK 20MG CAP 14S', 'Risek 20mg Capsule 14s'],
    ['TAB. PANADOL 500MG 100S', 'Panadol Tablet 500mg 100s'],
    ['SYP CALPOL 120ML', 'Calpol Syrup 120ml'],
    ['INJ. ROCEPHIN 1GM', 'Rocephin Injection 1g'],
    ['BRUFEN 400MG 10X10S', 'Brufen 400mg Tab 100s'],
    ['PANADOL 500MG 100 S', 'Panadol 500mg Tab 100s'],
    ['CELANPA-N 5/10MG TAB 14S', 'Celanpa N 5/10mg Tab 14s'],
    ['Ciproxin 500 mg Tab 10s', 'Ciproxin 500mg Tab 10s'],
    ['AMOXIL (GSK) 500MG CAP 100S', 'Amoxil 500mg Cap 100s'],
    ['AM0XIL CAPS 500MG 100S', 'Amoxil 500mg Cap 100s'],
    ['AMOXlL CAPS 500MG 100S', 'Amoxil 500mg Cap 100s'],
    ['ANOXIL CAPS 500MG 100S', 'Amoxil 500mg Cap 100s'],
  ];

  for (const [invoice, catalog] of cases) {
    it(`links ${invoice} to ${catalog}`, () => {
      const result = scoreLabelPair(invoice, catalog);
      assert.equal(result.rejected, false);
      assert.equal(
        result.confidence,
        CONFIDENCE.HIGH,
        `scored ${result.score} (${result.blockers.join(',')})`,
      );
    });
  }
});

describe('uncertain links are never applied automatically', () => {
  const cases = [
    ['Panadol 500mg Tab 100s', 'Panadol 500mg Tab 20s'],
    ['ARINAC FORTE TAB 20S', 'Arinac Tab 20s'],
    ['Omeprazole Tab 20mg 14s', 'Omeprazole Cap 20mg 14s'],
    ['CALPOL SYP 120ML', 'Calpol Suspension 120ml'],
    ['Betnovate N Cream 20gm', 'Betnovate C Cream 20gm'],
    // A brand on its own does not say which strength was delivered.
    ['GRAMEX', 'Gramex 500mg Tab'],
  ];

  for (const [invoice, catalog] of cases) {
    it(`will not auto-link ${invoice} to ${catalog}`, () => {
      assert.notEqual(scoreLabelPair(invoice, catalog).confidence, CONFIDENCE.HIGH);
    });
  }
});

describe('label parsing', () => {
  it('reads the parts a pharmacist compares', () => {
    const parsed = parseLabel("AMOXIL CAPS 500MG 10X10'S");
    assert.deepEqual(parsed.brandTokens, ['amoxil']);
    assert.deepEqual(parsed.forms, ['capsule']);
    assert.deepEqual(parsed.strengths, { mass: [500] });
    assert.ok(parsed.packs.includes(100));
    assert.ok(parsed.packs.includes(10));
  });

  it('folds units to one base per family', () => {
    assert.deepEqual(
      extractStrengthFamilies(normalizeLabel('Rocephin 1g Inj')),
      extractStrengthFamilies(normalizeLabel('Rocephin 1000mg Inj')),
    );
  });

  it('keeps brand qualifiers that change the medicine', () => {
    assert.deepEqual(parseLabel('Betnovate N Cream 20gm').brandTokens, ['betnovate', 'n']);
    assert.deepEqual(parseLabel('Betnovate C Cream 20gm').brandTokens, ['betnovate', 'c']);
  });

  it('reads a box notation as both the box and the strip', () => {
    assert.deepEqual(extractPackCounts(normalizeLabel('Brufen 400mg 10x10s')), [10, 100]);
  });

  it('uses structured catalog columns when the name is bare', () => {
    const result = scoreLabelPair('AMOXIL CAP 500MG 100S', 'Amoxil Cap', {
      strength: '500mg',
      packSize: 100,
    });
    assert.equal(result.strengthScore, 1);
    assert.equal(result.packScore, 1);
    assert.equal(result.confidence, CONFIDENCE.HIGH);
  });
});

describe('candidate ranking', () => {
  const catalog = (names) => names.map((name) => ({
    item: { value: names.indexOf(name) + 1, label: name },
    parsed: parseLabel(name),
  }));

  it('picks the right product from a shelf of near neighbours', () => {
    const verdict = rankCandidates(
      parseLabel('Amoxil caps 500MG 100s'),
      catalog([
        'Broxol Syp 120ml',
        'Amoxil 250mg Cap 100s',
        'Amoxil cap 500mg 100s B6',
        'Amoxil 125mg 90ml Syp L6',
      ]),
    );

    assert.equal(verdict.best.label, 'Amoxil cap 500mg 100s B6');
    assert.equal(verdict.confidence, CONFIDENCE.HIGH);
    assert.equal(verdict.diagnostics.candidates_compatible, 1);
  });

  it('links a brand that resolves to one product', () => {
    const verdict = rankCandidates(
      parseLabel('GRAMEX'),
      catalog(['Gramex 500mg Tab', 'Gamma Extreme Pain Relief Gel 50g']),
    );

    assert.equal(verdict.best.label, 'Gramex 500mg Tab');
    assert.equal(verdict.confidence, CONFIDENCE.HIGH);
    assert.equal(verdict.diagnostics.decided_by, 'unique_brand_in_catalog');
  });

  it('does not guess between two equally plausible products', () => {
    const verdict = rankCandidates(
      parseLabel('Amoxil Cap'),
      catalog(['Amoxil 250mg Cap 100s', 'Amoxil 500mg Cap 100s']),
    );

    assert.equal(verdict.confidence, CONFIDENCE.MEDIUM);
    assert.equal(verdict.diagnostics.ambiguous, true);
  });

  it('attaches nothing when every candidate conflicts', () => {
    const verdict = rankCandidates(
      parseLabel('Amoxil caps 500MG 100s'),
      catalog(['Broxol Syp 120ml', 'Nestle Water 5 Ltr']),
    );

    assert.equal(verdict.best, null);
    assert.equal(verdict.diagnostics.decided_by, 'no_compatible_candidate');
  });
});

describe('client fallback matching', () => {
  const options = [
    { value: 1, label: 'Broxol Syp 120ml' },
    { value: 2, label: 'Amoxil cap 500mg 100s B6' },
    { value: 3, label: 'Amoxil 250mg Cap 100s' },
  ];

  it('never links an invoice capsule line to a syrup', () => {
    const [row] = applyClientProductMatches(
      [{ product_description: 'Amoxil caps 500MG 100s', matched_product_id: null, match_status: 'unmatched' }],
      [{ value: 1, label: 'Broxol Syp 120ml' }],
    );

    assert.equal(row.matched_product_id, null);
    assert.equal(row.match_status, 'unmatched');
  });

  it('links the correct product when it is on the shelf', () => {
    const [row] = applyClientProductMatches(
      [{ product_description: 'Amoxil caps 500MG 100s', matched_product_id: null, match_status: 'unmatched' }],
      options,
    );

    assert.equal(row.matched_product_id, 2);
    assert.equal(row.match_status, 'matched');
  });

  it('asks for confirmation instead of guessing a strength', () => {
    const [row] = applyClientProductMatches(
      [{ product_description: 'Amoxil Cap', matched_product_id: null, match_status: 'unmatched' }],
      options,
    );

    assert.equal(row.match_status, 'suggested');
    assert.ok(row.match_confidence < 0.92);
    assert.ok(row.match_suggestions.length >= 1);
  });

  it('still finds the product when OCR misread the brand', () => {
    const [row] = applyClientProductMatches(
      [{ product_description: 'AN0XIL CAPS 500MG 100S', matched_product_id: null, match_status: 'unmatched' }],
      options,
    );

    assert.equal(row.matched_product_id, 2);
    assert.equal(row.match_status, 'matched');
  });

  it('records why the match was made', () => {
    const [row] = applyClientProductMatches(
      [{ product_description: 'Amoxil caps 500MG 100s', matched_product_id: null, match_status: 'unmatched' }],
      options,
    );

    assert.equal(row.match_diagnostics.strength_score, 1);
    assert.equal(row.match_diagnostics.form_score, 1);
    assert.equal(row.match_diagnostics.rejected_by.strength_conflict, 1);
  });

  it('replaces a wrong green Azotek→Neudopa link with the real Azotek', () => {
    const [row] = applyClientProductMatches(
      [{
        product_description: 'AZOTEK 250MG TAB 6S',
        matched_product_id: 9,
        matched_product_name: 'Neudopa Tab 100s F12',
        match_status: 'matched',
        match_confidence: 1,
      }],
      [
        { value: 9, label: 'Neudopa Tab 100s F12' },
        { value: 10, label: 'Azotek 500mg Tab 6s A23' },
        { value: 11, label: 'Azotek 250mg Tab 6s A23' },
      ],
    );

    assert.equal(row.matched_product_id, 11);
    assert.equal(row.matched_product_name, 'Azotek 250mg Tab 6s A23');
    assert.equal(row.match_status, 'matched');
  });
});
