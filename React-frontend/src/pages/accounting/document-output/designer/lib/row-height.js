/**
 * Deterministic, character-width-estimation-based row-height math for
 * `items_table` — a near-1:1 port of the PHP
 * `App\Domain\DocumentOutput\Renderer\RowHeightCalculator` class. Both
 * halves MUST stay identical (same constants, same clamp order) so the
 * designer canvas, the Preview Invoice action, and the final PDF/print
 * output all agree on wrapped line count / row height for the same
 * content — this is the mechanism that keeps "Designer = Preview = PDF"
 * true. If you change the formula here, change it in
 * RowHeightCalculator.php too, in the same commit.
 */

const CHAR_WIDTH_FACTOR = 0.52;
const PT_TO_MM = 0.3527778;
const CELL_PADDING_MM = 4.0; // 2mm each side

/**
 * @param {string} text
 * @param {number} columnWidthMm
 * @param {number} fontSizePt
 * @returns {number}
 */
export function wrappedLineCount(text, columnWidthMm, fontSizePt) {
  const trimmed = (text ?? '').trim();
  if (trimmed === '') return 1;

  const availableWidthMm = Math.max(1.0, columnWidthMm - CELL_PADDING_MM);
  const avgCharWidthMm = fontSizePt * PT_TO_MM * CHAR_WIDTH_FACTOR;
  const charsPerLine = Math.max(1, Math.floor(availableWidthMm / avgCharWidthMm));

  let totalLines = 0;
  for (const segment of trimmed.split('\n')) {
    const len = segment.length;
    totalLines += Math.max(1, Math.ceil(len / charsPerLine));
  }

  return Math.max(1, totalLines);
}

/**
 * @param {{text: string, width_mm: number, wrap: boolean}[]} wrappingCells
 * @param {{mode: string, fixed_mm?: number, min_mm?: number, max_mm?: number, line_height_mm?: number}} rowHeightConfig
 * @param {number} [fontSizePt]
 * @returns {number}
 */
export function rowHeightMm(wrappingCells, rowHeightConfig, fontSizePt = 9.0) {
  if ((rowHeightConfig?.mode ?? 'fixed') === 'fixed') {
    return Number(rowHeightConfig?.fixed_mm ?? 8.0);
  }

  const minMm = Number(rowHeightConfig?.min_mm ?? 6.0);
  const maxMm = Number(rowHeightConfig?.max_mm ?? 20.0);
  const lineHeightMm = Number(rowHeightConfig?.line_height_mm ?? 4.2);

  let maxLines = 1;
  for (const cell of wrappingCells ?? []) {
    if (!cell?.wrap) continue;
    const lines = wrappedLineCount(String(cell.text ?? ''), Number(cell.width_mm ?? 0), fontSizePt);
    maxLines = Math.max(maxLines, lines);
  }

  const height = Math.ceil(maxLines * lineHeightMm * 100) / 100;

  return Math.max(minMm, Math.min(maxMm, height));
}
