import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { warehousesApi } from '../api/warehouses.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { WarehouseForm } from './components/WarehouseForm';

export function WarehouseCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/warehouses`;

  const [assetAccounts, setAssetAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const reloadAssetAccounts = useCallback(async () => {
    const res = await warehousesApi.formOptions();
    setAssetAccounts(res.data?.data?.asset_accounts ?? []);
  }, []);

  useEffect(() => {
    warehousesApi
      .formOptions()
      .then((res) => {
        setAssetAccounts(res.data?.data?.asset_accounts ?? []);
      })
      .catch((err) => toast.error(err?.response?.data?.message || 'Failed to load form options'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Add warehouse"
        subtitle="Create a storage location and optional inventory asset link."
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
        ) : (
          <WarehouseForm
            mode="create"
            assetAccounts={assetAccounts}
            onAccountCreated={reloadAssetAccounts}
            onCancel={() => navigate(base)}
            onSuccess={() => navigate(base)}
          />
        )}
      </div>
    </div>
  );
}
