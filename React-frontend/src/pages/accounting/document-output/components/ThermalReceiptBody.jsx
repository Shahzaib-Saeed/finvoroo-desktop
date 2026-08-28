import { useMemo } from 'react';
import { resolveCompanyLogoUrl, getSystemBrandName, getSystemBrandTagline } from '@/lib/helpers';
import { formatReceiptMoney, formatReceiptPlainAmount, formatReceiptDateTime, roundReceiptWhole } from '@/lib/thermal-receipt-money';
import { cn } from '@/lib/utils';

function fmtQty(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n - Math.round(n)) < 0.00001) return String(Math.round(n));
  return n.toFixed(2).replace(/\.?0+$/, '');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatReceiptDate(isoOrDisplay) {
  if (!isoOrDisplay) return '';
  const raw = String(isoOrDisplay).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) return `${pad2(dmy[1])}/${pad2(dmy[2])}/${dmy[3]}`;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
  }
  return raw;
}

function receiptNumberDisplay(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.startsWith('#') ? raw : `#${raw}`;
}

function taxRowLabel(taxLabel, taxAmount, subtotal) {
  const tax = Number(taxAmount) || 0;
  const sub = Number(subtotal) || 0;
  const pct = sub > 0.0001 ? Math.round((tax / sub) * 100) : 0;
  return `${taxLabel} (${pct}%)`;
}

function lineDiscountAmount(line) {
  const qty = Number(line.quantity || 0);
  const unitPrice = Number(line.unit_price || 0);
  const gross = qty * unitPrice;
  const net = Number(line.line_total ?? line.amount);
  const explicit = Number(line.discount_amount ?? 0);
  if (explicit > 0.0001) return explicit;
  const disc = Number(line.discount ?? 0);
  if (disc > 0.0001) {
    if (line.discount_type === 'percent') return gross * (disc / 100);
    return disc;
  }
  if (Number.isFinite(net) && gross > net + 0.0001) return gross - net;
  return 0;
}

