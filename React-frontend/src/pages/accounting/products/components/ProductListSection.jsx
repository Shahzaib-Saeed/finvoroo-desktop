import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  EllipsisVertical,
  Eye,
  Edit3,
  Layers,
  Search,
  Trash2,
  X,
  FolderOpen,
  Tag,
  Ruler,
  Ban,
  CheckCircle2,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from "@/components/ui/card";
import { DataGrid } from "@/components/ui/data-grid";
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { productsApi } from "@/components/workspace/product/api/products.api";
import { PRODUCT_TYPES } from "@/components/workspace/product/constants";
import { useProductDialog } from "@/components/workspace/product/product-dialog-provider";
import { MasterDataGrid } from "./MasterDataGrid";
import { ProductDetailsSheet } from "./ProductDetailsSheet";
import { ProductStockDisplay } from "./ProductStockDisplay";
import {
  listProductsFromCache,
  shouldUseOfflineBrowse,
} from "@/offline/masters-repository";
import { isOnline } from "@/offline/connectivity";
import { ModuleEmptyState } from "@/components/common/module-empty-state";

function stockCellClass(product) {
  if (!product.track_inventory) {
    return "text-muted-foreground";
  }
  const stock = Number(product.current_stock ?? 0);
  const reorder = Number(product.reorder_level ?? 0);
  if (stock <= 0) {
    return "text-destructive font-semibold tabular-nums";
  }
  if (reorder > 0 && stock <= reorder) {
    return "text-amber-600 font-semibold tabular-nums";
  }
  return "text-emerald-600 font-semibold tabular-nums";
}

