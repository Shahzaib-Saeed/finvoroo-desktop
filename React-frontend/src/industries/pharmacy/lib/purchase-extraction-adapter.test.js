import { describe, expect, it } from 'vitest';
import {
  computeReceiveLineAmounts,
  repairOcrReceiveLine,
  resolveOcrLineTaxAmount,
  resolveOcrUnitPrice,
} from './purchase-extraction-adapter';

describe('resolveOcrUnitPrice', () => {
  it('detects tax-inclusive trade price and returns exclusive unit (Enziclor)', () => {
    const row = {
      qty: '2',
      trade_price: '362.4',
      tax_amount: '130.70',
      line_total: '724.80',
    };
    expect(resolveOcrUnitPrice(row, 2)).toBe('297.05');
  });

  it('uses gross_amount when present', () => {
    const row = {
      qty: '2',
      gross_amount: '594.10',
      trade_price: '362.4',
      line_total: '724.80',
    };
    expect(resolveOcrUnitPrice(row, 2)).toBe('297.05');
  });

  it('keeps exclusive trade price when trade×qty + tax = line_total', () => {
    const row = {
      qty: '2',
      trade_price: '297.05',
      tax_amount: '130.70',
      line_total: '724.80',
    };
    expect(resolveOcrUnitPrice(row, 2)).toBe('297.05');
  });
});

describe('resolveOcrLineTaxAmount', () => {
  it('fills missing further tax from line_total − exclusive net', () => {
    const row = {
      tax_amount: '106.94',
      line_total: '724.80',
    };
    expect(resolveOcrLineTaxAmount(row, 594.1)).toBe('130.7');
  });
});

describe('repairOcrReceiveLine', () => {
  it('repairs already-imported inclusive lines', () => {
    const broken = {
      _fromOcr: true,
      supplier_invoice_label: 'ENZICLOR M/W 240ml',
      quantity: '2',
      unit_price: '362.4',
      tax_amount: '130.70',
      invoice_line_total: '724.80',
      discount_type: 'percent',
      discount: '0',
    };
    const fixed = repairOcrReceiveLine(broken);
    expect(fixed.unit_price).toBe('297.05');
    expect(Number(fixed.tax_amount)).toBe(130.7);
  });
});

describe('computeReceiveLineAmounts', () => {
  it('never double-counts tax when bill line total is locked', () => {
    const line = {
      _fromOcr: true,
      quantity: '2',
      unit_price: '362.4',
      tax_amount: '130.70',
      invoice_line_total: '724.80',
      discount_type: 'percent',
      discount: '0',
    };
    const a = computeReceiveLineAmounts(line);
    expect(a.totalInc).toBe(724.8);
    expect(a.tax).toBe(130.7);
    expect(a.totalExc).toBeCloseTo(594.1, 2);
    expect(a.billLocked).toBe(true);
  });

  it('net margin uses tax-inclusive landed cost per unit', () => {
    const line = {
      _fromOcr: true,
      quantity: '2',
      unit_price: '297.05',
      sale_price: '402.94',
      tax_amount: '130.70',
      invoice_line_total: '724.80',
      discount_type: 'percent',
      discount: '0',
    };
    const a = computeReceiveLineAmounts(line);
    expect(a.netRate).toBeCloseTo(362.4, 2);
    expect(a.netMargin).toBeCloseTo(10, 0);
  });
});
