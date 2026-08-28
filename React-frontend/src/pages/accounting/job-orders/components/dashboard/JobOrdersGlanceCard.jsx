import { Link } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function fmtCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function StatTile({ label, value, sub, colorClass, href }) {
  const inner = (
    <div
      className={cn(
        "group rounded-lg border bg-muted/30 p-3 transition-colors",
        href && "cursor-pointer hover:bg-muted/50 hover:border-border",
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </p>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums leading-none mb-1",
          colorClass,
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      )}
    </div>
  );

  return href ? (
    <Link to={href} className="block no-underline text-inherit">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function QuickAction({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border px-3 py-2.5 no-underline text-inherit transition-colors hover:bg-muted/40 hover:border-border"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        {description && (
          <span className="block text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
    </Link>
  );
}

export function JobOrdersGlanceCard({
  base,
  reportsBase,
  stats = {},
  currency = "USD",
}) {
  const open = stats.open ?? 0;
  const inProgress = stats.in_progress ?? 0;
  const overdue = stats.overdue ?? 0;
  const dueToday = stats.due_today ?? 0;
  const dueThisWeek = stats.due_this_week ?? 0;
  const completed = stats.completed ?? 0;
  const expectedProfit = Number(stats.expected_profit ?? 0);
  const expectedMargin = stats.expected_margin_percent;

  const onTrack = overdue === 0;
  const workloadTotal = Math.max(open, 1);
  const overdueShare = Math.min(
    100,
    Math.round((overdue / workloadTotal) * 100),
  );
  const activeShare = Math.min(
    100,
    Math.round((inProgress / workloadTotal) * 100),
  );

  return (
    <Card className="overflow-hidden border">
      {/* top accent stripe */}
      <div className="h-[3px] bg-blue-500" />

      <CardHeader className="px-5 pt-5 pb-4 border-b space-y-0">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <LayoutDashboard className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">At a glance</p>
            <p className="text-xs text-muted-foreground">
              {open} open · {inProgress} active · {completed} completed this
              period
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-4 space-y-4">
        {/* stat tiles */}
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Open"
            value={open}
            sub={`${dueToday} due today`}
            colorClass="text-blue-600 dark:text-blue-400"
            href={`${base}#all-jobs`}
          />
          <StatTile
            label="Active"
            value={inProgress}
            sub={`${activeShare}% of open workload`}
            colorClass="text-foreground"
            href={`${base}#all-jobs`}
          />
          <StatTile
            label="Due this week"
            value={dueThisWeek}
            sub="Next 7 days"
            colorClass="text-violet-600 dark:text-violet-400"
            href={`${base}#all-jobs`}
          />
          <StatTile
            label="Overdue"
            value={overdue}
            sub={
              overdue > 0 ? `${overdueShare}% of open jobs` : "All on schedule"
            }
            colorClass={
              overdue > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }
            href={overdue > 0 ? `${base}?overdue=1#all-jobs` : undefined}
          />
        </div>

        {/* schedule health */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Schedule health</span>
            <span
              className={
                onTrack
                  ? "font-medium text-emerald-600"
                  : "font-medium text-amber-600"
              }
            >
              {onTrack ? "On track" : "Needs follow-up"}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${activeShare}%` }}
            />
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${overdueShare}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-blue-500" />
              In progress
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Overdue
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-muted-foreground/30" />
              Remaining
            </span>
          </div>
        </div>

        {/* alert */}
        {onTrack ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0 mt-px" />
            <span>No overdue jobs — workload is under control.</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0 mt-px" />
            <span>
              {overdue} open job{overdue === 1 ? "" : "s"} past due — review the
              overdue list.
            </span>
          </div>
        )}

        {/* expected profit */}
        {(expectedProfit !== 0 || expectedMargin != null) && (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <TrendingUp className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-0.5">
                Expected profit (open jobs)
              </p>
              <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {fmtCurrency(expectedProfit, currency)}
                {expectedMargin != null && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    · {expectedMargin}% margin
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="border-t" />

        {/* quick actions */}
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground px-0.5 mb-2">
            Quick actions
          </p>
          <QuickAction
            to={`${base}/create`}
            icon={Plus}
            label="Create job"
            description="Start a new job order"
          />
          <QuickAction
            to={reportsBase}
            icon={BarChart3}
            label="Profit & loss by job"
            description="Review job profitability"
          />
        </div>
      </CardContent>
    </Card>
  );
}
