import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Plus,
  Search,
  Eye,
  Filter,
  X,
  EllipsisVertical,
  Edit3,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { creditNotesApi } from './api/credit-notes.api';
import {
  formatCurrency,
  LIFECYCLE_COLORS,
  LIFECYCLE_STATUSES,
} from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DatePicker } from '@/components/ui/date-picker';
import { CreditNoteCreateDialog } from './components/CreditNoteCreateDialog';
import { ManageCreditNoteDialog } from './components/ManageCreditNoteDialog';
import { cn } from '@/lib/utils';

export function CreditNotesPage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/credit-notes`;
  const customersBase = `/workspace/${workspaceId}/accounting/customers`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // Page-level permission only — row-level actions come from each credit
  // note's own server-computed flags, never re-derived here.
  const [canCreate, setCanCreate] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [manageNoteId, setManageNoteId] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    lifecycle: 'all',
    dateFrom: '',
    dateTo: '',
  });

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
      const params = {
        page: pagination.page,
        per_page: pagination.perPage,
      };
      if (filters.search) params.search = filters.search;
      if (filters.lifecycle && filters.lifecycle !== 'all') {
        params.lifecycle_status = filters.lifecycle;
      }
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await creditNotesApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load credit notes');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    creditNotesApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  const resetFilters = () => {
    setFilters({ search: '', lifecycle: 'all', dateFrom: '', dateTo: '' });
    setSearchInput('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleDelete = async () => {
    if (!confirmDelete?.id) return;
    setDeletingId(confirmDelete.id);
    try {
      await creditNotesApi.delete(confirmDelete.id);
      toast.success('Credit note deleted');
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete credit note');
    } finally {
      setDeletingId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'credit_note_date_display',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.credit_note_date_display || row.original.credit_note_date || '—'}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: 'credit_note_number',
        header: 'Credit note #',
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="font-medium text-sm text-primary hover:underline font-mono"
          >
            {row.original.credit_note_number || '—'}
          </Link>
        ),
        size: 130,
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => {
          const customer = row.original.customer;
          if (!customer?.id) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <Link
              to={`${customersBase}/${customer.id}`}
              className="text-sm font-medium hover:text-primary transition-colors truncate block max-w-[200px]"
            >
              {customer.name || '—'}
            </Link>
          );
        },
        size: 200,
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(row.original.total, row.original.currency)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'base_total',
        header: 'Base',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatCurrency(row.original.base_total, row.original.currency)}
          </span>
        ),
        size: 120,
      },
      {
        id: 'lifecycle',
        header: 'Status',
        cell: ({ row }) => {
          const s = row.original.lifecycle_status || 'open';
          return (
            <Badge
              variant="outline"
              className={cn('rounded-full capitalize', LIFECYCLE_COLORS[s] || '')}
            >
              {row.original.lifecycle_label || s.replace(/_/g, ' ')}
            </Badge>
          );
        },
        size: 140,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        meta: {
          headerClassName: 'text-center',
          cellClassName: 'text-center',
        },
        cell: ({ row }) => {
          const note = row.original;
          const flags = note.flags || {};
          const hasMenuActions =
            flags.can_manage || flags.can_edit || flags.can_delete;

          return (
            <div className="flex justify-center">
              <div className="inline-grid grid-cols-[2rem_2rem] items-center gap-0.5">
                <Button variant="ghost" size="icon" className="size-8" asChild title="View credit note">
                  <Link to={`${base}/${note.id}`}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
                {hasMenuActions ? (
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" mode="icon" size="sm" className="size-8">
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {flags.can_manage ? (
                      <DropdownMenuItem onClick={() => setManageNoteId(note.id)}>
                        <Wallet className="size-4 mr-2" /> Manage credit
                      </DropdownMenuItem>
                    ) : null}
                    {flags.can_edit ? (
                      <DropdownMenuItem asChild>
                        <Link to={`${base}/${note.id}/edit`}>
                          <Edit3 className="size-4 mr-2" /> Edit
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    {flags.can_delete ? (
                      <>
                        {(flags.can_manage || flags.can_edit) && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          onClick={() => setConfirmDelete(note)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
                ) : (
                  <span className="size-8 shrink-0" aria-hidden="true" />
                )}
              </div>
            </div>
          );
        },
        size: 100,
      },
    ],
    [base, customersBase],
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
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit notes"
        subtitle="Issue returns and adjustments; apply credit to invoices or refund customers."
        actions={
          canCreate && (
            <Button size="sm" variant="mono" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4 mr-1" /> Create credit note
            </Button>
          )
        }
      />

      <Card>
        <CardHeader className="py-3 border-b">
          <CardToolbar className="w-full flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search credit note # or customer…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 pl-9 pr-9"
              />
              {searchInput ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 size-9"
                  onClick={() => {
                    setSearchInput('');
                    setFilters((f) => ({ ...f, search: '' }));
                  }}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Select
                value={filters.lifecycle}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, lifecycle: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DatePicker
                className="w-[200px]"
                placeholder="From"
                value={filters.dateFrom}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateFrom: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
              <DatePicker
                className="w-[200px]"
                placeholder="To"
                value={filters.dateTo}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateTo: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="size-9"
                onClick={resetFilters}
                title="Reset filters"
              >
                <Filter className="size-4" />
              </Button>
            </div>
          </CardToolbar>
        </CardHeader>

        <DataGrid
          table={table}
          recordCount={pagination.total}
          isLoading={loading}
          tableLayout={{
            cellBorder: true,
            rowBorder: true,
            headerBackground: true,
            headerBorder: true,
            columnsVisibility: false,
          }}
        >
          <CardTable>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter className="border-t">
            <DataGridPagination sizes={[15, 25, 50, 100]} />
          </CardFooter>
        </DataGrid>
      </Card>

      <CreditNoteCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(created) => {
          fetchRows();
          if (created?.id) navigate(`${base}/${created.id}`);
        }}
      />

      <ManageCreditNoteDialog
        open={manageNoteId != null}
        onOpenChange={(open) => {
          if (!open) setManageNoteId(null);
        }}
        creditNoteId={manageNoteId}
        onSuccess={() => {
          setManageNoteId(null);
          fetchRows();
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete credit note?"
        description={
          confirmDelete
            ? `Delete ${confirmDelete.credit_note_number || 'this credit note'}? This cannot be undone.`
            : 'This cannot be undone.'
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={deletingId === confirmDelete?.id}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
