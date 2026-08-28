import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileText, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { mapWorkspaceSearchUrl } from '@/lib/map-workspace-search-url';
import { isInternalGlRef } from '@/pages/accounting/reports/report-reference';

const MIN_LEN = 2;
const DEBOUNCE_MS = 320;

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function WorkspaceSearchBar({ className, compact = false }) {
  const { id: companyId } = useParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const topRef = useRef(null);

  const openSearch = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openSearch]);

  const dialog = (
    <WorkspaceSearchDialog
      open={open}
      onOpenChange={setOpen}
      query={query}
      onQueryChange={setQuery}
      companyId={companyId}
    />
  );

  if (compact) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              mode="icon"
              shape="circle"
              className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
              onClick={openSearch}
              aria-label="Search workspace"
            >
              <Search className="size-4.5!" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Search (⌘K)</TooltipContent>
        </Tooltip>
        {dialog}
      </>
    );
  }

  return (
    <>
      <div className={cn('relative block w-full', className)}>
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={topRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={openSearch}
          onClick={openSearch}
          placeholder="Search invoices, customers, products…"
          className="ps-9 pe-16 text-sm bg-muted/40 border-border/70 focus-visible:bg-background"
          aria-label="Search workspace"
          title="Search (Ctrl+K)"
        />
        <kbd className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>
      {dialog}
    </>
  );
}

function WorkspaceSearchDialog({ open, onOpenChange, query, onQueryChange, companyId }) {
  const navigate = useNavigate();
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [status, setStatus] = useState('');
  const abortRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const q = debouncedQuery.trim();
    if (q.length < MIN_LEN) {
      setGroups([]);
      setStatus('');
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    api
      .get('/workspace/search', { params: { q }, signal: controller.signal })
      .then((res) => {
        const payload = res.data?.data ?? res.data ?? {};
        const rawGroups = payload.groups ?? [];
        const filteredGroups = rawGroups
          .map((group) => ({
            ...group,
            items: (group.items ?? []).filter(
              (item) => !isInternalGlRef(item?.title) && !isInternalGlRef(item?.subtitle),
            ),
          }))
          .filter((group) => (group.items?.length ?? 0) > 0);
        setGroups(filteredGroups);
        const total = filteredGroups.reduce((n, g) => n + (g.items?.length ?? 0), 0);
        setStatus(total ? `${total} result${total === 1 ? '' : 's'}` : '');
      })
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        setGroups([]);
        setStatus('Search unavailable');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedQuery, open]);

  useEffect(() => {
    if (open) return;
    setGroups([]);
    setStatus('');
  }, [open]);

  const handleNavigate = (url) => {
    const path = mapWorkspaceSearchUrl(url, companyId);
    onOpenChange(false);
    navigate(path);
  };

  const hint =
    debouncedQuery.trim().length >= MIN_LEN
      ? 'No matches. Try another keyword or reference.'
      : 'Type at least 2 characters to search.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden" variant="default">
        <DialogHeader className="px-5 pt-5 pb-3 mb-0 border-b border-border bg-muted/30">
          <DialogTitle className="text-base">Search workspace</DialogTitle>
          <div className="relative mt-3">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Invoices, customers, products, pages…"
              className="ps-9 h-10"
            />
          </div>
          {status && !loading && (
            <p className="text-xs text-muted-foreground mt-2 mb-0 text-start">{status}</p>
          )}
        </DialogHeader>
        <DialogBody className="p-0 mb-0">
          <ScrollArea className="h-[min(60vh,420px)]">
            <div className="p-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin mb-2" />
                  <p className="text-sm">Searching…</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Search className="size-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">{hint}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div key={group.id || group.label}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1.5">
                        {group.label}
                      </p>
                      <ul className="space-y-0.5 list-none m-0 p-0">
                        {group.items?.map((item, idx) => (
                          <li key={`${group.id}-${idx}`}>
                            <button
                              type="button"
                              onClick={() => handleNavigate(item.url)}
                              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-start hover:bg-accent transition-colors group"
                            >
                              <span className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <FileText className="size-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-foreground block truncate">
                                  {item.title}
                                </span>
                                {item.subtitle && (
                                  <span className="text-xs text-muted-foreground block truncate">
                                    {item.subtitle}
                                  </span>
                                )}
                              </span>
                              <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
