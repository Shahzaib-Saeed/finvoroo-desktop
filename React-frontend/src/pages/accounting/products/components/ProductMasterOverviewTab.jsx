import { Link } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductHistoryTable } from './ProductHistoryTable';
import { movementsColumns } from './productMasterColumns';

const RELATED_LABELS = {
  bills: 'Bills',
  invoices: 'Invoices',
  vendor_credits: 'Vendor credits',
  customer_returns: 'Customer returns',
  transfers: 'Warehouse transfers',
  adjustments: 'Inventory adjustments',
  production_orders: 'Production orders',
};

const RELATED_TAB_MAP = {
  bills: 'purchases',
  invoices: 'sales',
  vendor_credits: 'vendor-credits',
  customer_returns: 'customer-returns',
  transfers: 'transfers',
  adjustments: 'adjustments',
  production_orders: 'production',
};

export function ProductMasterOverviewTab({
  loading,
  warehouseStock,
  recentMovements,
  relatedCounts,
  workspaceId,
  formatMoney,
  onOpenTab,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="shadow-none">
        <CardHeader className="py-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Stock by warehouse</CardTitle>
          <span className="text-sm text-muted-foreground">
            {warehouseStock?.total_qty ?? 0} total &middot; {formatMoney(warehouseStock?.total_value ?? 0)}
          </span>
        </CardHeader>
        <CardContent className="pt-4">
          {!warehouseStock?.rows?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No stock recorded in any warehouse.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Warehouse</th>
                    <th className="py-2 pr-4 font-medium text-right">Quantity</th>
                    <th className="py-2 pr-4 font-medium text-right">Avg cost</th>
                    <th className="py-2 pr-4 font-medium text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseStock.rows.map((row) => (
                    <tr key={row.warehouse_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 pr-4">
                        <Link
                          to={`/workspace/${workspaceId}/accounting/inventory/warehouses/${row.warehouse_id}/stock`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.warehouse_name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{row.quantity}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{formatMoney(row.average_cost)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums font-medium">{formatMoney(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="py-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Recent movements</CardTitle>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => onOpenTab('movements')}>
            View all
          </button>
        </CardHeader>
        <CardContent className="pt-4">
          <ProductHistoryTable
            columns={movementsColumns(workspaceId)}
            rows={recentMovements}
            emptyMessage="No inventory movements recorded yet."
          />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base font-medium">Related documents</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(RELATED_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onOpenTab(RELATED_TAB_MAP[key] || key)}
                className="flex flex-col items-start gap-1 rounded-md border border-border px-3.5 py-3 text-left hover:bg-muted/40 transition-colors"
              >
                <span className="text-lg font-semibold tabular-nums">{relatedCounts?.[key] ?? 0}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
