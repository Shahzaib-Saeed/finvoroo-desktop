import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { billPaymentsApi } from '@/pages/accounting/bill-payments/api/bill-payments.api';
import {
  APPROVAL_COLORS,
  formatCurrency,
  PAYMENT_METHODS,
} from '@/pages/accounting/bill-payments/constants';
import { DocumentDrillLink } from '@/components/workspace/invoice/components/DocumentDrillLink';
import { buildBillUrl } from '@/pages/accounting/reports/report-drilldown';
import { documentNumberLabel } from '@/pages/accounting/lib/documentNumber';
import { cn } from '@/lib/utils';

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="font-medium break-words">{value || '—'}</span>
    </div>
  );
}

export function BillPaymentDetailsPanel({ paymentId, workspaceId }) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPayment = useCallback(async () => {
    if (!paymentId) return;
    setLoading(true);
    try {
      const res = await billPaymentsApi.show(paymentId);
      setPayment(res.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load bill payment');
      setPayment(null);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    setPayment(null);
    fetchPayment();
  }, [fetchPayment]);

  const totalApplied = useMemo(() => {
    if (!payment?.applications?.length) return 0;
    return payment.applications.reduce(
      (sum, app) => sum + (Number(app.amount_applied) || 0),
      0,
    );
  }, [payment]);

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
        <Wallet className="size-10 opacity-50" />
        <p className="text-sm">Bill payment not found</p>
      </div>
    );
  }

  const currency = payment.currency || 'USD';
  const methodLabel =
    PAYMENT_METHODS.find((m) => m.value === payment.payment_method)?.label ||
    payment.payment_method;
  const approval = payment.approval_status || 'approved';

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="px-5 py-4 max-w-3xl mx-auto space-y-4">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 mb-1">
                Vendor payment
              </p>
              <p className="text-lg font-semibold">{documentNumberLabel(payment.payment_number, payment.reference)}</p>
              {payment.vendor?.name ? (
                <p className="text-sm text-muted-foreground mt-1">{payment.vendor.name}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn('capitalize', APPROVAL_COLORS[approval] || '')}
              >
                {approval}
              </Badge>
              {methodLabel ? (
                <Badge variant="secondary" className="capitalize">
                  {methodLabel}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="px-5 py-4 border-b">
            <InfoRow
              label="Payment date"
              value={payment.payment_date_display || payment.payment_date}
            />
            <InfoRow label="Amount" value={formatCurrency(payment.amount, currency)} />
            <InfoRow label="Total applied" value={formatCurrency(totalApplied, currency)} />
            {payment.reference ? <InfoRow label="Reference" value={payment.reference} /> : null}
          </div>

          {(payment.applications || []).length > 0 ? (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                Applied to bills
              </p>
              <div className="space-y-2">
                {payment.applications.map((app) => {
                  const billHref =
                    app.bill_id && workspaceId
                      ? buildBillUrl(workspaceId, app.bill_id)
                      : null;
                  return (
                    <div
                      key={app.id}
                      className="flex items-center justify-between gap-3 text-sm p-3 rounded-lg border bg-muted/20"
                    >
                      <DocumentDrillLink
                        workspaceId={workspaceId}
                        href={billHref}
                        className="font-medium"
                      >
                        {documentNumberLabel(app.bill_number)}
                      </DocumentDrillLink>
                      <span className="font-medium tabular-nums shrink-0">
                        {formatCurrency(app.amount_applied, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ScrollArea>
  );
}
