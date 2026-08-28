import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { formatCurrency, LIFECYCLE_COLORS } from '../constants';
import { DocumentCompanyFooter } from '@/pages/accounting/components/DocumentCompanyFooter';

function MicroBarcode({ value }) {
  const pattern = [1, 2, 1, 4, 1, 2, 1, 1, 2, 4, 1, 2, 1, 1, 4, 2, 1, 2, 1, 4, 1, 1, 2, 1];
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex h-7 items-end gap-[2px]">
        {pattern.map((w, i) => (
          <div
            key={i}
            className="h-full bg-slate-800"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      <p className="font-mono text-[9px] tracking-widest text-slate-500">{value}</p>
    </div>
  );
}

function customerLocation(customer) {
  if (!customer) return null;
  const city =
    customer.city ||
    customer.billing_city ||
    customer.shipping_city ||
    customer.address_city ||
    null;
  const country =
    customer.country_code ||
    customer.country ||
    customer.billing_country ||
    null;
  if (city && country) return `${city}, ${country}`;
  return city || country || null;
}

function barcodeValue(creditNote) {
  const raw = String(creditNote?.id ?? creditNote?.credit_note_number ?? '0').replace(/\D/g, '');
  return raw.padStart(12, '0').slice(-12);
}

/**
 * Unified boarding-pass document: header + line items + totals in one card.
 * No nested scroll regions — content flows naturally.
 */
export function CreditNoteTransactionTicket({
  creditNote,
  currency,
  invoiceBase,
}) {
  const lifecycle = creditNote.lifecycle_status || 'open';
  const remaining = Number(creditNote.remaining_amount) || 0;
  const location = customerLocation(creditNote.customer);
  const dateText =
    creditNote.credit_note_date_display || creditNote.credit_note_date || '—';
  const invoiceNumber = creditNote.invoice?.invoice_number;
  const invoiceId = creditNote.invoice?.id;
  const lines = Array.isArray(creditNote.lines) ? creditNote.lines : [];
  const subtotalAmt = Number(creditNote.subtotal) || 0;
  const taxAmt = Number(creditNote.tax_amount) || 0;
  const taxPct = subtotalAmt > 0 ? Math.round((taxAmt / subtotalAmt) * 1000) / 10 : 0;

  return (
    <article className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {/* ── Ticket header: details + financial stub ── */}
      <div className="flex w-full flex-col md:flex-row">
        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-baseline gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Credit Note
              </span>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {creditNote.credit_note_number || '—'}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                  LIFECYCLE_COLORS[lifecycle] || LIFECYCLE_COLORS.open,
                )}
              >
                {creditNote.lifecycle_label || String(lifecycle).replace(/_/g, ' ')}
              </span>
              {creditNote.is_posted ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Posted
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Draft
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Customer
              </p>
              <p className="mt-1.5 text-sm font-semibold text-slate-800">
                {creditNote.customer?.name || '—'}
              </p>
              {location ? (
                <p className="mt-0.5 text-xs text-slate-500">{location}</p>
              ) : null}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Details
              </p>
              <p className="mt-1.5 text-sm font-semibold text-slate-800">
                Date: {dateText}
              </p>
              {invoiceNumber ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  Invoice Ref:{' '}
                  {invoiceId ? (
                    <Link
                      to={`${invoiceBase}/${invoiceId}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {invoiceNumber}
                    </Link>
                  ) : (
                    invoiceNumber
                  )}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-400">Invoice Ref: —</p>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reason for Credit
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {creditNote.reason || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop stub divider with punch holes */}
        <div className="relative hidden w-4 shrink-0 self-stretch md:block" aria-hidden>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-r-2 border-dashed border-slate-200" />
          <span className="absolute left-1/2 top-0 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-[#F8FAFC]" />
          <span className="absolute bottom-0 left-1/2 z-10 size-3 -translate-x-1/2 translate-y-1/2 rounded-full border border-slate-200 bg-[#F8FAFC]" />
        </div>

        {/* Mobile dashed divider */}
        <div
          className="relative border-t-2 border-dashed border-slate-200 md:hidden"
          aria-hidden
        >
          <span className="absolute left-0 top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-[#F8FAFC]" />
          <span className="absolute right-0 top-0 size-3 translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-[#F8FAFC]" />
        </div>

        <div className="flex w-full flex-shrink-0 flex-col bg-slate-50 p-5 sm:p-6 md:w-72 md:min-w-[280px]">
          <div className="w-full">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Remaining Credit
            </p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-blue-600">
              {formatCurrency(remaining, currency)}
            </p>
          </div>

          <div className="mt-4 w-full space-y-2 border-t border-slate-200 pt-4 text-xs">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-slate-500">Total Credit</span>
              <span className="font-semibold tabular-nums text-slate-800">
                {formatCurrency(creditNote.total, currency)}
              </span>
            </div>
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-slate-500">Applied</span>
              <span className="font-medium tabular-nums text-slate-700">
                {formatCurrency(creditNote.amount_applied, currency)}
              </span>
            </div>
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-slate-500">Refunded</span>
              <span className="font-medium tabular-nums text-slate-700">
                {formatCurrency(creditNote.refunded_amount, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Line items (compact, no scroll) ── */}
      <div className="border-t border-dashed border-slate-200">
        <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Line items
          </p>
          <p className="text-[10px] font-medium tabular-nums text-slate-400">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </p>
        </div>

        {lines.length === 0 ? (
          <p className="px-5 pb-5 text-sm italic text-slate-400 sm:px-6">
            No line items on this credit note.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {/* Column labels */}
            <li className="hidden grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_5.5rem_6.5rem] gap-3 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:grid sm:px-6">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Tax</span>
              <span className="text-right">Amount</span>
            </li>

            {lines.map((line) => (
              <li
                key={line.id}
                className="grid grid-cols-1 gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_5.5rem_6.5rem] sm:items-start sm:gap-3 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {line.description || '—'}
                  </p>
                  {line.product_name ? (
                    <p className="mt-0.5 text-xs text-slate-500">{line.product_name}</p>
                  ) : null}
                  {/* Mobile-only meta */}
                  <p className="mt-1.5 text-xs text-slate-500 sm:hidden">
                    Qty {line.quantity} · {formatCurrency(line.unit_price, currency)}
                    {' · Tax '}
                    {formatCurrency(line.tax_amount, currency)}
                  </p>
                </div>
                <p className="hidden text-right text-sm tabular-nums text-slate-700 sm:block">
                  {line.quantity}
                </p>
                <p className="hidden text-right text-sm tabular-nums text-slate-700 sm:block">
                  {formatCurrency(line.unit_price, currency)}
                </p>
                <p className="hidden text-right text-sm tabular-nums text-slate-700 sm:block">
                  {formatCurrency(line.tax_amount, currency)}
                </p>
                <p className="text-right text-sm font-semibold tabular-nums text-slate-900 sm:font-medium sm:text-slate-800">
                  {formatCurrency(line.amount, currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Footer: totals + barcode ── */}
      <div className="flex flex-col gap-5 border-t border-slate-200 bg-slate-50/60 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="space-y-4">
          <MicroBarcode value={barcodeValue(creditNote)} />
          <DocumentCompanyFooter
            company={creditNote.company}
            page="credit_note"
            className="max-w-md rounded-md border border-slate-200 bg-white px-3 py-2"
            textClassName="text-xs text-slate-700"
            showLabel
          />
        </div>

        <div className="w-full space-y-2 sm:w-72">
          <div className="flex items-center justify-between gap-6">
            <span className="text-sm text-slate-500">Subtotal</span>
            <span className="text-sm font-medium tabular-nums text-slate-700">
              {formatCurrency(creditNote.subtotal, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-sm text-slate-500">Tax ({taxPct}%)</span>
            <span className="text-sm font-medium tabular-nums text-slate-700">
              {formatCurrency(creditNote.tax_amount, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6 border-t border-slate-200 pt-3">
            <span className="text-sm font-bold text-slate-900">Total Amount</span>
            <span className="text-lg font-bold tabular-nums text-slate-900">
              {formatCurrency(creditNote.total, currency)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
