/**
 * Currency symbols aligned with Laravel `currencySymbol()` in app/helpers.php.
 */
export const CURRENCY_SYMBOLS = {
    USD: '$',
    PKR: 'Rs.',
    EUR: '€',
    GBP: '£',
    AED: 'AED ',
    CAD: 'C$',
    AUD: 'A$',
    NZD: 'NZ$',
    INR: '₹',
    SAR: 'SAR ',
    JPY: '¥',
    CNY: '¥',
    CHF: 'CHF ',
    TRY: '₺',
    BRL: 'R$',
    MXN: 'MX$',
    ZAR: 'R ',
    SEK: 'kr ',
    NOK: 'kr ',
    DKK: 'kr ',
    PLN: 'zł ',
    SGD: 'S$',
    HKD: 'HK$',
    KRW: '₩',
    THB: '฿',
    MYR: 'RM ',
    IDR: 'Rp ',
    PHP: '₱',
    ILS: '₪',
    CZK: 'Kč ',
    HUF: 'Ft ',
    RON: 'lei ',
};

let workspaceDefaultCurrency = 'USD';

export function setWorkspaceDefaultCurrency(currency) {
    workspaceDefaultCurrency = normalizeCurrencyCode(currency, 'USD');
}

export function getWorkspaceDefaultCurrency() {
    return workspaceDefaultCurrency;
}

export function normalizeCurrencyCode(currency, fallback = 'USD') {
    const code = String(currency || fallback).trim().toUpperCase();
    return code || fallback;
}

export function getCurrencySymbol(currency = 'USD', extraSymbols = {}) {
    const code = normalizeCurrencyCode(currency);
    if (extraSymbols[code]) return extraSymbols[code];
    return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

export function resolveCurrencyCode(documentCurrency, companyCurrency, fallback = 'USD') {
    return normalizeCurrencyCode(documentCurrency || companyCurrency, fallback);
}

/**
 * Format a monetary amount using the company/document currency symbol (not hardcoded USD $).
 */
export function formatCurrencyAmount(
    value,
    currency, { symbols = {}, minimumFractionDigits = 2, maximumFractionDigits = 2 } = {},
) {
    const n = Number(value);
    if (Number.isNaN(n)) return '—';

    const code = normalizeCurrencyCode(currency, workspaceDefaultCurrency);
    const formatted = Math.abs(n).toLocaleString('en-US', {
        minimumFractionDigits,
        maximumFractionDigits,
    });
    const symbol = getCurrencySymbol(code, symbols);
    const sign = n < 0 ? '-' : '';

    return `${sign}${symbol}${formatted}`;
}

/** Alias used across accounting pages. */
export function formatCurrency(value, currency, symbols = {}) {
    return formatCurrencyAmount(value, currency, { symbols });
}

/** Alias used on customer pages. */
export function formatMoney(value, currency, symbols = {}) {
    return formatCurrencyAmount(value, currency, { symbols });
}