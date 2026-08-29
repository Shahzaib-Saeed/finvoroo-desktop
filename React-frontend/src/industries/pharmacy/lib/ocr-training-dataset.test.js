import { describe, expect, it } from 'vitest';
import {
  stampOcrLineOrigins,
  stampOcrLinesFromPages,
} from './ocr-training-dataset';

describe('ocr training line origins', () => {
  it('stamps extraction id and line index on a scanned page', () => {
    const rows = stampOcrLineOrigins(
      [{ product_description: 'BROPHYL D SYP' }, { product_description: 'BROXOL SYP' }],
      88,
    );
    expect(rows[0]._ocrExtractionId).toBe(88);
    expect(rows[0]._ocrLineIndex).toBe(0);
    expect(rows[1]._ocrLineIndex).toBe(1);
  });

  it('splits merged history items back onto page extraction ids', () => {
    const rows = stampOcrLinesFromPages(
      [
        { product_description: 'A' },
        { product_description: 'B' },
        { product_description: 'C' },
      ],
      [
        { id: 10, item_count: 2 },
        { id: 11, item_count: 1 },
      ],
      10,
    );
    expect(rows[0]._ocrExtractionId).toBe(10);
    expect(rows[1]._ocrExtractionId).toBe(10);
    expect(rows[2]._ocrExtractionId).toBe(11);
    expect(rows[2]._ocrLineIndex).toBe(0);
  });
});
