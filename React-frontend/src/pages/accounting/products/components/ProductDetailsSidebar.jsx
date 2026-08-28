import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompanyCurrency } from "@/hooks/use-company-currency";
import { PRODUCT_TYPES } from "@/components/workspace/product/constants";
import { cn } from "@/lib/utils";
import { ProductStockDisplay } from "./ProductStockDisplay";

export function ProductDetailsSidebar({ product, currency: currencyProp }) {
  const { currency: companyCurrency, formatMoney } = useCompanyCurrency();
  if (!product) return null;

  const currency = currencyProp || product.currency || companyCurrency;

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardContent className="pt-5 pb-5 flex flex-col items-center text-center">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt=""
              className="size-20 rounded-lg object-cover border"
            />
          ) : (
            <div
              className={cn(
                "size-20 rounded-lg flex items-center justify-center",
                "bg-primary/10 text-primary border border-primary/20",
              )}
            >
              <Package className="size-8" />
            </div>
          )}
          <p className="mt-3 font-semibold text-foreground line-clamp-2">
            {product.name}
          </p>
          {product.sku ? (
            <p className="text-xs font-mono text-muted-foreground mt-0.5 uppercase">
              {product.sku}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-1.5 mt-2">
            <Badge variant="outline">
              {PRODUCT_TYPES[product.type] || product.type}
            </Badge>
            <Badge
              variant="outline"
              className={
                product.is_active
                  ? "rounded-full bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "rounded-full bg-muted text-muted-foreground"
              }
            >
              {product.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm">
          <div className="flex justify-between gap-2 mt-4">
            <span className="text-muted-foreground">Selling price</span>
            <span className="font-medium tabular-nums">
              {formatMoney(product.unit_price, currency)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Cost</span>
            <span className="font-medium tabular-nums">
              {formatMoney(product.purchase_price, currency)}
            </span>
          </div>
          {product.track_inventory ? (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">On hand</span>
              <ProductStockDisplay
                stock={product.current_stock ?? 0}
                product={product}
                className="font-medium tabular-nums"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Classification</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm">
          <div className="flex justify-between gap-2 mt-4">
            <span className="text-muted-foreground">Category</span>
            <span>{product.category?.name || "—"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Brand</span>
            <span>{product.brand?.name || "—"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Unit</span>
            <span>{product.unit_label || product.unit || "—"}</span>
          </div>
        </CardContent>
      </Card>

      {product.description ? (
        <Card className="shadow-none">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground whitespace-pre-line mt-4">
            {product.description}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
