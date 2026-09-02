import { cn } from "@/lib/utils";
import { ReportTableScroll } from "@/pages/accounting/reports/components/ReportTableScroll";
import {
  PharmacyReportFooter,
  PharmacyReportHeader,
  formatReportDate,
  formatReportMoney,
} from "./PharmacyReportChrome";

function Amount({ value, signed = false, emphasize = false, muted = false }) {
  const n = Number(value);
  const negative = Number.isFinite(n) && n < -0.004;
  const positive = signed && Number.isFinite(n) && n > 0.004;

  return (
    <span
      className={cn(
        "tabular-nums",
        emphasize && "font-semibold",
        muted && "text-muted-foreground",
        negative && "text-red-700",
        positive && "text-emerald-700",
      )}
    >
      {formatReportMoney(value)}
    </span>
  );
}

function QtyCell({ value }) {
  return (
    <span className="tabular-nums text-foreground/90">
      {Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
    </span>
  );
}

const TABLE_HEAD =
  "border-b border-border/70 bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

function ValuationTableHead({ showItem = true }) {
  return (
    <thead>
      <tr className={TABLE_HEAD}>
        {showItem ? <th className="px-3 py-2 text-left">Item</th> : null}
        {!showItem ? <th className="px-3 py-2 text-left">Category</th> : null}
        {!showItem ? (
          <th className="px-3 py-2 text-right">Items</th>
        ) : (
          <th className="px-3 py-2 text-right">Qty</th>
        )}
        {showItem ? null : <th className="px-3 py-2 text-right">Qty</th>}
        <th className="px-3 py-2 text-right">Purchase</th>
        <th className="px-3 py-2 text-right">Average</th>
        <th className="px-3 py-2 text-right">Sale</th>
      </tr>
    </thead>
  );
}

function CategorySummaryTable({ groups, totals, truncated }) {
  if (!groups.length) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 px-4 py-14 text-center">
        <p className="text-sm font-medium text-foreground">No on-hand stock to value</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try a different warehouse or include zero-stock items.
        </p>
      </div>
    );
  }

  return (
    <ReportTableScroll>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <ValuationTableHead showItem={false} />
        <tbody>
          {groups.map((group) => (
            <tr
              key={group.category_id ?? "uncategorized"}
              className="border-b border-border/40 transition-colors hover:bg-muted/20"
            >
              <td className="px-3 py-2.5 align-middle">
                <p className="font-medium text-foreground">{group.category_name}</p>
                {group.category_code ? (
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {group.category_code}
                  </p>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-right align-middle">
                <QtyCell value={group.item_count} />
              </td>
              <td className="px-3 py-2.5 text-right align-middle">
                <QtyCell value={group.qty} />
              </td>
              <td className="px-3 py-2.5 text-right align-middle">
                <Amount value={group.purchase_value} />
              </td>
              <td className="px-3 py-2.5 text-right align-middle">
                <Amount value={group.average_value} />
              </td>
              <td className="px-3 py-2.5 text-right align-middle">
                <Amount value={group.sale_value} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-foreground/80 bg-muted/20 font-semibold">
            <td className="px-3 py-2.5 text-xs uppercase tracking-wide">
              Total{truncated ? " (first 2,500 items)" : ""}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
              {Number(totals.items || 0).toLocaleString("en-US")}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
              <QtyCell value={totals.qty} />
            </td>
            <td className="px-3 py-2.5 text-right">
              <Amount value={totals.purchase} emphasize />
            </td>
            <td className="px-3 py-2.5 text-right">
              <Amount value={totals.average} emphasize />
            </td>
            <td className="px-3 py-2.5 text-right">
              <Amount value={totals.sale} emphasize />
            </td>
          </tr>
        </tfoot>
      </table>
    </ReportTableScroll>
  );
}

function CategoryGroupRow({ group }) {
  return (
    <tr className="border-y border-border/60 bg-muted/40">
      <td colSpan={8} className="px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {group.category_name}
            </p>
            {group.category_code ? (
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {group.category_code}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 text-[11px] text-muted-foreground">
            {group.item_count} item{group.item_count === 1 ? "" : "s"}
            {group.share_percent != null
              ? ` · ${Number(group.share_percent).toFixed(1)}% of stock`
              : ""}
          </p>
        </div>
      </td>
    </tr>
  );
}

function ItemDetailTable({ groups, totals, truncated }) {
  const hasRows = groups.some((g) => (g.rows || []).length > 0);

  if (!hasRows) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 px-4 py-14 text-center">
        <p className="text-sm font-medium text-foreground">No item lines to show</p>
      </div>
    );
  }

  return (
    <ReportTableScroll>
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className={TABLE_HEAD}>
            <th className="px-3 py-2 text-left" rowSpan={2}>
              Item
            </th>
            <th className="px-3 py-2 text-right" rowSpan={2}>
              Qty
            </th>
            <th className="border-l border-border/50 px-3 py-2 text-center" colSpan={2}>
              Purchase
            </th>
            <th className="border-l border-border/50 px-3 py-2 text-center" colSpan={2}>
              Average
            </th>
            <th className="border-l border-border/50 px-3 py-2 text-center" colSpan={2}>
              Sale
            </th>
          </tr>
          <tr className={cn(TABLE_HEAD, "text-[10px]")}>
            <th className="border-l border-border/50 px-3 py-1.5 text-right">Rate</th>
            <th className="px-3 py-1.5 text-right">Value</th>
            <th className="border-l border-border/50 px-3 py-1.5 text-right">Rate</th>
            <th className="px-3 py-1.5 text-right">Value</th>
            <th className="border-l border-border/50 px-3 py-1.5 text-right">Rate</th>
            <th className="px-3 py-1.5 text-right">Value</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const rows = group.rows || [];
            if (!rows.length) return null;

            return [
              <CategoryGroupRow key={`head-${group.category_id ?? "uncategorized"}`} group={group} />,
              ...rows.map((row) => (
                <tr
                  key={row.product_id}
                  className="border-b border-border/40 transition-colors hover:bg-muted/15"
                >
                  <td className="px-3 py-2 align-top">
                    <p className="font-medium text-foreground">{row.item}</p>
                    {row.sku ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{row.sku}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <QtyCell value={row.qty} />
                  </td>
                  <td className="border-l border-border/30 px-3 py-2 text-right align-top">
                    <Amount value={row.purchase_rate} muted />
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <Amount value={row.purchase_value} />
                  </td>
                  <td className="border-l border-border/30 px-3 py-2 text-right align-top">
                    <Amount value={row.average_rate} muted />
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <Amount value={row.average_value} />
                  </td>
                  <td className="border-l border-border/30 px-3 py-2 text-right align-top">
                    <Amount value={row.sale_rate} muted />
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <Amount value={row.sale_value} />
                  </td>
                </tr>
              )),
              <tr
                key={`foot-${group.category_id ?? "uncategorized"}`}
                className="border-b border-border/60 bg-muted/15 text-xs"
              >
                <td className="px-3 py-2 font-medium uppercase tracking-wide text-muted-foreground">
                  Category total
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  <QtyCell value={group.qty} />
                </td>
                <td className="border-l border-border/30 px-3 py-2" />
                <td className="px-3 py-2 text-right">
                  <Amount value={group.purchase_value} emphasize />
                </td>
                <td className="border-l border-border/30 px-3 py-2" />
                <td className="px-3 py-2 text-right">
                  <Amount value={group.average_value} emphasize />
                </td>
                <td className="border-l border-border/30 px-3 py-2" />
                <td className="px-3 py-2 text-right">
                  <Amount value={group.sale_value} emphasize />
                </td>
              </tr>,
            ];
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-foreground/80 bg-muted/20 font-semibold">
            <td className="px-3 py-2.5 text-xs uppercase tracking-wide">
              Grand total{truncated ? " (first 2,500 items)" : ""}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
              <QtyCell value={totals.qty} />
            </td>
            <td className="border-l border-border/30 px-3 py-2.5" colSpan={2}>
              <div className="text-right">
                <Amount value={totals.purchase} emphasize />
              </div>
            </td>
            <td className="border-l border-border/30 px-3 py-2.5" colSpan={2}>
              <div className="text-right">
                <Amount value={totals.average} emphasize />
              </div>
            </td>
            <td className="border-l border-border/30 px-3 py-2.5" colSpan={2}>
              <div className="text-right">
                <Amount value={totals.sale} emphasize />
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </ReportTableScroll>
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
  view = "summary",
  compact = false,
}) {
  const subtitle = [
    warehouseName,
    `as of ${formatReportDate(asOf)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const showSummary = view === "summary" || view === "full";
  const showDetail = view === "items" || view === "full";

  return (
    <div className="stock-valuation-statement bg-card">
      <PharmacyReportHeader
        companyName={companyName}
        logoUrl={logoUrl}
        title="Stock Valuation"
        subtitle={subtitle}
        currency={currency}
        fiscalYear={fiscalYear}
        generatedBy={generatedBy}
        printedAt={printedAt}
        compact={compact}
      />

      <div className={cn("space-y-6 px-4 py-4 sm:px-5", compact && "px-3 py-3 print:px-4 print:py-3")}>
        {showSummary ? (
          <section
            className={cn(
              view === "items" && "hidden print:block",
            )}
          >
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">By category</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  On-hand stock at purchase, average cost, and sale price
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-border/70">
              <CategorySummaryTable groups={groups} totals={totals} truncated={truncated} />
            </div>
          </section>
        ) : null}

        {showDetail ? (
          <section
            className={cn(
              view === "summary" && "hidden print:block",
            )}
          >
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">Item detail</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Rate and extended value for each product on hand
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border/70">
              <ItemDetailTable groups={groups} totals={totals} truncated={truncated} />
            </div>
          </section>
        ) : null}
      </div>

      <PharmacyReportFooter note="Purchase = qty × catalog purchase price (reference only). Average = qty × FIFO/FEFO inventory cost (official stock value). Sale = qty × selling price. Potential profit uses Average, not Purchase." />
    </div>
  );
}
