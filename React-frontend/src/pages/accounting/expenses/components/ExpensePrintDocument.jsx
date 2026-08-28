import { cn } from '@/lib/utils';
import { accountLabel, formatCurrency } from '../constants';

function CompanyBlock({ company }) {
  if (!company) {
    return <p className="text-sm text-neutral-600">Company</p>;
  }
  return (
    <div>
      {company.logo_url ? (
        <img
          src={company.logo_url}
          alt=""
          className="mb-3 max-h-12 w-auto object-contain"
        />
      ) : null}
      <p className="font-semibold text-base text-neutral-900">{company.name || 'Company'}</p>
      {company.address_display ? (
        <p className="text-sm text-neutral-600 whitespace-pre-line mt-1 leading-snug">
          {company.address_display}
        </p>
      ) : null}
      <p className="text-sm text-neutral-600 mt-1">
        {[company.phone ? `Tel: ${company.phone}` : null, company.email].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

function MetaRow({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <tr>
      <td className="text-neutral-500 text-[10px] uppercase tracking-wide pe-4 py-1 text-end whitespace-nowrap align-top">
        {label}
      </td>
      <td className="py-1 text-end text-sm font-medium text-neutral-900 whitespace-nowrap">
        {value}
      </td>
    </tr>
  );
}

function statusLine(expense) {
  const parts = [];
  const approval = expense.approval_status || 'approved';
  if (approval !== 'approved') {
    parts.push(`Approval: ${approval.charAt(0).toUpperCase()}${approval.slice(1)}`);
  }
  parts.push(expense.is_posted ? 'Posted to general ledger' : 'Not posted');
  if (expense.journal_entry_id) {
    parts.push(`Journal #${expense.journal_entry_id}`);
  }
  return parts.join(' · ');
}

/**
 * Formal expense voucher for print/PDF — separate from the on-screen show layout.
 */
export function ExpensePrintDocument({ expense, className }) {
  const currency = expense.currency || 'USD';
  const reference = expense.reference?.trim() || `EXP-${expense.id}`;
  const amount = formatCurrency(expense.amount, currency);
  const th =
    'border border-neutral-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 bg-neutral-100';
  const td = 'border border-neutral-300 px-3 py-2 text-sm text-neutral-900 align-middle';
  const tdNum = `${td} text-right tabular-nums`;

  return (
    <div
      id="expense-print-document"
      className={cn(
        'hidden text-neutral-900 text-sm leading-normal',
        'max-w-[210mm] mx-auto bg-white',
        className,
      )}
      aria-hidden="true"
    >
      <div className="expense-print-section border-b border-neutral-300 px-6 py-5">
        <div className="expense-print-header-row flex flex-row justify-between items-start gap-8">
          <div className="expense-print-company min-w-0 flex-1">
            <CompanyBlock company={expense.company} />
          </div>
          <div className="expense-print-meta-col shrink-0 text-right min-w-[220px]">
            <h1 className="text-2xl font-bold uppercase tracking-[0.2em] text-neutral-900">
              Expense voucher
            </h1>
            <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wide">
              Payment authorization &amp; record
            </p>
            <table className="expense-print-meta-table mt-4 text-sm w-full">
              <tbody>
                <MetaRow label="Voucher no." value={reference} />
                <MetaRow
                  label="Expense date"
                  value={expense.expense_date_display || expense.expense_date}
                />
                <MetaRow label="Currency" value={currency} />
                <MetaRow label="Document ID" value={`#${expense.id}`} />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="expense-print-section border-b border-neutral-300 px-6 py-4">
        <div className="expense-print-party-row expense-print-party-row--split flex flex-row gap-6">
          <div className="expense-print-party-left min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Paid to / vendor
            </p>
            <p className="font-semibold text-base text-neutral-900">
              {expense.vendor?.name || '—'}
            </p>
            {expense.vendor?.email ? (
              <p className="text-sm text-neutral-600 mt-1">{expense.vendor.email}</p>
            ) : null}
          </div>
          <div className="expense-print-party-right min-w-0 flex-1 border-s border-neutral-300 ps-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Payment summary
            </p>
            <div className="expense-print-amount-box inline-block rounded-md px-5 py-3 mt-1 min-w-[200px]">
              <p className="text-[10px] uppercase tracking-wide text-neutral-500">Total paid</p>
              <p className="text-2xl font-bold tabular-nums text-neutral-900 mt-0.5">{amount}</p>
            </div>
            <p className="text-sm text-neutral-700 mt-3">
              <span className="text-neutral-500">Paid from: </span>
              {accountLabel(expense.payment_account)}
            </p>
            <p className="text-xs text-neutral-500 mt-2">{statusLine(expense)}</p>
          </div>
        </div>
      </div>

      <div className="expense-print-section border-b border-neutral-300 px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
          General ledger distribution
        </p>
        <table className="expense-print-journal-table w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${th} text-left`}>Account</th>
              <th className={`${th} text-left`}>Description</th>
              <th className={`${th} text-right w-28`}>Debit</th>
              <th className={`${th} text-right w-28`}>Credit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={td}>
                <span className="font-medium">{accountLabel(expense.expense_account)}</span>
              </td>
              <td className={td}>Expense — {reference}</td>
              <td className={tdNum}>{amount}</td>
              <td className={tdNum}>—</td>
            </tr>
            <tr>
              <td className={td}>
                <span className="font-medium">{accountLabel(expense.payment_account)}</span>
              </td>
              <td className={td}>Cash / bank disbursement</td>
              <td className={tdNum}>—</td>
              <td className={tdNum}>{amount}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-neutral-50">
              <td colSpan={2} className={`${td} text-right font-semibold`}>
                Totals
              </td>
              <td className={`${tdNum} font-semibold`}>{amount}</td>
              <td className={`${tdNum} font-semibold`}>{amount}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {(expense.description?.trim() || expense.job_order) && (
        <div className="expense-print-section border-b border-neutral-300 px-6 py-4 space-y-3">
          {expense.description?.trim() ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                Purpose / description
              </p>
              <p className="text-sm text-neutral-800 whitespace-pre-line leading-relaxed">
                {expense.description}
              </p>
            </div>
          ) : null}
          {expense.job_order ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                Job / project reference
              </p>
              <p className="text-sm font-medium text-neutral-900">
                {expense.job_order.job_number}
                {expense.job_order.title ? ` — ${expense.job_order.title}` : ''}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {expense.receipt_url ? (
        <div className="expense-print-section border-b border-neutral-300 px-6 py-3">
          <p className="text-xs text-neutral-600">
            <span className="font-semibold uppercase tracking-wide text-neutral-500">
              Supporting documentation:{' '}
            </span>
            Receipt on file (attached to this expense record).
          </p>
        </div>
      ) : null}

      <div className="expense-print-section px-6 py-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-4">
          Authorization
        </p>
        <div className="expense-print-signatures grid grid-cols-3 gap-8">
          {['Prepared by', 'Approved by', 'Finance'].map((label) => (
            <div key={label} className="text-center">
              <div className="border-b border-neutral-400 h-10 mb-2" />
              <p className="text-xs text-neutral-600">{label}</p>
              <p className="text-[10px] text-neutral-400 mt-1">Name / signature / date</p>
            </div>
          ))}
        </div>
      </div>

      <div className="expense-print-section px-6 py-4 border-t border-neutral-200 text-[10px] text-neutral-500 leading-relaxed">
        <p>
          This expense voucher is an internal accounting document. Retain for audit and tax
          purposes. Amounts are recorded in {currency} unless otherwise stated.
          {expense.company?.name ? ` Issued by ${expense.company.name}.` : ''}
        </p>
        {expense.created_at ? (
          <p className="mt-1">Record created: {expense.created_at}</p>
        ) : null}
      </div>
    </div>
  );
}
