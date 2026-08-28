import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  Building2,
  EllipsisVertical,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { billPaymentsApi } from "./api/bill-payments.api";
import { formatCurrency, APPROVAL_COLORS, PAYMENT_METHODS } from "./constants";
import { hasPrepaidCash, prepaidCashAmount } from "../shared/prepaid-cash";
import { PrepaidInlineBadge } from "../shared/PrepaidInlineBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataGrid } from "@/components/ui/data-grid";
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { BillPaymentOffcanvas } from "./components/BillPaymentOffcanvas";
import { documentNumberLabel } from "@/pages/accounting/lib/documentNumber";
import { cn } from "@/lib/utils";

function billPaymentCanDelete(payment, pageCanDelete) {
  if (!pageCanDelete) return false;
  if (payment?.flags?.can_delete != null) {
    return Boolean(payment.flags.can_delete);
  }
  return (payment?.approval_status || "approved") !== "pending";
}

export function BillPaymentsPage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const base = `/workspace/${workspaceId}/accounting/bill-payments`;
  const vendorsBase = `/workspace/${workspaceId}/accounting/vendors`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // Page-level permission only — row-level actions come from each payment's
  // own server-computed flags, never re-derived here.
  const [canCreate, setCanCreate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editPaymentId, setEditPaymentId] = useState(null);
  const [prefillBillId, setPrefillBillId] = useState(null);
  const [prefillVendorId, setPrefillVendorId] = useState(null);
  const [prefillJobOrderId, setPrefillJobOrderId] = useState(null);
  const [rowSelection, setRowSelection] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const [confirmVoid, setConfirmVoid] = useState(null);
  const [isVoiding, setIsVoiding] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
    approval: "all",
  });

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

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, per_page: pagination.perPage };
      if (filters.search) params.search = filters.search;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.approval && filters.approval !== "all") {
        params.approval_status = filters.approval;
      }

      const res = await billPaymentsApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load bill payments",
      );
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    billPaymentsApi
      .formOptions()
      .then((res) => {
        setCanCreate(!!res.data?.data?.can_create);
        setCanDelete(!!res.data?.data?.can_delete);
      })
      .catch(() => {});
  }, []);

  const runBulkDelete = useCallback(async () => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        await billPaymentsApi.remove(id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBulkBusy(false);
    setConfirmBulkDelete(false);
    setRowSelection({});
    if (ok) toast.success(`Deleted ${ok} bill payment(s)`);
    if (fail) toast.error(`${fail} bill payment(s) could not be deleted`);
    fetchRows();
  }, [selectedIds, fetchRows]);

  useEffect(() => {
    const bill = searchParams.get("bill") || searchParams.get("bill_id");
    const vendor = searchParams.get("vendor_id");
    const jobOrder = searchParams.get("job_order_id");
    const shouldRecord =
      searchParams.get("record") === "1" || bill || vendor || jobOrder;
    const editId = searchParams.get("edit");
    if (editId) {
      setEditPaymentId(String(editId));
      setRecordOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
      return;
    }
    if (!shouldRecord) return;

    setPrefillBillId(bill || null);
    setPrefillVendorId(vendor || null);
    setPrefillJobOrderId(jobOrder || null);
    setRecordOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete("bill");
    next.delete("bill_id");
    next.delete("vendor_id");
    next.delete("record");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openRecordPayment = useCallback((opts = {}) => {
    setEditPaymentId(null);
    setPrefillBillId(opts.billId || null);
    setPrefillVendorId(opts.vendorId || null);
    setPrefillJobOrderId(opts.jobOrderId || null);
    setRecordOpen(true);
  }, []);

  const openEditPayment = useCallback((id) => {
    setEditPaymentId(String(id));
    setPrefillBillId(null);
    setPrefillVendorId(null);
    setPrefillJobOrderId(null);
    setRecordOpen(true);
  }, []);

  const resetFilters = () => {
    setFilters({ search: "", dateFrom: "", dateTo: "", approval: "all" });
    setSearchInput("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleVoid = useCallback(async () => {
    if (!confirmVoid) return;
    setIsVoiding(true);
    try {
      const res = await billPaymentsApi.remove(confirmVoid.id);
      toast.success(res.data?.message || "Bill payment deleted.");
      setConfirmVoid(null);
      fetchRows();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to delete bill payment",
      );
    } finally {
      setIsVoiding(false);
    }
  }, [confirmVoid, fetchRows]);

  const methodLabel = (m) =>
    PAYMENT_METHODS.find((x) => x.value === m)?.label || m || "—";

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
        accessorKey: "payment_date_display",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {row.original.payment_date_display ||
              row.original.payment_date ||
              "—"}
          </span>
        ),
        size: 110,
      },
      {
        id: "payment",
        accessorKey: "reference",
        header: "Payment",
        cell: ({ row }) => {
          const p = row.original;
          const label = documentNumberLabel(
            p.payment_number,
            p.reference,
          );
          const prepaid = hasPrepaidCash(p);
          return (
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <div className="flex min-w-0 max-w-full items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditPayment(p.id)}
                  className="min-w-0 truncate text-left font-mono text-sm font-medium text-primary hover:underline"
                  title={label}
                >
                  {label}
                </button>
                {prepaid ? (
                  <PrepaidInlineBadge
                    row={p}
                    title={`Prepaid ${formatCurrency(prepaidCashAmount(p), p.currency)} not yet applied to a bill`}
                  />
                ) : null}
              </div>
            </div>
          );
        },
        size: 150,
      },
      {
        id: "vendor",
        header: "Vendor",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <Link
              to={`${base}/${row.original.id}`}
              className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate"
            >
              {row.original.vendor?.name || "—"}
            </Link>
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "display_amount",
        header: "Amount",
        cell: ({ row }) => {
          const p = row.original;
          const amt = p.display_amount ?? p.amount;
          return (
            <span className="text-sm tabular-nums font-medium">
              {formatCurrency(amt, p.currency)}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "payment_method",
        header: "Method",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground capitalize">
            {methodLabel(row.original.payment_method)}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: "approval_status",
        header: "Approval",
        cell: ({ row }) => {
          const s = row.original.approval_status || "approved";
          return (
            <Badge
              variant="outline"
              className={cn(
                "rounded-full capitalize",
                APPROVAL_COLORS[s] || "",
              )}
            >
              {s}
            </Badge>
          );
        },
        size: 110,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const p = row.original;
          const vendorId = p.vendor_id || p.vendor?.id;
          const rowCanDelete = billPaymentCanDelete(p, canDelete);
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                asChild
                title="View"
              >
                <Link to={`${base}/${p.id}`}>
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
                  >
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {vendorId ? (
                    <DropdownMenuItem asChild>
                      <Link to={`${vendorsBase}/${vendorId}/edit`}>
                        <Building2 className="size-4 mr-2" /> View vendor
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  {vendorId ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      openEditPayment(p.id);
                    }}
                  >
                    <Pencil className="size-4 mr-2" /> Edit payment
                  </DropdownMenuItem>
                  {rowCanDelete ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={(e) => {
                          e.preventDefault();
                          setConfirmVoid(p);
                        }}
                      >
                        <Trash2 className="size-4 mr-2" /> Delete payment
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 100,
      },
    ],
    [base, vendorsBase, openEditPayment, canDelete],
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
      rowSelection,
    },
    enableRowSelection: (row) =>
      billPaymentCanDelete(row.original, canDelete),
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
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
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bill payments"
        subtitle="Record cash and vendor-credit applications against open bills."
        actions={
          canCreate && (
            <Button size="sm" variant="mono" onClick={() => openRecordPayment()}>
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
        <CardHeader className="py-3 border-b">
          <CardToolbar className="w-full flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search vendor, reference, or payment #…"
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
                className="w-[250px]"
                placeholder="From"
                value={filters.dateFrom}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateFrom: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
              <DatePicker
                className="w-[250px]"
                placeholder="To"
                value={filters.dateTo}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, dateTo: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
              <Select
                value={filters.approval}
                onValueChange={(val) => {
                  setFilters((f) => ({ ...f, approval: val }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Approval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
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

      <BillPaymentOffcanvas
        open={recordOpen}
        onOpenChange={(open) => {
          setRecordOpen(open);
          if (!open) {
            setEditPaymentId(null);
            setPrefillBillId(null);
            setPrefillVendorId(null);
            setPrefillJobOrderId(null);
          }
        }}
        editPaymentId={editPaymentId}
        preselectBillId={prefillBillId}
        preselectVendorId={prefillVendorId}
        preselectJobOrderId={prefillJobOrderId}
        onSuccess={(saved, meta) => {
          fetchRows();
          if (saved?.id && !meta?.isEdit) navigate(`${base}/${saved.id}`);
        }}
      />

      <ConfirmDialog
        open={!!confirmVoid}
        title="Delete bill payment?"
        description={
          confirmVoid
            ? `Permanently delete ${documentNumberLabel(confirmVoid.payment_number, confirmVoid.reference)} (${formatCurrency(confirmVoid.display_amount ?? confirmVoid.amount, confirmVoid.currency)})? This purges its journal entry, restores the paid bills' balances and any applied vendor credit. This cannot be undone.`
            : "This cannot be undone."
        }
        confirmLabel="Delete payment"
        confirmVariant="destructive"
        isLoading={isVoiding}
        onConfirm={handleVoid}
        onCancel={() => setConfirmVoid(null)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedCount} bill payment(s)?`}
        description="This cannot be undone. Only payments you are allowed to delete will be removed; others were not selectable."
        confirmLabel="Delete all"
        confirmVariant="destructive"
        onConfirm={runBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
        isLoading={bulkBusy}
      />
    </div>
  );
}
