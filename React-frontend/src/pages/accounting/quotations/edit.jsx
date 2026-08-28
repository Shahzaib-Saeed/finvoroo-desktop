import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { quotationsApi } from './api/quotations.api';
import { QuotationForm } from './components/QuotationForm';
import { useQuotationForm } from './hooks/useQuotationForm';
import { DocumentActionConfirmDialog } from '../components/DocumentActionConfirmDialog';
import { confirmUpdateMessage } from '../components/document-confirm-messages';
import { DocumentCreateRelatedDropdown } from '../components/DocumentCreateRelatedDropdown';

export function QuotationEditPage() {
  const { id: workspaceId, quotationId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/quotations`;

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    quotationsApi
      .show(quotationId)
      .then((res) => {
        if (!cancelled) setQuotation(res.data?.data || null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load quotation');
        if (!cancelled) setQuotation(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quotationId]);

  const quotationForm = useQuotationForm({
    mode: 'edit',
    quotation,
    onSuccess: () => navigate(`${base}/${quotationId}`),
  });

  const updateConfirmMessage = useMemo(
    () =>
      quotation
        ? confirmUpdateMessage('quotation', quotation.quote_number)
        : null,
    [quotation]
  );

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setConfirmUpdate(true);
  };

  const confirmSave = () => {
    setConfirmUpdate(false);
    quotationForm.handleSubmit();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Quotation not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to quotations
          </Link>
        </Button>
      </div>
    );
  }

  if (quotation.status === 'cancelled') {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Cancelled quotations cannot be edited.</p>
        <Button asChild>
          <Link to={`${base}/${quotationId}`}>
            <ArrowLeft className="size-4 mr-1" /> View quotation
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={`Edit ${quotation.quote_number}`}
        subtitle={quotation.customer?.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DocumentCreateRelatedDropdown
              workspaceId={workspaceId}
              sourceType="quotation"
              sourceId={quotationId}
              targets={[
                { target: 'quotation' },
                { target: 'sales_order' },
                { target: 'invoice' },
                { target: 'bill' },
                { target: 'purchase_order' },
              ]}
            />
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/${quotationId}`}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Link>
            </Button>
          </div>
        }
      />
      <QuotationForm
        {...quotationForm}
        onSubmit={handleFormSubmit}
        onCancel={() => navigate(`${base}/${quotationId}`)}
      />

      <DocumentActionConfirmDialog
        open={confirmUpdate}
        message={updateConfirmMessage}
        isLoading={quotationForm.saving}
        onConfirm={confirmSave}
        onCancel={() => !quotationForm.saving && setConfirmUpdate(false)}
      />
    </div>
  );
}
