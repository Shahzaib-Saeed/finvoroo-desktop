import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../constants";
import { ReportAccountDrillLink } from "./ReportAccountDrillLink";
import { ReportJournalSourceDrillLink } from "./ReportJournalSourceDrillLink";
import { ReportJournalBadge } from "./ReportJournalBadge";
import { getReportDisplayReference } from "../report-reference";
import { formatAgingLabel } from "../report-aging";
import { ReportDraggableTableHead } from "./ReportDraggableTableHead";
import {
  isReportCustomFieldColumn,
  reportCustomFieldCellClassName,
  ReportCustomFieldHeader,
  ReportCustomFieldCell,
} from "./ReportCustomFieldDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import { sortAccountGroups } from "../report-account-sort";
import {
  ReportPrepaidDescription,
  ReportPrepaidMarker,
} from "./ReportPrepaidMarker";
import { hasPrepaidCash } from "../../shared/prepaid-cash";
import { formatLegacyShortDate } from "./PartyLedgerReport";
import { formatJournalTypeCode } from "../journal-type-codes";
import {
  isPaidPartyLedgerEntry,
  PaidReferenceMarker,
} from "../ledger-paid-marker";
import { ReportColumnResizeHandle } from "./ReportColumnResizeHandle";
import { getReportColumnLayout } from "../lib/report-column-layout";
import {
  REPORT_STICKY_BELOW_CHROME,
} from "./report-sticky";
import { reportType } from "./report-typography";

function peachtreeEmpty(value) {
  if (value == null || value === "" || value === "—") return "\u00a0";
  return value;
}

function formatPeachtreeAmount(value) {
  const n = Number(value) || 0;
  if (!n || Math.abs(n) < 0.005) return "\u00a0";
  const text = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return n < 0 ? `-${text}` : text;
}

export { formatPeachtreeAmount };

function glIsRightAligned(col) {
  return ["debit", "credit", "balance"].includes(col.id);
}

function glIsCenterAligned(col) {
  return col.id === "aging" || col.id === "journal";
}

function isGlWrapColumn(col) {
  return col.id === "description" || col.id === "account" || isReportCustomFieldColumn(col);
}

const COLUMN_WEIGHTS = {
  account: 24,
  date: 5.5,
  aging: 3,
  reference: 12,
  journal: 4,
  description: 28,
  debit: 8,
  credit: 8,
  balance: 9,
};

const CUSTOM_FIELD_WEIGHT = 4;

function columnWeight(col) {
  if (isReportCustomFieldColumn(col)) return CUSTOM_FIELD_WEIGHT;
  return COLUMN_WEIGHTS[col.id] ?? 7;
}

function columnMinWidth(col) {
  if (isReportCustomFieldColumn(col)) return 64;
  switch (col.id) {
    case "account":
      return 140;
    case "date":
      return 68;
    case "aging":
      return 24;
    case "reference":
      return 96;
    case "journal":
      return 40;
    case "description":
      return 120;
    case "debit":
    case "credit":
    case "balance":
      return 84;
    default:
      return 72;
  }
}

/** Shrink compact columns to content; description absorbs leftover width. */
function columnLayoutStyle(col) {
  if (isReportCustomFieldColumn(col)) {
    return { width: "4.25rem", maxWidth: "4.25rem" };
  }
  switch (col.id) {
    case "date":
    case "journal":
    case "aging":
    case "debit":
    case "credit":
    case "balance":
      return { width: "1%" };
    case "reference":
      return { width: "8.5rem", maxWidth: "10rem" };
    case "account":
      return { width: "11rem", maxWidth: "13rem" };
    case "description":
      return { width: "auto" };
    default:
      return { minWidth: `${columnMinWidth(col)}px` };
  }
}

function peachtreeHeaderLabel(col) {
  if (isReportCustomFieldColumn(col)) {
    return <ReportCustomFieldHeader col={col} compact truncate />;
  }
  switch (col.id) {
    case "account":
      return "Account";
    case "date":
      return "Date";
    case "aging":
      return "Paid";
    case "reference":
      return "Reference";
    case "journal":
      return "Type";
    case "description":
      return "Description";
    case "debit":
      return "Debit";
    case "credit":
      return "Credit";
    case "balance":
      return "Balance";
    default:
      return col.label;
  }
}

