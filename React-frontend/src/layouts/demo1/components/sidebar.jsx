import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSettings } from "@/providers/settings-provider";
import { SidebarHeader } from "./sidebar-header";
import { SidebarMenu } from "./sidebar-menu";

export function Sidebar() {
  const { settings } = useSettings();
  const { pathname } = useLocation();
  const collapsed = settings.layouts.demo1.sidebarCollapse;

  return (
    <div
      className={cn(
        "sidebar group/sidebar bg-background lg:border-e lg:border-border lg:fixed lg:top-0 lg:bottom-0 lg:z-20 lg:flex flex-col items-stretch shrink-0 transition-[width] duration-300 ease-in-out",
        collapsed ? "w-20" : "w-[280px]",
        (settings.layouts.demo1.sidebarTheme === "dark" ||
          pathname.includes("dark-sidebar")) &&
          "dark",
      )}
    >
      <SidebarHeader />
      <div className="overflow-hidden grow">
        <div className="w-[280px]">
          <SidebarMenu collapsed={collapsed} />
        </div>
      </div>
    </div>
  );
}
