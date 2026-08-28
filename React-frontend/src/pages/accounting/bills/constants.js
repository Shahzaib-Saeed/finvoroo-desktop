import { addDays, format } from 'date-fns';
import { formatInventoryQty } from '@/lib/units';
import {
    applyDiscountFixed,
    applyDiscountPercent,
    applyNetTotal,
    calcInvoiceTotals,
    calcLineTotals,
    computeDueDateByTerms,
    computeLineNet,
    formatCurrency,
    formatDisplayUnitPrice,
    formatInvoiceSequence,
    hydrateSavedDocumentLine,
    isLineMeaningful,
    lineQuantityForCalc,
    lineQuantityStringForPayload,
    parseLockedNetTotal,
    refreshLineComputedFields,
    resolveDocumentLineQuantityString,
    syncDiscountDisplays,
} from '../invoices/constants';

export {
    LINE_CELL_INPUT,
    LINE_CELL_INPUT_NUMBER,
    applyDiscountFixed,
    applyDiscountPercent,
    applyNetTotal,
    calcLineTotals,
    formatCurrency,
    formatDisplayUnitPrice,
    refreshLineComputedFields,
    parseLockedNetTotal,
}
from '../invoices/constants';

export const BILL_STATUSES = [
    { value: 'all', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'open', label: 'Open' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' },
];

export const STATUS_COLORS = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    open: 'bg-blue-100 text-blue-700 border-blue-200',
    partial: 'bg-amber-100 text-amber-700 border-amber-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
};

export const APPROVAL_COLORS = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
};

export const EMPTY_BILL_LINE = {
    product_id: '',
    description: '',
    quantity: '',
    quantity_basis: 'sales',
    entered_unit: '',
    unit_price: '',
    discount: '',
    discount_type: 'fixed',
    discount_fixed: '',
    discount_percent: '',
    net_total: '',
    tax_rate_id: '',
    sale_tax_amount: '',
    net_total_locked: false,
    batch_number: '',
    expiry_date: '',
    manufactured_date: '',
};

export const EMPTY_BILL_FORM = {
    invoice_template_id: '',
    vendor_id: '',
    job_order_id: '',
    bill_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    bill_number_manual: false,
    bill_sequence: '',
    reference: '',
    notes: '',
    vendor_address: '',
    discount_amount: '',
    other_charges: '',
    warehouse_id: '',
    is_drop_ship: false,
    drop_ship_customer_id: '',
    source_invoice_id: '',
    template_custom: {},
    bill_metadata_custom_fields: {},
    lines: [{...EMPTY_BILL_LINE }],
};

export function dueDateFromVendor(billDate, vendor) {
    if (!vendor) return format(addDays(new Date(), 30), 'yyyy-MM-dd');
    return computeDueDateByTerms(
        billDate,
        vendor.payment_terms_type || 'net_days',
        vendor.payment_terms_days??30,
        vendor.payment_terms_fixed_day
    );
}

export function formatLineQty(value) {
    return formatInventoryQty(value);
}

export function formatLineQtyWithUnit(line) {
    const qty = formatLineQty(
        line?.entered_quantity_decimal ?? line?.quantity,
    );
    const unit =
        line?.entered_unit_label ||
        line?.entered_unit_key ||
        line?.entered_unit ||
        '';
    return unit ? `${qty} ${unit}` : qty;
}

export function calcBillTotals(form, taxRatesById = {}) {
    const withDiscount = {...form, invoice_discount: form.discount_amount };
    const base = calcInvoiceTotals(withDiscount, taxRatesById);
    const other = Number(form.other_charges) || 0;
    return {...base, other_charges: other, total: Math.max(0, base.total + other) };
}

