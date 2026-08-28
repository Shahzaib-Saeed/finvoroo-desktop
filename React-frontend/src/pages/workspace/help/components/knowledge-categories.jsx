import {
  Banknote,
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Monitor,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KNOWLEDGE_CATEGORIES, countCategoryArticles } from '../constants/help-content';
import { knowledgeCardClass, knowledgeCardHoverClass } from './knowledge-ui';

const CATEGORY_ICONS = {
  sales: FileText,
  banking: CreditCard,
  purchases: ShoppingCart,
  inventory: Boxes,
  accounting: BarChart3,
  'banking-module': Banknote,
  tax: Receipt,
  permissions: Shield,
  settings: Settings,
  pos: Monitor,
};

export function KnowledgeCategories({
  faqs,
  guideSections,
  activeKnowledgeId,
  onCategorySelect,
}) {
  return (
    <section className="col-span-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {KNOWLEDGE_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id] || FileText;
          const count = countCategoryArticles(cat.id, faqs, guideSections);
          const active = activeKnowledgeId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategorySelect(cat.faqCategory, cat.topic, cat.id)}
              className={cn(
                knowledgeCardClass,
                knowledgeCardHoverClass,
                'text-left p-4 sm:p-5 group',
                active && 'border-primary/40 ring-1 ring-primary/15 bg-primary/[0.02]',
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span
                  className={cn(
                    'flex size-10 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground',
                    'group-hover:border-primary/20 group-hover:bg-primary/5 group-hover:text-primary transition-colors',
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground pt-1">
                  {count} {count === 1 ? 'article' : 'articles'}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{cat.label}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                {cat.description}
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-3">Updated recently</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
