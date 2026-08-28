import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  PAYMENT_METHODS,
  APPROVAL_COLORS,
  applicationTypeLabel,
  sumPaymentApplications,
} from '../constants';
import { companyDocumentFooterFor } from '@/pages/accounting/lib/documentFooter';
import { documentNumberLabel } from '@/pages/accounting/lib/documentNumber';

const postedColors = {
  posted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  unposted: 'bg-amber-50 text-amber-800 border-amber-200',
};

function MetaRow({ label, value, children }) {
  if (!value && !children) return null;
  return (
    <tr>
      <td className="text-muted-foreground text-[11px] uppercase tracking-wide pe-4 py-1 text-end whitespace-nowrap align-top">
        {label}
      </td>
      <td className="py-1 text-end text-sm font-medium text-foreground whitespace-nowrap">
        {children ?? value}
      </td>
    </tr>
  );
}

function CompanyBlock({ company }) {
  if (!company) {
    return <p className="font-semibold text-base text-foreground">Company</p>;
  }

  return (
    <div>
      {company.logo_url ? (
        <img
          src={company.logo_url}
          alt={company.name || 'Company'}
          className="mb-3 max-h-12 w-auto object-contain"
        />
      ) : null}
      <p className="font-semibold text-base text-foreground">{company.name || 'Company'}</p>
      {company.address_display ? (
        <p className="text-sm text-muted-foreground whitespace-pre-line mt-1.5 leading-snug">
          {company.address_display}
        </p>
      ) : null}
      {(company.phone || company.email) && (
        <p className="text-sm text-muted-foreground mt-1.5">
          {[company.phone ? `Tel: ${company.phone}` : null, company.email]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}

function ReceiptHeader({ payment, methodLabel }) {
  const company = payment.company;
  const approval = payment.approval_status || 'approved';
  const isPosted = payment.is_posted;

  return (
    <div className="px-6 py-6 sm:px-8 border-b border-border/70">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
        <div className="min-w-0 flex-1">
          <CompanyBlock company={company} />
        </div>
        <div className="shrink-0 sm:text-right sm:min-w-[240px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Payment confirmation
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Receipt
          </h1>
          <table className="mt-4 text-sm sm:ms-auto">
            <tbody>
              <MetaRow label="Receipt no." value={documentNumberLabel(payment.receipt_number)} />
              <MetaRow
                label="Date"
                value={payment.payment_date_display || payment.payment_date}
              />
              {payment.reference ? (
                <MetaRow label="Reference" value={payment.reference} />
              ) : null}
              {methodLabel ? <MetaRow label="Method" value={methodLabel} /> : null}
              <MetaRow label="Status">
                {approval !== 'approved' ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize text-xs font-normal rounded-full',
                      APPROVAL_COLORS[approval] || APPROVAL_COLORS.approved,
                    )}
                  >
                    {approval}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize text-xs font-normal rounded-full',
                      postedColors[isPosted ? 'posted' : 'unposted'],
                    )}
                  >
                    {isPosted ? 'Posted' : 'Unposted'}
                  </Badge>
                )}
              </MetaRow>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AmountReceivedSection({ payment, currency, methodLabel }) {
  return (
    <div className="px-6 py-6 sm:px-8 border-b border-border/70 bg-muted/25">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Amount received
          </p>
          <p className="text-3xl sm:text-4xl font-bold tabular-nums text-foreground mt-1 tracking-tight">
            {formatCurrency(payment.amount, currency)}
          </p>
          {methodLabel ? (
            <p className="text-sm text-muted-foreground mt-1.5 capitalize">
              via {methodLabel}
              {payment.currency ? ` · ${payment.currency}` : ''}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-border/80 bg-background px-5 py-3 sm:min-w-[200px]">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Receipt total</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">
            {formatCurrency(payment.amount, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReceivedFromSection({ payment }) {
  const customer = payment.customer;
  const name = customer?.bill_name || customer?.name || '—';
  const address = customer?.billing_address_display || '';
  const phone = customer?.bill_phone || customer?.phone;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">
        Received from
      </p>
      <p className="font-semibold text-base text-foreground">{name}</p>
      {customer?.email ? (
        <p className="text-sm text-muted-foreground mt-1">{customer.email}</p>
      ) : null}
      {phone ? <p className="text-sm text-muted-foreground">{phone}</p> : null}
      {address ? (
        <p className="text-sm text-muted-foreground whitespace-pre-line mt-2 leading-relaxed">
          {address}
        </p>
      ) : null}
    </div>
  );
}

function PaymentInfoSection({
  payment,
  currency,
  depositAccountLabel,
  methodLabel,
  jobOrderBase,
}) {
  const showFx =
    payment.exchange_rate != null &&
    payment.currency &&
    Number(payment.base_amount) > 0 &&
    payment.currency !== payment.customer?.currency;

  const rows = [
    depositAccountLabel
      ? { label: 'Deposited to', value: depositAccountLabel }
      : null,
    methodLabel ? { label: 'Payment method', value: methodLabel, capitalize: true } : null,
    payment.reference ? { label: 'Reference', value: payment.reference } : null,
    payment.job_order
      ? {
          label: 'Job order',
          value: payment.job_order.job_number,
          link: jobOrderBase ? `${jobOrderBase}/${payment.job_order.id}` : null,
          sub: payment.job_order.title,
        }
      : null,
    showFx
      ? {
          label: 'Exchange rate',
          value: Number(payment.exchange_rate).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          }),
          sub: `Base: ${formatCurrency(payment.base_amount, payment.customer?.currency || currency)}`,
        }
      : null,
  ].filter(Boolean);

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">
        Payment details
      </p>
      {rows.length ? (
        <dl className="space-y-2.5 text-sm">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className={cn('font-medium text-foreground mt-0.5', row.capitalize && 'capitalize')}>
                {row.link ? (
                  <Link
                    to={row.link}
                    className="text-primary hover:underline print:text-foreground print:no-underline"
                  >
                    {row.value}
                  </Link>
                ) : (
                  row.value
                )}
                {row.sub ? (
                  <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                    {row.sub}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

function PartySection({
  payment,
  currency,
  depositAccountLabel,
  methodLabel,
  jobOrderBase,
}) {
  return (
    <div className="px-6 py-5 sm:px-8 border-b border-border/70">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
        <ReceivedFromSection payment={payment} />
        <PaymentInfoSection
          payment={payment}
          currency={currency}
          depositAccountLabel={depositAccountLabel}
          methodLabel={methodLabel}
          jobOrderBase={jobOrderBase}
        />
      </div>
    </div>
  );
}

function ApplicationsSection({ payment, currency, invoiceBase }) {
  const applications = payment.applications || [];
  if (!applications.length) return null;

  const th =
    'px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40 border-b border-border/70 text-left';
  const td = 'px-3 py-2.5 text-sm align-middle border-b border-border/50';

  return (
    <div className="px-6 py-5 sm:px-8 border-b border-border/70">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
        Applied to invoices
      </p>
      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr>
              <th className={th}>Invoice</th>
              <th className={cn(th, 'text-center w-28')}>Invoice date</th>
              <th className={cn(th, 'text-center w-28')}>Due date</th>
              <th className={th}>Type</th>
              <th className={cn(th, 'text-right w-32')}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className="last:[&_td]:border-b-0">
                <td className={cn(td, 'text-left')}>
                  {app.invoice_id ? (
                    <>
                      <Link
                        to={`${invoiceBase}/${app.invoice_id}`}
                        className="font-medium text-primary hover:underline print:hidden"
                      >
                        {documentNumberLabel(app.invoice_number)}
                      </Link>
                      <span className="font-medium hidden print:inline">
                        {documentNumberLabel(app.invoice_number)}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium text-muted-foreground">
                      {app.application_type === 'opening_balance' ? 'Opening balance' : 'Prepaid'}
                    </span>
                  )}
                  {app.credit_note_number ? (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Credit note {app.credit_note_number}
                    </span>
                  ) : null}
                  {app.source_invoice_number ? (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      From {app.source_invoice_number}
                    </span>
                  ) : null}
                </td>
                <td className={cn(td, 'text-center text-muted-foreground tabular-nums')}>
                  {app.invoice_date_display || app.invoice_date || '—'}
                </td>
                <td className={cn(td, 'text-center text-muted-foreground tabular-nums')}>
                  {app.due_date_display || app.due_date || '—'}
                </td>
                <td className={cn(td, 'text-muted-foreground')}>
                  {applicationTypeLabel(app.application_type)}
                </td>
                <td className={cn(td, 'text-right tabular-nums font-medium')}>
                  {formatCurrency(app.amount_applied, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummarySection({ payment, currency }) {
  const received = Number(payment.amount) || 0;
  const applied =
    payment.applied_amount != null
      ? Number(payment.applied_amount)
      : sumPaymentApplications(payment.applications);
  const unapplied = Number(payment.unapplied_amount) || Math.max(0, received - applied);
  const hasBreakdown = applied > 0.001 || unapplied > 0.001;

  if (!hasBreakdown) return null;

  return (
    <div className="px-6 py-5 sm:px-8 border-b border-border/70">
      <div className="flex justify-end">
        <div className="w-full sm:w-80 rounded-lg border border-border/70 bg-muted/20 px-4 py-3 space-y-2 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground pb-1">
            Payment summary
          </p>
          <div className="flex justify-between gap-4 tabular-nums">
            <span className="text-muted-foreground">Amount received</span>
            <span className="font-medium">{formatCurrency(received, currency)}</span>
          </div>
          {applied > 0.001 ? (
            <div className="flex justify-between gap-4 tabular-nums">
              <span className="text-muted-foreground">Applied to invoices</span>
              <span>{formatCurrency(applied, currency)}</span>
            </div>
          ) : null}
          {unapplied > 0.001 ? (
            <div className="flex justify-between gap-4 tabular-nums text-amber-800 font-medium">
              <span>Prepaid (unapplied)</span>
              <span>{formatCurrency(unapplied, currency)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MemoSection({ payment }) {
  const memo = (payment.memo || '').trim();
  if (!memo) return null;

  return (
    <div className="px-6 py-4 sm:px-8 border-b border-border/70">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
        Memo
      </p>
      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{memo}</p>
    </div>
  );
}

function CompanyFooterSection({ company, memo }) {
  const footer = companyDocumentFooterFor(company, 'payment_receipt');
  if (!footer) return null;
  // Avoid duplicating the same text when memo already holds the footer.
  if (footer === (memo || '').trim()) return null;

  return (
    <div className="px-6 py-4 sm:px-8 border-b border-border/70 bg-muted/20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
        Company notes
      </p>
      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{footer}</p>
    </div>
  );
}

function FooterSection({ company }) {
  const name = company?.name?.trim();
  const message = name
    ? `Thank you for your payment. This receipt confirms that ${name} has recorded your payment. Please retain this document for your records.`
    : 'Thank you for your payment. Please retain this receipt for your records.';

  return (
    <div className="px-6 py-5 sm:px-8 bg-muted/15 text-center">
      <p className="text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto">{message}</p>
      {company?.email ? (
        <p className="text-xs text-muted-foreground mt-2">
          Questions?{' '}
          <span className="text-foreground">{company.email}</span>
          {company.phone ? (
            <>
              {' '}
              · <span className="text-foreground">{company.phone}</span>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Printable payment receipt for clients (company header, customer, allocations, totals).
 */
export function PaymentReceiptDocument({
  payment,
  workspaceId,
  depositAccountLabel,
  className,
}) {
  const currency = payment.currency || payment.customer?.currency || 'USD';
  const methodLabel =
    PAYMENT_METHODS.find((m) => m.value === payment.payment_method)?.label ||
    payment.payment_method;
  const invoiceBase = `/workspace/${workspaceId}/accounting/invoices`;
  const jobOrderBase = workspaceId
    ? `/workspace/${workspaceId}/accounting/job-orders`
    : null;

  return (
    <div
      id="payment-receipt-document"
      className={cn(
        'rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden text-sm',
        'print:shadow-none print:rounded-none print:border',
        className,
      )}
    >
      <div className="h-1 bg-foreground/85 print:bg-black" aria-hidden="true" />
      <ReceiptHeader payment={payment} methodLabel={methodLabel} />
      <AmountReceivedSection payment={payment} currency={currency} methodLabel={methodLabel} />
      <PartySection
        payment={payment}
        currency={currency}
        depositAccountLabel={depositAccountLabel}
        methodLabel={methodLabel}
        jobOrderBase={jobOrderBase}
      />
      <ApplicationsSection
        payment={payment}
        currency={currency}
        invoiceBase={invoiceBase}
      />
      <SummarySection payment={payment} currency={currency} />
      <MemoSection payment={payment} />
      <CompanyFooterSection company={payment.company} memo={payment.memo} />
      <FooterSection company={payment.company} />
    </div>
  );
}
