/**
 * Map API conversion preview `form.lines` into bill form line rows.
 */
export function mapConversionLinesToBillForm(lines = []) {
  return lines.map((line) => {
    const discType = line.discount_type === 'percent' ? 'percent' : 'fixed';
    const discount = line.discount ?? line.discount_percent ?? '';
    return {
      product_id: line.product_id ? String(line.product_id) : '',
      description: line.description || '',
      quantity: line.quantity != null ? String(line.quantity) : '',
      quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
      entered_unit: line.entered_unit ? String(line.entered_unit) : '',
      unit_price: line.unit_price != null ? String(line.unit_price) : '',
      discount: discount !== '' ? String(discount) : '',
      discount_type: discType,
      discount_fixed: '',
      discount_percent: '',
      net_total: '',
      tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
      sale_tax_amount:
        line.sale_tax_amount != null && line.sale_tax_amount !== ''
          ? String(line.sale_tax_amount)
          : '',
    };
  });
}

/**
 * Map API conversion preview `form.lines` into purchase order form line rows.
 */
export function mapConversionLinesToPoForm(lines = []) {
  return lines.map((line) => ({
    product_id: line.product_id ? String(line.product_id) : '',
    description: line.description || '',
    quantity: line.quantity != null ? String(line.quantity) : '',
    quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
    entered_unit: line.entered_unit ? String(line.entered_unit) : '',
    unit_price: line.unit_price != null ? String(line.unit_price) : '',
    discount: line.discount_percent != null ? String(line.discount_percent) : String(line.discount ?? ''),
    discount_type: 'percent',
    discount_fixed: '',
    discount_percent: line.discount_percent != null ? String(line.discount_percent) : '',
    net_total: '',
    tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
  }));
}

/**
 * Map API conversion preview `form.lines` into customer-facing document line rows.
 */
export function mapConversionLinesToSalesForm(lines = []) {
  return lines.map((line) => {
    const discType = line.discount_type === 'percent' ? 'percent' : 'fixed';
    const discount = line.discount ?? line.discount_percent ?? '';
    return {
      product_id: line.product_id ? String(line.product_id) : '',
      description: line.description || '',
      quantity: line.quantity != null ? String(line.quantity) : '',
      quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
      entered_unit: line.entered_unit ? String(line.entered_unit) : '',
      unit_price: line.unit_price != null ? String(line.unit_price) : '',
      discount: discount !== '' ? String(discount) : '',
      discount_type: discType,
      discount_fixed: '',
      discount_percent: '',
      net_total: '',
      tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
      sale_tax_amount:
        line.sale_tax_amount != null && line.sale_tax_amount !== ''
          ? String(line.sale_tax_amount)
          : '',
    };
  });
}

function normalizeMetadataMap(values) {
  if (!values || typeof values !== 'object') return {};
  const out = {};
  Object.entries(values).forEach(([id, val]) => {
    if (val == null || val === '') return;
    out[String(id)] = String(val);
  });
  return out;
}

export function applyBillConversionPreview(preview, EMPTY_BILL_LINE) {
  const form = preview?.form || {};
  const lines = mapConversionLinesToBillForm(form.lines || []);

  return {
    source_invoice_id: form.source_invoice_id ? String(form.source_invoice_id) : '',
    job_order_id: form.job_order_id ? String(form.job_order_id) : '',
    vendor_id: form.vendor_id ? String(form.vendor_id) : '',
    bill_date: form.bill_date || undefined,
    due_date: form.due_date || undefined,
    currency: form.currency || undefined,
    notes: form.notes || '',
    vendor_address: form.vendor_address || '',
    discount_amount:
      form.discount_amount != null ? String(form.discount_amount) : '',
    other_charges:
      form.other_charges != null ? String(form.other_charges) : '',
    invoice_template_id: form.invoice_template_id ? String(form.invoice_template_id) : '',
    template_custom:
      form.template_custom && typeof form.template_custom === 'object'
        ? { ...form.template_custom }
        : {},
    bill_metadata_custom_fields: normalizeMetadataMap(form.bill_metadata_custom_fields),
    lines: lines.length > 0 ? lines : [{ ...EMPTY_BILL_LINE }],
    _conversionSource: preview?.source || null,
    _conversionWarnings: preview?.warnings || [],
  };
}

export function applyPoConversionPreview(preview, EMPTY_PO_LINE) {
  const form = preview?.form || {};
  const lines = mapConversionLinesToPoForm(form.lines || []);

  return {
    source_invoice_id: form.source_invoice_id ? String(form.source_invoice_id) : '',
    vendor_id: form.vendor_id ? String(form.vendor_id) : '',
    order_date: form.order_date || undefined,
    expected_delivery: form.expected_delivery || undefined,
    notes: form.notes || '',
    discount_amount:
      form.discount_amount != null ? String(form.discount_amount) : '',
    other_charges:
      form.other_charges != null ? String(form.other_charges) : '',
    purchase_order_metadata_custom_fields: normalizeMetadataMap(form.purchase_order_metadata_custom_fields),
    lines: lines.length > 0 ? lines : [{ ...EMPTY_PO_LINE }],
    _conversionSource: preview?.source || null,
    _conversionWarnings: preview?.warnings || [],
  };
}

