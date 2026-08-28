/**
 * Derive viewer KPI cards from report result metadata — client-side only.
 */
export function deriveViewerKpis(result, definition) {
  if (!result?.columns?.length) return [];

  const kpis = [];
  const totalRows = result.total ?? result.rows?.length ?? 0;

  kpis.push({
    id: 'rows',
    label: 'Rows returned',
    value: totalRows.toLocaleString(),
    hint: 'Matching your filters',
  });

  const moneyCols = result.columns.filter((c) => c.type === 'money' || c.formatter === 'money');
  const grand = result.grand_totals || {};

  moneyCols.slice(0, 2).forEach((col) => {
    const total = grand[col.key];
    if (total !== undefined && total !== null) {
      kpis.push({
        id: `sum-${col.key}`,
        label: `Total ${col.label}`,
        value: Number(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        hint: 'Grand total',
      });
    }
  });

  const customerCol = result.columns.find((c) => /customer/i.test(c.key) || /customer/i.test(c.label));
  if (customerCol && result.rows?.length) {
    const unique = new Set(result.rows.map((r) => r[customerCol.key]).filter(Boolean));
    if (unique.size > 0 && unique.size < totalRows) {
      kpis.push({
        id: 'customers',
        label: 'Customers',
        value: unique.size.toLocaleString(),
        hint: 'On this page',
      });
    }
  }

  const groupCount = definition?.group_by?.length ?? 0;
  if (groupCount > 0) {
    kpis.push({
      id: 'grouped',
      label: 'Grouped by',
      value: String(groupCount),
      hint: `${groupCount} dimension${groupCount === 1 ? '' : 's'}`,
    });
  }

  return kpis.slice(0, 4);
}

export function chartDataFromResult(result) {
  if (!result?.rows?.length || result.rows.length < 2) return null;

  const labelCol = result.columns.find((c) => c.type === 'string' && !c.is_calculated);
  const valueCol = result.columns.find((c) => c.type === 'money' || c.type === 'number');

  if (!labelCol || !valueCol) return null;

  const points = result.rows.slice(0, 12).map((row) => ({
    name: String(row[labelCol.key] ?? '').slice(0, 24) || '—',
    value: Number(row[valueCol.key]) || 0,
  }));

  if (points.every((p) => p.value === 0)) return null;
  return { points, labelKey: labelCol.label, valueKey: valueCol.label };
}
