import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { EllipsisVertical, RotateCcw, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  companyInitials,
  companyLocation,
  formatCompanyDate,
} from './companies-ui';
import { TRASH_RETENTION_DAYS } from '../api/companies.api';

function formatDaysRemaining(company) {
  if (typeof company.days_remaining === 'number') {
    if (company.days_remaining <= 0) return 'Deleting soon';
    if (company.days_remaining === 1) return '1 day left';
    return `${company.days_remaining} days left`;
  }

  if (!company.purge_at) return `${TRASH_RETENTION_DAYS} days left`;

  const purge = new Date(company.purge_at);
  const diff = Math.ceil((purge - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Deleting soon';
  if (diff === 1) return '1 day left';
  return `${diff} days left`;
}

export function CompaniesTrashTable({ rows, loading, onRestore, onForceDelete }) {
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        id: 'name',
        header: ({ column }) => <DataGridColumnHeader title="Company" column={column} />,
        cell: ({ row }) => {
          const company = row.original;
          return (
            <div className="flex items-center gap-3 min-w-0 py-0.5">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="text-xs font-semibold bg-muted">
                  {companyInitials(company.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {company.type || 'Other'} · {company.currency || 'USD'}
                </p>
              </div>
            </div>
          );
        },
        size: 280,
      },
      {
        accessorKey: 'deleted_at',
        id: 'deleted_at',
        header: ({ column }) => <DataGridColumnHeader title="Moved to trash" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatCompanyDate(row.original.deleted_at)}
          </span>
        ),
        size: 140,
      },
      {
        id: 'retention',
        header: 'Auto-delete',
        cell: ({ row }) => {
          const label = formatDaysRemaining(row.original);
          const urgent = label === 'Deleting soon' || (row.original.days_remaining ?? 99) <= 3;
          return (
            <Badge variant={urgent ? 'destructive' : 'secondary'} className="font-normal">
              {label}
            </Badge>
          );
        },
        enableSorting: false,
        size: 130,
      },
      {
        accessorKey: 'location',
        id: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{companyLocation(row.original)}</span>
        ),
        enableSorting: false,
        size: 160,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const company = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onRestore?.(company)}>
                    <RotateCcw className="size-4" />
                    Restore company
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onForceDelete?.(company)}
                  >
                    <Trash2 className="size-4" />
                    Delete permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        enableSorting: false,
        size: 56,
      },
    ],
    [onRestore, onForceDelete],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
      sorting: [{ id: 'deleted_at', desc: true }],
    },
  });

  if (loading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground px-6">
        Trash is empty. Deleted companies appear here for {TRASH_RETENTION_DAYS} days before
        permanent removal.
      </div>
    );
  }

  return (
    <DataGrid table={table} recordCount={rows.length}>
      <CardTable>
        <ScrollArea>
          <DataGridTable />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardTable>
      <CardFooter className="justify-end border-t py-3">
        <DataGridPagination />
      </CardFooter>
    </DataGrid>
  );
}
