import { useEffect, useState } from "react";
import { StoreClientTopbar } from "@/pages/store-client/components/common/topbar";
import { SearchDialog } from "@/partials/dialogs/search/search-dialog";
import { AppsDropdownMenu } from "@/partials/topbar/apps-dropdown-menu";
import { ChatSheet } from "@/partials/topbar/chat-sheet";
import { NotificationsSheet } from "@/components/notifications/notifications-sheet";
import { UserDropdownMenu } from "@/partials/topbar/user-dropdown-menu";
import {
  Bell,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  MessageCircleMore,
  Search,
  SquareChevronRight,
} from "lucide-react";
import { useLocation } from "react-router";
import { Link } from "react-router-dom";
import { toAbsoluteUrl } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollPosition } from "@/hooks/use-scroll-position";
import { Button } from "@/components/ui/button";
import { UserAvatarFace } from "@/components/common/user-avatar-face";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Container } from "@/components/common/container";
import { useAuthStore } from "@/store/authStore";
import { Breadcrumb } from "./breadcrumb";
import { MegaMenu } from "./mega-menu";
import { MegaMenuMobile } from "./mega-menu-mobile";
import { SidebarMenu } from "./sidebar-menu";

const ACCOUNT_OWNER_PATHS = [
  "/",
  "/dashboard",
  "/profile",
  "/companies",
  "/companies/create",
  "/help",
];

function isAccountOwnerRoute(pathname) {
  return ACCOUNT_OWNER_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function Header({ sidebarWidth, isMobile }) {
  const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);
  const [isMegaMenuSheetOpen, setIsMegaMenuSheetOpen] = useState(false);

  const { pathname } = useLocation();
  const mobileMode = useIsMobile();
  const { user } = useAuthStore();
  const accountOwner = isAccountOwnerRoute(pathname);
  const isCompanyOwner = (user?.role ?? "") === "company_owner";
  const onAccountDashboard = pathname === "/" || pathname === "/dashboard";

  const scrollPosition = useScrollPosition();
  const headerSticky = scrollPosition > 0;

  // Close sheet when route changes
  useEffect(() => {
    setIsSidebarSheetOpen(false);
    setIsMegaMenuSheetOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "header fixed top-0 z-10 flex items-stretch shrink-0 border-b border-transparent bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)] transition-[inset-inline-start] duration-300 ease-in-out",
        headerSticky && "border-b border-border",
      )}
      style={
        !isMobile && sidebarWidth
          ? { insetInlineStart: sidebarWidth }
          : { insetInlineStart: 0 }
      }
    >
      <Container
        className={cn(
          'flex items-stretch justify-between lg:gap-4',
          onAccountDashboard && 'max-w-none',
        )}
      >
        {/* HeaderLogo */}
        <div className="flex gap-1 lg:hidden items-center gap-2.5">
          <Link to="/" className="shrink-0">
            <img
              src={toAbsoluteUrl("/media/app/finvoroo.svg")}
              className="h-[25px] w-full"
              alt="finvoroo-logo"
            />
          </Link>
          <div className="flex items-center">
            {mobileMode && (
              <Sheet
                open={isSidebarSheetOpen}
                onOpenChange={setIsSidebarSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button variant="ghost" mode="icon">
                    <Menu className="text-muted-foreground/70" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="p-0 gap-0 w-[275px]"
                  side="left"
                  close={false}
                >
                  <SheetHeader className="p-0 space-y-0" />
                  <SheetBody className="p-0 overflow-y-auto">
                    <SidebarMenu />
                  </SheetBody>
                </SheetContent>
              </Sheet>
            )}
            {mobileMode && (
              <Sheet
                open={isMegaMenuSheetOpen}
                onOpenChange={setIsMegaMenuSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button variant="ghost" mode="icon">
                    <SquareChevronRight className="text-muted-foreground/70" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="p-0 gap-0 w-[275px]"
                  side="left"
                  close={false}
                >
                  <SheetHeader className="p-0 space-y-0" />
                  <SheetBody className="p-0 overflow-y-auto">
                    <MegaMenuMobile />
                  </SheetBody>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        {/* Main Content — breadcrumb for account-owner, MegaMenu for everything else */}
        {accountOwner ? (
          <Breadcrumb />
        ) : pathname.startsWith("/account") ? (
          <Breadcrumb />
        ) : (
          !mobileMode && <MegaMenu />
        )}

        {isCompanyOwner && !onAccountDashboard ? (
          <Link
            to="/dashboard"
            className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors shrink-0"
            title="Account dashboard"
          >
            <LayoutDashboard className="size-4" />
            Account dashboard
          </Link>
        ) : null}

        {/* HeaderTopbar */}
        <div className="flex items-center gap-3">
          {pathname.startsWith("/store-client") ? (
            <StoreClientTopbar />
          ) : accountOwner ? (
            /* Account-owner topbar: Bell + User only */
            <>
              <NotificationsSheet
                scope="account"
                trigger={
                  <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                  >
                    <Bell className="size-4.5!" />
                  </Button>
                }
              />
              <UserDropdownMenu
                trigger={
                  <button
                    type="button"
                    className="size-9 rounded-full p-0 overflow-hidden hover:opacity-90 transition-opacity"
                    aria-label="Account menu"
                  >
                    <UserAvatarFace
                      user={user}
                      sizeClass="size-9"
                      textClass="text-xs"
                    />
                  </button>
                }
              />
            </>
          ) : (
            /* Full topbar for workspace / other routes */
            <>
              {!mobileMode && (
                <SearchDialog
                  trigger={
                    <Button
                      variant="ghost"
                      mode="icon"
                      shape="circle"
                      className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                    >
                      <Search className="size-4.5!" />
                    </Button>
                  }
                />
              )}
              <NotificationsSheet
                trigger={
                  <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                  >
                    <Bell className="size-4.5!" />
                  </Button>
                }
              />

              <ChatSheet
                trigger={
                  <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                  >
                    <MessageCircleMore className="size-4.5!" />
                  </Button>
                }
              />

              <AppsDropdownMenu
                trigger={
                  <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
                  >
                    <LayoutGrid className="size-4.5!" />
                  </Button>
                }
              />

              <UserDropdownMenu
                trigger={
                  <button
                    type="button"
                    className="size-9 rounded-full p-0 overflow-hidden hover:opacity-90 transition-opacity"
                    aria-label="Account menu"
                  >
                    <UserAvatarFace
                      user={user}
                      sizeClass="size-9"
                      textClass="text-xs"
                    />
                  </button>
                }
              />
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
