import { cn } from "@/lib/utils";

export function isReportCustomFieldColumn(col) {
  return (
    col?.type === "custom_field" || String(col?.id || "").startsWith("cf:")
  );
}

export function reportCustomFieldColumnWidth(col) {
  return isReportCustomFieldColumn(col) ? "w-[10%]" : null;
}

export function reportCustomFieldCellClassName(col) {
  return isReportCustomFieldColumn(col)
    ? "px-3 py-1.5 text-left text-sm text-slate-700 wrap-break-word align-middle"
    : "";
}

export function ReportCustomFieldHeader({ col, compact = false, truncate = false }) {
  const master = col.master_label || col.label || col.field_key;
  const display = truncate ? abbreviateReportFieldLabel(master) : master;
  return (
    <span
      className={
        compact
          ? cn(
              "block font-semibold text-slate-600",
              truncate
                ? "truncate text-xs leading-none"
                : "whitespace-normal break-words text-xs font-bold leading-tight text-slate-700",
            )
          : "text-xs font-semibold uppercase tracking-wider text-slate-500"
      }
      title={master}
    >
      {display}
    </span>
  );
}

/** Short labels for narrow ledger column headers — full text stays in title/tooltip. */
export function abbreviateReportFieldLabel(label) {
  const raw = String(label || "").trim();
  if (!raw) return "—";

  const normalized = raw.replace(/\s+/g, " ").toUpperCase();
  const shortcuts = {
    "CLIENT RECEIPT NO.": "Client rcpt",
    "CLIENT RECEIPT NO": "Client rcpt",
    "CTNR NO. / WEIGHT": "Ctnr / wt",
    "CTNR NO / WEIGHT": "Ctnr / wt",
    "HBL/MBL/VEHICLE NO.": "HBL/MBL",
    "HBL/MBL/VEHCICLE NO.": "HBL/MBL",
    "POD/CLIENT RECEIPT NO.": "POD rcpt",
    "POD/CLEINT RECIPT NO.": "POD rcpt",
  };

  if (shortcuts[normalized]) return shortcuts[normalized];
  if (raw.length <= 14) return raw;
  return `${raw.slice(0, 12).trim()}…`;
}

function EmptyDash() {
  return <span className="text-slate-300">—</span>;
}

export function ReportCustomFieldCell({ col, row }) {
  const fieldKey = col.field_key || String(col.id || "").slice(3);
  const payload = row?.custom_fields?.[fieldKey];
  const variants = col.template_variants || [];

  if (!variants.length) {
    if (payload && typeof payload === "object") {
      return payload.value ? payload.value : <EmptyDash />;
    }
    return payload ? payload : <EmptyDash />;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {variants.map((variant) => {
        const value =
          payload?.by_template?.[String(variant.template_id)] ??
          (payload?.document_template_id === variant.template_id
            ? payload?.value
            : "");
        return (
          <div
            key={variant.template_id}
            className="text-xs wrap-break-word text-slate-700 min-h-4"
            title={value || undefined}
          >
            {value ? value : <EmptyDash />}
          </div>
        );
      })}
    </div>
  );
}

export function renderReportCustomFieldHeader(col) {
  if (!isReportCustomFieldColumn(col)) return col.label;
  return <ReportCustomFieldHeader col={col} />;
}

export function renderReportCustomFieldCell(col, row) {
  if (!isReportCustomFieldColumn(col)) return null;
  return <ReportCustomFieldCell col={col} row={row} />;
}
