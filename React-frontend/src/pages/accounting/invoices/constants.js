import { addDays, format } from 'date-fns';
import { formatCurrencyAmount } from '@/lib/currency';
import { convertQuantity, maxQtyInEnteredUnit, resolveEnteredUnit } from '@/lib/units';

export const LINE_CELL_INPUT =
    'h-8 w-full min-h-8 border-0 rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/30 bg-transparent px-1.5 text-xs leading-tight';

/** Hides browser up/down spinners on number inputs */
export const NO_NUMBER_SPINNER = [
    '[appearance:textfield]',
    '[-moz-appearance:textfield]',
    '[&::-webkit-outer-spin-button]:appearance-none',
    '[&::-webkit-inner-spin-button]:appearance-none',
].join(' ');

export const LINE_CELL_INPUT_NUMBER = [LINE_CELL_INPUT, NO_NUMBER_SPINNER].join(' ');

export const EMPTY_INVOICE_LINE = {
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
    sales_order_line_id: '',
    net_total_locked: false,
};

export const EMPTY_INVOICE_FORM = {
    invoice_template_id: '',
    customer_id: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    invoice_number_manual: false,
    invoice_sequence: '',
    currency: 'USD',
    exchange_rate: '1',
    reference_number: '',
    notes: '',
    invoice_discount: '',
    contact_person: '',
    contact_email: '',
    billing_address: '',
    shipping_address: '',
    address_display: '',
    payment_terms_type: 'net_days',
    payment_terms_days: 30,
    payment_terms_fixed_day: '',
    sales_order_id: '',
    job_order_id: '',
    template_custom: {},
    invoice_metadata_custom_fields: {},
    lines: [{...EMPTY_INVOICE_LINE }],
};

export function formatCurrency(value, currency, symbols = {}) {
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    if (currency && symbols[currency]) {
        return symbols[currency] + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return formatCurrencyAmount(value, currency, { symbols });
}

export function toYmd(dateObj) {
    return format(dateObj, 'yyyy-MM-dd');
}

export function computeDueDateByTerms(invoiceDate, termsType, netDays, fixedDay) {
    const baseDate = invoiceDate ? new Date(`${invoiceDate}T00:00:00`) : new Date();
    if (Number.isNaN(baseDate.getTime())) return toYmd(new Date());

    const t = termsType || 'net_days';
    if (t === 'prepaid' || t === 'cod') return toYmd(baseDate);
    if (t === 'end_of_next_month') {
        return toYmd(new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0));
    }
    if (t === 'fixed_day_next_month') {
        let day = parseInt(fixedDay, 10);
        if (Number.isNaN(day) || day < 1) day = 1;
        if (day > 31) day = 31;
        const y = baseDate.getFullYear();
        const m = baseDate.getMonth() + 1;
        const last = new Date(y, m + 1, 0).getDate();
        return toYmd(new Date(y, m, Math.min(day, last)));
    }
    let d = parseInt(netDays, 10);
    if (Number.isNaN(d) || d < 0) d = 30;
    return toYmd(addDays(baseDate, d));
}

export function buildAddressDisplay(billing, shipping) {
    const bill = String(billing || '').trim();
    const ship = String(shipping || '').trim();
    if (!bill && !ship) return '';
    if (!bill && ship) return ship;
    if (!ship || ship === bill) return bill;
    return `${bill}\n\n${ship}`;
}

export function splitAddressDisplay(display) {
    const full = String(display || '');
    const parts = full.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
        return { billing: parts[0], shipping: parts.slice(1).join('\n\n') };
    }
    const t = full.trim();
    return { billing: t, shipping: t };
}

export function dueDateFromCustomer(invoiceDate, customer) {
    if (!customer) return format(addDays(new Date(), 30), 'yyyy-MM-dd');
    return computeDueDateByTerms(
        invoiceDate,
        customer.payment_terms_type || 'net_days',
        customer.payment_terms_days??30,
        customer.payment_terms_fixed_day
    );
}

/** Line is a real row (product or description). Empty placeholder rows are excluded. */
export function isLineMeaningful(line) {
    const hasProduct = line.product_id && String(line.product_id) !== '';
    const hasDesc = String(line.description || '').trim() !== '';
    return hasProduct || hasDesc;
}

