import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_THEMES = {
  accounting: {
    badge: 'bg-blue-500 text-white',
    cta: 'text-blue-600 group-hover:text-blue-700',
  },
  sales: {
    badge: 'bg-violet-500 text-white',
    cta: 'text-violet-600 group-hover:text-violet-700',
  },
  purchasing: {
    badge: 'bg-teal-500 text-white',
    cta: 'text-teal-600 group-hover:text-teal-700',
  },
  inventory: {
    badge: 'bg-orange-500 text-white',
    cta: 'text-orange-600 group-hover:text-orange-700',
  },
};

const THEME_ORDER = ['accounting', 'sales', 'purchasing', 'inventory'];

export function TemplatePreviewCard({ template, onUse, index = 0, className }) {
  const Icon = template.icon;
  const themeKey = template.category || THEME_ORDER[index % THEME_ORDER.length];
  const theme = ICON_THEMES[themeKey] || ICON_THEMES.accounting;

  return (
    <button
      type="button"
      onClick={() => onUse?.(template)}
      className={cn(
        'group flex min-h-[185px] h-full flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 text-left',
        'shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
        className,
      )}
    >
      <div>
        <div
          className={cn(
            'flex size-11 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105',
            theme.badge,
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
        <p className="mt-3.5 text-sm font-semibold text-slate-900">{template.label}</p>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
          {template.description}
        </p>
      </div>
      <span
        className={cn(
          'mt-4 inline-flex items-center gap-1 text-sm font-medium transition-colors',
          theme.cta,
        )}
      >
        Use Template
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
