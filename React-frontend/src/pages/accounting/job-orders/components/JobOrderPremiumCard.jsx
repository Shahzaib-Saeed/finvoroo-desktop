import { Link, useParams } from "react-router";
import {
  ChevronDown,
  Edit3,
  FileText,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { formatJobType, STATUS_COLORS, PRIORITY_COLORS } from "../constants";
import { isJobOverdue } from "./JobOrderListCells";
import { formatCurrency } from "@/pages/accounting/invoices/constants";
import {
  buildConfiguredCardColumns,
  extractCustomFieldValues,
  findFieldByKeywords,
  formatFieldLabel,
  formatManifestDate,
} from "../lib/job-order-list.lib";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Fixed-width label + colon + high-contrast value.
 * Label and value each stay on ONE line (truncate + tooltip) so rows in
 * every column align perfectly and never wrap into each other.
 */
function KvRow({ label, value }) {
  return (
    <div className="flex items-baseline text-xs leading-5">
      <span
        className="w-27 shrink-0 truncate font-bold text-slate-500"
        title={label}
      >
        {label}
      </span>
      <span className="mx-1.5 shrink-0 text-slate-400">:</span>
      <span
        className="min-w-0 flex-1 truncate font-semibold text-slate-950"
        title={value || undefined}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function GridColumn({ title, rows }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 first:pl-0 last:pr-0">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {title}
      </div>
      {rows.map((row) => (
        <KvRow key={row.key || row.label} label={row.label} value={row.value} />
      ))}
    </div>
  );
}

function splitDetailFields(fields, perCol = 4) {
  const list = (Array.isArray(fields) ? fields : [])
    .filter((f) => f?.value != null && String(f.value).trim() !== "")
    .map((f, i) => ({
      key: `cf-${f.id || i}-${f.label}`,
      label: formatFieldLabel(f.label) || `Field ${i + 1}`,
      value: String(f.value),
    }));

  if (!list.length) return { colA: [], colB: [] };
  if (list.length <= perCol) return { colA: list, colB: [] };
  const mid = Math.ceil(list.length / 2);
  return { colA: list.slice(0, mid), colB: list.slice(mid) };
}

function clampPct(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * Premium Hybrid Ticket — dashboard-level contrast, tight logistics grid,
 * and a visual cost/profit split bar on the financial stub.
 */
export function JobOrderPremiumCard({
  job,
  customFieldDefinitions,
  onView,
  onEdit,
  onDelete,
}) {
  const { id: workspaceId } = useParams();
  const jobNumber = job.job_number || `#${job.id}`;
  const dated = formatManifestDate(job.start_date || job.created_at);
  const jobTypeLabel = (formatJobType(job.job_type) || "Sales").toUpperCase();
  const overdue = isJobOverdue(job);
  const dueText = job.due_date_display || job.due_date || null;

  const overviewRows = [
    { key: "client", label: "Client", value: job.customer?.name || null },
    { key: "type", label: "Type", value: formatJobType(job.job_type) || null },
    { key: "due", label: "Due", value: dueText },
    { key: "title", label: "Title", value: job.title || null },
  ];

  // Company-configured layout (Card layout dialog) wins; otherwise fall
  // back to the automatic keyword-based placement below.
  const configured = buildConfiguredCardColumns(job, customFieldDefinitions);
  let detailsRows;
  let moreRows;

  if (configured) {
    detailsRows = configured.detailsRows;
    moreRows = configured.moreRows;
  } else {
    const allFields = extractCustomFieldValues(job, customFieldDefinitions);
    const used = new Set();
    const pick = (label, keywords) => ({
      key: label,
      label,
      value: findFieldByKeywords(allFields, keywords, used),
    });

    detailsRows = [
      pick("Booking No.", ["booking"]),
      pick("HBL/MBL", [
        "hbl",
        "mbl",
        "vehicle",
        "vehcicle",
        "bill of lading",
        "bl no",
      ]),
      pick("Container", ["container", "ctnr", "cntr"]),
      pick("Vessel", ["vessel", "voyage"]),
    ];
    moreRows = [
      pick("POD", ["pod", "port of discharge", "port of delivery", "delivery"]),
      pick("ETD", ["etd", "departure", "vsl etd"]),
      pick("ETA", ["eta", "arrival", "vsl eta"]),
      pick("Cut Off", ["cut off", "cutoff", "cut-off", "vsl cut"]),
    ];

    const remaining = allFields.filter((f) => !used.has(f.label));
    if (
      !detailsRows.some((r) => r.value) &&
      !moreRows.some((r) => r.value) &&
      remaining.length
    ) {
      const { colA, colB } = splitDetailFields(remaining, 4);
      if (colA.length) detailsRows = colA;
      if (colB.length) moreRows = colB;
    } else {
      let ri = 0;
      for (const slot of [...detailsRows, ...moreRows]) {
        if (!slot.value && remaining[ri]) {
          used.add(remaining[ri].label);
          slot.value = remaining[ri].value;
          ri += 1;
        }
      }
    }
  }

  const statusKey = job.status || "scheduled";
  const statusLabel = job.status_label || String(statusKey).replace(/_/g, " ");
  const statusClass = STATUS_COLORS[statusKey] || STATUS_COLORS.scheduled;
  const priorityKey = (job.priority || "normal").toLowerCase();
  const priorityLabel = job.priority_label || job.priority || "Normal";
  const priorityClass = PRIORITY_COLORS[priorityKey] || PRIORITY_COLORS.normal;

  const fin = job.list_financials || {};
  const currency = fin.currency || null;
  const revenue = Number(fin.revenue ?? 0);
  const cost = Number(fin.cost ?? 0);
  const profitVal = Number(fin.profit ?? revenue - cost);
  const hasFin = fin.profit != null || fin.revenue != null || fin.cost != null;
  const money = (v) =>
    v == null || Number.isNaN(Number(v))
      ? "—"
      : formatCurrency(Number(v), currency);

  const marginPct =
    hasFin && revenue > 0 ? clampPct((profitVal / revenue) * 100) : null;
  const costPct =
    hasFin && revenue > 0
      ? clampPct((cost / revenue) * 100)
      : hasFin && (cost > 0 || profitVal !== 0)
        ? clampPct((cost / (Math.abs(cost) + Math.abs(profitVal) || 1)) * 100)
        : 0;
  const profitPctBar =
    hasFin && revenue > 0
      ? clampPct(100 - costPct)
      : hasFin
        ? clampPct(100 - costPct)
        : 0;

  const remarks = (job.notes || "").trim();
  const canEdit = job.flags?.can_edit !== false && statusKey !== "cancelled";
  const deleteBlocked = job.flags?.can_delete === false;

  const convertPaths = {
    invoice: `/workspace/${workspaceId}/accounting/invoices/create?job_order_id=${job.id}`,
    bill: `/workspace/${workspaceId}/accounting/bills/create?job_order_id=${job.id}`,
    expense: `/workspace/${workspaceId}/accounting/journal/create?job_order_id=${job.id}`,
  };

  // Invoices / bills already recorded against this job — rendered as direct
  // links so the user can jump straight into the document's edit page.
  const linkedDocs = Array.isArray(job.linked_documents)
    ? job.linked_documents.filter(
        (doc) => doc && doc.id && (doc.type === "invoice" || doc.type === "bill"),
      )
    : [];
  const linkedDocPath = (doc) =>
    doc.type === "invoice"
      ? `/workspace/${workspaceId}/accounting/invoices/${doc.id}/edit`
      : `/workspace/${workspaceId}/accounting/bills/${doc.id}/edit`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onView?.(job)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView?.(job);
        }
      }}
      className="mb-3.5 flex w-full cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
    >
      {/* ── LEFT: logistics (75%) ── */}
      <div className="flex w-3/4 flex-col justify-between px-4.5 py-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              {jobTypeLabel}
            </span>
            <h4 className="truncate text-sm font-bold text-slate-900">
              Job Order # {jobNumber}
            </h4>
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              • {dated}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "rounded border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                statusClass.includes("border")
                  ? statusClass
                  : "border-blue-100 bg-blue-50 text-blue-700",
              )}
            >
              {statusLabel}
            </span>
            {priorityKey !== "normal" ? (
              <span
                className={cn(
                  "rounded border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  priorityClass,
                )}
              >
                {priorityLabel}
              </span>
            ) : null}
            {overdue ? (
              <span className="rounded border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Overdue
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-100 py-2">
          <GridColumn title="Overview" rows={overviewRows} />
          <GridColumn title="Details" rows={detailsRows} />
          <GridColumn title="More Details" rows={moreRows} />
        </div>

        {/* Dedicated remarks band — operations teams read this constantly,
            so it gets full width, dark text, and a note-style accent. */}
        {remarks ? (
          <div className="mt-0.5 flex items-start gap-2.5 rounded-md border-l-3 border-amber-400 bg-amber-50/60 px-3 py-1.5">
            <span className="shrink-0 pt-px text-[10px] font-bold uppercase tracking-wider leading-5 text-amber-700">
              Remarks
            </span>
            <p
              className="min-w-0 flex-1 text-xs font-medium leading-5 text-slate-800 line-clamp-2"
              title={remarks}
            >
              {remarks}
            </p>
          </div>
        ) : null}
      </div>

      {/* ── RIGHT: financial stub (25%) ── */}
      <div className="flex w-1/4 flex-col justify-between border-l border-slate-200/80 bg-slate-50/50 px-4.5 py-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Financials
            </span>
            {marginPct != null ? (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-bold",
                  profitVal < 0
                    ? "bg-red-50 text-red-600"
                    : "bg-emerald-50 text-emerald-600",
                )}
              >
                {Math.round(marginPct)}% margin
              </span>
            ) : (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                — margin
              </span>
            )}
          </div>

          <div className="mt-1 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-500">Revenue</span>
              <span className="font-bold tabular-nums text-slate-950">
                {hasFin ? money(revenue) : "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-500">Cost</span>
              <span className="font-bold tabular-nums text-slate-950">
                {hasFin ? money(cost) : "—"}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200/60 pt-1 text-xs">
              <span className="font-bold text-slate-900">Est. Profit</span>
              <span
                className={cn(
                  "font-extrabold tabular-nums",
                  hasFin && profitVal < 0 ? "text-red-600" : "text-emerald-600",
                )}
              >
                {hasFin ? money(profitVal) : "—"}
              </span>
            </div>
          </div>

          {/* Segmented cost / profit bar (rounded segments with gaps) */}
          <div className="space-y-1">
            <div className="flex h-2 w-full items-center gap-1">
              {hasFin && (costPct > 0 || profitPctBar > 0) ? (
                <>
                  {costPct > 0 ? (
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${costPct}%` }}
                    />
                  ) : null}
                  {profitPctBar > 0 ? (
                    <div
                      className={cn(
                        "h-full rounded-full",
                        profitVal < 0 ? "bg-violet-500" : "bg-green-500",
                      )}
                      style={{ width: `${profitPctBar}%` }}
                    />
                  ) : null}
                </>
              ) : (
                <div className="h-full w-full rounded-full bg-slate-200" />
              )}
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-red-500" />
                Cost ({hasFin ? `${Math.round(costPct)}%` : "—"})
              </span>
              <span className="inline-flex items-center gap-1">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    hasFin && profitVal < 0 ? "bg-violet-500" : "bg-green-500",
                  )}
                />
                {hasFin && profitVal < 0 ? "Loss" : "Profit"} (
                {hasFin ? `${Math.round(profitPctBar)}%` : "—"})
              </span>
            </div>
          </div>

          {/* Linked invoices / bills — direct links to the edit pages */}
          {linkedDocs.length > 0 ? (
            <div
              className="border-t border-slate-200/60 pt-1.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Linked documents
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {linkedDocs.slice(0, 4).map((doc) => (
                  <Link
                    key={`${doc.type}-${doc.id}`}
                    to={linkedDocPath(doc)}
                    title={`Open ${doc.type} ${doc.number}`}
                    className={cn(
                      "inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                      doc.type === "invoice"
                        ? "border-blue-200 bg-blue-50/70 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                        : "border-violet-200 bg-violet-50/70 text-violet-700 hover:border-violet-300 hover:bg-violet-100",
                    )}
                  >
                    {doc.type === "invoice" ? (
                      <FileText className="size-2.5 shrink-0" />
                    ) : (
                      <Receipt className="size-2.5 shrink-0" />
                    )}
                    <span className="truncate">{doc.number}</span>
                  </Link>
                ))}
                {linkedDocs.length > 4 ? (
                  <span
                    className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
                    title={linkedDocs
                      .slice(4)
                      .map((doc) => doc.number)
                      .join(", ")}
                  >
                    +{linkedDocs.length - 4} more
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="mt-1.5 flex items-center justify-end gap-1 border-t border-slate-200/60 pt-1.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-md px-2 text-[11px] font-semibold text-slate-600"
              >
                <Plus className="size-3" />
                Convert
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[11px] font-semibold text-slate-400">
                Convert to
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to={convertPaths.invoice}>
                  <FileText className="mr-2 size-3.5" />
                  Invoice
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={convertPaths.bill}>
                  <Receipt className="mr-2 size-3.5" />
                  Bill
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={convertPaths.expense}>
                  <Receipt className="mr-2 size-3.5" />
                  Expense
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-md p-1 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(job);
              }}
              title="Edit job"
            >
              <Edit3 className="size-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "size-7 rounded-md p-1 transition-all",
              deleteBlocked
                ? "text-amber-500 hover:bg-amber-50 hover:text-amber-700"
                : "text-slate-500 hover:bg-red-50 hover:text-red-600",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(job);
            }}
            title={deleteBlocked ? "Delete (linked documents)" : "Delete job"}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function JobOrderPremiumCardSkeleton() {
  return (
    <div className="mb-3.5 flex w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      <div className="flex w-3/4 animate-pulse flex-col justify-between px-4.5 py-3">
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <div className="flex gap-3">
            <div className="h-5 w-16 rounded bg-slate-200" />
            <div className="h-4 w-40 rounded bg-slate-100" />
            <div className="ml-4 h-3 w-40 rounded bg-slate-50" />
          </div>
          <div className="h-5 w-20 rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 px-4 first:pl-0 last:pr-0"
            >
              <div className="mb-1 h-2.5 w-16 rounded bg-slate-100" />
              <div className="h-3.5 w-full rounded bg-slate-50" />
              <div className="h-3.5 w-4/5 rounded bg-slate-50" />
              <div className="h-3.5 w-3/5 rounded bg-slate-50" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-1/4 animate-pulse flex-col justify-between border-l border-slate-200/80 bg-slate-50/50 px-4.5 py-3">
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-2.5 w-16 rounded bg-slate-100" />
            <div className="h-4 w-14 rounded bg-emerald-50" />
          </div>
          <div className="mt-1 space-y-1">
            <div className="h-3.5 w-full rounded bg-slate-100" />
            <div className="h-3.5 w-full rounded bg-slate-100" />
            <div className="h-3.5 w-full rounded bg-slate-100" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200" />
        </div>
        <div className="mt-1.5 flex justify-end border-t border-slate-200/60 pt-1.5">
          <div className="h-7 w-14 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
