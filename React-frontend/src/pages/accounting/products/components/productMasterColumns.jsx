import { Link } from 'react-router';
import { InvoiceDrillLink } from '@/components/workspace/invoice/components/InvoiceDrillLink';
import { auditColumns, StatusBadge } from '@/components/workspace/documents/sharedColumns';
import { formatCurrencyAmount, resolveCurrencyCode } from '@/lib/currency';
import { formatDate } from '@/lib/helpers';

export { auditColumns };

function qty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function moneyFmt(defaultCurrency) {
  return (value, currency) => formatCurrencyAmount(value, resolveCurrencyCode(currency, defaultCurrency));
}

function VendorLink({ vendorId, name, onVendorClick }) {
  if (!name) return <span>—</span>;
  if (!onVendorClick || !vendorId) return <span>{name}</span>;
  return (
    <button
      type="button"
      className="font-medium text-primary hover:underline underline-offset-2 text-left"
      onClick={() => onVendorClick(vendorId)}
    >
      {name}
    </button>
  );
}

export function movementsColumns(workspaceId) {
  const base = `/workspace/${workspaceId}/accounting`;
  const docHref = (row) => {
    switch (row.document_kind) {
      case 'invoice':
      case 'invoice_cancel':
        return null; // rendered via InvoiceDrillLink
      case 'bill':
      case 'bill_cancel':
        return `${base}/bills/${row.document_id}`;
      case 'credit_note':
      case 'credit_note_reversal':
        return `${base}/credit-notes/${row.document_id}`;
      case 'vendor_credit':
      case 'vendor_credit_reversal':
        return `${base}/vendor-credits/${row.document_id}`;
      case 'stock_transfer':
        return `${base}/inventory/stock-transfers/${row.document_id}`;
      case 'stock_adjustment':
        return `${base}/inventory/adjustments/${row.document_id}`;
      case 'production_order':
        return `/workspace/${workspaceId}/production-orders/${row.document_id}`;
      default:
        return null;
    }
  };

  return [
    { key: 'movement_date', label: 'Date', render: (row) => formatDate(row.movement_date) },
    {
      key: 'document_number',
      label: 'Document',
      render: (row) => {
        if (!row.document_number) return <span className="text-muted-foreground">{row.notes || '—'}</span>;
        if (row.document_kind === 'invoice' || row.document_kind === 'invoice_cancel') {
          return (
            <InvoiceDrillLink invoiceId={row.document_id} workspaceId={workspaceId} className="font-medium">
              {row.document_number}
            </InvoiceDrillLink>
          );
        }
        const href = docHref(row);
        if (!href) return <span>{row.document_number}</span>;
        return (
          <Link to={href} className="font-medium text-primary hover:underline">
            {row.document_number}
          </Link>
        );
      },
    },
    { key: 'type', label: 'Type', render: (row) => <span className="capitalize">{(row.type || '').replace(/_/g, ' ')}</span> },
    { key: 'warehouse_name', label: 'Warehouse', render: (row) => row.warehouse_name || '—' },
    {
      key: 'qty_in',
      label: 'In',
      align: 'right',
      render: (row) => (row.direction === 'in' ? <span className="tabular-nums text-emerald-700">{qty(row.quantity)}</span> : '—'),
    },
    {
      key: 'qty_out',
      label: 'Out',
      align: 'right',
      render: (row) => (row.direction === 'out' ? <span className="tabular-nums text-red-700">{qty(Math.abs(row.quantity))}</span> : '—'),
    },
    { key: 'running_quantity', label: 'Balance', align: 'right', render: (row) => <span className="tabular-nums font-medium">{qty(row.running_quantity)}</span> },
    { key: 'unit_cost', label: 'Unit cost', align: 'right', render: (row) => <span className="tabular-nums">{qty(row.unit_cost)}</span> },
  ];
}

