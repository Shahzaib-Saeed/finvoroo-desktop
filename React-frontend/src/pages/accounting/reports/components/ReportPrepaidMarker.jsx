import { cn } from "@/lib/utils";
import { formatCurrency } from "../constants";
import {
  hasPrepaidCash,
  prepaidCashAmount,
  prepaidNarrative,
} from "../../shared/prepaid-cash";

/**
 * Compact amber prepaid chip for report tables (GL Jrnl / narrative).
 */
export function ReportPrepaidMarker({
  entry,
  currency,
  className,
  compact = false,
}) {
  if (!hasPrepaidCash(entry)) return null;

  const amount = prepaidCashAmount(entry);
  const formatted =
    amount > 0 && currency ? formatCurrency(amount, currency) : "";
  const title = prepaidNarrative(entry, formatted);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border font-semibold uppercase tracking-[0.08em]",
        "border-amber-300/80 bg-amber-50 text-amber-900",
        "dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200",
        compact
          ? "px-1 py-px text-[9px] leading-none"
          : "px-1.5 py-0.5 text-[10px] leading-tight",
        className,
      )}
      title={title}
    >
      Prepaid
    </span>
  );
}

/** Party + prepaid narrative for GL / statement description cells. */
export function ReportPrepaidDescription({
  entry,
  currency,
  mutedClassName,
  partyClassName,
}) {
  const desc = entry.line_description || entry.entry_description || "";
  const prepaid = hasPrepaidCash(entry);
  const amount = prepaidCashAmount(entry);
  const isVendor =
    entry.party_type === "vendor" || entry.prepaid_side === "vendor";
  const narrative = prepaid
    ? isVendor
      ? "Prepaid — not applied to a bill"
      : "Prepaid — not applied to an invoice"
    : null;
  const muted = mutedClassName || "text-slate-600";
  const partyCls = partyClassName || "font-medium text-slate-800 dark:text-slate-100";

  if (entry.party_name) {
    return (
      <span className="min-w-0 break-words">
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className={partyCls}>{entry.party_name}</span>
          {prepaid ? (
            <ReportPrepaidMarker entry={entry} currency={currency} compact />
          ) : null}
        </span>
        {narrative ? (
          <span className="block text-[12px] text-amber-800/90 dark:text-amber-200/90">
            {narrative}
            {amount > 0 && currency ? (
              <span className="tabular-nums text-amber-700/80 dark:text-amber-300/80">
                {" "}
                · {formatCurrency(amount, currency)}
              </span>
            ) : null}
          </span>
        ) : desc ? (
          <span className={muted}> — {desc}</span>
        ) : null}
        {prepaid && desc && !/prepaid|unapplied|on.?account/i.test(desc) ? (
          <span className={`block text-[11px] ${muted}`}> — {desc}</span>
        ) : null}
      </span>
    );
  }

  if (prepaid) {
    return (
      <span className="min-w-0 break-words">
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <ReportPrepaidMarker entry={entry} currency={currency} compact />
          <span className="text-[12px] text-amber-800/90 dark:text-amber-200/90">
            {narrative}
            {amount > 0 && currency ? (
              <span className="tabular-nums"> · {formatCurrency(amount, currency)}</span>
            ) : null}
          </span>
        </span>
        {desc ? <span className={muted}> — {desc}</span> : null}
      </span>
    );
  }

  return desc || "—";
}
