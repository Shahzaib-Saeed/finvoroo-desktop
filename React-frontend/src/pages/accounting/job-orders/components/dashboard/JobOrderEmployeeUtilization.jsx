import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function JobOrderEmployeeUtilization({ utilization, loading }) {
  const rows = utilization?.rows || [];
  const capacityHours = utilization?.capacity_hours ?? 0;

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-semibold">Employee utilization</CardTitle>
        <CardDescription className="text-xs">
          Active assignments and logged hours vs {capacityHours}h capacity in period
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-4">
        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-muted/40" />
        ) : !rows.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No assigned employees in this filter scope.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Employee</th>
                  <th className="py-2 pr-3 font-medium">Active jobs</th>
                  <th className="py-2 pr-3 font-medium">Hours logged</th>
                  <th className="py-2 font-medium">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.employee_id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{row.name}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{row.active_jobs ?? 0}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{row.hours_logged ?? 0}h</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="h-2 rounded-full bg-muted overflow-hidden flex-1">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              (row.utilization_percent ?? 0) >= 90
                                ? 'bg-amber-500'
                                : 'bg-primary',
                            )}
                            style={{ width: `${Math.min(100, row.utilization_percent ?? 0)}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums w-10 text-right">
                          {row.utilization_percent ?? 0}%
                        </span>
                      </div>
                    </td>
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
