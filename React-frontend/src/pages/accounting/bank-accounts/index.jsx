import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { arrayMove } from "@dnd-kit/sortable";
import {
  BookOpen,
  Edit3,
  EllipsisVertical,
  Filter,
  Loader2,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { bankAccountsApi } from "./api/bank-accounts.api";
import { formatCurrency } from "./constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridTableDnd } from "@/components/ui/data-grid-table-dnd";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { ListTableTotalsFooter } from "../components/ListTableTotalsFooter";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankAccountCreateDialog } from "./components/BankAccountCreateDialog";
import { BankAccountEditDialog } from "./components/BankAccountEditDialog";
import { buildAccountStatementUrl } from "../reports/report-drilldown";

function bankLedgerAccountId(account) {
  return (
    account?.chart_of_account?.id ||
    account?.chart_of_account_id ||
    account?.coa_account_id ||
    null
  );
}

const DEFAULT_COLUMN_ORDER = [
  "bank_name",
  "account_number",
  "current_balance",
  "opening_balance",
  "ledger",
  "status",
  "actions",
];

function orderNeedsColumnReset(order) {
  const balanceIdx = order.indexOf("current_balance");
  const statusIdx = order.indexOf("status");
  if (balanceIdx >= 0 && statusIdx >= 0 && balanceIdx > statusIdx) {
    return true;
  }
  return order.includes("total");
}

function migrateColumnOrder(previous, defaults, columnIds) {
  const known = new Set(columnIds);
  let order = previous
    .map((id) => (id === "total" ? "opening_balance" : id))
    .filter((id) => known.has(id));

  for (let i = 0; i < defaults.length; i++) {
    const id = defaults[i];
    if (!known.has(id) || order.includes(id)) continue;

    let insertAt = order.length;
    for (let j = i + 1; j < defaults.length; j++) {
      const pos = order.indexOf(defaults[j]);
      if (pos >= 0) {
        insertAt = pos;
        break;
      }
    }
    if (insertAt === order.length) {
      for (let j = i - 1; j >= 0; j--) {
        const pos = order.indexOf(defaults[j]);
        if (pos >= 0) {
          insertAt = pos + 1;
          break;
        }
      }
    }
    order.splice(insertAt, 0, id);
  }

  return order;
}

export function BankAccountsPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/bank-accounts`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    can_create: false,
    can_edit: false,
    can_delete: false,
  });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editAccountId, setEditAccountId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTab, setViewTab] = useState("active");
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 50,
    total: 0,
    lastPage: 1,
  });
  const [summary, setSummary] = useState({
    total_amount: 0,
    balance_due: 0,
    count: 0,
    currency: null,
  });
  const [searchInput, setSearchInput] = useState("");
  const [sorting, setSorting] = useState([{ id: "bank_name", desc: false }]);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);
  const [filters, setFilters] = useState({ search: "", status: "all" });

  useEffect(() => {
    bankAccountsApi
      .formOptions()
      .then((res) => {
        const data = res.data?.data || {};
        setPermissions({
          can_create: !!data.can_create,
          can_edit: !!data.can_edit,
          can_delete: !!data.can_delete,
        });
      })
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

      if (viewTab === "inactive") {
        params.is_active = 0;
      } else if (filters.status === "active") {
        params.is_active = 1;
      } else if (filters.status === "inactive") {
        params.is_active = 0;
      }

      const res = await bankAccountsApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      const list = Array.isArray(items) ? items : [];
      setRows(list);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? list.length,
        lastPage: meta.last_page ?? 1,
      }));

      const pageOpeningTotal = list.reduce(
        (acc, row) => acc + Number(row.opening_balance || 0),
        0,
      );
      const pageCurrentTotal = list.reduce(
        (acc, row) => acc + Number(row.current_balance ?? 0),
        0,
      );
      setSummary({
        total_amount: pageOpeningTotal,
        balance_due: pageCurrentTotal,
        count: meta.total ?? list.length,
        currency: list[0]?.currency ?? null,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load bank accounts");
      setRows([]);
      setSummary({ total_amount: 0, balance_due: 0, count: 0, currency: null });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters, viewTab]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const resetFilters = () => {
    setFilters({ search: "", status: "all" });
    setSearchInput("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleViewTabChange = useCallback((nextTab) => {
    setViewTab(nextTab);
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setColumnOrder((order) => {
        const oldIndex = order.indexOf(active.id);
        const newIndex = order.indexOf(over.id);
        if (oldIndex < 0 || newIndex < 0) return order;
        return arrayMove(order, oldIndex, newIndex);
      });
    }
  }, []);

  const openEdit = useCallback((accountId) => {
    setEditAccountId(accountId);
    setEditOpen(true);
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      const res = await bankAccountsApi.delete(confirmDelete.id);
      toast.success(res.data?.message || "Bank account deleted");
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete bank account");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "bank_name",
        accessorKey: "bank_name",
        header: ({ column }) => (
          <DataGridColumnHeader title="Bank name" column={column} />
        ),
        cell: ({ row }) => {
          const acc = row.original;
          const name = acc.bank_name || "—";
          const coaId = bankLedgerAccountId(acc);
          const statementUrl = buildAccountStatementUrl(workspaceId, {
            accountId: coaId,
          });

          if (statementUrl) {
            return (
              <Link
                to={statementUrl}
                className="font-medium text-sm text-primary hover:underline truncate block max-w-full"
                title="View account statement"
              >
                {name}
              </Link>
            );
          }

          return <span className="font-medium text-sm truncate block">{name}</span>;
        },
        size: 200,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: {
          headerTitle: "Bank name",
          skeleton: <Skeleton className="h-5 w-32" />,
        },
      },
      {
        id: "account_number",
        accessorKey: "account_number",
        header: ({ column }) => (
          <DataGridColumnHeader title="Account #" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground font-mono">
            {row.original.account_number || "—"}
          </span>
        ),
        size: 140,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Account #",
          skeleton: <Skeleton className="h-5 w-24" />,
        },
      },
      {
        id: "current_balance",
        accessorKey: "current_balance",
        header: ({ column }) => (
          <DataGridColumnHeader title="Balance" column={column} />
        ),
        cell: ({ row }) => {
          const bal = row.original.current_balance;
          const n = Number(bal);
          const display = bal != null && Number.isFinite(n) ? n : null;
          return (
            <span className="font-semibold text-sm tabular-nums">
              {display != null
                ? formatCurrency(display, row.original.currency)
                : "—"}
            </span>
          );
        },
        size: 130,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: {
          headerTitle: "Balance",
          cellClassName: "text-end",
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
      {
        id: "opening_balance",
        accessorKey: "opening_balance",
        header: ({ column }) => (
          <DataGridColumnHeader title="Opening balance" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatCurrency(
              row.original.opening_balance ?? 0,
              row.original.currency,
            )}
          </span>
        ),
        size: 130,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Opening balance",
          cellClassName: "text-end",
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
      {
        id: "ledger",
        accessorFn: (row) => row.chart_of_account?.label || row.chart_of_account?.name || "",
        header: ({ column }) => (
          <DataGridColumnHeader title="Ledger account" column={column} />
        ),
        cell: ({ row }) => {
          const coa = row.original.chart_of_account;
          return (
            <span className="text-sm text-muted-foreground truncate block max-w-[220px]">
              {coa?.label || (coa ? `${coa.code || ""} ${coa.name || ""}`.trim() : "—")}
            </span>
          );
        },
        size: 200,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Ledger account",
          skeleton: <Skeleton className="h-5 w-36" />,
        },
      },
      {
        id: "status",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge
              variant="outline"
              className="bg-emerald-100 text-emerald-700 border-emerald-200"
            >
              Active
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-gray-100 text-gray-500 border-gray-200"
            >
              Inactive
            </Badge>
          ),
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: false,
        meta: {
          headerTitle: "Status",
          skeleton: <Skeleton className="h-6 w-16" />,
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        cell: ({ row }) => {
          const acc = row.original;
          const canEdit = acc.flags?.can_edit !== false && permissions.can_edit;
          const canDelete = acc.flags?.can_delete !== false && permissions.can_delete;
          const coaId = bankLedgerAccountId(acc);
          const statementUrl = buildAccountStatementUrl(workspaceId, {
            accountId: coaId,
          });

          return (
            <div className="flex items-center justify-end gap-0.5">
              {statementUrl ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title="View account statement"
                  asChild
                >
                  <Link to={statementUrl}>
                    <BookOpen className="size-4" />
                  </Link>
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title="Edit bank account"
                  onClick={() => openEdit(acc.id)}
                >
                  <Edit3 className="size-4" />
                </Button>
              ) : null}
              {(statementUrl || canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      className="size-8"
                      title="More actions"
                    >
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {statementUrl ? (
                      <DropdownMenuItem asChild>
                        <Link to={statementUrl}>
                          <BookOpen className="size-4 mr-2" /> View statement
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    {canEdit ? (
                      <DropdownMenuItem onClick={() => openEdit(acc.id)}>
                        <Edit3 className="size-4 mr-2" /> Edit
                      </DropdownMenuItem>
                    ) : null}
                    {canDelete ? (
                      <>
                        {statementUrl || canEdit ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setConfirmDelete(acc)}
                        >
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        },
        size: 88,
        meta: { headerTitle: "Actions" },
      },
    ],
    [workspaceId, permissions, openEdit],
  );

  const columnIds = useMemo(() => columns.map((col) => col.id), [columns]);

  useEffect(() => {
    setColumnOrder((prev) => {
      if (orderNeedsColumnReset(prev)) {
        return [...DEFAULT_COLUMN_ORDER];
      }
      return migrateColumnOrder(prev, DEFAULT_COLUMN_ORDER, columnIds);
    });
  }, [columnIds]);

  const table = useReactTable({
    columns,
    data: rows,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
      sorting,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({
              pageIndex: pagination.page - 1,
              pageSize: pagination.perPage,
            })
          : updater;
      setPagination((p) => ({
        ...p,
        page: next.pageIndex + 1,
        perPage: next.pageSize,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Bank accounts"
        subtitle="Manage cash and bank accounts linked to your chart of accounts."
        actions={
          <div className="flex flex-wrap gap-2">
            {permissions.can_create ? (
              <Button size="sm" variant="mono" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4 mr-1" /> Add bank account
              </Button>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader className="py-3 border-b flex-col items-stretch gap-3">
          <div className="flex flex-col items-stretch justify-between gap-3 w-full sm:flex-row sm:items-center">
            <CardTitle className="text-base font-semibold shrink-0">
              {viewTab === "inactive" ? "Inactive accounts" : "All bank accounts"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Tabs value={viewTab} onValueChange={handleViewTabChange}>
              <TabsList className="h-10 w-full sm:w-auto rounded-lg bg-muted/50 p-1 overflow-x-auto">
                <TabsTrigger
                  value="active"
                  className="rounded-md px-3 sm:px-4 text-sm font-medium"
                >
                  <span className="sm:hidden">Active</span>
                  <span className="hidden sm:inline">Active Accounts</span>
                </TabsTrigger>
                <TabsTrigger
                  value="inactive"
                  className="rounded-md px-3 sm:px-4 text-sm font-medium"
                >
                  <span className="sm:hidden">Inactive</span>
                  <span className="hidden sm:inline">Inactive Accounts</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button variant="outline" size="sm" className="h-9">
                  <Settings2 className="size-4" />
                  Columns
                </Button>
              }
            />
          </div>
          </div>
          <CardToolbar className="w-full flex-col xl:flex-row gap-3 p-0 border-0 min-h-0">
            <div className="relative flex-1 min-w-0 sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search bank name or account #..."
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
                    setSearchInput("");
                    setFilters((f) => ({ ...f, search: "" }));
                  }}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {viewTab === "active" ? (
                <Select
                  value={filters.status}
                  onValueChange={(val) => {
                    setFilters((f) => ({ ...f, status: val }));
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9"
                      onClick={resetFilters}
                      title="Reset filters"
                    >
                      <Filter className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset filters to default values</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
            columnsVisibility: true,
            columnsResizable: true,
            columnsPinnable: true,
            columnsMovable: true,
            columnsDraggable: true,
          }}
          tableFooter={
            <ListTableTotalsFooter
              summary={summary}
              formatCurrency={formatCurrency}
              labelColumnId="bank_name"
              totalLabel="Page totals"
            />
          }
        >
          <CardTable className="min-w-0">
            <ScrollArea className="w-full min-w-0 max-w-full">
              <DataGridTableDnd handleDragEnd={handleDragEnd} />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter className="border-t">
            <DataGridPagination sizes={[15, 50, 1000]} />
          </CardFooter>
        </DataGrid>
      </Card>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bank account?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{confirmDelete?.bank_name}</strong> and its
              linked chart of accounts entry? This cannot be undone. Accounts with
              posted payments, deposits, or transfers cannot be deleted — deactivate
              them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BankAccountCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchRows}
      />

      <BankAccountEditDialog
        bankAccountId={editAccountId}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditAccountId(null);
        }}
        onSuccess={fetchRows}
        canDelete={permissions.can_delete}
      />
    </div>
  );
}
