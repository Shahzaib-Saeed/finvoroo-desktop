import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff, LoaderCircleIcon } from 'lucide-react';
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
import { authCookies, clearLegacyAuthStorage } from '@/auth/auth-cookies';
import { resetSessionRedirectFlag } from '@/auth/session';
import { useAuthStore } from '@/store/authStore';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-[#165DFC] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#165DFC]/10';

function DashboardShowcase() {
  return (
    <div className="relative z-10 mt-8">
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl shadow-slate-300/50 backdrop-blur-xl transition-transform duration-500 lg:translate-x-4 lg:rotate-[-1.5deg] hover:rotate-0">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-3 rounded-full bg-slate-200" />
            <div className="size-3 rounded-full bg-slate-200" />
            <div className="size-3 rounded-full bg-slate-200" />
            <span className="ml-2 font-mono text-xs text-slate-400">dashboard.finvoroo.com</span>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            +24.8% vs last month
          </span>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Revenue
            </span>
            <span className="font-mono text-lg font-bold text-slate-900">PKR 4,102,976</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Expenses
            </span>
            <span className="font-mono text-lg font-bold text-slate-900">PKR 3,966,600</span>
          </div>
          <div className="rounded-xl border border-blue-100 bg-[#F0F5FF]/80 p-4">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#165DFC]">
              Net Profit
            </span>
            <span className="font-mono text-lg font-bold text-[#165DFC]">PKR 136,376</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100/80 bg-slate-50 p-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-700">
              INV
            </div>
            <div>
              <p className="font-semibold text-slate-800">INV-2026-001 • Al-Noor Traders</p>
              <p className="text-slate-400">Automated Pharmacy Invoice Parsing</p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-slate-800">PKR 135,000</span>
            <span className="block text-[10px] font-semibold text-emerald-600">PAID</span>
          </div>
        </div>
      </div>
    </div>
  );
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
      rememberMe: import.meta.env.VITE_DESKTOP_BUILD === 'true',
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
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC] p-4 font-sans text-slate-800 antialiased lg:p-6">
      <div className="grid min-h-[780px] w-full max-w-[1380px] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/80 grid-cols-1 lg:grid-cols-12">
        <div className="z-10 flex flex-col justify-between bg-white p-8 sm:p-12 lg:col-span-5 xl:col-span-4 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1248D6] via-[#165DFC] to-[#7239EA] shadow-lg shadow-[#165DFC]/25">
              <svg className="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">FINVOROO</span>
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
                    className="text-xs font-semibold text-[#165DFC] transition-colors hover:text-[#1248D6]"
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
                    className="size-4 rounded border-slate-300 text-[#165DFC] focus:ring-[#165DFC]/30"
                  />
                  <span className="text-xs font-medium text-slate-600">
                    Keep me logged in for 30 days
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full transform rounded-xl bg-[#165DFC] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#165DFC]/25 transition-all hover:bg-[#1248D6] active:scale-[0.99] active:bg-[#0E36AC] disabled:opacity-70"
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
              <Link to="/auth/signup" className="font-semibold text-[#165DFC] hover:underline">
                Create an enterprise account
              </Link>
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="size-2 animate-pulse rounded-full bg-[#10B981]" />
              256-bit AES Encrypted
            </span>
            <span className="font-mono">v2.4.0</span>
          </div>
        </div>

        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-50 via-[#F0F5FF]/40 to-slate-100 p-8 lg:col-span-7 lg:flex lg:p-12 xl:col-span-8 xl:p-16">
          <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-[#165DFC]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-[#7239EA]/10 blur-3xl" />

          <div className="relative z-10 max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-[#165DFC] shadow-sm backdrop-blur">
              <span className="size-1.5 rounded-full bg-[#165DFC]" />
              Finvoroo Universal ERP Platform
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 lg:text-4xl">
              Real-time clarity for complex business management.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 lg:text-base">
              Monitor real-time cashflow, seamlessly issue automated purchase invoices, and execute
              complete pharmacy and enterprise workflows from a unified interface.
            </p>
          </div>

          <DashboardShowcase />

          <div className="z-10 mt-8 flex flex-wrap items-center gap-3">
            <span className="rounded-lg border border-slate-200/60 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur">
              ⚡ Gemini 2.5 OCR Parsing
            </span>
            <span className="rounded-lg border border-slate-200/60 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur">
              📊 Automated Reporting
            </span>
            <span className="rounded-lg border border-slate-200/60 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur">
              🔒 SOC2 Compliant Security
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
