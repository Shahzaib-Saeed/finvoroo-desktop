import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  Users,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { COMPANY_TYPES, DEFAULT_COMPANY_TYPE } from '@/pages/companies/constants';

const schema = z.object({
  name: z.string().min(1, 'Company name is required').max(191),
  phone: z.string().min(1, 'Phone number is required').max(50),
  country: z.string().min(1, 'Country is required').max(100),
  city: z.string().max(100).optional(),
  type: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
});

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'PKR', label: 'PKR — Pakistani Rupee' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
];

const STEPS = [
  { id: 1, title: 'Business' },
  { id: 2, title: 'Location' },
  { id: 3, title: 'Review' },
];

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function companyFromApi(raw) {
  if (!raw?.id) return null;
  return {
    id: raw.id,
    name: raw.name,
    currency: raw.currency ?? 'USD',
    role: null,
  };
}

export function FirstCompanySetup({ displayName }) {
  const navigate = useNavigate();
  const { setCompanies, setActiveCompany, hydrate } = useAuthStore();
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState(null);
  const [createdCompany, setCreatedCompany] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: DEFAULT_COMPANY_TYPE,
      currency: 'USD',
      phone: '',
      country: '',
      city: '',
    },
  });

  const values = watch();
  const typeValue = values.type;
  const currencyValue = values.currency;

  async function goNext() {
    const fields = step === 1 ? ['name', 'type'] : ['phone', 'country', 'city', 'currency'];
    const ok = await trigger(fields);
    if (ok) setStep((s) => Math.min(3, s + 1));
  }

  async function onSubmit(formValues) {
    setServerError(null);
    try {
      const res = await api.post('/companies', {
        name: formValues.name.trim(),
        phone: formValues.phone.trim(),
        country: formValues.country.trim(),
        city: formValues.city?.trim() || null,
        type: formValues.type || 'Other',
        currency: formValues.currency || 'USD',
      });
      const raw = res.data?.data;
      const company = companyFromApi(raw);
      if (!company) {
        setServerError('Company was created but the response was invalid. Please refresh and try again.');
        return;
      }

      setCompanies([company]);
      setActiveCompany(company);
      setCreatedCompany(company);

      try {
        await hydrate();
      } catch {
        // store already updated locally
      }
    } catch (err) {
      const errorsObj = err?.response?.data?.errors;
      const firstFieldError =
        errorsObj && typeof errorsObj === 'object'
          ? Object.values(errorsObj).flat?.()?.[0] || Object.values(errorsObj)[0]
          : null;
      const msg =
        (typeof firstFieldError === 'string' ? firstFieldError : null) ||
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Could not create company. Please try again.');
      setServerError(msg);
    }
  }

  if (createdCompany) {
    const base = `/workspace/${createdCompany.id}`;
    const nextSteps = [
      {
        title: 'Add a customer',
        description: 'Start receivables with your first customer record.',
        to: `${base}/accounting/customers`,
        icon: Users,
      },
      {
        title: 'Add a product',
        description: 'Create an item or service you sell.',
        to: `${base}/accounting/products`,
        icon: Package,
      },
      {
        title: 'Create an invoice',
        description: 'Issue your first sales invoice when you are ready.',
        to: `${base}/accounting/invoices/create`,
        icon: FileText,
      },
    ];

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-200/80 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="size-7 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">Workspace ready</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{createdCompany.name}</span> is set up.
            Your 14-day trial is active. Configure the company in this order:
          </p>
        </div>

        <ol className="space-y-2">
          {nextSteps.map((item, index) => (
            <li key={item.title}>
              <button
                type="button"
                onClick={() => navigate(item.to)}
                className="flex w-full items-start gap-3 rounded-xl border bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-primary/30 hover:bg-slate-50/80"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                  {index + 1}
                </span>
                <item.icon className="mt-1.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <Button className="h-10 w-full" onClick={() => navigate(base, { replace: true })}>
          Open dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-28px_rgba(15,23,42,0.28)]">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Step {step} of 3
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Set up your company</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {displayName ? (
            <>
              Welcome, <span className="font-medium text-foreground">{displayName}</span>. Your
              14-day trial starts when this workspace is created.
            </>
          ) : (
            <>Your 14-day trial starts when this workspace is created.</>
          )}
        </p>
        <div className="mt-4 flex gap-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full ${s.id <= step ? 'bg-primary' : 'bg-slate-100'}`}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        {step === 1 ? (
          <>
            <Field label="Company name *" error={errors.name?.message}>
              <Input {...register('name')} placeholder="e.g. Acme Trading LLC" autoFocus className="h-10" />
            </Field>
            <Field label="Business type" error={errors.type?.message}>
              <Select
                value={typeValue || DEFAULT_COMPANY_TYPE}
                onValueChange={(v) => setValue('type', v, { shouldValidate: true })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label="Phone number *" error={errors.phone?.message}>
              <Input {...register('phone')} placeholder="+1 …" className="h-10" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country *" error={errors.country?.message}>
                <Input {...register('country')} placeholder="Country" className="h-10" />
              </Field>
              <Field label="City" error={errors.city?.message}>
                <Input {...register('city')} placeholder="City (optional)" className="h-10" />
              </Field>
            </div>
            <Field label="Default currency *" error={errors.currency?.message}>
              <Select
                value={currencyValue || 'USD'}
                onValueChange={(v) => setValue('currency', v, { shouldValidate: true })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3 rounded-xl border bg-slate-50/80 p-4 text-sm">
            <p className="font-medium text-foreground">Review</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
              <dt>Company</dt>
              <dd className="text-right font-medium text-foreground">{values.name || '—'}</dd>
              <dt>Type</dt>
              <dd className="text-right font-medium text-foreground">{values.type || '—'}</dd>
              <dt>Phone</dt>
              <dd className="text-right font-medium text-foreground">{values.phone || '—'}</dd>
              <dt>Country</dt>
              <dd className="text-right font-medium text-foreground">{values.country || '—'}</dd>
              <dt>Currency</dt>
              <dd className="text-right font-medium text-foreground">{values.currency || '—'}</dd>
            </dl>
            <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
              Chart of accounts, a default warehouse, and tax settings are created automatically.
              Customers, products, and invoices stay empty until you add them.
            </p>
          </div>
        ) : null}

        <div className="flex gap-2 pt-1">
          {step > 1 ? (
            <Button type="button" variant="outline" className="h-10" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" /> Back
            </Button>
          ) : null}
          {step < 3 ? (
            <Button type="button" className="h-10 flex-1" onClick={goNext}>
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" className="h-10 flex-1 gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Creating workspace…
                </>
              ) : (
                <>
                  <Building2 className="size-4" /> Create workspace & start trial
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
