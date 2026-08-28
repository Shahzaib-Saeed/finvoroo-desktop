import { useEffect, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GETTING_STARTED_ITEMS } from '../constants/help-content';
import { loadOnboardingProgress, markOnboardingComplete } from '../lib/help-storage';
import { KnowledgeSectionHeader, knowledgeCardClass } from './knowledge-ui';

export function KnowledgeGettingStarted({ onAction }) {
  const [done, setDone] = useState({});

  useEffect(() => {
    setDone(loadOnboardingProgress());
  }, []);

  const toggle = (item) => {
    if (item.action) {
      onAction?.(item);
      if (item.action !== 'shortcuts') {
        const next = markOnboardingComplete(item.id);
        setDone(next);
      }
      return;
    }
    onAction?.(item);
    const next = markOnboardingComplete(item.id);
    setDone(next);
  };

  return (
    <section className={knowledgeCardClass}>
      <div className="p-4 sm:p-5">
        <KnowledgeSectionHeader
          title="Getting started"
          description="Onboarding checklist for new workspace users"
        />
        <ul className="space-y-1">
          {GETTING_STARTED_ITEMS.map((item) => {
            const complete = Boolean(done[item.id]);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/30',
                  )}
                >
                  {complete ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium', complete && 'text-muted-foreground')}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
