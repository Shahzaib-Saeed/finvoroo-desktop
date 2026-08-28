import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { warehousesApi } from '../api/warehouses.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { WarehouseForm } from './components/WarehouseForm';

export function WarehouseEditPage() {
  const { id: workspaceId, warehouseId } = useParams();
  const navigate = useNavigate();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/warehouses`;

  const [warehouse, setWarehouse] = useState(null);
  const [assetAccounts, setAssetAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const reloadAssetAccounts = useCallback(async () => {
    const res = await warehousesApi.formOptions();
    setAssetAccounts(res.data?.data?.asset_accounts ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      warehousesApi.show(warehouseId),
      warehousesApi.formOptions(),
    ])
      .then(([showRes, optRes]) => {
        if (!cancelled) {
          setWarehouse(showRes.data?.data || null);
          setAssetAccounts(optRes.data?.data?.asset_accounts ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Warehouse not found');
          navigate(base);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseId, base, navigate]);

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={warehouse ? `Edit ${warehouse.name}` : 'Edit warehouse'}
        subtitle="Update warehouse details and status."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-6 max-w-3xl">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin mr-2" /> Loading…
          </div>
        ) : warehouse ? (
          <WarehouseForm
            mode="edit"
            warehouseId={warehouseId}
            initialWarehouse={warehouse}
            assetAccounts={assetAccounts}
            onAccountCreated={reloadAssetAccounts}
            onCancel={() => navigate(base)}
            onSuccess={() => navigate(base)}
          />
        ) : null}
      </div>
    </div>
  );
}
