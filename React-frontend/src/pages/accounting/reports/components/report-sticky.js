/**
 * Single page-scroll sticky chrome for reports.
 * Do NOT use nested overflow/max-height scrollports on tables — that creates
 * two scrollbars and fights sticky positioning.
 *
 * Stack (window scroll only):
 *   1. workspace header + section nav (~7.25rem) — nav menus use z-30
 *   2. filters (must stay BELOW section-nav z-30 so Ledger/etc. menus aren’t covered)
 *   3. column headers (ledger title scrolls away)
 *   — or letterhead then column headers on aging/statements
 */
export const REPORT_STICKY_BELOW_CHROME = 'top-[7.25rem]';
export const REPORT_STICKY_BELOW_FILTERS = 'top-[10.5rem]';
/** General ledger: compact filters only (no summary strip / on-screen letterhead). */
export const REPORT_STICKY_BELOW_LEDGER_FILTERS = 'top-[10.25rem]';
export const REPORT_STICKY_BELOW_LETTERHEAD = 'top-[16rem]';

/** Filter / toolbar strip under workspace chrome. */
export const reportStickyFiltersClass = [
  'report-sticky-filters sticky z-20',
  REPORT_STICKY_BELOW_CHROME,
  'bg-background shadow-[0_1px_0_0_rgb(226_232_240_/_0.9)]',
  'print:static print:bg-transparent print:shadow-none',
].join(' ');

/** Optional letterhead under filters (aging / financial statements). */
export const reportStickySheetHeaderClass = [
  'report-sticky-sheet-header sticky z-[15]',
  REPORT_STICKY_BELOW_FILTERS,
  'bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90',
  'print:static print:bg-white print:backdrop-blur-none',
].join(' ');

/**
 * Column headers for ledgers (no sticky letterhead above the table).
 * Sticks just below the filter bar on the page scroll.
 */
export const reportStickyTheadClass = [
  'report-sticky-thead sticky z-10',
  REPORT_STICKY_BELOW_FILTERS,
  'print:static print:shadow-none',
].join(' ');

/** Column headers under a sticky aging/statement letterhead. */
export const reportStickyTheadBelowLetterheadClass = [
  'report-sticky-thead sticky z-[5]',
  REPORT_STICKY_BELOW_LETTERHEAD,
  'print:static print:shadow-none',
].join(' ');

/** @deprecated use reportStickyTheadClass */
export const reportTableStickyHeadClass = reportStickyTheadClass;

/** @deprecated nested table scroll removed */
export const reportTableScrollClass = '';
