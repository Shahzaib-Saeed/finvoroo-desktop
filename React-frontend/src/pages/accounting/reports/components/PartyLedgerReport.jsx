import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { BookOpen, Clock, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { defaultReportPeriod } from "../constants";
import { formatAgingLabel } from "../report-aging";
import { getReportDisplayReference } from "../report-reference";
import { ReportSourceDrillLink } from "./ReportSourceDrillLink";
import { CustomerDrillLink } from "./CustomerDrillLink";
import { VendorDrillLink } from "./VendorDrillLink";
import { useReportSearchParams } from "../hooks/useReportSearchParams";
import { ReportPageShell } from "./ReportPageShell";
import { ReportEntityDetailsProvider } from "./ReportEntityDetailsProvider";
import { ReportDateFilter } from "./ReportDateFilter";
import { ReportTableToolbar } from "./ReportTableToolbar";
import { ReportActionBar } from "./ReportActionBar";
import { ReportDraggableTableHead } from "./ReportDraggableTableHead";
import { usePersistedReportColumns } from "../hooks/usePersistedReportColumns";
import { useReportColumnWidths } from "../hooks/useReportColumnWidths";
import { normalizePartyLedgerColumnOrder } from "../constants/report-columns";
import { getReportColumnLayout } from "../lib/report-column-layout";
import {
  isReportCustomFieldColumn,
  reportCustomFieldCellClassName,
  reportCustomFieldColumnWidth,
  ReportCustomFieldHeader,
  ReportCustomFieldCell,
} from "./ReportCustomFieldDisplay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { formatDisplayDate } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { REPORT_STICKY_BELOW_CHROME } from "./report-sticky";
import {
  isPaidPartyLedgerEntry,
  PaidReferenceLabel,
  PaidReferenceLegend,
} from "../ledger-paid-marker";
import { getLedgerEntryTypeMeta } from "../journal-type-codes";
import { hasPrepaidCash } from "../../shared/prepaid-cash";
import { ReportPrepaidMarker } from "./ReportPrepaidMarker";
import {
  LedgerStatementPrintFooter,
  LedgerStatementPrintHeader,
} from "./GeneralLedgerStatement";
import { ReportFilterTotalsSummary } from "./ReportFilterTotalsSummary";
import { ReportColumnResizeHandle } from "./ReportColumnResizeHandle";
import { reportType } from "./report-typography";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "../report-print.lib";

const CUSTOMER_FALLBACK_COLUMNS = [
  { id: "customer", label: "Customer", can_hide: false },
  { id: "date", label: "Date", can_hide: true },
  { id: "reference", label: "Reference", can_hide: false },
  { id: "type", label: "Type", can_hide: true },
  { id: "description", label: "Description", can_hide: true },
  { id: "order_number", label: "Order #", can_hide: true },
  { id: "debit", label: "Debit Amt", can_hide: true },
  { id: "credit", label: "Credit Amt", can_hide: true },
  { id: "balance", label: "Balance", can_hide: true },
  { id: "age", label: "Age", can_hide: true },
  { id: "aging_label", label: "Aging Status", can_hide: true },
];

const VENDOR_LEDGER_FALLBACK_COLUMNS = [
  { id: "vendor", label: "Vendor", can_hide: false },
  { id: "date", label: "Date", can_hide: true },
  { id: "reference", label: "Reference", can_hide: false },
  { id: "type", label: "Type", can_hide: true },
  { id: "description", label: "Description", can_hide: true },
  { id: "order_number", label: "Order #", can_hide: true },
  { id: "debit", label: "Debit Amt", can_hide: true },
  { id: "credit", label: "Credit Amt", can_hide: true },
  { id: "balance", label: "Balance", can_hide: true },
];

const VENDOR_FALLBACK_COLUMNS = [
  ...VENDOR_LEDGER_FALLBACK_COLUMNS,
  { id: "age", label: "Age", can_hide: true },
  { id: "aging_label", label: "Aging Status", can_hide: true },
];

const PEACHTREE_CUSTOMER_COLUMNS = [
  { id: "customer", label: "Customer", can_hide: false },
  { id: "date", label: "Date", can_hide: true },
  { id: "paid", label: "Paid", can_hide: true },
  { id: "reference", label: "Reference", can_hide: false },
  { id: "type", label: "Type", can_hide: true },
  { id: "order_number", label: "Order #", can_hide: true },
  { id: "description", label: "Description", can_hide: true },
  { id: "debit", label: "Debit", can_hide: true },
  { id: "credit", label: "Credit", can_hide: true },
  { id: "balance", label: "Balance", can_hide: true },
];

const PEACHTREE_VENDOR_COLUMNS = [
  { id: "vendor", label: "Vendor", can_hide: false },
  { id: "date", label: "Date", can_hide: true },
  { id: "paid", label: "Paid", can_hide: true },
  { id: "reference", label: "Reference", can_hide: false },
  { id: "type", label: "Type", can_hide: true },
  { id: "order_number", label: "Order #", can_hide: true },
  { id: "description", label: "Description", can_hide: true },
  { id: "debit", label: "Debit", can_hide: true },
  { id: "credit", label: "Credit", can_hide: true },
  { id: "balance", label: "Balance", can_hide: true },
];

const LEDGER_COLUMN_ORDER = [
  "customer",
  "vendor",
  "date",
  "paid",
  "reference",
  "type",
  "description",
  "order_number",
  "debit",
  "credit",
  "balance",
];

function sortLedgerReportColumns(columns) {
  const rank = (col) => {
    if (col.id === "age") return 10000;
    if (col.id === "aging_label") return 10001;
    // Custom fields sit right after Type (Jrnl equivalent on ledgers).
    if (col.id.startsWith("cf:")) {
      const typeIdx = LEDGER_COLUMN_ORDER.indexOf("type");
      return typeIdx >= 0 ? typeIdx + 0.5 : 55;
    }
    const idx = LEDGER_COLUMN_ORDER.indexOf(col.id);
    return idx >= 0 ? idx : 4000;
  };

  return [...columns].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return String(a.label).localeCompare(String(b.label));
  });
}

export function formatLedgerAmount(value) {
  const n = Number(value) || 0;
  if (!n || Math.abs(n) < 0.005) return "";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
}

export function formatLedgerBalance(value) {
  const n = Number(value) || 0;
  const text = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return n < 0 ? `-${text}` : text;
}

/**
 * Compact party label for ledger headers.
 * Prefer vendor/customer code (often the short trade name), otherwise the
 * shortest useful form of the legal name — never "Legal Name (Code)".
 */
export function formatPartyShortLabel(name, code) {
  const n = String(name || "").trim();
  const c = String(code || "").trim();

  if (c) return c;

  // "Seagold (Private) Limited" → keep as-is unless a clear short alias exists
  // in trailing parentheses that is shorter than the outer name.
  const alias = n.match(/^(.*)\(([^)]+)\)\s*$/);
  if (alias) {
    const outer = alias[1].trim();
    const inner = alias[2].trim();
    if (inner && outer && inner.length <= outer.length) return inner;
  }

  return n || "—";
}

