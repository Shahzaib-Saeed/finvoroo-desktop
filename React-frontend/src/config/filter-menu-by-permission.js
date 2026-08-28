/**
 * Recursively prunes a menu tree (WORKSPACE_MENU / mega-menu shape) down to
 * items the current user can see. A leaf with no `permission` field is
 * always visible (opt-in gating — only items we've explicitly mapped are
 * restricted). A parent with children is visible if at least one child
 * survives filtering, regardless of any `permission` field on the parent
 * itself.
 *
 * `canFn` is a permission-check function, e.g. `useAuthStore.getState().hasPermission`
 * or the `useCan` hook's underlying check — pass whatever resolves a slug to boolean.
 *
 * Optional `features` map gates items with `feature: 'pos_menu'` etc.
 * Example: `{ pos_menu: company.show_pos_menu }`
 */
export function filterMenuByPermission(menu, canFn, features = {}) {
  return (menu ?? []).reduce((acc, item) => {
    if (item.feature && !features[item.feature]) {
      return acc;
    }

    if (item.children?.length) {
      const children = filterMenuByPermission(item.children, canFn, features);
      if (children.length > 0) {
        acc.push({ ...item, children });
      }
      return acc;
    }

    if (!item.permission || canFn(item.permission)) {
      acc.push(item);
    }

    return acc;
  }, []);
}
