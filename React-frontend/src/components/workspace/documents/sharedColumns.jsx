import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/helpers';

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  const base =
    'inline-flex items-center text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide';
  switch (s) {
    case 'approved':
    case 'completed':
    case 'paid':
      return cn(base, 'bg-emerald-50 text-emerald-700');
    case 'scheduled':
    case 'in progress':
    case 'active':
    case 'open':
    case 'sent':
      return cn(base, 'bg-blue-50 text-blue-700');
    case 'on hold':
    case 'draft':
    case 'partial':
    case 'pending':
      return cn(base, 'bg-amber-50 text-amber-700');
    case 'overdue':
    case 'rejected':
      return cn(base, 'bg-red-50 text-red-700');
    case 'cancelled':
      return cn(base, 'bg-slate-100 text-slate-600');
    default:
      return cn(base, 'bg-slate-100 text-slate-700');
  }
}

/** Shared across every document-related table (Product Master, Document Explorer). */
export function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-300">—</span>;
  return <span className={statusBadgeClass(status)}>{status}</span>;
}

/** Column definitions for an AccAuditLog-backed audit-history table. */
export function auditColumns() {
  return [
    { key: 'created_at', label: 'When', render: (row) => (row.created_at ? formatDate(row.created_at) : '—') },
    { key: 'action', label: 'Action', render: (row) => <span className="capitalize">{row.action}</span> },
    { key: 'user_name', label: 'By', render: (row) => row.user_name || 'System' },
    {
      key: 'changed_fields',
      label: 'Changed fields',
      render: (row) => (Array.isArray(row.changed_fields) && row.changed_fields.length ? row.changed_fields.join(', ') : '—'),
    },
    { key: 'reason', label: 'Reason', render: (row) => row.reason || '—' },
  ];
}
