import { Link } from 'react-router';
import { InvoiceDrillLink } from '@/components/workspace/invoice/components/InvoiceDrillLink';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyAmount, resolveCurrencyCode } from '@/lib/currency';

function StatusBadge({ status }) {
  const s = (status || 'draft').toLowerCase();
  const colors = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <Badge variant="outline" className={`capitalize ${colors[s] || ''}`}>
      {status || '—'}
    </Badge>
  );
}

function formatQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function ProductHistoryTable({ title, columns, rows, emptyMessage }) {
  return (
    <Card className="shadow-none">
      {title ? (
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="pt-4">
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
                        {col.render ? col.render(row) : row[col.key] ?? '—'}
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

export function productSalesColumns(workspaceId, defaultCurrency = 'USD') {
  const money = (value, currency) =>
    formatCurrencyAmount(value, resolveCurrencyCode(currency, defaultCurrency));
  return [
    {
      key: 'invoice_number',
      label: 'Invoice #',
      render: (row) => (
        <InvoiceDrillLink
          invoiceId={row.invoice_id}
          workspaceId={workspaceId}
          className="font-medium text-primary hover:underline"
        >
          {row.invoice_number || '—'}
        </InvoiceDrillLink>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => row.invoice_date_display || row.invoice_date || '—',
    },
    {
      key: 'customer',
      label: 'Sold to',
      render: (row) => row.customer_name || '—',
    },
    {
      key: 'quantity',
      label: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatQty(row.quantity)}</span>,
    },
    {
      key: 'unit_price',
      label: 'Rate',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums">{money(row.unit_price, row.currency)}</span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-medium">{money(row.amount, row.currency)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];
}

export function productPurchaseColumns(workspaceId, defaultCurrency = 'USD') {
  const billBase = `/workspace/${workspaceId}/accounting/bills`;
  const money = (value, currency) =>
    formatCurrencyAmount(value, resolveCurrencyCode(currency, defaultCurrency));
  return [
    {
      key: 'bill_number',
      label: 'Bill #',
      render: (row) => (
        <Link
          to={`${billBase}/${row.bill_id}`}
          className="font-medium text-primary hover:underline"
        >
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
      key: 'vendor',
      label: 'Purchased from',
      render: (row) => row.vendor_name || '—',
    },
    {
      key: 'quantity',
      label: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatQty(row.quantity)}</span>,
    },
    {
      key: 'unit_price',
      label: 'Rate',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums">{money(row.unit_price, row.currency)}</span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-medium">{money(row.amount, row.currency)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];
}
