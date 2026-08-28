import { ArrowRight, Clock, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEPS = [
  { n: 1, label: 'Choose your data' },
  { n: 2, label: 'Pick what to see' },
  { n: 3, label: 'Filter' },
  { n: 4, label: 'Preview' },
  { n: 5, label: 'Save' },
];

export function ReportsWelcomeHero({ workspaceBase, onDismiss, className }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg sm:p-8',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-blue-500/10 blur-3xl" />

      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Dismiss welcome"
      >
        <X className="size-4" />
      </button>

      <div className="relative max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
          <Sparkles className="size-3.5" />
          Welcome to Reports
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Create powerful reports without writing SQL
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-base">
          Answer a few simple questions and get live data in seconds. No technical knowledge required.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-5">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Step {step.n}</p>
              <p className="mt-0.5 text-xs font-medium text-white/90">{step.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="sm" className="h-9 gap-1.5 bg-white text-slate-900 hover:bg-white/90" asChild>
            <Link to={`${workspaceBase}/accounting/reports/create`}>
              Create your first report
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
            <Clock className="size-3.5" />
            Takes about 30 seconds
          </span>
        </div>
      </div>
    </div>
  );
}
