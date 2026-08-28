import { format } from 'date-fns';
import { formatCurrency } from '../invoices/constants';

export { formatCurrency };

export const APPROVAL_COLORS = {
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export const EMPTY_TRANSFER_FORM = {
  from_account_id: '',
  to_account_id: '',
  amount: '',
  currency: 'USD',
  transfer_date: format(new Date(), 'yyyy-MM-dd'),
  reference: '',
  memo: '',
};

export function buildTransferPayload(form) {
  return {
    from_account_id: Number(form.from_account_id),
    to_account_id: Number(form.to_account_id),
    amount: Number(form.amount),
    currency: form.currency || undefined,
    transfer_date: form.transfer_date,
    reference: form.reference?.trim() || undefined,
    memo: form.memo?.trim() || undefined,
  };
}