function columnHeaderLabel(col, peachtree = false) {
  if (peachtree) return peachtreeHeaderLabel(col);
  if (isReportCustomFieldColumn(col)) {
    return <ReportCustomFieldHeader col={col} compact={false} />;
  }
  return col.label;
}

function AmountCell({
  value,
  currency,
  className,
  mutedWhenZero = true,
  peachtree = false,
  workspaceId,
  row,
}) {
  const n = Number(value) || 0;
  const isZero = Math.abs(n) < 0.005;

  if (peachtree) {
    const text = formatPeachtreeAmount(value);
    if (text === "\u00a0" || !workspaceId || !row) {
      return (
        <span className={cn("tabular-nums text-slate-900", className)}>
          {text}
        </span>
      );
    }
    return (
      <ReportJournalSourceDrillLink
        workspaceId={workspaceId}
        row={row}
        label={text}
        className={cn(
          "tabular-nums text-slate-900 font-normal hover:underline underline-offset-2",
          className,
        )}
      />
    );
  }

  if (mutedWhenZero && isZero) {
    return <span className="text-muted-foreground/40">—</span>;
  }

  const formatted =
    n < 0
      ? `(${formatCurrency(Math.abs(n), currency)})`
      : formatCurrency(n, currency);

  if (!workspaceId || !row) {
    return (
      <span className={cn("tabular-nums text-foreground", className)}>
        {formatted}
      </span>
    );
  }

  return (
    <ReportJournalSourceDrillLink
      workspaceId={workspaceId}
      row={row}
      label={formatted}
      className={cn(
        "tabular-nums text-foreground font-normal hover:underline underline-offset-2",
        className,
      )}
    />
  );
}

function glCellClass(col, extra, peachtree = false, resizable = false) {
  return cn(
    peachtree
      ? cn("px-2 py-1 align-top leading-snug", reportType.statementBody)
      : "px-2.5 align-top text-sm leading-snug",
    peachtree && resizable && "overflow-hidden",
    glIsRightAligned(col) && "text-right tabular-nums whitespace-nowrap",
    peachtree && glIsCenterAligned(col) && "text-center",
    peachtree &&
      (col.id === "date" || col.id === "journal") &&
      "whitespace-nowrap tabular-nums",
    peachtree &&
      !resizable &&
      (col.id === "date" ||
        col.id === "journal" ||
        col.id === "aging" ||
        glIsRightAligned(col)) &&
      "w-[1%]",
    isGlWrapColumn(col) &&
      cn(
        !peachtree && "max-w-0 break-words whitespace-normal",
        peachtree && col.id === "account" && "max-w-0 align-top",
        peachtree && col.id === "description" && !resizable && "min-w-[10rem]",
        isReportCustomFieldColumn(col) &&
          cn(
            reportCustomFieldCellClassName(col),
            peachtree && !resizable && "max-w-[5.5rem] truncate whitespace-nowrap",
            peachtree && resizable && "truncate whitespace-nowrap",
          ),
      ),
    extra,
  );
}

function glThClass(col, peachtree = false, resizable = false) {
  return cn(
    resizable && "group/th relative",
    peachtree
      ? "h-8 border-b border-slate-200 bg-slate-50 px-2 py-1.5 align-middle text-xs font-bold uppercase tracking-[0.08em] text-slate-900 whitespace-nowrap print:static"
      : "sticky z-10 border-b border-slate-300 bg-background px-2.5 py-3 align-middle shadow-[0_1px_0_0_rgb(203_213_225)] print:static print:py-2",
    !peachtree && REPORT_STICKY_BELOW_CHROME,
    peachtree && "whitespace-nowrap",
    peachtree && glIsRightAligned(col) && "text-right",
    peachtree && col.id === "aging" && "text-center",
    glIsRightAligned(col) && !peachtree && "text-right",
  );
}

