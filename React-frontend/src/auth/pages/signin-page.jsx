import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  BarChart3,
  Check,
  Eye,
  EyeOff,
  LoaderCircleIcon,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { getSigninSchema } from '@/auth/forms/signin-schema';
import api from '@/lib/api';
import { isRunningInDesktopApp } from '@/lib/desktop-app';
import { authCookies, clearLegacyAuthStorage } from '@/auth/auth-cookies';
import { resetSessionRedirectFlag } from '@/auth/session';
import { useAuthStore } from '@/store/authStore';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-[var(--fv-accent)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--fv-ring)]';

/**
 * Capability chip for the marketing panel.
 *
 * Deliberately names no AI vendor. The engine behind invoice parsing is a
 * deployment detail that has already changed once; a sign-in page that names it
 * goes stale the next time it changes, and the vendor means nothing to the
 * pharmacist reading it either way.
 */
function FeatureChip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition-colors hover:border-slate-300 hover:bg-white">
      <Icon className="size-3.5 shrink-0 text-[var(--fv-accent)]" strokeWidth={2.5} />
      {children}
    </span>
  );
}

/**
 * The industries Finvoroo runs, in the order the panel cycles them.
 *
 * The cycle is the pitch: one platform core, an accent and a document shape per
 * industry. Saying "universal ERP" in a badge is a claim; showing the same
 * screen re-skin itself every few seconds is evidence.
 */
const INDUSTRIES = [
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    accent: '#059669',
    accentHover: '#047857',
    tint: '#ECFDF5',
    doc: 'Supplier invoice',
    caption: 'Batch and expiry read straight off the bill.',
    columns: ['Item', 'Batch', 'Exp', 'Qty'],
    rows: [
      ['RISEK 20MG CAP', 'B-9912', '07/27', '4'],
      ['PANADOL 500MG', 'L-3321', '11/27', '12'],
      ['BRUFEN 400MG', 'B-7781', '03/28', '5'],
      ['AUGMENTIN 625MG', 'A-5540', '01/28', '2'],
    ],
  },
  {
    key: 'universal',
    label: 'Universal',
    accent: '#165DFC',
    accentHover: '#1248D6',
    tint: '#EFF4FF',
    doc: 'Purchase bill',
    caption: 'Every line matched to your catalogue.',
    columns: ['Item', 'Code', 'Rate', 'Qty'],
    rows: [
      ['Copier Paper A4', 'STA-004', '1,250', '20'],
      ['Toner Cartridge', 'STA-119', '8,400', '3'],
      ['Desk Lamp LED', 'FUR-052', '2,100', '6'],
      ['USB-C Hub 7-in-1', 'ELE-231', '4,900', '4'],
    ],
  },
  {
    key: 'restaurant',
    label: 'Restaurant',
    accent: '#D97706',
    accentHover: '#B45309',
    tint: '#FFFBEB',
    doc: 'Delivery note',
    caption: 'Ingredients costed into every dish.',
    soon: true,
    columns: ['Item', 'Unit', 'Rate', 'Qty'],
    rows: [
      ['Chicken Breast', 'kg', '780', '25'],
      ['Basmati Rice', 'kg', '410', '50'],
      ['Mozzarella Block', 'kg', '2,250', '8'],
      ['Olive Oil 5L', 'can', '6,900', '4'],
    ],
  },
];

/** One loop of the scan: sweep, lines lift out, ticks land, total settles. */
const CYCLE_MS = 6000;

