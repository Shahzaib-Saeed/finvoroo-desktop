import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit3, Loader2, ShoppingCart, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { productsApi } from '@/components/workspace/product/api/products.api';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { PRODUCT_TYPES } from '@/components/workspace/product/constants';
import { ProductStockDisplay } from './ProductStockDisplay';
import { CustomerDetailsStats } from '@/pages/accounting/customers/components/CustomerDetailsStats';
import { ProductDetailsSidebar } from './ProductDetailsSidebar';
import {
  ProductHistoryTable,
  productPurchaseColumns,
  productSalesColumns,
} from './ProductHistoryTable';

export function ProductDetailsPanel({
  productId,
  workspaceId,
  onClose,
  onEdit,
  onListRefresh,
  showHeaderActions = true,
}) {
  const { currency: companyCurrency, formatMoney } = useCompanyCurrency(workspaceId);
  const [product, setProduct] = useState(null);
  const [summary, setSummary] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchDetails = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await productsApi.details(productId);
      const payload = res.data?.data || {};
      setProduct(payload.product || null);
      setSummary(payload.summary || null);
      setSalesHistory(Array.isArray(payload.sales_history) ? payload.sales_history : []);
      setPurchaseHistory(Array.isArray(payload.purchase_history) ? payload.purchase_history : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load product details');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    setActiveTab('overview');
    setProduct(null);
    fetchDetails();
  }, [productId, fetchDetails]);

  const salesCols = useMemo(
    () => productSalesColumns(workspaceId, companyCurrency),
    [workspaceId, companyCurrency],
  );
  const purchaseCols = useMemo(
    () => productPurchaseColumns(workspaceId, companyCurrency),
    [workspaceId, companyCurrency],
  );

  if (!productId) return null;

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="border-b border-border px-5 py-6 space-y-3 animate-pulse">
          <div className="h-7 w-48 rounded-md bg-muted" />
          <div className="h-4 w-72 rounded-md bg-muted/70" />
        </div>
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <p>Product not found</p>
        {onClose ? (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </div>
    );
  }

  const currency = product.currency || companyCurrency;
  const overviewStats = [
    {
      label: 'On hand',
      value: product.track_inventory ? (
        <ProductStockDisplay
          stock={product.current_stock ?? 0}
          product={product}
          className="text-xl lg:text-2xl font-semibold tabular-nums"
        />
      ) : (
        '—'
      ),
      hint: product.track_inventory ? 'Current stock' : 'Not tracked',
      isCustomValue: product.track_inventory,
    },
    {
      label: 'Total sold',
      value: String(summary?.total_sold_qty ?? 0),
      hint: `${summary?.sales_line_count ?? 0} invoice line(s)`,
    },
    {
      label: 'Total purchased',
      value: String(summary?.total_purchased_qty ?? 0),
      hint: `${summary?.purchase_line_count ?? 0} bill line(s)`,
    },
    {
      label: 'Selling price',
      value: formatMoney(product.unit_price, currency),
      hint: `Cost ${formatMoney(product.purchase_price, currency)}`,
    },
  ];

  return (
    <>
      {showHeaderActions ? (
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-start lg:justify-between shrink-0">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xl lg:text-[22px] font-semibold text-foreground leading-tight truncate">
                {product.name}
              </span>
              <Badge variant="outline">{PRODUCT_TYPES[product.type] || product.type}</Badge>
              <Badge
                variant="outline"
                className={
                  product.is_active
                    ? 'rounded-full bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'rounded-full bg-muted text-muted-foreground'
                }
              >
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {product.sku ? (
              <p className="text-sm text-muted-foreground font-mono uppercase">{product.sku}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onClose ? (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            ) : null}
            {onEdit ? (
              <Button size="sm" variant="mono" onClick={() => onEdit(product)}>
                <Edit3 className="size-4 mr-1" /> Edit product
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <aside className="w-full shrink-0 border-b lg:border-b-0 lg:border-e border-border px-4 py-5 lg:w-[280px] lg:px-5">
          <ProductDetailsSidebar product={product} currency={currency} />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col min-h-0 py-5 lg:ps-5 lg:pe-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
            <TabsList className="inline-flex w-auto h-auto flex-wrap justify-start gap-1 bg-transparent p-0 mb-4 shrink-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-muted">
                Overview
              </TabsTrigger>
              <TabsTrigger value="sales" className="gap-1.5">
                <ShoppingCart className="size-3.5" />
                Sales ({salesHistory.length})
              </TabsTrigger>
              <TabsTrigger value="purchases" className="gap-1.5">
                <Truck className="size-3.5" />
                Purchases ({purchaseHistory.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 pe-2" viewportClassName="max-h-[calc(100dvh-16rem)]">
              <TabsContent value="overview" className="mt-0 space-y-5 pb-4">
                <CustomerDetailsStats items={overviewStats} />
                <ProductHistoryTable
                  title="Recent sales"
                  columns={salesCols}
                  rows={salesHistory.slice(0, 8)}
                  emptyMessage="No sales recorded for this product yet."
                />
                <ProductHistoryTable
                  title="Recent purchases"
                  columns={purchaseCols}
                  rows={purchaseHistory.slice(0, 8)}
                  emptyMessage="No purchases recorded for this product yet."
                />
              </TabsContent>

              <TabsContent value="sales" className="mt-0 pb-4">
                <ProductHistoryTable
                  columns={salesCols}
                  rows={salesHistory}
                  emptyMessage="No invoice lines found for this product."
                />
              </TabsContent>

              <TabsContent value="purchases" className="mt-0 pb-4">
                <ProductHistoryTable
                  columns={purchaseCols}
                  rows={purchaseHistory}
                  emptyMessage="No bill lines found for this product."
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </>
  );
}
