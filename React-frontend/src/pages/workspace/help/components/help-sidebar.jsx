import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Keyboard,
  LifeBuoy,
  Rocket,
  Search,
  Shield,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TOPIC_ICONS = {
  invoices: Wallet,
  payments: Wallet,
  journals: Search,
  permissions: Shield,
};

export function HelpSidebar({
  accountOwner,
  ownerCompanies,
  base,
  topics,
  activeTopic,
  onTopicClick,
  onRestartTour,
  restarting,
}) {
  const firstCompanyId = ownerCompanies?.[0]?.id;

  const posts = topics.map((topic) => ({
    icon: TOPIC_ICONS[topic.id] || BookOpen,
    title: topic.label,
    summary: topic.description,
    path: '#',
    topicId: topic.id,
  }));

  const TIPS = [
    'Include your company name exactly as shown in the switcher.',
    'Describe the screen, action, and expected vs. actual result.',
    'Add date, time, and timezone for posting or sync issues.',
    'Attach screenshots or export IDs when reporting list errors.',
  ];

  return (
    <div className="flex flex-col gap-5 lg:gap-7.5">
      <Card>
        <CardHeader className="py-5 min-h-0">
          <CardTitle>Quick topics</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 lg:gap-7.5">
          {posts.map((post, index) => {
            const Icon = post.icon;
            const active = activeTopic === post.topicId;

            return (
              <Fragment key={post.topicId}>
                <button
                  type="button"
                  onClick={() => onTopicClick(post.topicId === activeTopic ? null : post.topicId)}
                  className={cn(
                    'flex flex-col items-start gap-2.5 text-start w-full rounded-lg transition-colors',
                    active && 'text-primary',
                  )}
                >
                  <div className="mb-0.5">
                    <span
                      className={cn(
                        'flex size-[50px] items-center justify-center rounded-xl',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-orange-50 text-orange-400 dark:bg-orange-950/30',
                      )}
                    >
                      <Icon size={24} />
                    </span>
                  </div>
                  <span className="text-base font-semibold text-mono">{post.title}</span>
                  <p className="text-sm text-secondary-foreground mb-0">{post.summary}</p>
                </button>
                {index < posts.length - 1 && (
                  <span className="border-b border-b-border" />
                )}
              </Fragment>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-5 min-h-0">
          <CardTitle>Workspace tour</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          <p className="text-sm text-secondary-foreground mb-0 leading-relaxed">
            {accountOwner
              ? 'Open a company workspace, then run the guided tour to learn navigation and key modules.'
              : 'Reset and replay the guided tour from your dashboard—ideal for new team members.'}
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          {accountOwner && firstCompanyId ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/workspace/${firstCompanyId}/help`}>
                <Rocket className="size-4" />
                Open first workspace
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={restarting || (accountOwner && !firstCompanyId)}
              onClick={onRestartTour}
            >
              <Rocket className="size-4" />
              {accountOwner ? 'Open workspace tour' : 'Run tour again'}
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card id="help-support">
        <CardHeader className="py-5 min-h-0">
          <CardTitle>When you contact us</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          <ul className="space-y-2.5 mb-0 ps-0 list-none">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-2 text-sm text-secondary-foreground leading-relaxed">
                <LifeBuoy className="size-4 shrink-0 mt-0.5 text-primary/70" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        {!accountOwner && (
          <CardFooter className="justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>Back to dashboard</Link>
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader className="py-5 min-h-0">
          <CardTitle>Keyboard shortcuts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Keyboard className="size-4 text-muted-foreground" />
            </span>
            <p className="text-sm text-secondary-foreground mb-0 leading-relaxed">
              Press{' '}
              <kbd className="px-1.5 py-0.5 rounded border bg-background text-xs font-mono">⌘K</kbd>{' '}
              or{' '}
              <kbd className="px-1.5 py-0.5 rounded border bg-background text-xs font-mono">Ctrl+K</kbd>{' '}
              to search the workspace. Bookmark frequent pages from the header.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
