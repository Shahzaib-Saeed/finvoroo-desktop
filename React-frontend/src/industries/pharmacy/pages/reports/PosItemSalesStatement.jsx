import { cn } from "@/lib/utils";
import { ReportTableScroll } from "@/pages/accounting/reports/components/ReportTableScroll";
import { STATEMENT_AMOUNT_COL } from "@/pages/accounting/reports/components/report-typography";
import {
  PharmacyReportFooter,
  PharmacyReportHeader,
  formatReportDate,
  formatReportMoney,
} from "./PharmacyReportChrome";

function Amount({ value, signed = false, emphasize = false, unavailable = false }) {
  if (unavailable) {
    return (
      <span
        className={cn(STATEMENT_AMOUNT_COL, "w-auto max-w-none text-amber-700")}
        title="Inventory cost unavailable — profit cannot be calculated"
      >
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
        STATEMENT_AMOUNT_COL,
        "w-auto max-w-none",
        emphasize && "font-semibold",
        negative && "text-red-700",
        positive && "text-emerald-800",
      )}
    >
      {formatReportMoney(value)}
    </span>
  );
}

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
}) {
  return (
    <div className="pos-item-sales-statement financial-summary-statement bg-white">
      <PharmacyReportHeader
        companyName={companyName}
        logoUrl={logoUrl}
        title="Item-wise POS Sales"
        subtitle={`${formatReportDate(periodFrom)} – ${formatReportDate(periodTo)}`}
        currency={currency}
        fiscalYear={fiscalYear}
        generatedBy={generatedBy}
        printedAt={printedAt}
      />

      <div className="px-4 py-5 print:px-3 print:py-3 sm:px-8 sm:py-6">
        <div className="mb-4 print:mb-2">
          <h3 className="border-b border-slate-900 pb-1.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-900">
            Counter sales register
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Who sold, when, qty, rate, discount, and profit (ledger COGS only)
          </p>
          {!totals.profit_complete && Number(totals.missing_ledger_cogs_lines || 0) > 0 ? (
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {totals.missing_ledger_cogs_lines} sale line
              {totals.missing_ledger_cogs_lines === 1 ? "" : "s"} missing inventory cost in the
              ledger. Profit excludes those lines — catalog purchase price is never substituted.
            </p>
          ) : null}
        </div>

        <ReportTableScroll>
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <th className="py-2 pr-3 text-left font-semibold">Item</th>
                <th className="py-2 pr-3 text-left font-semibold">Sold by</th>
                <th className="whitespace-nowrap py-2 pr-3 text-left font-semibold">
                  Date
                </th>
                <th className="whitespace-nowrap py-2 pr-3 text-left font-semibold">
                  Time
                </th>
                <th className="py-2 pl-3 text-right font-semibold">Qty</th>
                <th className="py-2 pl-3 text-right font-semibold">Rate</th>
                <th className="py-2 pl-3 text-right font-semibold">Discount</th>
                <th className="py-2 pl-3 text-right font-semibold">Sale</th>
                <th className="py-2 pl-3 text-right font-semibold">Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-sm text-slate-400"
                  >
                    No posted counter sales in this period.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.line_id}
                    className="balance-sheet-row border-b border-slate-100"
                  >
                    <td className="py-1.5 pr-3 align-top">
                      <p className="text-sm text-slate-800">{row.item}</p>
                      <p className="text-[11px] text-slate-400">
                        {row.invoice_number}
                        {row.sku ? ` · ${row.sku}` : ""}
                      </p>
                    </td>
                    <td className="py-1.5 pr-3 align-top text-sm text-slate-700">
                      {row.sold_by || "—"}
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-3 align-top text-sm text-slate-700">
                      {formatReportDate(row.date) || "—"}
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-3 align-top text-sm text-slate-700">
                      {formatTime(row.time)}
                    </td>
                    <td className="py-1.5 pl-3 align-top text-right text-sm tabular-nums text-slate-800">
                      {Number(row.qty || 0).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-1.5 pl-3 align-top">
                      <Amount value={row.rate} />
                    </td>
                    <td className="py-1.5 pl-3 align-top">
                      <Amount value={row.discount} />
                    </td>
                    <td className="py-1.5 pl-3 align-top">
                      <Amount value={row.sale} />
                    </td>
                    <td className="py-1.5 pl-3 align-top">
                      <Amount
                        value={row.profit}
                        signed
                        unavailable={row.profit_available === false}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900">
                <td
                  colSpan={4}
                  className="py-2.5 pr-3 text-sm font-bold uppercase tracking-wide text-slate-900"
                >
                  Total
                  {truncated ? " (first 2,000 lines)" : ""}
                </td>
                <td className="py-2.5 pl-3 text-right text-sm font-semibold tabular-nums">
                  {Number(totals.qty || 0).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td />
                <td className="py-2.5 pl-3">
                  <Amount value={totals.discount} emphasize />
                </td>
                <td className="py-2.5 pl-3">
                  <Amount value={totals.sale} emphasize />
                </td>
                <td className="py-2.5 pl-3">
                  <Amount
                    value={totals.profit}
                    emphasize
                    signed
                    unavailable={totals.profit_complete === false}
                  />
                </td>
              </tr>
            </tfoot>
          </table>
        </ReportTableScroll>
      </div>

      <PharmacyReportFooter note="Posted counter sales only. Profit uses inventory-ledger COGS (FIFO/FEFO), not catalog purchase price. Lines without a ledger cost show unavailable profit. Draft, cancelled, and void receipts are excluded." />
    </div>
  );
}
