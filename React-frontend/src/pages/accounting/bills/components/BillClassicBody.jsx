import { formatCurrency, formatLineQtyWithUnit } from '../constants';
import {
  companyDocumentFooterFor,
  splitDocumentNotice,
} from '@/pages/accounting/lib/documentFooter';

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatUnitPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function formatBillNumber(value) {
  const s = String(value ?? '').trim();
  if (!s) return '—';
  return s.startsWith('#') ? s.slice(1) : s;
}

function formatDisplayDate(isoOrDisplay) {
  if (!isoOrDisplay) return '';
  const raw = String(isoOrDisplay).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return raw;
}

function contactParts(company) {
  if (!company) return [];
  return [company.phone, company.email, company.website].filter(
    (v) => v != null && String(v).trim() !== '',
  );
}

function addressLines(address) {
  if (!address) return [];
  return String(address)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const BLUE = '#0066ff';
const INK = '#111';
const MUTED = '#444';
const HAIR = '#666';

const DISPLAY_DEFAULTS = {
  show_company_header: true,
  show_vendor: true,
  vendor_show_address: true,
  show_custom_fields: true,
  show_line_items: true,
  show_notes: true,
  show_footer: true,
};

/**
 * Commercial vendor-bill layout — same visual language as InvoiceClassicBody.
 * Used for both on-screen view and print.
 */
export function BillClassicBody({ bill, display: displayProp }) {
  const display = { ...DISPLAY_DEFAULTS, ...(displayProp || {}) };
  const currency = bill.currency || bill.vendor?.currency || 'USD';
  const lines = Array.isArray(bill.lines) ? bill.lines : [];
  const customFields = display.show_custom_fields
    ? bill.custom_fields_display || []
    : [];

  const anyDiscount = Number(bill.discount_amount) > 0.0001;
  const anyTax = Number(bill.tax_amount) > 0.0001;
  const anyOther = Number(bill.other_charges) > 0.0001;
  const settlementDiscount = Number(
    bill.settlement_discount_total ??
      (bill.payment_applications || []).reduce(
        (sum, p) => sum + (Number(p.settlement_discount) || 0),
        0,
      ),
  );
  const anySettlementDiscount = settlementDiscount > 0.0001;
  const cashApplied = Number(
    bill.cash_applied_total ??
      (bill.payment_applications || []).reduce(
        (sum, p) =>
          sum + (!p.vendor_credit_id ? Number(p.amount_applied) || 0 : 0),
        0,
      ),
  );
  const anyPaid = Number(bill.amount_paid) > 0.0001;
  const anyBalance = Number(bill.balance_due) > 0.0001;

  const company = bill.company;
  const vendor = bill.vendor;
  const vendorName = vendor?.name || '—';
  const vendorAddress = (bill.vendor_address && String(bill.vendor_address).trim()) || '';
  const showVendor = display.show_vendor !== false;

  const companyContacts = contactParts(company);
  const companyAddress = addressLines(company?.address_display);

  const companyFooterText =
    display.show_footer !== false ? companyDocumentFooterFor(company, 'bill') : '';
  const notesText = display.show_notes !== false ? (bill.notes || '').trim() : '';
  const bankLegalText = [companyFooterText, notesText]
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .join('\n\n');
  const billNotice = splitDocumentNotice(company?.document_bill_notice);
  const closingMessage =
    (company?.document_closing_message || '').trim() ||
    'Thank you for your partnership. Please process this vendor bill promptly.';
  const signoff = (company?.document_signoff || '').trim() || 'Accounts Payable';

  const billDate = formatDisplayDate(bill.bill_date || bill.bill_date_display);
  const dueDate = formatDisplayDate(bill.due_date || bill.due_date_display);

  const colBorder = `1px solid ${HAIR}`;
  const headBorder = `1.5px solid ${INK}`;

  const totalRows = [
    ['Subtotal', formatAmount(bill.subtotal), false],
    anyDiscount ? ['Discount', `−${formatAmount(bill.discount_amount)}`, false] : null,
    anyTax ? ['Tax', formatAmount(bill.tax_amount), false] : null,
    anyOther ? ['Other charges', formatAmount(bill.other_charges), false] : null,
    ['TOTAL', formatAmount(bill.total), true],
    anySettlementDiscount && cashApplied > 0.0001
      ? ['Cash paid', formatAmount(cashApplied), false]
      : null,
    anySettlementDiscount
      ? ['Settlement discount', `−${formatAmount(settlementDiscount)}`, false]
      : null,
    anyPaid && !anySettlementDiscount
      ? ['Paid', formatAmount(bill.amount_paid), false]
      : null,
    anyPaid && anySettlementDiscount
      ? ['Settled', formatAmount(bill.amount_paid), false]
      : null,
    anyBalance ? ['Balance due', formatAmount(bill.balance_due), true] : null,
  ].filter(Boolean);

  return (
    <div
      className="bill-classic-body"
      style={{
        background: '#fff',
        color: INK,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12px',
        lineHeight: 1.35,
      }}
    >
      {display.show_company_header !== false ? (
        <header style={{ padding: '22px 36px 0', textAlign: 'center' }}>
          {company?.logo_url ? (
            <img
              src={company.logo_url}
              alt=""
              style={{
                display: 'block',
                margin: '0 auto 10px',
                maxHeight: 58,
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          ) : null}
          <div
            style={{
              fontSize: '19px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {company?.name || 'Company'}
          </div>
          {companyAddress.length > 0 ? (
            <div
              style={{
                marginTop: 7,
                fontSize: '11px',
                color: MUTED,
                maxWidth: 540,
                marginLeft: 'auto',
                marginRight: 'auto',
                lineHeight: 1.45,
              }}
            >
              {companyAddress.join(', ')}
            </div>
          ) : null}
          {companyContacts.length > 0 ? (
            <div style={{ marginTop: 3, fontSize: '11px', color: MUTED }}>
              {companyContacts.join('  |  ')}
            </div>
          ) : null}
          <div style={{ marginTop: 14, borderBottom: `1px solid ${INK}` }} />
        </header>
      ) : null}

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 28,
          padding: '16px 36px 18px',
        }}
      >
        <div>
          {showVendor ? (
            <>
              <div style={{ color: MUTED, fontSize: '12px' }}>Vendor:</div>
              <div style={{ marginTop: 2, color: INK, fontWeight: 700, fontSize: '13px' }}>
                {vendorName}
              </div>
              {display.vendor_show_address !== false && vendorAddress ? (
                <div
                  style={{
                    marginTop: 2,
                    color: INK,
                    whiteSpace: 'pre-line',
                    lineHeight: 1.45,
                  }}
                >
                  {vendorAddress}
                </div>
              ) : null}
              {vendor?.email ? (
                <div style={{ marginTop: 4, color: MUTED, fontSize: '11px' }}>{vendor.email}</div>
              ) : null}
              {bill.warehouse?.name ? (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#777',
                    }}
                  >
                    Warehouse
                  </div>
                  <div style={{ marginTop: 2, fontWeight: 600 }}>
                    {bill.warehouse.name}
                    {bill.warehouse.code ? ` (${bill.warehouse.code})` : ''}
                  </div>
                </div>
              ) : null}
              {bill.is_drop_ship && bill.drop_ship_customer?.name ? (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#777',
                    }}
                  >
                    Drop ship to
                  </div>
                  <div style={{ marginTop: 2, fontWeight: 700 }}>
                    {bill.drop_ship_customer.name}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {customFields.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              {customFields.map((field) => (
                <div
                  key={field.id || field.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.25fr 1fr',
                    gap: 4,
                    marginBottom: 2,
                    fontSize: '12px',
                    color: MUTED,
                  }}
                >
                  <span>{field.label}</span>
                  <span style={{ color: INK, fontWeight: 500, whiteSpace: 'pre-line' }}>
                    : {field.value ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-block', textAlign: 'center' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              Original
            </div>
            <div
              style={{
                width: 64,
                borderBottom: `1px solid ${INK}`,
                margin: '3px auto 0',
              }}
            />
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: '38px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Bill
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: '12px',
              fontWeight: 700,
              color: BLUE,
            }}
          >
            BILL NO. : {formatBillNumber(bill.bill_number)}
          </div>
          <div style={{ marginTop: 3, color: MUTED }}>dated {billDate || '—'}</div>
          <div
            style={{
              marginTop: 12,
              fontSize: '16px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            TOTAL {formatCurrency(bill.total, currency)}
          </div>
          {dueDate ? (
            <div style={{ marginTop: 3, color: MUTED }}>payable by {dueDate}</div>
          ) : null}
          {bill.reference ? (
            <div style={{ marginTop: 4, fontSize: '11px', color: MUTED }}>
              Vendor ref. {bill.reference}
            </div>
          ) : null}
          {bill.job_order?.job_number ? (
            <div style={{ marginTop: 4, fontSize: '11px', color: MUTED }}>
              Job {bill.job_order.job_number}
              {bill.job_order.title ? ` — ${bill.job_order.title}` : ''}
            </div>
          ) : null}
          {billNotice ? (
            <div
              style={{
                marginTop: 8,
                fontSize: '10px',
                lineHeight: 1.4,
                color: INK,
                maxWidth: 270,
                marginLeft: 'auto',
                textAlign: 'left',
              }}
            >
              {billNotice.title ? (
                <div style={{ fontWeight: 600 }}>{billNotice.title}</div>
              ) : null}
              {billNotice.body ? (
                <div style={{ color: MUTED, whiteSpace: 'pre-line' }}>{billNotice.body}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {display.show_line_items !== false ? (
        <section style={{ padding: '0 36px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col />
              <col style={{ width: '12%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr>
                {[
                  ['Description', 'left'],
                  ['Qty', 'right'],
                  ['Unit price', 'right'],
                  ['Amount', 'right'],
                ].map(([label, align]) => (
                  <th
                    key={label}
                    style={{
                      borderTop: headBorder,
                      borderBottom: headBorder,
                      borderLeft: colBorder,
                      borderRight: colBorder,
                      padding: '8px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      textAlign: align,
                      background: '#fff',
                      color: INK,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      border: colBorder,
                      padding: '18px 8px',
                      textAlign: 'center',
                      color: '#999',
                    }}
                  >
                    No line items.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const title = line.description || line.product_name || '—';
                  const subtitle =
                    line.product_name && line.description && line.product_name !== line.description
                      ? line.product_name
                      : line.product_sku || null;
                  return (
                    <tr key={line.id || idx}>
                      <td
                        style={{
                          border: colBorder,
                          padding: '7px 10px',
                          textAlign: 'left',
                          verticalAlign: 'top',
                        }}
                      >
                        <div>{title}</div>
                        {subtitle ? (
                          <div style={{ marginTop: 2, fontSize: '10px', color: '#777' }}>
                            {subtitle}
                            {line.product_sku && subtitle !== line.product_sku
                              ? ` · ${line.product_sku}`
                              : ''}
                          </div>
                        ) : null}
                      </td>
                      <td
                        style={{
                          border: colBorder,
                          padding: '7px 10px',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          verticalAlign: 'top',
                        }}
                      >
                        {formatLineQtyWithUnit(line)}
                      </td>
                      <td
                        style={{
                          border: colBorder,
                          padding: '7px 10px',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          verticalAlign: 'top',
                        }}
                      >
                        {formatUnitPrice(line.unit_price)}
                      </td>
                      <td
                        style={{
                          border: colBorder,
                          padding: '7px 10px',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          verticalAlign: 'top',
                        }}
                      >
                        {formatAmount(line.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 24,
              marginTop: 14,
            }}
          >
            <div style={{ flex: '1 1 auto', minWidth: 0, maxWidth: '58%' }}>
              {billDate ? (
                <div style={{ marginBottom: 8, fontWeight: 700, fontSize: '12px' }}>
                  Dated : {billDate}
                </div>
              ) : null}
              {anyBalance ? (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '12px' }}>** Outstanding balance</div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: '10px',
                      lineHeight: 1.45,
                      color: '#666',
                    }}
                  >
                    The balance shown is as of the bill date. Confirm the vendor account before
                    remittance.
                  </div>
                </div>
              ) : null}
            </div>

            <div
              style={{
                flex: '0 0 220px',
                width: 220,
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              {totalRows.map(([label, value, bold], i) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '5px 0',
                    borderBottom: i < totalRows.length - 1 ? `1px solid #e5e7eb` : 'none',
                  }}
                >
                  <span
                    style={{
                      flex: '0 0 auto',
                      fontSize: '12px',
                      fontWeight: bold ? 700 : 500,
                      color: bold ? INK : MUTED,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      flex: '1 1 auto',
                      textAlign: 'right',
                      fontSize: bold ? '13px' : '12px',
                      fontWeight: bold ? 700 : 500,
                      fontVariantNumeric: 'tabular-nums',
                      color: INK,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <footer style={{ padding: '18px 36px 20px' }}>
        {bankLegalText ? (
          <div
            style={{
              background: '#ececec',
              padding: '12px 14px',
              marginBottom: 16,
              fontSize: '10px',
              lineHeight: 1.5,
              color: MUTED,
              whiteSpace: 'pre-line',
            }}
          >
            {bankLegalText}
          </div>
        ) : null}

        <div style={{ fontSize: '12px' }}>{closingMessage}</div>
        {signoff ? (
          <div style={{ marginTop: 5 }}>
            <span
              style={{
                fontWeight: 700,
                color: BLUE,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                fontSize: '12px',
              }}
            >
              {signoff}
            </span>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 18,
            borderTop: `1px solid ${HAIR}`,
            paddingTop: 8,
            textAlign: 'center',
            fontSize: '10px',
            color: '#666',
          }}
        >
          This is a computer generated bill, no need of sign &amp; stamp
          {company?.name ? ` · Issued by ${company.name}` : ''}
        </div>
      </footer>
    </div>
  );
}
