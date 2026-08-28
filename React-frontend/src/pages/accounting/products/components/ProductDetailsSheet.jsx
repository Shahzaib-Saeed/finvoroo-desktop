import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ProductDetailsPanel } from './ProductDetailsPanel';

export function ProductDetailsSheet({
  open,
  onOpenChange,
  productId,
  workspaceId,
  onEdit,
  onListRefresh,
}) {
  const handleClose = () => onOpenChange(false);

  const handleEdit = (product) => {
    onOpenChange(false);
    onEdit?.(product);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={[
          'gap-0 p-0 flex flex-col',
          'w-full sm:max-w-none',
          'lg:w-[min(1160px,calc(100vw-2.5rem))]',
          'inset-y-2.5 end-2.5 start-auto h-auto rounded-lg border',
          '[&_[data-slot=sheet-close]]:top-4 [&_[data-slot=sheet-close]]:end-4',
        ].join(' ')}
      >
        <SheetHeader className="border-b py-3.5 px-5 shrink-0">
          <SheetTitle className="font-medium">Product Details</SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0 grow flex flex-col min-h-0 overflow-hidden">
          {open && productId ? (
            <ProductDetailsPanel
              productId={productId}
              workspaceId={workspaceId}
              onClose={handleClose}
              onEdit={handleEdit}
              onListRefresh={onListRefresh}
              showHeaderActions
            />
          ) : null}
        </SheetBody>

        <SheetFooter className="flex-row border-t py-4 px-5 gap-2 shrink-0 sm:justify-end">
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
