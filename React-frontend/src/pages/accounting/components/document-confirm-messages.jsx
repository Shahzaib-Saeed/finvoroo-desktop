/**
 * Standard copy for document action confirmations.
 */
export function confirmDeleteMessage(documentLabel, documentNumber) {
  const name = documentNumber || documentLabel;
  return {
    title: `Delete ${documentLabel}?`,
    description: (
      <>
        Do you really want to delete <strong>{name}</strong>? This cannot be undone.
      </>
    ),
    confirmLabel: 'Yes, delete',
    confirmVariant: 'destructive',
  };
}

export function confirmEditMessage(documentLabel, documentNumber) {
  const name = documentNumber || documentLabel;
  return {
    title: `Edit ${documentLabel}?`,
    description: (
      <>
        Do you really want to edit <strong>{name}</strong>? Unsaved changes on the edit
        screen will replace the current version when you save.
      </>
    ),
    confirmLabel: 'Yes, continue',
    confirmVariant: 'primary',
  };
}

export function confirmUpdateMessage(documentLabel, documentNumber) {
  const name = documentNumber || documentLabel;
  return {
    title: `Update ${documentLabel}?`,
    description: (
      <>
        Do you really want to save your changes to <strong>{name}</strong>?
      </>
    ),
    confirmLabel: 'Yes, update',
    confirmVariant: 'primary',
  };
}

export function confirmCreateInvoiceMessage(salesOrderNumber) {
  return {
    title: 'Create invoice?',
    description: (
      <>
        Do you really want to create an invoice from sales order{' '}
        <strong>{salesOrderNumber}</strong>? A new invoice will be generated from this order.
      </>
    ),
    confirmLabel: 'Yes, create invoice',
    confirmVariant: 'primary',
  };
}

export function confirmCreateSalesOrderMessage(quoteNumber) {
  return {
    title: 'Create sales order?',
    description: (
      <>
        Do you really want to create a sales order from quotation{' '}
        <strong>{quoteNumber}</strong>?
      </>
    ),
    confirmLabel: 'Yes, create sales order',
    confirmVariant: 'primary',
  };
}

export function confirmDeliveryNoteConfirmMessage(dnNumber) {
  return {
    title: 'Confirm delivery?',
    description: (
      <>
        Do you really want to confirm delivery note <strong>{dnNumber}</strong>? Stock will be
        deducted from the warehouse and delivered quantities on the sales order will be updated.
      </>
    ),
    confirmLabel: 'Yes, confirm delivery',
    confirmVariant: 'primary',
  };
}

export function confirmDeliveryNoteCancelMessage(dnNumber) {
  return {
    title: 'Cancel delivery note?',
    description: (
      <>
        Do you really want to cancel <strong>{dnNumber}</strong>? This delivery will not affect
        inventory or the sales order.
      </>
    ),
    confirmLabel: 'Yes, cancel',
    confirmVariant: 'destructive',
  };
}

export function confirmCompleteMessage(documentLabel, documentNumber) {
  const name = documentNumber || documentLabel;
  return {
    title: `Mark ${documentLabel} complete?`,
    description: (
      <>
        Do you really want to mark <strong>{name}</strong> as complete? This may limit
        further changes.
      </>
    ),
    confirmLabel: 'Yes, mark complete',
    confirmVariant: 'primary',
  };
}
