import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProductForm } from '@/components/workspace/product/components/ProductForm';
import { useProductForm } from '@/components/workspace/product/hooks/useProductForm';
import { productsApi } from '@/components/workspace/product/api/products.api';

export function ProductEditPage() {
  const { id: workspaceId, productId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/products`;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsApi
      .show(productId)
      .then((res) => setProduct(res.data?.data))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load product');
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const form = useProductForm({
    mode: 'edit',
    productId,
    product,
    onSuccess: () => navigate(`${base}/${productId}`),
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Product not found</p>
        <Button asChild><Link to={base}>Back to products</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={`Edit ${product.name}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/${productId}`}><ArrowLeft className="size-4 mr-1" /> Back</Link>
          </Button>
        }
      />
      <ProductForm variant="page" {...form} onSubmit={form.handleSubmit} onCancel={() => navigate(`${base}/${productId}`)} />
    </div>
  );
}
