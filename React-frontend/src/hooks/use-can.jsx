import { useAuthStore } from '@/store/authStore';

/**
 * Returns true if the current user's effective permission set includes
 * `slug` (or every slug in an array, when any=false — default is "has at
 * least one of these"). Super admin / company owner / any full-access role
 * always passes.
 *
 * This is for page/menu/route/button-category gating only — never re-derive
 * or re-AND this against row-level `flags.can_edit` / `can_delete` already
 * returned by list/detail API responses (see journal-entries index.jsx):
 * those encode business-rule state (e.g. "can't delete a posted entry") on
 * top of RBAC, and a second client-side permission source can only make
 * that wrong.
 */
export function useCan(slug) {
  return useAuthStore((s) => {
    if (s.isFullAccess) return true;
    if (!slug) return true;
    if (Array.isArray(slug)) return slug.some((s2) => s.permissions.includes(s2));
    return s.permissions.includes(slug);
  });
}

/** Renders children only if the current user has `permission` (string or array-of-any). */
export function Can({ permission, children, fallback = null }) {
  const allowed = useCan(permission);
  return allowed ? children : fallback;
}
