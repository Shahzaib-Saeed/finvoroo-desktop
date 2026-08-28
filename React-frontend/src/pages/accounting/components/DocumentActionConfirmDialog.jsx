import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * Renders ConfirmDialog from a message object returned by document-confirm-messages helpers.
 */
export function DocumentActionConfirmDialog({
  open,
  message,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!message) return null;

  return (
    <ConfirmDialog
      open={open}
      title={message.title}
      description={message.description}
      confirmLabel={message.confirmLabel}
      confirmVariant={message.confirmVariant}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
