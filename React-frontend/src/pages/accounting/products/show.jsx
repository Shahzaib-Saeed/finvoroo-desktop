import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { productsApi } from '@/components/workspace/product/api/products.api';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { VendorDetailsSheet } from '@/pages/accounting/vendors/components/VendorDetailsSheet';
import { ProductMasterHeader } from './components/ProductMasterHeader';
import { ProductMasterKpiRow } from './components/ProductMasterKpiRow';
import { ProductMasterOverviewTab } from './components/ProductMasterOverviewTab';
import { ProductMasterTabPanel } from './components/ProductMasterTabPanel';
import {
  accountingColumns,
  adjustmentColumns,
  auditColumns,
  customerReturnColumns,
  movementsColumns,
  productionColumns,
  purchaseHistoryColumns,
  salesHistoryColumns,
  transferColumns,
  vendorCreditColumns,
} from './components/productMasterColumns';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'movements', label: 'Movements' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'sales', label: 'Sales' },
  { key: 'vendor-credits', label: 'Vendor credits' },
  { key: 'customer-returns', label: 'Customer returns' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'adjustments', label: 'Adjustments' },
  { key: 'production', label: 'Production' },
  { key: 'accounting', label: 'Accounting' },
  { key: 'cost-history', label: 'Cost history' },
  { key: 'audit', label: 'Audit' },
];

