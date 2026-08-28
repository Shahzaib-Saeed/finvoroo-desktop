/**
 * After quick-create customer, append to formOptions().customers so Selects
 * show the new value without a full page refresh.
 */
export function mergeCustomerIntoLookups(setLookups, saved) {
  if (!saved?.id || typeof setLookups !== 'function') return;
  const id = saved.id;
  const name =
    saved.name ||
    saved.display_name ||
    saved.company_name ||
    `Customer #${id}`;
  const row = { id, name };

  setLookups((prev) => {
    if (!prev) return prev;
    const list = prev.customers || [];
    if (list.some((x) => String(x.id) === String(row.id))) return prev;
    return { ...prev, customers: [row, ...list] };
  });
}