/** Qty summed in footer — only for meaningful rows with an entered quantity. */
export function lineQuantityForFooter(line) {
    if (!isLineMeaningful(line)) return 0;
    return lineQuantityForCalc(line);
}

export function lineQuantityForCalc(line) {
    const qtyStr = String(line.quantity??'').trim();
    if (qtyStr === '') return 0;
    const n = Number(qtyStr);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Trim trailing zeros from a decimal qty string without rounding significant digits. */
export function trimDocumentQuantityString(value) {
    const s = String(value ?? '').trim();
    if (s === '') return '';
    if (!/^\d+(\.\d+)?$/.test(s)) {
        const n = Number(s);
        if (!Number.isFinite(n)) return '';
        return trimDocumentQuantityString(n.toFixed(8));
    }
    if (!s.includes('.')) return s;

    return s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '').replace(/\.$/, '') || '0';
}

/**
 * Authoritative qty for saved document lines — prefers UOM snapshot over legacy quantity column.
 */
export function resolveDocumentLineQuantityString(line) {
    if (line == null) return '';
    const entered = line.entered_quantity_decimal;
    if (entered != null && entered !== '') {
        return trimDocumentQuantityString(entered);
    }
    const qty = line.quantity;
    if (qty != null && qty !== '') {
        return trimDocumentQuantityString(qty);
    }

    return '';
}

/** Preserve entered qty string in API payloads (avoid Number() rounding drift). */
export function lineQuantityStringForPayload(line) {
    const qtyStr = trimDocumentQuantityString(line.quantity);
    if (qtyStr === '') return '1';
    const n = Number(qtyStr);
    if (!Number.isFinite(n) || n <= 0) return '1';

    return qtyStr;
}

const MAX_DERIVED_UNIT_PRICE_DECIMALS = 10;
export const DISPLAY_UNIT_PRICE_DECIMALS = 3;

function trimTrailingZeros(numStr) {
    if (!String(numStr).includes('.')) return String(numStr);
    return String(numStr).replace(/\.?0+$/, '') || '0';
}

/** Treat blank and zero as empty for rate inputs on create/edit forms. */
export function unitPriceForFormInput(value) {
    const raw = String(value??'').trim();
    if (raw === '' || Number(raw) === 0) return '';
    return raw;
}

/** Show at most 3 decimal places in the rate field; full precision stays in state. */
export function formatDisplayUnitPrice(value) {
    const raw = unitPriceForFormInput(value);
    if (raw === '') return '';
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;

    const factor = 10 ** DISPLAY_UNIT_PRICE_DECIMALS;
    const truncated = Math.trunc(n * factor) / factor;
    return trimTrailingZeros(truncated.toFixed(DISPLAY_UNIT_PRICE_DECIMALS));
}

function lockedNetTotalString(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return String(Math.round(n * 100) / 100);
}

/** Derive a unit price so qty × rate (before discount) matches the target gross to cent precision. */
export function formatDerivedUnitPrice(grossBeforeDiscount, qty) {
    if (!Number.isFinite(qty) || qty <= 0) return '';
    if (!Number.isFinite(grossBeforeDiscount) || grossBeforeDiscount <= 0) return '0';

    const exact = grossBeforeDiscount / qty;
    for (let decimals = 2; decimals <= MAX_DERIVED_UNIT_PRICE_DECIMALS; decimals += 1) {
        const candidate = Number(exact.toFixed(decimals));
        const gross = qty * candidate;
        if (Math.abs(gross - grossBeforeDiscount) < 0.005) {
            return trimTrailingZeros(exact.toFixed(decimals));
        }
    }

    return trimTrailingZeros(exact.toFixed(MAX_DERIVED_UNIT_PRICE_DECIMALS));
}

