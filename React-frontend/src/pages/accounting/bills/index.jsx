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
  BadgeCheck,
  Banknote,
  Edit3,
  EllipsisVertical,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { billsApi } from "./api/bills.api";
import { resolveUiPack } from "@/industries";
import { pharmacyPurchasePath } from "@/industries/pharmacy/paths";
import { useAuthStore } from "@/store/authStore";
import {
  formatCurrency,
  STATUS_COLORS,
  APPROVAL_COLORS,
} from "./constants";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { ListTableTotalsFooter } from "../components/ListTableTotalsFooter";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillPaymentOffcanvas } from "../bill-payments/components/BillPaymentOffcanvas";
import { cn } from "@/lib/utils";
import { isOnline } from "@/offline/connectivity";
import { getMeta } from "@/offline/db";
import { listOfflineDocuments } from "@/offline/documents-repository";

const statusLabels = {
  draft: "Draft",
  open: "Open",
  partial: "Partial",
  paid: "Paid",
  cancelled: "Cancelled",
};

const DEFAULT_COLUMN_ORDER = [
  "select",
  "bill_date",
  "bill_number",
  "vendor",
  "due_date",
  "total",
  "balance_due",
  "status",
  "actions",
];

function billCanDelete(bill, isCancelledView) {
  if (isCancelledView) return false;
  if (bill?.flags?.can_delete != null) return Boolean(bill.flags.can_delete);
  return false;
}

function withSelectFirst(order) {
  const rest = (order || []).filter((id) => id !== "select");
  return ["select", ...rest];
}

function billStatusBadge(row) {
  const approval = row.approval_status || "approved";
  if (approval === "pending") {
    return (
      <Badge variant="outline" className={APPROVAL_COLORS.pending}>
        Pending approval
      </Badge>
    );
  }
  if (approval === "rejected") {
    return (
      <Badge variant="outline" className={APPROVAL_COLORS.rejected}>
        Rejected
      </Badge>
    );
  }
  const status = row.status || "draft";
  return (
    <Badge variant="outline" className={STATUS_COLORS[status] || STATUS_COLORS.draft}>
      {statusLabels[status] || status}
    </Badge>
  );
}

