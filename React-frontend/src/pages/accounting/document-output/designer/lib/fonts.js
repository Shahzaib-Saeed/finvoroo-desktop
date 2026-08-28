/**
 * Designer font whitelist — keep in sync with
 * CanvasConfigValidator::FONT_FAMILIES on the API.
 * Print/PDF uses CSS fallback stacks (see HtmlOutputAdapter).
 */
export const FONT_FAMILIES = [
  // Sans
  'DejaVu Sans',
  'Helvetica',
  'Arial',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Geneva',
  'Segoe UI',
  'Calibri',
  'Optima',
  'Gill Sans',
  'Lucida Sans Unicode',
  // Serif
  'DejaVu Serif',
  'Times',
  'Times New Roman',
  'Georgia',
  'Palatino Linotype',
  'Garamond',
  'Book Antiqua',
  'Cambria',
  'Baskerville',
  // Mono
  'DejaVu Sans Mono',
  'Courier',
  'Courier New',
  'Consolas',
  'Monaco',
  'Menlo',
  'Lucida Console',
];

export const FONT_FAMILY_GROUPS = [
  {
    label: 'Sans-serif',
    fonts: [
      'DejaVu Sans',
      'Helvetica',
      'Arial',
      'Verdana',
      'Tahoma',
      'Trebuchet MS',
      'Geneva',
      'Segoe UI',
      'Calibri',
      'Optima',
      'Gill Sans',
      'Lucida Sans Unicode',
    ],
  },
  {
    label: 'Serif',
    fonts: [
      'DejaVu Serif',
      'Times',
      'Times New Roman',
      'Georgia',
      'Palatino Linotype',
      'Garamond',
      'Book Antiqua',
      'Cambria',
      'Baskerville',
    ],
  },
  {
    label: 'Monospace',
    fonts: [
      'DejaVu Sans Mono',
      'Courier',
      'Courier New',
      'Consolas',
      'Monaco',
      'Menlo',
      'Lucida Console',
    ],
  },
];

export const TYPOGRAPHY_ELEMENT_TYPES = ['text', 'field', 'totals_block'];

export function isTypographyElement(el) {
  return el && TYPOGRAPHY_ELEMENT_TYPES.includes(el.type);
}
