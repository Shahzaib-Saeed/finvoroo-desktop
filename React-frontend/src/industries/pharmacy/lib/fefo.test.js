import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { allocateFefo, pickFefoBatch, sortBatchesFefo } from './fefo.js';

// All expiry dates fixed far in the future (relative to "now") so these
// fixtures never age into "expired" and start failing years from now.
const BATCHES = [
  { batch_id: 3, expiry_date: '2099-01-01', received_at: '2026-06-01', quantity_on_hand: 10 },
  { batch_id: 1, expiry_date: '2098-03-01', received_at: '2026-01-01', quantity_on_hand: 5 },
  { batch_id: 2, expiry_date: '2098-03-01', received_at: '2025-12-01', quantity_on_hand: 8 },
  { batch_id: 4, expiry_date: null, received_at: '2025-01-01', quantity_on_hand: 100 },
];

describe('sortBatchesFefo', () => {
  it('orders by expiry ascending, then received_at, then id, nulls last', () => {
    const sorted = sortBatchesFefo(BATCHES).map((b) => b.batch_id);
    // batch 2 and 1 share expiry_date 2098-03-01 -> earlier received_at (2) first.
    // batch 3 expires later. batch 4 has no expiry -> sorts last regardless of qty.
    assert.deepEqual(sorted, [2, 1, 3, 4]);
  });

  it('does not mutate the input array', () => {
    const copy = BATCHES.slice();
    sortBatchesFefo(BATCHES);
    assert.deepEqual(BATCHES, copy);
  });
});

describe('allocateFefo', () => {
  it('consumes oldest-expiring batches first until quantity is satisfied', () => {
    const allocations = allocateFefo(BATCHES, 12);
    assert.deepEqual(allocations, [
      { batch_id: 2, expiry_date: '2098-03-01', quantity: 8 },
      { batch_id: 1, expiry_date: '2098-03-01', quantity: 4 },
    ]);
  });

  it('spills into later batches once earlier ones are exhausted', () => {
    const allocations = allocateFefo(BATCHES, 20);
    const total = allocations.reduce((sum, a) => sum + a.quantity, 0);
    assert.equal(total, 20);
    assert.deepEqual(
      allocations.map((a) => a.batch_id),
      [2, 1, 3],
    );
  });

  it('skips expired batches by default', () => {
    const withExpired = [
      { batch_id: 9, expiry_date: '2000-01-01', quantity_on_hand: 50 },
      { batch_id: 10, expiry_date: '2099-01-01', quantity_on_hand: 50 },
    ];
    const allocations = allocateFefo(withExpired, 10);
    assert.deepEqual(
      allocations.map((a) => a.batch_id),
      [10],
    );
  });

  it('allows expired batches only when explicitly requested', () => {
    const withExpired = [{ batch_id: 9, expiry_date: '2000-01-01', quantity_on_hand: 50 }];
    assert.deepEqual(allocateFefo(withExpired, 5), []);
    const allocations = allocateFefo(withExpired, 5, { allowExpired: true });
    assert.deepEqual(allocations, [{ batch_id: 9, expiry_date: '2000-01-01', quantity: 5 }]);
  });

  it('returns nothing for zero or negative quantity', () => {
    assert.deepEqual(allocateFefo(BATCHES, 0), []);
    assert.deepEqual(allocateFefo(BATCHES, -5), []);
  });
});

describe('pickFefoBatch', () => {
  it('returns the batch object the first allocation would use', () => {
    const picked = pickFefoBatch(BATCHES, 1);
    assert.equal(picked.batch_id, 2);
  });

  it('returns null when nothing is available', () => {
    assert.equal(pickFefoBatch([], 1), null);
  });
});