export function ProductListSection({
  workspaceId,
  categories = [],
  brands = [],
  units = [],
  filterTab = "all",
  onFilterTabChange,
  onMasterRefresh,
  onMasterCreate,
  onMasterEdit,
  onMasterDelete,
  canCreate = false,
}) {
  const productDialog = useProductDialog();
  const isProductsView = filterTab === "all";

  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 100,
    total: 0,
    lastPage: 1,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState([{ id: "name", desc: false }]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsProductId, setDetailsProductId] = useState(null);

  const openProductDetails = (product) => {
    setDetailsProductId(product.id);
    setDetailsOpen(true);
  };

  const fetchProducts = useCallback(async () => {
    if (filterTab !== "all") return;
    setLoading(true);
    try {
      const useCache = await shouldUseOfflineBrowse(workspaceId);
      if (useCache) {
        const cached = await listProductsFromCache(workspaceId, {
          page: pagination.page,
          perPage: pagination.perPage,
          search: search.trim(),
        });
        setProducts(cached.data);
        setPagination((p) => ({
          ...p,
          total: cached.meta.total,
          lastPage: cached.meta.last_page,
        }));
        return;
      }

      const res = await productsApi.list({
        page: pagination.page,
        per_page: pagination.perPage,
        search: search.trim() || undefined,
      });
      setProducts(res.data?.data || []);
      const meta = res.data?.meta || {};
      setPagination((p) => ({
        ...p,
        total: meta.total ?? 0,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      if (!isOnline() && workspaceId) {
        try {
          const cached = await listProductsFromCache(workspaceId, {
            page: pagination.page,
            perPage: pagination.perPage,
            search: search.trim(),
          });
          setProducts(cached.data);
          setPagination((p) => ({
            ...p,
            total: cached.meta.total,
            lastPage: cached.meta.last_page,
          }));
          toast.message("Showing cached products (offline)");
          return;
        } catch {
          /* fall through */
        }
      }
      toast.error(err?.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [filterTab, pagination.page, pagination.perPage, search, workspaceId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!isProductsView) return;
    const t = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      setSearch(inputValue);
    }, 300);
    return () => clearTimeout(t);
  }, [inputValue, isProductsView]);

  useEffect(() => {
    setRowSelection({});
    setInputValue("");
    setSearch("");
  }, [filterTab]);

  const searchPlaceholder = useMemo(() => {
    switch (filterTab) {
      case "unit":
        return "Search units…";
      case "category":
        return "Search categories…";
      case "brand":
        return "Search brands…";
      default:
        return "Search products…";
    }
  }, [filterTab]);

  const masterSearchQuery = inputValue.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!masterSearchQuery || filterTab !== "category") return categories;
    return categories.filter((row) => {
      const hay = [row.name, row.code, row.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(masterSearchQuery);
    });
  }, [categories, filterTab, masterSearchQuery]);

  const filteredBrands = useMemo(() => {
    if (!masterSearchQuery || filterTab !== "brand") return brands;
    return brands.filter((row) => {
      const hay = [row.name, row.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(masterSearchQuery);
    });
  }, [brands, filterTab, masterSearchQuery]);

  const filteredUnits = useMemo(() => {
    if (!masterSearchQuery || filterTab !== "unit") return units;
    return units.filter((row) => {
      const hay = [
        row.name,
        row.label,
        row.key,
        row.value,
        row.base_unit_key,
        row.base_unit_label,
        row.catalog_slug,
        row.conversion_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(masterSearchQuery);
    });
  }, [units, filterTab, masterSearchQuery]);

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);
  }, [rowSelection]);

  const selectedCount = selectedIds.length;

  const runBulk = async (action) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const res = await productsApi.bulk({ ids: selectedIds, action });
      toast.success(res.data?.message || "Bulk action completed");
      setRowSelection({});
      fetchProducts();
      onMasterRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Bulk action failed");
    } finally {
      setBulkBusy(false);
      setConfirmBulkDelete(false);
    }
  };

  const filterTabs = useMemo(
    () => [
      { id: "all", label: "All", icon: Layers, badge: pagination.total },
      { id: "unit", label: "Units", icon: Ruler, badge: units.length },
      {
        id: "category",
        label: "Categories",
        icon: FolderOpen,
        badge: categories.length,
      },
      { id: "brand", label: "Brands", icon: Tag, badge: brands.length },
    ],
    [pagination.total, units.length, categories.length, brands.length],
  );

  const columns = useMemo(
    () => [
      {
        id: "select",
        accessorKey: "id",
        header: () => <DataGridTableRowSelectAll size="sm" />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} size="sm" />,
        enableSorting: false,
        size: 44,
        meta: { cellClassName: "ps-3" },
      },
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 min-w-0">
            <button
              type="button"
              onClick={() => openProductDetails(row.original)}
              className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2 text-left"
            >
              {row.original.name}
            </button>
            {row.original.has_variants ? (
              <Badge variant="outline" className="w-fit rounded-md text-[10px] font-normal">
                Variants ({row.original.variants_count ?? 0})
              </Badge>
            ) : null}
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground uppercase">
            {row.original.sku || "—"}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-sm">
            {PRODUCT_TYPES[row.original.type] || row.original.type || "—"}
          </span>
        ),
        size: 120,
      },
      {
        id: "stock",
        header: "Stock",
        cell: ({ row }) => {
          if (!row.original.track_inventory) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <ProductStockDisplay
              stock={row.original.current_stock ?? 0}
              product={row.original}
              qtyOnly
              className={cn("text-sm", stockCellClass(row.original))}
            />
          );
        },
        size: 80,
      },
      {
        accessorKey: "is_active",
        header: "Status",
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
        id: "unit",
        header: "Unit",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.unit_label || row.original.unit || "—"}
          </span>
        ),
        size: 80,
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-sm truncate max-w-[120px] block">
            {row.original.category?.name || "—"}
          </span>
        ),
        size: 110,
      },
      {
        id: "brand",
        header: "Brand",
        cell: ({ row }) => (
          <span className="text-sm truncate max-w-[100px] block">
            {row.original.brand?.name || "—"}
          </span>
        ),
        size: 100,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title="View details"
              onClick={() => openProductDetails(row.original)}
            >
              <Eye className="size-4" />
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
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() =>
                    productDialog.openEdit(row.original, {
                      onSuccess: fetchProducts,
                    })
                  }
                >
                  <Edit3 className="size-4 mr-2" />
                  Edit product
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    try {
                      await productsApi.delete(row.original.id);
                      toast.success("Product deleted");
                      fetchProducts();
                      onMasterRefresh?.();
                    } catch (err) {
                      toast.error(
                        err?.response?.data?.message || "Delete failed",
                      );
                    }
                  }}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        size: 100,
      },
    ],
    [fetchProducts, onMasterRefresh, productDialog],
  );

  const table = useReactTable({
    data: products,
    columns,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const ns =
        typeof updater === "function"
          ? updater({
              pageIndex: pagination.page - 1,
              pageSize: pagination.perPage,
            })
          : updater;
      setPagination((p) => ({
        ...p,
        page: ns.pageIndex + 1,
        perPage: ns.pageSize,
      }));
      setRowSelection({});
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-4">
      {isProductsView && selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} selected
          </span>
          <div className="flex flex-wrap gap-2 ms-auto">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => runBulk("activate")}
            >
              <CheckCircle2 className="size-4 mr-1" />
              Set active
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => runBulk("deactivate")}
            >
              <Ban className="size-4 mr-1" />
              Set inactive
            </Button>
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
        <CardHeader className="py-3 flex-col gap-3 sm:flex-row sm:items-center sm:flex-nowrap border-b">
          <Tabs
            value={filterTab}
            onValueChange={onFilterTabChange}
            className="w-full sm:w-auto"
          >
            <TabsList className="h-auto p-0 bg-transparent border-0 rounded-none w-full justify-start overflow-x-auto">
              <div className="flex items-center gap-1 min-w-max">
                {filterTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = filterTab === tab.id;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className={cn(
                        "relative px-2.5 py-2 rounded-none shadow-none bg-transparent",
                        "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                        active
                          ? "text-primary font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-3.5" />
                        {tab.label}
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full text-[10px] px-1.5 min-w-5 h-5",
                            active && "border-primary/40 text-primary",
                          )}
                        >
                          {tab.badge}
                        </Badge>
                      </div>
                      {active && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </TabsTrigger>
                  );
                })}
              </div>
            </TabsList>
          </Tabs>

          <CardToolbar className="w-full sm:w-auto sm:ms-auto">
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                className="h-9 pl-9 pr-9"
                placeholder={searchPlaceholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              {inputValue ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 size-9"
                  onClick={() => {
                    setInputValue("");
                    if (isProductsView) setSearch("");
                  }}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </CardToolbar>
        </CardHeader>

        <Tabs value={filterTab} className="m-0">
          <TabsContent value="all" className="mt-0">
            {!loading && pagination.total === 0 && !search ? (
              <div className="p-6">
                <ModuleEmptyState
                  icon={Package}
                  title="No products yet"
                  description="Add your first product or service to start selling and tracking inventory."
                  actionLabel="Add Product"
                  onAction={
                    canCreate
                      ? () =>
                          productDialog.openCreate({
                            onSuccess: () => fetchProducts(),
                          })
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
            )}
          </TabsContent>

          <TabsContent value="category" className="mt-0">
            <MasterDataGrid
              kind="category"
              rows={filteredCategories}
              onEdit={(row) => onMasterEdit?.("category", row)}
              onDelete={(row) => onMasterDelete?.("category", row)}
              onRefresh={onMasterRefresh}
              emptyLabel={
                masterSearchQuery && categories.length
                  ? "No categories match your search."
                  : "No categories yet."
              }
              onAdd={() => onMasterCreate?.("category")}
              addLabel="Add category"
            />
          </TabsContent>

          <TabsContent value="brand" className="mt-0">
            <MasterDataGrid
              kind="brand"
              rows={filteredBrands}
              onEdit={(row) => onMasterEdit?.("brand", row)}
              onDelete={(row) => onMasterDelete?.("brand", row)}
              onRefresh={onMasterRefresh}
              emptyLabel={
                masterSearchQuery && brands.length
                  ? "No brands match your search."
                  : "No brands yet."
              }
              onAdd={() => onMasterCreate?.("brand")}
              addLabel="Add brand"
            />
          </TabsContent>

          <TabsContent value="unit" className="mt-0">
            <MasterDataGrid
              kind="unit"
              rows={filteredUnits}
              onEdit={(row) => onMasterEdit?.("unit", row)}
              onDelete={(row) => onMasterDelete?.("unit", row)}
              onRefresh={onMasterRefresh}
              emptyLabel={
                masterSearchQuery && units.length
                  ? "No units match your search."
                  : "No units yet."
              }
              onAdd={() => onMasterCreate?.("unit")}
              addLabel="Add unit"
              headerNote={
                <p className="text-xs text-muted-foreground mb-3">
                  Standard units (Pieces, Kg, Liter, etc.) are built in. Add a
                  custom unit only when you need something extra — e.g.{" "}
                  <strong>1 Carton = 12 Pieces</strong>.
                </p>
              }
            />
          </TabsContent>
        </Tabs>
      </Card>

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedCount} product(s)?`}
        description="This cannot be undone. Products in use on documents may fail to delete."
        confirmLabel="Delete all"
        confirmVariant="destructive"
        onConfirm={() => runBulk("delete")}
        onCancel={() => setConfirmBulkDelete(false)}
        isLoading={bulkBusy}
      />

      <ProductDetailsSheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setDetailsProductId(null);
        }}
        productId={detailsProductId}
        workspaceId={workspaceId}
        onEdit={(product) =>
          productDialog.openEdit(product, { onSuccess: fetchProducts })
        }
        onListRefresh={fetchProducts}
      />
    </div>
  );
}
