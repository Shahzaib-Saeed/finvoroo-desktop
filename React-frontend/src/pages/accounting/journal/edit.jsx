import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { journalsApi } from './api/journals.api';
import { EMPTY_JOURNAL_FORM, JOURNAL_TYPE_OPTIONS, formFromEntry } from './constants';
import { JournalEntryForm } from './components/JournalEntryForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';

export function JournalEditPage() {
  const { id: workspaceId, journalId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/journal`;

  const [form, setForm] = useState({ ...EMPTY_JOURNAL_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opts, setOpts] = useState({
    grouped_accounts: [],
    journal_types: [],
    base_currency: 'USD',
    currencies: ['USD'],
    multi_currency_enabled: false,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([journalsApi.formOptions(), journalsApi.show(journalId)])
      .then(([optRes, showRes]) => {
        if (cancelled) return;
        const data = optRes.data?.data || {};
        const entry = showRes.data?.data;
        if (!entry) {
          toast.error('Journal entry not found');
          navigate(base);
          return;
        }
        if (!entry.flags?.can_edit) {
          toast.error('This journal entry cannot be edited');
          navigate(`${base}/${journalId}`);
          return;
        }
        setOpts({
          grouped_accounts: data.grouped_accounts ?? [],
          journal_types:
            data.journal_types?.length > 1 ? data.journal_types : JOURNAL_TYPE_OPTIONS,
          base_currency: data.base_currency || 'USD',
          currencies: data.currencies?.length ? data.currencies : [data.base_currency || 'USD'],
          multi_currency_enabled: !!data.multi_currency_enabled,
        });
        setForm(formFromEntry(entry));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load entry');
          navigate(base);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [journalId, base, navigate]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setErrors({});
    try {
      const res = await journalsApi.update(journalId, payload);
      toast.success(res.data?.message || 'Journal entry updated');
      navigate(`${base}/${journalId}`);
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        const next = {};
        Object.entries(serverErrors).forEach(([k, v]) => {
          next[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(next);
      } else {
        toast.error(err?.response?.data?.message || 'Could not update journal entry');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Edit journal entry"
        subtitle="Update this entry's accounts, amounts, date, or narration."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/${journalId}`}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />

      <JournalEntryForm
        form={form}
        setForm={setForm}
        errors={errors}
        groupedAccounts={opts.grouped_accounts}
        journalTypes={opts.journal_types}
        baseCurrency={opts.base_currency}
        currencies={opts.currencies}
        multiCurrency={opts.multi_currency_enabled}
        saving={saving}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
      />
    </div>
  );
}
