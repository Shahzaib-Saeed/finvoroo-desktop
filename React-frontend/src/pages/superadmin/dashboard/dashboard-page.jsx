import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  CreditCard,
  RefreshCw,
  Shield,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { superadminApi } from '../api/superadmin.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { setPageTitle } from '@/lib/page-title';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DashboardKpi,
  DashboardPanel,
  DashboardStatPill,
  EmptyState,
  RankBarRow,
} from '@/pages/workspace/dashboard/dashboard-ui';
import { cn } from '@/lib/utils';

function fmtMoney(value) {
  if (value == null || Number.isNaN(Number(value))) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtRelative(value) {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return fmtDate(value);
}

const ROLE_LABELS = {
  super_admin: 'Super admin',
  company_owner: 'Account owner',
  admin: 'Admin',
  accountant: 'Accountant',
  employee: 'Employee',
  staff: 'Staff',
};

function roleBadge(role) {
  if (role === 'super_admin') return <Badge variant="destructive">Super admin</Badge>;
  if (role === 'company_owner') return <Badge variant="secondary">Account owner</Badge>;
  return <Badge variant="outline">{ROLE_LABELS[role] || role || 'User'}</Badge>;
}

function statusBadge(active) {
  return active ? (
    <Badge variant="success" appearance="light">
      Active
    </Badge>
  ) : (
    <Badge variant="secondary">Inactive</Badge>
  );
}

function SignupsTrendChart({ trend, loading }) {
  const max = useMemo(() => {
    if (!trend?.length) return 1;
    return Math.max(...trend.map((m) => Math.max(m.users, m.owners, m.companies)), 1);
  }, [trend]);

  if (loading) {
    return (
      <div className="flex items-end gap-3 h-40">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-full rounded-t-md" />
        ))}
      </div>
    );
  }

  if (!trend?.length) {
    return <EmptyState message="No signup data yet" icon={TrendingUp} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 sm:gap-3 h-44">
        {trend.map((month) => {
          const userH = Math.round((month.users / max) * 100);
          const ownerH = Math.round((month.owners / max) * 100);
          const companyH = Math.round((month.companies / max) * 100);
          return (
            <div key={month.month} className="flex flex-1 flex-col items-center gap-2 min-w-0">
              <div className="flex items-end justify-center gap-0.5 w-full h-36">
                <div
                  className="w-2 sm:w-2.5 rounded-t bg-blue-500/80 transition-all"
                  style={{ height: `${Math.max(userH, 4)}%` }}
                  title={`${month.users} users`}
                />
                <div
                  className="w-2 sm:w-2.5 rounded-t bg-violet-500/80 transition-all"
                  style={{ height: `${Math.max(ownerH, 4)}%` }}
                  title={`${month.owners} owners`}
                />
                <div
                  className="w-2 sm:w-2.5 rounded-t bg-emerald-500/80 transition-all"
                  style={{ height: `${Math.max(companyH, 4)}%` }}
                  title={`${month.companies} companies`}
                />
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate w-full text-center">
                {month.label?.replace(' 20', " '") ?? month.month}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-blue-500/80" />
          Users
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-violet-500/80" />
          Account owners
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-emerald-500/80" />
          Companies
        </span>
      </div>
    </div>
  );
}

export function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await superadminApi.dashboard();
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setPageTitle('Dashboard');
    load();
  }, [load]);

  const stats = data?.stats || {};
  const planMax = useMemo(() => {
    const plans = data?.plan_distribution || [];
    return Math.max(...plans.map((p) => p.count), 1);
  }, [data?.plan_distribution]);

  const roleMax = useMemo(() => {
    const roles = data?.users_by_role || [];
    return Math.max(...roles.map((r) => r.count), 1);
  }, [data?.users_by_role]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Dashboard"
        subtitle={
          data?.generated_at
            ? `Live overview · Updated ${fmtDateTime(data.generated_at)}`
            : 'Platform overview, growth, and activity'
        }
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={loading || refreshing}
            >
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/superadmin/users">All users</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/superadmin/account-owners">Account owners</Link>
            </Button>
          </div>
        }
      />

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpi
          icon={Users}
          label="Total users"
          value={loading ? '—' : stats.total_users ?? 0}
          sub={
            loading
              ? undefined
              : `${stats.active_users ?? 0} active · ${stats.inactive_users ?? 0} inactive`
          }
          loading={loading}
          accent="info"
          to="/superadmin/users"
        />
        <DashboardKpi
          icon={Building2}
          label="Account owners"
          value={loading ? '—' : stats.account_owners ?? 0}
          sub={
            loading
              ? undefined
              : `${stats.active_account_owners ?? 0} active · +${stats.new_owners_30d ?? 0} this month`
          }
          loading={loading}
          accent="default"
          to="/superadmin/account-owners"
        />
        <DashboardKpi
          icon={Building2}
          label="Companies"
          value={loading ? '—' : stats.total_companies ?? 0}
          sub={
            loading
              ? undefined
              : `${stats.active_companies ?? 0} active · +${stats.new_companies_30d ?? 0} this month`
          }
          loading={loading}
          accent="success"
        />
        <DashboardKpi
          icon={CreditCard}
          label="Est. MRR"
          value={loading ? '—' : fmtMoney(stats.estimated_mrr)}
          sub={
            loading
              ? undefined
              : `${fmtMoney(stats.estimated_arr)} ARR · ${stats.active_accounts ?? 0} active accounts`
          }
          loading={loading}
          accent="warning"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <DashboardStatPill
          icon={UserPlus}
          label="New users (30d)"
          value={stats.new_users_30d ?? 0}
          loading={loading}
        />
        <DashboardStatPill
          icon={UserCheck}
          label="Activation rate"
          value={loading ? '—' : `${stats.activation_rate ?? 0}%`}
          sub="Active users / total"
          loading={loading}
        />
        <DashboardStatPill
          icon={Activity}
          label="Company health"
          value={loading ? '—' : `${stats.company_activation_rate ?? 0}%`}
          sub="Active companies"
          loading={loading}
        />
        <DashboardStatPill
          icon={Shield}
          label="Super admins"
          value={stats.super_admins ?? 0}
          loading={loading}
        />
        <DashboardStatPill
          icon={Users}
          label="Workspace users"
          value={stats.workspace_users ?? 0}
          sub="Staff & members"
          loading={loading}
        />
        <DashboardStatPill
          icon={UserX}
          label="Inactive owners"
          value={stats.inactive_account_owners ?? 0}
          loading={loading}
        />
      </div>

      {/* Trend + breakdown */}
      <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <DashboardPanel
            title="Growth trend"
            description="New signups over the last 6 months"
            actionTo="/superadmin/users/create"
            actionLabel="Create owner"
          >
            <SignupsTrendChart trend={data?.signups_trend} loading={loading} />
          </DashboardPanel>
        </div>

        <DashboardPanel title="Platform snapshot" description="Key totals at a glance">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Billing accounts
              </p>
              <p className="mt-1.5 text-xl font-bold tabular-nums">
                {loading ? '—' : stats.total_accounts ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {stats.active_accounts ?? 0} active subscriptions
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Inactive companies
              </p>
              <p className="mt-1.5 text-xl font-bold tabular-nums">
                {loading ? '—' : stats.inactive_companies ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Need review or cleanup</p>
            </div>
            <div className="col-span-2 rounded-xl border border-border/50 bg-muted/20 p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                30-day growth
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span>
                  <strong className="tabular-nums">{stats.new_users_30d ?? 0}</strong>{' '}
                  <span className="text-muted-foreground">users</span>
                </span>
                <span>
                  <strong className="tabular-nums">{stats.new_owners_30d ?? 0}</strong>{' '}
                  <span className="text-muted-foreground">owners</span>
                </span>
                <span>
                  <strong className="tabular-nums">{stats.new_companies_30d ?? 0}</strong>{' '}
                  <span className="text-muted-foreground">companies</span>
                </span>
              </div>
            </div>
          </div>
        </DashboardPanel>
      </div>

      {/* Role + plan distribution */}
      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardPanel title="Users by role" description="Distribution across the platform">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (data?.users_by_role?.length ?? 0) === 0 ? (
            <EmptyState message="No users found" icon={Users} />
          ) : (
            <div className="space-y-4">
              {data.users_by_role.map((row) => (
                <RankBarRow
                  key={row.role}
                  name={ROLE_LABELS[row.role] || row.role}
                  amount={row.count}
                  pct={Math.round((row.count / roleMax) * 100)}
                />
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Plan distribution" description="Active accounts by subscription plan">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (data?.plan_distribution?.length ?? 0) === 0 ? (
            <EmptyState message="No billing accounts yet" icon={CreditCard} />
          ) : (
            <div className="space-y-4">
              {data.plan_distribution.map((row) => (
                <RankBarRow
                  key={`${row.plan_code}-${row.plan_name}`}
                  name={row.plan_name}
                  amount={row.count}
                  pct={Math.round((row.count / planMax) * 100)}
                />
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>

      {/* Recent account owners */}
      <DashboardPanel
        title="Recent account owners"
        description="Newest account owner registrations with plan and company usage"
        actionTo="/superadmin/account-owners"
        actionLabel="View all"
      >
        <div className="overflow-x-auto -mx-5 px-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (data?.recent_account_owners?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    No account owners yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.recent_account_owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell>
                      <div className="min-w-[160px]">
                        <p className="font-medium">{owner.name}</p>
                        <p className="text-xs text-muted-foreground">{owner.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{owner.plan_name || '—'}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {owner.account_status || '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="tabular-nums font-medium">{owner.companies_count}</span>
                      <span className="text-muted-foreground text-xs">
                        {' '}
                        / {owner.company_limit || '∞'}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(owner.is_active)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDate(owner.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtRelative(owner.last_login_at)}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/superadmin/account-owners/${owner.id}/companies`}>
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DashboardPanel>

      {/* Recent companies + logins */}
      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardPanel
          title="Recent companies"
          description="Latest companies created on the platform"
        >
          <div className="overflow-x-auto -mx-5 px-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (data?.recent_companies?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No companies yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recent_companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {company.currency || '—'} · {fmtDate(company.created_at)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{company.owner_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {company.owner_email}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[company.city, company.country].filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell>{statusBadge(company.is_active)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recent sign-ins"
          description="Latest authenticated sessions across all roles"
          actionTo="/superadmin/users"
          actionLabel="Manage users"
        >
          <div className="overflow-x-auto -mx-5 px-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (data?.recent_logins?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No recent logins recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recent_logins.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{roleBadge(row.role)}</TableCell>
                      <TableCell>{statusBadge(row.is_active)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {fmtRelative(row.last_login_at)}
                        <span className="block text-[11px] opacity-70">
                          {fmtDateTime(row.last_login_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}
