import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
} from "lucide-react";
import { authCookies } from "@/auth/auth-cookies";
import { useAuthStore } from "@/store/authStore";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/container";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toAbsoluteUrl } from "@/lib/helpers";

const NAV_ITEMS = [
  { path: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/superadmin/users", label: "Users", icon: Users },
  {
    path: "/superadmin/account-owners",
    label: "Account owners",
    icon: Building2,
  },
];

function NavLinks({ collapsed, onNavigate }) {
  const { pathname } = useLocation();

  return (
    <nav className="space-y-1 px-3">
      {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
        const active = pathname === path || pathname.startsWith(`${path}/`);
        return (
          <Link
            key={path}
            to={path}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed ? <span>{label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function SuperAdminLayout() {
  const navigate = useNavigate();
  const { user, logout, clearSuperAdminBrowsing } = useAuthStore();
  const isMobile = useIsMobile();

  useEffect(() => {
    authCookies.clearCompanyId();
    clearSuperAdminBrowsing();
  }, [clearSuperAdminBrowsing]);

  async function handleLogout() {
    await logout();
    navigate("/superadmin/login", { replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <Shield className="size-5 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">Super Admin</p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email}
          </p>
        </div>
      </div>
      <div className="grow py-4">
        <NavLinks collapsed={false} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && (
        <aside className="fixed inset-y-0 start-0 z-20 w-[260px] border-e border-border bg-background">
          {sidebar}
        </aside>
      )}

      <div className={cn(!isMobile && "ps-[260px]")}>
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <Container className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isMobile ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" mode="icon" size="sm">
                      <Menu className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] p-0">
                    <SheetHeader className="sr-only">Navigation</SheetHeader>
                    <SheetBody className="p-0">{sidebar}</SheetBody>
                  </SheetContent>
                </Sheet>
              ) : null}
              <img
                src={toAbsoluteUrl("/media/app/finvoroo.svg")}
                className="h-6 lg:hidden"
                alt=""
              />
            </div>

            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              Log out
            </Button>
          </Container>
        </header>

        <main className="py-6">
          <Container>
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  );
}
