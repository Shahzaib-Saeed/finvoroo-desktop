import { useCallback, useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSettings } from "@/providers/settings-provider";
import { useAuthStore } from "@/store/authStore";
import { filterMenuByPermission } from "@/config/filter-menu-by-permission";
import { getWorkspaceNav, resolveIndustryFeatures } from "@/industries";
import { toAbsoluteUrl } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import {
  AccordionMenu,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from "@/components/ui/accordion-menu";
import { ChevronFirst, HelpCircle, LogOut } from "lucide-react";

function r(path, companyId) {
  return path ? path.replace(":id", companyId) : path;
}

function collectAllPaths(items, companyId, out = []) {
  for (const item of items) {
    if (item.path) out.push(r(item.path, companyId));
    if (item.children?.length) collectAllPaths(item.children, companyId, out);
  }
  return out;
}

export function WorkspaceSidebarMenu({ collapsed, companyId }) {
  const { pathname } = useLocation();
  const permissions = useAuthStore((s) => s.permissions);
  const isFullAccess = useAuthStore((s) => s.isFullAccess);

  const activeCompany = useAuthStore((s) => s.activeCompany);
  const features = useMemo(
    () => resolveIndustryFeatures(activeCompany),
    [activeCompany],
  );

  const menu = useMemo(() => {
    const canFn = (slug) => isFullAccess || permissions.includes(slug);
    const { sidebar } = getWorkspaceNav(activeCompany);
    return filterMenuByPermission(sidebar, canFn, features);
  }, [permissions, isFullAccess, activeCompany, features]);

  const bestMatch = useMemo(() => {
    const all = collectAllPaths(menu, companyId);
    let best = "";
    for (const p of all) {
      if (!p) continue;
      if (pathname === p || (p.length > 1 && pathname.startsWith(p + "/"))) {
        if (p.length > best.length) best = p;
      }
    }
    return best;
  }, [pathname, companyId, menu]);

  const matchPath = useCallback(
    (path) => {
      if (!path) return false;
      const resolved = r(path, companyId);
      if (resolved === `/workspace/${companyId}`) return pathname === resolved;
      return resolved === bestMatch;
    },
    [pathname, companyId, bestMatch],
  );

  const classNames = {
    root: "lg:ps-1 space-y-3",
    group: "gap-px",
    label:
      "uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px",
    item: "h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium",
    subTrigger:
      "h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium",
    subContent: "py-0",
  };

  const buildMenu = (items) =>
    items.map((item, i) => {
      if (item.heading) {
        if (collapsed) return null;
        return <AccordionMenuLabel key={i}>{item.heading}</AccordionMenuLabel>;
      }
      if (item.children) {
        const resolvedParent = r(item.path, companyId);
        return (
          <AccordionMenuSub key={i} value={resolvedParent || `root-${i}`}>
            <AccordionMenuSubTrigger
              className="text-sm font-medium"
              data-industry-zone={item.industryZone || undefined}
            >
              {item.icon && <item.icon data-slot="accordion-menu-icon" />}
              <span
                data-slot="accordion-menu-title"
                className={cn(collapsed && "hidden")}
              >
                {item.title}
              </span>
            </AccordionMenuSubTrigger>
            {!collapsed && (
              <AccordionMenuSubContent
                type="single"
                collapsible
                parentValue={resolvedParent || `root-${i}`}
                className="ps-6"
              >
                <AccordionMenuGroup>
                  {item.children.map((child, j) => {
                    const resolvedChild = r(child.path, companyId);
                    return (
                      <AccordionMenuItem
                        key={j}
                        value={resolvedChild || ""}
                        className="text-[13px]"
                      >
                        <Link to={resolvedChild || "#"}>{child.title}</Link>
                      </AccordionMenuItem>
                    );
                  })}
                </AccordionMenuGroup>
              </AccordionMenuSubContent>
            )}
          </AccordionMenuSub>
        );
      }
      const resolved = r(item.path, companyId);
      return (
        <AccordionMenuItem
          key={i}
          value={resolved || ""}
          className="text-sm font-medium"
          data-industry-zone={item.industryZone || undefined}
        >
          <Link
            to={resolved || "#"}
            className="flex items-center justify-start grow gap-2"
          >
            {item.icon && <item.icon data-slot="accordion-menu-icon" />}
            <span
              data-slot="accordion-menu-title"
              className={cn(collapsed && "hidden")}
            >
              {item.title}
            </span>
          </Link>
        </AccordionMenuItem>
      );
    });

  return (
    <div className="kt-scrollable-y-hover flex grow shrink-0 py-5 px-5 lg:max-h-[calc(100vh-5.5rem)]">
      <AccordionMenu
        selectedValue={bestMatch}
        matchPath={matchPath}
        type="single"
        collapsible
        classNames={classNames}
      >
        {buildMenu(menu)}
      </AccordionMenu>
    </div>
  );
}

export function WorkspaceSidebar({ companyName }) {
  const { id: companyId } = useParams();
  const { settings, storeOption } = useSettings();
  const logout = useAuthStore((state) => state.logout);
  const collapsed = settings.layouts.demo1.sidebarCollapse;

  const handleLogout = async () => {
    await logout();
    window.location.assign("/auth/signin");
  };

  return (
    <div
      className={cn(
        "sidebar group/sidebar bg-background lg:border-e lg:border-border lg:fixed lg:top-0 lg:bottom-0 lg:z-20 lg:flex flex-col items-stretch shrink-0 transition-[width] duration-300 ease-in-out",
        collapsed ? "w-20" : "w-[240px]",
      )}
    >
      {/* Header */}
      <div
        className="sidebar-header hidden lg:flex items-center relative justify-between px-3 lg:px-5 shrink-0"
        style={{ height: "70px" }}
      >
        <Link to="/" className="flex items-center gap-2 overflow-hidden">
          <img
            src={toAbsoluteUrl("/media/app/finvoroo.svg")}
            className="h-10 max-w-none shrink-0"
            alt="Logo"
          />
          <span
            className={cn(
              "text-primary font-bold text-base leading-none whitespace-nowrap transition-all duration-300 overflow-hidden",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            {companyName || "Workspace"}
          </span>
        </Link>
        <Button
          onClick={() =>
            storeOption("layouts.demo1.sidebarCollapse", !collapsed)
          }
          size="sm"
          mode="icon"
          variant="outline"
          className={cn(
            "size-7 absolute start-full top-2/4 -translate-x-2/4 -translate-y-2/4",
            collapsed ? "rotate-180" : "",
          )}
        >
          <ChevronFirst className="size-4!" />
        </Button>
      </div>

      {/* Menu */}
      <div className="overflow-hidden grow">
        <div className={cn(collapsed ? "w-20" : "w-[240px]")}>
          <WorkspaceSidebarMenu collapsed={collapsed} companyId={companyId} />
        </div>
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-border p-3 space-y-2",
          collapsed && "px-2",
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800",
            collapsed && "justify-center px-0",
          )}
          asChild
        >
          <Link to={`/workspace/${companyId}/help`}>
            <HelpCircle className="size-4" />
            <span className={cn(collapsed && "hidden")}>Help & Support</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 text-slate-500 transition-colors hover:bg-red-50/80 hover:text-red-600",
            collapsed && "justify-center px-0",
          )}
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          <span className={cn(collapsed && "hidden")}>Logout</span>
        </Button>
      </div>
    </div>
  );
}
