import { Link } from 'react-router';
import { Building2, Zap } from 'lucide-react';
import { HexagonBadge } from '@/partials/common/hexagon-badge';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function SettingsEnterpriseBanner({
  companyName,
  currency,
  autoPost,
  workspaceId,
}) {
  const accountingBase = workspaceId ? `/workspace/${workspaceId}/accounting` : '#';

  return (
    <>
      <style>
        {`
          .settings-enterprise-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1200/bg-1.svg')}');
          }
          .dark .settings-enterprise-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1200/bg-1-dark.svg')}');
          }
        `}
      </style>

      <Card className="rounded-xl min-w-full">
        <div className="flex items-center flex-wrap sm:flex-nowrap justify-between grow gap-4 p-5 rtl:[background-position:-30%_41%] [background-position:121%_41%] bg-no-repeat bg-[length:660px_310px] settings-enterprise-bg">
          <div className="flex items-center gap-4 min-w-0">
            <HexagonBadge
              stroke="stroke-primary/20 dark:stroke-primary/30"
              fill="fill-primary/5 dark:fill-primary/10"
              size="size-[50px]"
              badge={<Building2 size={20} className="text-primary" />}
            />
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center flex-wrap gap-2.5">
                <span className="text-base font-medium text-mono truncate">{companyName}</span>
                <Badge variant="secondary" appearance="light">
                  {currency || 'USD'}
                </Badge>
                <Badge variant={autoPost ? 'success' : 'secondary'} appearance="light" className="gap-1">
                  <Zap className="size-3" />
                  {autoPost ? 'Auto-post on' : 'Manual posting'}
                </Badge>
              </div>
              <p className="text-sm text-secondary-foreground max-w-2xl">
                Configure company profile, inventory costing, approvals, posting rules, and custom
                fields for this workspace. Changes apply to invoices, bills, and all accounting modules.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {workspaceId ? (
              <Button variant="mono" asChild>
                <Link to={`${accountingBase}/chart-of-accounts`}>Chart of accounts</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </>
  );
}
