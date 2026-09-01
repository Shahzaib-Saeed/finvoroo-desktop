import { Navigate, useLocation } from 'react-router-dom';

/**
 * Unknown URLs under /workspace/:id should return to that workspace dashboard,
 * not the account-owner home at /. Otherwise a missing pharmacy route looks
 * like a logout to the owner dashboard.
 */
export function UnknownRouteRedirect() {
  const { pathname } = useLocation();
  const workspaceMatch = pathname.match(/^\/workspace\/([^/]+)/);

  if (workspaceMatch) {
    return <Navigate to={`/workspace/${workspaceMatch[1]}`} replace />;
  }

  return <Navigate to="/" replace />;
}