function formatPeachtreeDate(value) {
  return formatDisplayDate(value, "");
}

/** Legacy ERP short date: 31-7-26 */
export function formatLegacyShortDate(value) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function peachtreeColumnLabel(col, partyColumnId) {
  if (col.id === partyColumnId) {
    return partyColumnId === "vendor" ? "Vendor" : "Customer";
  }
  if (col.id === "paid") return "";
  if (col.id === "reference") return "Reference";
  if (col.id === "type") return "Type";
  if (col.id === "order_number") return "Order #";
  if (col.id === "description") return "Description";
  if (col.id === "debit") return "Debit";
  if (col.id === "credit") return "Credit";
  if (isReportCustomFieldColumn(col)) return col.label;
  return col.label;
}

function mergePeachtreePartyColumns(apiColumns, baseColumns) {
  const allowed = new Set(baseColumns.map((c) => c.id));
  const fromApi = (apiColumns || []).filter(
    (col) => allowed.has(col.id) || col.id.startsWith("cf:"),
  );
  const merged = baseColumns.map((base) => {
    const hit = fromApi.find((col) => col.id === base.id);
    return hit ? { ...hit, label: base.label, can_hide: base.can_hide } : base;
  });
  const custom = fromApi.filter((col) => col.id.startsWith("cf:"));
  return sortLedgerReportColumns([...merged, ...custom]);
}

function mergePeachtreeCustomerColumns(apiColumns) {
  return mergePeachtreePartyColumns(apiColumns, PEACHTREE_CUSTOMER_COLUMNS);
}

function mergePeachtreeVendorColumns(apiColumns) {
  return mergePeachtreePartyColumns(apiColumns, PEACHTREE_VENDOR_COLUMNS);
}

function resolveFiscalYear(asOfDate, company) {
  if (company?.fiscal_year) return company.fiscal_year;
  if (company?.fiscal_year_label) return company.fiscal_year_label;
  if (company?.fiscal_year_start) {
    try {
      const start = parseISO(String(company.fiscal_year_start).slice(0, 10));
      const asOf = asOfDate
        ? parseISO(String(asOfDate).slice(0, 10))
        : new Date();
      const fyStartMonth = start.getMonth();
      const fyStartDay = start.getDate();
      let fyYear = asOf.getFullYear();
      const fyStartThisYear = new Date(fyYear, fyStartMonth, fyStartDay);
      if (asOf < fyStartThisYear) fyYear -= 1;
      return `FY ${fyYear}`;
    } catch {
      /* fall through */
    }
  }
  if (!asOfDate) return null;
  try {
    return `FY ${format(parseISO(String(asOfDate).slice(0, 10)), "yyyy")}`;
  } catch {
    return null;
  }
}

function peachtreeEmpty(value) {
  if (value == null || value === "" || value === "—") return "\u00a0";
  return value;
}

function formatAge(entry) {
  if (entry?.age_days !== null && entry?.age_days !== undefined) {
    return String(entry.age_days);
  }
  if (entry?.days_late !== null && entry?.days_late !== undefined) {
    return String(Math.max(0, Number(entry.days_late)));
  }
  return "";
}

function columnHeaderLabel(col, partyColumnId, peachtree = false) {
  if (col.id === partyColumnId) {
    return partyColumnId === "vendor" ? "Vendor" : "Customer";
  }
  if (isReportCustomFieldColumn(col)) {
    return <ReportCustomFieldHeader col={col} compact={peachtree} />;
  }
  return col.label;
}

function partyPeachtreeHeaderLabel(col, partyColumnId) {
  if (isReportCustomFieldColumn(col)) {
    return <ReportCustomFieldHeader col={col} compact truncate />;
  }
  return peachtreeColumnLabel(col, partyColumnId);
}

/** Compact party label with optional phone/email contact line. */
function GlPartyName({ code, name, phone, email, className }) {
  const codeStr = String(code || "").trim();
  const nameStr = String(name || "").trim();
  const showSplit = codeStr && nameStr && codeStr !== nameStr;
  const fullLabel = showSplit ? `${codeStr} ${nameStr}` : nameStr || codeStr || "—";
  const contactLine = String(phone || "").trim() || String(email || "").trim();

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
      {contactLine ? (
        <div
          className="truncate text-xs font-normal leading-tight text-slate-500"
          title={contactLine}
        >
          {contactLine}
        </div>
      ) : null}
    </div>
  );
}

const PARTY_COLUMN_MIN_PERCENT = {
  customer: 9,
  vendor: 9,
  date: 4,
  paid: 2,
  reference: 6,
  type: 3.5,
  order_number: 5,
  description: 7,
  debit: 8.5,
  credit: 8.5,
  balance: 9,
};

/** Column role classes — used for print layout (fixed money-column widths). */
function ledgerColRoleClass(col, partyColumnId) {
  if (col.id === partyColumnId) return "ledger-col-party";
  if (["debit", "credit", "balance"].includes(col.id)) return "ledger-col-money";
  if (isReportCustomFieldColumn(col)) return "ledger-col-cf";
  if (col.id === "type" || col.id === "paid") return "ledger-col-type";
  if (col.id === "description") return "ledger-col-desc";
  if (col.id === "date") return "ledger-col-date";
  if (col.id === "reference") return "ledger-col-ref";
  if (col.id === "order_number") return "ledger-col-order";
  return "ledger-col-data";
}

