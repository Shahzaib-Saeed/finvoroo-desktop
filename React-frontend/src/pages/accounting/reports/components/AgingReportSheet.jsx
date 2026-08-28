import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AGING_BUCKET_KEYS,
  AGING_BUCKET_LABELS,
  filterOpenLines,
  sumBucketTotals,
} from "../aging-report.lib";
import { reportStickySheetHeaderClass, reportStickyTheadBelowLetterheadClass } from "./report-sticky";
import { reportType } from "./report-typography";
import { formatPeachtreeAmount } from "./GeneralLedgerTable";
import { isReportCustomFieldColumn } from "./ReportCustomFieldDisplay";
import { getReportColumnLayout } from "../lib/report-column-layout";
import { ReportColumnResizeHandle } from "./ReportColumnResizeHandle";

function formatHeaderDate(value) {
  if (!value) return "";
  try {
    return format(parseISO(String(value).slice(0, 10)), "dd MMMM yyyy");
  } catch {
    return value;
  }
}

function formatBucketAmount(value, formatAmount) {
  const n = Number(value);
  if (Number.isNaN(n) || Math.abs(n) < 0.005) {
    return "—";
  }
  return formatAmount(n);
}

function CompanyLogoMark({ logoUrl, companyName }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="size-8 shrink-0 object-contain"
        style={{ width: 32, height: 32 }}
      />
    );
  }

  const words = String(companyName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase()
      : (words[0] ?? "C").slice(0, 2).toUpperCase();

  return (
    <div
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center border border-slate-300 bg-transparent text-[11px] font-semibold tracking-wide text-slate-600"
      style={{ width: 32, height: 32 }}
    >
      {initials}
    </div>
  );
}

function isStatement(variant) {
  return variant === "statement" || variant === "payables" || variant === "receivables";
}

function isLedgerVariant(variant) {
  return variant === "ledger";
}

function agingHeaderClass(variant) {
  if (isLedgerVariant(variant)) {
    return "text-xs font-bold uppercase tracking-[0.08em] text-slate-900 whitespace-nowrap";
  }
  if (isStatement(variant)) {
    return "text-[10px] font-semibold uppercase tracking-wider text-slate-600";
  }
  return "text-[10px] font-semibold uppercase tracking-wider text-slate-500";
}

function agingTableClass(variant) {
  if (isLedgerVariant(variant)) {
    return "general-ledger-table w-full table-fixed border-collapse text-sm leading-snug text-slate-700";
  }
  return "w-full min-w-[680px] border-collapse text-sm";
}

/** Fixed column layout for ledger-style aging summary (7 columns). */
const AGING_SUMMARY_COL_PCT = {
  party: "33%",
  bucket: "11%",
  total: "12%",
};

const AGING_DETAIL_COL_WEIGHT = {
  date: 7,
  bill_number: 11,
  invoice_number: 11,
  due_date: 7,
  po_number: 10,
  amount_due: 12,
  age: 5,
};

function computeAgingTablePercents(partyColumnKey, visibleColumns, widthById) {
  const keys = [partyColumnKey, ...visibleColumns.map((col) => col.id)];
  const total =
    keys.reduce((sum, key) => sum + (Number(widthById[key]) || 1), 0) || 1;
  return Object.fromEntries(
    keys.map((key) => [
      key,
      `${(((Number(widthById[key]) || 1) / total) * 100).toFixed(4)}%`,
    ]),
  );
}

function formatMatrixAmount(value, currency, formatAmount, ledger) {
  if (ledger) {
    const text = formatPeachtreeAmount(value);
    return text === "\u00a0" ? "—" : text;
  }
  return formatBucketAmount(value, (v) => formatAmount(v, currency));
}

function ledgerPartyTdClass() {
  return cn(
    "ledger-col-party max-w-0 px-2 py-1 align-middle text-sm font-semibold text-slate-900",
  );
}

