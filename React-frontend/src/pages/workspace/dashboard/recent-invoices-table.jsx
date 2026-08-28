import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { Eye, FileText } from 'lucide-react';
import { formatCurrency } from '@/pages/accounting/invoices/constants';
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
import { EmptyState } from './dashboard-ui';

const statusColors = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  refund: 'bg-purple-100 text-purple-700 border-purple-200',
};

const statusLabels = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  refund: 'Refund',
};

function customerInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function RecentInvoicesTable({ companyId, invoices = [], loading, actionTo }) {
  const base = `/workspace/${companyId}/accounting/invoices`;

  const columns = useMemo(
    () => [
      {
        accessorKey: 'invoice_date',
        id: 'invoice_date',
        header: ({ column }) => <DataGridColumnHeader title="Date" column={column} />,
        cell: ({ row }) => {
          const invoice = row.original;
          const href = `${base}/${invoice.id}`;
          return (
            <Link
              to={href}
              className="text-sm text-foreground tabular-nums whitespace-nowrap hover:text-primary transition-colors"
            >
              {invoice.invoice_date_display || invoice.invoice_date || '—'}
            </Link>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'invoice_number',
        id: 'invoice_number',
        header: ({ column }) => <DataGridColumnHeader title="Invoice #" column={column} />,
        cell: ({ row }) => {
          const invoice = row.original;
          return (
            <Link
              to={`${base}/${invoice.id}`}
              className="font-medium font-mono text-sm text-primary hover:text-primary/80 transition-colors"
            >
              {invoice.invoice_number || '—'}
            </Link>
          );
        },
        size: 140,
      },
      {
        id: 'customer',
        accessorFn: (row) => row.customer?.name || 'Walk-in Customer',
        header: ({ column }) => <DataGridColumnHeader title="Customer" column={column} />,
        cell: ({ row }) => {
          const customer = row.original.customer;
          const name = customer?.name || 'Walk-in Customer';
          const email = customer?.email || row.original.contact_email;
          const href = `${base}/${row.original.id}`;

          return (
            <Link
              to={href}
              className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                  {customerInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-px min-w-0">
                <span className="font-medium text-sm truncate block text-foreground">
                  {name}
                </span>
                {email ? (
                  <div className="text-xs text-muted-foreground truncate">{email}</div>
                ) : null}
              </div>
            </Link>
          );
        },
        size: 220,
      },
      {
        accessorKey: 'due_date',
        id: 'due_date',
        header: ({ column }) => <DataGridColumnHeader title="Due Date" column={column} />,
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="text-sm text-muted-foreground tabular-nums whitespace-nowrap hover:text-primary transition-colors"
          >
            {row.original.due_date_display || row.original.due_date || '—'}
          </Link>
        ),
        size: 120,
      },
      {
        accessorKey: 'total',
        id: 'total',
        header: ({ column }) => <DataGridColumnHeader title="Amount" column={column} />,
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="font-semibold text-sm tabular-nums whitespace-nowrap hover:text-primary transition-colors block"
          >
            {formatCurrency(row.original.total, row.original.currency)}
          </Link>
        ),
        size: 130,
      },
      {
        accessorKey: 'balance_due',
        id: 'balance_due',
        header: ({ column }) => <DataGridColumnHeader title="Balance Due" column={column} />,
        cell: ({ row }) => {
          const due = Number(row.original.balance_due);
          return (
            <Link
              to={`${base}/${row.original.id}`}
              className={cn(
                'text-sm tabular-nums font-semibold whitespace-nowrap hover:underline block',
                due > 0 ? 'text-amber-700' : 'text-muted-foreground',
              )}
            >
              {formatCurrency(row.original.balance_due, row.original.currency)}
            </Link>
          );
        },
        size: 130,
      },
      {
        accessorKey: 'status',
        id: 'status',
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => {
          const status = row.original.status || 'draft';
          return (
            <Link to={`${base}/${row.original.id}`} className="inline-flex">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full capitalize font-normal',
                  statusColors[status] || statusColors.draft,
                )}
              >
                {statusLabels[status] || status}
              </Badge>
            </Link>
          );
        },
        size: 110,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <Link to={`${base}/${row.original.id}`} title="View invoice">
                <Eye className="size-4" />
              </Link>
            </Button>
          </div>
        ),
        size: 60,
        enableSorting: false,
      },
    ],
    [base],
  );

  const table = useReactTable({
    columns,
    data: invoices,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <DataGrid
      table={table}
      recordCount={invoices.length}
      isLoading={loading}
      tableLayout={{
        cellBorder: true,
        rowBorder: true,
        headerBackground: true,
        headerBorder: true,
      }}
    >
      <Card className="h-full">
        <CardHeader className="py-5 min-h-0">
          <CardTitle>Recent invoices</CardTitle>
          <CardToolbar>
            <Button variant="outline" size="sm" asChild>
              <Link to={actionTo || base}>View all</Link>
            </Button>
          </CardToolbar>
        </CardHeader>
        {loading ? (
          <div className="px-5 pb-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState message="No invoices yet." icon={FileText} />
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
