import { useEffect, useState } from 'react';
import { useDashboardRefresh } from '@/pages/workspace/dashboard/DashboardRefreshContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  PAYMENT_RECEIVE_SHEET_BODY_CLASS,
  PAYMENT_RECEIVE_SHEET_CLASS,
  PAYMENT_RECEIVE_SHEET_OVERLAY_CLASS,
} from '@/components/accounting/payment-receive-sheet-classes';
import { PaymentForm } from './PaymentForm';
import { ApplyUnappliedDialog } from './ApplyUnappliedDialog';
import { usePaymentForm } from '../hooks/usePaymentForm';
import { paymentsApi } from '../api/payments.api';

function PaymentEditSheetBody({ onOpenChange, workspaceId, editPaymentId, onSuccess }) {
  const [payment, setPayment] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [notEditable, setNotEditable] = useState(null);
  const [applyPaymentId, setApplyPaymentId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingPayment(true);
    setNotEditable(null);
    paymentsApi
      .show(editPaymentId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || null;
        if (!data) {
          setNotEditable('Receipt not found.');
        } else if (data.approval_status === 'pending') {
          setNotEditable('Receipts pending approval cannot be edited.');
        }
        setPayment(data);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.response?.data?.message || 'Failed to load receipt');
        setNotEditable('Failed to load receipt.');
      })
      .finally(() => {
        if (!cancelled) setLoadingPayment(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editPaymentId]);

  const { triggerDashboardRefresh } = useDashboardRefresh();

  const paymentForm = usePaymentForm({
    mode: 'edit',
    payment,
    onSuccess: (saved) => {
      triggerDashboardRefresh();
      onSuccess?.(saved);
      onOpenChange(false);
    },
  });

  const initialLoading =
    loadingPayment || paymentForm.loadingLookups || paymentForm.loadingContext;

  return (
    <>
      <SheetContent
        className={PAYMENT_RECEIVE_SHEET_CLASS}
        overlayClassName={PAYMENT_RECEIVE_SHEET_OVERLAY_CLASS}
      >
        <SheetHeader className="border-b py-3.5 px-5 shrink-0 text-start space-y-1">
          <SheetTitle className="font-semibold text-base">
            {payment?.receipt_number
              ? `Edit receipt #${payment.receipt_number}`
              : `Edit receipt #${editPaymentId}`}
          </SheetTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Select customer → tick invoices → save. Amount fills automatically.
          </p>
        </SheetHeader>
        <SheetBody className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
          {notEditable ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
              <p className="text-sm text-muted-foreground">{notEditable}</p>
            </div>
          ) : (
            <div className={PAYMENT_RECEIVE_SHEET_BODY_CLASS}>
              <PaymentForm
                {...paymentForm}
                workspaceId={workspaceId}
                onSubmit={paymentForm.handleSubmit}
                onCancel={() => onOpenChange(false)}
                onApplyUnapplied={setApplyPaymentId}
                loadingLookups={initialLoading}
              />
            </div>
          )}
        </SheetBody>
      </SheetContent>
      <ApplyUnappliedDialog
        open={!!applyPaymentId}
        onOpenChange={(v) => {
          if (!v) setApplyPaymentId(null);
        }}
        paymentId={applyPaymentId}
        onSuccess={() => {
          paymentForm.refreshCustomerContext?.();
          onSuccess?.();
        }}
      />
    </>
  );
}

/** Right offcanvas for editing an existing customer receipt (mirrors the create sheet). */
export function PaymentEditSheet({
  open,
  onOpenChange,
  workspaceId,
  editPaymentId = null,
  onSuccess,
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open && editPaymentId ? (
        <PaymentEditSheetBody
          key={editPaymentId}
          onOpenChange={onOpenChange}
          workspaceId={workspaceId}
          editPaymentId={editPaymentId}
          onSuccess={onSuccess}
        />
      ) : null}
    </Sheet>
  );
}
