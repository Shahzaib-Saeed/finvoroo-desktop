import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { customersApi } from '../api/customers.api';

export function CustomerDeleteDialog({ customer, open, onOpenChange, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [forceMode, setForceMode] = useState(false);

  const handleClose = () => {
    if (isDeleting) return;
    setForceMode(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!customer?.id) return;
    setIsDeleting(true);
    try {
      const params = forceMode ? { force: true } : {};
      const res = await customersApi.delete(customer.id, params);
      toast.success(res?.data?.message || 'Customer deleted successfully');
      setForceMode(false);
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || 'Failed to delete customer';
      if (status === 409 && !forceMode) {
        setForceMode(true);
        toast.warning(message);
      } else {
        toast.error(message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const description = forceMode ? (
    <>
      <strong>{customer?.name}</strong> has outstanding balance or linked records.
      Deleting with force will deactivate the customer and clear associations where
      allowed. This cannot be undone.
    </>
  ) : (
    <>
      This will delete customer <strong>{customer?.name}</strong>. If the customer has
      linked records (invoices, payments, etc.), you may be asked to confirm force
      deletion. This action cannot be undone.
    </>
  );

  return (
    <ConfirmDialog
      open={open}
      title={forceMode ? 'Force delete customer?' : 'Delete customer?'}
      description={description}
      confirmLabel={forceMode ? 'Force delete' : 'Delete'}
      confirmVariant="destructive"
      isLoading={isDeleting}
      onConfirm={handleDelete}
      onCancel={handleClose}
    />
  );
}
