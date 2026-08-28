import { Link } from 'react-router';
import {
  Briefcase,
  Building2,
  CalendarClock,
  CalendarRange,
  ExternalLink,
  FileText,
  StickyNote,
  User,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatJobType } from '../constants';
import { formatCurrency } from '../../invoices/constants';
import { JobOrderProfitabilityPanel } from './JobOrderProfitabilityPanel';
import { JobOrderLinkedCostsPanel } from './JobOrderLinkedCostsPanel';
import { JobOrderLaborPanel } from './JobOrderLaborPanel';

const cardHeaderTight = 'min-h-0 items-start border-0 py-4 px-5 max-sm:px-4';
const cardContentTight = 'px-5 pb-5 max-sm:px-4';

function KpiCard({ label, value, sub, tone = 'default', icon: Icon }) {
  const tones = {
    default: {
      card: 'border-border bg-card',
      icon: 'bg-muted text-muted-foreground',
      value: 'text-foreground',
    },
    revenue: {
      card: 'border-sky-200/70 bg-sky-50/30 dark:border-sky-900/50 dark:bg-sky-950/20',
      icon: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400',
      value: 'text-sky-800 dark:text-sky-300',
    },
    cost: {
      card: 'border-amber-200/70 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20',
      icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
      value: 'text-amber-800 dark:text-amber-300',
    },
    profit: {
      card: 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20',
      icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
      value: 'text-emerald-800 dark:text-emerald-300',
    },
    loss: {
      card: 'border-destructive/30 bg-destructive/5',
      icon: 'bg-destructive/10 text-destructive',
      value: 'text-destructive',
    },
  };
  const t = tones[tone] || tones.default;

  return (
    <Card className={cn('shadow-sm', t.card)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className={cn('text-2xl font-bold tabular-nums leading-none', t.value)}>{value}</p>
            {sub ? <p className="text-xs text-muted-foreground pt-1">{sub}</p> : null}
          </div>
          {Icon ? (
            <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', t.icon)}>
              <Icon className="size-5" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 py-2.5 border-b last:border-0">
      <div className="size-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm font-medium mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function RelatedLink({ to, label, meta, icon: Icon = ExternalLink }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors group"
    >
      <span className="font-medium group-hover:text-primary truncate">{label}</span>
      <span className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
        {meta ? (
          <Badge variant="outline" className="text-[10px] font-normal capitalize">
            {meta}
          </Badge>
        ) : null}
        <Icon className="size-3.5 opacity-60" />
      </span>
    </Link>
  );
}

function ScheduleMilestone({ label, date, active, done }) {
  return (
    <div className="flex flex-col items-center text-center min-w-[72px] flex-1">
      <div
        className={cn(
          'size-3 rounded-full border-2 shrink-0',
          done
            ? 'bg-emerald-500 border-emerald-500'
            : active
              ? 'bg-primary border-primary'
              : 'bg-background border-muted-foreground/40',
        )}
      />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-2">
        {label}
      </p>
      <p className="text-xs font-medium mt-0.5 tabular-nums">{date || '—'}</p>
    </div>
  );
}

export function JobOrderShowDetail({
  job,
  workspaceId,
  jobOrderId,
  financialSummary,
  onLaborChange,
}) {
  const salesOrderBase = `/workspace/${workspaceId}/accounting/sales-orders`;
  const invoiceBase = `/workspace/${workspaceId}/accounting/invoices`;
  const fixedAssetBase = `/workspace/${workspaceId}/accounting/fixed-assets`;

  const currency = financialSummary?.currency || 'USD';
  const revenue = financialSummary?.revenue?.recognized ?? 0;
  const totalCost = financialSummary?.cost?.total ?? 0;
  const grossProfit = financialSummary?.profitability?.gross_profit ?? 0;
  const margin = financialSummary?.profitability?.margin_percent;
  const isProfitable = financialSummary?.profitability?.is_profitable;
  const profitTone =
    revenue > 0 && isProfitable === false ? 'loss' : revenue > 0 ? 'profit' : 'default';

  const statusLabel = job.status_label || job.status || '—';
  const priorityLabel = job.priority_label || job.priority || '—';
  const hasSchedule = job.start_date || job.due_date_display || job.end_date;
  const hasLegacySalesLink = Boolean(job.sales_order?.id);

  const recordPaths = {
    invoiceCreate: `${invoiceBase}/create?job_order_id=${jobOrderId}`,
    expenseCreate: `/workspace/${workspaceId}/accounting/journal/create?job_order_id=${jobOrderId}`,
    billCreate: `/workspace/${workspaceId}/accounting/bills/create?job_order_id=${jobOrderId}`,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Recognized revenue"
          value={formatCurrency(revenue, currency)}
          sub={
            financialSummary?.revenue?.posted_invoice_count > 0
              ? `${financialSummary.revenue.posted_invoice_count} posted invoice(s)`
              : 'Tag invoices to this job'
          }
          tone="revenue"
          icon={Briefcase}
        />
        <KpiCard
          label="Total cost"
          value={formatCurrency(totalCost, currency)}
          sub="Tagged bills, expenses, labor & more"
          tone="cost"
          icon={FileText}
        />
        <KpiCard
          label="Gross profit"
          value={formatCurrency(grossProfit, currency)}
          sub={margin != null ? `${margin}% margin` : 'Post revenue to see margin'}
          tone={profitTone}
          icon={Briefcase}
        />
        <KpiCard
          label="Job type"
          value={formatJobType(job.job_type)}
          sub={job.customer?.name || 'No customer assigned'}
          tone="default"
          icon={Building2}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <Card className="shadow-sm print:shadow-none">
            <CardHeader className={cn(cardHeaderTight, 'border-b border-border pb-4')}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 w-full">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                    Job order
                  </p>
                  <CardTitle className="text-2xl font-bold tracking-tight">{job.job_number}</CardTitle>
                  {job.title ? (
                    <CardDescription className="mt-1.5 text-base text-foreground font-medium">
                      {job.title}
                    </CardDescription>
                  ) : (
                    <CardDescription className="mt-1">
                      {job.customer?.name || 'Untitled job'}
                    </CardDescription>
                  )}
                  {job.customer?.name && job.title ? (
                    <p className="text-sm text-muted-foreground mt-1">{job.customer.name}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
                  <Badge
                    variant="outline"
                    className={cn('capitalize text-sm px-2.5 py-0.5', job.status_badge_class)}
                  >
                    {statusLabel}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn('capitalize text-sm px-2.5 py-0.5', job.priority_badge_class)}
                  >
                    {priorityLabel}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className={cn(cardContentTight, 'pt-5 space-y-6')}>
              {hasSchedule ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-1.5">
                    <CalendarRange className="size-3.5" />
                    Schedule
                  </h3>
                  <div className="relative rounded-xl border bg-muted/20 px-4 py-5">
                    <div
                      className="absolute top-[1.35rem] left-8 right-8 h-0.5 bg-border hidden sm:block"
                      aria-hidden
                    />
                    <div className="flex justify-between gap-2 relative">
                      <ScheduleMilestone
                        label="Start"
                        date={job.start_date}
                        done={Boolean(job.start_date)}
                        active={!job.end_date && Boolean(job.start_date)}
                      />
                      <ScheduleMilestone
                        label="Target end"
                        date={job.due_date_display}
                        active={!job.end_date && Boolean(job.due_date_display)}
                        done={false}
                      />
                      <ScheduleMilestone
                        label="End"
                        date={job.end_date}
                        done={Boolean(job.end_date)}
                        active={Boolean(job.end_date)}
                      />
                    </div>
                    {(job.started_at || job.completed_at) && (
                      <div className="mt-4 pt-3 border-t grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {job.started_at ? (
                          <p>
                            <span className="font-medium text-foreground">Work started:</span>{' '}
                            {job.started_at}
                          </p>
                        ) : null}
                        {job.completed_at ? (
                          <p>
                            <span className="font-medium text-foreground">Completed:</span>{' '}
                            {job.completed_at}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {job.custom_fields_display?.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Custom fields
                  </h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {job.custom_fields_display.map((field) => (
                      <div
                        key={field.id}
                        className="rounded-lg border bg-muted/20 px-3 py-2.5"
                      >
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {field.label}
                        </dt>
                        <dd className="text-sm font-medium mt-0.5 break-words">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {job.notes ? (
                <div className="rounded-lg border bg-muted/15 px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <StickyNote className="size-3.5" />
                    Notes
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {job.notes}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <JobOrderProfitabilityPanel summary={financialSummary} />
          <JobOrderLaborPanel
            jobOrderId={jobOrderId}
            currency={currency}
            onLaborChange={onLaborChange}
          />
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card className="shadow-sm">
            <CardHeader className={cn(cardHeaderTight, 'pb-2')}>
              <CardTitle className="text-base">Details</CardTitle>
              <CardDescription>Customer, assignment, and schedule at a glance.</CardDescription>
            </CardHeader>
            <CardContent className={cn(cardContentTight, 'pt-0')}>
              {job.customer?.name ? (
                <DetailRow icon={Building2} label="Customer">
                  {job.customer.name}
                </DetailRow>
              ) : null}
              {job.vendor?.name ? (
                <DetailRow icon={Building2} label="Vendor">
                  {job.vendor.name}
                </DetailRow>
              ) : null}
              {job.assigned_user?.name ? (
                <DetailRow icon={User} label="Assigned to">
                  {job.assigned_user.name}
                </DetailRow>
              ) : null}
              <DetailRow icon={Briefcase} label="Type">
                <span className="capitalize">{formatJobType(job.job_type)}</span>
              </DetailRow>
              {job.start_date ? (
                <DetailRow icon={CalendarClock} label="Start date">
                  {job.start_date}
                </DetailRow>
              ) : null}
              {job.due_date_display ? (
                <DetailRow icon={CalendarRange} label="Target end">
                  {job.due_date_display}
                </DetailRow>
              ) : null}
              {job.end_date ? (
                <DetailRow icon={CalendarClock} label="End date">
                  {job.end_date}
                </DetailRow>
              ) : null}
            </CardContent>
          </Card>

          <JobOrderLinkedCostsPanel
            linkedCosts={financialSummary?.linked_costs}
            currency={currency}
            compact
          />

          <Card className="shadow-sm">
            <CardHeader className={cn(cardHeaderTight, 'pb-2')}>
              <CardTitle className="text-base">Quick record</CardTitle>
              <CardDescription>Tag new transactions to this job for P&amp;L tracking.</CardDescription>
            </CardHeader>
            <CardContent className={cn(cardContentTight, 'pt-0 space-y-2')}>
              <RelatedLink to={recordPaths.invoiceCreate} label="New invoice" icon={FileText} />
              <RelatedLink to={recordPaths.billCreate} label="New bill" />
              <RelatedLink to={recordPaths.expenseCreate} label="New expense" />
            </CardContent>
          </Card>

          {(job.fixed_asset?.id || hasLegacySalesLink || job.invoice?.id) && (
            <Card className="shadow-sm">
              <CardHeader className={cn(cardHeaderTight, 'pb-2')}>
                <CardTitle className="text-base">Related</CardTitle>
                <CardDescription>Linked documents and assets.</CardDescription>
              </CardHeader>
              <CardContent className={cn(cardContentTight, 'pt-0 space-y-2')}>
                {job.fixed_asset?.id ? (
                  <RelatedLink
                    to={`${fixedAssetBase}/${job.fixed_asset.id}`}
                    label={job.fixed_asset.asset_name || 'Fixed asset'}
                    meta={job.fixed_asset.asset_code || job.fixed_asset.status}
                    icon={Wrench}
                  />
                ) : null}
                {hasLegacySalesLink ? (
                  <RelatedLink
                    to={`${salesOrderBase}/${job.sales_order.id}`}
                    label={job.sales_order.so_number}
                    meta={job.sales_order.status}
                  />
                ) : null}
                {job.invoice?.id ? (
                  <RelatedLink
                    to={`${invoiceBase}/${job.invoice.id}`}
                    label={job.invoice.invoice_number}
                    meta={job.invoice.status}
                    icon={FileText}
                  />
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