function accountDisplayName(group) {
  const code = String(group.code || "").trim();
  const name = String(group.name || "").trim();
  if (code && name && code !== name) return `${code}  ${name}`;
  return name || code || "—";
}

/** Compact two-line account label — keeps long names inside the account column. */
function GlAccountName({ code, name, className }) {
  const codeStr = String(code || "").trim();
  const nameStr = String(name || "").trim();
  const showSplit = codeStr && nameStr && codeStr !== nameStr;
  const fullLabel = showSplit ? `${codeStr} ${nameStr}` : nameStr || codeStr || "—";

  return (
    <div className={cn("min-w-0", className)} title={fullLabel}>
      {showSplit ? (
        <>
          <div className="truncate text-sm font-semibold leading-[1.2] text-slate-900">
            {codeStr}
          </div>
          <div className="line-clamp-2 break-all text-xs font-normal leading-[1.25] text-slate-600">
            {nameStr}
          </div>
        </>
      ) : (
        <div className="line-clamp-2 break-all text-sm font-semibold leading-[1.25] text-slate-900">
          {fullLabel}
        </div>
      )}
    </div>
  );
}

const COLUMN_MIN_PERCENT = {
  account: 16,
  date: 5.5,
  reference: 7,
  journal: 3,
  description: 9,
  debit: 7.5,
  credit: 7.5,
  balance: 8,
};

function computeColumnPercents(visibleColumns, widthById) {
  const entries = visibleColumns.map((col) => {
    const weight = Number(widthById[col.id]) || 1;
    const floor = isReportCustomFieldColumn(col)
      ? 3.5
      : COLUMN_MIN_PERCENT[col.id] ?? 3;
    return { id: col.id, weight, floor };
  });

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  let percents = entries.map((entry) => ({
    id: entry.id,
    pct: Math.max((entry.weight / totalWeight) * 100, entry.floor),
  }));

  let total = percents.reduce((sum, entry) => sum + entry.pct, 0);
  if (total > 100) {
    percents = percents.map((entry) => ({
      ...entry,
      pct: (entry.pct / total) * 100,
    }));
    total = 100;
  }

  const slack = 100 - total;
  if (slack > 0.01) {
    const account = percents.find((entry) => entry.id === "account");
    if (account) account.pct += slack;
  }

  return Object.fromEntries(
    percents.map((entry) => [entry.id, `${entry.pct.toFixed(4)}%`]),
  );
}

function renderGlEntryCell(col, entry, workspaceId, currency, peachtree = false) {
  if (isReportCustomFieldColumn(col)) {
    if (peachtree) {
      const fieldKey = col.field_key || String(col.id || "").slice(3);
      const payload = entry?.custom_fields?.[fieldKey];
      const value =
        payload && typeof payload === "object"
          ? payload.value || payload.by_template?.[String(col.template_variants?.[0]?.template_id)]
          : payload;
      const text = peachtreeEmpty(value);
      return text === "\u00a0" ? (
        <span className="text-slate-300">—</span>
      ) : (
        text
      );
    }
    return <ReportCustomFieldCell col={col} row={entry} />;
  }
  switch (col.id) {
    case "account":
      return "\u00a0";
    case "date":
      return (
        <span className="tabular-nums">
          {formatLegacyShortDate(entry.entry_date)}
        </span>
      );
    case "aging":
      if (peachtree) {
        return (
          <PaidReferenceMarker paid={isPaidPartyLedgerEntry(entry)} />
        );
      }
      return formatAgingLabel(entry) || "—";
    case "reference":
      return (
        <ReportJournalSourceDrillLink
          workspaceId={workspaceId}
          row={entry}
          label={getReportDisplayReference(entry)}
          className={
            peachtree
              ? "break-words text-slate-700 hover:underline"
              : "break-words text-primary hover:text-primary/80 hover:underline"
          }
        />
      );
    case "journal": {
      const prepaid = hasPrepaidCash(entry);
      if (peachtree) {
        const code = formatJournalTypeCode(entry.journal_type, {
          sourceKind: entry.source_kind,
          reference: entry.reference,
        });
        return (
          <span className="block text-center font-semibold tracking-wide tabular-nums" title={code}>
            {code}
          </span>
        );
      }
      return (
        <span className="inline-flex flex-col items-start gap-1.5">
          <ReportJournalBadge
            journalType={entry.journal_type}
            hints={{
              sourceKind: entry.source_kind,
              reference: entry.reference,
            }}
          />
          {prepaid ? (
            <ReportPrepaidMarker entry={entry} currency={currency} compact />
          ) : null}
        </span>
      );
    }
    case "description":
      if (peachtree) {
        const text =
          entry.party_name ||
          entry.line_description ||
          entry.entry_description ||
          "";
        return peachtreeEmpty(text) === "\u00a0" ? (
          "\u00a0"
        ) : (
          <span className="break-words">{text}</span>
        );
      }
      return (
        <div className="min-w-0 break-words whitespace-normal">
          <ReportPrepaidDescription entry={entry} currency={currency} />
        </div>
      );
    case "debit":
      return (
        <AmountCell
          value={entry.debit}
          currency={currency}
          peachtree={peachtree}
          workspaceId={workspaceId}
          row={entry}
        />
      );
    case "credit":
      return (
        <AmountCell
          value={entry.credit}
          currency={currency}
          peachtree={peachtree}
          workspaceId={workspaceId}
          row={entry}
        />
      );
    case "balance":
      return (
        <AmountCell
          value={entry.balance}
          currency={currency}
          peachtree={peachtree}
          workspaceId={workspaceId}
          row={entry}
          className={peachtree ? "font-medium" : undefined}
        />
      );
    default:
      return peachtree ? "\u00a0" : "";
  }
}

