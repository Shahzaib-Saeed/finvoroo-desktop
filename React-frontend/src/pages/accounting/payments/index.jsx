import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  EllipsisVertical,
  Banknote,
  Filter,
  X,
  Settings2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { paymentsApi } from "./api/payments.api";
import { formatCurrency, APPROVAL_COLORS, PAYMENT_METHODS } from "./constants";
import { hasPrepaidCash, prepaidCashAmount } from "../shared/prepaid-cash";
import { PrepaidInlineBadge } from "../shared/PrepaidInlineBadge";
import {
  getPaymentDisplayReference,
  getPaymentSystemNumber,
  hasClientPaymentReference,
} from "../shared/payment-reference";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import {
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/ui/data-grid-table";
import { DataGridTableDnd } from "@/components/ui/data-grid-table-dnd";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { PaymentReceiveDialog } from "./components/PaymentReceiveDialog";
import { PaymentEditSheet } from "./components/PaymentEditSheet";
import { ApplyUnappliedDialog } from "./components/ApplyUnappliedDialog";
import { CustomerDetailsSheet } from "../customers/components/CustomerDetailsSheet";
import { useCustomerDialog } from "@/components/workspace/customer/customer-dialog-provider";
import { cn } from "@/lib/utils";

const DEFAULT_COLUMN_ORDER = [
  "select",
  "payment_date",
  "receipt_number",
  "customer",
  "amount",
  "payment_method",
  "linked",
  "approval_status",
  "actions",
];

function receiptCanDelete(payment) {
  return payment?.flags?.can_delete !== false;
}

function withSelectFirst(order) {
  const rest = (order || []).filter((id) => id !== "select");
  return ["select", ...rest];
}

function customerInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PaymentsPage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const base = `/workspace/${workspaceId}/accounting/payments`;
  const customerDialog = useCustomerDialog();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rowSelection, setRowSelection] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [editPaymentId, setEditPaymentId] = useState(null);
  const [applyPaymentId, setApplyPaymentId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsCustomerId, setDetailsCustomerId] = useState(null);
  const [sorting, setSorting] = useState([{ id: "payment_date", desc: true }]);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    paymentsApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const openApply = searchParams.get("apply");
    if (openApply) {
      setApplyPaymentId(openApply);
      searchParams.delete("apply");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get("record") !== "1") return;
    setReceiveOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("record");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    setEditPaymentId(String(editId));
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await paymentsApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.perPage,
    filters.search,
    filters.dateFrom,
    filters.dateTo,
  ]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);
  }, [rowSelection]);

  const selectedCount = selectedIds.length;

  const runBulkDelete = useCallback(async () => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        await paymentsApi.delete(id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBulkBusy(false);
    setConfirmBulkDelete(false);
    setRowSelection({});
    if (ok) toast.success(`Deleted ${ok} receipt(s)`);
    if (fail) toast.error(`${fail} receipt(s) could not be deleted`);
    fetchRows();
  }, [selectedIds, fetchRows]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await paymentsApi.delete(confirmDelete.id);
      toast.success("Payment deleted");
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete payment");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setFilters({ search: "", dateFrom: "", dateTo: "" });
    setSearchInput("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const openCustomerDetails = useCallback((customer) => {
    if (!customer?.id) return;
    setDetailsCustomerId(customer.id);
    setDetailsOpen(true);
  }, []);

  const openEdit = useCallback((id) => {
    setEditPaymentId(String(id));
  }, []);

  const handleEditCustomerFromSheet = (customer) => {
    setDetailsOpen(false);
    customerDialog.openEdit(customer, {
      onSuccess: fetchRows,
    });
  };

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

  const methodLabel = (m) =>
    PAYMENT_METHODS.find((x) => x.value === m)?.label || m || "—";

  const columns = useMemo(
    () => [
      {
        id: "select",
        accessorKey: "id",
        header: () => (
          <div className="flex items-center justify-center">
            <DataGridTableRowSelectAll size="sm" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <DataGridTableRowSelect row={row} size="sm" />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 44,
        meta: {
          headerClassName: "px-0 text-center",
          cellClassName: "px-0 text-center",
          headerTitle: "Select",
        },
      },
      {
        accessorKey: "payment_date",
        id: "payment_date",
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-foreground tabular-nums">
            {row.original.payment_date_display ||
              row.original.payment_date ||
              "—"}
          </span>
        ),
        size: 120,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: { headerTitle: "Date" },
      },
      {
        accessorKey: "receipt_number",
        id: "receipt_number",
        accessorFn: (row) => getPaymentDisplayReference(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Reference" visibility column={column} />
        ),
        cell: ({ row }) => {
          const p = row.original;
          const displayRef = getPaymentDisplayReference(p);
          const systemNo = getPaymentSystemNumber(p);
          const prepaid = hasPrepaidCash(p);
          const showSystemSubtitle =
            hasClientPaymentReference(p) && systemNo && systemNo !== displayRef;

          return (
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <div className="flex min-w-0 max-w-full items-center gap-2">
                <Link
                  to={`${base}/${p.id}/edit`}
                  className="min-w-0 truncate font-mono text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                >
                  {displayRef}
                </Link>
                {prepaid ? (
                  <PrepaidInlineBadge
                    row={p}
                    title={`Prepaid ${formatCurrency(prepaidCashAmount(p), p.currency)} not yet applied to an invoice`}
                  />
                ) : null}
              </div>
              {showSystemSubtitle ? (
                <span
                  className="max-w-full truncate font-mono text-xs text-muted-foreground"
                  title={`System receipt ${systemNo}`}
                >
                  {systemNo}
                </span>
              ) : null}
            </div>
          );
        },
        size: 170,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: { headerTitle: "Reference" },
      },
      {
        id: "customer",
        accessorFn: (row) => row.customer?.name || "—",
        header: ({ column }) => (
          <DataGridColumnHeader title="Customer" visibility column={column} />
        ),
        cell: ({ row }) => {
          const customer = row.original.customer;
          const name = customer?.name || "—";
          const email = customer?.email;

          return (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                  {customerInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-px min-w-0">
                {customer?.id ? (
                  <button
                    type="button"
                    onClick={() => openCustomerDetails(customer)}
                    className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate block text-left max-w-full"
                  >
                    {name}
                  </button>
                ) : (
                  <span className="font-medium text-sm truncate block">
                    {name}
                  </span>
                )}
                {email ? (
                  <div className="text-xs text-muted-foreground truncate">
                    {email}
                  </div>
                ) : null}
              </div>
            </div>
          );
        },
        size: 240,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: { headerTitle: "Customer" },
      },
      {
        accessorKey: "amount",
        id: "amount",
        header: ({ column }) => (
          <DataGridColumnHeader title="Amount" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-sm tabular-nums">
            {formatCurrency(row.original.amount, row.original.currency)}
          </span>
        ),
        size: 130,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: { headerTitle: "Amount" },
      },
      {
        accessorKey: "payment_method",
        id: "payment_method",
        header: ({ column }) => (
          <DataGridColumnHeader title="Method" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm capitalize text-muted-foreground">
            {methodLabel(row.original.payment_method)}
          </span>
        ),
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: { headerTitle: "Method" },
      },
      {
        id: "linked",
        accessorFn: (row) => (row.is_posted ? "posted" : "unposted"),
        header: ({ column }) => (
          <DataGridColumnHeader title="Posted" visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.is_posted ? (
            <Badge
              variant="outline"
              className="rounded-full font-normal text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40"
            >
              Posted
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="rounded-full font-normal text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40"
            >
              Unposted
            </Badge>
          ),
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: false,
        meta: { headerTitle: "Posted" },
      },
      {
        accessorKey: "approval_status",
        id: "approval_status",
        header: ({ column }) => (
          <DataGridColumnHeader title="Approval" visibility column={column} />
        ),
        cell: ({ row }) => {
          const s = row.original.approval_status || "approved";
          return (
            <Badge
              variant="outline"
              className={cn(
                "rounded-full capitalize font-normal",
                APPROVAL_COLORS[s] || "",
              )}
            >
              {s}
            </Badge>
          );
        },
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: false,
        meta: { headerTitle: "Approval" },
      },
      {
        id: "actions",
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Actions</span>
        ),
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        cell: ({ row }) => {
          const p = row.original;
          const canEdit = p.flags?.can_edit !== false;
          const canDelete = p.flags?.can_delete !== false;
          const hasMenu = canEdit || p.flags?.can_apply_unapplied || canDelete;

          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="View"
                asChild
              >
                <Link to={`${base}/${p.id}`}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              {hasMenu ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      className="size-8"
                    >
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {canEdit ? (
                      <DropdownMenuItem onClick={() => openEdit(p.id)}>
                        <Edit3 className="size-4 mr-2" /> Edit
                      </DropdownMenuItem>
                    ) : null}
                    {p.flags?.can_apply_unapplied ? (
                      <DropdownMenuItem
                        onClick={() => setApplyPaymentId(String(p.id))}
                      >
                        <Banknote className="size-4 mr-2" /> Apply prepaid
                      </DropdownMenuItem>
                    ) : null}
                    {canDelete && (canEdit || p.flags?.can_apply_unapplied) ? (
                      <DropdownMenuSeparator />
                    ) : null}
                    {canDelete ? (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmDelete(p)}
                      >
                        <Trash2 className="size-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          );
        },
        size: 100,
        meta: { headerTitle: "Actions", headerClassName: "text-end" },
      },
    ],
    [base, openCustomerDetails, openEdit],
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
      sorting,
      columnOrder: withSelectFirst(columnOrder),
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: (row) => receiptCanDelete(row.original),
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
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
      setRowSelection({});
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Receipts"
        subtitle="Record customer receipts and apply them to open invoices."
        actions={
          canCreate && (
            <Button size="sm" variant="mono" onClick={() => setReceiveOpen(true)}>
              <Plus className="size-4 mr-1" /> Record payment
            </Button>
          )
        }
      />

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} selected
          </span>
          <div className="flex flex-wrap gap-2 ms-auto">
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkBusy}
              onClick={() => setConfirmBulkDelete(true)}
            >
              <Trash2 className="size-4 mr-1" />
              Delete selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRowSelection({})}
              disabled={bulkBusy}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="py-3 border-b flex-col items-stretch gap-3">
          <div className="flex flex-col items-stretch justify-between gap-3 w-full sm:flex-row sm:items-center">
            <CardTitle className="text-base font-semibold shrink-0">
              All receipts
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            <div className="relative flex-1 min-w-0 xl:max-w-md">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search receipt #, reference, or customer…"
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
              <DatePicker
                className="w-[140px]"
                placeholder="From"
                value={filters.dateFrom}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateFrom: v || "" }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
              <DatePicker
                className="w-[140px]"
                placeholder="To"
                value={filters.dateTo}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateTo: v || "" }));
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
            columnsVisibility: true,
            columnsResizable: true,
            columnsPinnable: true,
            columnsMovable: true,
            columnsDraggable: true,
          }}
        >
          <CardTable>
            <ScrollArea>
              <DataGridTableDnd handleDragEnd={handleDragEnd} />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter className="border-t">
            <DataGridPagination sizes={[15, 25, 50, 100]} />
          </CardFooter>
        </DataGrid>
      </Card>

      <PaymentReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        workspaceId={workspaceId}
        onSuccess={(created) => {
          fetchRows();
          if (created?.id) navigate(`${base}/${created.id}`);
        }}
      />

      <PaymentEditSheet
        open={!!editPaymentId}
        onOpenChange={(open) => !open && setEditPaymentId(null)}
        workspaceId={workspaceId}
        editPaymentId={editPaymentId}
        onSuccess={() => {
          setEditPaymentId(null);
          fetchRows();
        }}
      />

      <ApplyUnappliedDialog
        open={!!applyPaymentId}
        onOpenChange={(open) => !open && setApplyPaymentId(null)}
        paymentId={applyPaymentId}
        onSuccess={() => {
          setApplyPaymentId(null);
          fetchRows();
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={() => !isDeleting && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete receipt {getPaymentDisplayReference(confirmDelete)}? This cannot be
              undone.
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
                  <Loader2 className="size-4 mr-1 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedCount} receipt(s)?`}
        description="This cannot be undone. Only receipts you are allowed to delete will be removed; others were not selectable."
        confirmLabel="Delete all"
        confirmVariant="destructive"
        onConfirm={runBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
        isLoading={bulkBusy}
      />

      <CustomerDetailsSheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setDetailsCustomerId(null);
        }}
        customerId={detailsCustomerId}
        workspaceId={workspaceId}
        onEdit={handleEditCustomerFromSheet}
        onListRefresh={fetchRows}
      />
    </div>
  );
}
