import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { estimateReadMinutes } from '../constants/help-content';
import { pushRecentArticle } from '../lib/help-storage';
import { KnowledgeSectionHeader, knowledgeCardClass } from './knowledge-ui';

function sectionTitle(key, labels) {
  return labels?.[key] || key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function GuideRow({ article, sectionKey, index, sectionLabel, onOpen }) {
  const [open, setOpen] = useState(false);
  const readMin = estimateReadMinutes(article.body);
  const id = `guide-${sectionKey}-${index}`;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      onOpen?.({ id, title: article.title, category: sectionKey, type: 'guide' });
    }
  };

  return (
    <div className={cn('border-b border-border/60 last:border-b-0', open && 'bg-muted/15')}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {sectionLabel}
            </span>
            <span className="text-[11px] text-muted-foreground">{readMin} min read</span>
          </div>
          <p className="text-sm font-medium text-foreground">{article.title}</p>
        </div>
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground mt-2 transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-3.5 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {article.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export function KnowledgeGuides({ guideSections, sectionLabels, onArticleOpen }) {
  const entries = Object.entries(guideSections || {});
  if (entries.length === 0) return null;

  const handleOpen = (article) => {
    pushRecentArticle(article);
    onArticleOpen?.(article);
  };

  return (
    <section id="help-guides" className={knowledgeCardClass}>
      <div className="p-4 sm:p-5 border-b border-border/60">
        <KnowledgeSectionHeader
          title="Guides & how-tos"
          description="Step-by-step workflows for common tasks"
        />
      </div>
      <div>
        {entries.map(([key, articles]) =>
          (articles || []).map((article, idx) => (
            <GuideRow
              key={`${key}-${idx}`}
              article={article}
              sectionKey={key}
              index={idx}
              sectionLabel={sectionTitle(key, sectionLabels)}
              onOpen={handleOpen}
            />
          )),
        )}
      </div>
    </section>
  );
}
