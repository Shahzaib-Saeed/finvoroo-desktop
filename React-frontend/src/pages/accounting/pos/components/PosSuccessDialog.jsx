import { Check, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocumentPrintMenu } from '@/pages/accounting/document-output/components/DocumentPrintMenu';
import {
  ThermalReceiptBody,
  thermalReceiptFromPos,
} from '@/pages/accounting/document-output/components/ThermalReceiptBody';
import { printPosReceipt } from '@/lib/print-pos-receipt';

export function PosSuccessDialog({ open, onOpenChange, receipt, currency, company }) {
  const { id: workspaceId } = useParams();
  const r = receipt?.receipt || {};
  const invoiceId = receipt?.invoice?.id || r.invoice_id;
  const [thermalPaper, setThermalPaper] = useState('thermal_80');

  const thermalProps = useMemo(() => {
    const widthMm = thermalPaper === 'thermal_58' ? 58 : 80;
    return thermalReceiptFromPos(receipt, { company, currency, widthMm });
  }, [receipt, company, currency, thermalPaper]);

  return (
    <>
      <div id="pos-receipt-print" className="thermal-print-source" aria-hidden="true">
        <ThermalReceiptBody {...thermalProps} />
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-pos-no-scan className="max-w-md gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="items-center px-6 pb-2 pt-8 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-foreground text-background">
            <Check className="size-7" strokeWidth={2.5} />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Sale complete
          </DialogTitle>
        </DialogHeader>

        <div id="pos-receipt-preview" className="mx-auto w-full max-w-[340px] px-3 py-1">
          <ThermalReceiptBody {...thermalProps} preview />
        </div>

        <div className="flex flex-col gap-2 border-t border-foreground/10 bg-muted/20 px-5 py-4">
          {invoiceId ? (
            <DocumentPrintMenu
              documentType="pos_receipt"
              documentId={invoiceId}
              permission="pos.print"
              label="Print receipt"
              variant="outline"
              size="lg"
              className="h-12 w-full justify-center rounded-xl"
              onThermalPrint={async ({ paper }) => {
                setThermalPaper(paper || 'thermal_80');
                await new Promise((resolve) => {
                  requestAnimationFrame(() => requestAnimationFrame(resolve));
                });
                await printPosReceipt({
                  elementId: 'pos-receipt-print',
                  paper: paper || 'thermal_80',
                  invoiceId,
                  openDrawer: true,
                });
              }}
              onLegacyPrint={async () => {
                await printPosReceipt({
                  elementId: 'pos-receipt-print',
                  paper: 'thermal_80',
                  invoiceId,
                  openDrawer: true,
                });
              }}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl"
              onClick={async () => {
                await printPosReceipt({
                  elementId: 'pos-receipt-print',
                  paper: 'thermal_80',
                  invoiceId,
                  openDrawer: true,
                });
              }}
            >
              <Printer className="mr-2 size-4" />
              Print receipt
            </Button>
          )}
          {invoiceId && (
            <Button asChild variant="outline" className="h-12 rounded-xl">
              <Link to={`/workspace/${workspaceId}/accounting/invoices/${invoiceId}`}>
                View invoice
              </Link>
            </Button>
          )}
          <Button
            type="button"
            className="h-12 rounded-xl bg-foreground text-background"
            onClick={() => onOpenChange(false)}
          >
            New sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
