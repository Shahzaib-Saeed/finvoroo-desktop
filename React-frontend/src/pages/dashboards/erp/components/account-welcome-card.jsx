import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { AvatarGroup } from '@/partials/common/avatar-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { companyInitials } from '@/pages/companies/components/companies-ui';

export function AccountWelcomeCard({ user, account, companies, loading, className }) {
  if (loading) {
    return <Skeleton className={className ? `${className} h-full min-h-[280px]` : 'h-[280px] w-full rounded-xl'} />;
  }

  const avatarTones = [
    'bg-indigo-500/15 text-indigo-700',
    'bg-emerald-500/15 text-emerald-700',
    'bg-amber-500/15 text-amber-700',
    'bg-rose-500/15 text-rose-700',
  ];

  const avatarGroup = (companies ?? []).slice(0, 4).map((company, i) => ({
    fallback: companyInitials(company.name),
    variant: `text-[11px] ring-background ${avatarTones[i % avatarTones.length]}`,
  }));

  if (avatarGroup.length === 0) {
    avatarGroup.push({
      fallback: (user?.name || 'A').slice(0, 1).toUpperCase(),
      variant: 'text-white text-xs ring-background bg-indigo-500',
    });
  } else if (companies.length > 4) {
    avatarGroup.push({
      fallback: `+${companies.length - 4}`,
      variant: 'text-white text-xs ring-background bg-emerald-500',
    });
  }

  return (
    <Fragment>
      <style>
        {`
          .account-welcome-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/2.png')}');
          }
          .dark .account-welcome-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/2-dark.png')}');
          }
        `}
      </style>

      <Card className={`h-full overflow-hidden border-indigo-200/70 dark:border-indigo-800/40 ${className ?? ''}`}>
        <CardContent className="bg-gradient-to-br from-indigo-50/90 via-white to-amber-50/40 p-8 lg:p-10 bg-[length:80%] rtl:[background-position:-70%_25%] [background-position:175%_25%] bg-no-repeat account-welcome-bg dark:from-indigo-950/40 dark:via-background dark:to-amber-950/20">
          <div className="flex max-w-2xl flex-col justify-center gap-4">
            <AvatarGroup size="size-10" group={avatarGroup} />

            <div className="space-y-1">
              <p className="text-sm font-medium text-indigo-700/80 dark:text-indigo-300">Welcome back</p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {user?.name || 'Account owner'}
              </h2>
            </div>

            <p className="text-sm font-normal leading-5.5 text-secondary-foreground">
              Manage all companies, monitor portfolio health, and open any workspace from one
              central account hub.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Badge className="border-transparent bg-indigo-500/15 text-indigo-800 dark:text-indigo-200">
                Account owner
              </Badge>
              {account?.plan_name ? (
                <Badge className="border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-200">
                  {account.plan_name}
                </Badge>
              ) : null}
              {account?.status ? (
                <Badge variant="success" appearance="light" className="capitalize">
                  {account.status}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-center gap-4 flex-wrap">
          <Button mode="link" underlined="dashed" asChild>
            <Link to="/companies">Manage companies</Link>
          </Button>
          <Button mode="link" underlined="dashed" asChild>
            <Link to="/profile">Account settings</Link>
          </Button>
        </CardFooter>
      </Card>
    </Fragment>
  );
}
