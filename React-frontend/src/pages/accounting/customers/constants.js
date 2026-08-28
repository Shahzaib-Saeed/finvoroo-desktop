export const EMPTY_CUSTOMER_FORM = {
  customer_code: "",
  name: "",
  status: "active",
  contact_title: "",
  contact_first_name: "",
  contact_last_name: "",
  email: "",
  phone: "",
  mobile: "",
  website: "",
  second_contact_person: "",
  job_title: "",
  gender: "",
  fax: "",
  bill_address1: "",
  bill_name: "",
  bill_contact_person: "",
  bill_email: "",
  bill_phone: "",
  customer_account_number: "",
  shipping_same_as_billing: true,
  shipping_addresses: [],
  ntn: "",
  strn: "",
  cnic: "",
  revenue_account_id: "",
  receivable_account_id: "",
  invoice_template_id: "",
  currency: "",
  payment_terms_type: "net_days",
  payment_terms_days: 30,
  payment_terms_fixed_day: "",
  tax_id: "",
  tax_code: "",
  credit_limit: "",
  credit_status: "normal",
  balance_date: new Date().toISOString().slice(0, 10),
  opening_balance: "",
  preferred_payment_method: "",
  use_discount: false,
  discount_type: "percentage",
  discount_percent: "",
  discount_amount: "",
  billing_cycle: "1",
  send_statements: true,
  send_invoice_email: true,
  also_use_as_vendor: false,
  internal_notes: "",
  metadata_custom_fields: {},
};

export const EMPTY_SHIPPING_ADDRESS = {
  ship_name: "",
  ship_address1: "",
  ship_city: "",
  ship_state: "",
  ship_postal_code: "",
  ship_country: "",
};

export function mapCustomerToForm(customer) {
  if (!customer) return { ...EMPTY_CUSTOMER_FORM };

  return {
    ...EMPTY_CUSTOMER_FORM,
    customer_code: customer.customer_code || "",
    name: customer.name || "",
    status: customer.is_active === false ? "inactive" : "active",
    contact_title: customer.contact_title || "",
    contact_first_name: customer.contact_first_name || "",
    contact_last_name: customer.contact_last_name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    mobile: customer.mobile || "",
    website: customer.website || "",
    second_contact_person: customer.second_contact_person || "",
    job_title: customer.job_title || "",
    gender: customer.gender || "",
    fax: customer.fax || "",
    bill_address1:
      customer.address_line1 ||
      customer.address ||
      customer.bill_address1 ||
      "",
    bill_name: customer.bill_name || "",
    bill_contact_person: customer.bill_contact_person || "",
    bill_email: customer.bill_email || "",
    bill_phone: customer.bill_phone || "",
    customer_account_number: customer.customer_account_number || "",
    shipping_same_as_billing: !(customer.shipping_addresses?.length > 0),
    shipping_addresses: customer.shipping_addresses || [],
    ntn: customer.ntn || "",
    strn: customer.strn || "",
    cnic: customer.cnic || "",
    revenue_account_id: customer.revenue_account_id
      ? String(customer.revenue_account_id)
      : "",
    receivable_account_id: customer.receivable_account_id
      ? String(customer.receivable_account_id)
      : "",
    invoice_template_id: customer.invoice_template_id
      ? String(customer.invoice_template_id)
      : "",
    currency: customer.currency || "",
    payment_terms_type: customer.payment_terms_type || "net_days",
    payment_terms_days: customer.payment_terms_days ?? 30,
    payment_terms_fixed_day: customer.payment_terms_fixed_day ?? "",
    tax_id: customer.tax_id || "",
    tax_code: customer.tax_code || "",
    credit_limit: customer.credit_limit ?? "",
    credit_status: customer.credit_status || "normal",
    balance_date:
      customer.balance_date || new Date().toISOString().slice(0, 10),
    opening_balance: customer.opening_balance ?? "",
    preferred_payment_method: customer.preferred_payment_method || "",
    use_discount: !!customer.use_discount,
    discount_type: customer.discount_type || "percentage",
    discount_percent: customer.discount_percent ?? "",
    discount_amount: customer.discount_amount ?? "",
    billing_cycle: String(customer.billing_cycle || "1"),
    send_statements: !!customer.send_statements,
    send_invoice_email: !!customer.send_invoice_email,
    also_use_as_vendor: !!customer.also_use_as_vendor,
    internal_notes: customer.internal_notes || customer.notes || "",
    metadata_custom_fields: customer.metadata_custom_fields || {},
  };
}

export function buildCustomerPayload(form) {
  return {
    ...form,
    credit_limit: form.credit_limit === "" ? null : Number(form.credit_limit),
    opening_balance:
      form.opening_balance === "" ? null : Number(form.opening_balance),
    payment_terms_days:
      form.payment_terms_days === "" ? null : Number(form.payment_terms_days),
    payment_terms_fixed_day:
      form.payment_terms_fixed_day === ""
        ? null
        : Number(form.payment_terms_fixed_day),
    discount_percent:
      form.discount_percent === "" ? null : Number(form.discount_percent),
    discount_amount:
      form.discount_amount === "" ? null : Number(form.discount_amount),
    revenue_account_id: form.revenue_account_id
      ? Number(form.revenue_account_id)
      : null,
    receivable_account_id: form.receivable_account_id
      ? Number(form.receivable_account_id)
      : null,
    invoice_template_id: form.invoice_template_id
      ? Number(form.invoice_template_id)
      : null,
    shipping_addresses: form.shipping_same_as_billing
      ? []
      : form.shipping_addresses,
  };
}

export function extractApiListItems(res) {
  const payload = res?.data;
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function formatCustomerAddress(customer) {
  if (!customer) return "";
  return [
    customer.bill_address1 || customer.address_line1 || customer.address,
    customer.city,
    customer.state,
    customer.postal_code,
    customer.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export function formatMoney(value, currency = "USD") {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Two-letter initials from contact names or customer display name. */
export function customerInitials(name, contactFirstName, contactLastName) {
  const first = String(contactFirstName || "").trim();
  const last = String(contactLastName || "").trim();
  if (first && last) return (first[0] + last[0]).toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (last) return last.slice(0, 2).toUpperCase();

  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
