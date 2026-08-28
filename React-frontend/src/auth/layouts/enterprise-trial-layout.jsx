import { Navigate, Outlet } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { authCookies } from '@/auth/auth-cookies';

function FinvorooMark() {
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-[#2563EB] shadow-sm">
      <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden>
        <rect x="1" y="10" width="14" height="3" rx="0.8" fill="white" />
        <rect x="3" y="5.5" width="10" height="3" rx="0.8" fill="white" opacity="0.85" />
        <rect x="5" y="1" width="6" height="3" rx="0.8" fill="white" opacity="0.7" />
      </svg>
    </span>
  );
}

function DashboardPreview() {
  const kpis = [
    { label: 'Total Revenue', value: 'PKR 4,102,978', delta: '+12.4%', up: true },
    { label: 'Total Expenses', value: 'PKR 640,210', delta: '−3.1%', up: false },
    { label: 'Net Profit', value: 'PKR 136,376', delta: '+8.2%', up: true },
    { label: 'Cash & Bank', value: 'PKR 210,450', delta: '+1.8%', up: true },
  ];

  const bars = [42, 58, 36, 78, 51, 64, 45, 88, 70, 55, 73, 61];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-32px_rgba(15,23,42,0.45)]">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-[#f8fafc] px-4 py-2.5">
        <div className="flex shrink-0 gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="min-w-0 flex-1 rounded-md bg-white px-3 py-1.5 text-[11px] text-slate-400 ring-1 ring-slate-200/90">
          app.finvoroo.com/workspace/dashboard
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-emerald-600">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          System Operational
        </div>
      </div>

      <div className="bg-white p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-400">Thursday, July 2, 2026</p>
            <p className="mt-0.5 text-[15px] font-semibold text-slate-900">Good evening, Finvoroo</p>
          </div>
          <p className="text-[11px] text-slate-400">Last updated: 08:02 PM</p>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-medium tracking-wide text-slate-400">{kpi.label}</p>
              <p className="mt-1 truncate text-[13px] font-semibold tabular-nums text-slate-900">{kpi.value}</p>
              <p className={`mt-0.5 text-[10px] font-medium ${kpi.up ? 'text-emerald-600' : 'text-rose-500'}`}>
                {kpi.delta}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-[#fbfcfd] p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-800">Revenue vs Expenses</p>
            <p className="text-[11px] text-slate-400">Monthly Comparison</p>
          </div>
          <div className="flex h-[120px] items-end gap-1.5">
            {bars.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className={`w-full max-w-[18px] rounded-t-[3px] ${
                    i === 7 ? 'bg-[#2563EB]' : 'bg-slate-200'
                  }`}
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnterpriseTrialLayout() {
  if (authCookies.getToken()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#F3F4F6]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.045) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative grid min-h-screen w-full lg:grid-cols-2">
        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-[460px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-slate-500">
              <span className="size-1.5 rounded-full bg-[#2563EB]" />
              ENTERPRISE GATEWAY
            </div>
            <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight text-slate-900 xl:text-[38px]">
              Start Your 14-Day
              <br />
              Enterprise Trial
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-500">
              Instant access to all modules after verification. No credit card required.
            </p>

            <div className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.22)] sm:p-7">
              <Outlet />
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-slate-400" />
                256-Bit TLS Encryption
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-slate-400" />
                SOC-2 Ready
              </span>
            </div>
          </div>
        </section>

        <section className="relative hidden items-center px-8 py-12 lg:flex xl:px-14">
          <div className="w-full max-w-[640px]">
            <div className="mb-6 flex items-center gap-2.5">
              <FinvorooMark />
              <span className="text-[13px] font-semibold tracking-[0.2em] text-slate-900">
                FINVOROO
              </span>
            </div>
            <h2 className="text-[32px] font-semibold leading-tight tracking-tight text-slate-900 xl:text-[36px]">
              Secure Dashboard Access
            </h2>
            <p className="mt-3 max-w-[520px] text-[14px] leading-relaxed text-slate-500">
              A robust authentication gateway ensuring secure, role-based user access to the ERP
              Dashboard interface with encrypted multi-tenant data isolation.
            </p>
            <div className="mt-8">
              <DashboardPreview />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
