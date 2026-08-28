import {
  Archive,
  Check,
  Copy,
  KeyRound,
  MoreHorizontal,
  Search,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import {
  countRolePermissions,
  formatRoleLabel,
  roleCoveragePercent,
} from '../constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function RoleRail({
  roles,
  rolePermissions,
  totalAssignable,
  activeRoleId,
  roleSearch,
  roleFilter,
  canEdit,
  onRoleSearch,
  onRoleFilter,
  onSelect,
  onDuplicate,
  onArchive,
  onDelete,
  onCreateRole,
}) {
  return (
    <aside className="flex min-h-0 flex-col border-b bg-muted/20 lg:h-full lg:border-b-0 lg:border-r lg:sticky lg:top-0">
      <div className="shrink-0 space-y-2.5 border-b px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Company roles
          </p>
          <Select value={roleFilter} onValueChange={onRoleFilter}>
            <SelectTrigger className="h-8 w-[7.5rem] text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={roleSearch}
            onChange={(e) => onRoleSearch(e.target.value)}
            placeholder="Search roles…"
            className="h-10 pl-9 text-sm bg-background"
            aria-label="Search roles"
          />
        </div>
      </div>

      <div
        className="flex max-h-48 min-h-0 gap-2 overflow-x-auto p-3 lg:max-h-none lg:flex-1 lg:flex-col lg:overflow-y-auto"
        role="tablist"
        aria-label="Roles"
      >
        {roles.map((role) => {
          const isActive = Number(activeRoleId) === Number(role.id);
          const count = countRolePermissions(rolePermissions, role.id);
          const coverage = roleCoveragePercent(count, totalAssignable);
          const users = role.usage_count ?? 0;
          const archived = role.is_active === false;

          return (
            <div
              key={role.id}
              className={cn(
                'group relative flex min-w-[16rem] items-stretch gap-1 rounded-xl border px-3 py-3.5 transition-all duration-150 lg:min-w-0 lg:w-full',
                isActive
                  ? 'border-foreground/20 bg-background shadow-md ring-1 ring-foreground/10'
                  : 'border-transparent bg-transparent hover:border-border hover:bg-background/80 hover:shadow-sm',
                archived && 'opacity-65',
              )}
            >
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute inset-y-3 left-0 w-1 rounded-full bg-foreground"
                />
              ) : null}

              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(role)}
                className="min-w-0 flex-1 pl-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-base font-semibold tracking-tight">
                    {formatRoleLabel(role.label || role.name)}
                  </span>
                  <Badge
                    variant={role.is_system ? 'secondary' : 'outline'}
                    className="h-5 px-1.5 text-[10px]"
                  >
                    {role.is_system ? 'System' : 'Custom'}
                  </Badge>
                </div>

                <div className="mt-2.5 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="size-3.5 shrink-0" />
                    <span>
                      <span className="font-semibold tabular-nums text-foreground">{users}</span>{' '}
                      {users === 1 ? 'User' : 'Users'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="size-3.5 shrink-0" />
                    <span>
                      <span className="font-semibold tabular-nums text-foreground">{count}</span>{' '}
                      Permissions
                      <span className="text-muted-foreground/70"> · {coverage}%</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {archived ? (
                      <>
                        <Archive className="size-3.5 shrink-0" />
                        <span>Archived</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-3.5 shrink-0 text-foreground/70" />
                        <span className="font-medium text-foreground/80">Active</span>
                      </>
                    )}
                  </div>
                </div>
              </button>

              {canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 self-start opacity-50 group-hover:opacity-100"
                      aria-label={`Actions for ${formatRoleLabel(role.label || role.name)}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onDuplicate(role)}>
                      <Copy className="size-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {!role.is_system && !archived ? (
                      <DropdownMenuItem onClick={() => onArchive(role)}>
                        <Archive className="size-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    ) : null}
                    {!role.is_system && archived ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(role)}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          );
        })}

        {!roles.length ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl border bg-background">
              <Shield className="size-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-semibold">No roles created</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a company role to start assigning access.
              </p>
            </div>
            {canEdit && onCreateRole ? (
              <Button type="button" variant="mono" size="sm" onClick={onCreateRole}>
                Create role
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
