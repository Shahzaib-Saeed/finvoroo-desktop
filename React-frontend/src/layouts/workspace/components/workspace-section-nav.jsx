import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { getWorkspaceNav, resolveIndustryFeatures } from '@/industries';
import { shouldHidePharmacySectionNav } from '@/industries/pharmacy/report-context';

function pickSection(pathname, base, sections) {
  const rel = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  return sections.find((s) => (s.matches || []).some((m) => rel.startsWith(m)));
}

function getBestMatch(pathname, base, links) {
  let bestFull = '';
  for (const link of links) {
    const full = base + link.path;
    if (pathname === full || pathname.startsWith(full + '/')) {
      if (full.length > bestFull.length) bestFull = full;
    }
  }
  return bestFull;
}

function filterLinks(links, canFn, features) {
  return (links ?? []).filter((link) => {
    if (link.feature && !features[link.feature]) return false;
    if (link.permission && !canFn(link.permission)) return false;
    return true;
  });
}

function ReportsHoverMenu({ title, active, children }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };

  useEffect(() => () => cancelClose(), []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        onMouseEnter={() => {
          cancelClose();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        className={cn(
          'section-nav-link inline-flex h-10 shrink-0 items-center gap-1 border-b-2 bg-transparent px-3 text-[13px] outline-none',
          'hover:bg-transparent data-[state=open]:bg-transparent',
          active
            ? 'is-active'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        )}
      >
        {title}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={0}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        className="min-w-52"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReportsSectionNav({ section, base, pathname }) {
  const groups = section.groups || [];
  const topLinks = section.links || [];
  const allLinks = [...topLinks, ...groups.flatMap((g) => g.links)];
  const bestFull = getBestMatch(pathname, base, allLinks);

  const isGroupActive = (group) =>
    group.links.some((l) => {
      const full = base + l.path;
      return full === bestFull || pathname === full || pathname.startsWith(`${full}/`);
    });
  const activeGroupTitle = groups.find((group) => isGroupActive(group))?.title;

  return (
    <nav
      className="no-print sticky top-[70px] z-40 -mx-5 mb-4 border-b border-border/70 bg-background/95 px-5 backdrop-blur lg:-mx-8 lg:px-8"
      aria-label="Reports"
    >
      <div className="flex h-10 items-center gap-0.5 overflow-x-auto whitespace-nowrap scrollbar-none">
        {topLinks.map((link) => {
          const full = base + link.path;
          const active = full === bestFull;
          return (
            <Link
              key={link.path}
              to={full}
              className={cn(
                'section-nav-link inline-flex h-10 shrink-0 items-center border-b-2 px-3 text-[13px] transition-colors',
                active ? 'is-active' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {link.title}
            </Link>
          );
        })}

        {groups.map((group) => (
          <ReportsHoverMenu
            key={group.title}
            title={group.title}
            active={group.title === activeGroupTitle}
          >
            {group.links.map((link) => {
              const full = base + link.path;
              const active = pathname === full || pathname.startsWith(`${full}/`);
              return (
                <DropdownMenuItem key={`${group.title}-${link.path}`} asChild>
                  <Link
                    to={full}
                    className={cn(
                      'section-nav-dropdown-item cursor-pointer',
                      active && 'is-active',
                    )}
                  >
                    {link.title}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </ReportsHoverMenu>
        ))}
      </div>
    </nav>
  );
}

export function WorkspaceSectionNav() {
  const { id: companyId } = useParams();
  const { pathname } = useLocation();
  const permissions = useAuthStore((s) => s.permissions);
  const isFullAccess = useAuthStore((s) => s.isFullAccess);
  const activeCompany = useAuthStore((s) => s.activeCompany);

  const features = useMemo(
    () => resolveIndustryFeatures(activeCompany),
    [activeCompany],
  );

  const sections = useMemo(() => {
    const canFn = (slug) => isFullAccess || permissions.includes(slug);
    const { sectionNav } = getWorkspaceNav(activeCompany);
    return sectionNav
      .filter((section) => !section.feature || features[section.feature])
      .map((section) => ({
        ...section,
        links: filterLinks(section.links, canFn, features),
        groups: section.groups
          ? section.groups
              .map((g) => ({
                ...g,
                links: filterLinks(g.links, canFn, features),
              }))
              .filter((g) => g.links.length > 0)
          : undefined,
      }))
      .filter((section) => (section.links?.length || 0) > 0 || (section.groups?.length || 0) > 0);
  }, [activeCompany, permissions, isFullAccess, features]);

  if (!companyId) return null;

  if (shouldHidePharmacySectionNav(pathname, companyId, features)) return null;

  const base = `/workspace/${companyId}`;
  const section = pickSection(pathname, base, sections);
  if (!section) return null;

  if (section.key === 'reports') {
    return <ReportsSectionNav section={section} base={base} pathname={pathname} />;
  }

  const bestFull = getBestMatch(pathname, base, section.links);

  return (
    <nav
      className="no-print sticky top-[70px] z-[5] -mx-5 mb-4 border-b border-border/70 bg-background/95 px-5 backdrop-blur lg:-mx-8 lg:px-8"
      aria-label="Section navigation"
    >
      <div className="flex h-11 items-center gap-3 overflow-x-auto whitespace-nowrap text-sm">
        {section.links.map((link, i) => {
          const full = base + link.path;
          const active = full === bestFull;
          return (
            <div key={link.path} className="flex items-center gap-3">
              {i > 0 ? <Separator orientation="vertical" className="h-4!" /> : null}
              <Link
                to={full}
                className={cn(
                  'transition-colors hover:text-primary hover:underline hover:underline-offset-4',
                  active
                    ? 'font-semibold text-primary underline underline-offset-4'
                    : 'text-foreground/80',
                )}
              >
                {link.title}
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
