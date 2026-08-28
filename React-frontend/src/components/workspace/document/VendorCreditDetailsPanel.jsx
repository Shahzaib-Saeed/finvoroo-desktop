import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { vendorCreditsApi } from '@/pages/accounting/vendor-credits/api/vendor-credits.api';
import {
  APPROVAL_COLORS,
  formatCurrency,
  STATUS_COLORS,
} from '@/pages/accounting/vendor-credits/constants';
import { DocumentDrillLink } from '@/components/workspace/invoice/components/DocumentDrillLink';
import { buildBillUrl } from '@/pages/accounting/reports/report-drilldown';
import { cn } from '@/lib/utils';

export function VendorCreditDetailsPanel({ vendorCreditId, workspaceId }) {
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCredit = useCallback(async () => {
    if (!vendorCreditId) return;
    setLoading(true);
    try {
      const res = await vendorCreditsApi.show(vendorCreditId);
      setCredit(res.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load vendor credit');
      setCredit(null);
    } finally {
      setLoading(false);
    }
  }, [vendorCreditId]);

  useEffect(() => {
    setCredit(null);
    fetchCredit();
  }, [fetchCredit]);

  if (!vendorCreditId) return null;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!credit) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-3 py-16 text-muted-foreground">
        <FileText className="size-10 opacity-50" />
        <p className="text-sm">Vendor credit not found</p>
      </div>
    );
  }

  const currency = credit.currency || credit.bill?.currency || 'USD';
  const status = credit.status || 'draft';
  const approval = credit.approval_status || 'approved';
  const remaining = Number(credit.remaining_amount) || 0;

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="px-5 py-4 max-w-3xl mx-auto">
        <div className="rounded-xl border bg-card p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{credit.credit_number}</p>
              <p className="text-sm text-muted-foreground">{credit.vendor?.name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn('capitalize', STATUS_COLORS[status] || '')}
              >
                {status}
              </Badge>
              <Badge
                variant="outline"
                className={cn('capitalize', APPROVAL_COLORS[approval] || '')}
              >
                {approval}
              </Badge>
            </div>
          </div>

          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Credit date</dt>
              <dd className="font-medium">
                {credit.credit_date_display || credit.credit_date || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold tabular-nums">
                {formatCurrency(credit.total, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Remaining</dt>
              <dd className="font-semibold tabular-nums text-primary">
                {formatCurrency(remaining, currency)}
              </dd>
            </div>
            {credit.bill ? (
              <div>
                <dt className="text-muted-foreground">Linked bill</dt>
                <dd>
                  <DocumentDrillLink
                    workspaceId={workspaceId}
                    href={buildBillUrl(workspaceId, credit.bill.id)}
                  >
                    {credit.bill.bill_number || `#${credit.bill.id}`}
                  </DocumentDrillLink>
                </dd>
              </div>
            ) : null}
          </dl>

          {credit.reason ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Reason:</span> {credit.reason}
            </p>
          ) : null}
        </div>
      </div>
    </ScrollArea>
  );
}