/** Parse 26-0001 / BI-26-0001 (and legacy BILL-* formats) into prefix/sequence parts. */
export function parseBillNumber(billNumber) {
    if (!billNumber || typeof billNumber !== 'string') return null;
    const trimmed = billNumber.trim();

    // Current format: 26-0001 (no type letters)
    let match = trimmed.match(/^(\d{2})-(\d+)$/);
    if (match) {
        const rawSequence = match[2];
        const sequence = parseInt(rawSequence, 10);
        const year = 2000 + parseInt(match[1], 10);
        if (!Number.isFinite(sequence) || sequence < 1) return null;
        return {
            year,
            sequence: String(sequence),
            prefix: `${match[1]}-`,
            padding: Math.max(4, rawSequence.length),
        };
    }

    match = trimmed.match(/^(BI)-(\d{2})-(\d+)$/i);
    if (match) {
        const rawSequence = match[3];
        const sequence = parseInt(rawSequence, 10);
        const year = 2000 + parseInt(match[2], 10);
        if (!Number.isFinite(sequence) || sequence < 1) return null;
        return {
            year,
            sequence: String(sequence),
            prefix: `${match[1].toUpperCase()}-${match[2]}-`,
            padding: Math.max(4, rawSequence.length),
        };
    }

    match = trimmed.match(/^BILL-(\d+)$/i);
    if (match) {
        const rawSequence = match[1];
        const sequence = parseInt(rawSequence, 10);
        if (!Number.isFinite(sequence) || sequence < 1) return null;
        return {
            year: null,
            sequence: String(sequence),
            prefix: 'BILL-',
            padding: Math.max(4, rawSequence.length),
        };
    }

    match = trimmed.match(/^BILL-(\d{4})-(\d+)$/i);
    if (!match) return null;

    const year = parseInt(match[1], 10);
    const rawSequence = match[2];
    const sequence = parseInt(rawSequence, 10);
    if (!Number.isFinite(year) || !Number.isFinite(sequence) || sequence < 1) return null;

    return {
        year,
        sequence: String(sequence),
        prefix: 'BILL-',
        padding: Math.max(4, rawSequence.length),
    };
}

export function resolvePreviewBillNumber(form, preview) {
    if (!preview) return '';
    if (form.bill_number_manual && form.bill_sequence !== '') {
        const seq = formatInvoiceSequence(form.bill_sequence, preview.padding??4);
        return seq ? `${preview.prefix}${seq}` : preview.full;
    }
    return preview.full || '';
}

export function mapBillToForm(bill) {
    if (!bill) return {...EMPTY_BILL_FORM, lines: [{...EMPTY_BILL_LINE }] };

    const parsedNumber = parseBillNumber(bill.bill_number);

    const lines =
        bill.lines?.length > 0 ?
        bill.lines.map((line) => {
            const discPct = Number(line.discount_percent) || 0;
            const discAmt = Number(line.discount_amount) || 0;
            const fallbackDisc =
                line.discount != null && line.discount !== '' ? Number(line.discount) || 0 : 0;
            const base = {
                product_id: line.product_id ? String(line.product_id) : '',
                description: line.description || '',
                quantity: resolveDocumentLineQuantityString(line),
                quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
                entered_unit: line.entered_unit || '',
                unit_price: line.unit_price??'',
                discount: discPct > 0 ? discPct : discAmt > 0 ? discAmt : fallbackDisc,
                discount_type: line.discount_type || (discPct > 0 ? 'percent' : 'fixed'),
                tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
                sale_tax_amount: line.sale_tax_amount??'',
            };
            const hydrated = hydrateSavedDocumentLine(line, base);
            return {
                ...hydrated,
                batch_number: line.batch_number || '',
                expiry_date: line.expiry_date
                    ? String(line.expiry_date).slice(0, 10)
                    : '',
                manufactured_date: line.manufactured_date
                    ? String(line.manufactured_date).slice(0, 10)
                    : '',
                net_total: hydrated.net_total || String(Number(computeLineNet(hydrated).toFixed(2))),
            };
        }) :
        [{...EMPTY_BILL_LINE }];

    return {
        ...EMPTY_BILL_FORM,
        invoice_template_id: bill.invoice_template_id ? String(bill.invoice_template_id) : '',
        vendor_id: bill.vendor_id ? String(bill.vendor_id) : '',
        job_order_id: bill.job_order_id ? String(bill.job_order_id) : '',
        bill_date: bill.bill_date || EMPTY_BILL_FORM.bill_date,
        due_date: bill.due_date || EMPTY_BILL_FORM.due_date,
        bill_number_manual: false,
        bill_sequence: parsedNumber?.sequence??'',
        reference: bill.reference || '',
        notes: bill.notes || '',
        vendor_address: bill.vendor_address || '',
        discount_amount: bill.discount_amount != null ? String(bill.discount_amount) : '',
        other_charges: bill.other_charges != null ? String(bill.other_charges) : '',
        warehouse_id: bill.warehouse_id ? String(bill.warehouse_id) : '',
        is_drop_ship: Boolean(bill.is_drop_ship),
        drop_ship_customer_id: bill.drop_ship_customer_id ?
            String(bill.drop_ship_customer_id) :
            bill.drop_ship_customer?.id ?
            String(bill.drop_ship_customer.id) :
            '',
        template_custom: bill.custom_field_values || bill.template_custom || {},
        bill_metadata_custom_fields: bill.bill_metadata_custom_fields || {},
        lines,
    };
}

