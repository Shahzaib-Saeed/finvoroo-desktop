import { Link } from "react-router";
import {
  ExternalLink,
  Loader2,
  MousePointerClick,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { StatusBadge } from "@/components/workspace/documents/sharedColumns";
import { Button } from "@/components/ui/button";
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

const ICON_CHIP =
  "flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-slate-50 text-slate-600 ring-1 ring-slate-200/60";

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

function MetaRow({ label, value }) {
  return (
    <div className="min-w-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">
        {value || <span className="text-muted-foreground/40">—</span>}
      </p>
    </div>
  );
}

function TimelineStep({ icon: Icon, title, subtitle, active, last }) {
  return (
    <div className="relative flex gap-2.5 pb-3 last:pb-0">
      {!last ? (
        <div className="absolute bottom-0 left-[11px] top-5 w-px bg-border" />
      ) : null}
      <div
        className={cn(
          "relative z-10 flex size-[22px] shrink-0 items-center justify-center rounded-full border",
          active
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-muted/40 text-muted-foreground",
        )}
      >
        <Icon className="size-3" strokeWidth={2.5} />
      </div>
      <div className="min-w-0 -mt-0.5 flex-1">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function PanelShell({ children, className }) {
  return (
    <div
      className={cn(
        "sticky top-4 overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs",
        className,
      )}
    >
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <PanelShell>
      <div className="flex flex-col items-center px-4 py-12 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-muted-foreground">
          <MousePointerClick className="size-4" />
        </div>
        <p className="text-sm font-semibold text-foreground">Select a document</p>
        <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
          Choose a row to preview details, audit trail, and linked documents.
        </p>
      </div>
    </PanelShell>
  );
}

function LoadingState() {
  return (
    <PanelShell>
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-xs font-medium">Loading document…</span>
      </div>
    </PanelShell>
  );
}

function buildTimeline(document, audit) {
  const steps = [];
  const status = String(document?.status || "").toLowerCase();

  steps.push({
    icon: CheckCircle2,
    title: "Created",
    subtitle: `${formatDetailDate(document?.date)} ${formatDetailTime(document?.date)}`.trim(),
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
          ? `${formatDetailDate(entry.created_at)} ${formatDetailTime(entry.created_at)}`.trim()
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
    <PanelShell>
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className={ICON_CHIP}>
            <Icon className="size-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {document.doc_type_label || meta.label}
            </p>
            <p className="truncate text-base font-semibold tracking-tight text-foreground">
              {document.document_no || "—"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <StatusBadge status={document.status} />
          <span
            className={cn(
              "text-base font-semibold tabular-nums tracking-tight",
              hasAmount ? "text-foreground" : "text-muted-foreground/40",
            )}
          >
            {hasAmount ? formatMoney(document.amount) : "—"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border/60 px-4 py-3">
        <MetaRow label="Posting date" value={formatDetailDate(document.date)} />
        <MetaRow
          label={document.party_type === "vendor" ? "Vendor" : "Customer"}
          value={document.party_name}
        />
        <MetaRow
          label="Journal lines"
          value={journalCount > 0 ? String(journalCount) : "—"}
        />
        <MetaRow
          label="Linked docs"
          value={relatedFlat.length > 0 ? String(relatedFlat.length) : "—"}
        />
      </div>

      <div className="px-4 py-3">
        <p className="mb-2.5 text-[11px] font-medium text-muted-foreground">
          Audit trail
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

      {relatedFlat.length > 0 ? (
        <div className="border-t border-border/60 px-4 py-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            Linked documents
          </p>
          <div className="flex flex-col gap-1">
            {relatedFlat.slice(0, 4).map((item) => (
              <Link
                key={`${item.doc_type}-${item.id}`}
                to={item.path ? `/workspace/${workspaceId}${item.path}` : "#"}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
              >
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {item.document_no}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.doc_type_label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-border/60 p-3">
        <Button className="h-9 w-full gap-2" asChild>
          <Link to={detailHref}>
            Open full document
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>
    </PanelShell>
  );
}
