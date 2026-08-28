import { Link } from 'react-router';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  PlayCircle,
  Receipt,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fmtCurrency } from '@/pages/workspace/dashboard/dashboard-ui';

const TYPE_META = {
  job_created: { icon: ClipboardList, tone: 'text-primary bg-primary/10' },
  job_updated: { icon: Clock3, tone: 'text-muted-foreground bg-muted' },
  job_started: { icon: PlayCircle, tone: 'text-blue-600 bg-blue-500/10' },
  job_completed: { icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-500/10' },
  job_delayed: { icon: AlertTriangle, tone: 'text-amber-600 bg-amber-500/10' },
  labor_logged: { icon: UserRound, tone: 'text-violet-600 bg-violet-500/10' },
  invoice_generated: { icon: FileText, tone: 'text-emerald-600 bg-emerald-500/10' },
  bill_linked: { icon: Receipt, tone: 'text-amber-600 bg-amber-500/10' },
  expense_linked: { icon: Receipt, tone: 'text-orange-600 bg-orange-500/10' },
};

function formatWhen(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function JobOrderActivityFeed({ events = [], base, currency = 'USD', loading }) {
  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-semibold">Activity feed</CardTitle>
        <CardDescription className="text-xs">
          Job lifecycle events, labor, and tagged financial documents
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-2">
        {loading ? (
          <div className="h-64 animate-pulse rounded-lg bg-muted/40 my-4" />
        ) : !events.length ? (
          <p className="text-sm text-muted-foreground py-10 text-center">No recent activity in this period.</p>
        ) : (
          <div className="divide-y">
            {events.map((event) => {
              const meta = TYPE_META[event.type] || TYPE_META.job_updated;
              const Icon = meta.icon;

              return (
                <Link
                  key={event.id}
                  to={event.job_id ? `${base}/${event.job_id}` : base}
                  className="flex items-start gap-3 py-3 hover:bg-muted/20 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', meta.tone)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{event.action}</span>
                      {event.subject ? (
                        <Badge variant="outline" className="font-mono text-[10px] h-5">
                          {event.subject}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      <span>{formatWhen(event.occurred_at)}</span>
                      {event.user_name ? <span>· {event.user_name}</span> : null}
                      {event.amount != null ? (
                        <span className="tabular-nums">· {fmtCurrency(event.amount, currency)}</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
