import { formatCurrency, getCurrencySymbol } from '@/lib/currency';
import {
  buildCustomFieldSections,
  buildInvoiceCustomFieldDisplayRows,
  formatLineDiscountLabel,
  formatLineQtyLabel,
  formatLineTaxLabel,
  lineHasDiscount,
  lineHasTax,
  resolveUniversalLineDisplay,
} from '../invoice-print-display';
import {
  companyDocumentFooterFor,
  splitDocumentNotice,
} from '@/pages/accounting/lib/documentFooter';
import { cn } from '@/lib/utils';

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatInvoiceNumber(value) {
  const s = String(value ?? '').trim();
  if (!s) return '—';
  return s.startsWith('#') ? s.slice(1) : s;
}

function lineUnitLabel(line) {
  return line?.entered_unit_label || line?.entered_unit || line?.unit_label || '—';
}

function formatShortDate(isoOrDisplay) {
  if (!isoOrDisplay) return '';
  const raw = String(isoOrDisplay).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return raw;
}

function currencyHeaderLabel(currency) {
  const c = String(currency || 'USD').toUpperCase();
  if (c === 'PKR' || c === 'RS' || c === 'RS.') return 'PKR';
  return c;
}

function formatCurrencySpaced(value, currency) {
  const sym = getCurrencySymbol(currency);
  const spaced = sym.endsWith('.') ? `${sym} ` : sym;
  const n = Number(value);
  if (!Number.isFinite(n)) return `${spaced}—`;
  const formatted = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : ''}${spaced}${formatted}`;
}

function taxPercentLabel(invoice) {
  const sub = Number(invoice.subtotal);
  const tax = Number(invoice.tax_amount);
  if (!Number.isFinite(sub) || sub <= 0 || !Number.isFinite(tax)) return '0';
  return String(Math.round((tax / sub) * 100));
}

function addressParts(address) {
  if (!address) return [];
  return String(address)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function formatCompanyLines(company) {
  if (!company) return [];
  const lines = [];
  const addrParts = addressParts(company.address_display);

  if (addrParts.length > 0) {
    lines.push(addrParts[0]);
    if (addrParts.length > 1) {
      const rest = addrParts.slice(1).join(', ');
      lines.push(company.phone ? `${rest} | Tel: ${company.phone}` : rest);
    } else if (company.phone) {
      lines.push(`Tel: ${company.phone}`);
    }
  } else if (company.phone) {
    lines.push(`Tel: ${company.phone}`);
  }

  const taxEmail = [];
  const taxId = company.tax_id || company.ntn;
  if (taxId) taxEmail.push(`Tax ID / NTN: ${taxId}`);
  if (company.email) taxEmail.push(`Email: ${company.email}`);
  if (taxEmail.length) lines.push(taxEmail.join(' | '));

  return lines;
}

function parseBankLines(text) {
  if (!text) return [];
  return String(text)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith('•') || line.startsWith('-') ? line.replace(/^[•\-]\s*/, '') : line));
}

function MetaPair({ label, value }) {
  if (!value) return null;
  return (
    <div className="invoice-lp-meta-pair">
      <span className="invoice-lp-meta-label">{label}</span>
      <span className="invoice-lp-meta-value">{value}</span>
    </div>
  );
}

function RefPair({ label, value }) {
  return (
    <div className="invoice-lp-ref-row">
      <span>{label}:</span>
      <span>{value || '—'}</span>
    </div>
  );
}

const DEFAULT_FOOTER_NOTE =
  'In case of disputes, notify us within 5 days of vessel sailing. This is a computer-generated invoice and does not require a physical signature.';

/**
 * Universal commercial invoice body.
 * Columns: Description | Qty | Unit | Rate | (Discount?) | (Tax?) | Amount
 * Qty/Rate always come from DB quantity / unit_price (template label renames
 * only affect the create form). Discount/Tax columns appear when needed.
 */
export function InvoiceClassicBody({ invoice, display }) {
  const currency = invoice.currency || 'USD';
  const lines = Array.isArray(invoice.lines) ? invoice.lines : [];

  const customSections = buildCustomFieldSections(invoice);
  const customItems = display.show_custom_fields
    ? customSections.flatMap((s) => s.items)
    : [];

  const anyBalance = Number(invoice.balance_due) > 0.0001;
  const balanceAmount = anyBalance ? invoice.balance_due : invoice.total;

  const company = invoice.company;
  const customer = invoice.customer;
  const billName = customer?.bill_name || customer?.name || '—';
  const billAddress =
    (invoice.billing_address && String(invoice.billing_address).trim()) ||
    customer?.billing_address_display ||
    '';
  const showBillTo = display.show_bill_to !== false;
  const customerTaxId = customer?.tax_id || customer?.tax_number;

  const bankParts = [];
  const pushBank = (t, on) => {
    if (!on || !t) return;
    if (!bankParts.includes(t)) bankParts.push(t);
  };
  pushBank(companyDocumentFooterFor(company, 'invoice'), display.show_footer !== false);
  pushBank(
    (invoice.invoice_template?.footer_content || '').trim(),
    display.show_footer !== false,
  );
  const bankLines = parseBankLines(bankParts.join('\n'));

  const invoiceNotice = splitDocumentNotice(company?.document_invoice_notice);
  const customNote = display.show_notes !== false ? (invoice.notes || '').trim() : '';
  const footerNote = [invoiceNotice?.body, customNote, DEFAULT_FOOTER_NOTE]
    .filter(Boolean)
    .join(' ');

  const invoiceDate = formatShortDate(
    invoice.invoice_date || invoice.invoice_date_display,
  );
  const dueDate = formatShortDate(invoice.due_date || invoice.due_date_display);

  const customFieldRows = buildInvoiceCustomFieldDisplayRows(invoice, customItems);
  const amountHeader = `Amount (${currencyHeaderLabel(currency)})`;
  const taxLabel = `Sales Tax (${taxPercentLabel(invoice)}%)`;
  const companyLines = formatCompanyLines(company);

  const showDiscountCol = lines.some((line) => lineHasDiscount(line));
  const showTaxCol = lines.some((line) => lineHasTax(line));
  const colCount = 5 + (showDiscountCol ? 1 : 0) + (showTaxCol ? 1 : 0);

  return (
    <div className="invoice-classic-body invoice-lp">
      {display.show_company_header !== false ? (
        <header className="invoice-lp-header">
          <div className="invoice-lp-brand">
            <div className="invoice-lp-brand-row">
              <div className="invoice-lp-brand-bar" aria-hidden />
              <div>
                <div className="invoice-lp-company">{company?.name || 'Company'}</div>
                {companyLines.map((line, i) => (
                  <div key={i} className="invoice-lp-company-meta">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="invoice-lp-doc-meta">
            <div className="invoice-lp-doc-title">Invoice</div>
            <div className="invoice-lp-meta-grid">
              <MetaPair label="Invoice No:" value={formatInvoiceNumber(invoice.invoice_number)} />
              <MetaPair label="Date:" value={invoiceDate} />
              <MetaPair label="Due Date:" value={dueDate} />
            </div>
          </div>
        </header>
      ) : null}

      <hr className="invoice-lp-rule" />

      <section
        className={cn(
          'invoice-lp-info-grid',
          customFieldRows.length === 0 && 'invoice-lp-info-grid--single',
        )}
      >
        <div>
          {showBillTo ? (
            <>
              <div className="invoice-lp-section-label">Issued to</div>
              <div className="invoice-lp-party-name">{billName}</div>
              {display.bill_to_show_address !== false && billAddress ? (
                <div className="invoice-lp-party-detail">{billAddress}</div>
              ) : null}
              {customerTaxId ? (
                <div className="invoice-lp-party-detail invoice-lp-party-detail--ink">
                  Tax ID: {customerTaxId}
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {customFieldRows.length > 0 ? (
          <div className="invoice-lp-shipment-col">
            <div className="invoice-lp-section-label">Invoice details</div>
            {customFieldRows.map(({ key, label, value }) => (
              <RefPair key={key || label} label={label} value={value} />
            ))}
          </div>
        ) : null}
      </section>

      {display.show_line_items !== false ? (
        <section className="invoice-lp-table-wrap">
          <table className="invoice-lp-table">
            <colgroup>
              <col />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '11%' }} />
              {showDiscountCol ? <col style={{ width: '9%' }} /> : null}
              {showTaxCol ? <col style={{ width: '9%' }} /> : null}
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="l">Description</th>
                <th className="c">Qty</th>
                <th className="c">Unit</th>
                <th className="r">Rate</th>
                {showDiscountCol ? <th className="r">Discount</th> : null}
                {showTaxCol ? <th className="r">Tax</th> : null}
                <th className="r">{amountHeader}</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="invoice-lp-empty">
                    No line items.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const { qty, rate } = resolveUniversalLineDisplay(line);
                  return (
                    <tr key={line.id || idx}>
                      <td className="l">{line.description || line.product_name || '—'}</td>
                      <td className="c">{formatLineQtyLabel(qty)}</td>
                      <td className="c">{lineUnitLabel(line)}</td>
                      <td className="r">{formatRate(rate)}</td>
                      {showDiscountCol ? (
                        <td className="r">{formatLineDiscountLabel(line) || '—'}</td>
                      ) : null}
                      {showTaxCol ? (
                        <td className="r">{formatLineTaxLabel(line) || '—'}</td>
                      ) : null}
                      <td className="r">{formatAmount(line.amount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="invoice-lp-summary">
        <div className="invoice-lp-summary-left">
          {bankLines.length > 0 ? (
            <div className="invoice-lp-bank-box">
              <div className="invoice-lp-bank-title">Bank Remittance Details:</div>
              <ul className="invoice-lp-bank-list">
                {bankLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="invoice-lp-transfer-note">
            Make Cheque/Online Transfer to:{' '}
            <strong>{company?.name || 'Company'}</strong>
          </div>
        </div>

        <div className="invoice-lp-summary-right">
          <div className="invoice-lp-total-row">
            <span>Subtotal:</span>
            <span>{formatAmount(invoice.subtotal)}</span>
          </div>
          <div className="invoice-lp-total-row">
            <span>{taxLabel}:</span>
            <span>{formatAmount(invoice.tax_amount || 0)}</span>
          </div>
          <div className="invoice-lp-total-row invoice-lp-total-row--grand">
            <span>Total Amount:</span>
            <span>{formatCurrencySpaced(invoice.total, currency)}</span>
          </div>
          <div className="invoice-lp-balance-bar">
            <span>Balance Due:</span>
            <span>{formatCurrencySpaced(balanceAmount, currency)}</span>
          </div>
        </div>
      </section>

      <footer className="invoice-lp-footer">
        <div className="invoice-lp-footer-notes">{footerNote}</div>
        <div className="invoice-lp-signature">
          <div className="invoice-lp-signature-line" />
          <div className="invoice-lp-signature-label">Authorized Signature</div>
        </div>
      </footer>
    </div>
  );
}
