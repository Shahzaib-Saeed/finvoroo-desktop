import { Link } from "react-router";
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtCurrency } from "@/pages/workspace/dashboard/dashboard-ui";
import { cn } from "@/lib/utils";

// Per-KPI icon + filled tint. Each key maps to a small semantic palette so the
// icon reads as a context signal (delayed = amber, due-today = red, etc.)
// instead of a generic decorative container.
const KPI_META = {
  open_jobs:        { icon: Briefcase,        tone: "slate"   },
  in_progress:      { icon: Loader2,          tone: "blue"    },
  completed:        { icon: CheckCircle2,     tone: "emerald" },
  delayed:          { icon: AlertTriangle,    tone: "amber"   },
  due_today:        { icon: CalendarClock,    tone: "red"     },
  total_job_value:  { icon: CircleDollarSign, tone: "indigo"  },
  total_cost:       { icon: Wallet,           tone: "amber"   },
  expected_profit:  { icon: TrendingUp,       tone: "emerald" },
};

const TONE_CLASSES = {
  slate:   "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  blue:    "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  amber:   "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  red:     "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  indigo:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
};

function TrendBadge({ trend }) {
  if (trend === undefined || trend === null) return null;

  const up = trend > 0;
  const neutral = trend === 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums",
        neutral && "text-muted-foreground",
        up && "text-emerald-600 dark:text-emerald-400",
        !up && !neutral && "text-red-600 dark:text-red-400",
      )}
    >
      {!neutral && (up ? "↗" : "↘")}
      {neutral ? "No change" : `${Math.abs(trend)}% vs last period`}
    </span>
  );
}

function JobOrderKpiCard({
  icon: Icon,
  tone = "slate",
  label,
  value,
  sub,
  trend,
  loading,
  to,
}) {
  // Plain container instead of the shadcn <Card/> primitive. shadcn's Card adds
  // its own rounded-xl + shadow-xs + a subtle "black/5" class that renders as
  // a faint bottom edge on some themes — this bypasses that entirely so the
  // KPI cards read as crisp, uniform white blocks.
  const inner = (
    <div
      className={cn(
        "group flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.03)]",
        "dark:border-slate-800 dark:bg-slate-950",
        to && "transition-shadow hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
      )}
    >
      {/* Top row: label · colored micro-icon */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              TONE_CLASSES[tone] || TONE_CLASSES.slate,
            )}
          >
            <Icon className="size-4" strokeWidth={2.25} />
          </span>
        )}
      </div>

      {/* Middle: bold metric */}
      {loading ? (
        <Skeleton className="mt-4 h-9 w-20" />
      ) : (
        <p className="mt-4 text-[2rem] font-bold leading-none tabular-nums tracking-tight text-foreground">
          {value}
        </p>
      )}

      {/* Bottom: trend text, small + clean */}
      <div className="mt-2 min-h-4">
        {!loading &&
          (sub ? (
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          ) : (
            <TrendBadge trend={trend} />
          ))}
      </div>
    </div>
  );

  if (!to) return inner;

  return (
    <Link to={to} className="block h-full no-underline text-inherit">
      {inner}
    </Link>
  );
}

export function JobOrderKpiGrid({
  kpis = [],
  currency = "USD",
  base,
  drillDownPath,
  loading,
}) {
  // Flex-wrap + `max-w-[280px]` per card. On very wide screens the cards stay
  // capped at 280px instead of stretching edge-to-edge; on narrower screens
  // they still flow 2-up / 1-up because `flex-1 basis-[240px]` lets them
  // shrink while `max-w` prevents ballooning.
  return (
    <div className="flex flex-wrap gap-4">
      {kpis.map((kpi) => {
        const meta = KPI_META[kpi.key] || { icon: Briefcase, tone: "slate" };
        const isMoney = Boolean(kpi.currency);
        const value = isMoney
          ? fmtCurrency(Number(kpi.value || 0), currency)
          : (kpi.value ?? 0);
        const to = kpi.drill_down ? drillDownPath(base, kpi.drill_down) : null;

        return (
          <div
            key={kpi.key}
            className="flex-1 basis-60 max-w-70"
          >
            <JobOrderKpiCard
              icon={meta.icon}
              tone={meta.tone}
              label={kpi.label}
              value={value}
              sub={kpi.sub}
              trend={kpi.trend_pct ?? undefined}
              loading={loading}
              to={to}
            />
          </div>
        );
      })}
    </div>
  );
}
