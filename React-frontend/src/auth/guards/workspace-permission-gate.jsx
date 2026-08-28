import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ROUTE_PERMISSIONS } from '@/config/route-permissions';
import { WorkspaceNotAuthorizedPage } from '@/pages/workspace/not-authorized-page';

/**
 * Renders <Outlet/> only if the current route's mapped permission (see
 * route-permissions.js) is in the user's effective permission set; otherwise
 * renders the "not authorized" page in its place. A route with no mapping
 * entry is always allowed. This is a UX guard against dead pages, not the
 * security boundary — EnforceWorkspaceApiPermission on the backend is what
 * actually blocks unauthorized data access.
 *
 * Fail-closed while permissions are loading (except full-access accounts).
 */
export function WorkspacePermissionGate({ context }) {
  const { pathname } = useLocation();
  const permissions = useAuthStore((s) => s.permissions);
  const isFullAccess = useAuthStore((s) => s.isFullAccess);
  const permissionsLoaded = useAuthStore((s) => s.permissionsLoaded);

  if (isFullAccess) {
    return <Outlet context={context} />;
  }

  if (!permissionsLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" aria-label="Loading permissions" />
      </div>
    );
  }

  const match = ROUTE_PERMISSIONS.find((entry) =>
    matchPath({ path: entry.pattern, end: true }, pathname),
  );

  if (match && !permissions.includes(match.permission)) {
    return <WorkspaceNotAuthorizedPage />;
  }

  return <Outlet context={context} />;
}
