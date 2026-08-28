import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { printInvoiceDocument } from '@/lib/print-invoice';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { InvoiceDocument } from './InvoiceDocument';
import {
  DISPLAY_DEFAULTS,
  buildCustomFieldSections,
  resolveSectionOrder,
} from '../invoice-print-display';

export function InvoicePreviewSheet({ open, onOpenChange, invoice, workspaceId }) {
  if (!invoice) return null;

  const customSections = buildCustomFieldSections(invoice);
  const sectionOrder = resolveSectionOrder(invoice, customSections, DISPLAY_DEFAULTS);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="no-print px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>Invoice preview</SheetTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => printInvoiceDocument()}
            >
              <Printer className="size-4 mr-1" /> Print
            </Button>
          </div>
          <p className="text-xs text-muted-foreground font-normal">
            Draft preview — save the invoice to assign a number and record payments.
          </p>
        </SheetHeader>
        <SheetBody className="overflow-y-auto p-4">
          <div className="max-w-[800px] mx-auto">
            <InvoiceDocument
              invoice={invoice}
              display={DISPLAY_DEFAULTS}
              sectionOrder={sectionOrder}
              workspaceId={workspaceId}
            />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
