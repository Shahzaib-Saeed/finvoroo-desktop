import { ChevronFirst } from "lucide-react";
import { Link } from "react-router-dom";
import { toAbsoluteUrl } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { useSettings } from "@/providers/settings-provider";
import { Button } from "@/components/ui/button";

export function SidebarHeader() {
  const { settings, storeOption } = useSettings();

  const handleToggleClick = () => {
    storeOption(
      "layouts.demo1.sidebarCollapse",
      !settings.layouts.demo1.sidebarCollapse,
    );
  };

  const collapsed = settings.layouts.demo1.sidebarCollapse;

  return (
    <div
      className="sidebar-header hidden lg:flex items-center relative justify-between px-3 lg:px-6 shrink-0"
      style={{ height: "70px" }}
    >
      <Link to="/" className="flex items-center gap-2 overflow-hidden">
        <img
          src={toAbsoluteUrl("/media/app/finvoroo.svg")}
          className="h-7 max-w-none shrink-0"
          alt="Finvoroo Logo"
        />
        <span
          className={cn(
            "text-primary font-bold text-lg leading-none whitespace-nowrap transition-all duration-300 overflow-hidden",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
          )}
        >
          Finvoroo
        </span>
      </Link>
      <Button
        onClick={handleToggleClick}
        size="sm"
        mode="icon"
        variant="outline"
        className={cn(
          "size-7 absolute start-full top-2/4 rtl:translate-x-2/4 -translate-x-2/4 -translate-y-2/4",
          settings.layouts.demo1.sidebarCollapse
            ? "ltr:rotate-180"
            : "rtl:rotate-180",
        )}
      >
        <ChevronFirst className="size-4!" />
      </Button>
    </div>
  );
}
