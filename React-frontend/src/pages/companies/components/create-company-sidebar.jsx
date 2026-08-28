import { Link } from 'react-router-dom';
import { Building2, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CREATE_COMPANY_STEPS } from './create-company-ui';
import { DEFAULT_COMPANY_TYPE, INDUSTRY_OPTIONS } from '../constants';

export function CreateCompanySidebar({ watchValues, overview, currentStep, currencyLabel }) {
  const name = watchValues.name?.trim() || 'Company name';
  const location = [watchValues.city, watchValues.country].filter(Boolean).join(', ');
  const industry =
    INDUSTRY_OPTIONS.find((o) => o.key === watchValues.industry_key)?.label ||
    watchValues.industry_key;

  return (
    <aside className="space-y-4 xl:sticky xl:top-24">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Entity preview
          </p>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
                {name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {[watchValues.type || DEFAULT_COMPANY_TYPE, watchValues.currency || 'USD']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>

          <dl className="space-y-2.5 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Industry</dt>
              <dd className="text-right font-medium text-slate-800">{industry || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Currency</dt>
              <dd className="text-right font-medium text-slate-800">{currencyLabel || 'USD'}</dd>
            </div>
            {location ? (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Location</dt>
                <dd className="text-right font-medium text-slate-800">{location}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Plan slots</dt>
              <dd className="tabular-nums text-right font-medium text-slate-800">
                {overview?.usage?.slots_remaining ?? '—'} remaining
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Setup
        </p>
        <ul className="mt-3 space-y-2.5">
          {CREATE_COMPANY_STEPS.map((step, index) => (
            <li key={step.id} className="flex items-start gap-2.5 text-[13px]">
              <span
                className={
                  index === currentStep
                    ? 'mt-1.5 size-1.5 shrink-0 rounded-full bg-primary'
                    : index < currentStep
                      ? 'mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-900'
                      : 'mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-300'
                }
              />
              <span className={index === currentStep ? 'font-medium text-slate-900' : 'text-slate-500'}>
                {step.title}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[12px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-400" />
        <p>
          Creating this company seeds a default chart of accounts. Base currency should not be
          changed after transactions are posted.
        </p>
      </div>
    </aside>
  );
}

export function CreateCompanySuccess({ company, onOpenWorkspace }) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
        <Building2 className="size-7" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">Company created</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        <strong className="font-semibold text-slate-800">{company.name}</strong> is ready. Open the
        workspace to start accounting, or return to your companies list.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
        <Button onClick={onOpenWorkspace}>
          <ExternalLink className="size-4" />
          Open workspace
        </Button>
        <Button variant="outline" asChild>
          <Link to="/companies">Go to companies</Link>
        </Button>
      </div>
    </div>
  );
}
