import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  Landmark,
  LineChart,
  Package,
  Pill,
  Search,
  Settings,
  ShoppingCart,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  filterMegaMenuColumns,
  isMegaLinkActive,
} from '@/config/workspace-mega-menu';
import { getWorkspaceNav, resolveIndustryFeatures } from '@/industries';
import { isPharmacyNavPath } from '@/lib/industry-accent';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthStore } from '@/store/authStore';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sheet, SheetBody, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const SECTION_META = {
  core: { icon: Settings, tone: 'text-slate-500' },
  setup: { icon: Wrench, tone: 'text-amber-600' },
  sales: { icon: LineChart, tone: 'text-emerald-600' },
  people: { icon: Users, tone: 'text-violet-600' },
  purchasing: { icon: ShoppingCart, tone: 'text-orange-600' },
  inventory: { icon: Package, tone: 'text-teal-600' },
  banking: { icon: Landmark, tone: 'text-sky-700' },
  reports: { icon: BarChart3, tone: 'text-indigo-600' },
  pharmacy: { icon: Pill, tone: 'text-emerald-600' },
};

function isMacPlatform() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
}

function shortcutLabel(shortcut) {
  if (shortcut !== 'mod+n') return null;
  return isMacPlatform() ? '⌘N' : 'Ctrl+N';
}

function filterColumnsByQuery(columns, query) {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return columns;

  return columns
    .map((column) => ({
      ...column,
      sections: (column.sections || [])
        .map((section) => ({
          ...section,
          links: (section.links || []).filter((link) =>
            String(link.title || '').toLowerCase().includes(term),
          ),
        }))
        .filter((section) => section.links.length > 0),
    }))
    .filter((column) => column.sections.length > 0);
}

function findCreateInvoicePath(columns) {
  for (const column of columns || []) {
    for (const section of column.sections || []) {
      const match = (section.links || []).find((link) => link.shortcut === 'mod+n');
      if (match?.path) return match.path;
    }
  }
  return null;
}

function Keycap({ children, className }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-slate-200 bg-white px-1 font-sans text-[10px] font-semibold tracking-wide text-slate-500',
        className,
      )}
    >
      {children}
    </span>
  );
}

function MenuLink({ link, pathname, search, onNavigate }) {
  const active = isMegaLinkActive(pathname, link.path, search);
  const shortcut = shortcutLabel(link.shortcut);
  const isAction = link.highlight === 'action' && !active;
  const pharmacyLink = isPharmacyNavPath(link.path);

  return (
    <li>
      <Link
        to={link.path}
        onClick={onNavigate}
        className={cn(
          'group flex items-center gap-2 rounded-md px-2.5 py-[7px] text-[13px] leading-snug transition-colors',
          pharmacyLink && 'mega-menu-link--pharmacy',
          active && 'is-active',
          active
            ? pharmacyLink
              ? 'bg-emerald-600 font-medium text-white shadow-sm'
              : 'bg-primary font-medium text-white shadow-sm'
            : isAction
              ? 'bg-sky-50 font-medium text-sky-800 hover:bg-sky-100'
              : pharmacyLink
                ? 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-950'
                : 'text-slate-700 hover:bg-sky-50 hover:text-slate-900',
          link.emphasis && !active && 'font-semibold text-slate-900',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{link.title}</span>
        {shortcut && !active ? (
          <Keycap className={cn(isAction && 'border-sky-200 bg-white text-sky-700')}>
            {shortcut}
          </Keycap>
        ) : null}
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 transition-all',
            active
              ? 'text-white opacity-90'
              : 'opacity-0 group-hover:translate-x-0.5 group-hover:opacity-50',
          )}
        />
      </Link>
    </li>
  );
}

