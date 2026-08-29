import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyClientProductMatches } from './client-product-match.js';

describe('client product match with global OCR knowledge', () => {
  it('does not attach a local CELANPA-N SKU when Finvoroo learned CELANPA-L', () => {
    const rows = applyClientProductMatches(
      [{
        product_description: 'CELANPA-N 5/10MG',
        matched_product_id: null,
        match_status: 'unmatched',
        match_source: 'global_knowledge',
        global_corrected_name: 'CELANPA-L 5/10MG',
      }],
      [{ value: 99, label: 'CELANPA-N 5/10MG' }],
    );

    assert.equal(rows[0].matched_product_id, null);
    assert.equal(rows[0].match_status, 'unmatched');
  });

  it('attaches this company catalog product from the learned name', () => {
    const rows = applyClientProductMatches(
      [{
        product_description: 'CELANPA-N 5/10MG',
        matched_product_id: null,
        match_status: 'unmatched',
        match_source: 'global_knowledge',
        global_corrected_name: 'CELANPA-L 5/10MG',
      }],
      [
        { value: 99, label: 'CELANPA-N 5/10MG' },
        { value: 200, label: 'CELANPA-L 5/10MG' },
      ],
    );

    assert.equal(rows[0].matched_product_id, 200);
    assert.equal(rows[0].match_source, 'global_knowledge');
  });
});
