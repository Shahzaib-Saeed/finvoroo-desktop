import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function ProgressBar({ value }) {
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden flex-1">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function JobTable({ jobs, base, variant = 'default' }) {
  if (!jobs?.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {variant === 'overdue' ? 'No overdue jobs.' : 'No jobs due today.'}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Job #</th>
            <th className="py-2 pr-3 font-medium">Customer</th>
            {variant === 'overdue' ? (
              <>
                <th className="py-2 pr-3 font-medium">Days late</th>
                <th className="py-2 pr-3 font-medium">Assigned</th>
                <th className="py-2 pr-3 font-medium">Priority</th>
              </>
            ) : (
              <>
                <th className="py-2 pr-3 font-medium">Due date</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Progress</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className={cn(
                'border-b last:border-0 hover:bg-muted/30',
                variant === 'overdue' && 'bg-amber-50/40 dark:bg-amber-950/10',
              )}
            >
              <td className="py-2.5 pr-3">
                <Link to={`${base}/${job.id}`} className="font-mono text-xs text-primary hover:underline">
                  {job.job_number}
                </Link>
              </td>
              <td className="py-2.5 pr-3 text-muted-foreground">{job.customer?.name || '—'}</td>
              {variant === 'overdue' ? (
                <>
                  <td className="py-2.5 pr-3">
                    <Badge variant="outline" className="text-amber-700 border-amber-300">
                      {job.days_late ?? 0}d
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">
                    {job.assigned_user?.name || 'Unassigned'}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant="outline" className={cn('capitalize', job.priority_badge_class)}>
                      {job.priority_label || job.priority}
                    </Badge>
                  </td>
                </>
              ) : (
                <>
                  <td className="py-2.5 pr-3">{job.due_date_display || job.due_date || '—'}</td>
                  <td className="py-2.5 pr-3">
                    <Badge variant="outline" className={cn('capitalize', job.status_badge_class)}>
                      {job.status_label || job.status}
                    </Badge>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <ProgressBar value={job.completion_percent ?? 0} />
                      <span className="text-xs tabular-nums text-muted-foreground w-8">
                        {job.completion_percent ?? 0}%
                      </span>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function JobOrderDueMonitoring({ dueTodayJobs = [], overdueJobs = [], base, loading }) {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="shadow-sm">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-sm font-semibold">Jobs due today</CardTitle>
          <CardDescription className="text-xs">Open jobs scheduled to finish today</CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-2">
          {loading ? (
            <div className="h-40 animate-pulse rounded-lg bg-muted/40 my-4" />
          ) : (
            <JobTable jobs={dueTodayJobs} base={base} variant="today" />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-amber-200/60 dark:border-amber-900/40">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Overdue jobs
          </CardTitle>
          <CardDescription className="text-xs">Past due and still open</CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-2">
          {loading ? (
            <div className="h-40 animate-pulse rounded-lg bg-muted/40 my-4" />
          ) : (
            <JobTable jobs={overdueJobs} base={base} variant="overdue" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
