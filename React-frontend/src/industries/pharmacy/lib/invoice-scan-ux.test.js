import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCAN_UX,
  applyOcrHighlights,
  interpretInvoiceScanResult,
  isTechnicalScanMessage,
  pharmacistScanMessage,
  pickWorstScanUx,
} from './invoice-scan-ux.js';

function item(name, extra = {}) {
  return { product_description: name, qty: 2, trade_price: 100, line_total: 200, ...extra };
}

function eighteenItems() {
  return Array.from({ length: 18 }, (_, i) => item(`Medicine ${i + 1}`));
}

describe('invoice scan UX', () => {
  it('1. clean extraction displays every returned row', () => {
    const items = eighteenItems();
    const result = interpretInvoiceScanResult({
      data: {
        items,
        document: { invoice: { invoice_number: 'SI-1' } },
        meta: {
          fallback_used: false,
          validation: { severity: 'clean', issues: [] },
        },
      },
    });

    assert.equal(result.ux, SCAN_UX.CLEAN);
    assert.equal(result.items.length, 18);
    assert.equal(result.hasUsableRows, true);
    assert.equal(
      result.pharmacistMessage,
      'Invoice scanned successfully — 18 items found.',
    );
    assert.equal(result.needsFallback, false);
  });

  it('2. advisory validation still displays rows and a review warning', () => {
    const items = eighteenItems();
    const result = interpretInvoiceScanResult({
      data: {
        items,
        document: { supplier: { name: 'ABC Pharma' } },
        meta: {
          fallback_used: false,
          validation: {
            severity: 'advisory',
            issues: [
              {
                code: 'rows.count_mismatch',
                severity: 'advisory',
                field: 'qty',
                row: 2,
                detail: 'Mistral read 18 lines from this page, but the OCR reported low confidence on 1 text region.',
              },
            ],
          },
        },
      },
    });

    assert.equal(result.ux, SCAN_UX.ADVISORY);
    assert.equal(result.items.length, 18);
    assert.equal(result.pharmacistMessage, 'Some information may need review.');
    assert.equal(isTechnicalScanMessage(result.pharmacistMessage), false);
    const highlighted = applyOcrHighlights(result.items, result.issues);
    assert.equal(highlighted[2]._ocrHighlight, true);
  });

  it('3. blocking Mistral then Gemini correction shows the corrected rows', () => {
    const result = interpretInvoiceScanResult({
      data: {
        items: [item('Risek 20mg Cap', { batch_no: 'B-9912' }), item('Panadol 500mg Tab')],
        document: { invoice: { invoice_number: 'SI-4471' } },
        meta: {
          provider: 'gemini',
          fallback_used: true,
          fallback_reason: 'validation_failed',
          fallback_provider: 'gemini',
          validation: { severity: 'clean', issues: [] },
        },
      },
    });

    assert.equal(result.ux, SCAN_UX.CORRECTED);
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].batch_no, 'B-9912');
    assert.equal(result.fallbackUsed, true);
    assert.match(result.pharmacistMessage, /automatically reviewed/i);
    assert.equal(isTechnicalScanMessage(result.pharmacistMessage), false);
  });

  it('4. Gemini also failing still displays the best available rows plus a review warning', () => {
    const items = eighteenItems();
    const result = interpretInvoiceScanResult({
      data: {
        items,
        document: { invoice: { invoice_number: 'SI-9' } },
        meta: {
          fallback_used: true,
          fallback_reason: 'validation_failed',
          validation: {
            severity: 'blocking',
            issues: [
              { code: 'line.total_mismatch', severity: 'blocking', field: 'line_total', row: 0, detail: 'OCR confidence 0.41' },
            ],
          },
        },
      },
    });

    assert.equal(result.hasUsableRows, true);
    assert.equal(result.items.length, 18);
    assert.equal(result.ux, SCAN_UX.REVIEW);
    assert.equal(
      result.pharmacistMessage,
      'Some information could not be read confidently. Please review the highlighted rows before posting.',
    );
    assert.equal(isTechnicalScanMessage(result.pharmacistMessage), false);

    const blockingWithoutFallback = interpretInvoiceScanResult({
      error: {
        response: {
          status: 409,
          data: {
            success: false,
            message:
              'Mistral read 18 lines from this page, but the scan failed our checks. The OCR reported low confidence on 1 text region.',
            errors: {
              code: 'ocr_fallback_consent',
              needs_fallback: true,
              fallback_provider: 'gemini',
              reason_code: 'validation_failed',
              items,
              document: { invoice: { invoice_number: 'SI-9' } },
              validation: {
                severity: 'blocking',
                issues: [
                  { code: 'ocr.low_confidence', severity: 'blocking', field: 'qty', row: 4, detail: 'low confidence' },
                ],
              },
            },
          },
        },
      },
    });

    assert.equal(blockingWithoutFallback.ux, SCAN_UX.REVIEW);
    assert.equal(blockingWithoutFallback.items.length, 18);
    assert.equal(blockingWithoutFallback.needsFallback, true);
    assert.equal(
      blockingWithoutFallback.pharmacistMessage,
      'Some information could not be read confidently. Please review the highlighted rows before posting.',
    );
    assert.equal(isTechnicalScanMessage(blockingWithoutFallback.pharmacistMessage), false);
    assert.equal(isTechnicalScanMessage('Mistral read 18 lines from this page, but the scan failed our checks.'), true);
  });

  it('5. zero usable rows keeps the empty error state', () => {
    const result = interpretInvoiceScanResult({
      error: {
        response: {
          status: 409,
          data: {
            success: false,
            message: 'Mistral returned no usable line items from this page.',
            errors: {
              code: 'ocr_fallback_consent',
              needs_fallback: true,
              fallback_provider: 'gemini',
              reason_code: 'primary_unreadable',
              items: [],
              primary_lines: [],
              primary_item_count: 0,
            },
          },
        },
      },
    });

    assert.equal(result.ux, SCAN_UX.EMPTY);
    assert.equal(result.items.length, 0);
    assert.equal(result.hasUsableRows, false);
    assert.match(result.pharmacistMessage, /could not be read/i);
    assert.equal(isTechnicalScanMessage(result.pharmacistMessage), false);
  });

  it('does not treat blocking validation as no extraction when items are present', () => {
    const result = interpretInvoiceScanResult({
      data: {
        items: eighteenItems(),
        document: { supplier: { name: 'ABC Pharma' } },
        meta: {
          fallback_used: false,
          fallback_reason: null,
          validation: { severity: 'blocking', issues: [{ severity: 'blocking', row: 1, field: 'qty' }] },
        },
      },
    });

    assert.equal(result.items.length, 18);
    assert.equal(result.ux, SCAN_UX.REVIEW);
    assert.equal(result.meta.validation.severity, 'blocking');
  });

  it('picks the strongest pharmacist state across pages', () => {
    assert.equal(pickWorstScanUx([SCAN_UX.CLEAN, SCAN_UX.ADVISORY]), SCAN_UX.ADVISORY);
    assert.equal(pickWorstScanUx([SCAN_UX.CLEAN, SCAN_UX.CORRECTED, SCAN_UX.REVIEW]), SCAN_UX.REVIEW);
  });

  it('uses the exact pharmacist copy for each state', () => {
    assert.equal(pharmacistScanMessage(SCAN_UX.CLEAN, 1), 'Invoice scanned successfully — 1 item found.');
    assert.equal(pharmacistScanMessage(SCAN_UX.ADVISORY), 'Some information may need review.');
    assert.match(pharmacistScanMessage(SCAN_UX.CORRECTED), /automatically reviewed/);
    assert.match(pharmacistScanMessage(SCAN_UX.REVIEW), /could not be read confidently/);
  });
});
