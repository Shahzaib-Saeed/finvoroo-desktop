import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Link2,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/workspace/documents/sharedColumns";
import { useCompanyCurrency } from "@/hooks/use-company-currency";
import { formatDate } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { documentExplorerApi } from "../api/document-explorer.api";
import { ReportPageShell } from "../components/ReportPageShell";
import { getDocTypeMeta } from "./document-explorer.lib";

// ============================================================================
// Layout Sub-Components
// ============================================================================

const TicketField = React.memo(({ label, value, className }) => (
  <div className={cn("min-w-0 flex-1", className)}>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
      {label}
    </p>
    <p className="mt-1 text-base font-semibold text-foreground">
      {value ?? "—"}
    </p>
  </div>
));
TicketField.displayName = "TicketField";

const SEVERITY_BADGE_CLASS = {
  critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300",
  security: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300",
  financial: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300",
  info: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300",
};

function auditEventLabel(log) {
  const raw = log.event || log.action;
  if (typeof raw !== "string" || !raw.length) return "—";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function stableStringify(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Resolves simple dot-paths ("customer.email"); bracket line-item paths
// ("lines[1].qty", "lines[+3]") aren't resolvable against a flat snapshot —
// those still show the field name, just without a before/after value.
function resolvePath(obj, path) {
  if (path.includes("[")) return undefined;
  return path.split(".").reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), obj);
}

// Field-by-field before/after, driven by the field names the backend already
// flagged as changed (App\Support\Audit\AuditDiff) — not a client-side guess.
function buildFieldDiff(log) {
  const fields = Array.isArray(log.changed_fields) ? log.changed_fields : [];
  const oldValues = log.old_values;
  const newValues = log.new_values;
  if (fields.length === 0 || !oldValues || !newValues || Array.isArray(oldValues)) {
    return [];
  }

  return fields.map((field) => ({
    field,
    before: resolvePath(oldValues, field),
    after: resolvePath(newValues, field),
  }));
}

// ============================================================================
// Main High-Capacity Integrated Dashboard Component
// ============================================================================

