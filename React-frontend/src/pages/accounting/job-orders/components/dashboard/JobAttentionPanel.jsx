import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { AlertTriangle, Briefcase, CheckCircle2, Eye } from 'lucide-react';
import { formatJobType } from '../../constants';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTable, CardTitle, CardToolbar } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/base-tabs';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/pages/workspace/dashboard/dashboard-ui';

const TABS = [
  { id: 'overdue', label: 'Overdue', key: 'overdue_jobs', listQuery: 'overdue=1' },
  { id: 'due_soon', label: 'Due this week', key: 'due_soon_jobs', listQuery: '' },
  { id: 'mine', label: 'My jobs', key: 'my_jobs', listQuery: '' },
];

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function JobAttentionPanel({ data, stats, base, loading }) {
  const [activeTab, setActiveTab] = useState('overdue');
  const tab = TABS.find((t) => t.id === activeTab) || TABS[0];

  const tabCounts = {
    overdue: stats?.overdue ?? data?.overdue_jobs?.length ?? 0,
    due_soon: stats?.due_this_week ?? data?.due_soon_jobs?.length ?? 0,
    mine: data?.my_jobs?.length ?? 0,
  };

  const rows = useMemo(
    () => (data?.[tab.key] || []).slice(0, 6),
    [data, tab.key],
  );

  const listLink =
    tab.id === 'overdue' ? `${base}?overdue=1#all-jobs` : `${base}#all-jobs`;

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
        id: 'due_date',
        header: ({ column }) => <DataGridColumnHeader title="Due" column={column} />,
        cell: ({ row }) => {
          const job = row.original;
          const overdue = tab.id === 'overdue' || (job.days_late ?? 0) > 0;
          return (
            <span
              className={cn(
                'text-sm tabular-nums whitespace-nowrap',
                overdue ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-muted-foreground',
              )}
            >
              {job.due_date_display || job.due_date || '—'}
            </span>
          );
        },
        size: 110,
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
    [base, tab.id],
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
      <Card className="h-full">
        <CardHeader className="py-5 min-h-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Needs attention</CardTitle>
            <CardToolbar>
              <Button variant="outline" size="sm" asChild>
                <Link to={listLink}>View all</Link>
              </Button>
            </CardToolbar>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full sm:w-auto">
              {TABS.map((item) => (
                <TabsTrigger key={item.id} value={item.id} className="gap-1.5">
                  {item.label}
                  <span className="tabular-nums text-[10px] opacity-70">({tabCounts[item.id] ?? 0})</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        {!loading && activeTab === 'overdue' && (tabCounts.overdue ?? 0) > 0 ? (
          <div className="mx-5 flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="size-3.5 shrink-0" />
            {tabCounts.overdue} job{tabCounts.overdue === 1 ? '' : 's'} need immediate follow-up.
          </div>
        ) : null}

        {!loading && rows.length === 0 ? (
          <div className="px-5 pb-6">
            <EmptyState
              icon={activeTab === 'overdue' ? CheckCircle2 : Briefcase}
              message={
                activeTab === 'overdue'
                  ? 'No overdue jobs — you are on schedule.'
                  : activeTab === 'due_soon'
                    ? 'Nothing due in the next 7 days.'
                    : 'No jobs assigned to you right now.'
              }
            />
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
