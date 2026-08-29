import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rowNeedsVerify, scoreInvoiceCatalogMatch } from './invoice-match-quality.js';

describe('invoice catalog match quality', () => {
  it('scores GRAMEX against Gramex 500mg Tab high enough to link', () => {
    const score = scoreInvoiceCatalogMatch('GRAMEX', 'Gramex 500mg Tab');
    assert.ok(score >= 0.84, `expected unique-brand score, got ${score}`);
  });

  it('does not ask to verify a user-learned OCR mapping', () => {
    assert.equal(
      rowNeedsVerify({
        matched_product_id: 1234,
        product_description: 'CELANPA-N 5/10MG',
        matched_product_name: 'Celanpa-N 5/10mg Tab',
        match_status: 'matched',
        match_confidence: 1,
        match_source: 'learned_verified',
        match_user_confirmed: true,
      }),
      false,
    );
  });

  it('does not ask to verify a trusted global OCR knowledge match', () => {
    assert.equal(
      rowNeedsVerify({
        matched_product_id: 200,
        product_description: 'CELANPA-N 5/10MG',
        matched_product_name: 'CELANPA-L 5/10MG',
        match_status: 'matched',
        match_confidence: 0.94,
        match_source: 'global_knowledge',
      }),
      false,
    );
  });

  it('asks to verify a low-confidence global suggestion', () => {
    assert.equal(
      rowNeedsVerify({
        matched_product_id: 200,
        product_description: 'CELANPA-N 5/10MG',
        matched_product_name: 'CELANPA-L 5/10MG',
        match_status: 'suggested',
        match_confidence: 0.86,
        match_source: 'global_knowledge',
      }),
      true,
    );
  });

  it('asks to verify a low-confidence suggestion', () => {
    assert.equal(
      rowNeedsVerify({
        matched_product_id: 99,
        product_description: 'CELANPA-N 5/10MG',
        matched_product_name: 'Other Brand Tab',
        match_status: 'suggested',
        match_confidence: 0.8,
      }),
      true,
    );
  });
});
