import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '../constants';

function StatusBadge({ status }) {
  const s = (status || 'draft').toLowerCase();
  const colors = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    open: 'bg-blue-50 text-blue-700 border-blue-200',
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

export function VendorDocumentTable({ title, columns, rows, emptyMessage, currency = 'USD' }) {
  return (
    <Card className="shadow-none overflow-hidden">
      {title ? (
        <CardHeader className="px-4 pt-4 pb-3 border-b">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="px-4 pt-4 pb-5">
        {!rows?.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-2 pr-4 font-medium ${col.align === 'right' ? 'text-right' : ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-2.5 pr-4 ${col.align === 'right' ? 'text-right' : ''}`}
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

export function billColumns(workspaceId) {
  const base = `/workspace/${workspaceId}/accounting/bills`;
  return [
    {
      key: 'number',
      label: 'Bill #',
      render: (row) => (
        <Link to={`${base}/${row.id}`} className="font-medium text-primary hover:underline">
          {row.bill_number || '—'}
        </Link>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => row.bill_date_display || row.bill_date || '—',
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

export function billPaymentColumns() {
  return [
    {
      key: 'reference',
      label: 'Reference',
      render: (row) => row.reference || `#${row.id}`,
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

export function purchaseOrderColumns(workspaceId) {
  const base = `/workspace/${workspaceId}/accounting/purchase-orders`;
  return [
    {
      key: 'number',
      label: 'PO #',
      render: (row) => (
        <Link to={`${base}/${row.id}`} className="font-medium text-primary hover:underline">
          {row.po_number || `PO-${row.id}`}
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

export function vendorCreditColumns(workspaceId) {
  const base = `/workspace/${workspaceId}/accounting/vendor-credits`;
  return [
    {
      key: 'number',
      label: 'Vendor credit #',
      render: (row) => (
        <Link to={`${base}/${row.id}`} className="font-medium text-primary hover:underline">
          {row.credit_number || row.id}
        </Link>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => row.credit_date_display || row.credit_date || '—',
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