export function parseLockedNetTotal(line) {
    if (!line?.net_total_locked) return null;
    const raw = String(line.net_total??'').trim();
    if (raw === '' || raw === '.' || raw === '-') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

/** Amounts for one line — qty × rate, minus discount. */
export function resolveLineAmounts(line) {
    const gross = lineGross(line);
    const discount = lineDiscountAmount(line);
    const net = Math.max(0, gross - discount);
    return { gross, discount, net };
}

export function lineGross(line) {
    return Math.max(0, lineQuantityForCalc(line) * (Number(line.unit_price) || 0));
}

export function lineDiscountAmount(line) {
    const gross = lineGross(line);
    const disc = Number(line.discount) || 0;
    if (line.discount_type === 'percent') return (gross * Math.min(100, Math.max(0, disc))) / 100;
    return Math.min(disc, gross);
}

export function syncDiscountDisplays(line) {
    const gross = lineGross(line);
    const disc = Number(line.discount) || 0;
    if (gross <= 0) return {...line, discount_fixed: '', discount_percent: '' };
    if (line.discount_type === 'percent') {
        const pct = Math.min(100, Math.max(0, disc));
        const fixedAmt = pct > 0 ? gross * (pct / 100) : 0;
        return {
            ...line,
            discount_percent: pct > 0 ? String(Number(pct.toFixed(2))) : '',
            discount_fixed: fixedAmt > 0 ? String(Number(fixedAmt.toFixed(2))) : '',
        };
    }
    const capped = Math.min(Math.max(0, disc), gross);
    return {
        ...line,
        discount_fixed: capped > 0 ? String(Number(capped.toFixed(2))) : '',
        discount_percent: capped > 0 && gross > 0 ? String(Number(((capped / gross) * 100).toFixed(2))) : '',
    };
}

export function applyDiscountFixed(line, fixedVal) {
    const lockedNet = parseLockedNetTotal(line);
    const gross = lineGross(line);
    const capped = Math.min(Math.max(0, Number(fixedVal) || 0), gross);

    if (lockedNet != null) {
        return syncDiscountDisplays({
            ...line,
            discount_type: 'fixed',
            discount: capped,
            net_total_locked: true,
            net_total: lockedNetTotalString(lockedNet),
        });
    }

    return syncDiscountDisplays({
        ...line,
        discount_type: 'fixed',
        discount: capped,
        net_total_locked: false,
    });
}

export function applyDiscountPercent(line, pctVal) {
    const lockedNet = parseLockedNetTotal(line);
    const pct = Math.min(100, Math.max(0, Number(pctVal) || 0));

    if (lockedNet != null) {
        return syncDiscountDisplays({
            ...line,
            discount_type: 'percent',
            discount: pct,
            net_total_locked: true,
            net_total: lockedNetTotalString(lockedNet),
        });
    }

    return syncDiscountDisplays({
        ...line,
        discount_type: 'percent',
        discount: pct,
        net_total_locked: false,
    });
}

export function applyNetTotal(line, netVal) {
    const raw = String(netVal??'');
    const trimmed = raw.trim();

    // Keep in-progress typing (clearing the field, decimals, etc.) without zeroing unit price.
    if (
        trimmed === '' ||
        trimmed === '.' ||
        trimmed === '-' ||
        trimmed.endsWith('.')
    ) {
        return {...line, net_total: raw };
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
        return {...line, net_total: raw };
    }

    const lockedNet = Math.max(0, Math.round(parsed * 100) / 100);
    const qty = lineQuantityForCalc(line);
    if (qty <= 0) return {...line, net_total: raw };

    const unit_price = formatDerivedUnitPrice(lockedNet, qty);
    return syncDiscountDisplays({
        ...line,
        unit_price,
        net_total: String(lockedNet),
        net_total_locked: true,
    });
}

export function computeLineNet(line) {
    return Math.max(0, lineGross(line) - lineDiscountAmount(line));
}

/** Tax amount from the line's selected tax rate (before sale_tax manual override). */
export function computeLineTaxFromRate(line, taxRatesById = {}) {
    if (!line?.tax_rate_id) return 0;
    const rate =
        taxRatesById[String(line.tax_rate_id)]??taxRatesById[line.tax_rate_id];
    if (!rate) return 0;
    const net = computeLineNet(line);
    if (rate.type === 'percentage') {
        return (net * (Number(rate.rate) || 0)) / 100;
    }
    if (rate.type === 'fixed') {
        return Number(rate.rate) || 0;
    }
    return 0;
}

export function formatSaleTaxAmount(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return '';
    return String(Number(n.toFixed(2)));
}

export function productTracksStock(product) {
    if (!product) return false;
    if (product.tracks_stock) return true;
    return ['inventory', 'raw_material', 'finished_good', 'manufactured'].includes(
        String(product.type || '').toLowerCase()
    );
}

export function maxQtyInLineBasis(line, product) {
    if (!product || !productTracksStock(product)) return null;
    const stock = Number(product.available_stock) || 0;
    return maxQtyInEnteredUnit(stock, line, product);
}

/** Line qty converted to product storage UoM (matches backend stock checks). */
export function lineStockQuantityInStorageUnits(line, product) {
    const qty = Number(line?.quantity) || 0;
    if (qty <= 0 || !product) return 0;

    const conv = product?.qty_conversion;
    const enteredUnit = resolveEnteredUnit(line, product);
    if (conv?.family_units?.length > 1 && enteredUnit && conv.storage_unit_key) {
        return convertQuantity(qty, enteredUnit, conv.storage_unit_key, conv);
    }

    const basis = line?.quantity_basis || 'sales';
    if (basis === 'base' && conv?.factor_to_base > 0) {
        return qty * Number(conv.factor_to_base);
    }

    return qty;
}

/**
 * On invoice edit, qty already on this line was deducted from stock — add it back
 * when capping/validating so unchanged qty still passes.
 */
export function maxQtyInLineBasisForEdit(line, product, originalLine) {
    if (!product || !productTracksStock(product)) return null;

    let stock = Number(product.available_stock) || 0;
    if (
        originalLine?.product_id &&
        line?.product_id &&
        String(originalLine.product_id) === String(line.product_id)
    ) {
        stock += lineStockQuantityInStorageUnits(originalLine, product);
    }

    return maxQtyInEnteredUnit(stock, line, product);
}

/** Merge metadata definition values into template_custom field_key map for edit/show. */
export function mergeInvoiceTemplateCustomValues(invoice) {
    const templateCustom = {
        ...(invoice?.custom_field_values || invoice?.template_custom || {}),
    };
    const metadata = invoice?.invoice_metadata_custom_fields || {};
    const fields = invoice?.invoice_template?.header_fields || [];

    for (const field of fields) {
        if (field.definition_id == null || !field.field_key) continue;
        const metaVal =
            metadata[String(field.definition_id)]??metadata[field.definition_id];
        if (metaVal != null && String(metaVal).trim() !== '') {
            templateCustom[field.field_key] = metaVal;
        }
    }

    return templateCustom;
}

/** Seed metadata map from saved template values when API only returns custom_field_values. */
export function hydrateInvoiceMetadataCustomFields(invoice) {
    const metadata = { ...(invoice?.invoice_metadata_custom_fields || {}) };
    const templateCustom = mergeInvoiceTemplateCustomValues(invoice);
    const fields = invoice?.invoice_template?.header_fields || [];

    for (const field of fields) {
        if (field.definition_id == null || !field.field_key) continue;
        const metaKey = String(field.definition_id);
        if (
            Object.prototype.hasOwnProperty.call(metadata, metaKey) ||
            Object.prototype.hasOwnProperty.call(metadata, field.definition_id)
        ) {
            continue;
        }
        const fromTemplate = templateCustom[field.field_key];
        if (fromTemplate != null && String(fromTemplate).trim() !== '') {
            metadata[metaKey] = fromTemplate;
        }
    }

    return metadata;
}

/** Net before tax from a saved invoice/bill line row. */
export function savedLineNetBeforeTax(line) {
    const amount = Number(line?.amount);
    if (Number.isFinite(amount) && amount >= 0) {
        const lineTax = Number(line.tax_amount) || 0;
        const saleTax = Number(line.sale_tax_amount) || 0;
        const net = amount - lineTax - saleTax;
        if (net >= 0) return Math.round(net * 100) / 100;
    }
    return null;
}

function discountFieldsFromSavedLine(line, netBeforeTax) {
    const discPct = Number(line.discount_percent) || 0;
    const discAmt = Number(line.discount_amount??line.discount) || 0;
    const discType =
        line.discount_type || (discPct > 0 ? 'percent' : 'fixed');

    if (discType === 'percent') {
        const gross = netBeforeTax + discAmt;
        const pct = discPct > 0 ? discPct : gross > 0 ? (discAmt / gross) * 100 : 0;
        return { discount_type: 'percent', discount: pct };
    }

    return { discount_type: 'fixed', discount: discAmt };
}

/** Restore locked net + high-precision rate when loading edit forms. */
export function hydrateSavedDocumentLine(line, baseFields) {
    const net = savedLineNetBeforeTax(line);
    const qtyStr =
        resolveDocumentLineQuantityString(line) ||
        (baseFields.quantity != null && baseFields.quantity !== '' ?
            trimDocumentQuantityString(baseFields.quantity) :
            '');

    let next = {
        ...baseFields,
        quantity: qtyStr,
        net_total: '',
        net_total_locked: false,
    };

    if (net != null && net > 0) {
        const discountFields = discountFieldsFromSavedLine(line, net);
        next = {
            ...next,
            ...discountFields,
        };
        const probe = {
            ...next,
            quantity: qtyStr,
            unit_price: baseFields.unit_price??'',
        };
        const grossAnchor = lineGross(probe);

        if (grossAnchor > 0) {
            next = {
                ...next,
                net_total: lockedNetTotalString(grossAnchor),
                net_total_locked: true,
                unit_price: baseFields.unit_price??'',
            };
        } else {
            const discAmt = lineDiscountAmount({...next, ...discountFields });
            const anchor = net + discAmt;
            next = {
                ...next,
                net_total: lockedNetTotalString(anchor),
                net_total_locked: true,
            };
            if (lineQuantityForCalc(next) > 0) {
                next.unit_price = formatDerivedUnitPrice(anchor, lineQuantityForCalc(next));
            }
        }
    } else {
        next.unit_price = baseFields.unit_price??'';
    }

    return syncDiscountDisplays(next);
}

export function mapInvoiceToForm(invoice) {
    if (!invoice) return {...EMPTY_INVOICE_FORM, lines: [{...EMPTY_INVOICE_LINE }] };

    const parsedNumber = parseInvoiceNumber(invoice.invoice_number);

    const lines =
        invoice.lines?.length > 0 ?
        invoice.lines.map((line) => {
            const base = {
                product_id: line.product_id ? String(line.product_id) : '',
                description: line.description || '',
                quantity: resolveDocumentLineQuantityString(line),
                quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
                entered_unit: line.entered_unit || '',
                unit_price: line.unit_price??'',
                discount: line.discount??'',
                discount_type: line.discount_type || 'fixed',
                tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
                sale_tax_amount: line.sale_tax_amount??'',
                sales_order_line_id: line.sales_order_line_id ?
                    String(line.sales_order_line_id) :
                    '',
            };
            const hydrated = hydrateSavedDocumentLine(line, base);
            return {
                ...hydrated,
                net_total: hydrated.net_total || String(Number(computeLineNet(hydrated).toFixed(2))),
            };
        }) :
        [{...EMPTY_INVOICE_LINE }];

    return {
        ...EMPTY_INVOICE_FORM,
        invoice_template_id: invoice.invoice_template_id ? String(invoice.invoice_template_id) : '',
        customer_id: invoice.customer_id ? String(invoice.customer_id) : '',
        invoice_date: invoice.invoice_date || EMPTY_INVOICE_FORM.invoice_date,
        due_date: invoice.due_date || EMPTY_INVOICE_FORM.due_date,
        invoice_number_manual: false,
        invoice_sequence: parsedNumber?.sequence??'',
        currency: invoice.currency || 'USD',
        exchange_rate: invoice.exchange_rate != null ? String(invoice.exchange_rate) : '1',
        reference_number: invoice.reference_number || '',
        notes: invoice.notes || '',
        invoice_discount: invoice.discount_amount??invoice.invoice_discount??'',
        contact_person: invoice.contact_person || '',
        contact_email: invoice.contact_email || '',
        billing_address: invoice.billing_address || '',
        shipping_address: invoice.shipping_address || '',
        address_display: buildAddressDisplay(invoice.billing_address, invoice.shipping_address),
        payment_terms_type: invoice.payment_terms_type || 'net_days',
        payment_terms_days: invoice.payment_terms_days??30,
        payment_terms_fixed_day: invoice.payment_terms_fixed_day??'',
        sales_order_id: invoice.sales_order_id ? String(invoice.sales_order_id) : '',
        job_order_id: invoice.job_order_id ? String(invoice.job_order_id) : '',
        template_custom: mergeInvoiceTemplateCustomValues(invoice),
        invoice_metadata_custom_fields: hydrateInvoiceMetadataCustomFields(invoice),
        lines,
    };
}

export function calcLineTotals(line, taxRatesById = {}) {
    const { gross: subtotal, discount, net } = resolveLineAmounts(line);
    let tax = 0;
    if (line?.tax_rate_id) {
        const rate =
            taxRatesById[String(line.tax_rate_id)]??taxRatesById[line.tax_rate_id];
        if (rate?.type === 'percentage') {
            tax = (net * (Number(rate.rate) || 0)) / 100;
        } else if (rate?.type === 'fixed') {
            tax = Number(rate.rate) || 0;
        }
    }
    const saleTax = Number(line.sale_tax_amount) || 0;
    if (saleTax > 0) tax = saleTax;
    return { subtotal, discount, net, tax, total: net + tax };
}

/** Pro-rata document-level discount share removed from a line net before tax. */
export function taxableNetAfterDocumentDiscount(lineNet, subtotal, documentDiscount) {
    if (!documentDiscount || subtotal <= 0) return lineNet;
    const applied = Math.min(documentDiscount, subtotal);
    const share = applied * (lineNet / subtotal);
    return Math.max(0, Math.round((lineNet - share) * 100) / 100);
}

function lineTaxOnTaxableNet(line, taxableNet, taxRatesById) {
    if (line?.tax_rate_id) {
        const rate =
            taxRatesById[String(line.tax_rate_id)] ?? taxRatesById[line.tax_rate_id];
        if (rate?.type === 'percentage') {
            return (taxableNet * (Number(rate.rate) || 0)) / 100;
        }
        if (rate?.type === 'fixed') {
            return Number(rate.rate) || 0;
        }
        return 0;
    }
    return Number(line.sale_tax_amount) || 0;
}

export function calcInvoiceTotals(form, taxRatesById = {}) {
    let subtotal = 0;
    let lineDiscount = 0;
    const meaningful = [];

    form.lines.forEach((line) => {
        if (!isLineMeaningful(line)) return;
        const t = calcLineTotals(line, taxRatesById);
        meaningful.push({ line, t });
        subtotal += t.subtotal;
        lineDiscount += t.discount;
    });

    const invoiceDiscount = Number(form.invoice_discount) || 0;
    const netSubtotal = meaningful.reduce((sum, row) => sum + row.t.net, 0);
    let tax = 0;
    meaningful.forEach(({ line, t }) => {
        const taxableNet = taxableNetAfterDocumentDiscount(
            t.net,
            netSubtotal,
            invoiceDiscount,
        );
        tax += lineTaxOnTaxableNet(line, taxableNet, taxRatesById);
    });

    const total = Math.max(0, netSubtotal - invoiceDiscount + tax);

    return { subtotal, lineDiscount, invoiceDiscount, tax, total };
}

export function refreshLineComputedFields(line, taxRatesById) {
    const synced = syncDiscountDisplays(line);
    const lockedNet = parseLockedNetTotal(synced);
    const { net } = resolveLineAmounts(synced);
    const hasAmount =
        lineQuantityForCalc(synced) > 0 && String(synced.unit_price??'').trim() !== '';
    let result = {
        ...synced,
        net_total: lockedNet != null ?
            lockedNetTotalString(lockedNet) :
            hasAmount ?
            String(Number(net.toFixed(2))) :
            '',
    };

    if (taxRatesById) {
        if (result.tax_rate_id) {
            const rate =
                taxRatesById[String(result.tax_rate_id)]??taxRatesById[result.tax_rate_id];
            let taxAmount = 0;
            if (rate?.type === 'percentage') {
                taxAmount = (net * (Number(rate.rate) || 0)) / 100;
            } else if (rate?.type === 'fixed') {
                taxAmount = Number(rate.rate) || 0;
            }
            result = {
                ...result,
                sale_tax_amount: formatSaleTaxAmount(taxAmount),
            };
        } else {
            result = {...result, sale_tax_amount: '' };
        }
    }

    return result;
}

export function formatInvoiceSequence(sequence, padding = 4) {
    const n = parseInt(String(sequence??''), 10);
    if (!Number.isFinite(n) || n < 1) return '';
    return String(n).padStart(padding, '0');
}

/** Parse 26-0001 / IN-26-0001 (and legacy INV-* formats) into prefix/sequence parts. */
export function parseInvoiceNumber(invoiceNumber) {
    if (!invoiceNumber || typeof invoiceNumber !== 'string') return null;
    const trimmed = invoiceNumber.trim();

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

    // Prior format: IN-26-0001
    match = trimmed.match(/^(IN)-(\d{2})-(\d+)$/i);
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

    // Prior short format: INV-0001
    match = trimmed.match(/^INV-(\d+)$/i);
    if (match) {
        const rawSequence = match[1];
        const sequence = parseInt(rawSequence, 10);
        if (!Number.isFinite(sequence) || sequence < 1) return null;
        return {
            year: null,
            sequence: String(sequence),
            prefix: 'INV-',
            padding: Math.max(4, rawSequence.length),
        };
    }

    // Legacy format: INV-2026-00001
    match = trimmed.match(/^INV-(\d{4})-(\d+)$/i);
    if (!match) return null;

    const year = parseInt(match[1], 10);
    const rawSequence = match[2];
    const sequence = parseInt(rawSequence, 10);
    if (!Number.isFinite(year) || !Number.isFinite(sequence) || sequence < 1) return null;

    return {
        year,
        sequence: String(sequence),
        prefix: 'INV-',
        padding: Math.max(4, rawSequence.length),
    };
}

export function resolvePreviewInvoiceNumber(form, preview) {
    if (!preview) return '';
    if (form.invoice_number_manual && form.invoice_sequence !== '') {
        const seq = formatInvoiceSequence(form.invoice_sequence, preview.padding??4);
        return seq ? `${preview.prefix}${seq}` : preview.full;
    }
    return preview.full || '';
}

export function buildInvoicePayload(form) {
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
                sales_order_line_id: line.sales_order_line_id ?
                    Number(line.sales_order_line_id) :
                    null,
            };
            if (lockedNet != null) {
                // Send the locked net as-is. Remultiplying qty×rate can lose 0.01
                // (e.g. 10615 × 24.465 → 259699.99 vs locked 259700.00).
                payload.line_net = lockedNet;
            }
            return payload;
        });

    const payload = {
        customer_id: Number(form.customer_id),
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        currency: form.currency || null,
        exchange_rate: form.exchange_rate === '' ? 1 : Number(form.exchange_rate) || 1,
        reference_number: form.reference_number || null,
        contact_person: form.contact_person || null,
        contact_email: form.contact_email || null,
        billing_address: form.billing_address || null,
        shipping_address: form.shipping_address || null,
        payment_terms_type: form.payment_terms_type || null,
        payment_terms_days: form.payment_terms_days === '' ? null : Number(form.payment_terms_days),
        payment_terms_fixed_day: form.payment_terms_fixed_day === '' ? null : Number(form.payment_terms_fixed_day),
        invoice_discount: form.invoice_discount === '' ? 0 : Number(form.invoice_discount) || 0,
        notes: form.notes || null,
        invoice_template_id: form.invoice_template_id ? Number(form.invoice_template_id) : null,
        template_custom: form.template_custom || {},
        invoice_metadata_custom_fields: form.invoice_metadata_custom_fields || {},
        sales_order_id: form.sales_order_id ? Number(form.sales_order_id) : null,
        job_order_id: form.job_order_id ? Number(form.job_order_id) : null,
        lines,
    };

    if (form.invoice_number_manual && form.invoice_sequence !== '') {
        payload.invoice_sequence = parseInt(form.invoice_sequence, 10);
    }

    return payload;
}