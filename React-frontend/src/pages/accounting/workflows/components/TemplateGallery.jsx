import { ArrowRight, Layers3, Sparkles } from 'lucide-react';
import { LOCAL_STARTER_TEMPLATES, TEMPLATE_CARDS } from '../constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TONE = {
  emerald: 'from-emerald-500/15 to-transparent border-emerald-200/80 dark:border-emerald-900',
  sky: 'from-sky-500/15 to-transparent border-sky-200/80 dark:border-sky-900',
  amber: 'from-amber-500/15 to-transparent border-amber-200/80 dark:border-amber-900',
  violet: 'from-violet-500/15 to-transparent border-violet-200/80 dark:border-violet-900',
  indigo: 'from-indigo-500/15 to-transparent border-indigo-200/80 dark:border-indigo-900',
  zinc: 'from-zinc-500/10 to-transparent border-border',
};

function PreviewChain({ nodes }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
      {(nodes || []).map((node, i) => (
        <div key={`${node}-${i}`} className="flex items-center gap-1.5">
          <span className="rounded-md border bg-background px-2 py-0.5 font-medium">{node}</span>
          {i < nodes.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

export function TemplateGallery({ apiTemplates = [], onUseApiTemplate, onUseLocalTemplate, busyKey }) {
  const apiCards = (apiTemplates || []).map((tpl) => {
    const visual = TEMPLATE_CARDS[tpl.key] || {
      title: tpl.name,
      blurb: tpl.description,
      preview: ['Created', 'Approval', 'Posted'],
      tone: 'zinc',
    };
    return { ...visual, key: tpl.key, api: true, raw: tpl };
  });

  const cards = [...apiCards, ...LOCAL_STARTER_TEMPLATES.map((t) => ({ ...t, api: false }))];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers3 className="size-4" />
        <div>
          <h2 className="text-base font-semibold">Start from a template</h2>
          <p className="text-sm text-muted-foreground">One click — then customize names, rules, and steps.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div
            key={card.key}
            className={cn(
              'rounded-2xl border bg-gradient-to-br p-4 flex flex-col min-h-[190px]',
              TONE[card.tone] || TONE.zinc,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm">{card.title}</div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{card.blurb}</p>
              </div>
              <Sparkles className="size-4 text-muted-foreground shrink-0" />
            </div>
            <PreviewChain nodes={card.preview} />
            <div className="mt-auto pt-4">
              <Button
                type="button"
                variant="mono"
                size="sm"
                className="w-full"
                disabled={busyKey === card.key}
                onClick={() =>
                  card.api ? onUseApiTemplate(card.raw) : onUseLocalTemplate(card)
                }
              >
                Use template
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
