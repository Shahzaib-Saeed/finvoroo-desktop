import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { vendorsApi } from './api/vendors.api';
import { VendorForm } from './components/VendorForm';

export function VendorEditPage() {
  const { id: workspaceId, vendorId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/vendors`;

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    vendorsApi
      .show(vendorId)
      .then((res) => {
        if (!cancelled) setVendor(res.data?.data || null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load vendor');
        if (!cancelled) setVendor(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-4 text-center py-16">
        <p className="text-muted-foreground">Vendor not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to Vendors
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${vendor.name}`}
        subtitle={vendor.vendor_code ? `Code: ${vendor.vendor_code}` : undefined}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back to Vendors
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-6">
        <VendorForm
          variant="page"
          vendor={vendor}
          vendorId={vendorId}
          onCancel={() => navigate(base)}
          onSuccess={() => navigate(base)}
        />
      </div>
    </div>
  );
}
