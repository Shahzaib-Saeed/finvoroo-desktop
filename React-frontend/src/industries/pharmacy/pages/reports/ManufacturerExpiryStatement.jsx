import { cn } from "@/lib/utils";
import { ReportTableScroll } from "@/pages/accounting/reports/components/ReportTableScroll";
import { STATEMENT_AMOUNT_COL } from "@/pages/accounting/reports/components/report-typography";
import {
  PharmacyReportFooter,
  PharmacyReportHeader,
  formatReportDate,
  formatReportMoney,
} from "./PharmacyReportChrome";

function Amount({ value, emphasize = false }) {
  return (
    <span className={cn(STATEMENT_AMOUNT_COL, "w-auto max-w-none", emphasize && "font-semibold")}>
      {formatReportMoney(value)}
    </span>
  );
}

function statusLabel(row) {
  if (row.status === "expired") {
    const days = Math.abs(Number(row.days_until_expiry) || 0);
    return days ? `Expired ${days}d` : "Expired";
  }
  if (row.status === "near") {
    return `${Number(row.days_until_expiry)}d left`;
  }
  if (row.days_until_expiry != null) {
    return `${Number(row.days_until_expiry)}d left`;
  }
  return "—";
}

export function ManufacturerExpiryStatement({
  companyName,
  logoUrl,
  asOf,
  currency,
  fiscalYear,
  generatedBy,
  printedAt,
  groups = [],
  totals = {},
  mode = "all",
  withinDays = 90,
}) {
  const modeLabel =
    mode === "expired"
      ? "Expired stock on hand"
      : mode === "near"
        ? `Expiring within ${withinDays} days`
        : "All on-hand items with expiry";

  return (
    <div className="manufacturer-expiry-statement financial-summary-statement bg-white">
      <PharmacyReportHeader
        companyName={companyName}
        logoUrl={logoUrl}
        title="Manufacturer-wise Expiry"
        subtitle={`${modeLabel} · as of ${formatReportDate(asOf)}`}
        currency={currency}
        fiscalYear={fiscalYear}
        generatedBy={generatedBy}
        printedAt={printedAt}
      />

      <div className="px-6 py-5 print:px-4 print:py-3 sm:px-8 sm:py-6">
        {groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No on-hand batches with expiry in this view.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.manufacturer_id || group.manufacturer_name} className="mb-6 print:mb-4">
              <div className="mb-2 flex items-end justify-between gap-3 border-b border-slate-900 pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-900">
                  {group.manufacturer_name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {group.item_count} batch{group.item_count === 1 ? "" : "es"}
                  {group.expired ? ` · ${group.expired} expired` : ""}
                  {group.near ? ` · ${group.near} near` : ""}
                </p>
              </div>
              <ReportTableScroll>
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <th className="py-1.5 pr-3 text-left font-semibold">Item</th>
                    <th className="py-1.5 pr-3 text-left font-semibold">Batch</th>
                    <th className="py-1.5 pr-3 text-left font-semibold">Expiry</th>
                    <th className="py-1.5 pr-3 text-left font-semibold">Status</th>
                    <th className="py-1.5 pr-3 text-left font-semibold">Warehouse</th>
                    <th className="py-1.5 pl-3 text-right font-semibold">Qty</th>
                    <th className="py-1.5 pl-3 text-right font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr
                      key={`${row.batch_id}-${row.warehouse_id ?? "none"}`}
                      className={cn(
                        "border-b border-slate-100",
                        row.status === "expired" && "bg-red-50/70",
                        row.status === "near" && "bg-amber-50/60",
                      )}
                    >
                      <td className="py-1.5 pr-3 align-top">
                        <p className="text-sm text-slate-800">{row.item}</p>
                        {row.sku ? (
                          <p className="text-[11px] text-slate-400">{row.sku}</p>
                        ) : null}
                      </td>
                      <td className="py-1.5 pr-3 align-top text-sm text-slate-700">
                        {row.batch_number}
                      </td>
                      <td className="whitespace-nowrap py-1.5 pr-3 align-top text-sm text-slate-800">
                        {formatReportDate(row.expiry_date) || "—"}
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap py-1.5 pr-3 align-top text-sm",
                          row.status === "expired" && "font-medium text-red-700",
                          row.status === "near" && "font-medium text-amber-800",
                          row.status === "ok" && "text-slate-600",
                        )}
                      >
                        {statusLabel(row)}
                      </td>
                      <td className="py-1.5 pr-3 align-top text-sm text-slate-600">
                        {row.warehouse_name}
                      </td>
                      <td className="py-1.5 pl-3 align-top text-right text-sm tabular-nums text-slate-800">
                        {Number(row.qty || 0).toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-1.5 pl-3 align-top">
                        <Amount value={row.value} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </ReportTableScroll>
            </section>
          ))
        )}

        {groups.length > 0 ? (
          <div className="mt-2 flex items-center justify-between border-t-2 border-slate-900 pt-2.5 text-sm font-bold uppercase tracking-wide text-slate-900">
            <span>Total</span>
            <span className="flex items-center gap-6 font-semibold normal-case tracking-normal">
              <span className="tabular-nums">
                {Number(totals.qty || 0).toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}{" "}
                qty
              </span>
              <Amount value={totals.value} emphasize />
            </span>
          </div>
        ) : null}
      </div>

      <PharmacyReportFooter note="On-hand batches with an expiry date, grouped by manufacturer. Near expiry uses the selected window. Zero-stock batches are excluded." />
    </div>
  );
}
