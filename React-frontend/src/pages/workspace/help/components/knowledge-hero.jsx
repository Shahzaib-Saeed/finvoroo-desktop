import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { POPULAR_SEARCHES } from '../constants/help-content';
import { KnowledgeKbd } from './knowledge-ui';

export function KnowledgeHero({
  search,
  onSearchChange,
  onClear,
  hasFilters,
  onPopularSearch,
  accountOwner,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section className="col-span-12 space-y-6 pb-2">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Knowledge Center
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          {accountOwner
            ? 'Guides, FAQs, and onboarding for your account and company workspaces.'
            : 'Find answers, guides, and shortcuts for every module in your workspace.'}
        </p>
      </div>

      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          id="knowledgeSearchInput"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search articles, features, shortcuts, reports…"
          autoComplete="off"
          className="h-12 sm:h-14 pl-12 pr-28 text-base rounded-xl border-border/80 bg-background shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-visible:ring-primary/20"
          aria-label="Search knowledge center"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {hasFilters ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onClear}>
              <X className="size-4" />
            </Button>
          ) : null}
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <KnowledgeKbd>Ctrl</KnowledgeKbd>
            <span>+</span>
            <KnowledgeKbd>K</KnowledgeKbd>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {POPULAR_SEARCHES.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onPopularSearch(item)}
            className={cn(
              'inline-flex items-center rounded-full border border-border/80 bg-muted/20 px-3 py-1.5',
              'text-xs font-medium text-foreground transition-colors',
              'hover:bg-muted/50 hover:border-border',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
