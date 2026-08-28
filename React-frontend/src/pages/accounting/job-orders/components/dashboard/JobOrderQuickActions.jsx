import { Link } from 'react-router';
import { BarChart3, CheckCircle2, ClipboardPlus, PlayCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ACTION_ICONS = {
  create: Plus,
  approve: CheckCircle2,
  start: PlayCircle,
  complete: CheckCircle2,
  reports: BarChart3,
};

export function JobOrderQuickActions({ actions = [], base, reportsBase }) {
  const resolvePath = (action) => {
    if (action.path === 'create') return `${base}/create`;
    if (action.path === 'reports/profit-loss-by-job') return reportsBase;
    return base;
  };

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-semibold">Quick actions</CardTitle>
        <CardDescription className="text-xs">Common job order operations</CardDescription>
      </CardHeader>
      <CardContent className="p-4 grid gap-2">
        {actions.map((action) => {
          const Icon = ACTION_ICONS[action.key] || ClipboardPlus;
          const to = resolvePath(action);

          return (
            <Button key={action.key} variant="outline" className="justify-start h-auto py-2.5" asChild>
              <Link to={to}>
                <Icon className="size-4 mr-2 shrink-0" />
                <span className="text-left">
                  <span className="block text-sm font-medium">{action.label}</span>
                  {action.hint ? (
                    <span className="block text-[11px] text-muted-foreground font-normal mt-0.5">
                      {action.hint}
                    </span>
                  ) : null}
                </span>
              </Link>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
