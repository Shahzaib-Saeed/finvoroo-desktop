import { format } from 'date-fns';
import { formatCurrency } from '../invoices/constants';

export { formatCurrency };

export const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

export const EMPTY_BANK_ACCOUNT_FORM = {
    bank_name: '',
    account_number: '',
    routing_number: '',
    opening_balance: '0',
    opening_balance_date: format(new Date(), 'yyyy-MM-dd'),
    is_active: true,
};

export function mapBankAccountToForm(account) {
    if (!account) return {...EMPTY_BANK_ACCOUNT_FORM };
    return {
        bank_name: account.bank_name || '',
        account_number: account.account_number || '',
        routing_number: account.routing_number || '',
        opening_balance: String(account.opening_balance ?? 0),
        opening_balance_date: account.opening_balance_date || format(new Date(), 'yyyy-MM-dd'),
        is_active: account.is_active !== false,
    };
}

export function buildBankAccountCreatePayload(form) {
    return {
        bank_name: form.bank_name.trim(),
        account_number: form.account_number.trim(),
        routing_number: form.routing_number?.trim() || undefined,
        opening_balance: form.opening_balance !== '' ? Number(form.opening_balance) : 0,
        opening_balance_date: form.opening_balance_date || undefined,
    };
}

export function buildBankAccountUpdatePayload(form) {
    return {
        bank_name: form.bank_name.trim(),
        account_number: form.account_number.trim(),
        routing_number: form.routing_number?.trim() || undefined,
        is_active: !!form.is_active,
        // Opening balance is editable from the edit modal too — the backend
        // orchestrator re-posts through the idempotent OpeningBalanceService.
        opening_balance: form.opening_balance !== '' && form.opening_balance != null ?
            Number(form.opening_balance) :
            0,
        opening_balance_date: form.opening_balance_date || undefined,
    };
}