function agingLedgerColRoleClass(col, partyColumnKey) {
  if (col.id === partyColumnKey) return "ledger-col-party";
  if (isReportCustomFieldColumn(col)) return "ledger-col-cf";
  if (col.id === "amount_due") return "ledger-col-money";
  if (col.id === "age") return "ledger-col-age";
  if (col.id === "date" || col.id === "due_date") return "ledger-col-date";
  if (col.id === "bill_number" || col.id === "invoice_number") return "ledger-col-ref";
  if (col.id === "po_number" || col.id === "ship_via" || col.id === "sales_rep") {
    return "ledger-col-data";
  }
  return "ledger-col-data";
}

function ledgerCenterTdClass(col, partyColumnKey = "party") {
  return cn(
    reportType.statementBody,
    "px-2 py-1 align-middle text-center max-w-0 overflow-hidden",
    agingLedgerColRoleClass(col, partyColumnKey),
    isReportCustomFieldColumn(col)
      ? "whitespace-normal break-words text-xs leading-snug"
      : "whitespace-nowrap tabular-nums",
  );
}

function ledgerCenterThClass() {
  return "text-center";
}

function ledgerMoneyTdClass(extra) {
  return cn(
    "ledger-col-money px-2 py-1 align-middle text-center text-sm tabular-nums whitespace-nowrap text-slate-700",
    extra,
  );
}

function ledgerMoneyThClass() {
  return "ledger-col-money text-center";
}

/**
 * Compact official financial-report header.
 * Statement variant: company / report title / period on separate left-aligned lines.
 */
