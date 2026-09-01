import { describe, expect, it } from 'vitest';
import {
  apiItemsToExtractionRows,
  computeReceiveLineAmounts,
  emptyExtractionRow,
  extractionRowToProductPrefill,
  repairOcrReceiveLine,
  receiveCostChangedFromLast,
  resolveOcrLineTaxAmount,
  resolveOcrUnitPrice,
  summarizeReceiveLineTotals,
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

  it('uses exclusive gross when the printed rate is tax-inclusive', () => {
    const row = {
      qty: '2',
      gross_amount: '594.10',
      trade_price: '362.4',
      tax_amount: '130.70',
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

  it('does not subtract discount from the printed rate (Hamza SITAN)', () => {
    const row = {
      qty: '3',
      trade_price: '1275',
      discount_amount: '191.25',
      tax_amount: '0',
      line_total: '3633.75',
    };
    expect(resolveOcrUnitPrice(row, 3)).toBe('1275');
  });

  it('keeps printed rate even when OCR copied discount into tax', () => {
    const row = {
      qty: '3',
      trade_price: '1275',
      discount_amount: '191.25',
      tax_amount: '191.25',
      line_total: '3633.75',
    };
    expect(resolveOcrUnitPrice(row, 3)).toBe('1275');
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

  it('does not copy discount into tax when the bill line has no tax', () => {
    const row = {
      qty: '10',
      trade_price: '84.16',
      discount_amount: '42.08',
      tax_amount: '42.08',
      line_total: '841.60',
    };
    expect(
      resolveOcrLineTaxAmount(row, 799.52, { exclusiveGross: 841.6, discount: 42.08 }),
    ).toBe('');
  });

  it('clears a tax that is only the discount sitting in the tax column', () => {
    const row = {
      discount_amount: '42.08',
      tax_amount: '42.08',
      line_total: '799.52',
    };
    expect(
      resolveOcrLineTaxAmount(row, 799.52, { exclusiveGross: 841.6, discount: 42.08 }),
    ).toBe('');
  });

  it('keeps printed tax when it is not the discount', () => {
    const row = {
      discount_amount: '36.04',
      tax_amount: '146.75',
      line_total: '1000',
    };
    expect(
      resolveOcrLineTaxAmount(row, 853.25, { exclusiveGross: 889.29, discount: 36.04 }),
    ).toBe('146.75');
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
  it('amount is TP × qty plus OCR tax (not the printed line total)', () => {
    const line = {
      _fromOcr: true,
      quantity: '2',
      unit_price: '297.05',
      tax_amount: '130.70',
      invoice_line_total: '724.80',
      discount_type: 'percent',
      discount: '0',
    };
    const a = computeReceiveLineAmounts(line);
    expect(a.totalInc).toBeCloseTo(724.8, 2);
    expect(a.tax).toBe(130.7);
    expect(a.totalExc).toBeCloseTo(594.1, 2);
    expect(a.billLocked).toBe(false);
  });

  it('does not use a garbled OCR amount when qty × TP is clear (APROCENT / BUSRON)', () => {
    const aprocent = computeReceiveLineAmounts({
      _fromOcr: true,
      quantity: '2',
      unit_price: '2703',
      tax_amount: '0',
      invoice_line_total: '5411.70',
      discount_type: 'percent',
      discount: '0',
    });
    expect(aprocent.totalInc).toBe(5406);
    expect(aprocent.tax).toBe(0);

    const busron = computeReceiveLineAmounts({
      _fromOcr: true,
      quantity: '2',
      unit_price: '544',
      tax_amount: '5.44',
      invoice_line_total: '593.50',
      discount_type: 'percent',
      discount: '0',
    });
    expect(busron.totalInc).toBeCloseTo(1093.44, 2);
    expect(busron.tax).toBeCloseTo(5.44, 2);
  });

  it('calculates disc amount from percent on TP × qty', () => {
    const a = computeReceiveLineAmounts({
      _fromOcr: true,
      quantity: '3',
      unit_price: '1275',
      tax_amount: '',
      invoice_line_total: '3442.50',
      discount_type: 'percent',
      discount: '5',
    });
    expect(a.discount).toBeCloseTo(191.25, 2);
    expect(a.totalInc).toBeCloseTo(3633.75, 2);
  });

  it('payable is the sum of Amount, not exclusive plus tax again', () => {
    const lines = [
      {
        _fromOcr: true,
        _needsMatch: true,
        name: 'Neoglip',
        quantity: '2',
        unit_price: '508.3',
        tax_amount: '0',
        invoice_line_total: '1016.60',
        discount_type: 'percent',
        discount: '0',
      },
      {
        _fromOcr: true,
        _needsMatch: true,
        name: 'Merol',
        quantity: '2',
        unit_price: '254.34',
        tax_amount: '111.91',
        invoice_line_total: '620.59',
        discount_type: 'percent',
        discount: '0',
      },
    ];
    const totals = summarizeReceiveLineTotals(lines, { scanLocked: true });
    expect(totals.lineAmountTotal).toBe(1637.19);
    expect(totals.payable).toBe(1637.19);
  });

  it('does not use a header GST % to inflate scanned line amounts', () => {
    const lines = [
      {
        _fromOcr: true,
        _needsMatch: true,
        name: 'Risek',
        quantity: '1',
        unit_price: '100',
        tax_amount: '17',
        invoice_line_total: '117',
        discount_type: 'percent',
        discount: '0',
      },
    ];
    const totals = summarizeReceiveLineTotals(lines, {
      scanLocked: true,
      invGstPercent: 17,
    });
    expect(totals.lineAmountTotal).toBe(117);
    expect(totals.payable).toBeCloseTo(117 + 17, 2);
  });

  it('lets the user add advance tax on top of the counted amounts', () => {
    const lines = [
      {
        _fromOcr: true,
        _needsMatch: true,
        name: 'Risek',
        quantity: '1',
        unit_price: '100',
        tax_amount: '0',
        invoice_line_total: '100',
        discount_type: 'percent',
        discount: '0',
      },
    ];
    const totals = summarizeReceiveLineTotals(lines, {
      scanLocked: true,
      advIncomeTax: 275,
    });
    expect(totals.payable).toBe(375);
  });

  it('does not treat discount as tax when the locked bill total is the gross', () => {
    const line = {
      _fromOcr: true,
      quantity: '10',
      unit_price: '84.16',
      discount: '42.08',
      discount_type: 'fixed',
      tax_amount: '42.08',
      invoice_line_total: '841.60',
    };
    const a = computeReceiveLineAmounts(line);
    expect(a.tax).toBe(0);
    expect(a.discount).toBeCloseTo(42.08, 2);
    expect(a.totalExc).toBeCloseTo(799.52, 2);
    expect(a.totalInc).toBeCloseTo(799.52, 2);
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

  it('manual GRN: amount is packs × purchase price without silent product GST', () => {
    const line = {
      product_id: '1',
      quantity: '3',
      unit_price: '80.31',
      gst_percent: '5',
      tax_rate_id: '9',
      discount_type: 'percent',
      discount: '0',
    };
    const a = computeReceiveLineAmounts(line, 5);
    expect(a.gross).toBeCloseTo(240.93, 2);
    expect(a.tax).toBe(0);
    expect(a.totalInc).toBeCloseTo(240.93, 2);
  });

  it('manual GRN: adds tax only when typed in the Tax column', () => {
    const line = {
      product_id: '1',
      quantity: '3',
      unit_price: '80.31',
      tax_amount: '12.05',
      discount_type: 'percent',
      discount: '0',
    };
    const a = computeReceiveLineAmounts(line);
    expect(a.totalInc).toBeCloseTo(252.98, 2);
  });
});

describe('bonus continuation rows', () => {
  it('moves a zero-price follow-on qty onto FREE of the paid line', () => {
    const rows = apiItemsToExtractionRows([
      {
        product_description: 'Brophyl D Syp D9',
        qty: 10,
        bonus: 0,
        trade_price: 144.5,
        line_total: 1445,
      },
      {
        product_description: 'Brophyl D Syp D9',
        qty: 3,
        bonus: 0,
        trade_price: 0,
        line_total: 0,
      },
      {
        product_description: 'Broxol Syp D9',
        qty: 10,
        bonus: 0,
        trade_price: 119,
        line_total: 1190,
      },
      {
        product_description: 'Broxol Syp D9',
        qty: 2,
        bonus: 0,
        trade_price: 0,
        line_total: 0,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].qty).toBe('10');
    expect(rows[0].bonus).toBe('3');
    expect(rows[1].qty).toBe('10');
    expect(rows[1].bonus).toBe('2');
  });

  it('does not merge two paid lines of the same product', () => {
    const rows = apiItemsToExtractionRows([
      { product_description: 'Risek 20mg', qty: 4, bonus: 0, trade_price: 150, line_total: 600 },
      { product_description: 'Risek 20mg', qty: 2, bonus: 0, trade_price: 150, line_total: 300 },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[1].qty).toBe('2');
  });
});

describe('manufacturing date', () => {
  it('carries mfg_date from the API row onto the review row', () => {
    const [row] = apiItemsToExtractionRows([
      { product_description: 'Risek 20mg Cap', mfg_date: '2025-06-30', expiry_date: '2027-07-31' },
    ]);

    expect(row.mfg_date).toBe('2025-06-30');
    expect(row.expiry_date).toBe('2027-07-31');
  });

  it('leaves mfg_date blank when the invoice prints no MFG column', () => {
    // Absent is not an error: most supplier invoices print no MFG date, and a
    // blank here must not become a fabricated one downstream.
    const [row] = apiItemsToExtractionRows([{ product_description: 'Panadol 500mg' }]);

    expect(row.mfg_date).toBe('');
  });

  it('is part of the empty row so the grid always has the field', () => {
    expect(emptyExtractionRow()).toHaveProperty('mfg_date', '');
  });

  it('appears in the new-product prefill notes when present', () => {
    const prefill = extractionRowToProductPrefill({
      product_description: 'Risek 20mg Cap',
      mfg_date: '2025-06-30',
    });

    expect(prefill.description).toContain('Mfg: 2025-06-30');
  });
});

describe('receiveCostChangedFromLast', () => {
  it('flags when bill TP differs from last catalog cost', () => {
    expect(
      receiveCostChangedFromLast({ unit_price: '195.56', last_cost: '357' }),
    ).toBe(true);
  });

  it('is quiet when cost matches or there is no previous cost', () => {
    expect(
      receiveCostChangedFromLast({ unit_price: '357', last_cost: '357' }),
    ).toBe(false);
    expect(
      receiveCostChangedFromLast({ unit_price: '195.56', last_cost: '' }),
    ).toBe(false);
  });
});
