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
  Plus,
  Search,
  Filter,
  EllipsisVertical,
  Edit3,
  Trash2,
  Eye,
  Send,
  CreditCard,
  Loader2,
  XCircle,
  Settings2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { invoicesApi } from "./api/invoices.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency } from "./constants";
import { isOnline } from "@/offline/connectivity";
import { getMeta } from "@/offline/db";
import { listOfflineDocuments } from "@/offline/documents-repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import {
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/ui/data-grid-table";
import { DataGridTableDnd } from "@/components/ui/data-grid-table-dnd";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataGridColumnPreferences } from "@/hooks/use-data-grid-column-preferences";
import { PaymentReceiveDialog } from "../payments/components/PaymentReceiveDialog";
import { ListTableTotalsFooter } from "../components/ListTableTotalsFooter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleEmptyState } from "@/components/common/module-empty-state";
const statusColors = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  refund: "bg-purple-100 text-purple-700 border-purple-200",
};

const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  partial: "Partial",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  refund: "Refund",
};

const DEFAULT_COLUMN_ORDER = [
  "select",
  "invoice_date",
  "invoice_number",
  "customer",
  "due_date",
  "total",
  "balance_due",
  "status",
  "actions",
];

function invoiceIsPosted(invoice) {
  return Boolean(invoice?.is_posted ?? invoice?.journal_entry_id);
}

function invoiceHasPayments(invoice) {
  if (Number(invoice?.amount_paid ?? 0) > 0) return true;

  const total = Number(invoice?.total ?? 0);
  const balance = Number(invoice?.balance_due ?? total);

  return total > 0 && balance < total - 0.001;
}

function invoiceCanDelete(invoice, isCancelledView) {
  if (isCancelledView) return false;
  if (invoice?.flags?.can_delete != null) return Boolean(invoice.flags.can_delete);
  if (invoice?.can_delete != null) return Boolean(invoice.can_delete);
  if (invoice?.status === "cancelled") return false;

  return !invoiceHasPayments(invoice);
}

function withSelectFirst(order) {
  const rest = (order || []).filter((id) => id !== "select");
  return ["select", ...rest];
}

const DEFAULT_SORTING = [{ id: "invoice_date", desc: true }];

