import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronsUpDown } from 'lucide-react';
import { authService } from '@/auth/services/auth-service';
import { getWorkspaceHomePath } from '@/industries';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function companyInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function CompanyAvatar({ name, className }) {
  return (
    <Avatar className={cn('size-7 shrink-0', className)}>
      <AvatarFallback className="rounded-md bg-primary/12 text-[11px] font-semibold text-primary">
        {companyInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function WorkspaceCompanySwitcher({ companyName, className }) {
  const { id: companyId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const companies = authService.getCompanies();

  const list = useMemo(() => {
    return (companies ?? []).map((c) => ({
      id: c.id,
      name: c.name || `Company #${c.id}`,
    }));
  }, [companies]);

  if (list.length <= 1 && user?.role !== 'company_owner') {
    return null;
  }

  if (list.length === 0) {
    return null;
  }

  const selected =
    list.find((c) => String(c.id) === String(companyId)) ||
    list.find((c) => String(c.id) === String(authService.getCompanyId())) ||
    null;

  const displayName = selected?.name || companyName || `Company #${companyId}`;

  const switchTo = (id) => {
    if (!id || String(id) === String(companyId)) return;
    authService.setCompanyId(id);
    navigate(getWorkspaceHomePath(id, companies));
  };

  return (
    <Select
      value={String(companyId || selected?.id || '')}
      onValueChange={switchTo}
      indicatorPosition="right"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <SelectTrigger
            size="sm"
            className={cn(
              'h-9 w-auto shrink-0 gap-1.5 rounded-lg border-border/70 bg-muted/30 px-1.5 shadow-none hover:bg-accent/50',
              '[&>svg:last-child]:hidden',
              className,
            )}
            aria-label={`Switch company: ${displayName}`}
          >
            <SelectValue className="sr-only">{displayName}</SelectValue>
            <CompanyAvatar name={displayName} />
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </SelectTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-center">
          <p className="truncate font-medium">{displayName}</p>
          <p className="text-[10px] opacity-80">Switch company</p>
        </TooltipContent>
      </Tooltip>
      <SelectContent align="end" className="min-w-[240px]">
        <SelectGroup>
          <SelectLabel className="py-1.5 ps-2 pe-2 text-xs font-normal text-muted-foreground">
            Your companies
          </SelectLabel>
          {list.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              <span className="flex items-center gap-2.5 min-w-0">
                <CompanyAvatar name={c.name} className="size-6" />
                <span className="truncate text-sm">{c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