export function mapPoLinesToBillLines(poLines) {
    return poLines.map((line) => {
        const discPct = Number(line.discount_percent) || 0;
        const base = {
            product_id: line.product_id ? String(line.product_id) : '',
            description: line.description || line.product_name || 'Item',
            quantity: line.quantity??1,
            quantity_basis: 'sales',
            entered_unit: '',
            unit_price: String(line.unit_price??0),
            discount: discPct,
            discount_type: discPct > 0 ? 'percent' : 'fixed',
            tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
            sale_tax_amount: '',
            net_total: '',
        };
        const synced = syncDiscountDisplays(base);
        return {...synced, net_total: String(computeLineNet(synced)) };
    });
}

export function buildBillPayload(form) {
    const lines = form.lines
        .filter((line) => isLineMeaningful(line))
        .map((line) => {
            const lockedNet = parseLockedNetTotal(line);
            const payload = {
                product_id: line.product_id ? Number(line.product_id) : null,
                description: line.description?.trim() || 'Item',
                quantity: lineQuantityStringForPayload(line),
                quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
                entered_unit: line.entered_unit ? String(line.entered_unit) : null,
                unit_price: Number(line.unit_price) || 0,
                discount: line.discount === '' ? 0 : Number(line.discount) || 0,
                discount_type: line.discount_type || 'fixed',
                tax_rate_id: line.tax_rate_id ? Number(line.tax_rate_id) : null,
                sale_tax_amount: line.tax_rate_id ?
                    0 :
                    line.sale_tax_amount === '' ?
                    0 :
                    Number(line.sale_tax_amount) || 0,
            };
            if (lockedNet != null) {
                // Send the locked net as-is. Remultiplying qty×rate can lose 0.01
                // (e.g. 10615 × 24.465 → 259699.99 vs locked 259700.00).
                payload.line_net = lockedNet;
            }
            if (line.batch_number) payload.batch_number = String(line.batch_number).trim();
            if (line.expiry_date) payload.expiry_date = String(line.expiry_date).slice(0, 10);
            if (line.manufactured_date) {
                payload.manufactured_date = String(line.manufactured_date).slice(0, 10);
            }
            return payload;
        });

    const payload = {
        vendor_id: Number(form.vendor_id),
        bill_date: form.bill_date,
        due_date: form.due_date,
        reference: form.reference?.trim() || null,
        notes: form.notes?.trim() || null,
        vendor_address: form.vendor_address || null,
        discount_amount: form.discount_amount === '' ? 0 : Number(form.discount_amount) || 0,
        other_charges: form.other_charges === '' ? 0 : Number(form.other_charges) || 0,
        lines,
    };

    if (form.warehouse_id) payload.warehouse_id = Number(form.warehouse_id);
    if (form.source_invoice_id) payload.source_invoice_id = Number(form.source_invoice_id);
    if (form.job_order_id) payload.job_order_id = Number(form.job_order_id);
    payload.is_drop_ship = Boolean(form.is_drop_ship);
    payload.drop_ship_customer_id =
        form.is_drop_ship && form.drop_ship_customer_id ?
        Number(form.drop_ship_customer_id) :
        null;
    if (form.invoice_template_id) payload.invoice_template_id = Number(form.invoice_template_id);
    payload.template_custom = form.template_custom || {};
    if (form.bill_metadata_custom_fields && Object.keys(form.bill_metadata_custom_fields).length > 0) {
        payload.bill_metadata_custom_fields = form.bill_metadata_custom_fields;
    }

    if (form.bill_number_manual && form.bill_sequence !== '') {
        payload.bill_sequence = parseInt(form.bill_sequence, 10);
    }

    return payload;
}