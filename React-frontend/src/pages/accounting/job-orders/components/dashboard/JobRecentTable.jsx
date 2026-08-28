import { useMemo } from 'react';
import { Link } from 'react-router';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { Briefcase, Eye } from 'lucide-react';
import { formatJobType } from '../../constants';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTable, CardTitle, CardToolbar } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/pages/workspace/dashboard/dashboard-ui';

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatUpdated(job) {
  const raw = job.updated_at_display || job.updated_at;
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function JobRecentTable({ jobs = [], base, loading }) {
  const rows = useMemo(() => jobs.slice(0, 5), [jobs]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'job_number',
        id: 'job_number',
        header: ({ column }) => <DataGridColumnHeader title="Job #" column={column} />,
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="font-medium font-mono text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {row.original.job_number || '—'}
          </Link>
        ),
        size: 110,
      },
      {
        accessorKey: 'title',
        id: 'title',
        header: ({ column }) => <DataGridColumnHeader title="Job" column={column} />,
        cell: ({ row }) => {
          const job = row.original;
          return (
            <div className="min-w-0">
              <span className="font-medium text-sm truncate block">{job.title || 'Untitled job'}</span>
              <span className="text-xs text-muted-foreground capitalize">{formatJobType(job.job_type)}</span>
            </div>
          );
        },
        size: 200,
      },
      {
        id: 'customer',
        header: ({ column }) => <DataGridColumnHeader title="Customer" column={column} />,
        cell: ({ row }) => {
          const name = row.original.customer?.name || 'No customer';
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{name}</span>
            </div>
          );
        },
        size: 180,
      },
      {
        id: 'updated',
        header: ({ column }) => <DataGridColumnHeader title="Updated" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
            {formatUpdated(row.original)}
          </span>
        ),
        size: 120,
      },
      {
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => (
          <Badge variant="outline" className={cn('capitalize font-normal', row.original.status_badge_class)}>
            {row.original.status_label || row.original.status || '—'}
          </Badge>
        ),
        size: 120,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <Link to={`${base}/${row.original.id}`} title="View job">
                <Eye className="size-4" />
              </Link>
            </Button>
          </div>
        ),
        size: 52,
        enableSorting: false,
      },
    ],
    [base],
  );

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      isLoading={loading}
      tableLayout={{
        cellBorder: true,
        rowBorder: true,
        headerBackground: true,
        headerBorder: true,
      }}
    >
      <Card>
        <CardHeader className="py-5 min-h-0">
          <CardTitle>Recently updated</CardTitle>
          <CardToolbar>
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>View all</Link>
            </Button>
          </CardToolbar>
        </CardHeader>

        {loading ? (
          <div className="px-5 pb-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 pb-6">
            <EmptyState message="No recent job activity yet." icon={Briefcase} />
          </div>
        ) : (
          <CardTable>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
        )}
      </Card>
    </DataGrid>
  );
}
