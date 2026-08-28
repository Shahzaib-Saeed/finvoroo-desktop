import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  EllipsisVertical,
  Loader2,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { superadminApi } from '../api/superadmin.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { setPageTitle } from '@/lib/page-title';
import { BulkActionBar } from '@/components/common/bulk-action-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
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
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

export function SuperAdminAccountOwnersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superadminApi.listAccountOwners();
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load account owners');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPageTitle('Account owners');
    load();
  }, [load]);

  const selectedOwners = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((id) => rows.find((r) => String(r.id) === id))
      .filter(Boolean);
  }, [rowSelection, rows]);

  const deleteOwners = async (owners) => {
    setDeleting(true);
    const succeeded = [];
    const failed = [];

    for (const owner of owners) {
      try {
        await superadminApi.deleteUser(owner.id);
        succeeded.push(owner);
      } catch (err) {
        failed.push({
          owner,
          message: err?.response?.data?.message || 'Could not delete account owner.',
        });
      }
    }

    setDeleting(false);

    if (succeeded.length) {
      toast.success(
        `Deleted ${succeeded.length} ${succeeded.length === 1 ? 'account owner' : 'account owners'}.`,
      );
    }
    if (failed.length && !succeeded.length) {
      toast.error('Could not delete selected account owners.');
    } else if (failed.length) {
      toast.warning(`${failed.length} account owners could not be deleted.`);
    }

    setRowSelection({});
    setDeleteTarget(null);
    setBulkDeleteOpen(false);
    await load();
    return { succeeded, failed };
  };

  const handleSingleDelete = async () => {
    if (!deleteTarget) return;
    await deleteOwners([deleteTarget]);
  };

  const handleBulkDelete = async () => {
    if (!selectedOwners.length) return;
    await deleteOwners(selectedOwners);
  };

  const columns = useMemo(
    () => [
      {
        id: 'select',
        accessorKey: 'id',
        header: () => <DataGridTableRowSelectAll size="sm" />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} size="sm" />,
        enableSorting: false,
        size: 44,
        meta: { cellClassName: 'ps-3' },
      },
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const owner = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button asChild variant="outline" size="sm">
                <Link to={`/superadmin/account-owners/${owner.id}/companies`}>
                  Open account
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" mode="icon" size="sm">
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/superadmin/account-owners/${owner.id}/companies`}>
                      <ArrowRight className="size-4" />
                      View companies
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(owner)}
                  >
                    <Trash2 className="size-4" />
                    Delete account owner
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 200,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter: search, rowSelection },
    onGlobalFilterChange: setSearch,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.id),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <>
      <PageHeader
        title="Account owners"
        subtitle="Browse account owners, open their companies, or remove accounts"
      />

      {selectedOwners.length > 0 ? (
        <BulkActionBar
          count={selectedOwners.length}
          onClear={() => setRowSelection({})}
          onDelete={() => setBulkDeleteOpen(true)}
          deleting={deleting}
          deleteLabel="Delete selected"
        />
      ) : null}

      <DataGrid table={table} recordCount={table.getFilteredRowModel().rows.length} loading={loading}>
        <Card>
          <CardHeader className="py-4">
            <CardToolbar>
              <div className="relative w-full max-w-xs">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search account owners…"
                  className="ps-9"
                />
              </div>
            </CardToolbar>
          </CardHeader>

          <CardTable>
            <ScrollArea className="w-full">
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>

          <CardFooter className="py-3">
            <DataGridPagination />
          </CardFooter>
        </Card>
      </DataGrid>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account owner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.name} and their access. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSingleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedOwners.length}{' '}
              {selectedOwners.length === 1 ? 'account owner' : 'account owners'}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-sm text-muted-foreground">
                <p>This will permanently remove the selected account owners. This cannot be undone.</p>
                <ul className="max-h-40 overflow-y-auto rounded-md border border-border/60 bg-muted/30 p-3 space-y-1 list-none m-0">
                  {selectedOwners.map((owner) => (
                    <li key={owner.id} className="text-sm font-medium text-foreground">
                      {owner.name} · {owner.email}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : 'Delete selected'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
