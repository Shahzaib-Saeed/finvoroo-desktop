import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import {
  hasPrepaidCash,
  prepaidCashAmount,
  prepaidNarrative,
} from "./prepaid-cash";

/**
 * Subtle inline prepaid chip for payment/receipt list rows.
 */
export function PrepaidInlineBadge({
  row,
  currency,
  amount,
  title,
  label = "Prepaid",
  className,
}) {
  if (row && !hasPrepaidCash(row)) return null;

  const resolvedAmount =
    amount ?? (row ? prepaidCashAmount(row) : 0);
  const resolvedCurrency = currency ?? row?.currency;
  const formatted =
    resolvedAmount > 0 && resolvedCurrency
      ? formatCurrency(resolvedAmount, resolvedCurrency)
      : "";
  const resolvedTitle =
    title ?? (row ? prepaidNarrative(row, formatted) : undefined);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-600",
        "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        className,
      )}
      title={resolvedTitle}
    >
      {label}
    </span>
  );
}
