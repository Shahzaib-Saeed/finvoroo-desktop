import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { vendorCreditsApi } from '../api/vendor-credits.api';
import { VendorCreditForm } from './VendorCreditForm';
import { useVendorCreditForm } from '../hooks/useVendorCreditForm';

function EditFormInner({ vendorCredit, onSuccess, onClose }) {
  const formProps = useVendorCreditForm({
    mode: 'edit',
    vendorCredit,
    onSuccess: (updated) => {
      onClose();
      onSuccess?.(updated);
    },
  });

  if (vendorCredit.flags?.can_edit === false) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        This debit note is pending approval and can't be edited until it's approved or rejected.
      </p>
    );
  }

  return (
    <VendorCreditForm
      {...formProps}
      isEdit
      canCreateVendor={formProps.lookups?.can_create_vendor}
      onSubmit={formProps.handleSubmit}
      onCancel={onClose}
    />
  );
}

export function VendorCreditEditDialog({ open, onOpenChange, vendorCreditId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [vendorCredit, setVendorCredit] = useState(null);

  // Keep onOpenChange in a ref so parent re-renders (which typically pass a
  // fresh inline callback) don't re-fire the fetch effect and clobber state
  // mid-load — that race was the root cause of the "empty edit form" bug.
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open || !vendorCreditId) {
      setVendorCredit(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    vendorCreditsApi
      .show(vendorCreditId)
      .then((res) => {
        if (!cancelled) setVendorCredit(res.data?.data || null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load debit note');
        if (!cancelled) {
          setVendorCredit(null);
          onOpenChangeRef.current?.(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, vendorCreditId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100vw-2rem,72rem)] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-2">
          <DialogTitle>
            {vendorCredit
              ? `Edit ${vendorCredit.credit_number || 'debit note'}`
              : 'Edit debit note'}
          </DialogTitle>
          {vendorCredit?.vendor?.name && (
            <p className="text-sm text-muted-foreground">{vendorCredit.vendor.name}</p>
          )}
        </DialogHeader>

        {loading || !vendorCredit ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <EditFormInner
            key={vendorCredit.id}
            vendorCredit={vendorCredit}
            onSuccess={onSuccess}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
