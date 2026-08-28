import { useEffect, useState } from 'react';
import { FileText, Loader2, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PosReturnInvoicePanel } from '@/pages/accounting/pos/components/PosReturnInvoicePanel';
import { pharmacyApi } from '../api/pharmacy.api';
import {
  closeMedicinePickSheet,
  isMedicinePickSheetOpen,
} from '../lib/medicine-pick-sheet-state';
import { PharmacyOpenReturnPanel } from './PharmacyOpenReturnPanel';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

const MODES = [
  {
    key: 'open',
    label: 'No receipt',
    hint: 'Customer has no bill',
    icon: PackageOpen,
  },
  {
    key: 'receipt',
    label: 'With receipt',
    hint: 'Find the sale bill',
    icon: FileText,
  },
];

function pickSheetOpen() {
  return isMedicinePickSheetOpen();
}

/** Counter sale returns — open (no bill) + invoice-linked. */
export function PharmacyReturnDialog({
  open,
  onOpenChange,
  currency,
  canRefund,
  onExchangeStart,
  managerActive,
  onRequestManager,
  posCustomer = null,
  walkIn = null,
}) {
  const [mode, setMode] = useState('open');
  const [context, setContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setMode('open');
      setContext(null);
      return undefined;
    }

    let cancelled = false;
    setContextLoading(true);
    pharmacyApi
      .looseSaleReturnContext()
      .then((res) => {
        if (cancelled) return;
        setContext(unwrap(res));
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load return settings.');
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleComplete = () => {
    onOpenChange(false);
  };

  const blockOutsideDismiss = (e) => {
    if (pickSheetOpen()) {
      e.preventDefault();
      return;
    }
    // Non-modal dialog closes on any outside interaction — keep it open unless Esc / X.
    e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        data-pos-no-scan
        data-pharmacy-return-dialog
        overlayClassName="!z-[60] bg-black/50"
        className="!z-[60] flex max-h-[92vh] max-w-[min(1200px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden rounded-xl border-slate-300 p-0 shadow-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={blockOutsideDismiss}
        onInteractOutside={blockOutsideDismiss}
        onFocusOutside={blockOutsideDismiss}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          if (pickSheetOpen()) {
            closeMedicinePickSheet({ restoreFocus: true });
          }
        }}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-slate-300 bg-white px-5 py-4 text-left">
          <DialogTitle className="text-[18px] font-semibold text-slate-900">
            Return
          </DialogTitle>
          <p className="text-[13px] text-slate-600">
            Restock medicines and refund or credit the customer
          </p>
          <div className="mt-3 flex gap-2">
            {MODES.map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMode(opt.key)}
                  className={cn(
                    'flex min-w-0 flex-1 items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'border-emerald-700 bg-emerald-50'
                      : 'border-slate-300 bg-white hover:bg-slate-50',
                  )}
                >
                  <Icon
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      active ? 'text-emerald-800' : 'text-slate-500',
                    )}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-[13px] font-semibold',
                        active ? 'text-emerald-900' : 'text-slate-900',
                      )}
                    >
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-slate-500">{opt.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {contextLoading && mode === 'open' ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-emerald-700" />
            </div>
          ) : null}

          {!contextLoading && mode === 'receipt' ? (
            <PosReturnInvoicePanel
              currency={currency}
              canRefund={canRefund}
              managerActive={managerActive}
              onRequestManager={onRequestManager}
              onExchangeStart={onExchangeStart}
              onComplete={handleComplete}
            />
          ) : null}

          {!contextLoading && mode === 'open' && context ? (
            <PharmacyOpenReturnPanel
              context={context}
              posCustomer={posCustomer}
              walkIn={walkIn}
              canRefund={canRefund}
              managerActive={managerActive}
              onRequestManager={onRequestManager}
              onComplete={handleComplete}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