function formatAddressOneLine(address) {
  if (!address) return '';
  return String(address)
    .replace(/\s*\n+\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function paymentMethodLabel(payments, amountPaid) {
  if (payments.length > 0) {
    const method = String(payments[0].method || 'Cash').trim();
    return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
  }
  if (Number(amountPaid) > 0.0001) return 'Cash';
  return 'Cash';
}

function ThermalSystemBrand() {
  const name = getSystemBrandName();
  const tagline = getSystemBrandTagline();
  const line = [name, tagline].filter(Boolean).join(' • ');

  return (
    <div className="thermal-system-brand" aria-label="System">
      <div className="thermal-system-brand-line">{line}</div>
    </div>
  );
}

function ThermalMetaRow({ label, value, strong = false }) {
  if (!value) return null;
  return (
    <div className="thermal-meta-row">
      <span className="thermal-meta-row-label">{label}</span>
      <span className={`thermal-meta-row-value${strong ? ' thermal-meta-row-value--strong' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function ThermalBrandingFooter({ company, narrow, showLogo, signoff }) {
  const name = company?.name || 'Store';
  const tagline = signoff || company?.document_signoff || 'Thank you for your trust';
  const logoSrc = resolveCompanyLogoUrl(company);
  const phone = company?.phone ? String(company.phone).trim() : '';

  return (
    <section
      className={`thermal-branding-footer${narrow ? ' thermal-branding-footer--58' : ''}`}
      aria-label="Store branding"
    >
      <div className="thermal-branding-cut" aria-hidden>
        - - - - - - - - - - - - - - -
      </div>
      <p className="thermal-branding-flip">Flip receipt · store details</p>
      {showLogo && logoSrc ? (
        <img
          src={logoSrc}
          alt=""
          className="thermal-branding-logo"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <div className="thermal-branding-name">{name}</div>
      {phone ? <div className="thermal-branding-phone">{phone}</div> : null}
      <div className="thermal-branding-tagline">{tagline}</div>
    </section>
  );
}

function isPosFeeLine(line, feeLabel = 'POS Fee') {
  if (line?.is_pos_fee) return true;
  if (line?.product_id) return false;
  const desc = String(line.description || line.product_name || line.name || '')
    .trim()
    .toLowerCase();
  const label = String(feeLabel || 'POS Fee')
    .trim()
    .toLowerCase();
  return desc === label || desc === 'pos fee';
}

function lineTotalAmount(line) {
  const explicit = Number(line.line_total ?? line.amount);
  if (Number.isFinite(explicit)) return explicit;
  const qty = Number(line.quantity || 0);
  const unit = Number(line.unit_price || 0);
  return qty * unit;
}

function sumLineTotals(lines) {
  return Math.round((lines || []).reduce((sum, line) => sum + lineTotalAmount(line), 0) * 100) / 100;
}

function splitPosFeeLines(lines, feeLabel = 'POS Fee') {
  let posFee = 0;
  const productLines = [];
  for (const line of lines || []) {
    if (isPosFeeLine(line, feeLabel)) {
      posFee += lineTotalAmount(line);
    } else {
      productLines.push(line);
    }
  }
  return {
    productLines,
    posFee: Math.max(0, Math.round(posFee * 100) / 100),
  };
}

/**
 * Pharmacy / POS thermal invoice — 58mm / 80mm, black-only.
 */
export function ThermalReceiptBody({
  company,
  documentNumber,
  documentDate,
  documentDateTime,
  customer,
  lines = [],
  subtotal,
  discountAmount = 0,
  taxAmount = 0,
  taxLabel = 'Tax',
  posFeeAmount = 0,
  posFeeLabel = 'POS Fee',
  total,
  amountPaid,
  balanceDue,
  payments = [],
  changeDue = 0,
  currency = 'USD',
  widthMm = 80,
  showLogo = true,
  showBrandingBack = false,
  className = '',
  preview = false,
  wholeRupees = false,
}) {
  const feeSplit = useMemo(
    () => splitPosFeeLines(lines, posFeeLabel),
    [lines, posFeeLabel],
  );
  const posFee =
    Number(posFeeAmount) > 0.0001 ? Number(posFeeAmount) : feeSplit.posFee;
  const receiptLines = posFee > 0.0001 ? feeSplit.productLines : lines;
  const linesSubtotal = sumLineTotals(receiptLines);
  const baseSubtotal = Number(subtotal ?? total) || 0;
  const displaySubtotal =
    linesSubtotal > 0.0001
      ? linesSubtotal
      : posFee > 0.0001
        ? Math.max(0, baseSubtotal - posFee)
        : baseSubtotal;

  const narrow = widthMm <= 58;
  const sizeClass = narrow ? 'thermal-receipt-body--58' : 'thermal-receipt-body--80';
  const when = documentDateTime || formatReceiptDateTime(documentDate);
  const logoSrc = resolveCompanyLogoUrl(company);
  const logoVisible = showLogo && Boolean(logoSrc);
  const numberLabel = receiptNumberDisplay(documentNumber);
  const phone = company?.phone ? String(company.phone).trim() : '';
  const addressLine = formatAddressOneLine(company?.address_display);
  const paidLabel = paymentMethodLabel(payments, amountPaid);
  const summaryOpts = { wholeRupees };
  const lineOpts = { wholeRupees: false };
  const money = (value) => formatReceiptMoney(value, currency, summaryOpts);
  const cellAmount = (value) => formatReceiptPlainAmount(value, lineOpts);
  const lineDiscAmount = (value) => formatReceiptPlainAmount(value, lineOpts);

  const summarySubtotal = wholeRupees ? roundReceiptWhole(displaySubtotal) : displaySubtotal;
  const summaryDiscount = wholeRupees ? roundReceiptWhole(discountAmount) : discountAmount;
  const summaryTax = wholeRupees ? roundReceiptWhole(taxAmount) : taxAmount;
  const summaryPosFee = wholeRupees ? roundReceiptWhole(posFee) : posFee;
  const summaryPaid = wholeRupees ? roundReceiptWhole(amountPaid) : amountPaid;
  const summaryTotal = wholeRupees ? roundReceiptWhole(total) : total;
  const summaryChange = wholeRupees
    ? Math.max(0, summaryPaid - summaryTotal)
    : Math.max(0, Number(changeDue) || 0);
  const summaryBalance = wholeRupees ? roundReceiptWhole(balanceDue) : balanceDue;

  const showPaid = wholeRupees ? summaryPaid > 0 : Number(amountPaid) > 0.0001;
  const showChange = summaryChange > 0;
  const showDiscount = Number(discountAmount) > 0.0001;
  const showPosFee = posFee > 0.0001;
  const showTax = Number(taxAmount) > 0.0001;
  const showBalance = Number(balanceDue) > 0.0001;

  const sheet = (
    <div className={`thermal-receipt-sheet ${className}`.trim()}>
      <div
        className={cn(
          `thermal-receipt-body ${sizeClass}`,
          showBalance && 'thermal-receipt-body--unpaid',
        )}
      >
        {showBalance ? (
          <div className="thermal-unpaid-watermark" aria-hidden>
            UNPAID
          </div>
        ) : null}
        <header className="thermal-header">
          {logoVisible ? (
            <img
              src={logoSrc}
              alt=""
              className="thermal-logo"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
          <div className="thermal-store">{company?.name || 'Store'}</div>
          {addressLine ? <div className="thermal-address">{addressLine}</div> : null}
          {phone ? <div className="thermal-contact">{phone}</div> : null}
        </header>

        <hr className="thermal-rule" />

        <div className="thermal-meta">
          <ThermalMetaRow label="Receipt no" value={numberLabel} />
          <ThermalMetaRow label="Date & time" value={when} />
          <ThermalMetaRow label="Customer" value={customer} strong />
        </div>

        <hr className="thermal-rule" />

        <table className="thermal-items-table">
          <colgroup>
            <col className="thermal-col-item" />
            <col className="thermal-col-qty" />
            <col className="thermal-col-rate" />
            <col className="thermal-col-amt" />
          </colgroup>
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Qty</th>
              <th className="num">Rate</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {receiptLines.length === 0 ? (
              <tr>
                <td colSpan={4} className="thermal-empty">
                  No items
                </td>
              </tr>
            ) : (
              receiptLines.map((line, idx) => {
                const qty = fmtQty(line.quantity);
                const unitPrice = Number(line.unit_price || 0);
                const lineTotal =
                  Number(line.line_total ?? line.amount) ||
                  Number(line.quantity || 0) * unitPrice;
                const name = line.description || line.product_name || line.name || 'Item';
                const lineDisc = lineDiscountAmount(line);
                return (
                  <tr key={line.id || idx}>
                    <td>
                      <div className="thermal-item-name">{name}</div>
                      {lineDisc > 0.0001 ? (
                        <div className="thermal-item-disc">Disc {lineDiscAmount(lineDisc)}</div>
                      ) : null}
                    </td>
                    <td className="num">{qty}</td>
                    <td className="num">{cellAmount(unitPrice)}</td>
                    <td className="num thermal-item-amt">{cellAmount(lineTotal)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="thermal-summary">
          <div className="thermal-summary-row">
            <span>Subtotal</span>
            <span>{money(summarySubtotal)}</span>
          </div>
          {showDiscount ? (
            <div className="thermal-summary-row">
              <span>Discount</span>
              <span>−{money(summaryDiscount)}</span>
            </div>
          ) : null}
          {showPosFee ? (
            <div className="thermal-summary-row">
              <span>{posFeeLabel || 'POS Fee'}</span>
              <span>{money(summaryPosFee)}</span>
            </div>
          ) : null}
          {showTax ? (
            <div className="thermal-summary-row">
              <span>{taxRowLabel(taxLabel, summaryTax, summarySubtotal)}</span>
              <span>{money(summaryTax)}</span>
            </div>
          ) : null}
        </div>

        <div className="thermal-grand-total">
          <span className="thermal-grand-total-label">Total</span>
          <span className="thermal-grand-total-amount">{money(summaryTotal)}</span>
        </div>

        {showPaid ? (
          <div className="thermal-change-row">
            <span>{paidLabel} Paid</span>
            <span>{money(summaryPaid)}</span>
          </div>
        ) : null}
        {showChange ? (
          <div className="thermal-change-row thermal-change-row--strong">
            <span>Change</span>
            <span>{money(summaryChange)}</span>
          </div>
        ) : null}
        {showBalance ? (
          <>
            <div className="thermal-unpaid-stamp">Unpaid</div>
            <div className="thermal-change-row thermal-change-row--unpaid">
              <span>Amount due</span>
              <span>{money(summaryBalance)}</span>
            </div>
          </>
        ) : null}

        <hr className="thermal-rule" />

        <footer className="thermal-footer">
          <ThermalSystemBrand />
        </footer>

        {showBrandingBack ? (
          <ThermalBrandingFooter
            company={company}
            narrow={narrow}
            showLogo={showLogo}
          />
        ) : null}
      </div>
    </div>
  );

  if (preview) {
    return <div className="thermal-receipt-stage">{sheet}</div>;
  }

  return sheet;
}

/** Map invoice API payload → thermal receipt props. */
export function thermalReceiptFromInvoice(
  invoice,
  { widthMm = 80, showLogo = true, showBrandingBack = false, posFeeLabel = 'POS Fee' } = {},
) {
  if (!invoice) return null;
  const company = invoice.company || {};
  const customer = invoice.customer;
  const payments = (invoice.payment_applications || [])
    .map((p) => ({
      method: p.payment_method || p.method || 'Cash',
      amount: p.amount_applied ?? p.amount,
      reference: p.receipt_number || p.reference,
    }))
    .filter((p) => Number(p.amount) > 0);

  const changeDue = Math.max(
    0,
    Number(invoice.amount_paid || 0) - Number(invoice.total || 0),
  );

  const label = invoice.pos_fee_label || posFeeLabel || 'POS Fee';
  const explicitFee = Number(invoice.pos_fee ?? 0);
  const rawLines = invoice.lines || [];
  const { productLines, posFee: derivedFee } = splitPosFeeLines(rawLines, label);
  const posFee = explicitFee > 0.0001 ? explicitFee : derivedFee;
  const lines = posFee > 0.0001 ? productLines : rawLines;

  return {
    company,
    documentNumber: invoice.invoice_number,
    documentDate: invoice.invoice_date || invoice.invoice_date_display,
    customer: customer?.name || customer?.bill_name,
    lines,
    subtotal: invoice.subtotal,
    discountAmount: invoice.discount_amount,
    taxAmount: invoice.tax_amount,
    posFeeAmount: posFee,
    posFeeLabel: label,
    total: invoice.total,
    amountPaid: invoice.amount_paid,
    balanceDue: invoice.balance_due,
    payments,
    changeDue,
    currency: invoice.currency || 'USD',
    widthMm,
    showLogo,
    showBrandingBack,
  };
}

/** Map POS checkout receipt payload → thermal receipt props. */
export function thermalReceiptFromPos(
  receipt,
  {
    company,
    currency,
    widthMm = 80,
    showLogo = true,
    showBrandingBack = false,
    posFeeLabel = 'POS Fee',
    wholeRupees = false,
  } = {},
) {
  const inv = receipt?.invoice || {};
  const r = receipt?.receipt || {};
  const rawLines = inv.lines || r.lines || [];
  const label = r.pos_fee_label || inv.pos_fee_label || posFeeLabel || 'POS Fee';
  const explicitFee = Number(r.pos_fee ?? inv.pos_fee ?? receipt?.pos_fee ?? 0);
  const { productLines, posFee: derivedFee } = splitPosFeeLines(rawLines, label);
  const posFee = explicitFee > 0.0001 ? explicitFee : derivedFee;
  const lines = posFee > 0.0001 ? productLines : rawLines;

  const total = r.total ?? inv.total;
  const amountPaid = r.amount_paid ?? inv.amount_paid;
  const changeDue =
    r.change_due ??
    receipt?.change_due ??
    Math.max(0, Number(amountPaid || 0) - Number(total || 0));

  const co = {
    ...(company || {}),
    ...(inv.company || {}),
    logo_url:
      inv.company?.logo_url ||
      company?.logo_url ||
      inv.company?.logo ||
      company?.logo ||
      null,
  };
  return {
    company: co,
    documentNumber: r.invoice_number || inv.invoice_number,
    documentDate: inv.invoice_date_display || inv.invoice_date || r.invoice_date,
    documentDateTime: formatReceiptDateTime(
      inv.posted_at ||
        inv.created_at ||
        r.posted_at ||
        receipt?.posted_at ||
        new Date().toISOString(),
    ),
    customer: r.customer || inv.customer?.name || 'Walk-in Customer',
    lines,
    subtotal: inv.subtotal ?? r.subtotal,
    discountAmount: inv.discount_amount ?? r.discount_amount,
    taxAmount: inv.tax_amount ?? r.tax_amount,
    posFeeAmount: posFee,
    posFeeLabel: label,
    total,
    amountPaid,
    balanceDue: r.balance_due ?? inv.balance_due,
    payments: amountPaid ? [{ method: 'Cash', amount: amountPaid }] : [],
    changeDue,
    currency: currency || inv.currency || 'USD',
    widthMm,
    showLogo,
    showBrandingBack,
    wholeRupees,
  };
}
