import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { absorbBillPayable, roundBillPayable } from './pharmacy-bill-payable.js';

describe('pharmacy bill payable', () => {
  it('rounds 25548.42 down to 25548', () => {
    assert.equal(roundBillPayable(25548.42), 25548);
  });

  it('rounds 25548.50 up to 25549', () => {
    assert.equal(roundBillPayable(25548.5), 25549);
  });

  it('absorbs a 0.42 leftover into extra discount so the posted total is whole', () => {
    const out = absorbBillPayable({ discount: 0, other: 0, payable: 25548.42 });
    assert.equal(out.total, 25548);
    assert.equal(out.discount_amount, 0.42);
    assert.equal(out.other_charges, 0);
  });

  it('absorbs a 0.60 leftover into other charges when rounding up', () => {
    const out = absorbBillPayable({ discount: 10, other: 5, payable: 100.6 });
    assert.equal(out.total, 101);
    assert.equal(out.discount_amount, 10);
    assert.equal(out.other_charges, 5.4);
  });
});
