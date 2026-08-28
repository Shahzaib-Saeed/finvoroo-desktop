import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

/**
 * Legacy /employee/create route — opens the create dialog on the list page.
 */
export function EmployeeCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/workspace/${workspaceId}/employee?create=1`, { replace: true });
  }, [navigate, workspaceId]);

  return null;
}
