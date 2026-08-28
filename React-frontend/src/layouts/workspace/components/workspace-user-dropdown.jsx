import {
  Building2,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Moon,
  Shield,
  UserCircle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNavigate, useParams } from 'react-router-dom';
import { UserAvatarFace } from '@/components/common/user-avatar-face';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/store/authStore';

export function WorkspaceUserDropdown({ trigger }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { id: companyId } = useParams();
  const { theme, setTheme } = useTheme();

  const isCompanyOwner = (user?.role ?? '') === 'company_owner';

  const displayName =
    user?.fullname ||
    (user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'User');
  const displayEmail = user?.email || '';

  // Navigate first — do NOT clear company context while still on /workspace/*.
  // Clearing first races AuthGuard into /select-company before /profile mounts.
  // Demo1Layout calls enterAccountOwnerShell() once the account route is active.
  const goAccountShell = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await logout();
    window.location.assign('/auth/signin');
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Account menu</TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="w-60" side="bottom" align="end">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-accent/50"
          onClick={() => goAccountShell('/profile')}
        >
          <UserAvatarFace user={user} sizeClass="size-9" textClass="text-xs" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {displayEmail || 'View profile'}
            </span>
          </div>
        </button>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => goAccountShell('/profile')}
          className="flex items-center gap-2"
        >
          <UserCircle className="size-4" />
          My Profile
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => goAccountShell('/profile?section=security')}
          className="flex items-center gap-2"
        >
          <Shield className="size-4" />
          Security & password
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => goAccountShell('/companies')}
          className="flex items-center gap-2"
        >
          <Building2 className="size-4" />
          My companies
        </DropdownMenuItem>

        {isCompanyOwner ? (
          <DropdownMenuItem
            onClick={() => goAccountShell('/dashboard')}
            className="flex items-center gap-2"
          >
            <LayoutDashboard className="size-4" />
            Account dashboard
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem
          onClick={() =>
            navigate(companyId ? `/workspace/${companyId}/help` : '/help')
          }
          className="flex items-center gap-2"
        >
          <CircleHelp className="size-4" />
          Help & support
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2"
          onSelect={(e) => e.preventDefault()}
        >
          <Moon className="size-4" />
          <div className="flex grow items-center justify-between">
            Dark Mode
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
