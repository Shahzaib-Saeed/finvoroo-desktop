import { useEffect, useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadRecentArticles } from '../lib/help-storage';
import { KnowledgeEmptyState, KnowledgeSectionHeader, knowledgeCardClass } from './knowledge-ui';

export function KnowledgeRecent({ refreshKey = 0 }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(loadRecentArticles());
  }, [refreshKey]);

  return (
    <section className={knowledgeCardClass}>
      <div className="p-4 sm:p-5">
        <KnowledgeSectionHeader
          title="Recently viewed"
          description="Articles you opened in this browser"
        />
        {items.length === 0 ? (
          <KnowledgeEmptyState
            title="No recent articles yet"
            description="Open an FAQ or guide to build your reading history."
            className="py-6"
          />
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/30 transition-colors"
              >
                <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="size-3" />
                    {item.type === 'guide' ? 'Guide' : 'FAQ'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
