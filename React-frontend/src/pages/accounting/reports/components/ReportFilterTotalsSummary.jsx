import { formatCurrency } from "../constants";

export function ReportFilterTotalsSummary({ recordCount, totals, currency }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-white px-2.5 py-1.5 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200/70">
      <span>
        <span className="font-semibold tabular-nums text-slate-900">
          {recordCount ?? 0}
        </span>{" "}
        lines
      </span>
      <span className="hidden h-3 w-px bg-slate-200 sm:block" aria-hidden />
      <span>
        Debit{" "}
        <span className="font-semibold tabular-nums text-slate-900">
          {formatCurrency(totals?.total_debit ?? 0, currency)}
        </span>
      </span>
      <span className="hidden h-3 w-px bg-slate-200 sm:block" aria-hidden />
      <span>
        Credit{" "}
        <span className="font-semibold tabular-nums text-slate-900">
          {formatCurrency(totals?.total_credit ?? 0, currency)}
        </span>
      </span>
    </div>
  );
}
