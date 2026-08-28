import { format } from 'date-fns';
import { formatCurrency } from '../invoices/constants';
import { defaultEnteredUnitForProduct } from '@/lib/units';

export { formatCurrency };

export const STATUS_COLORS = {
    draft: 'bg-secondary text-secondary-foreground',
    applied: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const APPROVAL_COLORS = {
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
};

export const VC_STATUSES = [
    { value: 'all', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'applied', label: 'Applied' },
];

export const EMPTY_VENDOR_CREDIT_LINE = {
    product_id: '',
    bill_line_id: '',
    description: '',
    original_quantity: '',
    returned_quantity: '',
    remaining_quantity: '',
    quantity: '1',
    entered_unit: '',
    unit_price: '0',
    tax_rate_id: '',
    tax_rate: 0,
    tax_type: 'percentage',
};

export const EMPTY_VENDOR_CREDIT_FORM = {
    vendor_id: '',
    bill_id: '',
    currency: 'USD',
    credit_date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    reason: '',
};

export function lineFromBillApi(line) {
    return {
        ...EMPTY_VENDOR_CREDIT_LINE,
        product_id: line.product_id ? String(line.product_id) : '',
        bill_line_id: line.id ? String(line.id) : '',
        description: line.description || '',
        original_quantity: String(line.original_quantity ?? ''),
        returned_quantity: String(line.returned_quantity ?? ''),
        remaining_quantity: String(line.remaining_quantity ?? ''),
        quantity: '',
        // A return line inherits the ORIGINAL bill line's locked unit — never
        // editable here, mirroring how credit-note return lines work.
        entered_unit: line.entered_unit || '',
        unit_price: String(line.unit_price ?? 0),
        tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
        tax_rate: Number(line.tax_rate) || 0,
        tax_type: line.tax_type || 'percentage',
    };
}

export function lineFromProduct(product) {
    if (!product) return {...EMPTY_VENDOR_CREDIT_LINE };
    return {
        ...EMPTY_VENDOR_CREDIT_LINE,
        product_id: String(product.id),
        description: product.name || '',
        entered_unit: defaultEnteredUnitForProduct(product) || '',
        unit_price: String(product.unit_price??0),
        tax_rate_id: product.tax_rate_id ? String(product.tax_rate_id) : '',
        tax_rate: Number(product.tax_rate) || 0,
        tax_type: product.tax_type || 'percentage',
    };
}

export function lineFromVendorCreditApi(line, products = []) {
    const product = products.find((p) => String(p.id) === String(line.product_id));
    const taxFromProduct = product?.tax_rate_id ? {
        tax_rate_id: String(product.tax_rate_id),
        tax_rate: Number(product.tax_rate) || 0,
        tax_type: product.tax_type || 'percentage',
    } : {};

    return {
        ...EMPTY_VENDOR_CREDIT_LINE,
        product_id: line.product_id ? String(line.product_id) : '',
        bill_line_id: line.bill_line_id ? String(line.bill_line_id) : '',
        description: line.description || '',
        quantity: String(line.quantity??1),
        entered_unit: line.entered_unit || '',
        unit_price: String(line.unit_price??0),
        ...taxFromProduct,
    };
}

export function calcLineSubtotal(line) {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unit_price) || 0;
    return qty * price;
}

export function calcLineTax(line, taxRates = []) {
    const subtotal = calcLineSubtotal(line);
    if (line?.tax_rate_id && taxRates?.length) {
        const resolved = resolveTaxForLine(taxRates, line.tax_rate_id);
        if (resolved.tax_type === 'fixed') {
            return Number(resolved.tax_rate) || 0;
        }
        const rate = Number(resolved.tax_rate) || 0;
        return rate > 0 ? (subtotal * rate) / 100 : 0;
    }
    const rate = Number(line.tax_rate) || 0;
    if (line.tax_type === 'fixed') return rate;
    return rate > 0 ? (subtotal * rate) / 100 : 0;
}

export function calcLinesTotals(lines, taxRates = []) {
    let subtotal = 0;
    let tax = 0;
    lines.forEach((line) => {
        if (!String(line.description || '').trim()) return;
        subtotal += calcLineSubtotal(line);
        tax += calcLineTax(line, taxRates);
    });
    return {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round((subtotal + tax) * 100) / 100,
    };
}

export function buildVendorCreditPayload(form, lines) {
    const payload = {
        vendor_id: Number(form.vendor_id),
        credit_date: form.credit_date,
        reason: form.reason || null,
    };

    if (form.bill_id) payload.bill_id = Number(form.bill_id);
    if (form.currency) payload.currency = form.currency;

    const validLines = lines
        .filter((l) => {
            if (String(l.description || '').trim() === '') return false;
            const qty = Number(l.quantity) || 0;
            return qty > 0;
        })
        .map((l) => ({
            product_id: l.product_id ? Number(l.product_id) : null,
            description: l.description.trim(),
            quantity: Number(l.quantity) || 0,
            entered_unit: l.entered_unit || null,
            unit_price: Number(l.unit_price) || 0,
            tax_rate_id: l.tax_rate_id ? Number(l.tax_rate_id) : null,
        }));

    if (validLines.length > 0) {
        payload.lines = validLines;
    } else if (form.amount !== '') {
        payload.amount = Number(form.amount) || 0;
    }

    return payload;
}

export function mapVendorCreditToForm(vc, products = []) {
    if (!vc) {
        return {
            ...EMPTY_VENDOR_CREDIT_FORM,
            lines: [{...EMPTY_VENDOR_CREDIT_LINE }],
        };
    }

    const lines =
        vc.lines?.length > 0 ?
        vc.lines.map((l) => lineFromVendorCreditApi(l, products)) : [{...EMPTY_VENDOR_CREDIT_LINE }];

    const isAmountOnly =
        vc.lines?.length === 1 &&
        !vc.lines[0]?.product_id &&
        Number(vc.lines[0]?.quantity) === 1;

    return {
        vendor_id: vc.vendor_id ? String(vc.vendor_id) : '',
        bill_id: vc.bill_id ? String(vc.bill_id) : '',
        currency: vc.currency || 'USD',
        credit_date: vc.credit_date || EMPTY_VENDOR_CREDIT_FORM.credit_date,
        amount: isAmountOnly && vc.total != null ? String(vc.total) : '',
        reason: vc.reason || '',
        lines,
        isAmountOnly,
    };
}

export function resolveTaxForLine(taxRates, taxRateId) {
    const t = taxRates.find((x) => String(x.id) === String(taxRateId));
    if (!t) return { tax_rate: 0, tax_type: 'percentage' };
    return {
        tax_rate: Number(t.rate) || 0,
        tax_type: t.type || 'percentage',
    };
}