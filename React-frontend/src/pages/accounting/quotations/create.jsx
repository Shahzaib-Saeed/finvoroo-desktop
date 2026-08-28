import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { parseConversionSourceFromSearchParams } from '@/components/accounting/invoice-conversion';
import { QuotationForm } from './components/QuotationForm';
import { useQuotationForm } from './hooks/useQuotationForm';

export function QuotationCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSource = parseConversionSourceFromSearchParams(searchParams);
  const base = `/workspace/${workspaceId}/accounting/quotations`;

  const quotationForm = useQuotationForm({
    mode: 'create',
    fromSource,
    onSuccess: (created) => {
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Create quotation"
        subtitle={
          fromSource
            ? 'Review the pre-filled quotation from the source document, then save when ready.'
            : 'Prepare a quote for a customer before converting to a sales order or invoice.'
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <QuotationForm
        {...quotationForm}
        onSubmit={quotationForm.handleSubmit}
        onCancel={() => navigate(base)}
      />
    </div>
  );
}