const SHOWCASE_CSS = `
@keyframes fv-sweep {
  0%   { transform: translateY(-8%); opacity: 0; }
  6%   { opacity: 1; }
  22%  { transform: translateY(108%); opacity: 1; }
  28%  { opacity: 0; }
  100% { transform: translateY(108%); opacity: 0; }
}
@keyframes fv-row {
  0%   { opacity: 0; transform: translateY(7px) scale(0.985); }
  16%  { opacity: 1; transform: translateY(0) scale(1); }
  90%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-4px); }
}
@keyframes fv-tick {
  0%, 34% { opacity: 0; transform: scale(0.4); }
  42%     { opacity: 1; transform: scale(1.18); }
  48%     { transform: scale(1); }
  90%     { opacity: 1; transform: scale(1); }
  100%    { opacity: 0; }
}
@keyframes fv-total {
  0%, 60% { opacity: 0; transform: translateY(5px); }
  70%     { opacity: 1; transform: translateY(0); }
  92%     { opacity: 1; }
  100%    { opacity: 0; }
}
@keyframes fv-fade { from { opacity: 0; } to { opacity: 1; } }

.fv-sweep { animation: fv-sweep var(--fv-cycle) cubic-bezier(0.4, 0, 0.2, 1) infinite; }
.fv-row   { animation: fv-row var(--fv-cycle) ease-out infinite; animation-delay: calc(var(--i) * 140ms); }
.fv-tick  { animation: fv-tick var(--fv-cycle) ease-out infinite; animation-delay: calc(var(--i) * 140ms); }
.fv-total { animation: fv-total var(--fv-cycle) ease-out infinite; }
.fv-swap  { animation: fv-fade 420ms ease-out both; }

/* Motion is decoration here — the panel must still read as a finished frame
   for anyone who has asked the system to stop moving things. */
@media (prefers-reduced-motion: reduce) {
  .fv-sweep { display: none; }
  .fv-row, .fv-tick, .fv-total, .fv-swap { animation: none; opacity: 1; transform: none; }
}
`;

/**
 * The product doing its job, on a loop.
 *
 * Replaces a static revenue/expenses/profit card, which is the placeholder
 * every SaaS template ships with and says nothing about what this one does.
 * A bill being read, matched and received is the thing Finvoroo is actually
 * for, so that is what the panel shows.
 */
function IndustryShowcase({ industry }) {
  return (
    <div className="relative z-10 w-full">
      <div
        key={industry.key}
        className="fv-swap relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-2xl shadow-slate-300/40 backdrop-blur-xl"
        style={{ '--fv-cycle': `${CYCLE_MS}ms` }}
      >
        {/* Document chrome */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
              style={{ backgroundColor: industry.tint, color: industry.accent }}
            >
              {industry.label.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate font-mono text-xs text-slate-500">{industry.doc}</span>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ backgroundColor: industry.tint, color: industry.accent }}
          >
            Reading…
          </span>
        </div>

        {/* Scan surface */}
        <div className="relative px-5 py-4">
          <div
            className="fv-sweep pointer-events-none absolute inset-x-0 top-0 h-16"
            style={{
              background: `linear-gradient(to bottom, transparent, ${industry.accent}1f, transparent)`,
            }}
            aria-hidden
          />

          <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-slate-100 pb-1.5">
            {industry.columns.map((col, i) => (
              <span
                key={col}
                className={`text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400 ${i === 0 ? '' : 'text-right'}`}
              >
                {col}
              </span>
            ))}
          </div>

          {industry.rows.map((row, i) => (
            <div
              key={row[0]}
              className="fv-row grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 py-[5px]"
              style={{ '--i': i }}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <svg
                  className="fv-tick size-3 shrink-0"
                  style={{ '--i': i, color: industry.accent }}
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
                  <path
                    d="M4.75 8.25 6.9 10.4l4.35-4.6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="truncate text-[11px] font-medium text-slate-800">{row[0]}</span>
              </span>
              <span className="text-right font-mono text-[10px] text-slate-500">{row[1]}</span>
              <span className="text-right font-mono text-[10px] text-slate-500">{row[2]}</span>
              <span className="text-right font-mono text-[10px] font-semibold text-slate-800">
                {row[3]}
              </span>
            </div>
          ))}
        </div>

        {/* Outcome */}
        <div
          className="fv-total flex items-center justify-between border-t px-5 py-3"
          style={{ borderColor: `${industry.accent}26`, backgroundColor: industry.tint }}
        >
          <span className="text-[11px] font-semibold" style={{ color: industry.accent }}>
            {industry.rows.length} lines matched · stock received
          </span>
          <span className="font-mono text-[11px] font-bold" style={{ color: industry.accent }}>
            0 errors
          </span>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500 lg:text-left">{industry.caption}</p>
    </div>
  );
}

/** Which industry the panel is showing, and the tabs that name them. */
function useIndustryCycle() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % INDUSTRIES.length), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return [INDUSTRIES[index], index, setIndex];
}


