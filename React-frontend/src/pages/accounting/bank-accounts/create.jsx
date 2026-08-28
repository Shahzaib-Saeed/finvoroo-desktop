import { useNavigate, useParams } from 'react-router';
import { BankAccountCreateDialog } from './components/BankAccountCreateDialog';

/**
 * Legacy /create route — opens the create modal and returns to the list on close.
 */
export function BankAccountCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/bank-accounts`;

  return (
    <BankAccountCreateDialog
      open
      onOpenChange={(open) => {
        if (!open) navigate(base, { replace: true });
      }}
      onSuccess={() => navigate(base, { replace: true })}
    />
  );
}