export function InvoicesPage() {
  const { id: workspaceId } = useParams();
  const columnPrefsKey = `erp:invoices:columns:${workspaceId ?? "default"}`;
  const {
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    sorting,
    setSorting,
    columnPinning,
    setColumnPinning,
  } = useDataGridColumnPreferences(columnPrefsKey, DEFAULT_COLUMN_ORDER, {
    defaultSorting: DEFAULT_SORTING,
  });

  // Data
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  // Page-level permission only — row-level edit/delete come from each
  // invoice's own server-computed flags, never re-derived here.
  const [canCreate, setCanCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [viewTab, setViewTab] = useState("active");
  const [rowSelection, setRowSelection] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const isCancelledView = viewTab === "cancelled";

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);
  }, [rowSelection]);

  const selectedCount = selectedIds.length;

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 50,
    total: 0,
    lastPage: 1,
  });

  // Summary totals across all filtered invoices (not just current page)
  const [summary, setSummary] = useState({
    total_amount: 0,
    balance_due: 0,
    count: 0,
    currency: null,
  });

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });

  const [searchInput, setSearchInput] = useState("");

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        per_page: pagination.perPage,
      };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.dateFrom && filters.dateFrom.trim())
        params.date_from = filters.dateFrom;
      if (filters.dateTo && filters.dateTo.trim())
        params.date_to = filters.dateTo;

      if (viewTab === "cancelled") {
        params.status = "cancelled";
      } else {
        params.exclude_status = "cancelled";
        if (filters.status && filters.status !== "all")
          params.status = filters.status;
      }

      const res = await invoicesApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      const list = Array.isArray(items) ? items : [];
      setInvoices(list);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
      if (meta.summary) {
        setSummary({
          total_amount: Number(meta.summary.total_amount ?? 0),
          balance_due: Number(meta.summary.balance_due ?? 0),
          count: Number(meta.summary.count ?? list.length),
          currency: list[0]?.currency ?? null,
        });
      } else {
        // Fallback: sum the current page when the API doesn't return a summary.
        const pageTotal = list.reduce(
          (acc, inv) => acc + Number(inv.total || 0),
          0,
        );
        const pageBalance = list.reduce(
          (acc, inv) => acc + Number(inv.balance_due || 0),
          0,
        );
        setSummary({
          total_amount: pageTotal,
          balance_due: pageBalance,
          count: meta.total ?? list.length,
          currency: list[0]?.currency ?? null,
        });
      }
    } catch (err) {
      if (!isOnline() && workspaceId && viewTab !== "cancelled") {
        try {
          const enabled = await getMeta(workspaceId, "offline_sync_enabled", false);
          if (enabled) {
            let local = await listOfflineDocuments(workspaceId, "invoice");
            if (filters.search.trim()) {
              const q = filters.search.trim().toLowerCase();
              local = local.filter(
                (inv) =>
                  String(inv.invoice_number || "").toLowerCase().includes(q) ||
                  String(inv.customer?.name || "").toLowerCase().includes(q),
              );
            }
            if (filters.status && filters.status !== "all") {
              local = local.filter((inv) => inv.status === filters.status);
            }
            setInvoices(local);
            setPagination((p) => ({
              ...p,
              total: local.length,
              lastPage: 1,
            }));
            const pageTotal = local.reduce(
              (acc, inv) => acc + Number(inv.total || 0),
              0,
            );
            setSummary({
              total_amount: pageTotal,
              balance_due: pageTotal,
              count: local.length,
              currency: local[0]?.currency ?? null,
            });
            setCanCreate(true);
            toast.message(
              "Showing offline draft invoices — sync when you reconnect",
            );
            return;
          }
        } catch {
          /* fall through */
        }
      }
      toast.error(err?.response?.data?.message || "Failed to load invoices");
      setInvoices([]);
      setSummary({ total_amount: 0, balance_due: 0, count: 0, currency: null });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters, viewTab, workspaceId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    invoicesApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async (invoice) => {
    if (!invoice) return;
    setIsDeleting(true);
    try {
      await invoicesApi.delete(invoice.id);
      toast.success("Invoice deleted successfully");
      setConfirmDelete(null);
      fetchInvoices();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSend = useCallback(
    async (invoice) => {
      try {
        await invoicesApi.post(invoice.id);
        toast.success("Invoice posted successfully");
        fetchInvoices();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to post invoice");
      }
    },
    [fetchInvoices],
  );

  const handleCancel = async (invoice) => {
    if (!invoice) return;
    setIsCancelling(true);
    try {
      await invoicesApi.cancel(invoice.id);
      toast.success("Invoice cancelled successfully");
      setConfirmCancel(null);
      fetchInvoices();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel invoice");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRecordPayment = useCallback((invoice) => {
    setPaymentInvoice(invoice);
  }, []);

  const handleViewTabChange = useCallback((nextTab) => {
    setViewTab(nextTab);
    setRowSelection({});
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const runBulkDelete = useCallback(async () => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        await invoicesApi.delete(id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBulkBusy(false);
    setConfirmBulkDelete(false);
    setRowSelection({});
    if (ok) toast.success(`Deleted ${ok} invoice(s)`);
    if (fail) toast.error(`${fail} invoice(s) could not be deleted`);
    fetchInvoices();
  }, [selectedIds, fetchInvoices]);

  const resetFilters = () => {
    setFilters({ search: "", status: "all", dateFrom: "", dateTo: "" });
    setSearchInput("");
    setPagination((p) => ({ ...p, page: 1 }));
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

  const columns = useMemo(
    () => [
      {
        id: "select",
        accessorKey: "id",
        header: () => <DataGridTableRowSelectAll size="sm" />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} size="sm" />,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 44,
        meta: { cellClassName: "ps-3", headerTitle: "Select" },
      },
      {
        id: "invoice_date",
        accessorKey: "invoice_date",
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.invoice_date_display ||
              row.original.invoice_date ||
              "—"}
          </span>
        ),
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Date",
          skeleton: <Skeleton className="h-5 w-20" />,
        },
      },
      {
        id: "invoice_number",
        accessorKey: "invoice_number",
        header: ({ column }) => (
          <DataGridColumnHeader title="Invoice #" column={column} />
        ),
        cell: ({ row }) =>
          row.original.offline_pending ||
          String(row.original.id || "").startsWith("offline:") ? (
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium font-mono text-sm">
                {row.original.invoice_number || "—"}
              </span>
              <Badge variant="outline" className="w-fit text-[10px]">
                Pending sync
              </Badge>
            </div>
          ) : (
            <Link
              to={`/workspace/${workspaceId}/accounting/invoices/${row.original.id}/edit`}
              className="font-medium font-mono text-sm text-primary hover:underline"
            >
              {row.original.invoice_number || "—"}
            </Link>
          ),
        size: 130,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: {
          headerTitle: "Invoice #",
          skeleton: <Skeleton className="h-5 w-24" />,
        },
      },
      {
        id: "customer",
        accessorFn: (row) => row.customer?.name || row.contact_email || "",
        header: ({ column }) => (
          <DataGridColumnHeader title="Customer" column={column} />
        ),
        cell: ({ row }) => {
          const email =
            row.original.customer?.email || row.original.contact_email;

          return (
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium text-sm truncate">
                {row.original.customer?.name || "Walk-in Customer"}
              </span>
              {email ? (
                <span className="text-xs text-muted-foreground truncate">
                  {email}
                </span>
              ) : null}
            </div>
          );
        },
        size: 200,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Customer",
          skeleton: (
            <div className="space-y-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ),
        },
      },
      {
        id: "due_date",
        accessorKey: "due_date",
        header: ({ column }) => (
          <DataGridColumnHeader title="Due Date" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.due_date_display || row.original.due_date || "—"}
          </span>
        ),
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Due Date",
          skeleton: <Skeleton className="h-5 w-20" />,
        },
      },
      {
        id: "total",
        accessorKey: "total",
        header: ({ column }) => (
          <DataGridColumnHeader title="Amount" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-sm tabular-nums">
            {formatCurrency(row.original.total, row.original.currency)}
          </span>
        ),
        size: 120,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Amount",
          cellClassName: "text-end",
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
      {
        id: "balance_due",
        accessorKey: "balance_due",
        header: ({ column }) => (
          <DataGridColumnHeader title="Balance Due" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatCurrency(row.original.balance_due, row.original.currency)}
          </span>
        ),
        size: 120,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Balance Due",
          cellClassName: "text-end",
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) => {
          const status = row.original.status || "draft";
          return (
            <Badge
              variant="outline"
              className={statusColors[status] || statusColors.draft}
            >
              {statusLabels[status] || status}
            </Badge>
          );
        },
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
          const invoice = row.original;
          const isCancelledView = viewTab === "cancelled";
          const isPosted = invoiceIsPosted(invoice);
          const canDelete = invoiceCanDelete(invoice, isCancelledView);
          const canCancel =
            !isCancelledView && ["draft", "sent"].includes(invoice.status);
          const canRecordPayment =
            !isCancelledView &&
            ["sent", "partial", "overdue"].includes(invoice.status) &&
            Number(invoice.balance_due) > 0;
          const canPost =
            !isCancelledView && invoice.status === "draft" && !isPosted;
          const canEdit = !isCancelledView;

          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                title="View invoice"
                asChild
              >
                <Link
                  to={`/workspace/${workspaceId}/accounting/invoices/${invoice.id}`}
                >
                  <Eye className="size-4" />
                </Link>
              </Button>
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
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link
                      to={`/workspace/${workspaceId}/accounting/invoices/${invoice.id}`}
                    >
                      <Eye className="size-4 mr-2" /> View
                    </Link>
                  </DropdownMenuItem>
                  {canPost ? (
                    <DropdownMenuItem onClick={() => handleSend(invoice)}>
                      <Send className="size-4 mr-2" /> Post to ledger
                    </DropdownMenuItem>
                  ) : null}
                  {canRecordPayment ? (
                    <DropdownMenuItem
                      onClick={() => handleRecordPayment(invoice)}
                    >
                      <CreditCard className="size-4 mr-2" /> Record payment
                    </DropdownMenuItem>
                  ) : null}
                  {canEdit ? (
                    <DropdownMenuItem asChild>
                      <Link
                        to={`/workspace/${workspaceId}/accounting/invoices/${invoice.id}/edit`}
                      >
                        <Edit3 className="size-4 mr-2" /> Edit
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  {canCancel || canDelete ? <DropdownMenuSeparator /> : null}
                  {canCancel ? (
                    <DropdownMenuItem
                      onClick={() => setConfirmCancel(invoice)}
                      className="text-amber-600 focus:text-amber-600"
                    >
                      <XCircle className="size-4 mr-2" /> Cancel
                    </DropdownMenuItem>
                  ) : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      onClick={() => setConfirmDelete(invoice)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 88,
        meta: { headerTitle: "Actions" },
      },
    ],
    [workspaceId, handleSend, handleRecordPayment, viewTab],
  );

  const table = useReactTable({
    columns,
    data: invoices,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
      sorting,
      columnOrder: withSelectFirst(columnOrder),
      columnVisibility,
      columnPinning,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: (row) =>
      invoiceCanDelete(row.original, isCancelledView),
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === "function"
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
      setRowSelection({});
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    getRowId: (row) => String(row.id || row.uuid),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Manage customer invoices and payments"
        actions={
          canCreate && (
            <Button size="sm" variant="mono" asChild>
              <Link to={`/workspace/${workspaceId}/accounting/invoices/create`}>
                <Plus className="size-4 mr-1" /> Create Invoice
              </Link>
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
              {viewTab === "cancelled" ? "Cancelled invoices" : "All invoices"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Tabs value={viewTab} onValueChange={handleViewTabChange}>
              <TabsList className="h-10 rounded-lg bg-muted/50 p-1">
                <TabsTrigger
                  value="active"
                  className="rounded-md px-4 text-sm font-medium"
                >
                  Active Invoices
                </TabsTrigger>

                <TabsTrigger
                  value="cancelled"
                  className="rounded-md px-4 text-sm font-medium"
                >
                  Cancelled Invoices
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
                placeholder="Search by invoice # or customer..."
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-40 justify-start text-left font-normal",
                      !filters.dateFrom && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom
                      ? format(new Date(filters.dateFrom), "dd/MM/yyyy")
                      : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      filters.dateFrom ? new Date(filters.dateFrom) : undefined
                    }
                    onSelect={(date) => {
                      setFilters((f) => ({
                        ...f,
                        dateFrom: date ? format(date, "yyyy-MM-dd") : "",
                      }));
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-40 justify-start text-left font-normal",
                      !filters.dateTo && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo
                      ? format(new Date(filters.dateTo), "dd/MM/yyyy")
                      : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      filters.dateTo ? new Date(filters.dateTo) : undefined
                    }
                    onSelect={(date) => {
                      setFilters((f) => ({
                        ...f,
                        dateTo: date ? format(date, "yyyy-MM-dd") : "",
                      }));
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
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

        {!loading &&
        pagination.total === 0 &&
        !filters.search &&
        (!filters.status || filters.status === "all") &&
        !filters.dateFrom &&
        !filters.dateTo ? (
          <div className="p-6">
            <ModuleEmptyState
              icon={Plus}
              title="No invoices yet"
              description="Create your first invoice to start billing customers and tracking receivables."
              actionLabel="Create Invoice"
              actionTo={
                canCreate
                  ? `/workspace/${workspaceId}/accounting/invoices/create`
                  : undefined
              }
            />
          </div>
        ) : (
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
                labelColumnId="customer"
              />
            }
          >
            <CardTable>
              <ScrollArea>
                <DataGridTableDnd handleDragEnd={handleDragEnd} />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>

            <CardFooter className="border-t">
              <DataGridPagination sizes={[15, 50, 1000]} />
            </CardFooter>
          </DataGrid>
        )}
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => {
          if (!v) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice{" "}
              <strong>{confirmDelete?.invoice_number}</strong>.
              {invoiceIsPosted(confirmDelete)
                ? " Any posted ledger entries will be reversed."
                : null}{" "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDelete(confirmDelete)}
              disabled={isDeleting}
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
        title={`Delete ${selectedCount} invoice(s)?`}
        description="This cannot be undone. Only invoices you are allowed to delete will be removed; others were not selectable."
        confirmLabel="Delete all"
        confirmVariant="destructive"
        onConfirm={runBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
        isLoading={bulkBusy}
      />

      {/* Cancel Confirmation */}
      <AlertDialog
        open={!!confirmCancel}
        onOpenChange={(v) => {
          if (!v) setConfirmCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel invoice{" "}
              <strong>{confirmCancel?.invoice_number}</strong>? This will mark
              the invoice as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => handleCancel(confirmCancel)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" /> Cancelling...
                </>
              ) : (
                "Yes, Cancel Invoice"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentReceiveDialog
        open={!!paymentInvoice}
        onOpenChange={(v) => {
          if (!v) setPaymentInvoice(null);
        }}
        workspaceId={workspaceId}
        initialInvoice={paymentInvoice}
        onSuccess={() => {
          setPaymentInvoice(null);
          fetchInvoices();
        }}
      />
    </div>
  );
}
