import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PharmacyKbd } from './PharmacyKbd';
import { cn } from '@/lib/utils';

function Metric({ label, value, className }) {
  return (
    <div className={cn('min-w-[5rem]', className)}>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

/** Sticky totals bar for invoice scan review — POS emerald style. */
export function PurchaseScanSummaryBar({
  summary,
  money,
  unmatchedCount = 0,
  verifyCount = 0,
  pagesDone = 0,
  pagesTotal = 0,
  onContinue,
  disabled = false,
}) {
  const hasPages = pagesTotal > 0;
  const pageLabel = hasPages
    ? `${pagesDone}/${pagesTotal} page${pagesTotal === 1 ? '' : 's'}`
    : null;

  return (
    <div className="shrink-0 border-t border-slate-100 bg-white">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="text-[11px] font-medium text-slate-500">Invoice total</p>
            <p className="text-2xl font-bold tabular-nums leading-none text-emerald-950">
              {money(summary.netAmount)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {summary.items} line{summary.items === 1 ? '' : 's'}
              {pageLabel ? ` · ${pageLabel}` : ''}
            </p>
          </div>
          <Metric label="Subtotal" value={money(summary.subtotal)} />
          <Metric label="Discount" value={money(summary.discountTotal)} />
          <Metric label="Sales tax" value={money(summary.taxTotal)} />
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {unmatchedCount > 0 ? (
            <p className="text-[11px] font-medium text-red-600">
              {unmatchedCount} not linked — match before posting
            </p>
          ) : verifyCount > 0 ? (
            <p className="text-[11px] font-medium text-amber-700">
              {verifyCount} link{verifyCount === 1 ? '' : 's'} to verify
            </p>
          ) : (
            <p className="text-[11px] font-medium text-emerald-700">Ready for receive</p>
          )}
          <Button
            type="button"
            size="lg"
            className="h-11 bg-emerald-700 px-5 font-semibold hover:bg-emerald-800"
            disabled={disabled}
            onClick={onContinue}
          >
            Continue to Receive
            <ArrowRight className="size-4 ms-2" />
            <PharmacyKbd className="ms-2 hidden border-emerald-500/30 bg-emerald-600/20 text-white sm:inline-flex">
              Ctrl+Enter
            </PharmacyKbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
