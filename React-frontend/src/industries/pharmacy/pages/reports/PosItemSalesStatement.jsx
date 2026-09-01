import { cn } from "@/lib/utils";
import { ReportTableScroll } from "@/pages/accounting/reports/components/ReportTableScroll";
import {
  PharmacyReportFooter,
  PharmacyReportHeader,
  formatReportDate,
  formatReportMoney,
} from "./PharmacyReportChrome";

function formatTime(value) {
  if (!value) return "—";
  const t = String(value).slice(0, 8);
  if (t.length < 5) return "—";
  const [hh, mm] = t.split(":");
  const hour = Number(hh);
  if (!Number.isFinite(hour)) return t;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
}

function AmountCell({ value, signed = false, unavailable = false }) {
  if (unavailable) {
    return (
      <span className="text-amber-700" title="Inventory cost unavailable">
        —
      </span>
    );
  }

  const n = Number(value);
  const negative = Number.isFinite(n) && n < -0.004;
  const positive = signed && Number.isFinite(n) && n > 0.004;

  return (
    <span
      className={cn(
        "tabular-nums",
        negative && "text-red-700",
        positive && "text-emerald-700",
      )}
    >
      {formatReportMoney(value)}
    </span>
  );
}

export function PosItemSalesStatement({
  companyName,
  logoUrl,
  periodFrom,
  periodTo,
  currency,
  fiscalYear,
  generatedBy,
  printedAt,
  rows = [],
  totals = {},
  truncated = false,
  compact = false,
}) {
  const periodLabel = `${formatReportDate(periodFrom)} – ${formatReportDate(periodTo)}`;

  return (
    <div className="pos-item-sales-statement bg-card">
      <PharmacyReportHeader
        companyName={companyName}
        logoUrl={logoUrl}
        title="Item-wise POS Sales"
        subtitle={periodLabel}
        currency={currency}
        fiscalYear={fiscalYear}
        generatedBy={generatedBy}
        printedAt={printedAt}
        compact={compact}
      />

      <div className={cn("px-4 py-4 sm:px-5", compact && "px-3 py-3 print:px-4 print:py-3")}>
        {!totals.profit_complete && Number(totals.missing_ledger_cogs_lines || 0) > 0 ? (
          <p className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {totals.missing_ledger_cogs_lines} line
            {totals.missing_ledger_cogs_lines === 1 ? "" : "s"} missing ledger COGS — profit
            excludes those lines.
          </p>
        ) : null}

        <ReportTableScroll>
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Sold by</th>
                <th className="whitespace-nowrap px-3 py-2">Date</th>
                <th className="whitespace-nowrap px-3 py-2">Time</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Discount</th>
                <th className="px-3 py-2 text-right">Sale</th>
                <th className="px-3 py-2 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center">
                    <p className="text-sm font-medium text-foreground">
                      No posted counter sales in this period
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Try widening the date range to this month or last 30 days.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.line_id}
                    className="border-b border-border/40 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium text-foreground">{row.item}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {row.invoice_number}
                        {row.sku ? ` · ${row.sku}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2 align-top text-foreground/90">
                      {row.sold_by || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-foreground/90">
                      {formatReportDate(row.date) || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-foreground/90">
                      {formatTime(row.time)}
                    </td>
                    <td className="px-3 py-2 text-right align-top tabular-nums">
                      {Number(row.qty || 0).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <AmountCell value={row.rate} />
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <AmountCell value={row.discount} />
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <AmountCell value={row.sale} />
                    </td>
                    <td className="px-3 py-2 text-right align-top font-medium">
                      <AmountCell
                        value={row.profit}
                        signed
                        unavailable={row.profit_available === false}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-foreground/80 bg-muted/20 font-semibold">
                  <td colSpan={4} className="px-3 py-2.5 text-xs uppercase tracking-wide">
                    Total{truncated ? " (first 2,000 lines)" : ""}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {Number(totals.qty || 0).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-right">
                    <AmountCell value={totals.discount} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <AmountCell value={totals.sale} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <AmountCell
                      value={totals.profit}
                      signed
                      unavailable={totals.profit_complete === false}
                    />
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </ReportTableScroll>
      </div>

      <PharmacyReportFooter note="Posted counter sales only. Profit uses inventory-ledger COGS (FIFO/FEFO). Draft, cancelled, and void receipts are excluded." />
    </div>
  );
}
