import { Link } from "react-router";
import {
  Download,
  Printer,
  Share2,
  ExternalLink,
  Loader2,
  MousePointerClick,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { StatusBadge } from "@/components/workspace/documents/sharedColumns";
import { cn } from "@/lib/utils";
import { getDocTypeMeta } from "./document-explorer.lib";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDetailDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}, ${d.getFullYear()}`;
}

function formatDetailTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function iconAction(Icon, label) {
  return (
    <button
      type="button"
      title={label}
      className="rounded-lg border border-border bg-background p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
    </button>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 truncate text-sm font-semibold text-foreground">
        {value || <span className="text-muted-foreground/40">—</span>}
      </span>
    </div>
  );
}

function TimelineStep({ icon: Icon, title, subtitle, active, last }) {
  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {!last ? (
        <div className="absolute bottom-0 left-3 top-6 w-px bg-border" />
      ) : null}
      <div
        className={cn(
          "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border",
          active
            ? "border-primary bg-primary text-primary-foreground shadow-sm"
            : "border-border bg-background text-muted-foreground",
        )}
      >
        <Icon className="w-3 h-3" strokeWidth={3} />
      </div>
      <div className="flex flex-col min-w-0 -mt-0.5">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col items-center text-center py-10">
        <div className="mb-3 rounded-2xl bg-muted p-3 text-muted-foreground">
          <MousePointerClick className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">Select a document</p>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Click any document on the left to preview its details, audit trail and
          linked postings here.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs font-semibold">
          Loading document…
        </span>
      </div>
    </div>
  );
}

function buildTimeline(document, audit) {
  const steps = [];
  const status = String(document?.status || "").toLowerCase();

  steps.push({
    icon: CheckCircle2,
    title: "Created",
    subtitle: `${formatDetailDate(document?.date)} ${formatDetailTime(document?.date)}`,
    active: true,
  });

  const auditActions = Array.isArray(audit)
    ? audit.slice(0, 3).map((entry) => ({
        icon: Clock,
        title:
          typeof entry.action === "string" && entry.action.length
            ? entry.action.charAt(0).toUpperCase() + entry.action.slice(1)
            : "Updated",
        subtitle: entry.created_at
          ? `${formatDetailDate(entry.created_at)} ${formatDetailTime(entry.created_at)}`
          : entry.user_name || "System",
        active: true,
      }))
    : [];
  steps.push(...auditActions);

  if (["paid", "completed", "approved"].includes(status)) {
    steps.push({
      icon: CheckCircle2,
      title:
        status === "paid"
          ? "Payment received"
          : status === "completed"
            ? "Completed"
            : "Approved",
      subtitle: "Latest status",
      active: true,
    });
  } else if (status) {
    steps.push({
      icon: Clock,
      title: document?.status || "In progress",
      subtitle: "Latest status",
      active: false,
    });
  }

  return steps;
}

export function DocumentInspectPanel({
  data,
  loading,
  workspaceId,
  formatMoney,
}) {
  if (loading && !data) return <LoadingState />;
  if (!data?.document) return <EmptyState />;

  const {
    document,
    related_documents: related,
    accounting_impact: accounting,
    audit_history: audit,
  } = data;

  const meta = getDocTypeMeta(document.doc_type);
  const Icon = meta.icon;
  const timeline = buildTimeline(document, audit);
  const hasAmount = document.amount !== null && document.amount !== undefined;
  const detailHref = `/workspace/${workspaceId}/accounting/reports/document-explorer/${document.doc_type}/${document.id}`;

  const journalCount = Array.isArray(accounting)
    ? accounting.reduce((sum, j) => sum + (j.lines?.length || 0), 0)
    : 0;

  const relatedFlat = Array.isArray(related)
    ? related.flatMap((g) => g.items || [])
    : [];

  return (
    <div className="sticky top-6 h-fit overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/20 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "rounded-xl border p-2.5 shadow-sm",
              meta.iconBg,
              meta.chip,
            )}
          >
            <Icon className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {document.doc_type_label || meta.label}
            </p>
            <p className="truncate text-base font-semibold tracking-tight text-foreground">
              {document.document_no || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {iconAction(Download, "Download")}
          {iconAction(Printer, "Print")}
          {iconAction(Share2, "Share")}
        </div>
      </div>

      {/* Status + Amount */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <StatusBadge status={document.status} />
        <span
          className={cn(
            "font-mono text-base font-semibold tracking-tight",
            hasAmount ? "text-foreground" : "text-muted-foreground/40",
          )}
        >
          {hasAmount ? formatMoney(document.amount) : "—"}
        </span>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-border px-5 py-5">
        <MetaRow label="Posting Date" value={formatDetailDate(document.date)} />
        <MetaRow
          label={document.party_type === "vendor" ? "Vendor" : "Customer"}
          value={document.party_name}
        />
        <MetaRow
          label="Journal Lines"
          value={journalCount > 0 ? String(journalCount) : "—"}
        />
        <MetaRow
          label="Linked Docs"
          value={relatedFlat.length > 0 ? String(relatedFlat.length) : "—"}
        />
      </div>

      {/* Timeline */}
      <div className="px-5 pb-3 pt-5">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Audit Trail
        </p>
        <div>
          {timeline.map((step, i) => (
            <TimelineStep
              key={i}
              icon={step.icon}
              title={step.title}
              subtitle={step.subtitle}
              active={step.active}
              last={i === timeline.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Linked Documents */}
      {relatedFlat.length > 0 ? (
        <div className="mx-5 mt-2 border-t border-border pt-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Linked Documents
          </p>
          <div className="flex flex-col gap-1.5">
            {relatedFlat.slice(0, 4).map((item) => (
              <Link
                key={`${item.doc_type}-${item.id}`}
                to={item.path ? `/workspace/${workspaceId}${item.path}` : "#"}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.document_no}
                  </p>
                  <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {item.doc_type_label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Footer Action */}
      <div className="mt-5 border-t border-border bg-muted/20 p-5">
        <Link
          to={detailHref}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open full document
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