function MenuSection({ section, pathname, search, onNavigate }) {
  if (!section.links?.length) return null;
  const meta = SECTION_META[section.id] || SECTION_META.core;
  const Icon = meta.icon;

  return (
    <section className="min-w-0">
      <h3 className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        <Icon className={cn('size-3.5', meta.tone)} aria-hidden />
        {section.title}
      </h3>
      <ul className="space-y-0.5">
        {section.links.map((link) => (
          <MenuLink
            key={link.path}
            link={link}
            pathname={pathname}
            search={search}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </section>
  );
}

function QuickLinksSearch({ query, onQueryChange, inputRef, className }) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Type to filter links..."
        className="h-10 w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-14 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        autoComplete="off"
        spellCheck={false}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        <Keycap>ESC</Keycap>
      </span>
    </div>
  );
}

function QuickLinksHeader({
  compact = false,
  query,
  onQueryChange,
  searchRef,
  onClose,
  showSearch = true,
}) {
  return (
    <div
      className={cn(
        'flex gap-4 border-b border-slate-100 bg-white',
        compact ? 'flex-col px-4 py-3.5' : 'items-center justify-between px-5 py-4 sm:px-6',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <Zap className="size-5 fill-white" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight tracking-tight text-slate-900">
            Quick Links
          </p>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Jump to any workspace page or trigger primary workflows.
          </p>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            size="sm"
            className="size-8 shrink-0"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      {showSearch ? (
        <QuickLinksSearch
          query={query}
          onQueryChange={onQueryChange}
          inputRef={searchRef}
          className={cn(compact ? 'w-full' : 'w-full max-w-sm shrink-0')}
        />
      ) : null}
    </div>
  );
}

function QuickLinksFooter({ hasQuery }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-2.5 text-[12px] text-slate-500 sm:px-6">
      <p className="flex items-center gap-2">
        <span className="inline-flex items-center rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          Tip
        </span>
        Type a keyword above to filter links in real-time.
      </p>
      <p className="flex items-center gap-1.5">
        Press <Keycap>ESC</Keycap> to {hasQuery ? 'clear search' : 'close'}.
      </p>
    </div>
  );
}

function WorkspaceMegaMenuPanel({
  columns,
  pathname,
  search,
  onNavigate,
  className,
  query,
  onQueryChange,
  searchRef,
  compactHeader = false,
  onClose,
}) {
  const visibleColumns = useMemo(
    () => filterColumnsByQuery(columns, query),
    [columns, query],
  );
  const hasMatches = visibleColumns.some((column) => column.sections.length > 0);

  return (
    <div className={cn('flex flex-col bg-white', className)}>
      <QuickLinksHeader
        compact={compactHeader}
        query={query}
        onQueryChange={onQueryChange}
        searchRef={searchRef}
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
        {hasMatches ? (
          <div
            className={cn(
              'grid items-start gap-x-6 gap-y-7',
              compactHeader ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-4',
            )}
          >
            {visibleColumns.map((column, index) => (
              <div key={index} className="flex min-w-0 flex-col gap-6">
                {column.sections.map((section) => (
                  <MenuSection
                    key={section.id || section.title}
                    section={section}
                    pathname={pathname}
                    search={search}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-2 py-10 text-center text-sm text-slate-500">
            No links match “{query.trim()}”.
          </p>
        )}
      </div>

      <QuickLinksFooter hasQuery={Boolean(query?.trim())} />
    </div>
  );
}

function SettingsTriggerButton({ open, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          mode="icon"
          shape="circle"
          className={cn(
            'size-9 hover:bg-primary/10 hover:[&_svg]:text-primary',
            open && 'bg-primary/10 [&_svg]:text-primary',
          )}
          aria-label="Quick links"
          aria-expanded={open}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <Zap className="size-4.5!" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Quick links</TooltipContent>
    </Tooltip>
  );
}

export function WorkspaceMegaMenu() {
  const { id: companyId } = useParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  const closeTimerRef = useRef(null);
  const permissions = useAuthStore((s) => s.permissions);
  const isFullAccess = useAuthStore((s) => s.isFullAccess);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const industryFeatures = useMemo(
    () => resolveIndustryFeatures(activeCompany),
    [activeCompany],
  );

  const sourceColumns = useMemo(() => {
    if (!companyId) return [];
    const { getMegaMenuColumns } = getWorkspaceNav(activeCompany);
    const allColumns = getMegaMenuColumns(companyId);
    const canFn = (slug) => isFullAccess || permissions.includes(slug);
    return filterMegaMenuColumns(allColumns, canFn, industryFeatures);
  }, [companyId, permissions, isFullAccess, activeCompany, industryFeatures]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 220);
  }, [clearCloseTimer]);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      clearCloseTimer();
      setOpen(nextOpen);
      if (!nextOpen) setQuery('');
    },
    [clearCloseTimer],
  );

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (query) {
          event.preventDefault();
          event.stopPropagation();
          setQuery('');
          searchRef.current?.focus();
          return;
        }
        setOpen(false);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        const createPath = findCreateInvoicePath(sourceColumns);
        if (!createPath) return;
        event.preventDefault();
        navigate(createPath);
        setOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [navigate, open, query, sourceColumns]);

  if (!sourceColumns.length) return null;

  const panelProps = {
    columns: sourceColumns,
    pathname,
    search,
    query,
    onQueryChange: setQuery,
    searchRef,
  };

  if (isMobile) {
    return (
      <>
        <SettingsTriggerButton open={open} onClick={() => setOpen(true)} />
        <Sheet
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setQuery('');
          }}
        >
          <SheetContent
            side="bottom"
            close={false}
            className="flex max-h-[92vh] flex-col gap-0 rounded-t-2xl border-t p-0 [&_[data-slot=sheet-close]]:hidden"
          >
            <SheetBody className="min-h-0 overflow-hidden p-0">
              <WorkspaceMegaMenuPanel
                {...panelProps}
                compactHeader
                onClose={() => {
                  setOpen(false);
                  setQuery('');
                }}
                onNavigate={() => {
                  setOpen(false);
                  setQuery('');
                }}
                className="h-full max-h-[92vh]"
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: 'ghost', mode: 'icon', shape: 'circle' }),
                'size-9 hover:bg-primary/10 hover:[&_svg]:text-primary',
                open && 'bg-primary/10 [&_svg]:text-primary',
              )}
              aria-label="Quick links"
              aria-expanded={open}
              onMouseEnter={openMenu}
              onMouseLeave={scheduleClose}
            >
              <Zap className="size-4.5!" aria-hidden />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Quick links</TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={10}
        collisionPadding={16}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className={cn(
          'z-[200] w-[min(1120px,calc(100vw-1.5rem))] p-0',
          'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10',
        )}
      >
        <WorkspaceMegaMenuPanel
          {...panelProps}
          onNavigate={() => {
            setOpen(false);
            setQuery('');
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
