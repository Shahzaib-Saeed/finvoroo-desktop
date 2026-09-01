import { cn } from "@/lib/utils";
import { ReportTableScroll } from "@/pages/accounting/reports/components/ReportTableScroll";
import { STATEMENT_AMOUNT_COL } from "@/pages/accounting/reports/components/report-typography";
import {
  PharmacyReportFooter,
  PharmacyReportHeader,
  formatReportDate,
  formatReportMoney,
} from "./PharmacyReportChrome";

function Amount({ value, signed = false, emphasize = false }) {
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

function RateValue({ rate, value, emphasize = false, signed = false }) {
  return (
    <div className="text-right">
      <Amount value={value} emphasize={emphasize} signed={signed} />
      <p className="text-[10px] tabular-nums text-slate-400">
        @ {formatReportMoney(rate)}
      </p>
    </div>
  );
}

export function StockValuationStatement({
  companyName,
  logoUrl,
  asOf,
  currency,
  fiscalYear,
  generatedBy,
  printedAt,
  groups = [],
  totals = {},
  warehouseName,
  truncated = false,
}) {
  return (
    <div className="stock-valuation-statement financial-summary-statement bg-white">
      <PharmacyReportHeader
        companyName={companyName}
        logoUrl={logoUrl}
        title="Stock Valuation"
        subtitle={`${warehouseName ? `${warehouseName} · ` : ""}as of ${formatReportDate(asOf)}`}
        currency={currency}
        fiscalYear={fiscalYear}
        generatedBy={generatedBy}
        printedAt={printedAt}
      />

      <div className="px-4 py-5 print:px-3 print:py-3 sm:px-8 sm:py-6">
        <div className="mb-5 print:mb-3">
          <h3 className="border-b border-slate-900 pb-1.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-900">
            Value by category
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            On-hand stock at purchase price, average cost, and sale price
          </p>
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No on-hand stock to value.
            </p>
          ) : (
            <ReportTableScroll className="mt-3">
              <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th className="py-2 pr-3 text-left font-semibold">Category</th>
                  <th className="py-2 pl-3 text-right font-semibold">Items</th>
                  <th className="py-2 pl-3 text-right font-semibold">Qty</th>
                  <th className="py-2 pl-3 text-right font-semibold">Purchase</th>
                  <th className="py-2 pl-3 text-right font-semibold">Average</th>
                  <th className="py-2 pl-3 text-right font-semibold">Sale</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr
                    key={group.category_id ?? "uncategorized"}
                    className="balance-sheet-row border-b border-slate-100"
                  >
                    <td className="py-1.5 pr-3 align-middle">
                      <p className="text-sm text-slate-800">
                        {group.category_name}
                      </p>
                      {group.category_code ? (
                        <p className="font-mono text-[11px] text-slate-400">
                          {group.category_code}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-1.5 pl-3 text-right text-sm tabular-nums text-slate-700">
                      {group.item_count}
                    </td>
                    <td className="py-1.5 pl-3 text-right text-sm tabular-nums text-slate-700">
                      {Number(group.qty || 0).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-1.5 pl-3">
                      <Amount value={group.purchase_value} />
                    </td>
                    <td className="py-1.5 pl-3">
                      <Amount value={group.average_value} />
                    </td>
                    <td className="py-1.5 pl-3">
                      <Amount value={group.sale_value} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900">
                  <td className="py-2.5 pr-3 text-sm font-bold uppercase tracking-wide text-slate-900">
                    Total
                    {truncated ? " (first 2,500 items)" : ""}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-sm font-semibold tabular-nums">
                    {Number(totals.items || 0).toLocaleString("en-US")}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-sm font-semibold tabular-nums">
                    {Number(totals.qty || 0).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2.5 pl-3">
                    <Amount value={totals.purchase} emphasize />
                  </td>
                  <td className="py-2.5 pl-3">
                    <Amount value={totals.average} emphasize />
                  </td>
                  <td className="py-2.5 pl-3">
                    <Amount value={totals.sale} emphasize />
                  </td>
                </tr>
              </tfoot>
            </table>
            </ReportTableScroll>
          )}
        </div>

        {groups.map((group) => (
          <section
            key={`detail-${group.category_id ?? "uncategorized"}`}
            className="mb-6 print:mb-4"
          >
            <div className="mb-2 flex flex-wrap items-end justify-between gap-3 border-b border-slate-900 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-900">
                {group.category_name}
              </h3>
              <p className="text-[11px] text-slate-500">
                {group.item_count} item{group.item_count === 1 ? "" : "s"}
                {group.share_percent != null
                  ? ` · ${Number(group.share_percent).toFixed(1)}% of stock`
                  : ""}
              </p>
            </div>
            <ReportTableScroll>
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th className="py-1.5 pr-3 text-left font-semibold">Item</th>
                  <th className="py-1.5 pl-3 text-right font-semibold">Qty</th>
                  <th className="py-1.5 pl-3 text-right font-semibold">
                    Purchase
                  </th>
                  <th className="py-1.5 pl-3 text-right font-semibold">
                    Average
                  </th>
                  <th className="py-1.5 pl-3 text-right font-semibold">Sale</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr
                    key={row.product_id}
                    className="border-b border-slate-100"
                  >
                    <td className="py-1.5 pr-3 align-top">
                      <p className="text-sm text-slate-800">{row.item}</p>
                      {row.sku ? (
                        <p className="text-[11px] text-slate-400">{row.sku}</p>
                      ) : null}
                    </td>
                    <td className="py-1.5 pl-3 align-top text-right text-sm tabular-nums text-slate-800">
                      {Number(row.qty || 0).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-1.5 pl-3 align-top">
                      <RateValue
                        rate={row.purchase_rate}
                        value={row.purchase_value}
                      />
                    </td>
                    <td className="py-1.5 pl-3 align-top">
                      <RateValue
                        rate={row.average_rate}
                        value={row.average_value}
                      />
                    </td>
                    <td className="py-1.5 pl-3 align-top">
                      <RateValue rate={row.sale_rate} value={row.sale_value} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-300">
                  <td className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Category total
                  </td>
                  <td className="py-2 pl-3 text-right text-sm font-semibold tabular-nums">
                    {Number(group.qty || 0).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2 pl-3">
                    <Amount value={group.purchase_value} emphasize />
                  </td>
                  <td className="py-2 pl-3">
                    <Amount value={group.average_value} emphasize />
                  </td>
                  <td className="py-2 pl-3">
                    <Amount value={group.sale_value} emphasize />
                  </td>
                </tr>
              </tfoot>
            </table>
            </ReportTableScroll>
          </section>
        ))}
      </div>

      <PharmacyReportFooter note="Purchase column = qty × catalog purchase price (reference only, not GL valuation). Average column = qty × FIFO/FEFO inventory cost from the ledger (official stock value; batch WAC or catalog fallback when no ledger cost). Sale column = qty × selling price. Totals and potential profit use Average, not Purchase. Only items with on-hand stock are listed unless zero stock is included." />
    </div>
  );
}