export function GeneralLedgerTable({
  rows,
  loading,
  workspaceId,
  period,
  currency,
  visibleColumns,
  reorderColumns,
  variant = "peachtree",
  totals = null,
  enableColumnReorder = false,
  columnWidths = null,
  onColumnResize = null,
  reportKey = "general_ledger",
}) {
  const colCount = visibleColumns.length;
  const isPeachtree = variant === "peachtree";
  const resizable = typeof onColumnResize === "function";
  const tdClass = (col, extra, peachtree = isPeachtree) =>
    glCellClass(col, extra, peachtree, resizable);
  const resolvedWidths = visibleColumns.map((col) => {
    const layout = getReportColumnLayout(reportKey, col.id);
    const raw = columnWidths?.[col.id];
    const width = Number.isFinite(Number(raw)) ? Number(raw) : layout.defaultWidth;
    return Math.min(layout.maxWidth, Math.max(layout.minWidth, Math.round(width)));
  });
  const widthById = Object.fromEntries(
    visibleColumns.map((col, index) => [col.id, resolvedWidths[index]]),
  );
  const tableMinWidth = resizable
    ? resolvedWidths.reduce((sum, width) => sum + width, 0)
    : visibleColumns.reduce((sum, col) => sum + columnMinWidth(col), 0);
  const fitTableToViewport = resizable;
  const totalColumnWidth =
    resolvedWidths.reduce((sum, width) => sum + width, 0) || 1;
  const columnPercentById = fitTableToViewport
    ? computeColumnPercents(visibleColumns, widthById)
    : null;
  const columnPercent = (colId) =>
    columnPercentById?.[colId] ??
    `${((widthById[colId] / totalColumnWidth) * 100).toFixed(4)}%`;

  const groups = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      const key = row.account_id || row.code || "unknown";
      if (!map[key]) {
        map[key] = {
          code: row.code || "—",
          name: row.account_name || "—",
          account_id: row.account_id,
          entries: [],
        };
      }
      map[key].entries.push(row);
    });
    return sortAccountGroups(Object.values(map));
  }, [rows]);

  const hasAccountCol = visibleColumns.some((c) => c.id === "account");

  return (
    <div
      className={cn(
        "bg-white",
        resizable && "w-full min-w-0 max-w-full overflow-x-auto print:overflow-visible",
        isPeachtree
          ? "px-3 py-2 print:px-4 print:py-2 sm:px-4"
          : "px-2 py-2 sm:px-3 print:px-2 print:py-1 lg:px-4",
      )}
    >
      <table
        className={cn(
          "general-ledger-table border-collapse text-sm",
          resizable ? "w-full table-fixed" : "w-full",
          isPeachtree
            ? "leading-snug text-slate-700"
            : "min-w-[720px]",
          !resizable && isPeachtree && "table-auto w-full",
        )}
        style={
          fitTableToViewport
            ? undefined
            : { minWidth: `${Math.max(tableMinWidth, resizable ? 640 : 880)}px` }
        }
        data-print-table
      >
        <colgroup>
          {visibleColumns.map((col) => (
            <col
              key={col.id}
              style={
                resizable
                  ? fitTableToViewport
                    ? { width: columnPercent(col.id) }
                    : {
                        width: `${widthById[col.id]}px`,
                        minWidth: `${widthById[col.id]}px`,
                      }
                  : {
                      minWidth: `${columnMinWidth(col)}px`,
                      ...(isPeachtree
                        ? columnLayoutStyle(col)
                        : {
                            width: `${((columnWeight(col) / visibleColumns.reduce((s, c) => s + columnWeight(c), 0)) * 100).toFixed(2)}%`,
                          }),
                    }
              }
            />
          ))}
        </colgroup>
        <thead
          className={cn(
            // Do not sticky thead itself — stick each <th> via glThClass.
            isPeachtree
              ? "bg-slate-50"
              : "bg-background shadow-[0_1px_0_0_rgb(203_213_225)]",
          )}
        >
          {enableColumnReorder && !isPeachtree ? (
            <ReportDraggableTableHead
              columns={visibleColumns}
              onReorder={reorderColumns}
              renderLabel={(col) => (
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/90">
                  {columnHeaderLabel(col, false)}
                </span>
              )}
              isRightAligned={glIsRightAligned}
              getExtraClassName={() =>
                cn(
                  "sticky z-10 border-b border-slate-300 bg-background px-2.5 py-3 align-middle print:static print:py-2",
                  REPORT_STICKY_BELOW_CHROME,
                )
              }
            />
          ) : (
            <tr>
              {visibleColumns.map((col) => {
                const layout = getReportColumnLayout(reportKey, col.id);
                return (
                  <th
                    key={col.id}
                    className={glThClass(col, isPeachtree, resizable)}
                    title={
                      resizable
                        ? `${col.master_label || col.label || col.id} — drag the right edge to resize`
                        : col.master_label || col.label || undefined
                    }
                    style={
                      resizable && !fitTableToViewport
                        ? { width: `${widthById[col.id]}px`, minWidth: `${widthById[col.id]}px` }
                        : undefined
                    }
                  >
                    <span className="block truncate pr-1.5">
                      {columnHeaderLabel(col, isPeachtree)}
                    </span>
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
          )}
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td
                  colSpan={colCount}
                  className={cn(
                    isPeachtree
                      ? "border-b border-slate-200/90 px-2 py-2"
                      : "border-b border-border px-2.5 py-3",
                  )}
                >
                  <Skeleton className="h-4 w-full" />
                </td>
              </tr>
            ))
          ) : groups.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No transactions found for this period.
              </td>
            </tr>
          ) : (
            groups.flatMap((group, groupIndex) => {
              const firstEntry = group.entries[0];
              const lastEntry = group.entries[group.entries.length - 1];
              const initialBalance =
                (Number(firstEntry?.balance) || 0) -
                (Number(firstEntry?.debit) || 0) +
                (Number(firstEntry?.credit) || 0);
              const endingBalance = Number(lastEntry?.balance || 0);
              const totalDebit = group.entries.reduce(
                (s, e) => s + (Number(e.debit) || 0),
                0,
              );
              const totalCredit = group.entries.reduce(
                (s, e) => s + (Number(e.credit) || 0),
                0,
              );
              const accountLabel = accountDisplayName(group);

              const groupRows = [];

              if (!isPeachtree) {
                groupRows.push(
                  <tr
                    key={`${group.account_id}-hdr`}
                    className="gl-account-group border-t border-slate-200"
                  >
                    <td colSpan={colCount} className="px-2.5 pb-1 pt-4 align-top">
                      <ReportAccountDrillLink
                        workspaceId={workspaceId}
                        accountId={group.account_id}
                        name={accountLabel}
                        from={period.from}
                        to={period.to}
                        showIcon={false}
                        className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                      />
                    </td>
                  </tr>,
                );
              }

              groupRows.push(
                <tr
                  key={`${group.account_id}-fwd`}
                  className="gl-balance-forward-row align-top"
                >
                  {visibleColumns.map((col) => {
                    if (col.id === "account") {
                      return (
                        <td
                          key={col.id}
                          className={tdClass(col, "font-semibold pr-2", isPeachtree)}
                        >
                          <ReportAccountDrillLink
                            workspaceId={workspaceId}
                            accountId={group.account_id}
                            code={group.code}
                            name={group.name}
                            from={period.from}
                            to={period.to}
                            showIcon={false}
                            className={
                              isPeachtree
                                ? "block min-w-0 no-underline hover:no-underline"
                                : "font-semibold text-foreground hover:text-primary hover:underline"
                            }
                          >
                            {isPeachtree ? (
                              <GlAccountName code={group.code} name={group.name} />
                            ) : (
                              accountLabel
                            )}
                          </ReportAccountDrillLink>
                        </td>
                      );
                    }
                    if (col.id === "date") {
                      return (
                        <td
                          key={col.id}
                          className={tdClass(
                            col,
                            "whitespace-nowrap pt-0.5 text-sm tabular-nums",
                            isPeachtree,
                          )}
                        >
                          {formatLegacyShortDate(period.from)}
                        </td>
                      );
                    }
                    if (col.id === "description") {
                      return (
                        <td
                          key={col.id}
                          className={tdClass(
                            col,
                            isPeachtree
                              ? undefined
                              : "py-1.5 text-xs font-medium italic text-muted-foreground",
                            isPeachtree,
                          )}
                        >
                          {isPeachtree ? (
                            "\u00a0"
                          ) : hasAccountCol ? (
                            "Balance forward"
                          ) : (
                            <ReportAccountDrillLink
                              workspaceId={workspaceId}
                              accountId={group.account_id}
                              name={accountLabel}
                              from={period.from}
                              to={period.to}
                              showIcon={false}
                              className="font-semibold text-foreground hover:text-primary hover:underline"
                            />
                          )}
                        </td>
                      );
                    }
                    if (col.id === "reference") {
                      return (
                        <td key={col.id} className={tdClass(col, undefined, isPeachtree)}>
                          {isPeachtree ? "Balance Brought Forward" : "\u00a0"}
                        </td>
                      );
                    }
                    if (col.id === "balance") {
                      return (
                        <td
                          key={col.id}
                          className={tdClass(col, "font-semibold", isPeachtree)}
                        >
                          <AmountCell
                            value={initialBalance}
                            currency={currency}
                            peachtree={isPeachtree}
                            className={isPeachtree ? "font-semibold" : "text-sm font-semibold"}
                          />
                        </td>
                      );
                    }
                    return (
                      <td key={col.id} className={tdClass(col, undefined, isPeachtree)}>
                        {"\u00a0"}
                      </td>
                    );
                  })}
                </tr>,
              );

              for (const [entryIndex, entry] of group.entries.entries()) {
                groupRows.push(
                  <tr
                    key={String(
                      entry.line_id ||
                        entry.journal_entry_id ||
                        entry.id ||
                        entryIndex,
                    )}
                    className={cn(
                      "gl-entry-row align-top",
                      !isPeachtree &&
                        cn(
                          "border-b border-slate-100 hover:bg-primary/5",
                          entryIndex % 2 === 1 && "bg-slate-50/50",
                        ),
                      isPeachtree && "hover:bg-sky-50/50",
                    )}
                  >
                    {visibleColumns.map((col) => {
                      if (col.id === "account") {
                        return (
                          <td key={col.id} className={tdClass(col, undefined, isPeachtree)}>
                            {"\u00a0"}
                          </td>
                        );
                      }
                      const cell = renderGlEntryCell(
                        col,
                        entry,
                        workspaceId,
                        currency,
                        isPeachtree,
                      );
                      return (
                        <td key={col.id} className={tdClass(col, undefined, isPeachtree)}>
                          {cell}
                        </td>
                      );
                    })}
                  </tr>,
                );
              }

              groupRows.push(
                <tr
                  key={`${group.account_id}-end`}
                  className={cn(
                    "gl-account-total align-top font-semibold text-slate-900",
                    !isPeachtree && "border-t border-slate-200",
                  )}
                >
                  {visibleColumns.map((col) => {
                    if (col.id === "account") {
                      return (
                        <td key={col.id} className={tdClass(col, undefined, isPeachtree)}>
                          {"\u00a0"}
                        </td>
                      );
                    }
                    if (col.id === "date") {
                      return (
                        <td
                          key={col.id}
                          className={tdClass(
                            col,
                            isPeachtree
                              ? "whitespace-nowrap"
                              : "py-2 text-xs tabular-nums text-foreground",
                            isPeachtree,
                          )}
                        >
                          {formatLegacyShortDate(period.to)}
                        </td>
                      );
                    }
                    if (col.id === "description") {
                      return (
                        <td
                          key={col.id}
                          className={tdClass(
                            col,
                            isPeachtree
                              ? "font-semibold"
                              : "py-2 text-sm font-bold text-foreground",
                            isPeachtree,
                          )}
                        >
                          Ending balance
                        </td>
                      );
                    }
                    if (col.id === "debit") {
                      return (
                        <td key={col.id} className={tdClass(col, undefined, isPeachtree)}>
                          <AmountCell
                            value={totalDebit}
                            currency={currency}
                            peachtree={isPeachtree}
                            className="font-semibold"
                          />
                        </td>
                      );
                    }
                    if (col.id === "credit") {
                      return (
                        <td key={col.id} className={tdClass(col, undefined, isPeachtree)}>
                          <AmountCell
                            value={totalCredit}
                            currency={currency}
                            peachtree={isPeachtree}
                            className="font-semibold"
                          />
                        </td>
                      );
                    }
                    if (col.id === "balance") {
                      return (
                        <td key={col.id} className={tdClass(col, undefined, isPeachtree)}>
                          <AmountCell
                            value={endingBalance}
                            currency={currency}
                            peachtree={isPeachtree}
                            className="font-semibold"
                          />
                        </td>
                      );
                    }
                    return (
                      <td key={col.id} className={tdClass(col, undefined, isPeachtree)}>
                        {"\u00a0"}
                      </td>
                    );
                  })}
                </tr>,
              );

              if (groupIndex < groups.length - 1) {
                groupRows.push(
                  <tr key={`${group.account_id}-spacer`} aria-hidden className="gl-account-spacer">
                    <td colSpan={colCount} className="h-5 border-0 p-0" />
                  </tr>,
                );
              }

              return groupRows;
            })
          )}
        </tbody>
        {isPeachtree && totals && rows.length > 0 ? (
          <tfoot>
            <tr className="border-t-2 border-slate-400 bg-white">
              {visibleColumns.map((col) => {
                if (col.id === "description") {
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        tdClass(col, "font-bold text-slate-900", true),
                        "border-b-0",
                      )}
                    >
                      Report Total
                    </td>
                  );
                }
                if (col.id === "debit") {
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        tdClass(col, "font-semibold text-slate-900", true),
                        "border-b-0",
                      )}
                    >
                      {formatPeachtreeAmount(totals.total_debit) === "\u00a0"
                        ? "0.00"
                        : formatPeachtreeAmount(totals.total_debit)}
                    </td>
                  );
                }
                if (col.id === "credit") {
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        tdClass(col, "font-semibold text-slate-900", true),
                        "border-b-0",
                      )}
                    >
                      {formatPeachtreeAmount(totals.total_credit) === "\u00a0"
                        ? "0.00"
                        : formatPeachtreeAmount(totals.total_credit)}
                    </td>
                  );
                }
                return (
                  <td
                    key={col.id}
                    className={cn(tdClass(col, undefined, true), "border-b-0")}
                  >
                    {"\u00a0"}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
