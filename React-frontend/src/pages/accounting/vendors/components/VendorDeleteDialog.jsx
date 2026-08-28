import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { vendorsApi } from '../api/vendors.api';

export function VendorDeleteDialog({ vendor, open, onOpenChange, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    if (isDeleting) return;
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!vendor?.id) return;
    setIsDeleting(true);
    try {
      const res = await vendorsApi.delete(vendor.id);
      toast.success(res?.data?.message || 'Vendor deleted successfully');
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Delete vendor?"
      description={
        <>
          This will deactivate vendor <strong>{vendor?.name}</strong>. You can no longer
          select them on new bills until reactivated from edit.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      isLoading={isDeleting}
      onConfirm={handleDelete}
      onCancel={handleClose}
    />
  );
}
