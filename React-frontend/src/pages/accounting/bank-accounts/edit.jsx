import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BankAccountEditDialog } from './components/BankAccountEditDialog';
import { bankAccountsApi } from './api/bank-accounts.api';

/**
 * Legacy /edit route — opens the edit modal and returns to the list on close.
 */
export function BankAccountEditPage() {
  const { id: workspaceId, bankAccountId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/bank-accounts`;
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    if (!bankAccountId) navigate(base, { replace: true });
  }, [bankAccountId, base, navigate]);

  useEffect(() => {
    bankAccountsApi
      .formOptions()
      .then((res) => setCanDelete(!!res.data?.data?.can_delete))
      .catch(() => {});
  }, []);

  return (
    <BankAccountEditDialog
      bankAccountId={bankAccountId}
      open={!!bankAccountId}
      onOpenChange={(open) => {
        if (!open) navigate(base, { replace: true });
      }}
      onSuccess={() => navigate(base, { replace: true })}
      canDelete={canDelete}
    />
  );
}
