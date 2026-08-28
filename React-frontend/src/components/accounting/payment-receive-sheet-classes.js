/** Shared wide right sheet for receive payment / record bill payment flows. */
export const PAYMENT_RECEIVE_SHEET_CLASS = [
  'gap-0 p-0 flex flex-col',
  'w-full sm:max-w-none',
  'lg:w-[min(1400px,calc(100vw-2.5rem))]',
  'inset-y-2.5 end-2.5 start-auto h-auto rounded-lg border',
  // Faster open/close — the default 400ms slide feels sluggish on this wide sheet.
  'data-[state=open]:duration-200 data-[state=closed]:duration-150',
  '[&_[data-slot=sheet-close]]:top-4 [&_[data-slot=sheet-close]]:end-4',
].join(' ');

/** Slightly lighter backdrop so the sheet reads as snappy, not heavy. */
export const PAYMENT_RECEIVE_SHEET_OVERLAY_CLASS =
  'bg-black/10 data-[state=open]:duration-200 data-[state=closed]:duration-150';

export const PAYMENT_RECEIVE_SHEET_BODY_CLASS =
  'overflow-y-auto px-4 sm:px-5 py-4 flex-1 min-h-0 max-h-[calc(100dvh-7.5rem)]';
