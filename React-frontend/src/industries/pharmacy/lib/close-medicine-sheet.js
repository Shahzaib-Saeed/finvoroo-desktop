/** Close any open medicine lookup sheet without stealing focus from the active field. */
export function closeMedicineSheet({ restoreFocus = false } = {}) {
  window.dispatchEvent(
    new CustomEvent('pharmacy:close-medicine-sheet', {
      detail: { restoreFocus },
    }),
  );
}
