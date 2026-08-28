import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PLAN_ICONS = {
  BASIC: Zap,
  ADVANCED: Sparkles,
  PREMIUM: Crown,
};

function PlanRow({ ok, children }) {
  return (
    <div
      className={`flex items-start gap-2.5 text-sm ${ok ? "text-foreground" : "text-muted-foreground"}`}
    >
      <Check
        className={`size-4 shrink-0 mt-0.5 ${ok ? "text-green-600" : "text-muted-foreground/40"}`}
      />
      <span>{children}</span>
    </div>
  );
}

export function HomePlanDetails({ subscription, loading }) {
  const current = subscription?.current;
  const usage = subscription?.usage ?? {};
  const limits = current?.limits ?? {};
  const features = current?.features ?? {};
  const code = (current?.code || "BASIC").toUpperCase();
  const Icon = PLAN_ICONS[code] || Zap;

  return (
    <Card className="h-full">
      <CardHeader className="py-5 min-h-0 gap-2">
        <div className="flex items-center justify-between gap-2 w-full">
          <CardTitle>Plan details</CardTitle>
          {current && !loading && (
            <Badge variant="primary" appearance="light" size="sm">
              {current.is_trial ? "Trial" : "Active"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {loading ? (
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : (
          <>
            <p className="text-sm text-secondary-foreground mb-0">
              Your workspace runs on the {current?.name || "Basic"} plan. Limits
              below apply to this company and account.
            </p>

            <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-mono mb-0">
                  {current?.name || "Basic"}
                </p>
                <p className="text-xs text-muted-foreground mb-0">
                  ${Number(current?.price || 0).toFixed(0)}/
                  {current?.billing_cycle === "yearly" ? "yr" : "mo"}
                  {current?.is_trial ? " · Trial period" : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <PlanRow ok>
                {usage.companies ?? 0} /{" "}
                {usage.company_limit ?? limits.company_limit ?? 1} companies
                used
              </PlanRow>
              <PlanRow ok>
                {usage.invoices_this_month ?? 0} /{" "}
                {usage.invoice_limit ?? limits.invoice_limit ?? 100} invoices
                this month
              </PlanRow>
              <PlanRow ok={Boolean(limits.company_user_limit)}>
                Up to {limits.company_user_limit ?? 5} users per company
              </PlanRow>
              <PlanRow ok={Boolean(limits.storage_limit_mb)}>
                {limits.storage_limit_mb ?? 512} MB storage
              </PlanRow>
              <PlanRow ok={features.can_export_reports}>Export reports</PlanRow>
              <PlanRow ok={features.can_use_api}>API access</PlanRow>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
