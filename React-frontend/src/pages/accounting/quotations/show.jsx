import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { quotationsApi } from './api/quotations.api';
import { QUOTATION_STATUSES } from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { QuotationShowActions } from './components/QuotationShowActions';
import { QuotationShowDetail } from './components/QuotationShowDetail';
import { DocumentActionConfirmDialog } from '../components/DocumentActionConfirmDialog';
import { documentConversionCreatePath } from '@/components/accounting/invoice-conversion';
import {
  confirmCreateSalesOrderMessage,
  confirmDeleteMessage,
  confirmEditMessage,
} from '../components/document-confirm-messages';

export function QuotationShowPage() {
  const { id: workspaceId, quotationId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/quotations`;

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    quotationsApi
      .show(quotationId)
      .then((res) => setQuotation(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load quotation');
        setQuotation(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [quotationId]);

  const closeConfirm = () => {
    if (!actionLoading) setConfirmAction(null);
  };

  const confirmMessage = useMemo(() => {
    if (!confirmAction || !quotation) return null;
    const num = quotation.quote_number;
    switch (confirmAction) {
      case 'delete':
        return confirmDeleteMessage('quotation', num);
      case 'edit':
        return confirmEditMessage('quotation', num);
      case 'createSalesOrder':
        return confirmCreateSalesOrderMessage(num);
      default:
        return null;
    }
  }, [confirmAction, quotation]);

  const salesOrderCreatePath = documentConversionCreatePath(
    workspaceId,
    'quotation',
    quotationId,
    'sales_order'
  );

  const runConfirmedAction = async () => {
    if (!confirmAction) return;

    if (confirmAction === 'edit') {
      setConfirmAction(null);
      navigate(`${base}/${quotationId}/edit`);
      return;
    }

    if (confirmAction === 'createSalesOrder') {
      setConfirmAction(null);
      if (salesOrderCreatePath) navigate(salesOrderCreatePath);
      return;
    }

    if (confirmAction !== 'delete') return;

    setActionLoading(true);
    try {
      await quotationsApi.delete(quotationId);
      toast.success('Quotation deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete quotation');
      setActionLoading(false);
      setConfirmAction(null);
    }
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
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Quotation not found</p>
        <Button asChild>
          <Link to={base}>Back to quotations</Link>
        </Button>
      </div>
    );
  }

  const status = quotation.status || 'draft';
  const statusLabel =
    QUOTATION_STATUSES.find((s) => s.value === status)?.label || status;
  const flags = quotation.flags || {};
  const isConverted = status === 'converted' || !!quotation.sales_order?.id;

  return (
    <div className="space-y-6 w-full min-w-0 print:space-y-4">
      <div className="print:hidden">
        <PageHeader
          title={quotation.quote_number}
          subtitle={`${quotation.customer?.name || 'Customer'} · ${statusLabel}`}
          actions={
            <QuotationShowActions
              workspaceId={workspaceId}
              quotationId={quotationId}
              quotation={quotation}
              base={base}
              canEdit={flags.can_edit !== false}
              canDelete={flags.can_delete !== false}
              canCreateSalesOrder={!isConverted && flags.can_edit !== false}
              onEdit={() => setConfirmAction('edit')}
              onCreateSalesOrder={() => setConfirmAction('createSalesOrder')}
              onDelete={() => setConfirmAction('delete')}
              busy={actionLoading}
            />
          }
        />
      </div>

      <QuotationShowDetail quotation={quotation} workspaceId={workspaceId} />

      <DocumentActionConfirmDialog
        open={!!confirmAction}
        message={confirmMessage}
        isLoading={actionLoading}
        onConfirm={runConfirmedAction}
        onCancel={closeConfirm}
      />
    </div>
  );
}