export function BillsPage() {
  const { id: workspaceId } = useParams();
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const isPharmacy = resolveUiPack(activeCompany) === "pharmacy";
  const base = `/workspace/${workspaceId}/accounting/bills`;
  const billEditPath = useCallback(
    (billId) =>
      isPharmacy
        ? pharmacyPurchasePath(workspaceId, billId)
        : `${base}/${billId}/edit`,
    [base, isPharmacy, workspaceId],
  );
  const billCreatePath = isPharmacy
    ? pharmacyPurchasePath(workspaceId)
    : `${base}/create`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // Page-level permission only — row-level actions come from each bill's
  // own server-computed flags, never re-derived here.
  const [canCreate, setCanCreate] = useState(false);
  const [postingId, setPostingId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentBill, setPaymentBill] = useState(null);
  const [viewTab, setViewTab] = useState("active");
  const [rowSelection, setRowSelection] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
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
  const [sorting, setSorting] = useState([{ id: "bill_date", desc: true }]);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });

  const isCancelledView = viewTab === "cancelled";

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);
  }, [rowSelection]);

  const selectedCount = selectedIds.length;

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const applyList = useCallback((list, meta = {}) => {
    setRows(list);
    setPagination((p) => ({
      ...p,
      total: meta.total ?? list.length,
      lastPage: meta.last_page ?? 1,
    }));
    if (meta.summary) {
      setSummary({
        total_amount: Number(meta.summary.total_amount ?? 0),
        balance_due: Number(meta.summary.balance_due ?? 0),
        count: Number(meta.summary.count ?? list.length),
        currency: list[0]?.currency ?? null,
      });
      return;
    }
    const pageTotal = list.reduce((acc, row) => acc + Number(row.total || 0), 0);
    const pageBalance = list.reduce(
      (acc, row) => acc + Number(row.balance_due || 0),
      0,
    );
    setSummary({
      total_amount: pageTotal,
      balance_due: pageBalance,
      count: meta.total ?? list.length,
      currency: list[0]?.currency ?? null,
    });
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, per_page: pagination.perPage };
      if (filters.search) params.search = filters.search;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      if (viewTab === "cancelled") {
        params.status = "cancelled";
      } else {
        params.exclude_status = "cancelled";
        if (filters.status && filters.status !== "all") {
          params.status = filters.status;
        }
      }

      const res = await billsApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      const list = Array.isArray(items) ? items : [];
      applyList(list, meta);
    } catch (err) {
      // Offline: show local pending drafts from IndexedDB (refresh-safe).
      if (!isOnline() && workspaceId && viewTab !== "cancelled") {
        try {
          const enabled = await getMeta(workspaceId, "offline_sync_enabled", false);
          if (enabled) {
            let local = await listOfflineDocuments(workspaceId, "bill");
            if (filters.search) {
              const q = filters.search.toLowerCase();
              local = local.filter(
                (b) =>
                  String(b.bill_number || "").toLowerCase().includes(q) ||
                  String(b.vendor?.name || "").toLowerCase().includes(q),
              );
            }
            if (filters.status && filters.status !== "all") {
              local = local.filter((b) => b.status === filters.status);
            }
            applyList(local, { total: local.length, last_page: 1 });
            setCanCreate(true);
            toast.message("Showing offline draft bills — sync when you reconnect");
            return;
          }
        } catch {
          /* fall through */
        }
      }
      toast.error(err?.response?.data?.message || "Failed to load bills");
      setRows([]);
      setSummary({ total_amount: 0, balance_due: 0, count: 0, currency: null });
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.perPage,
    filters,
    viewTab,
    workspaceId,
    applyList,
  ]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    billsApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  const resetFilters = () => {
    setFilters({ search: "", status: "all", dateFrom: "", dateTo: "" });
    setSearchInput("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

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
        await billsApi.destroy(id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBulkBusy(false);
    setConfirmBulkDelete(false);
    setRowSelection({});
    if (ok) toast.success(`Deleted ${ok} bill(s)`);
    if (fail) toast.error(`${fail} bill(s) could not be deleted`);
    fetchRows();
  }, [selectedIds, fetchRows]);

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

  const handlePost = useCallback(
    async (bill) => {
      setPostingId(bill.id);
      try {
        const res = await billsApi.post(bill.id);
        toast.success(res.data?.message || "Bill posted");
        fetchRows();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Could not post bill");
      } finally {
        setPostingId(null);
      }
    },
    [fetchRows],
  );

  const handleRecordPayment = useCallback((bill) => {
    setPaymentBill(bill);
  }, []);

  const handleCancel = async () => {
    if (!confirmCancel) return;
    setActionLoading(true);
    try {
      const res = await billsApi.cancel(confirmCancel.id);
      toast.success(res.data?.message || "Bill cancelled");
      setConfirmCancel(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not cancel bill");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      const res = await billsApi.destroy(confirmDelete.id);
      toast.success(res.data?.message || "Bill deleted");
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete bill");
    } finally {
      setActionLoading(false);
    }
  };

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
        id: "bill_date",
        accessorKey: "bill_date",
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.bill_date_display || row.original.bill_date || "—"}
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
        id: "bill_number",
        accessorKey: "bill_number",
        header: ({ column }) => (
          <DataGridColumnHeader title="Bill #" column={column} />
        ),
        cell: ({ row }) =>
          row.original.offline_pending ||
          String(row.original.id || "").startsWith("offline:") ? (
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium font-mono text-sm">
                {row.original.bill_number || "—"}
              </span>
              <Badge variant="outline" className="w-fit text-[10px]">
                Pending sync
              </Badge>
            </div>
          ) : (
            <Link
              to={billEditPath(row.original.id)}
              className="font-medium font-mono text-sm text-primary hover:underline"
            >
              {row.original.bill_number || "—"}
            </Link>
          ),
        size: 130,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: {
          headerTitle: "Bill #",
          skeleton: <Skeleton className="h-5 w-24" />,
        },
      },
      {
        id: "vendor",
        accessorFn: (row) => row.vendor?.name || "",
        header: ({ column }) => (
          <DataGridColumnHeader title="Vendor" column={column} />
        ),
        cell: ({ row }) => {
          const email = row.original.vendor?.email;
          return (
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium text-sm truncate">
                {row.original.vendor?.name || "—"}
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
          headerTitle: "Vendor",
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
        cell: ({ row }) => billStatusBadge(row.original),
        size: 130,
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
          const b = row.original;
          const flags = b.flags || {};
          const isCancelledView = viewTab === "cancelled";
          const isOfflineDraft =
            Boolean(b.offline_pending) || String(b.id || "").startsWith("offline:");

          if (isOfflineDraft) {
            return (
              <Badge variant="outline" className="text-[10px]">
                Sync to open
              </Badge>
            );
          }

          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                title="View bill"
                asChild
              >
                <Link to={`${base}/${b.id}`}>
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
                    <Link to={`${base}/${b.id}`}>
                      <Eye className="size-4 mr-2" /> View
                    </Link>
                  </DropdownMenuItem>
                  {!isCancelledView && flags.can_post ? (
                    <DropdownMenuItem
                      onClick={() => handlePost(b)}
                      disabled={postingId === b.id}
                    >
                      <BadgeCheck className="size-4 mr-2" /> Post to ledger
                    </DropdownMenuItem>
                  ) : null}
                  {!isCancelledView && flags.can_record_payment ? (
                    <DropdownMenuItem onClick={() => handleRecordPayment(b)}>
                      <Banknote className="size-4 mr-2" /> Record payment
                    </DropdownMenuItem>
                  ) : null}
                  {!isCancelledView && flags.can_edit ? (
                    <DropdownMenuItem asChild>
                      <Link to={billEditPath(b.id)}>
                        <Edit3 className="size-4 mr-2" /> Edit
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  {!isCancelledView && (flags.can_cancel || flags.can_delete) ? (
                    <DropdownMenuSeparator />
                  ) : null}
                  {!isCancelledView && flags.can_cancel ? (
                    <DropdownMenuItem
                      onClick={() => setConfirmCancel(b)}
                      className="text-amber-600 focus:text-amber-600"
                    >
                      <XCircle className="size-4 mr-2" /> Cancel
                    </DropdownMenuItem>
                  ) : null}
                  {!isCancelledView && flags.can_delete ? (
                    <DropdownMenuItem
                      onClick={() => setConfirmDelete(b)}
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
    [base, billEditPath, viewTab, postingId, handlePost, handleRecordPayment],
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
    enableRowSelection: (row) => billCanDelete(row.original, isCancelledView),
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
    manualPagination: true,
    getRowId: (row) => String(row.id || row.uuid),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills"
        subtitle="Record vendor bills and track accounts payable."
        actions={
          canCreate && (
            <Button size="sm" variant="mono" asChild>
              <Link to={billCreatePath}>
                <Plus className="size-4 mr-1" /> Create bill
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
              {viewTab === "cancelled" ? "Cancelled bills" : "All bills"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Tabs value={viewTab} onValueChange={handleViewTabChange}>
              <TabsList className="h-10 rounded-lg bg-muted/50 p-1">
                <TabsTrigger
                  value="active"
                  className="rounded-md px-4 text-sm font-medium"
                >
                  Active Bills
                </TabsTrigger>
                <TabsTrigger
                  value="cancelled"
                  className="rounded-md px-4 text-sm font-medium"
                >
                  Cancelled Bills
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
                placeholder="Search by bill # or vendor..."
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
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
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
              labelColumnId="vendor"
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
      </Card>

      <AlertDialog
        open={!!confirmCancel}
        onOpenChange={(o) => !o && setConfirmCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel bill?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel bill{" "}
              <strong>{confirmCancel?.bill_number}</strong>? Posted journal
              entries will be reversed and inventory will be adjusted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Keep bill
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={actionLoading}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" /> Cancelling...
                </>
              ) : (
                "Yes, Cancel Bill"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete bill{" "}
              <strong>{confirmDelete?.bill_number}</strong>. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
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
        title={`Delete ${selectedCount} bill(s)?`}
        description="This cannot be undone. Only bills you are allowed to delete will be removed; others were not selectable."
        confirmLabel="Delete all"
        confirmVariant="destructive"
        onConfirm={runBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
        isLoading={bulkBusy}
      />

      <BillPaymentOffcanvas
        open={!!paymentBill}
        onOpenChange={(open) => {
          if (!open) setPaymentBill(null);
        }}
        preselectBillId={paymentBill?.id ? String(paymentBill.id) : null}
        preselectVendorId={
          paymentBill?.vendor_id
            ? String(paymentBill.vendor_id)
            : paymentBill?.vendor?.id
              ? String(paymentBill.vendor.id)
              : null
        }
        onSuccess={() => {
          setPaymentBill(null);
          fetchRows();
        }}
      />
    </div>
  );
}
