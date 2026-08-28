import { customersApi } from '@/pages/accounting/customers/api/customers.api';
import { invoiceTemplatesApi } from '@/pages/accounting/invoice-templates/api/invoice-templates.api';

function mapTemplateRow(t) {
  return {
    id: Number(t.id),
    name: String(t.name ?? ''),
    is_default: !!t.is_default,
  };
}

export function normalizeInvoiceTemplateOptions(data = {}) {
  if (Array.isArray(data.invoice_templates) && data.invoice_templates.length > 0) {
    return {
      invoice_templates: data.invoice_templates.map(mapTemplateRow),
      default_template_id: data.default_template_id ?? null,
    };
  }

  if (Array.isArray(data.templates) && data.templates.length > 0) {
    return {
      invoice_templates: data.templates.map(mapTemplateRow),
      default_template_id: data.default_template_id ?? null,
    };
  }

  return {
    invoice_templates: [],
    default_template_id: data.default_template_id ?? null,
  };
}

function extractTemplateList(payload) {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchInvoiceTemplateOptionsFallback() {
  try {
    const res = await customersApi.formOptions();
    const normalized = normalizeInvoiceTemplateOptions(res.data?.data || {});
    if (normalized.invoice_templates.length > 0) return normalized;
  } catch {
    /* try next source */
  }

  try {
    const res = await invoiceTemplatesApi.list({ per_page: 100 });
    const rows = extractTemplateList(res.data);
    if (rows.length > 0) {
      const mapped = rows.map(mapTemplateRow);
      const defaultRow = mapped.find((t) => t.is_default) ?? mapped[0];

      return {
        invoice_templates: mapped,
        default_template_id: defaultRow?.id ?? null,
      };
    }
  } catch {
    /* no templates available */
  }

  return { invoice_templates: [], default_template_id: null };
}

export async function enrichLookupsWithInvoiceTemplates(lookups) {
  const base = lookups && typeof lookups === 'object' ? lookups : {};
  const normalized = normalizeInvoiceTemplateOptions(base);

  if (normalized.invoice_templates.length > 0) {
    return { ...base, ...normalized };
  }

  const fallback = await fetchInvoiceTemplateOptionsFallback();
  return { ...base, ...fallback };
}
