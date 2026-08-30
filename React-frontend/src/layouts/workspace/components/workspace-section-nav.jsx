import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
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

function ReportsSectionNav({ section, base, pathname }) {
  const allLinks = [
    ...(section.links || []),
    ...(section.groups || []).flatMap((g) => g.links),
  ];
  const bestFull = getBestMatch(pathname, base, allLinks);

  const isGroupActive = (group) => group.links.some((l) => base + l.path === bestFull);

  return (
    <nav
      className="no-print sticky top-[70px] z-40 -mx-5 mb-4 overflow-visible border-b border-border/70 bg-background/95 px-5 backdrop-blur lg:-mx-8 lg:px-8"
      aria-label="Section navigation"
    >
      <div className="flex h-11 items-center gap-2 overflow-visible whitespace-nowrap">
        {section.links.map((link) => {
          const full = base + link.path;
          const active = full === bestFull;
          return (
            <div key={link.path} className="flex shrink-0 items-center gap-2">
              <Link
                to={full}
                className={cn(
                  'section-nav-link inline-flex h-8 items-center border-b-2 px-2.5 text-sm transition-colors',
                  active ? 'is-active' : 'border-transparent text-foreground/80',
                )}
              >
                {link.title}
              </Link>
              {section.groups?.length > 0 ? (
                <Separator orientation="vertical" className="h-4!" />
              ) : null}
            </div>
          );
        })}

        <NavigationMenu viewport={false} className="overflow-visible">
          <NavigationMenuList className="justify-start gap-0">
            {(section.groups || []).map((group) => {
              const groupActive = isGroupActive(group);
              return (
                <NavigationMenuItem key={group.title}>
                  <NavigationMenuTrigger
                    className={cn(
                      'section-nav-link h-8 rounded-none border-b-2 bg-transparent px-2.5 text-sm hover:bg-transparent data-[state=open]:bg-transparent',
                      groupActive ? 'is-active' : 'border-transparent text-foreground/80',
                    )}
                  >
                    {group.title}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="z-[60] min-w-[13rem] rounded-md border border-border bg-popover p-0 shadow-lg">
                    <ul className="flex flex-col gap-0.5 p-1.5">
                      {group.links.map((link) => {
                        const full = base + link.path;
                        const active = full === bestFull;
                        return (
                          <li key={link.path}>
                            <Link
                              to={full}
                              className={cn(
                                'section-nav-dropdown-item block rounded-md px-3 py-2 text-sm no-underline transition-colors',
                                active ? 'is-active' : 'text-foreground hover:bg-muted/60',
                              )}
                            >
                              {link.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>
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

  // Pharmacy workspaces use sidebar navigation — no sticky section bar on report surfaces.
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
