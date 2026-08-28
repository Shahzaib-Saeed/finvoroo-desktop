import {
  calcInvoiceTotals,
  calcLineTotals,
  isLineMeaningful,
  resolvePreviewInvoiceNumber,
} from './constants';

function formatPaymentTermsDisplay(form) {
  const type = form.payment_terms_type || 'net_days';
  if (type === 'due_on_receipt') return 'Due on receipt';
  if (type === 'fixed_day') {
    const day = form.payment_terms_fixed_day;
    return day != null && day !== ''
      ? `Due on day ${day} of each month`
      : 'Fixed day of month';
  }
  const days = form.payment_terms_days ?? 30;
  return `Net ${days} days`;
}

/**
 * Build a read-only invoice-shaped object for preview/print before save.
 */
export function buildPreviewInvoiceFromForm(form, ctx = {}) {
  const {
    customers = [],
    productsById = {},
    taxRatesById = {},
    selectedTemplate = null,
    company = null,
    invoiceNumberPreview = null,
  } = ctx;

  const customer = customers.find((c) => String(c.id) === String(form.customer_id));
  const totals = calcInvoiceTotals(form, taxRatesById);

  const lines = (form.lines || [])
    .filter(isLineMeaningful)
    .map((line, idx) => {
      const t = calcLineTotals(line, taxRatesById);
      const product = productsById[line.product_id];
      const taxRate = line.tax_rate_id ? taxRatesById[line.tax_rate_id] : null;

      return {
        id: `preview-line-${idx}`,
        description: line.description?.trim() || 'Item',
        product_name: product?.name || null,
        quantity: Number(line.quantity) || 0,
        unit_price: Number(line.unit_price) || 0,
        discount: t.discount,
        discount_type: line.discount_type || 'fixed',
        sale_tax_amount: Number(line.sale_tax_amount) || t.tax,
        tax_amount: t.tax,
        amount: t.total,
        unit_label: product?.unit_label || null,
        tax_rate: taxRate
          ? { name: taxRate.name, rate: taxRate.rate, type: taxRate.type }
          : null,
      };
    });

  const templateCustom = form.template_custom && typeof form.template_custom === 'object'
    ? form.template_custom
    : {};
  const metadata = form.invoice_metadata_custom_fields || {};
  const headerFields = selectedTemplate?.header_fields || [];
  const mergedCustom = { ...templateCustom };

  for (const field of headerFields) {
    if (field.definition_id == null || !field.field_key) continue;
    const metaVal =
      metadata[String(field.definition_id)] ?? metadata[field.definition_id];
    if (metaVal != null && String(metaVal).trim() !== '') {
      mergedCustom[field.field_key] = metaVal;
    }
  }

  return {
    id: null,
    invoice_number:
      resolvePreviewInvoiceNumber(form, invoiceNumberPreview) || 'Preview',
    status: 'draft',
    is_posted: false,
    approval_status: 'approved',
    invoice_date: form.invoice_date,
    due_date: form.due_date,
    currency: form.currency || 'USD',
    reference_number: form.reference_number || '',
    notes: form.notes || '',
    contact_person: form.contact_person || '',
    contact_email: form.contact_email || '',
    billing_address: form.billing_address || '',
    shipping_address: form.shipping_address || '',
    subtotal: totals.subtotal,
    discount_amount: totals.invoiceDiscount,
    tax_amount: totals.tax,
    total: totals.total,
    amount_paid: 0,
    balance_due: totals.total,
    deposit_amount: 0,
    payment_terms_display: formatPaymentTermsDisplay(form),
    customer: customer
      ? { id: customer.id, name: customer.name, email: customer.email }
      : null,
    company,
    lines,
    custom_field_values: mergedCustom,
    job_order_custom_fields: [],
    invoice_template: selectedTemplate
      ? {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          header_fields: selectedTemplate.header_fields || [],
          footer_content: null,
        }
      : null,
  };
}
