import { Link, useParams } from "react-router-dom";
import { Bell, CircleHelp, LayoutDashboard } from "lucide-react";
import { toAbsoluteUrl } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { useScrollPosition } from "@/hooks/use-scroll-position";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { UserAvatarFace } from "@/components/common/user-avatar-face";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorkspaceBreadcrumb } from "./workspace-breadcrumb";
import { WorkspaceMegaMenu } from "./workspace-mega-menu";
import { WorkspaceMobileSidebar } from "./workspace-mobile-sidebar";
import { WorkspaceNotificationsSheet } from "./workspace-notifications-sheet";
import { WorkspaceUserDropdown } from "./workspace-user-dropdown";
import { WorkspaceSearchBar } from "./workspace-search";
import { WorkspaceCompanySwitcher } from "./workspace-company-switcher";

const iconBtnClass =
  "size-9 shrink-0 hover:bg-primary/10 hover:[&_svg]:text-primary";

function HeaderIconTooltip({ label, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Workspace top bar — breadcrumb (left), search (center on md+), company + actions (right).
 */
export function WorkspaceHeader({ sidebarWidth, isMobile, companyName }) {
  const { id: companyId } = useParams();
  const scrollPosition = useScrollPosition();
  const sticky = scrollPosition > 0;
  const { user } = useAuthStore();
  const isCompanyOwner = (user?.role ?? "") === "company_owner";

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex shrink-0 items-stretch overflow-visible border-b bg-background pe-[var(--removed-body-scroll-bar-size,0px)] transition-[inset-inline-start,border-color] duration-300 ease-in-out",
        sticky ? "border-border" : "border-transparent",
      )}
      style={
        !isMobile && sidebarWidth
          ? { insetInlineStart: sidebarWidth }
          : { insetInlineStart: 0 }
      }
    >
      <div className="flex h-[70px] w-full items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
        {/* Left — navigation context */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
          {isMobile ? (
            <>
              <WorkspaceMobileSidebar companyName={companyName} />
              <HeaderIconTooltip label="Workspace home">
                <Link
                  to={`/workspace/${companyId}`}
                  className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={toAbsoluteUrl("/media/app/finvoroo.svg")}
                    className="size-7"
                    alt="Home"
                  />
                </Link>
              </HeaderIconTooltip>
            </>
          ) : (
            <WorkspaceBreadcrumb className="min-w-0" />
          )}
        </div>

        {/* Center — search (desktop) */}
        {!isMobile ? (
          <div className="hidden min-w-0 flex-1 justify-center md:flex md:max-w-md lg:max-w-lg xl:max-w-xl">
            <WorkspaceSearchBar className="w-full" />
          </div>
        ) : null}

        {/* Right — company, shortcuts, utilities */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {isMobile ? (
            <WorkspaceSearchBar compact />
          ) : (
            <div className="flex md:hidden">
              <WorkspaceSearchBar compact />
            </div>
          )}

          <WorkspaceCompanySwitcher companyName={companyName} />

          <div
            className="mx-0.5 hidden h-6 w-px shrink-0 bg-border sm:block"
            aria-hidden
          />

          {isCompanyOwner ? (
            <HeaderIconTooltip label="Account dashboard">
              <Button
                variant="ghost"
                mode="icon"
                shape="circle"
                className={cn(iconBtnClass, "hidden md:inline-flex")}
                asChild
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="size-4.5!" />
                  <span className="sr-only">Account dashboard</span>
                </Link>
              </Button>
            </HeaderIconTooltip>
          ) : null}

          <div className="flex items-center gap-0.5">
            <HeaderIconTooltip label="Help & support">
              <Button
                variant="ghost"
                mode="icon"
                shape="circle"
                className={cn(iconBtnClass, "hidden sm:inline-flex")}
                asChild
              >
                <Link to={`/workspace/${companyId}/help`}>
                  <CircleHelp className="size-4.5!" />
                  <span className="sr-only">Help & support</span>
                </Link>
              </Button>
            </HeaderIconTooltip>

            <WorkspaceMegaMenu />

            <WorkspaceNotificationsSheet
              trigger={
                <HeaderIconTooltip label="Notifications">
                  <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className={iconBtnClass}
                  >
                    <Bell className="size-4.5!" />
                    <span className="sr-only">Notifications</span>
                  </Button>
                </HeaderIconTooltip>
              }
            />

            <WorkspaceUserDropdown
              trigger={
                <button
                  type="button"
                  className={cn(
                    iconBtnClass,
                    "inline-flex items-center justify-center rounded-full p-0 overflow-hidden",
                  )}
                  aria-label="Account menu"
                >
                  <UserAvatarFace user={user} sizeClass="size-9" textClass="text-xs" />
                  <span className="sr-only">Account menu</span>
                </button>
              }
            />
          </div>
        </div>
      </div>
    </header>
  );
}
