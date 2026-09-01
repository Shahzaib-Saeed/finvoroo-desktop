import { describe, expect, it } from 'vitest';
import {
  prepareDesignerHtmlForPrintAgent,
  thermalPrintGeometry,
} from './thermal-receipt-html';

describe('thermalPrintGeometry', () => {
  it('matches print agent printable width', () => {
    expect(thermalPrintGeometry('thermal_80')).toEqual({ rollMm: 80, layoutMm: 72 });
    expect(thermalPrintGeometry('thermal_58')).toEqual({ rollMm: 58, layoutMm: 48 });
  });
});

describe('prepareDesignerHtmlForPrintAgent', () => {
  it('wraps canvas designer HTML for 80mm roll fit', () => {
    const input = `<!DOCTYPE html><html><head><style>.canvas-page{width:80mm;}</style></head><body><div class="canvas-page"><span>Receipt</span></div></body></html>`;
    const out = prepareDesignerHtmlForPrintAgent(input, 'thermal_80');
    expect(out).toContain('finvoroo-canvas-fit');
    expect(out).toContain('transform:scale(0.9)');
    expect(out).not.toContain('id="pos-receipt-print"');
  });

  it('wraps block thermal HTML with pos-receipt-print root', () => {
    const input = `<!DOCTYPE html><html><head><style>.receipt{}</style></head><body><div class="receipt">Hi</div></body></html>`;
    const out = prepareDesignerHtmlForPrintAgent(input, 'thermal_80');
    expect(out).toContain('id="pos-receipt-print"');
    expect(out).not.toContain('finvoroo-canvas-fit');
  });
});
