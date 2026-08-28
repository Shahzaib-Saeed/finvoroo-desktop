import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Ban,
  CheckCircle2,
  EllipsisVertical,
  Pencil,
  Search,
  Shield,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Dialog,
  DialogContent,
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
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { employeesApi } from './api/employees.api';
import {
  EMPLOYEE_ROLES,
  FAST_DIALOG_OVERLAY,
  employeeInitials,
  formatEmployeeDate,
} from './constants';
import { EmployeeFormDialog } from './components/EmployeeFormDialog';
import { Checkbox } from '@/components/ui/checkbox';

export function EmployeesPage() {
  const { id: workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleOptions, setRoleOptions] = useState(EMPLOYEE_ROLES);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkRole, setBulkRole] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [permsModal, setPermsModal] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    employeesApi
      .meta()
      .then((res) => {
        const opts = res.data?.data?.assignable_role_options || [];
        if (opts.length) {
          setRoleOptions(opts.map((r) => ({ value: r.slug, label: r.name, id: r.id })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setFormMode('create');
      setEditing(null);
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
    const roleFromUrl = searchParams.get('role');
    if (roleFromUrl) {
      setRoleFilter(roleFromUrl);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        per_page: pagination.perPage,
        page: pagination.page,
      };
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.is_active = statusFilter === 'active' ? 1 : 0;

      const res = await employeesApi.list(params);
      const payload = res.data;
      const items = payload?.data ?? [];
      const meta = payload?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openCreate = () => {
    setFormMode('create');
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (employee) => {
    setFormMode('edit');
    setEditing(employee);
    setFormOpen(true);
  };

  const handleToggleStatus = async (employee) => {
    if (!employee?.can_toggle_status && employee?.role === 'owner') {
      toast.error('Company owner status cannot be changed here.');
      return;
    }
    setBusyId(employee.id);
    try {
      const res = await employeesApi.updateStatus(employee.id, {
        is_active: !employee.is_active,
      });
      toast.success(res?.data?.message || (employee.is_active ? 'Deactivated.' : 'Activated.'));
      fetchEmployees();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await employeesApi.destroy(confirmDelete.id);
      toast.success('Employee removed.');
      setConfirmDelete(null);
      fetchEmployees();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove employee');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelected = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const handleBulkAssign = async () => {
    if (!selectedIds.length || !bulkRole) {
      toast.error('Select people and a role.');
      return;
    }
    setBulkBusy(true);
    try {
      const role = roleOptions.find((r) => r.value === bulkRole);
      const res = await employeesApi.bulkAssignRole({
        user_ids: selectedIds,
        role: bulkRole,
        ...(role?.id ? { role_id: role.id } : {}),
      });
      const updated = res.data?.data?.updated ?? 0;
      toast.success(`Assigned role to ${updated} employee${updated === 1 ? '' : 's'}.`);
      setSelectedIds([]);
      setBulkRole('');
      fetchEmployees();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk assign failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: '',
        cell: ({ row }) => {
          const emp = row.original;
          if (emp.role === 'owner' || emp.can_edit === false) return null;
          return (
            <Checkbox
              checked={selectedIds.includes(emp.id)}
              onCheckedChange={(v) => toggleSelected(emp.id, !!v)}
              aria-label={`Select ${emp.name}`}
            />
          );
        },
        size: 36,
      },
      {
        id: 'sn',
        header: '#',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {(pagination.page - 1) * pagination.perPage + row.index + 1}
          </span>
        ),
        size: 48,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="size-8">
                <AvatarFallback className="bg-muted text-foreground text-[11px] font-semibold">
                  {employeeInitials(emp.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium text-foreground truncate max-w-[200px]">
                  {emp.name}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[220px] sm:hidden">
                  {emp.email}
                </span>
              </div>
            </div>
          );
        },
        size: 220,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span
            className="text-sm text-muted-foreground truncate block max-w-[240px]"
            title={row.original.email}
          >
            {row.original.email}
          </span>
        ),
        meta: { headerClassName: 'hidden sm:table-cell', cellClassName: 'hidden sm:table-cell' },
        size: 200,
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => (
          <Badge variant="outline" className="rounded-md text-[11px] font-normal whitespace-nowrap">
            {row.original.role_label || row.original.role}
          </Badge>
        ),
        size: 120,
      },
      {
        id: 'permissions',
        header: 'Access',
        cell: ({ row }) => {
          const count = row.original.permissions_count ?? 0;
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2"
              onClick={() =>
                setPermsModal({
                  name: row.original.name,
                  permissions: row.original.permissions || [],
                })
              }
            >
              <Shield className="size-3.5 text-muted-foreground" />
              <span className="tabular-nums text-sm">{count}</span>
              <span className="text-muted-foreground font-normal hidden md:inline text-xs">
                permission{count === 1 ? '' : 's'}
              </span>
            </Button>
          );
        },
        size: 140,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge
              variant="outline"
              className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              Active
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="rounded-full bg-muted text-muted-foreground"
            >
              Inactive
            </Badge>
          ),
        size: 90,
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatEmployeeDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        size: 88,
        cell: ({ row }) => {
          const emp = row.original;
          const canEdit = emp.can_edit !== false && emp.role !== 'owner';
          const canDelete = emp.can_delete !== false && emp.role !== 'owner';
          const canToggle = emp.can_toggle_status !== false && emp.role !== 'owner';
          const isBusy = busyId === emp.id;

          if (!canEdit && !canDelete && !canToggle) {
            return <span className="text-xs text-muted-foreground px-2">—</span>;
          }

          return (
            <div className="flex items-center justify-end gap-0.5">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  title="Edit"
                  onClick={() => openEdit(emp)}
                >
                  <Pencil className="size-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={isBusy}
                    title="More actions"
                  >
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => openEdit(emp)}>
                      <Pencil className="size-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {emp.role && emp.role !== 'owner' && (
                    <DropdownMenuItem asChild>
                      <Link
                        to={`/workspace/${workspaceId}/accounting/permissions?role=${encodeURIComponent(emp.role)}`}
                      >
                        <Shield className="size-4 mr-2" />
                        Role permissions
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canToggle && (
                    <DropdownMenuItem onClick={() => handleToggleStatus(emp)} disabled={isBusy}>
                      {emp.is_active ? (
                        <>
                          <Ban className="size-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  {canDelete && (canEdit || canToggle) && <DropdownMenuSeparator />}
                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmDelete(emp)}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [pagination.page, pagination.perPage, busyId, workspaceId, selectedIds],
  );

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === 'function'
          ? updater({ pageIndex: pagination.page - 1, pageSize: pagination.perPage })
          : updater;
      setPagination((p) => ({
        ...p,
        page: newState.pageIndex + 1,
        perPage: newState.pageSize,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  return (
    <div className="space-y-4 w-full min-w-0">
      <PageHeader
        title="Employees"
        subtitle="Manage team members and their workspace access."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="mono" onClick={openCreate}>
              <UserPlus className="size-4 mr-1.5" />
              Create employee
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/workspace/${workspaceId}/accounting/permissions`}>
                <Shield className="size-4 mr-1.5" />
                Roles & access
              </Link>
            </Button>
          </div>
        }
      />

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-2 ms-auto">
            <Select value={bulkRole} onValueChange={setBulkRole}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Assign role…" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="mono"
              disabled={bulkBusy || !bulkRole}
              onClick={handleBulkAssign}
            >
              Assign role
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedIds([]);
                setBulkRole('');
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="py-3 flex-col gap-3 sm:flex-row sm:items-center sm:flex-nowrap border-b">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                {roleOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground hidden sm:inline tabular-nums">
              {pagination.total} {pagination.total === 1 ? 'person' : 'people'}
            </span>
          </div>

          <CardToolbar className="w-full sm:w-auto sm:ms-auto">
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                className="h-9 pl-9 pr-9"
                placeholder="Search employees…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 size-9"
                  onClick={() => setSearchInput('')}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
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
          emptyMessage="No employees match your current filters."
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

      <EmployeeFormDialog
        open={formOpen}
        mode={formMode}
        employee={editing}
        onOpenChange={setFormOpen}
        onSuccess={fetchEmployees}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Remove employee?"
        description={
          confirmDelete
            ? `${confirmDelete.name} will lose access to this workspace. This cannot be undone.`
            : undefined
        }
        confirmLabel="Remove"
        confirmVariant="destructive"
        isLoading={deleting}
        overlayClassName={FAST_DIALOG_OVERLAY}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmDelete(null)}
      />

      <Dialog open={!!permsModal} onOpenChange={(open) => !open && setPermsModal(null)}>
        <DialogContent
          className="max-w-md max-h-[80vh] flex flex-col duration-100"
          overlayClassName={FAST_DIALOG_OVERLAY}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" />
              Permissions
            </DialogTitle>
            {permsModal?.name && (
              <p className="text-sm text-muted-foreground">
                For {permsModal.name} — {permsModal.permissions?.length ?? 0} item
                {(permsModal.permissions?.length ?? 0) === 1 ? '' : 's'}
              </p>
            )}
          </DialogHeader>
          <ul className="flex-1 overflow-y-auto rounded-md border border-foreground/[0.08] divide-y divide-foreground/[0.06] text-sm">
            {!permsModal?.permissions?.length ? (
              <li className="p-3 text-muted-foreground">No permissions to show.</li>
            ) : (
              permsModal.permissions.map((p) => (
                <li key={p} className="px-3 py-2 flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="break-all">{p}</span>
                </li>
              ))
            )}
          </ul>
          <DialogFooter>
            <Button variant="mono" onClick={() => setPermsModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
