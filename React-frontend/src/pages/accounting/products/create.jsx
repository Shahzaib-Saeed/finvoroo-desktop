import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProductForm } from '@/components/workspace/product/components/ProductForm';
import { ProductTypePickerDialog } from '@/components/workspace/product/components/ProductTypePickerDialog';
import { useProductForm } from '@/components/workspace/product/hooks/useProductForm';
import { useProductLookups } from '@/components/workspace/product/hooks/useProductLookups';

export function ProductCreatePage() {
  const { id: workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/products`;
  const typeFromUrl = searchParams.get('type');
  const { lookups } = useProductLookups();

  const [pickerOpen, setPickerOpen] = useState(!typeFromUrl);
  const [selectedType, setSelectedType] = useState(typeFromUrl || null);

  const form = useProductForm({
    mode: 'create',
    initialType: selectedType || undefined,
    onSuccess: (created) => navigate(created?.id ? `${base}/${created.id}` : base),
  });

  if (!selectedType) {
    return (
      <>
        <div className="space-y-6 max-w-4xl">
          <PageHeader
            title="Create Product"
            subtitle="Choose the product type first"
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link to={base}><ArrowLeft className="size-4 mr-1" /> Back</Link>
              </Button>
            }
          />
        </div>
        <ProductTypePickerDialog
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open);
            if (!open) navigate(base);
          }}
          typeOptions={lookups.type_options}
          onSelect={(type) => {
            setSelectedType(type);
            setPickerOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Create Product"
        subtitle="Add a product or service to your catalog"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}><ArrowLeft className="size-4 mr-1" /> Back</Link>
          </Button>
        }
      />
      <ProductForm
        key={selectedType}
        variant="page"
        {...form}
        onSubmit={form.handleSubmit}
        onCancel={() => navigate(base)}
      />
    </div>
  );
}
