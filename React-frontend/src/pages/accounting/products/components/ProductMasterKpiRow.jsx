import { CustomerDetailsStats } from '@/pages/accounting/customers/components/CustomerDetailsStats';

function qtyOrDash(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/**
 * Live-computed, never-cached KPI row for the Product Master hub — thin
 * wrapper around the shared CustomerDetailsStats card grid.
 */
export function ProductMasterKpiRow({ kpis, product, formatMoney }) {
  if (!kpis) return null;
  const currency = product?.currency;
  const tracksStock = product?.track_inventory;

  const items = [
    {
      label: 'On hand',
      value: tracksStock ? qtyOrDash(kpis.on_hand_qty) : '—',
      hint: tracksStock ? `${kpis.total_warehouses ?? 0} warehouse(s)` : 'Not tracked',
    },
    {
      label: 'Available',
      value: tracksStock ? qtyOrDash(kpis.available_qty) : '—',
      hint: tracksStock ? `${qtyOrDash(kpis.reserved_qty)} reserved` : null,
    },
    {
      label: 'Inventory value',
      value: tracksStock ? formatMoney(kpis.inventory_value, currency) : '—',
      hint: tracksStock ? `Avg cost ${formatMoney(kpis.average_cost, currency)}` : null,
    },
    {
      label: 'Last purchase cost',
      value: kpis.last_purchase_cost != null ? formatMoney(kpis.last_purchase_cost, currency) : '—',
    },
    {
      label: 'Last selling price',
      value: kpis.last_selling_price != null ? formatMoney(kpis.last_selling_price, currency) : '—',
    },
    {
      label: 'Total purchases',
      value: String(kpis.total_purchases ?? 0),
      hint: 'Bill lines',
    },
    {
      label: 'Total sales',
      value: String(kpis.total_sales ?? 0),
      hint: 'Invoice lines',
    },
  ];

  return <CustomerDetailsStats items={items} />;
}
