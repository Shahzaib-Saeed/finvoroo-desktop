import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { creditNotesApi } from './api/credit-notes.api';
import { CreditNoteForm } from './components/CreditNoteForm';
import { useCreditNoteForm } from './hooks/useCreditNoteForm';

export function CreditNoteEditPage() {
  const { id: workspaceId, creditNoteId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/credit-notes`;

  const [creditNote, setCreditNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    creditNotesApi
      .show(creditNoteId)
      .then((res) => {
        if (!cancelled) setCreditNote(res.data?.data || null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load credit note');
        if (!cancelled) setCreditNote(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [creditNoteId]);

  const formProps = useCreditNoteForm({
    mode: 'edit',
    creditNote,
    onSuccess: () => navigate(`${base}/${creditNoteId}`),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!creditNote) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Credit note not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to credit notes
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={`Edit ${creditNote.credit_note_number}`}
        subtitle={creditNote.customer?.name}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/${creditNoteId}`}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />
      <CreditNoteForm
        {...formProps}
        isEdit
        onSubmit={formProps.handleSubmit}
        onCancel={() => navigate(`${base}/${creditNoteId}`)}
      />
    </div>
  );
}
