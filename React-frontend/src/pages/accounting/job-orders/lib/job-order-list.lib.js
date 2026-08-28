/** Present labels in clean title case (e.g. "BOOKING NO." → "Booking No."). */
export function formatFieldLabel(label) {
  const raw = String(label ?? '').trim().replace(/:+$/, '');
  if (!raw) return '';
  if (raw === raw.toUpperCase() && /[A-Z]/.test(raw)) {
    return raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return raw;
}

export function matchesAny(label, keywords) {
  const l = String(label ?? '').toLowerCase();
  return keywords.some((k) => l.includes(k));
}

export function extractCustomFieldValues(job, defs) {
  const out = [];
  const seen = new Set();
  if (Array.isArray(defs) && defs.length) {
    for (const def of defs) {
      const fields = Array.isArray(job.custom_fields) ? job.custom_fields : [];
      const defId = Number(def?.id);
      let value = '';
      if (defId) {
        const byId = fields.find((f) => Number(f?.id) === defId);
        if (byId?.value != null && String(byId.value).trim() !== '') value = String(byId.value);
      }
      if (!value) {
        const lbl = String(def?.label ?? '').trim();
        const byLabel = lbl ? fields.find((f) => String(f?.label ?? '').trim() === lbl) : null;
        if (byLabel?.value != null && String(byLabel.value).trim() !== '') value = String(byLabel.value);
      }
      if (value) {
        out.push({ label: def.label, value });
        seen.add(String(def.label ?? '').trim());
      }
    }
  }
  if (Array.isArray(job.custom_fields)) {
    for (const f of job.custom_fields) {
      const lbl = String(f?.label ?? '').trim();
      if (!lbl || seen.has(lbl)) continue;
      if (f?.value != null && String(f.value).trim() !== '') {
        out.push({ label: lbl, value: String(f.value) });
      }
    }
  }
  return out;
}

/**
 * Look up a custom-field value by keyword match. First unused match wins.
 * Pass `used` Set to avoid claiming the same field twice.
 */
export function findFieldByKeywords(fields, keywords, used = null) {
  const list = Array.isArray(fields) ? fields : [];
  const match = list.find(
    (f) =>
      (!used || !used.has(f.label)) &&
      matchesAny(f.label, keywords) &&
      f.value != null &&
      String(f.value).trim() !== '',
  );
  if (match && used) used.add(match.label);
  return match?.value != null ? String(match.value) : null;
}

/** Preferred logistics slot order — maps custom fields into a stable ERP layout. */
export const LOGISTICS_SLOTS = [
  { label: 'Booking No.', keywords: ['booking'] },
  { label: 'HBL/MBL', keywords: ['hbl', 'mbl', 'vehicle', 'vehcicle', 'bill of lading', 'bl no'] },
  { label: 'Container No.', keywords: ['container', 'ctnr', 'cntr', 'weight'] },
  { label: 'Vessel & Voyage', keywords: ['vessel', 'voyage'] },
  { label: 'POL', keywords: ['pol', 'port of loading', 'loading port'] },
  { label: 'POD', keywords: ['pod', 'port of discharge', 'port of delivery', 'receipt', 'client recipt', 'cleint'] },
  { label: 'ETD', keywords: ['etd', 'departure'] },
  { label: 'Cut Off', keywords: ['cut off', 'cutoff', 'cut-off', 'vsl cut'] },
  { label: 'ETA', keywords: ['eta', 'arrival'] },
];

/** Manifest card column field map (logistics blueprint). */
export const MANIFEST_FIELD_MAP = {
  shippingLine: ['s/line', 's line', 'shipping line', 'shipping', 'carrier'],
  clearingAgent: ['c/agent', 'c agent', 'clearing', 'agent', 'cha'],
  transport: ['transport', 'transporter', 'trucker', 'haulier'],
  bookingNo: ['booking'],
  hblMbl: ['hbl', 'mbl', 'bill of lading', 'bl no', 'vehicle', 'vehcicle'],
  containerNo: ['container', 'ctnr', 'cntr'],
  portOfDelivery: ['pod', 'port of delivery', 'port of discharge', 'delivery'],
  vesselVoyage: ['vessel', 'voyage'],
  vesselCutOff: ['cut off', 'cutoff', 'cut-off', 'vsl cut'],
  vesselEtd: ['etd', 'departure', 'vsl etd'],
  vesselEta: ['eta', 'arrival', 'vsl eta'],
};

export function buildManifestFields(job, definitions) {
  const all = extractCustomFieldValues(job, definitions);
  const used = new Set();
  const pick = (key) => findFieldByKeywords(all, MANIFEST_FIELD_MAP[key], used);

  return {
    shippingLine: pick('shippingLine'),
    clearingAgent: pick('clearingAgent'),
    transport: pick('transport'),
    bookingNo: pick('bookingNo'),
    hblMbl: pick('hblMbl'),
    containerNo: pick('containerNo'),
    portOfDelivery: pick('portOfDelivery'),
    vesselVoyage: pick('vesselVoyage'),
    vesselCutOff: pick('vesselCutOff'),
    vesselEtd: pick('vesselEtd'),
    vesselEta: pick('vesselEta'),
  };
}

/** Column row sets for the Logistics Manifest Card layout. */
export function buildManifestColumns(job, definitions) {
  const f = buildManifestFields(job, definitions);
  const clientName =
    job.customer?.name
    || job.customer_name
    || job.client?.name
    || job.client_name
    || null;

  return {
    identity: [
      { key: 'client', label: 'CLIENT', value: clientName, bold: true },
      { key: 'sline', label: 'S/LINE', value: f.shippingLine },
      { key: 'cagent', label: 'C/AGENT', value: f.clearingAgent },
      { key: 'transport', label: 'TRANSPORT', value: f.transport },
    ],
    shipment: [
      { key: 'booking', label: 'Booking No', value: f.bookingNo },
      { key: 'hbl', label: 'HBL/MBL No', value: f.hblMbl },
      { key: 'container', label: 'Container No', value: f.containerNo },
      { key: 'pod', label: 'Port of Delivery', value: f.portOfDelivery },
    ],
    vessel: [
      { key: 'vessel', label: 'Vessel & Voyage', value: f.vesselVoyage },
      { key: 'cutoff', label: 'Vessel Cut Off', value: f.vesselCutOff },
      { key: 'etd', label: 'Vessel ETD', value: f.vesselEtd },
      { key: 'eta', label: 'Vessel ETA', value: f.vesselEta },
    ],
  };
}

export function buildLogisticsRows(job, definitions) {
  const all = extractCustomFieldValues(job, definitions);
  const used = new Set();
  const rows = [];

  for (const slot of LOGISTICS_SLOTS) {
    const match = all.find(
      (f) => !used.has(f.label) && matchesAny(f.label, slot.keywords),
    );
    if (match) {
      used.add(match.label);
      rows.push({ label: slot.label, value: match.value });
    }
  }

  for (const f of all) {
    if (used.has(f.label)) continue;
    rows.push({ label: formatFieldLabel(f.label), value: f.value });
    used.add(f.label);
  }

  return rows;
}

/** Split logistics rows into two balanced columns for a shorter card layout. */
export function splitLogisticsRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length <= 4) {
    return { colA: list, colB: [] };
  }
  const mid = Math.ceil(list.length / 2);
  return {
    colA: list.slice(0, mid),
    colB: list.slice(mid),
  };
}