export function ProductShowPage() {
  const { id: workspaceId, productId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatMoney } = useCompanyCurrency(workspaceId);

  const activeTab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const setActiveTab = useCallback(
    (tab) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      });
    },
    [setSearchParams],
  );

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [flags, setFlags] = useState(null);
  const [isManufactured, setIsManufactured] = useState(false);

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [warehouseStock, setWarehouseStock] = useState(null);
  const [recentMovements, setRecentMovements] = useState([]);
  const [relatedCounts, setRelatedCounts] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [vendorSheet, setVendorSheet] = useState({ open: false, vendorId: null });

  const base = `/workspace/${workspaceId}/accounting/products`;

  const loadHeader = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await productsApi.master.header(productId);
      const payload = res.data?.data || {};
      setProduct(payload.product || null);
      setKpis(payload.kpis || null);
      setFlags(payload.flags || null);
      setIsManufactured(!!payload.is_manufactured);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load product');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadHeader();
  }, [loadHeader]);

  useEffect(() => {
    if (!productId || !product) return;
    let cancelled = false;
    setOverviewLoading(true);
    Promise.all([
      productsApi.master.warehouseStock(productId),
      productsApi.master.movements(productId, { page: 1, per_page: 8 }),
      productsApi.master.relatedSummary(productId),
    ])
      .then(([whRes, movRes, relRes]) => {
        if (cancelled) return;
        setWarehouseStock(whRes.data?.data || null);
        setRecentMovements(Array.isArray(movRes.data?.data) ? movRes.data.data : []);
        setRelatedCounts(relRes.data?.data?.counts || null);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load overview data');
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, product]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await productsApi.delete(productId);
      toast.success('Product deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [productId, navigate, base]);

  const openVendor = useCallback((vendorId) => setVendorSheet({ open: true, vendorId }), []);

  const movCols = useMemo(() => movementsColumns(workspaceId), [workspaceId]);
  const purchaseCols = useMemo(
    () => purchaseHistoryColumns(workspaceId, undefined, { onVendorClick: openVendor }),
    [workspaceId, openVendor],
  );
  const salesCols = useMemo(() => salesHistoryColumns(workspaceId, undefined), [workspaceId]);
  const vcCols = useMemo(
    () => vendorCreditColumns(workspaceId, undefined, { onVendorClick: openVendor }),
    [workspaceId, openVendor],
  );
  const crCols = useMemo(() => customerReturnColumns(workspaceId, undefined), [workspaceId]);
  const transferCols = useMemo(() => transferColumns(workspaceId), [workspaceId]);
  const adjCols = useMemo(() => adjustmentColumns(workspaceId), [workspaceId]);
  const prodCols = useMemo(() => productionColumns(workspaceId), [workspaceId]);
  const acctCols = useMemo(() => accountingColumns(workspaceId, undefined), [workspaceId]);
  const auditCols = useMemo(() => auditColumns(), []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16 space-y-4">
        <Package className="size-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Product not found</p>
        <Button asChild>
          <Link to={base}>Back to products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProductMasterHeader
        product={product}
        flags={flags}
        workspaceId={workspaceId}
        onDelete={() => setConfirmDelete(true)}
      />

      <ProductMasterKpiRow kpis={kpis} product={product} formatMoney={formatMoney} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="inline-flex w-auto h-auto flex-wrap justify-start gap-1 bg-transparent p-0 mb-4">
          {TABS.filter((t) => t.key !== 'production' || isManufactured).map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="data-[state=active]:bg-muted">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <ProductMasterOverviewTab
            loading={overviewLoading}
            warehouseStock={warehouseStock}
            recentMovements={recentMovements}
            relatedCounts={relatedCounts}
            workspaceId={workspaceId}
            formatMoney={formatMoney}
            onOpenTab={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="movements" className="mt-0">
          <ProductMasterTabPanel
            active={activeTab === 'movements'}
            fetcher={(params) => productsApi.master.movements(productId, params)}
            columns={movCols}
            emptyMessage="No inventory movements recorded for this product."
          />
        </TabsContent>

        <TabsContent value="purchases" className="mt-0">
          <ProductMasterTabPanel
            active={activeTab === 'purchases'}
            fetcher={(params) => productsApi.master.purchases(productId, params)}
            columns={purchaseCols}
            emptyMessage="No purchase bills found for this product."
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-0">
          <ProductMasterTabPanel
            active={activeTab === 'sales'}
            fetcher={(params) => productsApi.master.sales(productId, params)}
            columns={salesCols}
            emptyMessage="No sales invoices found for this product."
          />
        </TabsContent>

        <TabsContent value="vendor-credits" className="mt-0">
          <ProductMasterTabPanel
            active={activeTab === 'vendor-credits'}
            fetcher={(params) => productsApi.master.vendorCredits(productId, params)}
            columns={vcCols}
            emptyMessage="No vendor credits found for this product."
          />
        </TabsContent>

        <TabsContent value="customer-returns" className="mt-0">
          <ProductMasterTabPanel
            active={activeTab === 'customer-returns'}
            fetcher={(params) => productsApi.master.customerReturns(productId, params)}
            columns={crCols}
            emptyMessage="No customer returns found for this product."
          />
        </TabsContent>

        <TabsContent value="transfers" className="mt-0">
          <ProductMasterTabPanel
            active={activeTab === 'transfers'}
            fetcher={(params) => productsApi.master.transfers(productId, params)}
            columns={transferCols}
            emptyMessage="No warehouse transfers found for this product."
          />
        </TabsContent>

        <TabsContent value="adjustments" className="mt-0">
          <ProductMasterTabPanel
            active={activeTab === 'adjustments'}
            fetcher={(params) => productsApi.master.adjustments(productId, params)}
            columns={adjCols}
            emptyMessage="No inventory adjustments found for this product."
          />
        </TabsContent>

        {isManufactured ? (
          <TabsContent value="production" className="mt-0">
            <ProductMasterTabPanel
              active={activeTab === 'production'}
              fetcher={(params) => productsApi.master.production(productId, params)}
              columns={prodCols}
              emptyMessage="No production activity found for this product."
            />
          </TabsContent>
        ) : null}

        <TabsContent value="accounting" className="mt-0">
          <ProductMasterTabPanel
            active={activeTab === 'accounting'}
            fetcher={(params) => productsApi.master.accounting(productId, params)}
            columns={acctCols}
            emptyMessage="No GL activity found for this product yet."
          />
        </TabsContent>

        <TabsContent value="cost-history" className="mt-0">
          <ProductMasterCostHistoryTab productId={productId} active={activeTab === 'cost-history'} formatMoney={formatMoney} />
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
          <ProductMasterTabPanel
            active={activeTab === 'audit'}
            fetcher={(params) => productsApi.master.audit(productId, params)}
            columns={auditCols}
            emptyMessage="No audit history recorded for this product."
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this product?"
        description="This cannot be undone. Products with transaction history cannot be deleted."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={deleting}
      />

      <VendorDetailsSheet
        open={vendorSheet.open}
        onOpenChange={(open) => setVendorSheet((s) => ({ ...s, open }))}
        vendorId={vendorSheet.vendorId}
        workspaceId={workspaceId}
      />
    </div>
  );
}

function ProductMasterCostHistoryTab({ productId, active, formatMoney }) {
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!active || loadedOnce) return;
    setLoading(true);
    productsApi.master
      .costLayers(productId)
      .then((res) => setData(res.data?.data || null))
      .catch(() => toast.error('Failed to load cost history'))
      .finally(() => {
        setLoading(false);
        setLoadedOnce(true);
      });
  }, [active, loadedOnce, productId]);

  if (!active) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.method) {
    return <p className="text-sm text-muted-foreground py-8 text-center">This product does not track inventory cost.</p>;
  }

  const isAverage = data.method === 'average';

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Costing method: <span className="font-medium capitalize">{data.method}</span>
        {!isAverage ? (
          <>
            {' '}
            &middot; {data.total_remaining_quantity} units remaining &middot; {formatMoney(data.total_remaining_value)} total value
          </>
        ) : null}
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              {isAverage ? (
                <>
                  <th className="py-2 px-3 font-medium">Date</th>
                  <th className="py-2 px-3 font-medium">Type</th>
                  <th className="py-2 px-3 font-medium text-right">Qty</th>
                  <th className="py-2 px-3 font-medium text-right">Running qty</th>
                  <th className="py-2 px-3 font-medium text-right">Running avg cost</th>
                  <th className="py-2 px-3 font-medium text-right">Running value</th>
                </>
              ) : (
                <>
                  <th className="py-2 px-3 font-medium">Layer</th>
                  <th className="py-2 px-3 font-medium text-right">Remaining qty</th>
                  <th className="py-2 px-3 font-medium text-right">Unit cost</th>
                  <th className="py-2 px-3 font-medium text-right">Remaining value</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {!data.rows?.length ? (
              <tr>
                <td colSpan={isAverage ? 6 : 4} className="py-8 text-center text-muted-foreground">
                  No cost layers remain for this product.
                </td>
              </tr>
            ) : isAverage ? (
              data.rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 px-3">{row.date}</td>
                  <td className="py-2 px-3 capitalize">{(row.type || '').replace(/_/g, ' ')}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{row.quantity}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{row.running_quantity}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatMoney(row.running_average_cost)}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">{formatMoney(row.running_value)}</td>
                </tr>
              ))
            ) : (
              data.rows.map((row) => (
                <tr key={row.layer} className="border-b last:border-0">
                  <td className="py-2 px-3">Layer {row.layer}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{row.remaining_quantity}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatMoney(row.unit_cost)}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">{formatMoney(row.remaining_value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
