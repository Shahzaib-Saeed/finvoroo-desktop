import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { transfersApi } from './api/transfers.api';
import { EMPTY_TRANSFER_FORM, buildTransferPayload } from './constants';
import { invoicesApi } from '../invoices/api/invoices.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function TransferCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/transfers`;

  const [form, setForm] = useState({ ...EMPTY_TRANSFER_FORM });
  const [errors, setErrors] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [currencies, setCurrencies] = useState(['USD']);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [multiCurrency, setMultiCurrency] = useState(false);
  const [rateHint, setRateHint] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    transfersApi
      .formOptions()
      .then((res) => {
        const data = res.data?.data || {};
        const accts = data.deposit_accounts || [];
        setAccounts(accts);
        setBaseCurrency(data.base_currency || 'USD');
        setCurrencies(data.currencies?.length ? data.currencies : [data.base_currency || 'USD']);
        setMultiCurrency(!!data.multi_currency_enabled);
        setForm((f) => ({
          ...f,
          currency: data.base_currency || f.currency,
          from_account_id: accts[0]?.id ? String(accts[0].id) : '',
          to_account_id: accts[1]?.id ? String(accts[1].id) : accts[0]?.id ? String(accts[0].id) : '',
        }));
      })
      .catch(() => toast.error('Failed to load form options'))
      .finally(() => setLoadingOptions(false));
  }, []);

  useEffect(() => {
    if (!multiCurrency) {
      setRateHint(`Rate to ${baseCurrency}: 1 (base currency)`);
      return;
    }
    const curr = (form.currency || baseCurrency).toUpperCase();
    if (curr === baseCurrency.toUpperCase()) {
      setRateHint(`Rate to ${baseCurrency}: 1 (base currency)`);
      return;
    }
    setRateHint(`Rate to ${baseCurrency}: loading…`);
    let cancelled = false;
    invoicesApi
      .exchangeRate({ currency: curr, date: form.transfer_date })
      .then((res) => {
        if (cancelled) return;
        const rate = parseFloat(res.data?.data?.rate ?? res.data?.rate);
        if (!Number.isFinite(rate) || rate <= 0) {
          setRateHint(`Rate to ${baseCurrency}: not found`);
        } else {
          setRateHint(`1 ${curr} = ${rate.toFixed(6)} ${baseCurrency}`);
        }
      })
      .catch(() => {
        if (!cancelled) setRateHint(`Rate to ${baseCurrency}: unavailable`);
      });
    return () => {
      cancelled = true;
    };
  }, [form.currency, form.transfer_date, baseCurrency, multiCurrency]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.from_account_id === form.to_account_id) {
      setErrors({ to_account_id: 'To account must differ from the from account.' });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const res = await transfersApi.create(buildTransferPayload(form));
      toast.success(res.data?.message || 'Transfer recorded');
      navigate(base);
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        const next = {};
        Object.entries(serverErrors).forEach(([k, v]) => {
          next[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(next);
      } else {
        toast.error(err?.response?.data?.message || 'Could not save transfer');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="New transfer"
        subtitle="Transfer funds between cash or bank ledger accounts."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-6 max-w-2xl">
        {loadingOptions ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  From account <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.from_account_id || '_none'}
                  onValueChange={(v) => setField('from_account_id', v === '_none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.label || `${a.code} — ${a.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.from_account_id} />
              </div>

              <div className="space-y-2">
                <Label>
                  To account <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.to_account_id || '_none'}
                  onValueChange={(v) => setField('to_account_id', v === '_none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.label || `${a.code} — ${a.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.to_account_id} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                  required
                />
                <FieldError message={errors.amount} />
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                {multiCurrency ? (
                  <>
                    <Select
                      value={form.currency}
                      onValueChange={(v) => setField('currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{rateHint}</p>
                  </>
                ) : (
                  <Input value={form.currency} readOnly className="bg-muted" />
                )}
                <FieldError message={errors.currency} />
              </div>

              <div className="space-y-2">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={form.transfer_date}
                  onChange={(v) => setField('transfer_date', v)}
                  maxDate={new Date()}
                />
                <FieldError message={errors.transfer_date} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={form.reference}
                  onChange={(e) => setField('reference', e.target.value)}
                  maxLength={100}
                />
                <FieldError message={errors.reference} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  rows={2}
                  value={form.memo}
                  onChange={(e) => setField('memo', e.target.value)}
                />
                <FieldError message={errors.memo} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(base)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || accounts.length < 2}>
                {saving ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Save className="size-4 mr-2" />
                )}
                Transfer
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
