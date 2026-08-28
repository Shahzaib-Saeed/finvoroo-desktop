import { Link } from 'react-router-dom';
import { Bell, CreditCard, HelpCircle, LayoutGrid, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UsageMeter, formatCompanyDate } from '@/pages/companies/components/companies-ui';

function fmtMoney(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function AccountPlanPanel({ account, usage, unreadNotifications, notifications, loading }) {
  if (loading) {
    return <Skeleton className="h-full min-h-[320px] rounded-xl" />;
  }

  const recent = (notifications ?? []).slice(0, 3);

  return (
    <Card className="h-full">
      <CardContent className="grow p-5 lg:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold tracking-tight">Account plan</span>
            <span className="text-sm font-medium text-muted-foreground">
              {account?.plan_name || 'Standard plan'}
            </span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Shield className="size-5" />
          </div>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          {account?.billing_cycle
            ? `${account.billing_cycle} billing · ${fmtMoney(account.plan_price)}`
            : 'Review your subscription limits and account notifications.'}
        </p>

        <div className="mb-5 flex flex-col gap-4 rounded-xl border bg-muted/20 p-4">
          <UsageMeter
            label="Companies"
            used={usage?.companies ?? 0}
            limit={usage?.company_limit ?? 1}
            hint={`${usage?.slots_remaining ?? 0} slots remaining`}
          />
          <UsageMeter
            label="Team members (plan limit)"
            used={0}
            limit={account?.company_user_limit ?? 5}
            hint="Per account subscription"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Bell className="size-4 text-muted-foreground" />
            Recent alerts
            {unreadNotifications > 0 ? (
              <span className="text-xs text-muted-foreground">({unreadNotifications} unread)</span>
            ) : null}
          </div>
          {recent.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No recent notifications.</p>
          ) : (
            recent.map((n) => (
              <div key={n.id} className="rounded-lg border bg-background px-3 py-2">
                <p className="line-clamp-1 text-sm font-medium">
                  {n.title || n.data?.title || 'Notification'}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {n.created_at ? formatCompanyDate(n.created_at) : 'Recently'}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-center gap-4">
        <Button mode="link" underlined="dashed" asChild>
          <Link to="/select-company">
            <LayoutGrid className="size-4" />
            Open workspace
          </Link>
        </Button>
        <Button mode="link" underlined="dashed" asChild>
          <Link to="/help">
            <HelpCircle className="size-4" />
            Help center
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function AccountQuickStatsFooter({ account, loading }) {
  if (loading || !account) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
      <CreditCard className="size-3.5" />
      <span>
        Member since {formatCompanyDate(account.activated_at)} · {account.plan_code}
      </span>
    </div>
  );
}
