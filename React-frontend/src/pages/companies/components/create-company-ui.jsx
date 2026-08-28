import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export const CREATE_COMPANY_STEPS = [
  { id: 'basics', title: 'Company basics', description: 'Name, type & currency' },
  { id: 'contact', title: 'Contact & address', description: 'Reachability & location' },
  { id: 'details', title: 'Legal & notes', description: 'Tax ID & fiscal year' },
];

export function CreateCompanyStepper({ currentStep, onStepClick, completedThrough }) {
  return (
    <ol className="grid grid-cols-1 gap-0 sm:grid-cols-3">
      {CREATE_COMPANY_STEPS.map((step, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        const clickable = index <= completedThrough;

        return (
          <li key={step.id} className="relative flex min-w-0">
            {index < CREATE_COMPANY_STEPS.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute left-[1.35rem] top-5 hidden h-px sm:block',
                  'w-[calc(100%-1.35rem)]',
                  index < currentStep ? 'bg-primary' : 'bg-slate-200',
                )}
              />
            ) : null}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(index)}
              className={cn(
                'relative z-[1] flex w-full items-start gap-3 rounded-lg px-1 py-1 text-left',
                clickable && !active && 'cursor-pointer hover:opacity-90',
                !clickable && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-background',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : done
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-slate-100 text-slate-500',
                )}
              >
                {done && !active ? <Check className="size-3.5" strokeWidth={2.5} /> : index + 1}
              </span>
              <span className="min-w-0 pt-0.5">
                <span
                  className={cn(
                    'block text-[13px] font-semibold tracking-tight',
                    active ? 'text-slate-900' : 'text-slate-600',
                  )}
                >
                  {step.title}
                </span>
                <span className="mt-0.5 hidden text-[11px] leading-snug text-slate-400 sm:block">
                  {step.description}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function FormField({ label, error, hint, required, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label className="text-[13px] font-medium text-slate-700">
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] leading-relaxed text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormSection({ title, description, children }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {title}
        </p>
        {description ? (
          <p className="text-sm leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
