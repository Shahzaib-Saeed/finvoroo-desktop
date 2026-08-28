import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PRODUCT_FORM_STEPS = [
  {
    id: 'basics',
    label: 'Basics',
    hint: 'Name, identifiers, category, and optional photo.',
  },
  {
    id: 'units',
    label: 'Units & pricing',
    hint: 'Stock unit, pack sizes, and prices.',
  },
  {
    id: 'accounts',
    label: 'Accounts & notes',
    hint: 'GL accounts and optional details.',
  },
];

export function ProductFormStepper({ steps = PRODUCT_FORM_STEPS, currentStep, onStepClick }) {
  const active = steps[currentStep];

  return (
    <nav aria-label="Product form progress" className="px-5 py-3.5 border-b shrink-0">
      <ol className="flex items-center gap-2">
        {steps.map((s, index) => {
          const done = index < currentStep;
          const isActive = index === currentStep;
          const clickable = onStepClick && (done || isActive);

          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
              {index > 0 ? (
                <span
                  className={cn('hidden sm:block h-px w-6 shrink-0', done ? 'bg-primary/40' : 'bg-border')}
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick(index)}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-full py-1 pr-3 pl-1 transition-colors',
                  isActive && 'bg-primary/10',
                  clickable && !isActive && 'hover:bg-muted/60',
                  !clickable && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    (done || isActive) && 'bg-primary text-primary-foreground',
                    !done && !isActive && 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'truncate text-sm font-medium hidden sm:inline',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {active?.hint ? (
        <p className="mt-2 text-[13px] text-muted-foreground leading-snug">{active.hint}</p>
      ) : null}
    </nav>
  );
}

/** @deprecated use stepper hint line instead */
export function ProductFormStepIntro() {
  return null;
}
