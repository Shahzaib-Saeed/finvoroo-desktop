import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  History,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  XCircle,
  Activity,
  ArrowRight,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { integrityCheckApi } from "./api/integrity-check.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InvoiceDrillLink } from "@/components/workspace/invoice/components/InvoiceDrillLink";

// ─── Config ────────────────────────────────────────────────────────────────────

const SEVERITY = {
  ok: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    rowHover: "",
    label: "Passed",
  },
  warning: {
    dot: "bg-amber-400",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    rowHover: "bg-amber-50/30 dark:bg-amber-950/10",
    label: "Warning",
  },
  error: {
    dot: "bg-red-500",
    badge:
      "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    rowHover: "bg-red-50/20 dark:bg-red-950/10",
    label: "Failed",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function resolveCheckItems(run) {
  if (!run) return [];
  const c = run.checks;
  if (Array.isArray(c?.items)) return c.items;
  if (Array.isArray(c?.checks?.items)) return c.checks.items;
  if (Array.isArray(c?.checks)) return c.checks;
  if (Array.isArray(c)) return c;
  return [];
}

// ─── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, valueClass }) {
  return (
    <div className="bg-card border rounded-lg px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </p>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums leading-none",
          valueClass ?? "text-foreground",
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="size-3 text-muted-foreground/50" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {children}
      </span>
    </div>
  );
}

// ─── Check row ─────────────────────────────────────────────────────────────────

