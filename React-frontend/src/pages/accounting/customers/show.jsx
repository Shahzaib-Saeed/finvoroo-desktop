import { useNavigate, useParams } from 'react-router';
import { useCustomerDialog } from '@/components/workspace/customer/customer-dialog-provider';
import { CustomerDetailsSheet } from './components/CustomerDetailsSheet';

/** Deep link: opens customer details offcanvas; closing returns to the list. */
export function CustomerShowPage() {
  const { id: workspaceId, customerId } = useParams();
  const navigate = useNavigate();
  const customerDialog = useCustomerDialog();
  const listPath = `/workspace/${workspaceId}/accounting/customers`;

  const handleEdit = (customer) => {
    navigate(listPath);
    window.setTimeout(() => {
      customerDialog.openEdit(customer, {
        onSuccess: () => navigate(listPath),
      });
    }, 0);
  };

  return (
    <CustomerDetailsSheet
      open
      onOpenChange={(open) => {
        if (!open) navigate(listPath);
      }}
      customerId={customerId}
      workspaceId={workspaceId}
      onEdit={handleEdit}
    />
  );
}
