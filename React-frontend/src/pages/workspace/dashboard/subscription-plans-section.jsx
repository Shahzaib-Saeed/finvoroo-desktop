import { Check, Crown, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PLAN_STYLES = {
  BASIC: {
    icon: Zap,
    badge: 'secondary',
    ring: 'ring-muted-foreground/20',
    header: 'bg-muted/50',
  },
  ADVANCED: {
    icon: Sparkles,
    badge: 'success',
    ring: 'ring-green-500/30',
    header: 'bg-green-500/5',
  },
  PREMIUM: {
    icon: Crown,
    badge: 'primary',
    ring: 'ring-primary/40',
    header: 'bg-primary/5',
  },
};

const DEFAULT_PLANS = [
  {
    code: 'BASIC',
    name: 'Basic',
    price: 10,
    billing_cycle: 'monthly',
    description: 'Ideal for freelancers and solo businesses.',
    company_limit: 1,
    company_user_limit: 3,
    invoice_limit: 100,
    can_export_reports: false,
    can_use_api: false,
  },
  {
    code: 'ADVANCED',
    name: 'Advanced',
    price: 20,
    billing_cycle: 'monthly',
    description: 'Perfect for growing teams and SMEs.',
    company_limit: 3,
    company_user_limit: 10,
    invoice_limit: 500,
    can_export_reports: true,
    can_use_api: false,
  },
  {
    code: 'PREMIUM',
    name: 'Premium',
    price: 50,
    billing_cycle: 'monthly',
    description: 'Full power for enterprises and multi-company groups.',
    company_limit: 10,
    company_user_limit: 25,
    invoice_limit: 9999,
    can_export_reports: true,
    can_use_api: true,
  },
];

function PlanFeature({ ok, children }) {
  return (
    <li className={`flex items-start gap-2 text-xs ${ok ? 'text-foreground' : 'text-muted-foreground'}`}>
      <Check className={`size-3.5 shrink-0 mt-0.5 ${ok ? 'text-green-600' : 'text-muted-foreground/40'}`} />
      <span>{children}</span>
    </li>
  );
}

export function SubscriptionPlansSection({ subscription, loading }) {
  const plans = subscription?.plans?.length ? subscription.plans : DEFAULT_PLANS;
  const currentCode = (subscription?.current?.code || 'BASIC').toUpperCase();
  const usage = subscription?.usage ?? {};
  const current = subscription?.current;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-semibold">Your subscription</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare Basic, Advanced, and Premium — current plan highlighted
          </p>
        </div>
        {current && (
          <Badge variant="primary" appearance="light" size="sm">
            Active: {current.name}
            {current.is_trial ? ' (trial)' : ''}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {usage.company_limit != null && (
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground rounded-lg bg-muted/40 px-4 py-3">
            <span>
              <strong className="text-foreground">{usage.companies ?? 0}</strong>
              {' / '}
              {usage.company_limit} companies
            </span>
            <span>
              <strong className="text-foreground">{usage.invoices_this_month ?? 0}</strong>
              {' / '}
              {usage.invoice_limit} invoices this month
            </span>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const code = (plan.code || '').toUpperCase();
            const style = PLAN_STYLES[code] || PLAN_STYLES.BASIC;
            const Icon = style.icon;
            const isCurrent = code === currentCode;

            return (
              <div
                key={code}
                className={`relative rounded-xl border bg-card overflow-hidden transition-shadow ${
                  isCurrent ? `ring-2 ${style.ring} shadow-md` : 'border-border hover:border-primary/20'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-3 right-3">
                    <Badge variant={style.badge} size="xs" appearance="light">
                      Current
                    </Badge>
                  </div>
                )}
                <div className={`px-4 py-4 border-b ${style.header}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`size-8 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-sm">{plan.name}</h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{plan.description}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums">${Number(plan.price).toFixed(0)}</span>
                    <span className="text-xs text-muted-foreground">/{plan.billing_cycle === 'yearly' ? 'yr' : 'mo'}</span>
                  </div>
                </div>
                <ul className="px-4 py-3 space-y-1.5">
                  <PlanFeature ok>{plan.company_limit} {plan.company_limit === 1 ? 'company' : 'companies'}</PlanFeature>
                  <PlanFeature ok>{plan.company_user_limit} users per company</PlanFeature>
                  <PlanFeature ok>{plan.invoice_limit >= 9999 ? 'Unlimited' : plan.invoice_limit} invoices/mo</PlanFeature>
                  <PlanFeature ok={plan.can_export_reports}>Export reports</PlanFeature>
                  <PlanFeature ok={plan.can_use_api}>API access</PlanFeature>
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
