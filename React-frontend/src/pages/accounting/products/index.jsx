import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  Plus,
  Package,
  FolderOpen,
  Tag,
  Ruler,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProductDialog } from "@/components/workspace/product/product-dialog-provider";
import { productsApi } from "@/components/workspace/product/api/products.api";
import {
  QuickBrandDialog,
  QuickCategoryDialog,
  QuickUnitDialog,
} from "@/components/workspace/product/components/QuickCreateDialogs";
import { ProductListSection } from "./components/ProductListSection";

export function ProductsPage() {
  const { id: workspaceId } = useParams();
  const productDialog = useProductDialog();

  const [filterTab, setFilterTab] = useState("all");
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [masterDialog, setMasterDialog] = useState(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    productsApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  const fetchMaster = useCallback(async () => {
    try {
      const [cat, brand, unit] = await Promise.all([
        productsApi.listCategories(),
        productsApi.listBrands(),
        productsApi.listUnits(),
      ]);
      setCategories(cat.data?.data || []);
      setBrands(brand.data?.data || []);
      setUnits(unit.data?.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchMaster();
  }, [fetchMaster]);

  const bumpList = () => {
    setListRefreshKey((k) => k + 1);
    fetchMaster();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete._type === "category") {
        await productsApi.deleteCategory(confirmDelete.id);
      } else if (confirmDelete._type === "brand") {
        await productsApi.deleteBrand(confirmDelete.id);
      } else if (confirmDelete._type === "unit") {
        await productsApi.deleteUnit(confirmDelete.id);
      }
      toast.success("Deleted successfully");
      setConfirmDelete(null);
      bumpList();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const openMasterCreate = (kind) => setMasterDialog({ kind, record: null });
  const openMasterEdit = (kind, record) => setMasterDialog({ kind, record });

  const primaryAction = () => {
    switch (filterTab) {
      case "category":
        return (
          <Button size="sm" onClick={() => openMasterCreate("category")}>
            <Plus className="size-4 mr-1" /> New category
          </Button>
        );
      case "brand":
        return (
          <Button size="sm" onClick={() => openMasterCreate("brand")}>
            <Plus className="size-4 mr-1" /> New brand
          </Button>
        );
      case "unit":
        return (
          <Button size="sm" onClick={() => openMasterCreate("unit")}>
            <Plus className="size-4 mr-1" /> New unit
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            variant="mono"
            onClick={() => productDialog.openCreate({ onSuccess: bumpList })}
          >
            <Plus className="size-4 mr-1" /> New product
          </Button>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Services"
        subtitle="Product master: items, categories, brands, units, and inventory"
        actions={
          canCreate && (
            <div className="flex flex-wrap gap-2">
              {primaryAction()}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    More <ChevronDown className="size-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      productDialog.openCreate({ onSuccess: bumpList })
                    }
                  >
                    <Package className="size-4 mr-2" /> New product
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openMasterCreate("category")}>
                    <FolderOpen className="size-4 mr-2" /> New category
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openMasterCreate("brand")}>
                    <Tag className="size-4 mr-2" /> New brand
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openMasterCreate("unit")}>
                    <Ruler className="size-4 mr-2" /> New unit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        }
      />

      <ProductListSection
        key={listRefreshKey}
        workspaceId={workspaceId}
        categories={categories}
        brands={brands}
        units={units}
        filterTab={filterTab}
        onFilterTabChange={setFilterTab}
        onMasterRefresh={fetchMaster}
        onMasterCreate={openMasterCreate}
        onMasterEdit={openMasterEdit}
        onMasterDelete={(kind, row) =>
          setConfirmDelete({ ...row, _type: kind })
        }
        canCreate={canCreate}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete?"
        description={`Remove ${confirmDelete?.name || confirmDelete?.label}?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleting}
      />

      <QuickCategoryDialog
        open={masterDialog?.kind === "category"}
        onOpenChange={(open) => !open && setMasterDialog(null)}
        record={masterDialog?.kind === "category" ? masterDialog.record : null}
        onCreated={() => {
          bumpList();
          setMasterDialog(null);
        }}
      />
      <QuickBrandDialog
        open={masterDialog?.kind === "brand"}
        onOpenChange={(open) => !open && setMasterDialog(null)}
        record={masterDialog?.kind === "brand" ? masterDialog.record : null}
        onCreated={() => {
          bumpList();
          setMasterDialog(null);
        }}
      />
      <QuickUnitDialog
        open={masterDialog?.kind === "unit"}
        onOpenChange={(open) => !open && setMasterDialog(null)}
        record={masterDialog?.kind === "unit" ? masterDialog.record : null}
        onCreated={() => {
          bumpList();
          setMasterDialog(null);
        }}
      />
    </div>
  );
}
