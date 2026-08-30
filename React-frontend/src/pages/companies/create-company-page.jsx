import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { accountApi } from './api/account.api';
import { PlanLimitBanner } from './components/companies-ui';
import { CREATE_COMPANY_STEPS, CreateCompanyStepper } from './components/create-company-ui';
import { CreateCompanySidebar, CreateCompanySuccess } from './components/create-company-sidebar';
import {
  calendarYearRange,
  CreateCompanyStepBasics,
  CreateCompanyStepContact,
  CreateCompanyStepDetails,
} from './components/create-company-form-steps';
import { useAuthStore } from '@/store/authStore';
import { getWorkspaceHomePath } from '@/industries';
import { CURRENCIES, DEFAULT_COMPANY_TYPE, DEFAULT_INDUSTRY_KEY, INDUSTRY_OPTIONS } from './constants';

const industryKeys = INDUSTRY_OPTIONS.map((o) => o.key);
const LAST_STEP = CREATE_COMPANY_STEPS.length - 1;
const defaultFiscal = calendarYearRange();

const schema = z.object({
  name: z.string().min(1, 'Company name is required').max(191),
  type: z.string().optional(),
  currency: z.string().optional(),
  tax_id: z.string().max(100).optional().or(z.literal('')),
  registration_number: z.string().max(100).optional().or(z.literal('')),
  industry_key: z
    .string({ required_error: 'Industry is required' })
    .refine((v) => industryKeys.includes(v), { message: 'Select a valid industry' }),
  fiscal_year_start: z.string().optional().or(z.literal('')),
  fiscal_year_end: z.string().optional().or(z.literal('')),
  address_line1: z.string().max(255).optional().or(z.literal('')),
  address_line2: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  postal_code: z.string().max(20).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

const STEP_FIELDS = [
  ['name', 'type', 'currency', 'industry_key'],
  ['email', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'],
  ['tax_id', 'registration_number', 'fiscal_year_start', 'fiscal_year_end', 'notes'],
];

export function CreateCompanyPage() {
  const navigate = useNavigate();
  const { setActiveCompany, hydrate } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [serverError, setServerError] = useState(null);
  const [createdCompany, setCreatedCompany] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [creating, setCreating] = useState(false);
  const stepRef = useRef(0);
  const creatingRef = useRef(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: DEFAULT_COMPANY_TYPE,
      currency: 'USD',
      industry_key: DEFAULT_INDUSTRY_KEY,
      fiscal_year_start: defaultFiscal.start,
      fiscal_year_end: defaultFiscal.end,
    },
    mode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = form;

  const watchValues = watch();
  stepRef.current = currentStep;

  useEffect(() => {
    accountApi
      .overview()
      .then((res) => setOverview(res.data?.data ?? null))
      .catch(() => setOverview(null))
      .finally(() => setLoadingOverview(false));
  }, []);

  const canCreate = overview?.usage?.can_create_company ?? true;

  const currencyLabel = useMemo(() => {
    return CURRENCIES.find((c) => c.code === watchValues.currency)?.label || watchValues.currency;
  }, [watchValues.currency]);

  async function goNext() {
    if (stepRef.current >= LAST_STEP) return;
    const fields = STEP_FIELDS[stepRef.current];
    const valid = await trigger(fields);
    if (!valid) return;
    const next = Math.min(stepRef.current + 1, LAST_STEP);
    stepRef.current = next;
    setCurrentStep(next);
    setMaxStepReached((m) => Math.max(m, next));
  }

  function goBack() {
    const prev = Math.max(0, stepRef.current - 1);
    stepRef.current = prev;
    setCurrentStep(prev);
  }

  async function createCompany(values) {
    if (stepRef.current !== LAST_STEP || creatingRef.current) return;

    if (!canCreate) {
      toast.error('You have reached your company limit on the current plan.');
      return;
    }

    creatingRef.current = true;
    setCreating(true);
    try {
      setServerError(null);
      const payload = {};
      Object.entries(values).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) payload[k] = v;
      });
      const res = await api.post('/companies', payload);
      const company = res.data?.data;
      setCreatedCompany(company);
      await hydrate();
      toast.success('Company created successfully');
    } catch (err) {
      creatingRef.current = false;
      setCreating(false);
      const msg =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Something went wrong.');
      const fieldErrors = err?.response?.data?.errors || {};
      setServerError({ msg, fields: fieldErrors });
      toast.error(msg);
    }
  }

  function handleWizardKeyDown(event) {
    if (event.key !== 'Enter') return;
    if (!(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    event.stopPropagation();
    if (stepRef.current < LAST_STEP) {
      goNext();
    }
  }

  function handleOpenWorkspace() {
    if (!createdCompany?.id) return;
    setActiveCompany(createdCompany);
    navigate(getWorkspaceHomePath(createdCompany));
  }

  if (createdCompany) {
    return (
      <Container className="pb-10">
        <CreateCompanySuccess company={createdCompany} onOpenWorkspace={handleOpenWorkspace} />
      </Container>
    );
  }

  const isLastStep = currentStep === LAST_STEP;
  const stepMeta = CREATE_COMPANY_STEPS[currentStep];

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="Create company" />
            <ToolbarDescription>
              Register a legal entity and workspace under this account.
            </ToolbarDescription>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" asChild>
              <Link to="/companies">
                <ArrowLeft className="size-4" />
                Back to companies
              </Link>
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container className="pb-10">
        {!loadingOverview && overview ? (
          <div className="mb-5">
            <PlanLimitBanner
              usage={overview.usage}
              account={overview.account}
              showCreateAction={false}
            />
          </div>
        ) : null}

        {!canCreate && !loadingOverview ? (
          <Alert variant="destructive" className="mb-5">
            <AlertTitle>Company limit reached</AlertTitle>
            <AlertDescription>
              You cannot create another company until you upgrade your plan or deactivate an
              existing company.
            </AlertDescription>
          </Alert>
        ) : null}

        {serverError ? (
          <Alert variant="destructive" className="mb-5">
            <AlertTitle>Could not create company</AlertTitle>
            <AlertDescription>{serverError.msg}</AlertDescription>
          </Alert>
        ) : null}

        <div onKeyDown={handleWizardKeyDown}>
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <CreateCompanyStepper
              currentStep={currentStep}
              completedThrough={maxStepReached}
              onStepClick={(step) => {
                if (step <= maxStepReached) setCurrentStep(step);
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4 lg:px-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Step {currentStep + 1} of {CREATE_COMPANY_STEPS.length}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                    {stepMeta?.title}
                  </h2>
                </div>

                <div className="px-6 py-6 lg:px-8 lg:py-7">
                  {currentStep === 0 ? (
                    <CreateCompanyStepBasics
                      register={register}
                      errors={errors}
                      watchValues={watchValues}
                      setValue={setValue}
                    />
                  ) : null}
                  {currentStep === 1 ? (
                    <CreateCompanyStepContact register={register} errors={errors} />
                  ) : null}
                  {currentStep === 2 ? (
                    <CreateCompanyStepDetails
                      register={register}
                      errors={errors}
                      watchValues={watchValues}
                      setValue={setValue}
                    />
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                  <p className="text-xs text-slate-400">
                    {currentStep === 0
                      ? 'Company name and industry are required.'
                      : isLastStep
                        ? 'Review fiscal dates, then create the company.'
                        : 'Optional — you can skip this step and continue.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentStep > 0 ? (
                      <Button type="button" variant="outline" onClick={goBack}>
                        <ChevronLeft className="size-4" />
                        Back
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" asChild>
                        <Link to="/companies">Cancel</Link>
                      </Button>
                    )}
                    {!isLastStep ? (
                      <Button type="button" onClick={goNext} disabled={!canCreate}>
                        Continue
                        <ArrowRight className="size-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={creating || !canCreate}
                        onClick={handleSubmit(createCompany)}
                      >
                        {creating ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Creating…
                          </>
                        ) : (
                          <>
                            <Plus className="size-4" />
                            Create company
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <CreateCompanySidebar
                watchValues={watchValues}
                overview={overview}
                currentStep={currentStep}
                currencyLabel={currencyLabel}
              />
            </div>
          </div>
        </div>
      </Container>
    </Fragment>
  );
}