function computePartyColumnPercents(visibleColumns, widthById) {
  const entries = visibleColumns.map((col) => {
    const weight = Number(widthById[col.id]) || 1;
    const floor = isReportCustomFieldColumn(col)
      ? 2.75
      : PARTY_COLUMN_MIN_PERCENT[col.id] ?? 3;
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
    const description = percents.find((entry) => entry.id === "description");
    if (description) {
      description.pct += slack;
    } else {
      const balance = percents.find((entry) => entry.id === "balance");
      if (balance) balance.pct += slack;
    }
  }

  return Object.fromEntries(
    percents.map((entry) => [entry.id, `${entry.pct.toFixed(4)}%`]),
  );
}

function partyThClass(col, { isPeachtree, resizable }) {
  return cn(
    resizable && "group/th relative",
    !isPeachtree && "sticky z-10 print:static",
    !isPeachtree && REPORT_STICKY_BELOW_CHROME,
    isPeachtree
      ? "h-8 border-b border-slate-200 bg-slate-50 px-2 py-1.5 align-middle text-xs font-bold uppercase tracking-[0.08em] text-slate-900 whitespace-nowrap print:static"
      : "border-b border-slate-200 bg-slate-50 px-1 py-2.5 align-bottom text-sm font-semibold uppercase tracking-wider text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]",
    !isPeachtree && isRightAligned(col) && "text-right",
    isPeachtree && isRightAligned(col) && "text-right",
    isPeachtree && isCenterAligned(col) && "text-center",
    isPeachtree && col.id === "balance" && "pr-3",
  );
}

function partyTdClass(col, extra = "", { isPeachtree, resizable, partyColumnId } = {}) {
  return cn(
    isPeachtree
      ? cn("px-2 py-1 align-top leading-snug", reportType.statementBody)
      : "py-1.5 px-1 align-top text-sm text-slate-700",
    isPeachtree && resizable && "overflow-hidden",
    isPeachtree && isRightAligned(col) && "text-right tabular-nums whitespace-nowrap",
    isPeachtree &&
      (col.id === "date" || col.id === "type") &&
      "whitespace-nowrap tabular-nums",
    isPeachtree && col.id === partyColumnId && "max-w-0 align-top pr-2",
    isPeachtree && isCenterAligned(col) && "text-center",
    isPeachtree &&
      isReportCustomFieldColumn(col) &&
      (resizable ? "truncate whitespace-nowrap" : "max-w-[5.5rem] truncate whitespace-nowrap"),
    isPeachtree && col.id === "balance" && "pr-3",
    !isPeachtree && isRightAligned(col) && "text-right tabular-nums whitespace-nowrap text-slate-900",
    !isPeachtree &&
      isReportCustomFieldColumn(col) &&
      reportCustomFieldCellClassName(col),
    extra,
  );
}

const PARTY_COLUMN_WEIGHTS = {
  customer: 14,
  vendor: 14,
  date: 5.5,
  paid: 2.5,
  reference: 10,
  type: 4.5,
  order_number: 8,
  description: 18,
  debit: 8,
  credit: 8,
  balance: 9,
  age: 5,
  aging_label: 8,
};

const PARTY_CUSTOM_FIELD_WEIGHT = 8;

function partyColumnWeight(col) {
  if (isReportCustomFieldColumn(col)) return PARTY_CUSTOM_FIELD_WEIGHT;
  return PARTY_COLUMN_WEIGHTS[col.id] ?? 7;
}

function partyColumnWidthPercent(col, visibleColumns) {
  const totalWeight = visibleColumns.reduce((sum, c) => sum + partyColumnWeight(c), 0);
  const weight = partyColumnWeight(col);
  return `${((weight / totalWeight) * 100).toFixed(2)}%`;
}

function isRightAligned(col) {
  return ["debit", "credit", "balance", "age"].includes(col.id);
}

function isCenterAligned(col) {
  return col.id === "type" || col.id === "paid";
}

function columnWidthClass(col, partyColumnId, variant) {
  if (variant === "peachtree") {
    switch (col.id) {
      case "customer":
      case "vendor":
        return "w-[18%]";
      case "date":
        return "w-[7%]";
      case "paid":
        return "w-[4%]";
      case "reference":
        return "w-[13%]";
      case "type":
        return "w-[5%]";
      case "order_number":
        return "w-[9%]";
      case "description":
        return "w-[16%]";
      case "debit":
      case "credit":
        return "w-[9%]";
      case "balance":
        return "w-[10%]";
      default:
        return "w-[8%]";
    }
  }
  const customWidth = reportCustomFieldColumnWidth(col);
  if (customWidth) return customWidth;
  switch (col.id) {
    case "customer":
    case "vendor":
      return "w-[16%]";
    case "date":
      return "w-[8%]";
    case "reference":
      return "w-[12%]";
    case "type":
      return "w-[6%]";
    case "description":
      return "w-[14%]";
    case "order_number":
      return "w-[10%]";
    case "debit":
    case "credit":
      return "w-[9%]";
    case "balance":
      return "w-[10%]";
    case "age":
      return "w-[5%]";
    case "aging_label":
      return "w-[11%]";
    default:
      if (col.id.startsWith("cf:")) return "w-[10%]";
      return "w-[10%]";
  }
}

function ReportColgroup({ columns, partyColumnId, variant }) {
  const isPeachtree = variant === "peachtree";
  return (
    <colgroup>
      {columns.map((col) => (
        <col
          key={col.id}
          className={isPeachtree ? undefined : columnWidthClass(col, partyColumnId, variant)}
          style={isPeachtree ? { width: partyColumnWidthPercent(col, columns) } : undefined}
        />
      ))}
    </colgroup>
  );
}

function renderLedgerCell(col, entry, workspaceId, ledgerType, variant) {
  if (isReportCustomFieldColumn(col)) {
    if (variant === "peachtree") {
      const fieldKey = col.field_key || String(col.id || "").slice(3);
      const payload = entry?.custom_fields?.[fieldKey];
      const value =
        payload && typeof payload === "object"
          ? payload.value ||
            payload.by_template?.[String(col.template_variants?.[0]?.template_id)]
          : payload;
      return peachtreeEmpty(value);
    }
    return <ReportCustomFieldCell col={col} row={entry} />;
  }

  const paid = isPaidPartyLedgerEntry(entry);

  switch (col.id) {
    case "date":
      return variant === "peachtree"
        ? formatLegacyShortDate(entry.txn_date)
        : formatPeachtreeDate(entry.txn_date);
    case "paid":
      return paid ? "*" : "";
    case "reference":
      if (variant === "peachtree") {
        return (
          <ReportSourceDrillLink
            workspaceId={workspaceId}
            row={entry}
            ledgerType={ledgerType}
            label={getReportDisplayReference(entry)}
            className="text-black hover:underline"
          />
        );
      }
      return (
        <PaidReferenceLabel paid={paid}>
          <ReportSourceDrillLink
            workspaceId={workspaceId}
            row={entry}
            ledgerType={ledgerType}
            label={getReportDisplayReference(entry)}
            className="hover:underline text-primary font-normal"
          />
        </PaidReferenceLabel>
      );
    case "type": {
      const type = getLedgerEntryTypeMeta(entry, ledgerType);
      const prepaid = hasPrepaidCash(entry);
      if (variant === "peachtree") {
        return (
          <span
            className="inline-flex items-baseline justify-center gap-0.5 font-semibold tracking-wide tabular-nums"
            title={
              prepaid
                ? `${type.label} — Prepaid (unapplied cash)`
                : type.label
            }
          >
            {type.code}
            {prepaid ? (
              <span className="text-[10px] font-medium normal-case text-amber-700/90">
                pre
              </span>
            ) : null}
          </span>
        );
      }
      return (
        <span
          className="inline-flex flex-col items-center gap-0.5 min-w-[2.5rem]"
          title={
            prepaid
              ? `${type.label} — Prepaid (unapplied cash)`
              : type.label
          }
        >
          <span className="font-semibold tracking-wide text-slate-700">
            {type.code}
          </span>
          {prepaid ? <ReportPrepaidMarker entry={entry} compact /> : null}
        </span>
      );
    }
    case "description":
      return variant === "peachtree"
        ? peachtreeEmpty(entry.description)
        : entry.description || "—";
    case "order_number":
      return variant === "peachtree"
        ? peachtreeEmpty(entry.order_number)
        : entry.order_number || "—";
    case "debit": {
      const text = formatLedgerAmount(entry.debit);
      if (!text) return "";
      return (
        <ReportSourceDrillLink
          workspaceId={workspaceId}
          row={entry}
          ledgerType={ledgerType}
          label={text}
          className={cn(
            "tabular-nums font-normal hover:underline underline-offset-2",
            variant === "peachtree" ? "text-slate-900" : "text-inherit",
          )}
        />
      );
    }
    case "credit": {
      const text = formatLedgerAmount(entry.credit);
      if (!text) return "";
      return (
        <ReportSourceDrillLink
          workspaceId={workspaceId}
          row={entry}
          ledgerType={ledgerType}
          label={text}
          className={cn(
            "tabular-nums font-normal hover:underline underline-offset-2",
            variant === "peachtree" ? "text-slate-900" : "text-inherit",
          )}
        />
      );
    }
    case "balance":
      return (
        <ReportSourceDrillLink
          workspaceId={workspaceId}
          row={entry}
          ledgerType={ledgerType}
          label={formatLedgerBalance(entry.running_balance)}
          className={cn(
            "tabular-nums font-normal hover:underline underline-offset-2",
            variant === "peachtree" ? "text-slate-900" : "text-inherit",
          )}
        />
      );
    case "age":
      return paid ? "" : formatAge(entry);
    case "aging_label":
      return paid ? "" : formatAgingLabel(entry) || "—";
    default:
      return "";
  }
}

function PartyLedgerTable({
  mode,
  rows,
  loading,
  workspaceId,
  period,
  openingBalance,
  isAllParties,
  party,
  visibleColumns,
  emptyMessage,
  enableColumnReorder,
  reorderColumns,
  variant = "default",
  peachtreeHeaders = false,
  totals = null,
  partyContactById = {},
  columnWidths = null,
  onColumnResize = null,
  reportKey = "customer_ledger",
}) {
  const partyColumnId = mode === "vendor" ? "vendor" : "customer";
  const ledgerType = mode === "vendor" ? "ap" : "ar";
  const colCount = visibleColumns.length;
  const isPeachtree = variant === "peachtree";
  const resizable = isPeachtree && typeof onColumnResize === "function";
  const resolvedWidths = visibleColumns.map((col) => {
    const layout = getReportColumnLayout(reportKey, col.id);
    const raw = columnWidths?.[col.id];
    const width = Number.isFinite(Number(raw)) ? Number(raw) : layout.defaultWidth;
    return Math.min(layout.maxWidth, Math.max(layout.minWidth, Math.round(width)));
  });
  const widthById = Object.fromEntries(
    visibleColumns.map((col, index) => [col.id, resolvedWidths[index]]),
  );
  const fitTableToViewport = resizable;
  const totalColumnWidth =
    resolvedWidths.reduce((sum, width) => sum + width, 0) || 1;
  const columnPercentById = fitTableToViewport
    ? computePartyColumnPercents(visibleColumns, widthById)
    : null;
  const columnPercent = (colId) =>
    columnPercentById?.[colId] ??
    `${((widthById[colId] / totalColumnWidth) * 100).toFixed(4)}%`;

  const tableClass = isPeachtree
    ? cn(
        "general-ledger-table w-full table-fixed border-collapse text-sm leading-snug text-slate-700",
      )
    : "w-full min-w-[1150px] border-collapse font-sans text-sm text-neutral-900 table-fixed";

  const thClass = (col) =>
    cn(partyThClass(col, { isPeachtree, resizable }), ledgerColRoleClass(col, partyColumnId));
  const tdClass = (col, extra = "") =>
    cn(
      partyTdClass(col, extra, { isPeachtree, resizable, partyColumnId }),
      ledgerColRoleClass(col, partyColumnId),
    );

  const groupedParties = useMemo(() => {
    if (!isAllParties && party) {
      return [
        {
          id: party.id,
          name:
            party.name ||
            (mode === "vendor" ? "Unknown Vendor" : "Unknown Customer"),
          code:
            (mode === "vendor" ? party.vendor_code : party.customer_code) || "",
          phone: party.phone || party.mobile || "",
          email: party.email || "",
          entries: rows,
        },
      ];
    }

    const groups = {};
    rows.forEach((row) => {
      const idField = mode === "vendor" ? "vendor_id" : "customer_id";
      const nameField = mode === "vendor" ? "vendor_name" : "customer_name";
      const codeField = mode === "vendor" ? "vendor_code" : "customer_code";
      const key = row[idField] || "unknown";
      if (!groups[key]) {
        const contact = partyContactById[row[idField]] || {};
        groups[key] = {
          id: row[idField],
          name:
            row[nameField] ||
            (mode === "vendor" ? "Unknown Vendor" : "Unknown Customer"),
          code: row[codeField] || "",
          phone: contact.phone || "",
          email: contact.email || "",
          entries: [],
        };
      }
      groups[key].entries.push(row);
    });
    return Object.values(groups);
  }, [rows, isAllParties, party, mode, partyContactById]);

  const PartyLink = mode === "vendor" ? VendorDrillLink : CustomerDrillLink;

  return (
    <div
      className={cn(
        "bg-white",
        resizable && "w-full min-w-0 max-w-full overflow-x-auto print:overflow-visible",
        isPeachtree
          ? "px-3 py-2 print:px-4 print:py-2 sm:px-4"
          : "px-4 py-2 sm:px-6 lg:px-8",
      )}
    >
      <table
        className={tableClass}
        data-print-table
      >
        <colgroup>
          {visibleColumns.map((col) => (
            <col
              key={col.id}
              className={ledgerColRoleClass(col, partyColumnId)}
              style={
                resizable
                  ? fitTableToViewport
                    ? { width: columnPercent(col.id) }
                    : {
                        width: `${widthById[col.id]}px`,
                        minWidth: `${widthById[col.id]}px`,
                      }
                  : isPeachtree
                    ? { width: partyColumnWidthPercent(col, visibleColumns) }
                    : undefined
              }
              className={
                resizable || isPeachtree
                  ? undefined
                  : columnWidthClass(col, partyColumnId, variant)
              }
            />
          ))}
        </colgroup>
        <thead
          className={cn(
            isPeachtree ? "bg-slate-50" : "bg-slate-50",
          )}
        >
          {enableColumnReorder && !isPeachtree ? (
            <ReportDraggableTableHead
              columns={visibleColumns}
              onReorder={reorderColumns}
              renderLabel={(col) => columnHeaderLabel(col, partyColumnId)}
              isRightAligned={isRightAligned}
              getExtraClassName={(col) =>
                cn(
                  "sticky z-10 border-b border-slate-200 bg-slate-50 px-1 py-2.5 text-sm font-semibold uppercase tracking-wider text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)] print:static",
                  REPORT_STICKY_BELOW_CHROME,
                  col.id === partyColumnId ? "leading-tight" : "",
                )
              }
            />
          ) : (
            <tr className={isPeachtree ? "" : "border-b border-slate-100 text-left"}>
              {visibleColumns.map((col) => {
                const layout = getReportColumnLayout(reportKey, col.id);
                return (
                  <th
                    key={col.id}
                    className={thClass(col)}
                    title={
                      resizable
                        ? `${col.master_label || col.label || col.id} — drag the right edge to resize`
                        : col.master_label || col.label || undefined
                    }
                    style={
                      resizable && !fitTableToViewport
                        ? {
                            width: `${widthById[col.id]}px`,
                            minWidth: `${widthById[col.id]}px`,
                          }
                        : undefined
                    }
                  >
                    <span className="block truncate pr-1.5">
                      {isPeachtree && peachtreeHeaders
                        ? partyPeachtreeHeaderLabel(col, partyColumnId)
                        : columnHeaderLabel(col, partyColumnId, isPeachtree)}
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
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={colCount} className="py-4 px-1">
                  <Skeleton className="h-4 w-full" />
                </td>
              </tr>
            ))
          ) : groupedParties.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                className="py-10 text-center text-neutral-400 text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            groupedParties.flatMap((group, groupIndex) => {
              const firstEntry = group.entries[0];
              const lastEntry = group.entries[group.entries.length - 1];
              const initialBalance = isAllParties
                ? (Number(firstEntry?.running_balance) || 0) -
                  (Number(firstEntry?.debit) || 0) +
                  (Number(firstEntry?.credit) || 0)
                : openingBalance;
              const endingBalance = Number(lastEntry?.running_balance || 0);
              const totalDebit = group.entries.reduce(
                (s, e) => s + (Number(e.debit) || 0),
                0,
              );
              const totalCredit = group.entries.reduce(
                (s, e) => s + (Number(e.credit) || 0),
                0,
              );

              const groupRows = [
                <tr
                  key={`${group.id}-fwd`}
                  className={cn(
                    "gl-balance-forward-row align-top",
                    !isPeachtree && "border-y border-slate-100 bg-slate-50/60",
                  )}
                >
                  {visibleColumns.map((col) => {
                    if (col.id === partyColumnId) {
                      return (
                        <td key={col.id} className={tdClass(col, "font-semibold pr-2")}>
                          <PartyLink
                            {...(mode === "vendor"
                              ? { vendorId: group.id }
                              : { customerId: group.id })}
                            className={cn(
                              isPeachtree
                                ? "block min-w-0 no-underline hover:no-underline"
                                : "break-words font-bold text-slate-900 no-underline hover:text-primary hover:underline",
                            )}
                            title={group.name || undefined}
                          >
                            {isPeachtree ? (
                              <GlPartyName
                                code={group.code}
                                name={group.name}
                                phone={group.phone}
                                email={group.email}
                              />
                            ) : (
                              formatPartyShortLabel(group.name, group.code)
                            )}
                          </PartyLink>
                        </td>
                      );
                    }
                    if (col.id === "date") {
                      return (
                        <td
                          key={col.id}
                          className={tdClass(col, "whitespace-nowrap pt-0.5 text-sm tabular-nums")}
                        >
                          {isPeachtree
                            ? formatLegacyShortDate(period.from)
                            : formatPeachtreeDate(period.from)}
                        </td>
                      );
                    }
                    if (col.id === "reference") {
                      return (
                        <td key={col.id} className={tdClass(col, isPeachtree ? "" : "italic text-slate-500")}>
                          {isPeachtree ? "Balance Brought Forward" : "Balance Fwd"}
                        </td>
                      );
                    }
                    if (col.id === "balance") {
                      return (
                        <td key={col.id} className={tdClass(col, "font-semibold")}>
                          {formatLedgerBalance(initialBalance)}
                        </td>
                      );
                    }
                    return <td key={col.id} className={tdClass(col)} />;
                  })}
                </tr>,
              ];

              for (const entry of group.entries) {
                groupRows.push(
                  <tr
                    key={entry.row_key || entry.id}
                    className={cn(
                      "gl-entry-row align-top leading-normal",
                      !isPeachtree && "transition-colors hover:bg-slate-50/70",
                      isPeachtree && "hover:bg-sky-50/50",
                    )}
                  >
                    {visibleColumns.map((col) => {
                      if (col.id === partyColumnId) {
                        return <td key={col.id} className={tdClass(col)} />;
                      }
                      const cell = renderLedgerCell(
                        col,
                        entry,
                        workspaceId,
                        ledgerType,
                        variant,
                      );
                      return (
                        <td
                          key={col.id}
                          className={cn(
                            tdClass(col),
                            !isPeachtree &&
                              col.id === "reference" &&
                              "max-w-0",
                            !isPeachtree &&
                              col.id === "aging_label" &&
                              "text-center truncate max-w-0",
                            !isPeachtree &&
                              isReportCustomFieldColumn(col) &&
                              reportCustomFieldCellClassName(col),
                            !isPeachtree &&
                              !isRightAligned(col) &&
                              col.id !== "type" &&
                              col.id !== "reference" &&
                              !isReportCustomFieldColumn(col) &&
                              "truncate max-w-0",
                          )}
                          title={typeof cell === "string" ? cell : undefined}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>,
                );
              }

              if (isPeachtree) {
                groupRows.push(
                  <tr
                    key={`${group.id}-end`}
                    className="gl-account-total align-top font-semibold text-slate-900"
                  >
                    {visibleColumns.map((col) => {
                      if (col.id === partyColumnId) {
                        return <td key={col.id} className={tdClass(col)} />;
                      }
                      if (col.id === "date") {
                        return (
                          <td key={col.id} className={tdClass(col, "whitespace-nowrap")}>
                            {formatLegacyShortDate(period.to)}
                          </td>
                        );
                      }
                      if (col.id === "reference") {
                        return (
                          <td key={col.id} className={tdClass(col, "font-semibold")}>
                            Ending balance
                          </td>
                        );
                      }
                      if (col.id === "debit") {
                        return (
                          <td key={col.id} className={tdClass(col, "font-semibold")}>
                            {formatLedgerAmount(totalDebit) || "0.00"}
                          </td>
                        );
                      }
                      if (col.id === "credit") {
                        return (
                          <td key={col.id} className={tdClass(col, "font-semibold")}>
                            {formatLedgerAmount(totalCredit) || "0.00"}
                          </td>
                        );
                      }
                      if (col.id === "balance") {
                        return (
                          <td key={col.id} className={tdClass(col, "font-bold")}>
                            {formatLedgerBalance(endingBalance)}
                          </td>
                        );
                      }
                      return <td key={col.id} className={tdClass(col)} />;
                    })}
                  </tr>,
                );
              }

              if (isPeachtree && groupIndex < groupedParties.length - 1) {
                groupRows.push(
                  <tr key={`${group.id}-spacer`} aria-hidden className="gl-account-spacer">
                    <td colSpan={colCount} className="h-5 border-0 p-0" />
                  </tr>,
                );
              } else if (!isPeachtree) {
                groupRows.push(
                  <tr key={`${group.id}-spacer`} aria-hidden>
                    <td colSpan={colCount} className="pb-3" />
                  </tr>,
                );
              }

              return groupRows;
            })
          )}
        </tbody>
        {isPeachtree && totals && rows.length > 0 ? (
          <tfoot>
            <tr className="gl-account-total border-t-2 border-slate-400 bg-white">
              {visibleColumns.map((col) => {
                if (col.id === partyColumnId) {
                  return (
                    <td key={col.id} className={cn(tdClass(col, "font-bold text-slate-900"), "border-b-0")}>
                      Report Total
                    </td>
                  );
                }
                if (col.id === "debit") {
                  return (
                    <td key={col.id} className={cn(tdClass(col, "font-semibold text-slate-900"), "border-b-0")}>
                      {formatLedgerAmount(totals.total_debit) || "0.00"}
                    </td>
                  );
                }
                if (col.id === "credit") {
                  return (
                    <td key={col.id} className={cn(tdClass(col, "font-semibold text-slate-900"), "border-b-0")}>
                      {formatLedgerAmount(totals.total_credit) || "0.00"}
                    </td>
                  );
                }
                if (col.id === "balance") {
                  return (
                    <td key={col.id} className={cn(tdClass(col, "font-semibold text-slate-900"), "border-b-0")}>
                      {formatLedgerBalance(totals.closing_balance)}
                    </td>
                  );
                }
                return (
                  <td key={col.id} className={cn(tdClass(col), "border-b-0")}>
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

/**
 * Shared Peachtree-style party ledger report (customer AR or vendor AP).
 */
export function PartyLedgerReport({
  workspaceId,
  mode,
  title,
  subtitle,
  reportHeading,
  columnStorageKey,
  loadData,
  partyParamKey,
  partyFilterLabel,
  allPartiesLabel,
  emptyMessage,
  positiveBalanceLabel,
  negativeBalanceLabel,
  headerAction,
  searchFields,
  includeAgingColumns = true,
  enableColumnReorder = true,
  variant = "default",
  /**
   * When true with variant=peachtree, use the legacy Peachtree column set/labels.
   * When false (default), peachtree only changes layout density — keep this report’s columns.
   */
  peachtreeColumns = false,
  onExport,
  exportDisabled,
  onPdf,
  pdfDisabled,
  /** Render inside another sheet/page without ReportPageShell chrome. */
  embedded = false,
  /** Lock the party filter (e.g. receive-payment customer ledger peek). */
  lockedPartyId = "",
  standardReportKey,
}) {
  const isPeachtree = variant === "peachtree";
  const usePeachtreeColumnSet = isPeachtree && peachtreeColumns;
  const lockedId = lockedPartyId ? String(lockedPartyId) : "";
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState(defaultReportPeriod());
  const [draft, setDraft] = useState(defaultReportPeriod());
  const [partyId, setPartyId] = useState(lockedId);
  const [draftPartyId, setDraftPartyId] = useState(lockedId);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const applyUrlParams = useCallback(
    (params) => {
      setPeriod(params.period);
      setDraft(params.period);
      if (lockedId) return;
      const id = mode === "vendor" ? params.vendorId : params.customerId;
      if (id) {
        setPartyId(id);
        setDraftPartyId(id);
      }
    },
    [mode, lockedId],
  );

  useReportSearchParams({
    onApply: embedded || lockedId ? () => {} : applyUrlParams,
  });

  useEffect(() => {
    if (!lockedId) return;
    setPartyId(lockedId);
    setDraftPartyId(lockedId);
  }, [lockedId]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { from: period.from, to: period.to };
    if (partyId) params[partyParamKey] = partyId;

    loadData(params)
      .then((res) => setData(res.data?.data || null))
      .catch((err) =>
        toast.error(err?.response?.data?.message || "Failed to load report"),
      )
      .finally(() => setLoading(false));
  }, [period, partyId, loadData, partyParamKey]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = data?.currency || "USD";
  const company = data?.company || {};
  const parties =
    (mode === "vendor" ? data?.vendors : data?.customers) || [];
  const party = (mode === "vendor" ? data?.vendor : data?.customer) || null;
  const isAllParties = !partyId;
  const allRows = useMemo(() => data?.rows || [], [data]);
  const openingBalance = Number(data?.opening_balance) || 0;
  const totals = data?.totals || {
    total_debit: 0,
    total_credit: 0,
    closing_balance: 0,
  };
  const printedAt = format(new Date(), "dd/MM/yyyy 'at' hh:mm:ss a");
  const generatedBy = user?.name || user?.full_name || null;
  const companyLogoUrl =
    company.logo_url || company.logo || company.logoUrl || company.image_url || null;
  const fiscalYear = resolveFiscalYear(period.to || period.from, company);

  const fallbackColumns = useMemo(() => {
    if (usePeachtreeColumnSet && mode === "customer") return PEACHTREE_CUSTOMER_COLUMNS;
    if (usePeachtreeColumnSet && mode === "vendor") return PEACHTREE_VENDOR_COLUMNS;
    if (mode === "vendor") {
      return includeAgingColumns
        ? VENDOR_FALLBACK_COLUMNS
        : VENDOR_LEDGER_FALLBACK_COLUMNS;
    }
    return CUSTOMER_FALLBACK_COLUMNS;
  }, [mode, includeAgingColumns, usePeachtreeColumnSet]);

  const availableColumns = useMemo(() => {
    if (usePeachtreeColumnSet && mode === "customer") {
      return mergePeachtreeCustomerColumns(data?.available_columns);
    }
    if (usePeachtreeColumnSet && mode === "vendor") {
      return mergePeachtreeVendorColumns(data?.available_columns);
    }
    const source = data?.available_columns?.length
      ? data.available_columns
      : fallbackColumns;
    const filtered = includeAgingColumns
      ? source
      : source.filter((col) => !["age", "aging_label"].includes(col.id));
    return sortLedgerReportColumns(filtered);
  }, [
    data?.available_columns,
    fallbackColumns,
    includeAgingColumns,
    usePeachtreeColumnSet,
    mode,
  ]);

  const {
    allColumns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    isColumnVisible,
  } = usePersistedReportColumns(workspaceId, columnStorageKey, availableColumns, {
    defaultHiddenColumnIds: usePeachtreeColumnSet ? ["age", "aging_label"] : [],
    normalizeColumnOrder: normalizePartyLedgerColumnOrder,
    customFieldInsertAfterId: "type",
    columnsReady: data != null,
  });

  const widthReportKey = mode === "vendor" ? "vendor_ledger" : "customer_ledger";
  const { columnWidths, resizeColumn, resetColumnWidths } = useReportColumnWidths(
    widthReportKey,
    visibleColumns,
  );

  const partyContactById = useMemo(() => {
    const map = {};
    for (const p of parties) {
      if (!p?.id) continue;
      map[p.id] = {
        phone: String(p.phone || p.mobile || "").trim(),
        email: String(p.email || "").trim(),
      };
    }
    return map;
  }, [parties]);

  const term = searchInput.trim().toLowerCase();
  const rows = useMemo(() => {
    if (!term) return allRows;
    return allRows.filter((r) =>
      searchFields(r)
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [allRows, term, searchFields]);

  const applyFilters = () => {
    setPeriod({ ...draft });
    setPartyId(draftPartyId);
  };

  const resetFilters = () => {
    const initial = defaultReportPeriod();
    setDraft(initial);
    setPeriod(initial);
    if (!lockedId) {
      setDraftPartyId("");
      setPartyId("");
    }
    setSearchInput("");
  };

  const hasParty = Boolean(partyId && party);
  const showLedger = isAllParties ? Boolean(data) : hasParty;
  const peachtreeReportTitle = party
    ? "Account Statement"
    : reportHeading ||
      (mode === "vendor" ? "Vendor Ledger Report" : "Customer Ledger Report");
  const scopeLabel = party
    ? `Statement for ${party.name}${party.customer_code || party.vendor_code ? ` (${party.customer_code || party.vendor_code})` : ""}`
    : mode === "vendor"
      ? "All vendors · Opening balance carried forward with running balance"
      : "All customers · Opening balance carried forward with running balance";
  const activityLabel = `${rows.length} ${rows.length === 1 ? "line item" : "line items"}`;

  const sheetRef = useRef(null);

  const reportFilename = useMemo(
    () =>
      buildReportFilename(
        mode === "vendor" ? "vendor-ledger" : "customer-ledger",
        company.name,
        period.to,
      ),
    [mode, company.name, period.to],
  );

  const runReportPrint = useCallback(
    async (printMode) => {
      if (!showLedger) return;
      const node = sheetRef.current;
      if (!node) return;
      try {
        await (printMode === "pdf" ? downloadReportPdf : printReportSheet)(node, {
          title: reportFilename,
          rootClass: "customer-ledger-report-root",
        });
        if (printMode === "pdf") {
          toast.success("Save as PDF", {
            description:
              'In the print dialog, set Destination to "Save as PDF".',
            duration: 5000,
          });
        }
      } catch (err) {
        toast.error(err?.message || "Could not open print preview");
      }
    },
    [showLedger, reportFilename],
  );

  const handlePrint = useCallback(() => runReportPrint("print"), [runReportPrint]);
  const handlePdf = useCallback(() => runReportPrint("pdf"), [runReportPrint]);

  const handleExportClick = useCallback(() => {
    if (!onExport || !rows.length) return;
    onExport({
      rows,
      period,
      company,
      currency,
      openingBalance,
      totals,
      isAllParties,
      party,
    });
  }, [
    onExport,
    rows,
    period,
    company,
    currency,
    openingBalance,
    totals,
    isAllParties,
    party,
  ]);

  const filterBar = (
    <div className="no-print">
      <ReportDateFilter
        compact
        stickyFilters={false}
        from={draft.from}
        to={draft.to}
        onFromChange={(v) => setDraft((p) => ({ ...p, from: v }))}
        onToChange={(v) => setDraft((p) => ({ ...p, to: v }))}
        onApply={applyFilters}
        onReset={resetFilters}
        loading={loading}
        currency={currency}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          {!lockedId ? (
            isPeachtree ? (
              <div className="w-[13.5rem] shrink-0 sm:w-[15rem]">
                <Label className="sr-only">{partyFilterLabel}</Label>
                <SearchableCombobox
                  value={draftPartyId}
                  onValueChange={(v) => setDraftPartyId(v || "")}
                  options={parties.map((p) => ({
                    value: String(p.id),
                    label: formatPartyShortLabel(
                      p.name,
                      mode === "vendor" ? p.vendor_code : p.customer_code,
                    ),
                    keywords: [
                      p.name,
                      mode === "vendor" ? p.vendor_code : p.customer_code,
                    ].filter(Boolean),
                  }))}
                  allowNone
                  noneLabel={allPartiesLabel}
                  placeholder={allPartiesLabel}
                  searchPlaceholder={`Search ${partyFilterLabel.toLowerCase()}…`}
                  emptyText={`No matching ${partyFilterLabel.toLowerCase()}.`}
                  triggerClassName="h-8 w-full bg-background text-xs"
                />
              </div>
            ) : (
              <div className="min-w-[200px]">
                <Select
                  value={draftPartyId || "_all"}
                  onValueChange={(v) => setDraftPartyId(v === "_all" ? "" : v)}
                >
                  <SelectTrigger className="h-8 w-[200px] bg-background text-sm">
                    <SelectValue placeholder={allPartiesLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">{allPartiesLabel}</SelectItem>
                    {parties.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {formatPartyShortLabel(
                          p.name,
                          mode === "vendor" ? p.vendor_code : p.customer_code,
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          ) : null}
          {isPeachtree && showLedger ? (
            <>
              <div className="relative w-full min-w-[12rem] max-w-xs flex-1 sm:w-[16rem] sm:flex-none">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reference, amount…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-8 border-border/80 bg-background pl-8 pr-8 text-xs shadow-none"
                />
                {searchInput ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 size-8 hover:bg-transparent"
                    onClick={() => setSearchInput("")}
                  >
                    <X className="size-3.5 text-muted-foreground/70 hover:text-foreground" />
                  </Button>
                ) : null}
              </div>
              <ReportFilterTotalsSummary
                recordCount={rows.length}
                totals={totals}
                currency={currency}
              />
            </>
          ) : !isPeachtree ? (
            <Input
              className="h-8 w-[180px] bg-background text-sm"
              placeholder="Search transactions…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          ) : null}
        </div>
      </ReportDateFilter>
    </div>
  );

  const reportBody =
    loading && !data ? (
      <Skeleton className={cn("w-full", isPeachtree ? "h-[640px] rounded-lg" : "h-96")} />
    ) : showLedger ? (
        <div
          ref={sheetRef}
          className={cn(
            "report-print-sheet w-full min-w-0 max-w-full bg-white print:rounded-none print:border-0",
            isPeachtree
              ? "general-ledger-print customer-ledger-print rounded-lg border border-slate-200"
              : "customer-ledger-print relative overflow-visible font-sans text-foreground print:overflow-visible print:shadow-none rounded-xl border border-slate-200 pb-8 shadow-md",
          )}
        >
          {isPeachtree ? (
            <div className="general-ledger-statement bg-white">
              <LedgerStatementPrintHeader
                companyName={company.name}
                logoUrl={companyLogoUrl}
                periodFrom={period.from}
                periodTo={period.to}
                currency={currency}
                fiscalYear={fiscalYear}
                generatedBy={generatedBy}
                printedAt={printedAt}
                reportTitle={peachtreeReportTitle}
                scopeLabel={scopeLabel}
                activityLabel={activityLabel}
              />

              <PartyLedgerTable
                mode={mode}
                rows={rows}
                loading={loading && !rows.length}
                workspaceId={workspaceId}
                period={period}
                openingBalance={openingBalance}
                isAllParties={isAllParties}
                party={party}
                visibleColumns={visibleColumns}
                emptyMessage={emptyMessage}
                enableColumnReorder={enableColumnReorder && !isPeachtree}
                reorderColumns={reorderColumns}
                variant={variant}
                peachtreeHeaders={usePeachtreeColumnSet}
                totals={totals}
                partyContactById={partyContactById}
                columnWidths={columnWidths}
                onColumnResize={resizeColumn}
                reportKey={widthReportKey}
              />

              {rows.length > 0 ? (
                <div className="border-t border-slate-100 px-6 py-2 print:px-4 sm:px-8">
                  <PaidReferenceLegend className="text-xs text-slate-500" />
                </div>
              ) : null}

              <LedgerStatementPrintFooter />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 pt-5 text-xs text-slate-400 sm:px-6 lg:px-8">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Generated on {format(new Date(), "dd/MM/yyyy 'at' hh:mm:ss a")}
                </span>
                <span>Page 1 of 1</span>
              </div>

              <div className="space-y-1.5 pb-6 pt-4 text-center">
                <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BookOpen className="size-5" strokeWidth={2} />
                </div>
                <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
                  {company.name || "Company Name"}
                </h1>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {reportHeading}
                </p>
                <p className="pt-0.5 text-sm font-medium text-slate-500">
                  {formatPeachtreeDate(period.from)}
                  <span className="px-2 text-slate-300">–</span>
                  {formatPeachtreeDate(period.to)}
                </p>
              </div>

              <div className="mx-4 mb-2 border-b border-slate-200 pb-3 text-sm leading-relaxed text-slate-500 sm:mx-6 lg:mx-8">
                Ordered by name, shown in detail format. Amounts are based on posted
                transactions for the selected period.
              </div>

              <PartyLedgerTable
                mode={mode}
                rows={rows}
                loading={loading && !rows.length}
                workspaceId={workspaceId}
                period={period}
                openingBalance={openingBalance}
                isAllParties={isAllParties}
                party={party}
                visibleColumns={visibleColumns}
                emptyMessage={emptyMessage}
                enableColumnReorder={enableColumnReorder}
                reorderColumns={reorderColumns}
                variant={variant}
                peachtreeHeaders={usePeachtreeColumnSet}
                totals={null}
              />

              {rows.length > 0 && (
                <>
                  <div className="mx-4 mt-6 border-t-2 border-slate-800 sm:mx-6 lg:mx-8">
                    <div className="grid grid-cols-2 gap-6 border-b-4 border-double border-slate-800 py-3 text-right sm:grid-cols-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                          Total Debit
                        </p>
                        <p className="mt-1 text-base font-bold tabular-nums text-slate-900">
                          {formatLedgerAmount(totals.total_debit) || "0.00"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                          Total Credit
                        </p>
                        <p className="mt-1 text-base font-bold tabular-nums text-slate-900">
                          {formatLedgerAmount(totals.total_credit) || "0.00"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                          Closing Balance
                        </p>
                        <p className="mt-1 text-base font-bold tabular-nums text-slate-900">
                          {formatLedgerBalance(totals.closing_balance)}
                        </p>
                      </div>
                      <div className="border-l border-slate-200 pl-4 text-left">
                        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                          Outstanding Position
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {totals.closing_balance < 0
                            ? negativeBalanceLabel
                            : positiveBalanceLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mx-4 mt-3 sm:mx-6 lg:mx-8">
                    <PaidReferenceLegend />
                  </div>
                  <p className="mt-6 text-center text-xs text-slate-400">
                    Unaudited — For Management Purposes Only
                  </p>
                </>
              )}
            </>
          )}
        </div>
      ) : null;

  const content = (
    <div
      className={cn(
        "w-full max-w-none",
        isPeachtree ? "space-y-2" : "space-y-4",
        embedded && "min-w-0",
      )}
    >
      {filterBar}
      {reportBody}
    </div>
  );

  if (embedded) {
    const embeddedUi = (
      <div className="space-y-3">
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {subtitle ? (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {headerAction}
            <ReportTableToolbar
              columns={allColumns}
              isColumnVisible={isColumnVisible}
              onToggle={toggleColumn}
              onResetColumnWidths={isPeachtree ? resetColumnWidths : undefined}
            />
            <ReportActionBar
              onExport={onExport ? handleExportClick : undefined}
              exportDisabled={
                exportDisabled ?? (!showLedger || loading || !rows.length)
              }
              onPdf={onPdf ?? handlePdf}
              pdfDisabled={pdfDisabled ?? (!showLedger || loading)}
              onPrint={handlePrint}
              printDisabled={!showLedger || loading}
            />
          </div>
        </div>
        {content}
      </div>
    );

    if (!workspaceId) return embeddedUi;
    return (
      <ReportEntityDetailsProvider workspaceId={workspaceId}>
        {embeddedUi}
      </ReportEntityDetailsProvider>
    );
  }

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title={title}
      subtitle={subtitle}
      hideTitle={isPeachtree}
      compact={isPeachtree}
      standardReportKey={standardReportKey}
      actions={
        <ReportActionBar
          leading={
            <>
              {headerAction}
              <ReportTableToolbar
                columns={allColumns}
                isColumnVisible={isColumnVisible}
                onToggle={toggleColumn}
                onResetColumnWidths={isPeachtree ? resetColumnWidths : undefined}
              />
            </>
          }
          onExport={onExport ? handleExportClick : undefined}
          exportDisabled={
            exportDisabled ?? (!showLedger || loading || !rows.length)
          }
          onPdf={onPdf ?? handlePdf}
          pdfDisabled={pdfDisabled ?? (!showLedger || loading)}
          onPrint={handlePrint}
          printDisabled={!showLedger || loading}
        />
      }
      contentClassName={cn(
        "w-full max-w-none",
        isPeachtree
          ? "space-y-2 customer-ledger-report-root general-ledger-report-root"
          : "space-y-4",
      )}
    >
      {content}
    </ReportPageShell>
  );
}
