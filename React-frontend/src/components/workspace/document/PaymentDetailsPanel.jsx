import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { paymentsApi } from '@/pages/accounting/payments/api/payments.api';
import { resolveDepositAccountLabel } from '@/pages/accounting/payments/constants';
import { PaymentReceiptDocument } from '@/pages/accounting/payments/components/PaymentReceiptDocument';

export function PaymentDetailsPanel({ paymentId, workspaceId }) {
  const [payment, setPayment] = useState(null);
  const [depositAccounts, setDepositAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayment = useCallback(async () => {
    if (!paymentId) return;
    setLoading(true);
    try {
      const [showRes, optRes] = await Promise.all([
        paymentsApi.show(paymentId),
        paymentsApi.formOptions(),
      ]);
      setPayment(showRes.data?.data || null);
      setDepositAccounts(optRes.data?.data?.deposit_accounts || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load payment');
      setPayment(null);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    setPayment(null);
    fetchPayment();
  }, [fetchPayment]);

  const depositAccountLabel = useMemo(
    () => resolveDepositAccountLabel(depositAccounts, payment?.deposit_account_id),
    [depositAccounts, payment?.deposit_account_id],
  );

  if (!paymentId) return null;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-3 py-16 text-muted-foreground">
        <Receipt className="size-10 opacity-50" />
        <p className="text-sm">Payment not found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="px-5 py-4">
        <div className="max-w-[800px] mx-auto w-full min-w-0">
          <PaymentReceiptDocument
            payment={payment}
            workspaceId={workspaceId}
            depositAccountLabel={depositAccountLabel}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
