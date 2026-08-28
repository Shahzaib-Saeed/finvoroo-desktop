import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function JobOrderPipelineBar({ stages = [], base, loading }) {
  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-semibold">Job pipeline</CardTitle>
        <CardDescription className="text-xs">Operational flow at a glance</CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-5">
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted/40" />
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
            {stages.map((stage, index) => (
              <div key={stage.key} className="flex items-center gap-2 flex-1 min-w-0">
                <Link
                  to={base}
                  className={cn(
                    'flex-1 rounded-xl border bg-muted/20 px-3 py-4 text-center hover:bg-muted/40 transition-colors min-w-0',
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                    {stage.label}
                  </p>
                  <p className="text-2xl font-bold tabular-nums mt-1">{stage.count ?? 0}</p>
                </Link>
                {index < stages.length - 1 ? (
                  <ArrowRight className="size-4 text-muted-foreground shrink-0 hidden lg:block" />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
