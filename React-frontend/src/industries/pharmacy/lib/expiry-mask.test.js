import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expiryDisplayMask, normalizeExpiry } from './expiry-mask.js';

describe('expiry mask', () => {
  const cases = [
    ['05 2029', '2029-05-31', '05/29'],
    ['05/2029', '2029-05-31', '05/29'],
    ['05/29', '2029-05-31', '05/29'],
    ['May 2029', '2029-05-31', '05/29'],
    ['31/05/2029', '2029-05-31', '05/29'],
    ['2029-05', '2029-05-31', '05/29'],
    ['EXP: 05/2029', '2029-05-31', '05/29'],
    ['10 2027', '2027-10-31', '10/27'],
  ];

  for (const [printed, iso, mask] of cases) {
    it(`reads ${printed}`, () => {
      assert.equal(normalizeExpiry(printed), iso);
      assert.equal(expiryDisplayMask(printed), mask);
    });
  }
});