export function DocumentExplorerShowPage() {
  const { id: workspaceId, docType, docId } = useParams();
  const { formatMoney } = useCompanyCurrency(workspaceId);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    documentExplorerApi
      .show(docType, docId)
      .then((res) => {
        if (isMounted) setData(res.data?.data || null);
      })
      .catch((err) => {
        if (isMounted) {
          toast.error(
            err?.response?.data?.message || "Failed to load document details.",
          );
          setData(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [docType, docId]);

  if (loading) {
    const reportsHub = `/workspace/${workspaceId}/accounting/reports`;
    const explorerHub = `${reportsHub}/document-explorer`;

    return (
      <ReportPageShell
        workspaceId={workspaceId}
        title="Loading document…"
        subtitle="Document Explorer · document trace"
        backTo={explorerHub}
        backLabel="Document Explorer"
        showBreadcrumb
        breadcrumbs={[
          { label: "Reports", to: reportsHub },
          { label: "Document Explorer", to: explorerHub },
          { label: "Loading…" },
        ]}
      >
        <div className="flex h-48 items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Loading document details…
          </span>
        </div>
      </ReportPageShell>
    );
  }

  if (!data?.document) {
    const reportsHub = `/workspace/${workspaceId}/accounting/reports`;
    const explorerHub = `${reportsHub}/document-explorer`;

    return (
      <ReportPageShell
        workspaceId={workspaceId}
        title="Document not found"
        subtitle="Document Explorer · document trace"
        backTo={explorerHub}
        backLabel="Document Explorer"
        showBreadcrumb
        breadcrumbs={[
          { label: "Reports", to: reportsHub },
          { label: "Document Explorer", to: explorerHub },
          { label: "Not found" },
        ]}
      >
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
          <AlertCircle className="mb-2 size-5 text-destructive" />
          <p className="text-sm text-muted-foreground">
            This document could not be found or you do not have access to view it.
          </p>
        </div>
      </ReportPageShell>
    );
  }

  const {
    document,
    related_documents: related,
    accounting_impact: accounting,
    inventory_impact: inventory,
    audit_history: audit,
  } = data;

  const docMeta = getDocTypeMeta(document.doc_type);
  const MetaIcon = docMeta.icon;
  const partyLabel = document.party_type === "vendor" ? "Vendor" : "Customer";

  const reportsHub = `/workspace/${workspaceId}/accounting/reports`;
  const explorerHub = `${reportsHub}/document-explorer`;

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title={document.document_no}
      subtitle={`${document.doc_type_label} · document trace`}
      backTo={explorerHub}
      backLabel="Document Explorer"
      showBreadcrumb
      breadcrumbs={[
        { label: "Reports", to: reportsHub },
        { label: "Document Explorer", to: explorerHub },
        { label: document.document_no },
      ]}
      actions={<StatusBadge status={document.status} />}
      contentClassName="w-full max-w-7xl mx-auto px-2"
    >
      {/* THE COMPREHENSIVE INTEGRATED PASS FRAME */}
      <Card className="overflow-hidden border border-border bg-background shadow-lg">
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* ========================================================== */}
          {/* MAIN WORKSPACE BODY (LEFT HAND AREA)                       */}
          {/* ========================================================== */}
          <div className="flex-1 p-8 md:p-12 space-y-10 py-10 md:py-12">
            {/* Header / Identity Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b pb-6">
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl border shadow-2xs",
                    docMeta.chip,
                  )}
                >
                  <MetaIcon className="size-6" />
                </span>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded">
                    {document.doc_type_label}
                  </span>
                  <h2 className="text-xl font-bold text-foreground tracking-tight mt-1.5">
                    {document.document_no}
                  </h2>
                </div>
              </div>

              {/* Status Section */}
              <div className="flex flex-col items-start sm:items-end justify-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Status
                </span>
                <StatusBadge
                  status={document.status}
                  className="shadow-2xs px-4 py-1.5 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Core Segment Info row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 border-b pb-8">
              <TicketField
                label="Date"
                value={document.date ? formatDate(document.date) : null}
              />
              <TicketField label="Type" value={document.doc_type_label} />
              {document.party_name && (
                <TicketField label={partyLabel} value={document.party_name} />
              )}
            </div>

            {/* INTEGRATED INNER SECTION A: FINANCIAL TRANSACTIONS */}
            {accounting?.length > 0 && (
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2 px-0.5">
                  <BookOpen className="size-4 text-muted-foreground/60" />{" "}
                  Financial Transactions
                </h3>
                {accounting.map((journal) => (
                  <div
                    key={journal.id}
                    className="rounded-xl border overflow-hidden bg-background"
                  >
                    <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
                      <Link
                        to={`/workspace/${workspaceId}${journal.path}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {journal.reference ||
                          `Journal Reference #${journal.id}`}
                      </Link>
                      <span className="text-xs text-muted-foreground font-medium">
                        {formatDate(journal.date)}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b bg-muted/5 text-xs font-bold uppercase text-muted-foreground">
                            <th className="px-5 py-3">
                              Account Allocation Item
                            </th>
                            <th className="px-5 py-3 text-right w-36">Debit</th>
                            <th className="px-5 py-3 text-right w-36">
                              Credit
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-normal">
                          {journal.lines.map((line, i) => (
                            <tr key={i} className="hover:bg-muted/10">
                              <td className="px-5 py-3 text-foreground">
                                <span className="text-muted-foreground/60 mr-2 font-mono text-xs">
                                  {line.account_number}
                                </span>
                                {line.account_name}
                              </td>
                              <td className="px-5 py-3 text-right font-medium text-emerald-600">
                                {line.debit > 0 ? formatMoney(line.debit) : "—"}
                              </td>
                              <td className="px-5 py-3 text-right text-foreground">
                                {line.credit > 0
                                  ? formatMoney(line.credit)
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* INTEGRATED INNER SECTION B: SYSTEM AUDIT FOOTPRINT */}
            {audit?.length > 0 && (
              <div className="space-y-4 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2 px-0.5">
                  <ClipboardList className="size-4 text-muted-foreground/60" />{" "}
                  Comprehensive System Audit Footprint
                </h3>
                <div className="rounded-xl border overflow-hidden bg-background">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="px-5 py-3">When</th>
                          <th className="px-5 py-3">Event</th>
                          <th className="px-5 py-3">Severity</th>
                          <th className="px-5 py-3">By</th>
                          <th className="px-5 py-3">Changed Fields</th>
                          <th className="px-5 py-3">Reason</th>
                          <th className="px-5 py-3">Related</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {audit.map((log, index) => {
                          const logId = log.id ?? index;
                          const hasFields = Array.isArray(log.changed_fields) && log.changed_fields.length > 0;
                          const isExpanded = expandedLogId === logId;
                          const fieldDiff = isExpanded ? buildFieldDiff(log) : [];

                          return (
                            <React.Fragment key={logId}>
                              <tr className="hover:bg-muted/10 text-foreground">
                                <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                                  {log.date
                                    ? formatDate(log.date)
                                    : log.created_at || "—"}
                                </td>
                                <td className="px-5 py-3 font-medium">
                                  {auditEventLabel(log)}
                                </td>
                                <td className="px-5 py-3">
                                  {log.severity ? (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "capitalize",
                                        SEVERITY_BADGE_CLASS[log.severity] || SEVERITY_BADGE_CLASS.info,
                                      )}
                                    >
                                      {log.severity}
                                    </Badge>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-5 py-3 text-foreground/90">
                                  {log.user_name || log.by || "—"}
                                </td>
                                <td className="px-5 py-3 text-muted-foreground font-mono text-xs">
                                  {hasFields ? (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedLogId(isExpanded ? null : logId)}
                                      className="flex items-center gap-1 text-primary hover:underline"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="size-3.5 shrink-0" />
                                      ) : (
                                        <ChevronRight className="size-3.5 shrink-0" />
                                      )}
                                      {log.changed_fields.join(", ")}
                                    </button>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-5 py-3 text-muted-foreground">
                                  {log.reason || "—"}
                                </td>
                                <td className="px-5 py-3">
                                  {log.related?.path ? (
                                    <Link
                                      to={`/workspace/${workspaceId}${log.related.path}`}
                                      className="text-primary hover:underline text-xs font-medium"
                                    >
                                      {log.related.label || log.related.type} #{log.related.id}
                                    </Link>
                                  ) : log.related ? (
                                    <span className="text-xs text-muted-foreground">
                                      {log.related.type} #{log.related.id}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                              {isExpanded ? (
                                <tr className="bg-muted/10">
                                  <td colSpan={7} className="px-5 py-3">
                                    {fieldDiff.length > 0 ? (
                                      <table className="w-full text-xs border rounded-lg overflow-hidden bg-background">
                                        <thead className="bg-muted/40 text-muted-foreground">
                                          <tr>
                                            <th className="text-left font-semibold px-3 py-1.5 w-[25%]">Field</th>
                                            <th className="text-left font-semibold px-3 py-1.5">Before</th>
                                            <th className="text-left font-semibold px-3 py-1.5">After</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                          {fieldDiff.map((row) => (
                                            <tr key={row.field}>
                                              <td className="px-3 py-1.5 text-muted-foreground font-mono">{row.field}</td>
                                              <td className="px-3 py-1.5 text-muted-foreground break-all">{stableStringify(row.before)}</td>
                                              <td className="px-3 py-1.5 font-medium break-all">{stableStringify(row.after)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">
                                        No comparable before/after snapshot for this event.
                                      </p>
                                    )}
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* TICKET STUB EXTRACTION BLOCK (RIGHT HAND AREA)             */}
          {/* ========================================================== */}
          <div className="w-full lg:w-[340px] p-8 md:p-10 bg-muted/10 flex flex-col justify-between gap-12 py-10 md:py-12">
            <div className="space-y-8">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widerr text-foreground">
                  Document Confirmation
                </h4>
                <p className="text-xs text-muted-foreground uppercase font-medium mt-1">
                  Control Voucher
                </p>
              </div>

              <div className="space-y-6 border-b border-border/80 pb-6">
                <TicketField label="Document ID" value={document.document_no} />
                <TicketField
                  label="Amount"
                  value={
                    document.amount !== null
                      ? formatMoney(document.amount)
                      : "—"
                  }
                />
              </div>

              {/* INTEGRATED INNER SECTION C: CONNECTED PIPELINE DOCUMENT CHAIN */}
              {related?.length > 0 && (
                <div className="space-y-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Link2 className="size-3.5" /> Pipeline Connected Documents
                  </span>
                  <div className="flex flex-col gap-2">
                    {related
                      .flatMap((g) => g.items)
                      .map((item) => (
                        <Link
                          key={`${item.doc_type}-${item.id}`}
                          to={
                            item.path
                              ? `/workspace/${workspaceId}${item.path}`
                              : "#"
                          }
                          className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-all shadow-2xs group"
                        >
                          <FileText className="size-4 text-muted-foreground/60 group-hover:text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate group-hover:text-primary">
                              {item.document_no}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ({item.doc_type_label})
                            </p>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground/70 font-semibold uppercase tracking-wider border-t pt-5">
              Verification Node Matrix
            </div>
          </div>
        </div>
      </Card>
    </ReportPageShell>
  );
}
