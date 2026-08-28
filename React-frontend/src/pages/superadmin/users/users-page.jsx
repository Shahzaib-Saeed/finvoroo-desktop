import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EllipsisVertical,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { superadminApi } from '../api/superadmin.api';
import { UserEditSheet } from './components/UserEditSheet';
import { PageHeader } from '@/components/ui/PageHeader';
import { setPageTitle } from '@/lib/page-title';
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
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from '@/components/ui/data-grid-table';
import { BulkActionBar } from '@/components/common/bulk-action-bar';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleBadge(role) {
  if (role === 'super_admin') return <Badge variant="destructive">Super admin</Badge>;
  if (role === 'company_owner') return <Badge variant="secondary">Account owner</Badge>;
  return <Badge variant="outline">{role || 'User'}</Badge>;
}

export function SuperAdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editUserId, setEditUserId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [rowSelection, setRowSelection] = useState({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superadminApi.listUsers();
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load users');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPageTitle('Users');
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await superadminApi.deleteUser(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const res = await superadminApi.toggleUserStatus(toggleTarget.id);
      const active = res.data?.data?.is_active;
      toast.success(
        active ? `"${toggleTarget.name}" activated` : `"${toggleTarget.name}" deactivated`,
      );
      setToggleTarget(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update status');
    } finally {
      setToggling(false);
    }
  };

  const selectedUsers = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((id) => rows.find((r) => String(r.id) === id))
      .filter((user) => user && user.role !== 'super_admin');
  }, [rowSelection, rows]);

  const deleteUsers = async (users) => {
    setDeleting(true);
    const succeeded = [];
    const failed = [];

    for (const user of users) {
      if (user.role === 'super_admin') continue;
      try {
        await superadminApi.deleteUser(user.id);
        succeeded.push(user);
      } catch (err) {
        failed.push({
          user,
          message: err?.response?.data?.message || 'Could not delete user.',
        });
      }
    }

    setDeleting(false);

    if (succeeded.length) {
      toast.success(`Deleted ${succeeded.length} ${succeeded.length === 1 ? 'user' : 'users'}.`);
    }
    if (failed.length && !succeeded.length) {
      toast.error('Could not delete selected users.');
    } else if (failed.length) {
      toast.warning(`${failed.length} users could not be deleted.`);
    }

    setRowSelection({});
    setDeleteTarget(null);
    setBulkDeleteOpen(false);
    await load();
  };

  const handleBulkDelete = async () => {
    if (!selectedUsers.length) return;
    await deleteUsers(selectedUsers);
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
        id: 'id',
        header: 'ID',
        accessorKey: 'id',
        cell: ({ row }) => <span className="tabular-nums">{row.original.id}</span>,
        size: 70,
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
        id: 'role',
        header: 'Role',
        accessorKey: 'role',
        cell: ({ row }) => roleBadge(row.original.role),
      },
      {
        id: 'plan',
        header: 'Plan / limits',
        cell: ({ row }) => {
          const plan = row.original.plan;
          if (!plan) return '—';
          return (
            <div className="text-xs leading-relaxed">
              <div className="font-medium">{plan.plan_name}</div>
              <div className="text-muted-foreground">
                {plan.company_limit} cos · {plan.company_user_limit} users · {plan.branch_limit}{' '}
                branches
              </div>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="success" appearance="light">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
      },
      {
        id: 'last_login_at',
        header: 'Last login',
        accessorKey: 'last_login_at',
        cell: ({ row }) => formatDateTime(row.original.last_login_at),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const user = row.original;
          const isSuperAdmin = user.role === 'super_admin';

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" mode="icon" size="sm">
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isSuperAdmin ? (
                  <DropdownMenuItem onClick={() => setEditUserId(user.id)}>
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => setToggleTarget(user)}>
                  {user.is_active ? (
                    <>
                      <UserX className="size-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="size-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                {!isSuperAdmin ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(user)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 60,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      globalFilter: search,
      rowSelection,
    },
    onGlobalFilterChange: setSearch,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: (row) => row.original.role !== 'super_admin',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.id),
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage platform users and account owners"
        actions={
          <Button asChild>
            <Link to="/superadmin/users/create">
              <Plus className="size-4" />
              Create account owner
            </Link>
          </Button>
        }
      />

      {selectedUsers.length > 0 ? (
        <BulkActionBar
          count={selectedUsers.length}
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
                  placeholder="Search users…"
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

      <UserEditSheet
        userId={editUserId}
        open={!!editUserId}
        onOpenChange={(open) => !open && setEditUserId(null)}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.is_active ? 'Deactivate' : 'Activate'} user?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active
                ? `${toggleTarget?.name} will no longer be able to sign in.`
                : `${toggleTarget?.name} will be able to sign in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle} disabled={toggling}>
              {toggling ? <Loader2 className="size-4 animate-spin" /> : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedUsers.length} {selectedUsers.length === 1 ? 'user' : 'users'}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-sm text-muted-foreground">
                <p>This will permanently remove the selected users. Super admins are excluded.</p>
                <ul className="max-h-40 overflow-y-auto rounded-md border border-border/60 bg-muted/30 p-3 space-y-1 list-none m-0">
                  {selectedUsers.map((user) => (
                    <li key={user.id} className="text-sm font-medium text-foreground">
                      {user.name} · {user.email}
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
