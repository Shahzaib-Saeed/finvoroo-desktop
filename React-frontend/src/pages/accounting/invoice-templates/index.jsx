import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { arrayMove } from '@dnd-kit/sortable';
import {
  Edit3,
  EllipsisVertical,
  Filter,
  LayoutTemplate,
  Loader2,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { DataGridTableDnd } from '@/components/ui/data-grid-table-dnd';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDataGridColumnPreferences } from '@/hooks/use-data-grid-column-preferences';
import { formatDisplayDate } from '@/lib/format-datetime';
import { invoiceTemplatesApi } from './api/invoice-templates.api';

const DEFAULT_COLUMN_ORDER = [
  'name',
  'status',
  'fields_count',
  'line_columns',
  'updated_at',
  'actions',
];

function formatDate(iso) {
  return formatDisplayDate(iso) || '—';
}

function lineColumnCount(template) {
  return (template.line_columns?.editor_rows || []).filter(
    (c) => c?.visible !== false,
  ).length;
}

export function InvoiceTemplatesPage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/invoice-templates`;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [sorting, setSorting] = useState([{ id: 'name', desc: false }]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [defaultingId, setDefaultingId] = useState(null);
  const [canCreate, setCanCreate] = useState(false);

  const columnPrefsKey = `erp:invoice-templates:columns:${workspaceId ?? 'default'}`;
  const {
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
  } = useDataGridColumnPreferences(columnPrefsKey, DEFAULT_COLUMN_ORDER);

  useEffect(() => {
    invoiceTemplatesApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceTemplatesApi.list({
        page: pagination.page,
        per_page: pagination.perPage,
        ...(search ? { search } : {}),
      });
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setTemplates(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load invoice templates.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = createName.trim();
    if (!trimmed) {
      toast.error('Template name is required.');
      return;
    }
    setCreating(true);
    try {
      const res = await invoiceTemplatesApi.create({ name: trimmed });
      const tpl = res.data?.data;
      toast.success(res.data?.message || 'Invoice template created.');
      setCreateOpen(false);
      setCreateName('');
      if (tpl?.id) {
        navigate(`${base}/${tpl.id}/edit`);
      } else {
        fetchTemplates();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not create template.');
    } finally {
      setCreating(false);
    }
  };

  const handleSetDefault = useCallback(
    async (row) => {
      if (row.is_default) return;
      setDefaultingId(row.id);
      try {
        const res = await invoiceTemplatesApi.setDefault(row.id);
        toast.success(res.data?.message || 'Default template updated.');
        fetchTemplates();
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Could not set default.');
      } finally {
        setDefaultingId(null);
      }
    },
    [fetchTemplates],
  );

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await invoiceTemplatesApi.destroy(confirmDelete.id);
      toast.success(res.data?.message || 'Template deleted.');
      setConfirmDelete(null);
      fetchTemplates();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete template.');
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (active && over && active.id !== over.id) {
        setColumnOrder((order) => {
          const oldIndex = order.indexOf(active.id);
          const newIndex = order.indexOf(over.id);
          if (oldIndex < 0 || newIndex < 0) return order;
          return arrayMove(order, oldIndex, newIndex);
        });
      }
    },
    [setColumnOrder],
  );

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader title="Template" column={column} />
        ),
        cell: ({ row }) => {
          const tpl = row.original;
          return (
            <div className="flex min-w-0 items-center gap-3 py-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <LayoutTemplate className="size-4" />
              </div>
              <div className="min-w-0">
                <Link
                  to={`${base}/${tpl.id}/edit`}
                  className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                  title={tpl.name}
                >
                  {tpl.name || '—'}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Invoice &amp; bill layout
                </p>
              </div>
            </div>
          );
        },
        size: 280,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: {
          headerTitle: 'Template',
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ),
        },
      },
      {
        id: 'status',
        accessorFn: (row) => (row.is_default ? 1 : 0),
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) =>
          row.original.is_default ? (
            <Badge
              variant="outline"
              className="gap-1 rounded-full border-slate-900 bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:border-white dark:bg-white dark:text-slate-900"
            >
              <Star className="size-2.5 fill-current" />
              Default
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
            >
              Available
            </Badge>
          ),
        size: 120,
        enableSorting: true,
        enableHiding: true,
        enableResizing: false,
        meta: {
          headerTitle: 'Status',
          skeleton: <Skeleton className="h-6 w-16 rounded-full" />,
        },
      },
      {
        id: 'fields_count',
        accessorFn: (row) => Number(row.fields_count) || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Custom fields" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">
            {Number(row.original.fields_count) || 0}
          </span>
        ),
        size: 130,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Custom fields',
          skeleton: <Skeleton className="h-5 w-8" />,
        },
      },
      {
        id: 'line_columns',
        accessorFn: (row) => lineColumnCount(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Line columns" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">
            {lineColumnCount(row.original)}
          </span>
        ),
        size: 130,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Line columns',
          skeleton: <Skeleton className="h-5 w-8" />,
        },
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: ({ column }) => (
          <DataGridColumnHeader title="Updated" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 whitespace-nowrap">
            {formatDate(row.original.updated_at)}
          </span>
        ),
        size: 140,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: 'Updated',
          skeleton: <Skeleton className="h-5 w-24" />,
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        cell: ({ row }) => {
          const tpl = row.original;
          const busy = defaultingId === tpl.id;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs hover:border-primary/30 hover:bg-primary/5 hover:text-primary dark:border-slate-700 dark:bg-card"
              >
                <Link to={`${base}/${tpl.id}/edit`}>
                  <Edit3 className="size-3.5" />
                  Edit
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    className="size-8"
                    disabled={busy}
                  >
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link to={`${base}/${tpl.id}/edit`}>
                      <Edit3 className="mr-2 size-4" />
                      Edit template
                    </Link>
                  </DropdownMenuItem>
                  {!tpl.is_default ? (
                    <DropdownMenuItem
                      disabled={busy}
                      onClick={() => handleSetDefault(tpl)}
                    >
                      {busy ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Star className="mr-2 size-4" />
                      )}
                      Set as default
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmDelete(tpl)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 140,
        meta: { headerTitle: 'Actions' },
      },
    ],
    [base, defaultingId, handleSetDefault],
  );

  const table = useReactTable({
    columns,
    data: templates,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
      sorting,
      columnOrder,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === 'function'
          ? updater({
              pageIndex: pagination.page - 1,
              pageSize: pagination.perPage,
            })
          : updater;
      setPagination((p) => ({
        ...p,
        page: newState.pageIndex + 1,
        perPage: newState.pageSize,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    getRowId: (row) => String(row.id),
  });

  const hasActiveFilters = Boolean(search);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice templates"
        subtitle="Configure shared layouts for sales invoices and vendor bills."
        actions={
          canCreate ? (
            <Button
              size="sm"
              variant="mono"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1 size-4" />
              New template
            </Button>
          ) : null
        }
      />

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-card">
        <CardHeader className="flex-col items-stretch gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-card">
          <div className="flex w-full items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-slate-950 dark:text-slate-50">
                All templates
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                {pagination.total}{' '}
                {pagination.total === 1 ? 'template' : 'templates'} in this
                workspace
              </p>
            </div>
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-slate-200 dark:border-slate-700"
                >
                  <Filter className="size-3.5" />
                  Columns
                </Button>
              }
            />
          </div>

          <CardToolbar className="min-h-0 w-full flex-col gap-3 border-0 p-0 xl:flex-row">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search templates…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 border-slate-200 bg-white pl-9 pr-9 shadow-none dark:border-slate-700"
              />
              {searchInput ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 size-9 hover:bg-transparent"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                  }}
                >
                  <X className="size-4 text-slate-400 hover:text-foreground" />
                </Button>
              ) : null}
            </div>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-slate-500"
                onClick={resetFilters}
              >
                <Filter className="size-3.5" />
                Clear filters
              </Button>
            ) : null}
          </CardToolbar>
        </CardHeader>

        <DataGrid
          table={table}
          recordCount={pagination.total}
          isLoading={loading}
          tableLayout={{
            dense: false,
            rowBorder: true,
            headerBorder: true,
            headerSticky: true,
            width: 'auto',
          }}
        >
          <CardTable>
            <ScrollArea>
              <DataGridTableDnd handleDragEnd={handleDragEnd} />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter className="border-t border-slate-200 dark:border-slate-700">
            <DataGridPagination sizes={[15, 50, 100]} />
          </CardFooter>
        </DataGrid>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>New invoice template</DialogTitle>
              <DialogDescription>
                Enter a name, then configure custom fields and line columns.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Template name
              </label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Standard sales invoice"
                maxLength={255}
                autoFocus
                className="border-slate-200"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="mono" disabled={creating}>
                {creating ? <Loader2 className="size-4 animate-spin" /> : null}
                Create &amp; edit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{confirmDelete?.name}&rdquo;? You must keep at least
              one template in the workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
