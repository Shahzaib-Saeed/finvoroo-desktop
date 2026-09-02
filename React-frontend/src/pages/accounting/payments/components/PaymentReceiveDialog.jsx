import { useState } from "react";
import { useDashboardRefresh } from '@/pages/workspace/dashboard/DashboardRefreshContext';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PAYMENT_RECEIVE_SHEET_BODY_CLASS,
  PAYMENT_RECEIVE_SHEET_CLASS,
  PAYMENT_RECEIVE_SHEET_OVERLAY_CLASS,
} from "@/components/accounting/payment-receive-sheet-classes";
import { PaymentForm } from "./PaymentForm";
import { ApplyUnappliedDialog } from "./ApplyUnappliedDialog";
import { usePaymentForm } from "../hooks/usePaymentForm";

function PaymentReceiveSheetBody({
  onOpenChange,
  workspaceId,
  initialInvoice,
  onSuccess,
}) {
  const [applyPaymentId, setApplyPaymentId] = useState(null);
  const { triggerDashboardRefresh } = useDashboardRefresh();
  const paymentForm = usePaymentForm({
    mode: "create",
    initialInvoice,
    onSuccess: (created) => {
      triggerDashboardRefresh();
      onOpenChange(false);
      onSuccess?.(created);
    },
  });

  return (
    <>
      <SheetContent
        className={PAYMENT_RECEIVE_SHEET_CLASS}
        overlayClassName={PAYMENT_RECEIVE_SHEET_OVERLAY_CLASS}
      >
        <SheetHeader className="shrink-0 space-y-1 border-b bg-muted/10 px-5 py-4 text-start">
          <SheetTitle className="text-base font-semibold tracking-tight">
            Receive Payment
          </SheetTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Select customer → enter payment details → save transaction
          </p>
        </SheetHeader>
        <SheetBody className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className={PAYMENT_RECEIVE_SHEET_BODY_CLASS}>
            <PaymentForm
              {...paymentForm}
              workspaceId={workspaceId}
              onSubmit={paymentForm.handleSubmit}
              onCancel={() => onOpenChange(false)}
              onApplyUnapplied={setApplyPaymentId}
            />
          </div>
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

/** Right offcanvas for recording a new customer receipt (legacy name kept for imports). */
export function PaymentReceiveDialog({
  open,
  onOpenChange,
  workspaceId,
  initialInvoice,
  onSuccess,
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <PaymentReceiveSheetBody
          onOpenChange={onOpenChange}
          workspaceId={workspaceId}
          initialInvoice={initialInvoice}
          onSuccess={onSuccess}
        />
      ) : null}
    </Sheet>
  );
}
