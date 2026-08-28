import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { vendorsApi } from '../api/vendors.api';

export function VendorDeactivateDialog({ vendor, open, onOpenChange, onDone }) {
  const [busy, setBusy] = useState(false);

  const handleClose = () => {
    if (busy) return;
    onOpenChange(false);
  };

  const handleDeactivate = async () => {
    if (!vendor?.id) return;
    setBusy(true);
    try {
      const res = await vendorsApi.deactivate(vendor.id);
      toast.success(res?.data?.message || 'Vendor deactivated');
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to deactivate vendor');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Deactivate vendor?"
      description={
        <>
          <strong>{vendor?.name}</strong> will be marked inactive and hidden from new bills
          and payments. Existing bills, balances, and payment history are kept.
        </>
      }
      confirmLabel="Deactivate"
      confirmVariant="destructive"
      isLoading={busy}
      onConfirm={handleDeactivate}
      onCancel={handleClose}
    />
  );
}