/**
 * Column layout configured by the company (Settings → Card layout).
 *
 * Returns null when no definition has an explicit `job_card_column`, so the
 * caller can fall back to automatic keyword placement. Otherwise returns
 * `{ detailsRows, moreRows }` where each row is { key, label, value }.
 * Fields marked 'hidden' are skipped; fields left on 'auto' are balanced
 * across the two columns after the explicitly placed ones.
 */
export function buildConfiguredCardColumns(job, definitions) {
  const defs = Array.isArray(definitions) ? definitions : [];
  if (!defs.some((d) => d?.job_card_column)) return null;

  const values = Array.isArray(job.custom_fields) ? job.custom_fields : [];
  const valueFor = (def) => {
    const byId = values.find((f) => Number(f?.id) === Number(def.id));
    if (byId?.value != null && String(byId.value).trim() !== '') return String(byId.value);
    const lbl = String(def?.label ?? '').trim();
    const byLabel = lbl
      ? values.find((f) => String(f?.label ?? '').trim() === lbl)
      : null;
    if (byLabel?.value != null && String(byLabel.value).trim() !== '') {
      return String(byLabel.value);
    }
    return null;
  };

  const detailsRows = [];
  const moreRows = [];
  const autoRows = [];

  for (const def of defs) {
    if (def?.is_active === false) continue;
    const column = def?.job_card_column || 'auto';
    if (column === 'hidden') continue;
    const value = valueFor(def);
    if (!value) continue;
    const row = {
      key: `def-${def.id}`,
      label: formatFieldLabel(def.label) || def.label,
      value,
    };
    if (column === 'details') detailsRows.push(row);
    else if (column === 'more_details') moreRows.push(row);
    else autoRows.push(row);
  }

  for (const row of autoRows) {
    (detailsRows.length <= moreRows.length ? detailsRows : moreRows).push(row);
  }

  return { detailsRows, moreRows };
}

export function jobLastActivity(job) {
  return job.completed_at || job.started_at || job.created_at || null;
}

export function summaryFromKpis(kpis, listTotal) {
  const find = (key) => {
    const row = (kpis || []).find((k) => k.key === key);
    return row?.value ?? 0;
  };
  return {
    total: listTotal ?? find('open_jobs'),
    inProgress: find('in_progress'),
    completed: find('completed'),
    overdue: find('delayed'),
  };
}

/** Format a compact job date for the manifest ribbon (e.g. 01/07/26). */
export function formatManifestDate(value) {
  if (!value) return '—';
  const raw = String(value).trim();
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(raw)) return raw;
  const d = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}
