import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { ExternalLink, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
  CardHeading,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CompanyStatusBadge,
  companyInitials,
  companyLocation,
  formatCompanyDate,
  isCompanyActive,
} from '@/pages/companies/components/companies-ui';
import { cn } from '@/lib/utils';

function fmtMoney(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function AccountCompaniesTable({ companies, loading, onOpen }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: 'name', desc: false }]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return companies ?? [];
    return (companies ?? []).filter((c) =>
      [c.name, c.email, c.city, c.country, c.type].filter(Boolean).some((v) =>
        String(v).toLowerCase().includes(q),
      ),
    );
  }, [companies, searchQuery]);

  const openCompany = (company) => {
    if (!isCompanyActive(company)) {
      toast.error('Activate this company before opening its workspace.');
      return;
    }
    onOpen?.(company);
  };

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader title="Company" column={column} />,
        cell: ({ row }) => {
          const company = row.original;
          const active = isCompanyActive(company);
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback
                  className={cn(
                    'text-xs font-semibold',
                    active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {companyInitials(company.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{company.name}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {company.type || 'Business entity'}
                </p>
              </div>
            </div>
          );
        },
        size: 260,
      },
      {
        id: 'location',
        accessorFn: (row) => companyLocation(row),
        header: ({ column }) => <DataGridColumnHeader title="Location" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{companyLocation(row.original)}</span>
        ),
        size: 150,
      },
      {
        id: 'ar_outstanding',
        accessorFn: (row) => row.stats?.ar_outstanding ?? 0,
        header: ({ column }) => <DataGridColumnHeader title="Receivables" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {fmtMoney(row.original.stats?.ar_outstanding ?? 0, row.original.currency || 'USD')}
          </span>
        ),
        size: 130,
      },
      {
        id: 'collected',
        accessorFn: (row) => row.stats?.collected ?? 0,
        header: ({ column }) => <DataGridColumnHeader title="Collected" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {fmtMoney(row.original.stats?.collected ?? 0, row.original.currency || 'USD')}
          </span>
        ),
        size: 130,
      },
      {
        id: 'open_invoices',
        accessorFn: (row) => row.stats?.open_invoices ?? 0,
        header: ({ column }) => <DataGridColumnHeader title="Open inv." column={column} />,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{row.original.stats?.open_invoices ?? 0}</span>
        ),
        size: 100,
      },
      {
        accessorKey: 'is_active',
        id: 'is_active',
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => <CompanyStatusBadge active={row.original.is_active} />,
        size: 110,
      },
      {
        accessorKey: 'created_at',
        id: 'created_at',
        header: ({ column }) => <DataGridColumnHeader title="Created" column={column} />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatCompanyDate(row.original.created_at)}
          </span>
        ),
        size: 120,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const company = row.original;
          const active = isCompanyActive(company);
          return (
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="Open workspace"
                disabled={!active}
                onClick={(e) => {
                  e.stopPropagation();
                  openCompany(company);
                }}
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
          );
        },
        size: 70,
        enableSorting: false,
      },
    ],
    // openCompany uses onOpen from props; stable enough for this table
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onOpen],
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
    getRowId: (row) => String(row.id),
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return <Skeleton className="h-[420px] w-full rounded-xl" />;
  }

  return (
    <DataGrid
      table={table}
      recordCount={filteredData?.length || 0}
      onRowClick={openCompany}
      tableLayout={{
        cellBorder: true,
        rowBorder: true,
        headerBackground: true,
        headerBorder: true,
        stripped: true,
      }}
    >
      <Card>
        <CardHeader className="py-4">
          <CardHeading>
            <CardTitle>Your companies</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Click any row to open that company workspace
            </p>
          </CardHeading>
          <CardToolbar className="relative flex-wrap gap-2">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52 ps-9"
            />
            {searchQuery ? (
              <Button
                mode="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setSearchQuery('')}
              >
                <X className="size-4" />
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => navigate('/companies')}>
              Manage all
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter>
          <DataGridPagination sizes={[5, 10, 15, 25]} />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