export function AgingReportSheetHeader({
  companyName,
  companyLogoUrl,
  fiscalYear,
  generatedBy,
  reportTitle,
  asOf,
  periodFrom,
  periodTo,
  currency,
  printedAt,
  variant = "default",
}) {
  if (isStatement(variant)) {
    const title =
      reportTitle?.endsWith("Report") || reportTitle?.endsWith("report")
        ? reportTitle
        : `${reportTitle} Report`;

    let periodLine = null;
    if (asOf) {
      periodLine = `As of ${formatHeaderDate(asOf)}`;
    } else if (periodFrom || periodTo) {
      const fromLabel = periodFrom ? formatHeaderDate(periodFrom) : "…";
      const toLabel = periodTo ? formatHeaderDate(periodTo) : "…";
      periodLine = `${fromLabel} – ${toLabel}`;
    }

    return (
      <div
        className={cn(
          "aging-report-header flex items-start gap-3 border-b border-slate-200 px-5 py-3 sm:px-6",
          reportStickySheetHeaderClass,
        )}
      >
        <CompanyLogoMark logoUrl={companyLogoUrl} companyName={companyName} />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0 text-left">
            <h2 className="truncate text-[20px] font-semibold leading-tight tracking-tight text-slate-900">
              {companyName || "Company"}
            </h2>
            <p className="mt-1.5 truncate text-sm font-medium leading-snug text-slate-700">
              {title}
            </p>
            {periodLine ? (
              <p className="mt-1.5 text-xs leading-snug text-slate-500">
                {periodLine}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 pt-0.5 text-right text-[11px] leading-relaxed text-slate-400">
            {currency ? (
              <p className="font-medium uppercase tracking-wide text-slate-500">
                {currency}
              </p>
            ) : null}
            {fiscalYear ? <p>Fiscal Year: {fiscalYear}</p> : null}
            {generatedBy ? <p>Generated by {generatedBy}</p> : null}
            {printedAt ? <p>Generated on {printedAt}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "aging-report-header flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-2.5 sm:px-6",
        reportStickySheetHeaderClass,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold tracking-tight text-slate-900">
          {companyName || "Company"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {reportTitle}
          {asOf ? ` · As of ${formatHeaderDate(asOf)}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right text-[11px] leading-relaxed text-slate-400">
        {currency ? (
          <p className="font-semibold uppercase tracking-wide text-slate-500">
            {currency}
          </p>
        ) : null}
        {printedAt ? <p>Generated {printedAt}</p> : null}
      </div>
    </div>
  );
}

/** Quiet financial-report footer — flows at document end (no fixed positioning). */
export function AgingReportSheetFooter({ variant = "default" }) {
  if (isStatement(variant)) {
    return (
      <footer className="aging-report-footer aging-report-footer-print mt-3 border-t border-slate-200 px-5 py-3 text-center text-[10px] leading-relaxed text-slate-400 sm:px-6">
        <p>Generated by Finvoroo ERP</p>
        <p>Unaudited — For Management Purposes Only</p>
      </footer>
    );
  }

  return (
    <p className="border-t border-slate-100 px-5 py-2 text-center text-[11px] text-slate-400 sm:px-6">
      Unaudited — for management purposes only
    </p>
  );
}

export function AgingDetailSectionTitle({ title, variant = "default" }) {
  if (isLedgerVariant(variant)) {
    return null;
  }

  if (!isStatement(variant)) return null;

  return (
    <div className="aging-detail-section-title px-5 pb-2.5 pt-5 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" aria-hidden />
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </span>
        <div className="h-px flex-1 bg-slate-200" aria-hidden />
      </div>
    </div>
  );
}

/** Classic aging matrix — one row per party plus report totals. */
export function AgingSummaryMatrix({
  parties,
  getPartyName,
  renderPartyName,
  formatAmount,
  currency,
  partyLabel = "Name",
  variant = "default",
}) {
  if (!parties.length) return null;

  const polished = isStatement(variant);
  const ledger = isLedgerVariant(variant);
  const { buckets, total } = sumBucketTotals(parties);

  const headerClass = agingHeaderClass(variant);

  return (
    <div className={cn("aging-summary-matrix", ledger ? "px-3 py-2 sm:px-4" : "px-5 py-3 sm:px-6")}>
      <div className={ledger ? "w-full min-w-0 overflow-x-auto print:overflow-visible" : undefined}>
        <table className={agingTableClass(variant)} data-print-table>
          {ledger ? (
            <colgroup>
              <col style={{ width: AGING_SUMMARY_COL_PCT.party }} />
              {AGING_BUCKET_KEYS.map((key) => (
                <col key={key} style={{ width: AGING_SUMMARY_COL_PCT.bucket }} />
              ))}
              <col style={{ width: AGING_SUMMARY_COL_PCT.total }} />
            </colgroup>
          ) : null}
          <thead
            className={cn(
              ledger ? "bg-slate-50" : reportStickyTheadBelowLetterheadClass,
              !ledger && "bg-white shadow-[0_1px_0_0_rgb(226_232_240)]",
            )}
          >
            <tr className={ledger ? "" : "border-b border-slate-300 text-left"}>
              <th
                className={cn(
                  ledger
                    ? "h-8 border-b border-slate-200 px-2 py-1.5 text-left align-middle"
                    : "py-1.5 pr-3 text-left",
                  headerClass,
                )}
              >
                {partyLabel}
              </th>
              {AGING_BUCKET_KEYS.map((key) => (
                <th
                  key={key}
                  className={cn(
                    ledger
                      ? cn(
                          "h-8 border-b border-slate-200 px-2 py-1.5 align-middle",
                          ledgerMoneyThClass(),
                        )
                      : "px-2 py-1.5 text-right",
                    headerClass,
                  )}
                >
                  {AGING_BUCKET_LABELS[key]}
                </th>
              ))}
              <th
                className={cn(
                  ledger
                    ? cn(
                        "h-8 border-b border-slate-200 px-2 py-1.5 align-middle",
                        ledgerMoneyThClass(),
                      )
                    : "px-2 py-1.5 text-right",
                  headerClass,
                )}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {parties.map((party) => {
              const name = getPartyName(party);
              return (
                <tr
                  key={party.customer_id ?? party.vendor_id ?? name}
                  className={ledger ? "hover:bg-sky-50/40" : "border-b border-slate-100"}
                >
                  <td
                    className={cn(
                      ledger ? ledgerPartyTdClass() : "py-1.5 pr-3",
                      !ledger && polished && "font-semibold text-slate-900",
                      !ledger && !polished && "font-medium text-slate-800",
                    )}
                  >
                    {renderPartyName ? renderPartyName(party) : name}
                  </td>
                  {AGING_BUCKET_KEYS.map((key) => (
                    <td key={key} className={ledger ? ledgerMoneyTdClass() : cn("text-right tabular-nums text-slate-700 px-2 py-1.5")}>
                      {formatMatrixAmount(party[key], currency, formatAmount, ledger)}
                    </td>
                  ))}
                  <td className={ledger ? ledgerMoneyTdClass("font-semibold text-slate-900") : cn("text-right tabular-nums font-semibold text-slate-900 px-2 py-1.5")}>
                    {ledger
                      ? formatMatrixAmount(party.total ?? party.balance, currency, formatAmount, true)
                      : formatAmount(party.total ?? party.balance, currency)}
                  </td>
                </tr>
              );
            })}
            <tr
              className={cn(
                "aging-report-total-row text-slate-900",
                ledger
                  ? "gl-account-total border-t-2 border-slate-400 font-semibold"
                  : cn(
                      "border-t-2 border-slate-800 font-semibold",
                      polished && "bg-[#FAFAFA]",
                    ),
              )}
            >
              <td
                className={cn(
                  ledger ? "px-2 py-1.5 text-sm font-bold" : "pr-3 text-[10px] uppercase tracking-wider",
                  !ledger && (polished ? "py-2.5" : "py-2"),
                )}
              >
                Report total
              </td>
              {AGING_BUCKET_KEYS.map((key) => (
                <td
                  key={key}
                  className={cn(
                    ledger
                      ? ledgerMoneyTdClass("py-1.5 font-semibold")
                      : cn("px-2 text-right tabular-nums", polished ? "py-2.5" : "py-2"),
                  )}
                >
                  {formatMatrixAmount(buckets[key], currency, formatAmount, ledger)}
                </td>
              ))}
              <td
                className={cn(
                  ledger
                    ? ledgerMoneyTdClass("py-1.5 font-semibold text-slate-900")
                    : cn("px-2 text-right tabular-nums whitespace-nowrap font-semibold", polished ? "py-2.5" : "py-2"),
                )}
              >
                {ledger
                  ? formatMatrixAmount(total, currency, formatAmount, true)
                  : formatAmount(total, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Single continuous detail table — no repeated headers or bucket strips. */
export function AgingUnifiedDetailTable({
  parties,
  lineKey,
  partyColumnLabel,
  partyLabelSingular,
  partyColumnKey = "party",
  renderPartyCell,
  visibleColumns,
  renderColumnHeader,
  renderCell,
  isRightAligned,
  isCenterAligned,
  workspaceId,
  currency,
  variant = "default",
  detailTotal,
  formatAmount,
  columnWidths = null,
  onColumnResize = null,
  reportKey = "vendor_aging",
}) {
  const polished = isStatement(variant);
  const ledger = isLedgerVariant(variant);
  const resizable = ledger && typeof onColumnResize === "function";
  const tableColumns = useMemo(
    () => [{ id: partyColumnKey, label: partyColumnLabel }, ...visibleColumns],
    [partyColumnKey, partyColumnLabel, visibleColumns],
  );
  const resolvedWidths = tableColumns.map((col) => {
    const layout = getReportColumnLayout(reportKey, col.id);
    const raw = columnWidths?.[col.id];
    const width = Number.isFinite(Number(raw)) ? Number(raw) : layout.defaultWidth;
    return Math.min(layout.maxWidth, Math.max(layout.minWidth, Math.round(width)));
  });
  const widthById = Object.fromEntries(
    tableColumns.map((col, index) => [col.id, resolvedWidths[index]]),
  );
  const columnPercentById = computeAgingTablePercents(
    partyColumnKey,
    visibleColumns,
    widthById,
  );
  const columnPercent = (colId) => columnPercentById[colId];
  const groups = parties
    .map((party) => ({
      party,
      lines: filterOpenLines(party[lineKey]),
    }))
    .filter((group) => group.lines.length > 0);

  if (!groups.length) return null;

  const headerClass = agingHeaderClass(variant);

  let rowIndex = 0;

  return (
    <div
      className={cn(
        "aging-detail-table",
        ledger ? "px-3 py-2 sm:px-4" : "px-5 sm:px-6",
        !ledger && polished ? "border-t-0 pb-3 pt-0" : !ledger && "border-t border-slate-200 py-3",
      )}
    >
      <div className={ledger ? "w-full min-w-0 overflow-x-auto print:overflow-visible" : undefined}>
        <table
          className={cn(
            ledger ? "general-ledger-table w-full table-fixed border-collapse text-sm leading-snug text-slate-700" : "w-full min-w-[720px] border-collapse text-sm",
          )}
          data-print-table
        >
          {ledger ? (
            <colgroup>
              <col
                className="ledger-col-party"
                style={{ width: columnPercent(partyColumnKey) }}
              />
              {visibleColumns.map((col) => (
                <col
                  key={col.id}
                  className={agingLedgerColRoleClass(col, partyColumnKey)}
                  style={{ width: columnPercent(col.id) }}
                />
              ))}
            </colgroup>
          ) : null}
          <thead
            className={cn(
              ledger ? "bg-slate-50" : reportStickyTheadBelowLetterheadClass,
              !ledger && "bg-white shadow-[0_1px_0_0_rgb(226_232_240)]",
            )}
          >
            <tr className={ledger ? "" : "border-b border-slate-200 text-left"}>
              <th
                className={cn(
                  ledger
                    ? cn(
                        "ledger-col-party group/th relative h-8 border-b border-slate-200 px-2 py-1.5 text-left align-middle",
                        resizable && "pr-3",
                      )
                    : "w-[15%] pr-3 text-left",
                  !ledger && (polished ? "h-11 py-2.5" : "py-1.5"),
                  headerClass,
                )}
                title={
                  resizable
                    ? `${partyColumnLabel} — drag the right edge to resize`
                    : partyColumnLabel
                }
              >
                <span className="block truncate pr-1.5">{partyColumnLabel}</span>
                {resizable ? (
                  <ReportColumnResizeHandle
                    columnKey={partyColumnKey}
                    width={widthById[partyColumnKey]}
                    minWidth={getReportColumnLayout(reportKey, partyColumnKey).minWidth}
                    maxWidth={getReportColumnLayout(reportKey, partyColumnKey).maxWidth}
                    onDrag={(columnKey, next) =>
                      onColumnResize(columnKey, next, { persist: false })
                    }
                    onDragEnd={(columnKey, next) =>
                      onColumnResize(columnKey, next, { persist: true })
                    }
                  />
                ) : null}
              </th>
              {visibleColumns.map((col) => {
                const layout = getReportColumnLayout(reportKey, col.id);
                const center = isCenterAligned?.(col) || ledger;
                const right = !center && isRightAligned?.(col);
                return (
                  <th
                    key={col.id}
                    className={cn(
                      ledger
                        ? cn(
                            "group/th relative h-8 border-b border-slate-200 px-2 py-1.5 align-middle max-w-0 overflow-hidden",
                            resizable && "pr-3",
                            center && ledgerCenterThClass(),
                            right && ledgerMoneyThClass(),
                            agingLedgerColRoleClass(col, partyColumnKey),
                          )
                        : "px-2",
                      !ledger && (polished ? "h-11 py-2.5" : "py-1.5"),
                      headerClass,
                      !ledger && center && "text-center",
                      !ledger && right && "text-right",
                    )}
                    title={
                      resizable
                        ? `${col.label || col.id} — drag the right edge to resize`
                        : col.label || undefined
                    }
                  >
                    <span className="block truncate pr-1.5">{renderColumnHeader(col)}</span>
                    {resizable ? (
                      <ReportColumnResizeHandle
                        columnKey={col.id}
                        width={widthById[col.id]}
                        minWidth={layout.minWidth}
                        maxWidth={layout.maxWidth}
                        onDrag={(columnKey, next) =>
                          onColumnResize(columnKey, next, { persist: false })
                        }
                        onDragEnd={(columnKey, next) =>
                          onColumnResize(columnKey, next, { persist: true })
                        }
                      />
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map(({ party, lines }, groupIdx) =>
              lines.map((line, lineIdx) => {
                const isFirst = lineIdx === 0;
                const isLast = lineIdx === lines.length - 1;
                const partyId = party.customer_id ?? party.vendor_id;
                const docId = line.invoice_id ?? line.bill_id ?? lineIdx;
                const isAlt = rowIndex % 2 === 1;
                rowIndex += 1;

                return (
                  <tr
                    key={`${partyId}-${docId}-${lineIdx}`}
                    className={cn(
                      ledger
                        ? "align-middle hover:bg-sky-50/40"
                        : cn(
                            "border-b border-slate-100",
                            polished && "aging-party-row h-11 transition-colors hover:bg-slate-50/60",
                            polished && (isAlt ? "bg-[#FAFAFA]" : "bg-white"),
                            isFirst && groupIdx > 0 && polished && "aging-party-group-start border-t border-slate-200",
                            isFirst && groupIdx === 0 && "border-t border-slate-200",
                            isLast && polished && "aging-party-group-end",
                          ),
                    )}
                  >
                    <td
                      className={cn(
                        ledger ? ledgerPartyTdClass() : "pr-3 align-middle",
                        !ledger && (polished ? "py-2.5" : "py-1.5 align-top"),
                        isFirst && groupIdx > 0 && !ledger && polished && "pt-4",
                      )}
                    >
                      {isFirst ? renderPartyCell(party) : null}
                    </td>
                    {visibleColumns.map((col) => {
                      const cell = renderCell(col, line, workspaceId, currency);
                      const center = ledger || isCenterAligned?.(col);
                      const right = !center && isRightAligned?.(col);
                      return (
                        <td
                          key={col.id}
                          className={cn(
                            ledger
                              ? ledgerCenterTdClass(col, partyColumnKey)
                              : "px-2 align-middle font-normal text-slate-700",
                            !ledger && (polished ? "py-2.5" : "py-1.5"),
                            isFirst && groupIdx > 0 && !ledger && polished && "pt-4",
                            !ledger && right && "text-right tabular-nums whitespace-nowrap",
                            !ledger && center && "text-center tabular-nums",
                          )}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                );
              }),
            )}
          </tbody>
          {ledger && detailTotal != null && formatAmount ? (
            <tfoot>
              <tr className="gl-account-total border-t-2 border-slate-400 font-semibold text-slate-900">
                <td colSpan={1 + visibleColumns.length} className="px-2 py-1.5">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-bold">
                      Report total — {groups.length} {partyLabelSingular || "party"}
                      {groups.length === 1 ? "" : "s"}
                    </span>
                    <span className="tabular-nums whitespace-nowrap font-semibold">
                      {formatPeachtreeAmount(detailTotal) === "\u00a0"
                        ? "—"
                        : formatPeachtreeAmount(detailTotal)}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {detailTotal != null && formatAmount && !ledger ? (
        <AgingReportGrandTotal
          partyCount={groups.length}
          partyLabel={partyLabelSingular || "party"}
          total={detailTotal}
          formatAmount={formatAmount}
          currency={currency}
          variant={variant}
        />
      ) : null}
    </div>
  );
}

export function AgingReportGrandTotal({
  partyCount,
  partyLabel,
  total,
  formatAmount,
  currency,
  variant = "default",
}) {
  const polished = isStatement(variant);
  const ledger = isLedgerVariant(variant);

  if (ledger) {
    return (
      <div className="aging-report-grand-total mx-3 mb-2 mt-2 flex items-center justify-between gap-4 border-t-2 border-slate-400 px-2 py-1.5 sm:mx-4">
        <p className="text-sm font-bold text-slate-900">
          Report total — {partyCount} {partyLabel}
          {partyCount === 1 ? "" : "s"}
        </p>
        <p className="text-sm font-semibold tabular-nums text-slate-900 whitespace-nowrap">
          {formatAmount(total, currency)}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "aging-report-grand-total flex items-end justify-between gap-4 border-t-2 border-slate-800",
        polished ? "mx-0 mt-4 bg-[#FAFAFA] px-4 py-2.5" : "pt-3",
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-900">
          Report Total
        </p>
        <p className="mt-0.5 text-xs font-normal text-slate-500">
          {partyCount} {partyLabel}
          {partyCount === 1 ? "" : "s"} with open balances
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          Total Amount Due
        </p>
        <p className="text-xl font-semibold tabular-nums text-slate-900">
          {formatAmount(total, currency)}
        </p>
      </div>
    </div>
  );
}
