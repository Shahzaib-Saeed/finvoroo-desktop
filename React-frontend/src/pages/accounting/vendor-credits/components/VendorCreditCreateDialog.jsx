import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VendorCreditForm } from './VendorCreditForm';
import { useVendorCreditForm } from '../hooks/useVendorCreditForm';

export function VendorCreditCreateDialog({ open, onOpenChange, onSuccess }) {
  const formProps = useVendorCreditForm({
    mode: 'create',
    onSuccess: (created) => {
      onOpenChange(false);
      onSuccess?.(created);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100vw-2rem,72rem)] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-2">
          <DialogTitle>New debit note</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Record a return or adjustment; use a single amount or returned line items.
          </p>
        </DialogHeader>
        <VendorCreditForm
          {...formProps}
          canCreateVendor={formProps.lookups?.can_create_vendor}
          onSubmit={formProps.handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
