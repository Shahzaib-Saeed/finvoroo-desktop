import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMedicinePricing, parsePackSize, formatPackStock } from './pharmacy-pricing.js';

describe('pharmacy-pricing', () => {
  it('divides pack sale price by pack size for unit rate', () => {
    const pricing = getMedicinePricing({
      unit_price: 727.01,
      purchase_price: 620.5,
      mrp: 727.01,
      pharmacy: { pack_size: 200, units_per_pack: 200 },
    });

    assert.equal(pricing.packCount, 200);
    assert.equal(pricing.packPrice, 727.01);
    assert.ok(Math.abs(pricing.unitPrice - 3.63505) < 0.00001);
    assert.ok(Math.abs(pricing.unitPurchase - 3.1025) < 0.00001);
    assert.ok(Math.abs(pricing.unitMrp - 3.63505) < 0.00001);
    assert.ok(Math.abs(pricing.unitPrice * 200 - 727.01) < 0.02);
  });

  it('keeps price as-is when pack size is 1', () => {
    const pricing = getMedicinePricing({
      unit_price: 96.53,
      pharmacy: { pack_size: 1 },
    });
    assert.equal(pricing.unitPrice, 96.53);
  });

  it('parses pack size from product fields', () => {
    assert.equal(parsePackSize({ pharmacy: { pack_size: 100 } }), 100);
    assert.equal(parsePackSize({ unit: "200's" }), 200);
  });

  it('parses pack size from product name when catalog pack is missing', () => {
    assert.equal(parsePackSize({ name: "Panadol 200's Tab" }), 200);
    assert.equal(parsePackSize({ name: 'Augmentin 14s' }), 14);
    assert.equal(parsePackSize({ name: 'Sample 10x10 blister' }), 100);
  });

  it('derives per-tab sale from pack price when only the name has pack size', () => {
    const pricing = getMedicinePricing({
      name: "Panadol 200's Tab",
      unit_price: 727.01,
    });
    assert.equal(pricing.packCount, 200);
    assert.ok(Math.abs(pricing.unitPrice - 3.63505) < 0.00001);
  });

  it('formats pack stock from unit stock and pack size', () => {
    assert.equal(formatPackStock(4198, 200), '21');
    assert.equal(formatPackStock(5, 1), '5');
    assert.equal(formatPackStock(150, 100), '1.5');
  });
});
