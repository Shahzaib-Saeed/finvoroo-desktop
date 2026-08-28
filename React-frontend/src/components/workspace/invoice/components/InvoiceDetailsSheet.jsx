import { ExternalLink, Printer } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { printInvoiceDocument } from '@/lib/print-invoice';
import { buildInvoiceUrl } from '@/pages/accounting/reports/report-drilldown';
import { InvoiceDetailsPanel } from './InvoiceDetailsPanel';

export function InvoiceDetailsSheet({
  open,
  onOpenChange,
  invoiceId,
  workspaceId,
}) {
  const fullPageUrl =
    workspaceId && invoiceId ? buildInvoiceUrl(workspaceId, invoiceId) : null;

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
          <div className="flex flex-wrap items-center justify-between gap-3 pe-8">
            <SheetTitle className="font-medium">Invoice details</SheetTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => printInvoiceDocument()}
              >
                <Printer className="size-4 mr-1" /> Print
              </Button>
              {fullPageUrl ? (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link to={fullPageUrl} onClick={() => onOpenChange(false)}>
                    <ExternalLink className="size-4 mr-1" /> Open full page
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="p-0 grow flex flex-col min-h-0 overflow-hidden">
          {open && invoiceId ? (
            <InvoiceDetailsPanel
              invoiceId={invoiceId}
              workspaceId={workspaceId}
            />
          ) : null}
        </SheetBody>

        <SheetFooter className="flex-row border-t py-4 px-5 gap-2 shrink-0 sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {fullPageUrl ? (
            <Button asChild>
              <Link to={fullPageUrl} onClick={() => onOpenChange(false)}>
                <ExternalLink className="size-4 mr-1" /> Open full page
              </Link>
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