export function applyQuotationConversionPreview(preview, EMPTY_QUOTATION_LINE) {
  const form = preview?.form || {};
  const lines = mapConversionLinesToSalesForm(form.lines || []);

  return {
    customer_id: form.customer_id ? String(form.customer_id) : '',
    quote_date: form.quote_date || undefined,
    expiry_date: form.expiry_date || undefined,
    currency: form.currency || undefined,
    notes: form.notes || '',
    billing_address: form.billing_address || '',
    shipping_address: form.shipping_address || '',
    address_display: form.address_display || '',
    invoice_discount:
      form.invoice_discount != null ? String(form.invoice_discount) : '',
    quotation_metadata_custom_fields: normalizeMetadataMap(form.quotation_metadata_custom_fields),
    lines: lines.length > 0 ? lines : [{ ...EMPTY_QUOTATION_LINE }],
    _conversionSource: preview?.source || null,
    _conversionWarnings: preview?.warnings || [],
  };
}

export function applySalesOrderConversionPreview(preview, EMPTY_SALES_ORDER_LINE) {
  const form = preview?.form || {};
  const lines = mapConversionLinesToSalesForm(form.lines || []);

  return {
    customer_id: form.customer_id ? String(form.customer_id) : '',
    order_date: form.order_date || undefined,
    ship_date: form.ship_date || undefined,
    currency: form.currency || undefined,
    notes: form.notes || '',
    billing_address: form.billing_address || '',
    shipping_address: form.shipping_address || '',
    address_display: form.address_display || '',
    invoice_discount:
      form.invoice_discount != null ? String(form.invoice_discount) : '',
    sales_order_metadata_custom_fields: normalizeMetadataMap(form.sales_order_metadata_custom_fields),
    lines: lines.length > 0 ? lines : [{ ...EMPTY_SALES_ORDER_LINE }],
    _conversionSource: preview?.source || null,
    _conversionWarnings: preview?.warnings || [],
  };
}

export function applyInvoiceConversionPreview(preview, EMPTY_INVOICE_LINE) {
  const form = preview?.form || {};
  const lines = mapConversionLinesToSalesForm(form.lines || []);

  return {
    customer_id: form.customer_id ? String(form.customer_id) : '',
    job_order_id: form.job_order_id ? String(form.job_order_id) : '',
    sales_order_id: form.sales_order_id ? String(form.sales_order_id) : '',
    invoice_template_id: form.invoice_template_id ? String(form.invoice_template_id) : '',
    invoice_date: form.invoice_date || undefined,
    due_date: form.due_date || undefined,
    currency: form.currency || undefined,
    reference_number: form.reference_number || '',
    notes: form.notes || '',
    billing_address: form.billing_address || '',
    shipping_address: form.shipping_address || '',
    address_display: form.address_display || '',
    contact_person: form.contact_person || '',
    contact_email: form.contact_email || '',
    salesperson: form.salesperson || '',
    invoice_discount:
      form.invoice_discount != null ? String(form.invoice_discount) : '',
    payment_terms_type: form.payment_terms_type || 'net_days',
    payment_terms_days: form.payment_terms_days ?? 30,
    payment_terms_fixed_day: form.payment_terms_fixed_day ?? '',
    template_custom: form.template_custom && typeof form.template_custom === 'object'
      ? { ...form.template_custom }
      : {},
    invoice_metadata_custom_fields: normalizeMetadataMap(form.invoice_metadata_custom_fields),
    lines: lines.length > 0 ? lines : [{ ...EMPTY_INVOICE_LINE }],
    _conversionSource: preview?.source || null,
    _conversionWarnings: preview?.warnings || [],
  };
}

/** Apply API preview when creating an invoice from a job order. */
export function applyJobOrderInvoicePreview(preview, EMPTY_INVOICE_LINE) {
  return applyInvoiceConversionPreview(preview, EMPTY_INVOICE_LINE);
}

/** Apply API preview when creating a bill from a job order. */
export function applyJobOrderBillPreview(preview, EMPTY_BILL_LINE) {
  return applyBillConversionPreview(preview, EMPTY_BILL_LINE);
}

export const DOCUMENT_CONVERSION_TARGETS = [
  { target: 'quotation', label: 'Quotation', segment: 'quotations' },
  { target: 'sales_order', label: 'Sales order', segment: 'sales-orders' },
  { target: 'invoice', label: 'Invoice (copy)', segment: 'invoices' },
  { target: 'bill', label: 'Bill', segment: 'bills' },
  { target: 'purchase_order', label: 'Purchase order', segment: 'purchase-orders' },
];

export function documentConversionCreatePath(workspaceId, sourceType, sourceId, target) {
  const entry = DOCUMENT_CONVERSION_TARGETS.find((item) => item.target === target);
  if (!entry || !workspaceId || !sourceType || !sourceId) return null;
  return `/workspace/${workspaceId}/accounting/${entry.segment}/create?from_${sourceType}=${sourceId}`;
}

export function parseConversionSourceFromSearchParams(searchParams) {
  const pairs = [
    ['invoice', searchParams.get('from_invoice') || searchParams.get('invoice_id')],
    ['purchase_order', searchParams.get('from_purchase_order') || searchParams.get('purchase_order_id')],
    ['bill', searchParams.get('from_bill') || searchParams.get('bill_id')],
    ['quotation', searchParams.get('from_quotation') || searchParams.get('quotation_id')],
    ['sales_order', searchParams.get('from_sales_order') || searchParams.get('sales_order_id')],
  ];
  const found = pairs.find(([, value]) => value);
  if (!found) return null;
  return {
    sourceType: found[0],
    sourceId: found[1],
  };
}
