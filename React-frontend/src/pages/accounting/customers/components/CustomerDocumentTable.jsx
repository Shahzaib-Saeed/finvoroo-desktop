import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoney } from '../constants';
import { getPaymentDisplayReference } from '../payment-reference';

function StatusBadge({ status }) {
  const s = (status || 'draft').toLowerCase();
  const colors = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    void: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <Badge variant="outline" className={`capitalize ${colors[s] || ''}`}>
      {status || '—'}
    </Badge>
  );
}

export function CustomerDocumentTable({ title, columns, rows, emptyMessage, currency = 'USD' }) {
  return (
    <Card className="shadow-none overflow-hidden border border-border/80">
      {title ? (
        <div className="border-b bg-muted/20 px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      ) : null}
      <CardContent className="p-0">
        {!rows?.length ? (
          <p className="text-sm text-muted-foreground py-10 text-center">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/10 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-2.5 font-medium ${col.align === 'right' ? 'text-right' : ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}
                      >
                        {col.render ? col.render(row, currency) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function invoiceColumns(workspaceId) {
  const base = `/workspace/${workspaceId}/accounting/invoices`;
  return [
    {
      key: 'number',
      label: 'Invoice #',
      render: (row) => (
        <Link to={`${base}/${row.id}`} className="font-medium text-primary hover:underline">
          {row.invoice_number || '—'}
        </Link>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => row.invoice_date_display || row.invoice_date || '—',
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: (row, currency) => formatMoney(row.total, row.currency || currency),
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      render: (row, currency) =>
        formatMoney(row.balance_due ?? row.amount_due, row.currency || currency),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];
}

export function paymentColumns() {
  return [
    {
      key: 'reference',
      label: 'Reference',
      render: (row) => getPaymentDisplayReference(row),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => row.payment_date_display || row.payment_date || '—',
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row, currency) => formatMoney(row.amount, row.currency || currency),
    },
    {
      key: 'method',
      label: 'Method',
      render: (row) => row.payment_method || '—',
    },
  ];
}

export function salesOrderColumns(workspaceId) {
  const base = `/workspace/${workspaceId}/accounting/sales-orders`;
  return [
    {
      key: 'number',
      label: 'SO #',
      render: (row) => (
        <Link to={`${base}/${row.id}`} className="font-medium text-primary hover:underline">
          {row.so_number || `SO-${row.id}`}
        </Link>
      ),
    },
    {
      key: 'date',
      label: 'Order date',
      render: (row) => row.order_date_display || row.order_date || '—',
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: (row, currency) => formatMoney(row.total, row.currency || currency),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];
}

export function quotationColumns(workspaceId) {
  const base = `/workspace/${workspaceId}/accounting/quotations`;
  return [
    {
      key: 'number',
      label: 'Quote #',
      render: (row) => (
        <Link to={`${base}/${row.id}`} className="font-medium text-primary hover:underline">
          {row.quote_number || `QT-${row.id}`}
        </Link>
      ),
    },
    {
      key: 'date',
      label: 'Quote date',
      render: (row) => row.quote_date_display || row.quote_date || '—',
    },
    {
      key: 'expiry',
      label: 'Expiry',
      render: (row) => row.expiry_date_display || row.expiry_date || '—',
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: (row, currency) => formatMoney(row.total, row.currency || currency),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];
}

export function creditNoteColumns(workspaceId) {
  const base = `/workspace/${workspaceId}/accounting/credit-notes`;
  return [
    {
      key: 'number',
      label: 'Credit note #',
      render: (row) => (
        <Link to={`${base}/${row.id}`} className="font-medium text-primary hover:underline">
          {row.credit_note_number || row.id}
        </Link>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => row.date_display || row.date || '—',
    },
    {
      key: 'total',
      label: 'Amount',
      align: 'right',
      render: (row, currency) => formatMoney(row.total, row.currency || currency),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];
}
