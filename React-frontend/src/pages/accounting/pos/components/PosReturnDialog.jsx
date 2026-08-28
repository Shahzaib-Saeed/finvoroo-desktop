import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PosReturnInvoicePanel } from './PosReturnInvoicePanel';

export function PosReturnDialog({
  open,
  onOpenChange,
  currency,
  canRefund,
  onExchangeStart,
  requireManager,
  managerActive,
  onRequestManager,
}) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (open) setKey((k) => k + 1);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-pos-no-scan className="max-w-xl gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-foreground/10 px-5 py-4">
          <DialogTitle className="text-lg font-semibold">Returns & exchanges</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Against invoice · inventory restocks via credit notes
          </p>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <PosReturnInvoicePanel
            key={key}
            currency={currency}
            canRefund={canRefund}
            managerActive={managerActive}
            onRequestManager={onRequestManager}
            onExchangeStart={(invoice, formLines) => {
              onExchangeStart?.(invoice, formLines);
              onOpenChange(false);
            }}
            onComplete={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
