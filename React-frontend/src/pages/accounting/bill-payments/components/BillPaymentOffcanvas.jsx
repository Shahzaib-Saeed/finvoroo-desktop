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
import { BillPaymentForm } from './BillPaymentForm';
import { useBillPaymentForm } from '../hooks/useBillPaymentForm';
import { billsApi } from '../../bills/api/bills.api';
import { useEffect, useState } from 'react';

function BillPaymentOffcanvasBody({
  onOpenChange,
  editPaymentId,
  preselectBillId,
  preselectVendorId,
  preselectJobOrderId,
  onSuccess,
}) {
  const isEdit = Boolean(editPaymentId);
  const [resolvedBillId, setResolvedBillId] = useState(preselectBillId || null);
  const [resolvedVendorId, setResolvedVendorId] = useState(preselectVendorId || null);

  useEffect(() => {
    setResolvedBillId(preselectBillId || null);
    setResolvedVendorId(preselectVendorId || null);
  }, [preselectBillId, preselectVendorId]);

  useEffect(() => {
    if (isEdit || !preselectBillId || preselectVendorId) return;
    let cancelled = false;
    billsApi
      .show(preselectBillId)
      .then((res) => {
        if (cancelled) return;
        const bill = res.data?.data;
        if (bill?.vendor_id) setResolvedVendorId(String(bill.vendor_id));
        if (bill?.id) setResolvedBillId(String(bill.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [preselectBillId, preselectVendorId, isEdit]);

  const paymentForm = useBillPaymentForm({
    mode: isEdit ? 'edit' : 'create',
    editPaymentId,
    preselectBillId: isEdit ? null : resolvedBillId,
    preselectVendorId: isEdit ? null : resolvedVendorId,
    preselectJobOrderId: isEdit ? null : preselectJobOrderId,
    onSuccess: (saved) => {
      onSuccess?.(saved, { isEdit });
      onOpenChange(false);
    },
  });

  const initialLoading =
    paymentForm.loadingLookups || (isEdit && paymentForm.loadingContext);

  return (
    <SheetContent
      className={PAYMENT_RECEIVE_SHEET_CLASS}
      overlayClassName={PAYMENT_RECEIVE_SHEET_OVERLAY_CLASS}
    >
      <SheetHeader className="border-b py-3.5 px-5 shrink-0 text-start">
        <SheetTitle className="font-medium">
          {isEdit ? 'Edit payment' : 'Record payment'}
        </SheetTitle>
      </SheetHeader>
      <SheetBody className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className={PAYMENT_RECEIVE_SHEET_BODY_CLASS}>
          <BillPaymentForm
            {...paymentForm}
            onSubmit={paymentForm.handleSubmit}
            onCancel={() => onOpenChange(false)}
            loadingLookups={initialLoading}
          />
        </div>
      </SheetBody>
    </SheetContent>
  );
}

export function BillPaymentOffcanvas({
  open,
  onOpenChange,
  editPaymentId = null,
  preselectBillId = null,
  preselectVendorId = null,
  preselectJobOrderId = null,
  onSuccess,
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <BillPaymentOffcanvasBody
          key={`${editPaymentId || 'new'}-${preselectBillId || ''}-${preselectVendorId || ''}-${preselectJobOrderId || ''}`}
          onOpenChange={onOpenChange}
          editPaymentId={editPaymentId}
          preselectBillId={preselectBillId}
          preselectVendorId={preselectVendorId}
          preselectJobOrderId={preselectJobOrderId}
          onSuccess={onSuccess}
        />
      ) : null}
    </Sheet>
  );
}
