import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreditNoteForm } from './CreditNoteForm';
import { useCreditNoteForm } from '../hooks/useCreditNoteForm';

export function CreditNoteCreateDialog({ open, onOpenChange, onSuccess }) {
  const formProps = useCreditNoteForm({
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
          <DialogTitle>New credit note</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Issue a return or adjustment; use a single amount or returned line items.
          </p>
        </DialogHeader>
        <CreditNoteForm
          {...formProps}
          onSubmit={formProps.handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