function CheckRow({ check, workspaceId, defaultOpen = false, index }) {
  const [open, setOpen] = useState(defaultOpen);

  const passed = Boolean(check?.passed);
  const sev = passed
    ? "ok"
    : check?.severity === "warning"
      ? "warning"
      : "error";
  const cfg = SEVERITY[sev];

  const findings = check?.findings ?? [];
  const metrics = check?.metrics ?? {};
  const metricEntries = Object.entries(metrics).filter(
    ([k, v]) =>
      v !== null &&
      v !== undefined &&
      v !== false &&
      k !== "skipped" &&
      k !== "reason",
  );

  const findingCount = check?.finding_count ?? 0;

  return (
    <div
      className={cn(
        "border-b last:border-b-0 transition-colors",
        open && "bg-muted/10",
      )}
    >
      {/* Row */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full grid items-center px-4 py-2.5 text-left transition-colors hover:bg-muted/20",
          "grid-cols-[28px_10px_1fr_90px_66px_20px] gap-x-3",
          !open && cfg.rowHover,
        )}
      >
        {/* Index */}
        <span className="font-mono text-[10px] text-muted-foreground/40 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Status dot */}
        <span className={cn("size-[6px] rounded-full shrink-0", cfg.dot)} />

        {/* Name */}
        <span className="text-[13px] font-medium text-foreground truncate">
          {check?.title || "Unnamed check"}
        </span>

        {/* Issue count */}
        <span className="text-right">
          {findingCount > 0 ? (
            <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
              {findingCount} {findingCount === 1 ? "issue" : "issues"}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/40">—</span>
          )}
        </span>

        {/* Status badge */}
        <span
          className={cn(
            "inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-center",
            cfg.badge,
          )}
        >
          {cfg.label}
        </span>

        {/* Chevron */}
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground/40" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground/30" />
        )}
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t bg-muted/5 px-4 pb-4 pt-3 pl-14 space-y-4 animate-in fade-in duration-100">
          {/* Metrics */}
          {metricEntries.length > 0 && !metrics.skipped && (
            <div>
              <SectionLabel icon={Activity}>Parameters</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 max-w-3xl">
                {metricEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-muted/40 border rounded-md px-2.5 py-2"
                  >
                    <p className="text-[10px] text-muted-foreground capitalize mb-1 truncate">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="text-[12px] font-mono font-semibold text-foreground">
                      {typeof value === "number"
                        ? Number.isInteger(value)
                          ? value.toLocaleString()
                          : value.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                        : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          <div>
            <SectionLabel icon={Terminal}>Findings</SectionLabel>

            {findings.length > 0 ? (
              <div className="space-y-2 max-w-3xl">
                {findings.map((finding, idx) => {
                  const message =
                    typeof finding === "string"
                      ? finding
                      : finding?.message || "";
                  const action =
                    typeof finding === "object"
                      ? finding?.suggested_action
                      : null;
                  const invoiceId =
                    typeof finding === "object" ? finding?.invoice_id : null;

                  return (
                    <div
                      key={`${check?.id}-${idx}`}
                      className="bg-card border rounded-md p-3 space-y-2"
                    >
                      <p className="text-[12px] text-foreground leading-relaxed">
                        {message}
                      </p>

                      {action && (
                        <div className="flex items-start gap-2 bg-muted/50 border border-dashed rounded px-2.5 py-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mt-px">
                            Fix
                          </span>
                          <span className="text-[11px] font-mono text-foreground/80 leading-relaxed">
                            {action}
                          </span>
                        </div>
                      )}

                      {invoiceId && workspaceId && (
                        <InvoiceDrillLink
                          invoiceId={invoiceId}
                          workspaceId={workspaceId}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline group"
                        >
                          View invoice #{invoiceId}
                          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                        </InvoiceDrillLink>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : passed ? (
              <p className="text-[11px] text-muted-foreground italic">
                No anomalies found.
              </p>
            ) : (
              <p className="text-[11px] text-destructive bg-destructive/5 border border-destructive/15 rounded px-3 py-2 max-w-xl">
                Check halted — unhandled evaluation exception.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AccountingIntegrityCheckPage() {
  const { id: workspaceId } = useParams();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    return integrityCheckApi
      .index()
      .then((res) => {
        const payload = res.data?.data || {};
        setLatest(payload.latest || null);
        setHistory(payload.history?.data || []);
      })
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to load integrity data",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runChecks = useCallback(() => {
    setRunning(true);
    integrityCheckApi
      .runNow()
      .then((res) => {
        const run = res.data?.data;
        if (run) setLatest(run);
        toast.success(res.data?.message || "Audit complete.");
        return load();
      })
      .catch((err) =>
        toast.error(err?.response?.data?.message || "Audit execution failed"),
      )
      .finally(() => setRunning(false));
  }, [load]);

  const checkItems = useMemo(() => resolveCheckItems(latest), [latest]);
  const isHealthy = latest?.is_healthy ?? latest?.health_status === "good";
  const issueCount = latest?.issue_count ?? 0;
  const passedCount = checkItems.filter((c) => c.passed).length;
  const failedCount = checkItems.filter((c) => !c.passed).length;

  // Skeleton loader
  if (loading && !latest) {
    return (
      <div className="w-full space-y-5 px-4 py-6 md:px-0 animate-pulse">
        <div className="h-10 w-72 bg-muted rounded-lg" />
        <div className="grid grid-cols-4 gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-14 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 px-4 py-6 md:px-0">
      {/* ── Header ── */}
      <PageHeader
        title="Ledger integrity"
        subtitle="GL balance validation · subledger reconciliation · posting checks"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={load}
              disabled={loading || running}
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={runChecks}
              disabled={running}
            >
              {running ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
              Run audit
            </Button>
          </div>
        }
      />

      {/* ── Metric row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <MetricCard
          label="Checks run"
          value={checkItems.length}
          sub="total protocols"
        />
        <MetricCard
          label="Passed"
          value={passedCount}
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <MetricCard
          label="Failed"
          value={failedCount}
          valueClass={
            failedCount > 0
              ? "text-red-600 dark:text-red-400"
              : "text-foreground"
          }
        />
        <MetricCard
          label="Open issues"
          value={issueCount}
          valueClass={
            issueCount > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-foreground"
          }
        />
      </div>

      {/* ── Status strip ── */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg border",
          isHealthy
            ? "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
            : "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
        )}
      >
        {isHealthy ? (
          <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <ShieldAlert className="size-4 text-red-600 dark:text-red-400 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-foreground">
            {isHealthy ? "All checks passed" : "Discrepancies detected"}
          </span>
          <span className="text-[12px] text-muted-foreground ml-2">
            {latest?.summary_line ||
              (isHealthy
                ? "GL accounts reconcile with all subledger registers."
                : "Action required: variances found between GL journals and subledger registers.")}
          </span>
        </div>

        {latest?.run_completed_at_display && (
          <span className="text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:block">
            Last run: {latest.run_completed_at_display}
            {latest.duration_ms != null &&
              ` · ${latest.duration_ms.toLocaleString()}ms`}
          </span>
        )}

        {!latest && (
          <span className="text-[11px] text-muted-foreground shrink-0 italic">
            No audit run yet
          </span>
        )}
      </div>

      {/* ── Check list ── */}
      <div>
        <SectionLabel icon={FileText}>Audit checks</SectionLabel>
        <div className="bg-card border rounded-lg overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[28px_10px_1fr_90px_66px_20px] gap-x-3 items-center px-4 py-2 bg-muted/30 border-b">
            {["#", "", "Check", "Issues", "Status", ""].map((h, i) => (
              <span
                key={i}
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60",
                  h === "Issues" && "text-right",
                )}
              >
                {h}
              </span>
            ))}
          </div>

          {checkItems.length > 0 ? (
            checkItems.map((check, i) => (
              <CheckRow
                key={check.id}
                check={check}
                workspaceId={workspaceId}
                defaultOpen={!check.passed}
                index={i}
              />
            ))
          ) : (
            <div className="py-14 text-center">
              <p className="text-[13px] text-muted-foreground">
                No audit protocols have been run yet.
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Click "Run audit" to start.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── History table ── */}
      {history.length > 0 && (
        <div>
          <SectionLabel icon={History}>Run history</SectionLabel>
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    {[
                      "Timestamp",
                      "Trigger",
                      "Status",
                      "Duration",
                      "Issues",
                    ].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60",
                          h === "Issues" && "text-right",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const ok = row.is_healthy || row.health_status === "good";
                    const cfg = ok ? SEVERITY.ok : SEVERITY.error;
                    return (
                      <tr
                        key={row.id}
                        className="border-b last:border-b-0 hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {row.run_completed_at_display ||
                            row.run_completed_at ||
                            "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-foreground capitalize">
                          {row.trigger || "System"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                              cfg.badge,
                            )}
                          >
                            <span
                              className={cn("size-[5px] rounded-full", cfg.dot)}
                            />
                            {ok ? "Passed" : "Failed"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                          {row.duration_ms != null
                            ? `${row.duration_ms.toLocaleString()}ms`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[12px] font-semibold tabular-nums text-foreground">
                          {row.issue_count ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
