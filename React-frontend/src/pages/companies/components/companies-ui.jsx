import { Link } from 'react-router-dom';
import {
  Ban,
  CalendarClock,
  ChevronRight,
  CheckCircle2,
  Coins,
  EllipsisVertical,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function isCompanyActive(row) {
  return row?.is_active !== false && row?.is_active !== 0;
}

export function formatCompanyDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function companyLocation(company) {
  return [company?.city, company?.country].filter(Boolean).join(', ') || '—';
}

export function CompanyStatusBadge({ active, className }) {
  return isCompanyActive({ is_active: active }) ? (
    <Badge variant="success" appearance="light" className={className}>
      Active
    </Badge>
  ) : (
    <Badge variant="secondary" className={className}>
      Inactive
    </Badge>
  );
}

export function UsageMeter({ label, used, limit, hint }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function CompanySummaryStats({ rows, loading, className }) {
  const active = rows.filter(isCompanyActive).length;
  const inactive = rows.length - active;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-6 gap-y-2 text-sm', className)}>
      <div>
        <span className="text-muted-foreground">Total </span>
        <span className="font-semibold tabular-nums text-foreground">
          {loading ? '—' : rows.length}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">Active </span>
        <span className="font-semibold tabular-nums text-emerald-600">
          {loading ? '—' : active}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">Inactive </span>
        <span className="font-semibold tabular-nums text-foreground">
          {loading ? '—' : inactive}
        </span>
      </div>
    </div>
  );
}

export function companyInitials(name) {
  return (name || 'C')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function InfoLine({ icon: Icon, children }) {
  if (!children) return null;

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="text-sm text-foreground/90 truncate">{children}</span>
    </div>
  );
}

export function CompanyDetailCard({
  company,
  onOpen,
  onEdit,
  onToggleStatus,
  onDelete,
  showActions = true,
  variant = 'default',
  className,
}) {
  const active = isCompanyActive(company);
  const location = companyLocation(company);
  const isDashboard = variant === 'dashboard';
  const initials = companyInitials(company.name);
  const hasContact = company.email || company.phone || (location && location !== '—');

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-border/50 bg-card transition-all duration-200',
        active
          ? 'hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5'
          : 'border-dashed bg-muted/15 opacity-95',
        className,
      )}
    >
      <div
        className={cn(
          'h-1 w-full',
          active
            ? 'bg-gradient-to-r from-primary via-primary/60 to-primary/10'
            : 'bg-gradient-to-r from-muted-foreground/40 to-transparent',
        )}
      />

      <CardContent className="p-0">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex size-14 shrink-0 items-center justify-center rounded-2xl border text-base font-bold shadow-sm',
                active
                  ? 'border-primary/15 bg-primary/10 text-primary'
                  : 'border-border bg-muted text-muted-foreground',
              )}
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold leading-snug text-foreground truncate">
                    {company.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground capitalize truncate">
                    {company.type || 'Business entity'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <CompanyStatusBadge active={company.is_active} />
                  {onToggleStatus ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground"
                        >
                          <EllipsisVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit ? (
                          <DropdownMenuItem onClick={() => onEdit(company)}>
                            <Pencil className="size-4 mr-2" />
                            Edit details
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          className={
                            active
                              ? 'text-amber-700 focus:text-amber-700'
                              : 'text-emerald-700 focus:text-emerald-700'
                          }
                          onClick={() => onToggleStatus(company)}
                        >
                          {active ? (
                            <>
                              <Ban className="size-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        {onDelete ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDelete(company)}
                            >
                              <Trash2 className="size-4 mr-2" />
                              Delete permanently
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 py-1 text-xs font-medium tabular-nums">
                  <Coins className="size-3 text-primary" />
                  {company.currency || 'USD'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Since {formatCompanyDate(company.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 bg-muted/10 px-5 py-4">
          {hasContact ? (
            <div className="space-y-2.5">
              <InfoLine icon={Mail}>{company.email}</InfoLine>
              <InfoLine icon={Phone}>{company.phone}</InfoLine>
              <InfoLine icon={MapPin}>{location !== '—' ? location : null}</InfoLine>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No contact details added yet.
            </p>
          )}

          {!isDashboard && company.updated_at && company.updated_at !== company.created_at ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Updated {formatCompanyDate(company.updated_at)}
            </p>
          ) : null}
        </div>

        {!active ? (
          <div className="mx-5 mb-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5">
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              Inactive — activate this company to access its workspace.
            </p>
          </div>
        ) : null}
      </CardContent>

      {showActions ? (
        <CardFooter className="border-t border-border/40 bg-background px-5 py-4 gap-2">
          {onOpen ? (
            <Button
              size="sm"
              className={cn(isDashboard ? 'flex-1' : 'flex-1 sm:flex-none')}
              disabled={!active}
              onClick={() => onOpen(company)}
            >
              <ExternalLink className="size-3.5" />
              Open workspace
            </Button>
          ) : null}
          {onEdit && !onToggleStatus ? (
            <Button
              size="sm"
              variant="outline"
              className={isDashboard ? 'shrink-0' : undefined}
              onClick={() => onEdit(company)}
            >
              <Pencil className="size-3.5" />
              Manage
            </Button>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function fmtCompanyMoney(value, currency = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function FinanceMetric({ label, amount, currency, hint, tone = 'default' }) {
  const tones = {
    default: 'text-foreground',
    receivable: 'text-emerald-600 dark:text-emerald-400',
    payable: 'text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
        {label}
      </p>
      <p className={cn('mt-1 text-base font-semibold tabular-nums truncate', tones[tone])}>
        {fmtCompanyMoney(amount, currency)}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Compact card for account dashboard — books snapshot, no contact fields. */
export function CompanyDashboardCard({ company, onOpen, onManage, className }) {
  const active = isCompanyActive(company);
  const stats = company.stats ?? {};
  const currency = company.currency || 'USD';
  const openInvoices = Number(stats.open_invoices ?? 0);
  const openBills = Number(stats.open_bills ?? 0);

  function handleOpen(e) {
    e?.stopPropagation?.();
    if (active && onOpen) onOpen(company);
  }

  function handleManage(e) {
    e.stopPropagation();
    onManage?.(company);
  }

  return (
    <Card
      className={cn(
        'group border-border/60 bg-card overflow-hidden transition-colors',
        active && onOpen && 'cursor-pointer hover:border-primary/35 hover:bg-muted/20',
        !active && 'opacity-75',
        className,
      )}
      onClick={active && onOpen ? handleOpen : undefined}
      onKeyDown={
        active && onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpen(e);
              }
            }
          : undefined
      }
      role={active && onOpen ? 'button' : undefined}
      tabIndex={active && onOpen ? 0 : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
              active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            {companyInitials(company.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-sm truncate">{company.name}</h3>
              <CompanyStatusBadge active={company.is_active} />
            </div>
            <p className="text-xs text-muted-foreground capitalize truncate mt-0.5">
              {[company.type, currency].filter(Boolean).join(' · ')}
            </p>
          </div>
          {active && onOpen ? (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <FinanceMetric
            label="AR receivable"
            amount={stats.ar_outstanding}
            currency={currency}
            hint={`${openInvoices} open invoice${openInvoices === 1 ? '' : 's'}`}
            tone="receivable"
          />
          <FinanceMetric
            label="AP payable"
            amount={stats.ap_outstanding}
            currency={currency}
            hint={`${openBills} open bill${openBills === 1 ? '' : 's'}`}
            tone="payable"
          />
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-lg bg-muted/25 px-2 py-2 text-center text-[11px] text-muted-foreground">
          <div>
            <p className="font-semibold tabular-nums text-foreground">{stats.customers ?? 0}</p>
            <p>Customers</p>
          </div>
          <div>
            <p className="font-semibold tabular-nums text-foreground">{stats.vendors ?? 0}</p>
            <p>Vendors</p>
          </div>
          <div>
            <p className="font-semibold tabular-nums text-foreground truncate">
              {fmtCompanyMoney(stats.collected, currency)}
            </p>
            <p>Collected</p>
          </div>
        </div>

        {!active ? (
          <p className="mt-2.5 text-[11px] text-amber-600 dark:text-amber-400">
            Inactive — activate to open workspace
          </p>
        ) : null}

        {onManage ? (
          <button
            type="button"
            className="mt-2.5 text-xs font-medium text-primary hover:underline"
            onClick={handleManage}
          >
            Manage settings
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PlanLimitBanner({ usage, account, createHref = '/companies/create', showCreateAction = true }) {
  if (!usage) return null;

  const atLimit = !usage.can_create_company;

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3',
        atLimit
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-primary/20 bg-primary/[0.04]',
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {account?.plan_name || 'Your plan'} · {usage.companies} of {usage.company_limit}{' '}
          {usage.company_limit === 1 ? 'company' : 'companies'} used
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {atLimit
            ? 'You have reached your company limit. Deactivate an unused company or contact support to upgrade.'
            : `${usage.slots_remaining} company slot${usage.slots_remaining === 1 ? '' : 's'} remaining on your account.`}
        </p>
      </div>
      {showCreateAction && !atLimit ? (
        <Button size="sm" asChild>
          <Link to={createHref}>Create company</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function GettingStartedChecklist({ usage, onCreate }) {
  const steps = [
    {
      done: (usage?.companies ?? 0) > 0,
      title: 'Create your first company',
      desc: 'Set up a legal entity and base currency for your books.',
    },
    {
      done: (usage?.active_companies ?? 0) > 0,
      title: 'Open a company workspace',
      desc: 'Start invoicing, expenses, and accounting in a workspace.',
    },
    {
      done: false,
      title: 'Invite your team',
      desc: 'Add users from the workspace employee section when ready.',
    },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div
          key={step.title}
          className={cn(
            'flex gap-3 rounded-lg border px-3 py-3',
            step.done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border/60 bg-muted/10',
          )}
        >
          <CheckCircle2
            className={cn('size-5 shrink-0 mt-0.5', step.done ? 'text-emerald-600' : 'text-muted-foreground')}
          />
          <div>
            <p className="text-sm font-medium">{step.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
          </div>
        </div>
      ))}
      {(usage?.companies ?? 0) === 0 && onCreate ? (
        <Button size="sm" onClick={onCreate}>
          Create your first company
        </Button>
      ) : null}
    </div>
  );
}
