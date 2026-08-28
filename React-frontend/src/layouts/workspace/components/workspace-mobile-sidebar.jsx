import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { HelpCircle, LogOut, Menu } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { toAbsoluteUrl } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { WorkspaceSidebarMenu } from "./workspace-sidebar";

export function WorkspaceMobileSidebar({ companyName }) {
  const { id: companyId } = useParams();
  const { pathname } = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [companyId, pathname]);

  const handleLogout = async () => {
    await logout();
    window.location.assign("/auth/signin");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          mode="icon"
          shape="circle"
          className="size-9 shrink-0 lg:hidden hover:bg-primary/10 hover:[&_svg]:text-primary"
          title="Open menu"
          aria-label="Open menu"
        >
          <Menu className="size-5!" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(300px,88vw)] p-0 gap-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-4 border-b border-border text-left space-y-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <img
              src={toAbsoluteUrl("/media/app/finvoroo.svg")}
              className="h-7 w-7 shrink-0"
              alt=""
            />
            <span className="truncate">{companyName || "Workspace"}</span>
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col flex-1 min-h-0 p-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <WorkspaceSidebarMenu collapsed={false} companyId={companyId} />
          </div>
          <div className="shrink-0 border-t border-border p-3 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              asChild
            >
              <Link
                to={`/workspace/${companyId}/help`}
                onClick={() => setOpen(false)}
              >
                <HelpCircle className="size-4" />
                Help & Support
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-slate-500 transition-colors hover:bg-red-50/80 hover:text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