export function SignInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setActiveCompany } = useAuthStore();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    resetSessionRedirectFlag();
    clearLegacyAuthStorage();
  }, []);

  useEffect(() => {
    const pwdReset = searchParams.get('pwd_reset');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const verified = searchParams.get('verified');

    if (verified === '1') {
      setSuccessMessage('Email verified successfully. You can now sign in.');
    }
    if (pwdReset === 'success') {
      setSuccessMessage(
        'Your password has been successfully reset. You can now sign in with your new password.',
      );
    }
    if (errorParam) {
      setError(errorDescription || 'Authentication error. Please try again.');
    }
  }, [searchParams]);

  const form = useForm({
    resolver: zodResolver(getSigninSchema()),
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
      // Desktop app: default "keep me logged in" on so a paired device
      // naturally stays signed in for the existing 30-day remember-me window
      // instead of forcing a login every launch.
      rememberMe: isRunningInDesktopApp(),
    },
  });

  async function onSubmit(values) {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
        remember: !!values.rememberMe,
      });

      const { token, user, companies } = response.data.data;

      if ((user?.role ?? '') === 'super_admin') {
        setError('Super administrators must sign in at /superadmin/login.');
        toast.error('Super administrators must use the Super Admin login page.');
        return;
      }

      login(token, user, companies, !!values.rememberMe);

      if (
        user?.onboarding_required ||
        ((user?.role ?? '') === 'company_owner' && !(companies || []).length)
      ) {
        navigate('/onboarding', { replace: true });
        return;
      }

      const nextPath = location.state?.from?.pathname || searchParams.get('next');

      if (nextPath && nextPath !== '/auth/signin') {
        const workspaceMatch = nextPath.match(/^\/workspace\/(\d+)(?:\/|$)/);
        if (workspaceMatch) {
          const targetCompany = (companies || []).find(
            (company) =>
              String(company.id) === workspaceMatch[1] &&
              company.is_active !== false &&
              company.is_active !== 0,
          );

          if (targetCompany) {
            setActiveCompany(targetCompany);
            navigate(nextPath, { replace: true });
            return;
          }
        } else {
          navigate(nextPath, { replace: true });
          return;
        }
      }

      navigate('/select-company', { replace: true });
    } catch (err) {
      const code = err?.response?.data?.errors?.code;
      const errEmail = err?.response?.data?.errors?.email;
      if (
        code === 'email_not_verified' ||
        String(err?.response?.data?.message || '')
          .toLowerCase()
          .includes('verify your email')
      ) {
        const targetEmail = errEmail || values.email;
        toast.error('Please verify your email before signing in.');
        navigate(`/auth/verify-email?email=${encodeURIComponent(targetEmail)}`, { replace: true });
        return;
      }
      const message =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  // Hooks must run before the authenticated redirect, or the hook order changes
  // between a signed-out and signed-in render.
  const [industry, industryIndex, setIndustryIndex] = useIndustryCycle();

  if (authCookies.getToken()) {
    return <Navigate to="/" replace />;
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC] p-4 font-sans text-slate-800 antialiased lg:p-6"
      style={{
        // One accent for the whole page. The form and the panel move together,
        // so the page never reads as a blue product next to an amber one.
        '--fv-accent': industry.accent,
        '--fv-accent-hover': industry.accentHover,
        '--fv-ring': `${industry.accent}1f`,
        '--fv-shadow': `${industry.accent}38`,
      }}
    >
      <div className="grid w-full max-w-[1380px] lg:min-h-[700px] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/80 grid-cols-1 lg:grid-cols-12">
        <div className="z-10 flex flex-col justify-between bg-white p-8 sm:p-12 lg:col-span-5 xl:col-span-4 xl:p-14">
          <div className="flex items-center gap-2.5">
            {/* The real Finvoroo mark, on a neutral tile.
                It deliberately does NOT take the industry accent: a brand mark
                that recolours with the theme stops being a brand mark. White
                keeps it correct on the emerald, blue and amber cycles alike.
                Sourced from android-chrome-192 (38KB, tightly cropped) rather
                than finvoroo.svg, which is a 637KB PNG wrapped in an SVG tag
                and carries a large empty canvas. */}
            <img
              src="/media/app/android-chrome-192x192.png"
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-xl object-contain"
            />
            <span className="text-[1.6rem] font-extrabold tracking-[-0.02em] text-slate-900">
              Finvoroo
            </span>
          </div>

          <div className="my-auto py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
              <p className="mt-2 text-sm font-normal text-slate-500">
                Log in to manage your enterprise operations & metrics.
              </p>
            </div>

            {error ? (
              <div className="mb-4">
                <Alert variant="destructive" appearance="light" onClose={() => setError(null)}>
                  <AlertIcon>
                    <AlertCircle />
                  </AlertIcon>
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
              </div>
            ) : null}

            {successMessage ? (
              <div className="mb-4">
                <Alert appearance="light" onClose={() => setSuccessMessage(null)}>
                  <AlertIcon>
                    <Check />
                  </AlertIcon>
                  <AlertTitle>{successMessage}</AlertTitle>
                </Alert>
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Work Email
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  className={fieldClass}
                  {...register('email')}
                />
                {errors.email ? (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                ) : null}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/auth/reset-password"
                    className="text-xs font-semibold text-[var(--fv-accent)] transition-colors hover:text-[var(--fv-accent-hover)]"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className={`${fieldClass} pr-11`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!watch('rememberMe')}
                    onChange={(e) => setValue('rememberMe', e.target.checked)}
                    className="size-4 rounded border-slate-300 text-[var(--fv-accent)] focus:ring-[var(--fv-ring)]"
                  />
                  <span className="text-xs font-medium text-slate-600">
                    Keep me logged in for 30 days
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full transform rounded-xl bg-[var(--fv-accent)] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--fv-shadow)] transition-all duration-500 hover:bg-[var(--fv-accent-hover)] active:scale-[0.99] disabled:opacity-70"
              >
                {isProcessing ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircleIcon className="size-4 animate-spin" /> Signing in…
                  </span>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-500">
              New to Finvoroo?{' '}
              <Link to="/auth/signup" className="font-semibold text-[var(--fv-accent)] hover:underline">
                Create an enterprise account
              </Link>
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--fv-accent)] transition-colors duration-500" />
              Every posting audited
            </span>
            <span className="font-mono">v2.4.0</span>
          </div>
        </div>

        <div
          className="relative hidden flex-col justify-between overflow-hidden p-8 lg:col-span-7 lg:flex lg:p-12 xl:col-span-8 xl:p-14"
          style={{
            // Near-white base. A full-panel wash of the industry colour fought
            // the form and made the page look like two products; the colour now
            // arrives through the soft orbs below instead.
            background: `linear-gradient(150deg, #FDFDFE 0%, ${industry.tint}80 60%, #FBFBFD 100%)`,
            transition: 'background 600ms ease',
          }}
        >
          <style>{SHOWCASE_CSS}</style>

          <div
            className="pointer-events-none absolute -right-28 -top-28 size-96 rounded-full blur-3xl"
            style={{ backgroundColor: `${industry.accent}24`, transition: 'background-color 600ms ease' }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full blur-3xl"
            style={{ backgroundColor: `${industry.accent}18`, transition: 'background-color 600ms ease' }}
            aria-hidden
          />

          <div className="relative z-10 max-w-xl">
            {/* Industry tabs double as the legend for the colour change and as a
                control, so the cycle never feels like something happening at you. */}
            <div
              className="mb-5 inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 p-1 shadow-sm backdrop-blur"
              role="tablist"
              aria-label="Industries Finvoroo runs"
            >
              {INDUSTRIES.map((item, i) => {
                const active = i === industryIndex;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setIndustryIndex(i)}
                    className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                    style={
                      active
                        ? { backgroundColor: item.accent, color: '#fff' }
                        : { color: '#64748b' }
                    }
                  >
                    {item.label}
                    {item.soon ? <span className="ml-1 opacity-60">soon</span> : null}
                  </button>
                );
              })}
            </div>

            <h2 className="text-3xl font-extrabold leading-[1.12] tracking-tight text-slate-900 lg:text-[2.5rem]">
              Scan a supplier bill.
              <br />
              <span style={{ color: industry.accent, transition: 'color 600ms ease' }}>
                Receive stock in seconds.
              </span>
            </h2>
            <p className="mt-3.5 max-w-lg text-sm leading-relaxed text-slate-600 lg:text-[15px]">
              Finvoroo reads your purchase invoices, matches every line to your catalogue, and keeps
              cashflow, inventory and accounting in step — from one interface.
            </p>
          </div>

          <div className="relative z-10 my-6">
            <IndustryShowcase industry={industry} />
          </div>

          {/* Specific and verifiable beats impressive and generic — "256-bit AES"
              is table stakes, whereas an audit trail on every posting is not. */}
          <div className="z-10 flex flex-wrap items-center gap-2.5">
            <FeatureChip icon={ScanLine}>Reads any supplier layout</FeatureChip>
            <FeatureChip icon={ShieldCheck}>Audit trail on every posting</FeatureChip>
            <FeatureChip icon={BarChart3}>Role-based access · Multi-company</FeatureChip>
          </div>
        </div>
      </div>
    </div>
  );
}
