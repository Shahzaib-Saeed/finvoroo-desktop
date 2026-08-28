import {
  Building2,
  CircleHelp,
  Globe,
  LayoutDashboard,
  LogOut,
  Moon,
  Shield,
  UserCircle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from 'react-router';
import { I18N_LANGUAGES } from '@/i18n/config';
import { useLanguage } from '@/providers/i18n-provider';
import { authService } from '@/auth/services/auth-service';
import { useAuthStore } from '@/store/authStore';
import { UserAvatarFace } from '@/components/common/user-avatar-face';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

/**
 * Account-owner shell user menu — links to real app routes only
 * (/profile, /companies, /dashboard, /help).
 */
export function UserDropdownMenu({ trigger }) {
  const storeUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const user = storeUser || authService.getUser();
  const { currenLanguage, changeLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  const isCompanyOwner = (user?.role ?? '') === 'company_owner';

  const displayName =
    user?.fullname ||
    (user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'User');

  const displayEmail = user?.email || '';

  const handleLogout = async () => {
    if (logout) {
      await logout();
    } else {
      await authService.logout();
    }
    window.location.assign('/auth/signin');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="bottom" align="end">
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-md p-3 hover:bg-accent/50"
        >
          <UserAvatarFace user={user} sizeClass="size-9" textClass="text-xs" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-mono hover:text-primary">
              {displayName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {displayEmail || 'View profile'}
            </span>
          </div>
        </Link>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2">
            <UserCircle />
            My Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/profile?section=security" className="flex items-center gap-2">
            <Shield />
            Security & password
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/companies" className="flex items-center gap-2">
            <Building2 />
            My companies
          </Link>
        </DropdownMenuItem>

        {isCompanyOwner ? (
          <DropdownMenuItem asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <LayoutDashboard />
              Account dashboard
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem asChild>
          <Link to="/help" className="flex items-center gap-2">
            <CircleHelp />
            Help & support
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2 [&_[data-slot=dropdown-menu-sub-trigger-indicator]]:hidden hover:[&_[data-slot=badge]]:border-input data-[state=open]:[&_[data-slot=badge]]:border-input">
            <Globe />
            <span className="relative flex grow items-center justify-between gap-2">
              Language
              <Badge
                variant="outline"
                className="absolute end-0 top-1/2 -translate-y-1/2"
              >
                {currenLanguage.label}
                <img
                  src={currenLanguage.flag}
                  className="h-3.5 w-3.5 rounded-full"
                  alt=""
                />
              </Badge>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup
              value={currenLanguage.code}
              onValueChange={(value) => {
                const selectedLang = I18N_LANGUAGES.find(
                  (lang) => lang.code === value,
                );
                if (selectedLang) changeLanguage(selectedLang);
              }}
            >
              {I18N_LANGUAGES.map((item) => (
                <DropdownMenuRadioItem
                  key={item.code}
                  value={item.code}
                  className="flex items-center gap-2"
                >
                  <img
                    src={item.flag}
                    className="h-4 w-4 rounded-full"
                    alt=""
                  />
                  <span>{item.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2"
          onSelect={(event) => event.preventDefault()}
        >
          <Moon />
          <div className="flex grow items-center justify-between gap-2">
            Dark Mode
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </DropdownMenuItem>

        <div className="mt-1 p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
