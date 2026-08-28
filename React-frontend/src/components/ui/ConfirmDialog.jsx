import { LoaderCircleIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * ConfirmDialog — reusable confirmation modal built on Radix Dialog.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showDelete}
 *     title="Delete Invoice?"
 *     description="This action cannot be undone."
 *     confirmLabel="Delete"
 *     confirmVariant="destructive"
 *     isLoading={deleting}
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDelete(false)}
 *   />
 */
export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
  confirmDisabled = false,
  isLoading = false,
  overlayClassName,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isLoading) onCancel?.(); }}>
      <DialogContent
        showCloseButton={!isLoading}
        overlayClassName={overlayClassName}
        className="duration-100 data-[state=open]:duration-100 data-[state=closed]:duration-75"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <LoaderCircleIcon className="size-4 animate-spin" />
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
