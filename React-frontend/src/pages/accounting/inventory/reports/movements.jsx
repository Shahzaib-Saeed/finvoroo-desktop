import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getPaginationRowModel, getSortedRowModel } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import {
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { inventoryReportsApi } from "../api/inventory-reports.api";
import { formatCurrency } from "../constants";
import { INVENTORY_MOVEMENTS_COLUMNS } from "@/pages/accounting/reports/constants/report-columns";
import { useReportDataGridTable } from "@/pages/accounting/reports/hooks/useReportDataGridTable";
import { ReportTableToolbar } from "@/pages/accounting/reports/components/ReportTableToolbar";
import { ReportPageShell } from "@/pages/accounting/reports/components/ReportPageShell";
import { ReportActionBar } from "@/pages/accounting/reports/components/ReportActionBar";
import { ReportCompactFilterBar } from "@/pages/accounting/reports/components/ReportCompactFilterBar";
import { InventoryActivitySummaryPanels } from "./InventoryActivitySummaryPanels";
import { InventoryActivitySplitView } from "./InventoryActivitySplitView";
import {
  buildInventoryActivityDocumentUrl,
  buildJournalUrl,
} from "@/pages/accounting/reports/report-drilldown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTableDnd } from "@/components/ui/data-grid-table-dnd";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { useProductDialog } from "@/components/workspace/product/product-dialog-provider";
import { ProductDetailsSheet } from "@/pages/accounting/products/components/ProductDetailsSheet";
import { ReportPartyDrillLink } from "@/pages/accounting/reports/components/ReportPartyDrillLink";
import { MovementQtyDisplay } from "./MovementQtyDisplay";

const TYPE_OPTIONS = [
  { value: "__all__", label: "All types" },
  { value: "purchase", label: "Purchases (in)" },
  { value: "sale", label: "Sales (out)" },
  { value: "adjustment", label: "Adjustments" },
  { value: "transfer", label: "Transfers" },
];

function formatMovementDate(value) {
  if (!value) return "—";
  try {
    return format(parseISO(String(value).slice(0, 19)), "dd/MM/yyyy");
  } catch {
    return String(value).slice(0, 10);
  }
}

function documentKindLabel(kind) {
  switch (kind) {
    case "invoice":
      return "Invoice";
    case "invoice_cancel":
      return "Invoice cancel";
    case "bill":
      return "Bill";
    case "bill_cancel":
      return "Bill cancel";
    case "credit_note":
      return "Credit note";
    case "stock_adjustment":
      return "Adjustment";
    case "stock_transfer":
      return "Transfer";
    case "transfer":
      return "Transfer";
    default:
      return kind ? String(kind).replace(/_/g, " ") : "—";
  }
}

function movementSourceLabel(row) {
  if (row.document_kind) return documentKindLabel(row.document_kind);
  if (row.reference_type === "invoice_cancel") return "Invoice cancel";
  if (row.reference_type === "bill_cancel") return "Bill cancel";
  if (row.reference_type === "stock_adjustment") return "Stock adjustment";
  if (row.type === "adjustment") return "Stock correction";
  return "Movement";
}

function isManualStockAdjustment(row) {
  return (
    row.document_kind === "stock_adjustment" ||
    row.reference_type === "stock_adjustment"
  );
}

// Opens the source document (bill/invoice edit, adjustment detail, etc.)
function SourceDocumentLink({ workspaceId, row, className }) {
  const url = buildInventoryActivityDocumentUrl(workspaceId, row);
  const kindLabel = movementSourceLabel(row);
  const journalUrl = row.journal_entry_id
    ? buildJournalUrl(workspaceId, row.journal_entry_id)
    : null;

  if (url && row.document_id) {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <Link
          to={url}
          className="text-sm font-medium text-primary hover:underline decoration-2 underline-offset-2"
          title={`Open ${kindLabel}`}
          onClick={(e) => e.stopPropagation()}
        >
          {kindLabel}{" "}
          <span className="font-mono text-xs opacity-90">
            {row.document_number}
          </span>
        </Link>
        {row.adjustment_reason_label ? (
          <span className="text-xs text-muted-foreground">
            {row.adjustment_reason_label}
          </span>
        ) : null}
        {row.source_description ? (
          <span className="text-xs text-muted-foreground">
            {row.source_description}
          </span>
        ) : null}
        {journalUrl ? (
          <Link
            to={journalUrl}
            className="text-xs text-primary/80 hover:underline w-fit"
            onClick={(e) => e.stopPropagation()}
          >
            View journal entry
          </Link>
        ) : null}
      </div>
    );
  }

  const hint =
    row.source_description ||
    row.notes ||
    (row.reference_type
      ? `Reference: ${String(row.reference_type).replace(/_/g, " ")}${
          row.reference_id ? ` #${row.reference_id}` : ""
        }`
      : null);

  if (hint) {
    return (
      <div className={cn("flex flex-col gap-0.5 max-w-[220px]", className)}>
        <span className="text-sm font-medium text-foreground">
          {kindLabel}
        </span>
        <span className="text-xs text-muted-foreground leading-snug" title={hint}>
          {hint}
        </span>
        {isManualStockAdjustment(row) ? (
          <Link
            to={`/workspace/${workspaceId}/accounting/inventory/adjustments`}
            className="text-xs text-primary/80 hover:underline w-fit"
            onClick={(e) => e.stopPropagation()}
          >
            Open stock adjustments
          </Link>
        ) : null}
      </div>
    );
  }

  return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
}

export function InventoryMovementsReportPage() {
  const { id: workspaceId } = useParams();
  const productDialog = useProductDialog();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/reports`;

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [useTxnLedger, setUseTxnLedger] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsProductId, setDetailsProductId] = useState(null);
  const [viewMode, setViewMode] = useState("split");

  const [filters, setFilters] = useState({
    product_id: "",
    warehouse_id: "",
    type: "",
    from: "",
    to: "",
  });
  const [draftFilters, setDraftFilters] = useState(filters);

  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 50,
    total: 0,
    lastPage: 1,
  });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        per_page: pagination.perPage,
      };
      if (filters.product_id) params.product_id = Number(filters.product_id);
      if (filters.warehouse_id)
        params.warehouse_id = Number(filters.warehouse_id);
      if (filters.type) params.type = filters.type;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const res = await inventoryReportsApi.movements(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setSummary(meta.summary ?? null);
      setUseTxnLedger(!!meta.use_txn_ledger);
      if (meta.products) setProductOptions(meta.products);
      if (meta.warehouses) setWarehouseOptions(meta.warehouses);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load movements");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openProductDetails = useCallback((productId) => {
    if (!productId) return;
    setDetailsProductId(productId);
    setDetailsOpen(true);
  }, []);

  const applyFilters = () => {
    setPagination((p) => ({ ...p, page: 1 }));
    setFilters({ ...draftFilters });
    if (
      draftFilters.type === "adjustment" ||
      draftFilters.type === "transfer"
    ) {
      setViewMode("full");
    } else if (!draftFilters.type) {
      setViewMode("split");
    }
  };

  const resetFilters = () => {
    const emptyFilters = {
      product_id: "",
      warehouse_id: "",
      type: "",
      from: "",
      to: "",
    };
    setDraftFilters(emptyFilters);
    setPagination((p) => ({ ...p, page: 1 }));
    setFilters(emptyFilters);
    setViewMode("split");
  };

  const typeFilter = filters.type;
  const supportsSplitView =
    !typeFilter || typeFilter === "purchase" || typeFilter === "sale";
  const useSplitLayout = supportsSplitView && viewMode === "split";

  const buildAllColumns = useCallback(
    () => [
      {
        id: "when",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">
            {formatMovementDate(row.original.movement_date)}
          </span>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => {
          const m = row.original;
          const type = m.type;
          const docUrl = buildInventoryActivityDocumentUrl(workspaceId, m);
          const badge = (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${
                type === "purchase"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-transparent"
                  : type === "sale"
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              }${docUrl ? " hover:ring-2 hover:ring-primary/20 transition-shadow" : ""}`}
            >
              {String(type || "—")}
            </span>
          );

          if (docUrl) {
            return (
              <Link
                to={docUrl}
                title={`Open ${documentKindLabel(m.document_kind)}`}
                className="inline-block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={(e) => e.stopPropagation()}
              >
                {badge}
              </Link>
            );
          }

          return badge;
        },
      },
      {
        id: "product",
        header: "Product",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openProductDetails(row.original.product_id)}
            className="flex flex-col text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-muted/60 transition-colors group"
          >
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {row.original.product_name || row.original.product?.name || "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.product_sku || row.original.product?.sku
                ? `SKU #${row.original.product_sku || row.original.product?.sku}`
                : "—"}
            </span>
          </button>
        ),
      },
      {
        id: "document",
        header: "Source / detail",
        cell: ({ row }) => {
          const m = row.original;
          return <SourceDocumentLink workspaceId={workspaceId} row={m} />;
        },
      },
      {
        id: "party",
        header: "Customer / Vendor",
        cell: ({ row }) => {
          const m = row.original;
          if (!m.party_name) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }

          return (
            <div className="flex flex-col">
              <ReportPartyDrillLink
                partyKind={m.party_kind}
                partyId={m.party_id}
                className="text-foreground"
              >
                {m.party_name}
              </ReportPartyDrillLink>
              {m.party_code ? (
                <span className="text-xs font-mono text-muted-foreground">
                  {m.party_code}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "warehouse",
        header: "Warehouse",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.warehouse_name || "—"}
          </span>
        ),
      },
      {
        id: "qty",
        header: () => (
          <span className="block text-right w-full" title="Quantity recorded in inventory (storage unit)">
            Qty (inventory)
          </span>
        ),
        cell: ({ row }) => <MovementQtyDisplay row={row.original} />,
      },
      {
        id: "unit",
        header: "Unit",
        cell: ({ row }) => {
          const label = row.original.unit_label;
          if (!label) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-col">
              <span className="text-sm text-foreground">{label}</span>
              {row.original.unit_conversion_label ? (
                <span
                  className="text-xs text-muted-foreground"
                  title={row.original.unit_conversion_label}
                >
                  {row.original.unit_conversion_label}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "cost",
        header: () => (
          <span className="block text-right w-full">Unit Cost</span>
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right text-muted-foreground">
            {row.original.unit_cost != null
              ? formatCurrency(row.original.unit_cost)
              : "—"}
          </span>
        ),
      },
      {
        id: "total",
        header: () => (
          <span className="block text-right w-full">Total Cost</span>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums block text-right text-foreground">
            {row.original.total_cost != null
              ? formatCurrency(row.original.total_cost)
              : "—"}
          </span>
        ),
      },
    ],
    [workspaceId, openProductDetails],
  );

  const {
    table,
    allColumns,
    toggleColumn,
    isColumnVisible,
    handleDragEnd,
  } = useReportDataGridTable(
    workspaceId,
    "inventory-movements",
    INVENTORY_MOVEMENTS_COLUMNS,
    buildAllColumns,
    rows,
    {
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
          typeof updater === "function"
            ? updater({
                pageIndex: pagination.page - 1,
                pageSize: pagination.perPage,
              })
            : updater;
        setPagination((p) => ({
          ...p,
          page: (next.pageIndex ?? 0) + 1,
          perPage: next.pageSize ?? p.perPage,
        }));
      },
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
    },
  );

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Inventory Activity"
      subtitle={
        useTxnLedger
          ? "Purchases on the left, sales on the right — stock in vs stock out for the filtered period."
          : "Posted movement records — purchases and sales shown separately for easier review."
      }
      showBreadcrumb
      breadcrumbs={[
        { label: "Inventory reports", to: base },
        { label: "Inventory Activity" },
      ]}
      backTo={base}
      backLabel="Reports"
      actions={
        <ReportActionBar
          leading={
            <>
              {supportsSplitView ? (
                <div className="flex items-center rounded-md border border-slate-200 bg-white p-0.5">
                  <Button
                    type="button"
                    variant={useSplitLayout ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 rounded-sm px-2.5 text-xs"
                    onClick={() => setViewMode("split")}
                  >
                    Split view
                  </Button>
                  <Button
                    type="button"
                    variant={!useSplitLayout ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 rounded-sm px-2.5 text-xs"
                    onClick={() => setViewMode("full")}
                  >
                    Full list
                  </Button>
                </div>
              ) : null}
              <ReportTableToolbar
                columns={allColumns}
                isColumnVisible={isColumnVisible}
                onToggle={toggleColumn}
              />
            </>
          }
        />
      }
      contentClassName="w-full max-w-none space-y-3"
    >
      {summary ? (
        <InventoryActivitySummaryPanels
          summary={summary}
          movementCount={pagination.total}
        />
      ) : null}

      <ReportCompactFilterBar>
        <div className="flex min-w-[200px] flex-1 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-slate-600">Product</span>
          <Select
            value={draftFilters.product_id || "__all__"}
            onValueChange={(v) =>
              setDraftFilters((f) => ({
                ...f,
                product_id: v === "__all__" ? "" : v,
              }))
            }
          >
            <SelectTrigger className="h-8 min-w-0 rounded-sm border-slate-300 bg-white text-xs shadow-none">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All products</SelectItem>
              {productOptions.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.sku ? `[${p.sku}] ` : ""}
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[190px] flex-1 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-slate-600">Warehouse</span>
          <Select
            value={draftFilters.warehouse_id || "__all__"}
            onValueChange={(v) =>
              setDraftFilters((f) => ({
                ...f,
                warehouse_id: v === "__all__" ? "" : v,
              }))
            }
          >
            <SelectTrigger className="h-8 min-w-0 rounded-sm border-slate-300 bg-white text-xs shadow-none">
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All warehouses</SelectItem>
              {warehouseOptions.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select
          value={draftFilters.type || "__all__"}
          onValueChange={(v) => {
            const nextType = v === "__all__" ? "" : v;
            setDraftFilters((f) => ({
              ...f,
              type: nextType,
            }));
            if (nextType === "adjustment" || nextType === "transfer") {
              setViewMode("full");
            } else if (!nextType) {
              setViewMode("split");
            }
          }}
        >
          <SelectTrigger
            aria-label="Movement type"
            className="h-8 w-full rounded-sm border-slate-300 bg-white text-xs shadow-none sm:w-40"
          >
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DatePicker
          value={draftFilters.from}
          onChange={(v) => setDraftFilters((f) => ({ ...f, from: v || "" }))}
          className="h-8 w-full rounded-sm sm:w-36"
        />
        <span className="text-xs text-slate-400">to</span>
        <DatePicker
          value={draftFilters.to}
          onChange={(v) => setDraftFilters((f) => ({ ...f, to: v || "" }))}
          className="h-8 w-full rounded-sm sm:w-36"
        />

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-slate-600"
            onClick={resetFilters}
            disabled={loading}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-sm bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-none hover:bg-primary/90"
            onClick={applyFilters}
            disabled={loading}
          >
            Apply
          </Button>
        </div>
      </ReportCompactFilterBar>

      {useSplitLayout ? (
        <DataGrid
          table={table}
          recordCount={pagination.total}
          isLoading={loading}
        >
          <div className="space-y-3">
            <InventoryActivitySplitView
              rows={rows}
              workspaceId={workspaceId}
              onProductClick={openProductDetails}
              highlight={
                typeFilter === "purchase"
                  ? "purchase"
                  : typeFilter === "sale"
                    ? "sale"
                    : undefined
              }
            />
            <DataGridPagination sizes={[15, 25, 50, 100]} />
          </div>
        </DataGrid>
      ) : (
        <DataGrid
          table={table}
          recordCount={pagination.total}
          isLoading={loading}
        >
          <div className="w-full space-y-2">
            <DataGridContainer className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
              <ScrollArea className="w-full">
                <DataGridTableDnd handleDragEnd={handleDragEnd} />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </DataGridContainer>
            <DataGridPagination sizes={[15, 25, 50, 100]} />
          </div>
        </DataGrid>
      )}

      <ProductDetailsSheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setDetailsProductId(null);
        }}
        productId={detailsProductId}
        workspaceId={workspaceId}
        onEdit={(product) =>
          productDialog.openEdit(product, { onSuccess: fetchRows })
        }
        onListRefresh={fetchRows}
      />
    </ReportPageShell>
  );
}