export function purchaseHistoryColumns(workspaceId, defaultCurrency, { onVendorClick } = {}) {
  const billBase = `/workspace/${workspaceId}/accounting/bills`;
  const money = moneyFmt(defaultCurrency);
  return [
    {
      key: 'bill_number',
      label: 'Bill #',
      render: (row) => (
        <Link to={`${billBase}/${row.bill_id}`} className="font-medium text-primary hover:underline">
          {row.bill_number || '—'}
        </Link>
      ),
    },
    { key: 'bill_date', label: 'Date', render: (row) => formatDate(row.bill_date) },
    {
      key: 'vendor_name',
      label: 'Vendor',
      render: (row) => <VendorLink vendorId={row.vendor_id} name={row.vendor_name} onVendorClick={onVendorClick} />,
    },
    { key: 'quantity', label: 'Qty', align: 'right', render: (row) => <span className="tabular-nums">{qty(row.quantity)}</span> },
    { key: 'rate', label: 'Rate', align: 'right', render: (row) => <span className="tabular-nums">{money(row.rate, row.currency)}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => <span className="tabular-nums font-medium">{money(row.amount, row.currency)}</span> },
    { key: 'outstanding', label: 'Outstanding', align: 'right', render: (row) => <span className="tabular-nums">{money(row.outstanding, row.currency)}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];
}

export function salesHistoryColumns(workspaceId, defaultCurrency) {
  const money = moneyFmt(defaultCurrency);
  return [
    {
      key: 'invoice_number',
      label: 'Invoice #',
      render: (row) => (
        <InvoiceDrillLink invoiceId={row.invoice_id} workspaceId={workspaceId} className="font-medium">
          {row.invoice_number || '—'}
        </InvoiceDrillLink>
      ),
    },
    { key: 'invoice_date', label: 'Date', render: (row) => formatDate(row.invoice_date) },
    { key: 'customer_name', label: 'Customer', render: (row) => row.customer_name || '—' },
    { key: 'quantity', label: 'Qty', align: 'right', render: (row) => <span className="tabular-nums">{qty(row.quantity)}</span> },
    { key: 'selling_price', label: 'Rate', align: 'right', render: (row) => <span className="tabular-nums">{money(row.selling_price, row.currency)}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => <span className="tabular-nums font-medium">{money(row.amount, row.currency)}</span> },
    { key: 'cost', label: 'Cost', align: 'right', render: (row) => <span className="tabular-nums text-muted-foreground">{money(row.cost, row.currency)}</span> },
    {
      key: 'gross_profit',
      label: 'Gross profit',
      align: 'right',
      render: (row) => (
        <span className={`tabular-nums font-medium ${Number(row.gross_profit) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
          {money(row.gross_profit, row.currency)}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];
}

export function vendorCreditColumns(workspaceId, defaultCurrency, { onVendorClick } = {}) {
  const base = `/workspace/${workspaceId}/accounting`;
  const money = moneyFmt(defaultCurrency);
  return [
    {
      key: 'credit_number',
      label: 'Credit #',
      render: (row) => (
        <Link to={`${base}/vendor-credits/${row.vendor_credit_id}`} className="font-medium text-primary hover:underline">
          {row.credit_number || '—'}
        </Link>
      ),
    },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    {
      key: 'vendor_name',
      label: 'Vendor',
      render: (row) => <VendorLink vendorId={row.vendor_id} name={row.vendor_name} onVendorClick={onVendorClick} />,
    },
    {
      key: 'linked_bill_number',
      label: 'Against bill',
      render: (row) =>
        row.linked_bill_id ? (
          <Link to={`${base}/bills/${row.linked_bill_id}`} className="text-primary hover:underline">
            {row.linked_bill_number || '—'}
          </Link>
        ) : (
          '—'
        ),
    },
    { key: 'quantity_returned', label: 'Qty returned', align: 'right', render: (row) => <span className="tabular-nums">{qty(row.quantity_returned)}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => <span className="tabular-nums font-medium">{money(row.amount, row.currency)}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];
}

export function customerReturnColumns(workspaceId, defaultCurrency) {
  const base = `/workspace/${workspaceId}/accounting`;
  const money = moneyFmt(defaultCurrency);
  return [
    {
      key: 'credit_note_number',
      label: 'Credit note #',
      render: (row) => (
        <Link to={`${base}/credit-notes/${row.credit_note_id}`} className="font-medium text-primary hover:underline">
          {row.credit_note_number || '—'}
        </Link>
      ),
    },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'customer_name', label: 'Customer', render: (row) => row.customer_name || '—' },
    {
      key: 'linked_invoice_number',
      label: 'Against invoice',
      render: (row) =>
        row.linked_invoice_id ? (
          <InvoiceDrillLink invoiceId={row.linked_invoice_id} workspaceId={workspaceId}>
            {row.linked_invoice_number || '—'}
          </InvoiceDrillLink>
        ) : (
          '—'
        ),
    },
    { key: 'quantity_returned', label: 'Qty returned', align: 'right', render: (row) => <span className="tabular-nums">{qty(row.quantity_returned)}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => <span className="tabular-nums font-medium">{money(row.amount, row.currency)}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];
}

export function transferColumns(workspaceId) {
  const base = `/workspace/${workspaceId}/accounting`;
  return [
    {
      key: 'transfer_number',
      label: 'Transfer #',
      render: (row) => (
        <Link to={`${base}/inventory/stock-transfers/${row.transfer_id}`} className="font-medium text-primary hover:underline">
          {row.transfer_number || '—'}
        </Link>
      ),
    },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    {
      key: 'from_warehouse_name',
      label: 'From',
      render: (row) =>
        row.from_warehouse_id ? (
          <Link to={`${base}/inventory/warehouses/${row.from_warehouse_id}/stock`} className="hover:underline">
            {row.from_warehouse_name}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'to_warehouse_name',
      label: 'To',
      render: (row) =>
        row.to_warehouse_id ? (
          <Link to={`${base}/inventory/warehouses/${row.to_warehouse_id}/stock`} className="hover:underline">
            {row.to_warehouse_name}
          </Link>
        ) : (
          '—'
        ),
    },
    { key: 'quantity', label: 'Qty', align: 'right', render: (row) => <span className="tabular-nums font-medium">{qty(row.quantity)}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];
}

export function adjustmentColumns(workspaceId) {
  const base = `/workspace/${workspaceId}/accounting`;
  return [
    {
      key: 'adjustment_number',
      label: 'Adjustment #',
      render: (row) => (
        <Link to={`${base}/inventory/adjustments/${row.adjustment_id}`} className="font-medium text-primary hover:underline">
          {row.adjustment_number || '—'}
        </Link>
      ),
    },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    {
      key: 'warehouse_name',
      label: 'Warehouse',
      render: (row) =>
        row.warehouse_id ? (
          <Link to={`${base}/inventory/warehouses/${row.warehouse_id}/stock`} className="hover:underline">
            {row.warehouse_name}
          </Link>
        ) : (
          '—'
        ),
    },
    { key: 'increase', label: 'Increase', align: 'right', render: (row) => (row.increase > 0 ? <span className="tabular-nums text-emerald-700">+{qty(row.increase)}</span> : '—') },
    { key: 'decrease', label: 'Decrease', align: 'right', render: (row) => (row.decrease > 0 ? <span className="tabular-nums text-red-700">-{qty(row.decrease)}</span> : '—') },
    { key: 'reason_label', label: 'Reason', render: (row) => row.reason_label || '—' },
    { key: 'user_name', label: 'By', render: (row) => row.user_name || '—' },
  ];
}

export function productionColumns(workspaceId) {
  return [
    {
      key: 'po_number',
      label: 'Production order',
      render: (row) => (
        <Link to={`/workspace/${workspaceId}/production-orders/${row.order_id}`} className="font-medium text-primary hover:underline">
          {row.po_number || '—'}
        </Link>
      ),
    },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.role === 'finished_good' ? 'Output' : 'Material consumed'}
        </Badge>
      ),
    },
    { key: 'quantity', label: 'Qty', align: 'right', render: (row) => <span className="tabular-nums">{qty(row.quantity)}</span> },
    { key: 'total_cost', label: 'Cost', align: 'right', render: (row) => <span className="tabular-nums">{row.total_cost != null ? qty(row.total_cost) : '—'}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];
}

export function accountingColumns(workspaceId, defaultCurrency) {
  const base = `/workspace/${workspaceId}/accounting`;
  const money = moneyFmt(defaultCurrency);
  return [
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    {
      key: 'journal_reference',
      label: 'Journal entry',
      render: (row) => (
        <Link to={`${base}/journal/${row.journal_entry_id}`} className="font-medium text-primary hover:underline">
          {row.journal_reference || `#${row.journal_entry_id}`}
        </Link>
      ),
    },
    { key: 'journal_description', label: 'Description', render: (row) => row.journal_description || '—' },
    {
      key: 'accounts',
      label: 'Accounts (document-level)',
      render: (row) => (
        <div className="flex flex-col gap-0.5 text-xs">
          {(row.accounts || []).map((a, i) => (
            <span key={i}>
              {a.account_number} {a.account_name} —{' '}
              {a.debit > 0 ? `Dr ${money(a.debit, null)}` : `Cr ${money(a.credit, null)}`}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'product_line_value',
      label: "This product's value",
      align: 'right',
      render: (row) => <span className="tabular-nums font-medium">{money(row.product_line_value, null)}</span>,
    },
  ];
}
