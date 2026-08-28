import { Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { VendorDetailsPanel } from './VendorDetailsPanel';

/**
 * Wide offcanvas vendor details — matches CustomerDetailsSheet layout exactly.
 */
export function VendorDetailsSheet({
  open,
  onOpenChange,
  vendorId,
  workspaceId,
  onEdit,
  onListRefresh,
}) {
  const handleClose = () => onOpenChange(false);

  const handleEdit = (vendor) => {
    onOpenChange(false);
    onEdit?.(vendor);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={[
          'gap-0 p-0 flex flex-col overflow-hidden',
          'w-full sm:max-w-none',
          'lg:w-[min(1160px,calc(100vw-2.5rem))]',
          'inset-y-2.5 end-2.5 start-auto h-auto max-h-[calc(100dvh-1.25rem)] rounded-lg border',
          'data-[state=open]:duration-200 data-[state=closed]:duration-200',
          '[&_[data-slot=sheet-close]]:top-4 [&_[data-slot=sheet-close]]:end-4',
        ].join(' ')}
        overlayClassName="bg-black/15 [backdrop-filter:none]"
      >
        <SheetHeader className="border-b py-3.5 px-5 shrink-0">
          <SheetTitle className="font-medium">Vendor Details</SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0 grow flex flex-col min-h-0 overflow-hidden">
          <VendorDetailsPanel
            vendorId={vendorId}
            workspaceId={workspaceId}
            onClose={handleClose}
            onEdit={handleEdit}
            onListRefresh={onListRefresh}
            onDeleted={handleClose}
            showHeaderActions
          />
        </SheetBody>

        <SheetFooter className="flex-row border-t py-4 px-5 gap-2 shrink-0 sm:justify-end">
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="mono"
            onClick={() => {
              if (vendorId) {
                handleEdit({ id: vendorId });
              }
            }}
          >
            <Edit3 className="size-4 mr-1" /> Edit Details
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
