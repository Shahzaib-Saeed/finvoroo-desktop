/** True while the medicine lookup sheet is open (Radix sets data-state on the sheet root). */
export function isMedicinePickSheetOpen() {
  return Boolean(document.querySelector('[data-pharmacy-pick-sheet][data-state="open"]'));
}

export function closeMedicinePickSheet({ restoreFocus = true } = {}) {
  window.dispatchEvent(
    new CustomEvent('pharmacy:close-medicine-sheet', {
      detail: { restoreFocus },
    }),
  );
}
