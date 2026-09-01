/**
 * Radix Dialog/Sheet can leave the page unclickable after close when multiple
 * modals open in sequence (e.g. POS shift close → open new shift).
 */
export function releaseModalPointerLock() {
  if (typeof document === 'undefined') return;

  document.body.style.pointerEvents = '';
  document.body.style.overflow = '';
  document.body.removeAttribute('data-scroll-locked');

  // Drop closed overlays that missed unmount during fast open/close transitions.
  document
    .querySelectorAll('[data-slot=dialog-overlay][data-state=closed]')
    .forEach((node) => node.remove());
}

/** Run after the dialog close animation so Radix cleanup can finish first. */
export function releaseModalPointerLockSoon() {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    releaseModalPointerLock();
    window.setTimeout(releaseModalPointerLock, 180);
  });
}
