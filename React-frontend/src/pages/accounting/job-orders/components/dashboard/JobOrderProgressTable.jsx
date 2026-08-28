import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SORT_OPTIONS = [
  { value: 'completion_asc', label: 'Lowest completion' },
  { value: 'completion_desc', label: 'Highest completion' },
  { value: 'due_date', label: 'Due date' },
];

export function JobOrderProgressTable({ jobs = [], base, loading }) {
  const [sort, setSort] = useState('completion_asc');

  const sorted = useMemo(() => {
    const list = [...(jobs || [])];
    if (sort === 'completion_desc') {
      return list.sort((a, b) => (b.completion_percent ?? 0) - (a.completion_percent ?? 0));
    }
    if (sort === 'due_date') {
      return list.sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
    }
    return list.sort((a, b) => (a.completion_percent ?? 0) - (b.completion_percent ?? 0));
  }, [jobs, sort]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Job progress tracking</CardTitle>
            <CardDescription className="text-xs">Open jobs sorted by completion</CardDescription>
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-2">
        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-muted/40 my-4" />
        ) : !sorted.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No open jobs to track.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Job #</th>
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Stage</th>
                  <th className="py-2 pr-3 font-medium">Completion</th>
                  <th className="py-2 font-medium">Due date</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((job) => (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3">
                      <Link
                        to={`${base}/${job.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {job.job_number}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{job.customer?.name || '—'}</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant="outline" className="capitalize">
                        {(job.pipeline_stage || job.status_label || job.status || '').replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <div className="h-2 rounded-full bg-muted overflow-hidden flex-1">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, job.completion_percent ?? 0)}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums w-8">{job.completion_percent ?? 0}%</span>
                      </div>
                    </td>
                    <td className="py-2.5">{job.due_date_display || job.due_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
