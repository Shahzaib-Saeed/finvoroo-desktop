import { format } from 'date-fns';
import { formatCurrency } from '../invoices/constants';

export { formatCurrency };

export const LIFECYCLE_COLORS = {
  open: 'bg-slate-100 text-slate-700 border-slate-200',
  partially_applied: 'bg-blue-100 text-blue-700 border-blue-200',
  fully_applied: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  partially_refunded: 'bg-amber-100 text-amber-700 border-amber-200',
  fully_refunded: 'bg-green-100 text-green-800 border-green-200',
};

export const LIFECYCLE_STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'partially_applied', label: 'Partially applied' },
  { value: 'fully_applied', label: 'Fully applied' },
  { value: 'partially_refunded', label: 'Partially refunded' },
  { value: 'fully_refunded', label: 'Fully refunded' },
];

export const EMPTY_CREDIT_NOTE_LINE = {
  product_id: '',
  invoice_line_id: '',
  description: '',
  original_quantity: '',
  returned_quantity: '',
  remaining_quantity: '',
  quantity: '1',
  unit_price: '0',
  tax_rate_id: '',
  tax_rate: 0,
  tax_name: '',
};

export const EMPTY_CREDIT_NOTE_FORM = {
  customer_id: '',
  invoice_id: '',
  credit_note_date: format(new Date(), 'yyyy-MM-dd'),
  amount: '',
  reason: '',
};

export function lineFromInvoiceApi(line) {
  return {
    ...EMPTY_CREDIT_NOTE_LINE,
    product_id: line.product_id ? String(line.product_id) : '',
    invoice_line_id: line.id ? String(line.id) : '',
    description: line.description || '',
    original_quantity: String(line.original_quantity ?? ''),
    returned_quantity: String(line.returned_quantity ?? ''),
    remaining_quantity: String(line.remaining_quantity ?? ''),
    quantity: '',
    unit_price: String(line.unit_price ?? 0),
    tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
    tax_rate: Number(line.tax_rate) || 0,
    tax_name: line.tax_name || '',
  };
}

export function lineFromCreditNoteApi(line) {
  return {
    ...EMPTY_CREDIT_NOTE_LINE,
    product_id: line.product_id ? String(line.product_id) : '',
    invoice_line_id: '',
    description: line.description || '',
    original_quantity: '',
    quantity: String(line.quantity ?? 1),
    unit_price: String(line.unit_price ?? 0),
    tax_rate_id: '',
    tax_rate: 0,
    tax_name: '',
  };
}

export function calcLineAmount(line) {
  const qty = Number(line.quantity) || 0;
  const price = Number(line.unit_price) || 0;
  if (qty === 0) {
    const origQty = Number(line.original_quantity) || 0;
    const origPrice = Number(line._orig_unit_price) || 0;
    return Math.max(0, (origPrice - price) * origQty);
  }
  return qty * price;
}

export function calcLineTax(line) {
  const lineTotal = calcLineAmount(line);
  const rate = Number(line.tax_rate) || 0;
  return rate > 0 ? (lineTotal * rate) / 100 : 0;
}

export function calcLinesTotals(lines) {
  let subtotal = 0;
  let tax = 0;
  lines.forEach((line) => {
    if (!String(line.description || '').trim()) return;
    const lt = calcLineAmount(line);
    subtotal += lt;
    tax += calcLineTax(line);
  });
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
  };
}

export function buildCreditNotePayload(form, lines) {
  const payload = {
    customer_id: Number(form.customer_id),
    credit_note_date: form.credit_note_date,
    reason: form.reason || null,
  };

  if (form.invoice_id) {
    payload.invoice_id = Number(form.invoice_id);
  }

  const validLines = lines
    .filter((l) => {
      if (String(l.description || '').trim() === '') return false;

      const qty = Number(l.quantity) || 0;
      const price = Number(l.unit_price) || 0;
      const originalQty = Number(l.original_quantity) || 0;
      const originalPrice = Number(l._orig_unit_price) || 0;

      return qty > 0 || (originalQty > 0 && originalPrice > price);
    })
    .map((l) => ({
      product_id: l.product_id ? Number(l.product_id) : null,
      invoice_line_id: l.invoice_line_id ? Number(l.invoice_line_id) : null,
      description: l.description.trim(),
      quantity: Number(l.quantity) || 0,
      unit_price: Number(l.unit_price) || 0,
      tax_rate_id: l.tax_rate_id ? Number(l.tax_rate_id) : null,
      original_quantity: l.original_quantity === '' ? null : Number(l.original_quantity),
    }));

  if (validLines.length > 0) {
    payload.lines = validLines;
  } else if (form.amount !== '') {
    payload.amount = Number(form.amount) || 0;
  }

  return payload;
}

export function mapCreditNoteToForm(cn) {
  if (!cn) return { ...EMPTY_CREDIT_NOTE_FORM, lines: [{ ...EMPTY_CREDIT_NOTE_LINE }] };

  const lines =
    cn.lines?.length > 0
      ? cn.lines.map(lineFromCreditNoteApi)
      : [{ ...EMPTY_CREDIT_NOTE_LINE }];

  return {
    ...EMPTY_CREDIT_NOTE_FORM,
    customer_id: cn.customer_id ? String(cn.customer_id) : '',
    invoice_id: cn.invoice_id ? String(cn.invoice_id) : '',
    credit_note_date: cn.credit_note_date || EMPTY_CREDIT_NOTE_FORM.credit_note_date,
    amount: cn.total != null && !cn.lines?.length ? String(cn.total) : '',
    reason: cn.reason || '',
    lines,
  };
}
