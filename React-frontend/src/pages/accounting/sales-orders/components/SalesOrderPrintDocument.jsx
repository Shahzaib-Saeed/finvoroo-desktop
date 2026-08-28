import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatLineQty,
  SALES_ORDER_STATUSES,
} from '../constants';

function CompanyBlock({ company }) {
  if (!company) {
    return <p className="text-sm text-neutral-600">Company</p>;
  }
  return (
    <div>
      {company.logo_url ? (
        <img
          src={company.logo_url}
          alt=""
          className="mb-3 max-h-12 w-auto object-contain"
        />
      ) : null}
      <p className="font-semibold text-base text-neutral-900">{company.name || 'Company'}</p>
      {company.address_display ? (
        <p className="text-sm text-neutral-600 whitespace-pre-line mt-1 leading-snug">
          {company.address_display}
        </p>
      ) : null}
      <p className="text-sm text-neutral-600 mt-1">
        {[company.phone ? `Tel: ${company.phone}` : null, company.email].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

function MetaRow({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <tr>
      <td className="text-neutral-500 text-[10px] uppercase tracking-wide pe-4 py-1 text-end whitespace-nowrap align-top">
        {label}
      </td>
      <td className="py-1 text-end text-sm font-medium text-neutral-900 whitespace-nowrap">
        {value}
      </td>
    </tr>
  );
}

/**
 * Formal sales order for print/PDF — customer-facing layout, separate from show UI.
 */
export function SalesOrderPrintDocument({ salesOrder, className }) {
  const currency = salesOrder.currency || salesOrder.customer?.currency || 'USD';
  const status = salesOrder.status || 'draft';
  const statusLabel =
    SALES_ORDER_STATUSES.find((s) => s.value === status)?.label || status;
  const lines = salesOrder.lines || [];
  const shipTo = (salesOrder.shipping_address || '').trim();
  const billTo = (salesOrder.billing_address || '').trim();
  const showShipTo = shipTo !== '' && shipTo !== billTo;

  const anyLineDiscount = lines.some((l) => Number(l.discount) > 0.0001);
  const anyLineTax = lines.some(
    (l) => Number(l.tax_amount) > 0.0001 || Number(l.sale_tax_amount) > 0.0001,
  );

  const th =
    'border border-neutral-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 bg-neutral-100';
  const td = 'border border-neutral-300 px-3 py-2 text-sm text-neutral-900 align-middle';
  const tdNum = `${td} so-print-num tabular-nums`;
  const tdRight = `${td} text-right tabular-nums`;

  return (
    <div
      id="sales-order-print-document"
      className={cn(
        'hidden text-neutral-900 text-sm leading-normal max-w-[210mm] mx-auto bg-white',
        className,
      )}
      aria-hidden="true"
    >
      <div className="so-print-section border-b border-neutral-300 px-6 py-5">
        <div className="so-print-header-row flex flex-row justify-between items-start gap-8">
          <div className="so-print-company min-w-0 flex-1">
            <CompanyBlock company={salesOrder.company} />
          </div>
          <div className="so-print-meta-col shrink-0 text-right min-w-[220px]">
            <h1 className="text-2xl font-bold uppercase tracking-[0.15em] text-neutral-900">
              Sales order
            </h1>
            <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wide">
              Order confirmation
            </p>
            <table className="so-print-meta-table mt-4 text-sm w-full">
              <tbody>
                <MetaRow label="Order no." value={salesOrder.so_number} />
                <MetaRow
                  label="Order date"
                  value={salesOrder.order_date_display || salesOrder.order_date}
                />
                <MetaRow
                  label="Ship date"
                  value={salesOrder.ship_date_display || salesOrder.ship_date || '—'}
                />
                <MetaRow label="Status" value={statusLabel} />
                <MetaRow label="Currency" value={currency} />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="so-print-section border-b border-neutral-300 px-6 py-4">
        <div
          className={cn(
            'so-print-party-row gap-6',
            showShipTo ? 'so-print-party-row--split flex flex-row' : '',
          )}
        >
          <div className={cn('so-print-billto-col min-w-0', showShipTo ? 'flex-1' : 'w-full')}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Bill to
            </p>
            <p className="font-semibold text-base text-neutral-900">
              {salesOrder.customer?.name || '—'}
            </p>
            {salesOrder.customer?.email ? (
              <p className="text-sm text-neutral-600 mt-1">{salesOrder.customer.email}</p>
            ) : null}
            {billTo ? (
              <p className="text-sm text-neutral-600 whitespace-pre-line mt-2 leading-relaxed">
                {billTo}
              </p>
            ) : null}
          </div>
          {showShipTo ? (
            <div className="so-print-shipto-col min-w-0 flex-1 border-s border-neutral-300 ps-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                Ship to
              </p>
              <p className="font-semibold text-base text-neutral-900">
                {salesOrder.customer?.name || '—'}
              </p>
              <p className="text-sm text-neutral-600 whitespace-pre-line mt-2 leading-relaxed">
                {shipTo}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="so-print-section border-b border-neutral-300 px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
          Order lines
        </p>
        <table className="so-print-lines-table w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${th} text-center w-10`}>#</th>
              <th className={`${th} text-left`}>Description</th>
              <th className={`${th} text-center w-20`}>Qty</th>
              <th className={`${th} text-center w-24`}>Rate</th>
              {anyLineDiscount ? (
                <th className={`${th} text-center w-24`}>Discount</th>
              ) : null}
              {anyLineTax ? <th className={`${th} text-center w-24`}>Tax</th> : null}
              <th className={`${th} text-center w-28`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={4 + 1 + (anyLineDiscount ? 1 : 0) + (anyLineTax ? 1 : 0)}
                  className={`${td} py-6 text-center text-neutral-500`}
                >
                  No line items.
                </td>
              </tr>
            ) : (
              lines.map((line, idx) => {
                const lineTax =
                  Number(line.tax_amount || 0) + Number(line.sale_tax_amount || 0);
                const disc = Number(line.discount || 0);

                return (
                  <tr key={line.id || idx}>
                    <td className={`${tdNum} text-neutral-500 w-10`}>{idx + 1}</td>
                    <td className={td}>
                      <p className="font-medium">{line.description || '—'}</p>
                      {line.product_name && line.product_name !== line.description ? (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {line.product_name}
                          {line.product_sku ? ` · SKU ${line.product_sku}` : ''}
                        </p>
                      ) : null}
                    </td>
                    <td className={tdNum}>{formatLineQty(line.quantity)}</td>
                    <td className={tdNum}>{formatCurrency(line.unit_price, currency)}</td>
                    {anyLineDiscount ? (
                      <td className={tdNum}>
                        {disc > 0.0001 ? `−${formatCurrency(disc, currency)}` : '—'}
                      </td>
                    ) : null}
                    {anyLineTax ? (
                      <td className={tdNum}>
                        {line.tax_rate?.name ? (
                          <span className="block text-[10px] text-neutral-500">
                            {line.tax_rate.name}
                          </span>
                        ) : null}
                        {lineTax > 0 ? formatCurrency(lineTax, currency) : '—'}
                      </td>
                    ) : null}
                    <td className={`${tdNum} font-medium`}>
                      {formatCurrency(line.amount, currency)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-300">
              <td
                colSpan={4 + (anyLineDiscount ? 1 : 0) + (anyLineTax ? 1 : 0)}
                className={`${tdRight} py-2 text-neutral-600`}
              >
                Subtotal
              </td>
              <td className={`${tdRight} py-2 font-medium`}>
                {formatCurrency(salesOrder.subtotal, currency)}
              </td>
            </tr>
            {Number(salesOrder.invoice_discount) > 0 ? (
              <tr>
                <td
                  colSpan={4 + (anyLineDiscount ? 1 : 0) + (anyLineTax ? 1 : 0)}
                  className={`${tdRight} py-2 text-neutral-600`}
                >
                  Order discount
                </td>
                <td className={`${tdRight} py-2 text-neutral-800`}>
                  − {formatCurrency(salesOrder.invoice_discount, currency)}
                </td>
              </tr>
            ) : null}
            {Number(salesOrder.tax_amount) > 0 ? (
              <tr>
                <td
                  colSpan={4 + (anyLineDiscount ? 1 : 0) + (anyLineTax ? 1 : 0)}
                  className={`${tdRight} py-2 text-neutral-600`}
                >
                  Tax
                </td>
                <td className={`${tdRight} py-2`}>
                  {formatCurrency(salesOrder.tax_amount, currency)}
                </td>
              </tr>
            ) : null}
            <tr className="bg-neutral-50 border-t-2 border-neutral-400">
              <td
                colSpan={4 + (anyLineDiscount ? 1 : 0) + (anyLineTax ? 1 : 0)}
                className={`${tdRight} py-3 font-bold text-base`}
              >
                Order total
              </td>
              <td className={`${tdRight} py-3 font-bold text-lg text-neutral-900`}>
                {formatCurrency(salesOrder.total, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {salesOrder.notes?.trim() ? (
        <div className="so-print-section border-b border-neutral-300 px-6 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
            Notes
          </p>
          <p className="text-sm text-neutral-800 whitespace-pre-line leading-relaxed">
            {salesOrder.notes}
          </p>
        </div>
      ) : null}

      {(salesOrder.quotation?.quote_number || salesOrder.job_order?.job_number) && (
        <div className="so-print-section border-b border-neutral-300 px-6 py-3 text-xs text-neutral-600">
          {salesOrder.quotation?.quote_number ? (
            <p>
              <span className="font-semibold uppercase tracking-wide text-neutral-500">
                Quotation ref:{' '}
              </span>
              {salesOrder.quotation.quote_number}
            </p>
          ) : null}
          {salesOrder.job_order?.job_number ? (
            <p className={salesOrder.quotation?.quote_number ? 'mt-1' : ''}>
              <span className="font-semibold uppercase tracking-wide text-neutral-500">
                Job ref:{' '}
              </span>
              {salesOrder.job_order.job_number}
            </p>
          ) : null}
        </div>
      )}

      <div className="so-print-section px-6 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
          Acceptance
        </p>
        <div className="grid grid-cols-2 gap-10">
          <div>
            <div className="border-b border-neutral-400 h-10 mb-2" />
            <p className="text-xs text-neutral-600">Customer signature / date</p>
          </div>
          <div>
            <div className="border-b border-neutral-400 h-10 mb-2" />
            <p className="text-xs text-neutral-600">Authorized representative</p>
          </div>
        </div>
      </div>

      <div className="so-print-section px-6 py-4 border-t border-neutral-200 text-[10px] text-neutral-500 leading-relaxed">
        <p>
          This document is a sales order confirmation
          {salesOrder.company?.name ? ` from ${salesOrder.company.name}` : ''}. Prices are in{' '}
          {currency} unless stated otherwise. Please review quantities and totals before
          confirming your order.
        </p>
        {salesOrder.created_at ? (
          <p className="mt-1">Document generated from record dated {salesOrder.created_at}.</p>
        ) : null}
      </div>
    </div>
  );
}
