import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { CustomerDetailsPanel } from './CustomerDetailsPanel';

/**
 * Wide offcanvas customer details — enterprise ERP layout.
 */
export function CustomerDetailsSheet({
  open,
  onOpenChange,
  customerId,
  workspaceId,
  onEdit,
  onListRefresh,
}) {
  const handleClose = () => onOpenChange(false);

  const handleEdit = (customer) => {
    onOpenChange(false);
    onEdit?.(customer);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        close={false}
        className={[
          'gap-0 p-0 flex flex-col overflow-hidden',
          'w-full sm:max-w-none',
          'lg:w-[min(1200px,calc(100vw-2rem))]',
          'inset-y-2 end-2 start-auto h-auto max-h-[calc(100dvh-1rem)] rounded-xl border shadow-2xl',
          'data-[state=open]:duration-200 data-[state=closed]:duration-200',
        ].join(' ')}
        overlayClassName="bg-black/20 backdrop-blur-[1px]"
      >
        <SheetTitle className="sr-only">Customer details</SheetTitle>
        <SheetBody className="p-0 grow flex flex-col min-h-0 overflow-hidden">
          <CustomerDetailsPanel
            customerId={customerId}
            workspaceId={workspaceId}
            onClose={handleClose}
            onEdit={handleEdit}
            onListRefresh={onListRefresh}
            onDeleted={handleClose}
            showHeaderActions
            embeddedInSheet
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
