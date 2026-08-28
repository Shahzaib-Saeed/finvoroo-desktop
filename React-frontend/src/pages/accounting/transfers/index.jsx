import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { transfersApi } from './api/transfers.api';
import { formatCurrency, APPROVAL_COLORS } from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataGridLayout } from '@/components/ui/data-grid-layout';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

export function TransfersPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/transfers`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    transfersApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, per_page: pagination.perPage };
      if (filters.search) params.search = filters.search;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await transfersApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load transfers');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const accountLabel = (acc) =>
    acc?.label || (acc ? `${acc.code || ''} ${acc.name || ''}`.trim() : '—');

  const columns = useMemo(
    () => [
      {
        accessorKey: 'transfer_date_display',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.transfer_date_display || row.original.transfer_date || '—'}
          </span>
        ),
      },
      {
        id: 'from',
        header: 'From',
        cell: ({ row }) => (
          <span className="text-sm">{accountLabel(row.original.from_account)}</span>
        ),
      },
      {
        id: 'to',
        header: 'To',
        cell: ({ row }) => (
          <span className="text-sm">{accountLabel(row.original.to_account)}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: () => <span className="block text-right w-full">Amount</span>,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums block text-right">
            {formatCurrency(row.original.amount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
            {row.original.reference || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'approval_status',
        header: 'Approval',
        cell: ({ row }) => {
          const s = row.original.approval_status || 'approved';
          return (
            <Badge variant="outline" className={cn('capitalize', APPROVAL_COLORS[s] || '')}>
              {s}
            </Badge>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: rows,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
    },
    manualPagination: true,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: pagination.page - 1, pageSize: pagination.perPage })
          : updater;
      setPagination((p) => ({
        ...p,
        page: (next.pageIndex ?? 0) + 1,
        perPage: next.pageSize ?? p.perPage,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Transfers"
        subtitle="Move funds between cash and bank accounts on your books."
        actions={
          canCreate ? (
            <Button asChild>
              <Link to={`${base}/create`}>
                <Plus className="size-4 mr-2" /> New transfer
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search reference or memo…"
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <DatePicker
            placeholder="From"
            value={filters.dateFrom}
            onChange={(v) => {
              setFilters((f) => ({ ...f, dateFrom: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
          <DatePicker
            placeholder="To"
            value={filters.dateTo}
            onChange={(v) => {
              setFilters((f) => ({ ...f, dateTo: v }));
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
        </div>
      </div>

      <DataGridLayout table={table} recordCount={pagination.total} isLoading={loading} />
    </div>
  );
}
