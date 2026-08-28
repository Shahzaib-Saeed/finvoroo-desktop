import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FAQ_CATEGORIES, estimateReadMinutes } from '../constants/help-content';
import { pushRecentArticle } from '../lib/help-storage';
import { KnowledgeEmptyState, KnowledgeSectionHeader, knowledgeCardClass } from './knowledge-ui';

function categoryLabel(id) {
  return FAQ_CATEGORIES.find((c) => c.id === id)?.label || id;
}

function FaqRow({ faq, index, activeCategory, onOpen }) {
  const [open, setOpen] = useState(false);
  const readMin = estimateReadMinutes(`${faq.q} ${faq.a}`);
  const id = `faq-${faq.category}-${index}`;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      onOpen?.({
        id,
        title: faq.q,
        category: faq.category,
        type: 'faq',
      });
    }
  };

  return (
    <div
      className={cn(
        'border-b border-border/60 last:border-b-0',
        open && 'bg-muted/15',
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 sm:px-5 py-4 text-left transition-colors hover:bg-muted/20"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {activeCategory === 'all' && faq.category ? (
              <Badge variant="outline" className="h-5 text-[10px] font-medium">
                {categoryLabel(faq.category)}
              </Badge>
            ) : null}
            <span className="text-[11px] text-muted-foreground tabular-nums">{readMin} min read</span>
            <span className="text-[11px] text-muted-foreground">· Updated recently</span>
          </div>
          <p className="text-sm font-medium text-foreground leading-snug pr-2">{faq.q}</p>
        </div>
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground mt-1 transition-transform duration-200',
            open && 'rotate-90 text-foreground',
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
          <div className="px-4 sm:px-5 pb-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {faq.a}
          </div>
        </div>
      </div>
    </div>
  );
}

export function KnowledgeFaqList({
  faqs,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onArticleOpen,
}) {
  const categoriesWithFaqs = FAQ_CATEGORIES.filter(
    (cat) => cat.id === 'all' || faqs.some((faq) => faq.category === cat.id),
  );

  const handleOpen = (article) => {
    pushRecentArticle(article);
    onArticleOpen?.(article);
  };

  return (
    <section className={knowledgeCardClass}>
      <div className="p-4 sm:p-5 border-b border-border/60">
        <KnowledgeSectionHeader
          title="Frequently asked questions"
          description={
            searchQuery
              ? `${faqs.length} result${faqs.length === 1 ? '' : 's'} for your search`
              : 'Clear answers to common workspace questions'
          }
          action={
            <Badge variant="secondary" className="h-6 text-[11px] font-medium">
              {faqs.length} articles
            </Badge>
          }
        />
        <div className="flex flex-wrap gap-2">
          {categoriesWithFaqs.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activeCategory === cat.id
                  ? 'bg-foreground text-background'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {faqs.length === 0 ? (
        <div className="p-5">
          <KnowledgeEmptyState
            title="No articles match your search"
            description="Try a different keyword, pick a category above, or use a popular search chip."
          />
        </div>
      ) : (
        <div>
          {faqs.map((faq, i) => (
            <FaqRow
              key={`${faq.q}-${i}`}
              faq={faq}
              index={i}
              activeCategory={activeCategory}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}
    </section>
  );
}
