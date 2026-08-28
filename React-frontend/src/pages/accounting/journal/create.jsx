import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { SourceDocumentBanner } from '@/components/accounting/SourceDocumentBanner';
import { fetchJobOrderPreset } from '@/components/accounting/job-order-preset.lib';
import { journalsApi } from './api/journals.api';
import {
  fetchAccountBalanceMap,
  fetchJournalGroupedAccounts,
  mergeGroupedAccountBalances,
} from './lib/grouped-account-balances';
import { EMPTY_JOURNAL_FORM, JOURNAL_TYPE_OPTIONS, formFromEntry } from './constants';
import { JournalEntryForm } from './components/JournalEntryForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function JournalCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const presetJobOrderId = searchParams.get('job_order_id') || '';
  const presetType = searchParams.get('type') || (presetJobOrderId ? 'expense' : '');
  const base = `/workspace/${workspaceId}/accounting/journal`;
  const jobOrdersBase = `/workspace/${workspaceId}/accounting/job-orders`;
  const backTo = presetJobOrderId
    ? `${jobOrdersBase}/${presetJobOrderId}`
    : base;
  const isExpenseFromJob = presetJobOrderId && presetType === 'expense';
  const prefillEntry = location.state?.prefillEntry || null;

  const [form, setForm] = useState(() => {
    if (prefillEntry) {
      return {
        ...formFromEntry(prefillEntry),
        reference: '',
        entry_date: new Date().toISOString().slice(0, 10),
      };
    }
    return {
      ...EMPTY_JOURNAL_FORM,
      job_order_id: presetJobOrderId || '',
      type: presetType || EMPTY_JOURNAL_FORM.type,
    };
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingJobSource, setLoadingJobSource] = useState(!!presetJobOrderId);
  const [jobSource, setJobSource] = useState(null);
  const [opts, setOpts] = useState({
    grouped_accounts: [],
    journal_types: [],
    base_currency: 'USD',
    currencies: ['USD'],
    multi_currency_enabled: false,
    can_create_coa: true,
  });

  const reloadAccounts = useCallback(async () => {
    const next = await fetchJournalGroupedAccounts();
    setOpts((prev) => ({
      ...prev,
      grouped_accounts: next.grouped_accounts,
      can_create_coa: next.can_create_coa,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tasks = [
      Promise.all([journalsApi.formOptions(), fetchAccountBalanceMap().catch(() => ({}))]).then(
        ([res, balanceById]) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        if (!data.can_create) {
          toast.error('You do not have permission to create journal entries');
        }
        setOpts({
          grouped_accounts: mergeGroupedAccountBalances(
            data.grouped_accounts ?? [],
            balanceById,
          ),
          journal_types:
            data.journal_types?.length > 1 ? data.journal_types : JOURNAL_TYPE_OPTIONS,
          base_currency: data.base_currency || 'USD',
          currencies: data.currencies?.length ? data.currencies : [data.base_currency || 'USD'],
          multi_currency_enabled: !!data.multi_currency_enabled,
          can_create_coa: data.can_create_coa !== false,
        });
        setForm((f) => ({
          ...f,
          currency: data.base_currency || f.currency,
        }));
      }),
    ];

    if (presetJobOrderId) {
      tasks.push(
        fetchJobOrderPreset(presetJobOrderId).then(({ job, source }) => {
          if (cancelled) return;
          setJobSource(source);
          if (job?.id) {
            setForm((f) => ({
              ...f,
              job_order_id: String(job.id),
              type: presetType || (presetJobOrderId ? 'expense' : f.type),
              description:
                f.description ||
                (job.title ? `Expense — ${job.title}` : f.description),
            }));
          }
        }),
      );
    }

    Promise.all(tasks)
      .catch((err) =>
        toast.error(err?.response?.data?.message || 'Failed to load form'),
      )
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLoadingJobSource(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [presetJobOrderId, presetType]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setErrors({});
    try {
      const res = await journalsApi.create(payload);
      toast.success(res.data?.message || 'Journal entry created');
      const entry = res.data?.data;
      navigate(entry?.id ? `${base}/${entry.id}` : base);
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        const next = {};
        Object.entries(serverErrors).forEach(([k, v]) => {
          next[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(next);
      } else {
        toast.error(err?.response?.data?.message || 'Could not save journal entry');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingJobSource) {
    return (
      <div className="space-y-6 w-full min-w-0">
        <Skeleton className="h-14 w-full max-w-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={prefillEntry ? 'Correct journal entry' : isExpenseFromJob ? 'Record expense on job' : 'New journal entry'}
        subtitle={
          prefillEntry
            ? `Original entry ${prefillEntry.reference || `#${prefillEntry.id}`} was voided with an automatic reversal. Fix the amounts or accounts below and save as the corrected entry.`
            : isExpenseFromJob
              ? 'This expense is linked to the job order below. Add journal lines, balance debits and credits, then save.'
              : presetJobOrderId
                ? 'This journal entry is linked to the job order below. Compose balanced lines and save.'
                : 'Compose a balanced double-entry transaction. Choose a type, add lines, then save as draft or post from the entry view.'
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={backTo}>
              <ArrowLeft className="size-4 mr-1" />
              {presetJobOrderId ? 'Back to job' : 'Back'}
            </Link>
          </Button>
        }
      />

      {prefillEntry ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-2 text-sm">
          <RotateCcw className="size-4 text-primary shrink-0" />
          <span>
            Lines below are copied from the voided entry{' '}
            <Link to={`${base}/${prefillEntry.id}`} className="font-medium text-primary hover:underline">
              {prefillEntry.reference || `#${prefillEntry.id}`}
            </Link>
            . Adjust the debit/credit accounts or amounts, then save.
          </span>
        </div>
      ) : null}

      {jobSource ? (
        <SourceDocumentBanner
          source={jobSource}
          workspaceId={workspaceId}
          accent="primary"
          targetDocument={isExpenseFromJob ? 'expense' : 'journal entry'}
        />
      ) : null}

      <JournalEntryForm
        form={form}
        setForm={setForm}
        errors={errors}
        groupedAccounts={opts.grouped_accounts}
        journalTypes={opts.journal_types}
        baseCurrency={opts.base_currency}
        currencies={opts.currencies}
        multiCurrency={opts.multi_currency_enabled}
        canCreateCoa={opts.can_create_coa}
        onAccountCreated={reloadAccounts}
        saving={saving}
        onSubmit={handleSubmit}
        submitLabel={prefillEntry ? 'Save corrected entry' : isExpenseFromJob ? 'Save expense' : 'Create entry'}
      />
    </div>
  );
}
