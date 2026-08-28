import { getOfflineDb } from './db';
import { isOnline } from './connectivity';
import { enqueueOutbox } from './outbox';
import { runSyncCycle } from './sync-manager';
import { newUuid, provisionalInvoiceLabel } from './uuid';

/**
 * Generic offline draft save for quotations / bills / POs / expenses / customers.
 *
 * @param {object} opts
 * @param {string|number} opts.companyId
 * @param {'quotation'|'bill'|'purchase_order'|'expense'|'customer'|'invoice'|'pos'} opts.entity
 * @param {'create'|'update'|'checkout'} opts.op
 * @param {object} opts.payload - API payload (will get uuid stamped)
 * @param {string} [opts.uuid]
 * @param {number|null} [opts.baseVersion]
 * @param {boolean} opts.offlineSyncEnabled
 * @param {Function} [opts.onlineSave] - async () => { invoice/data, response }
 */
export async function saveDocumentDraft({
  companyId,
  entity,
  op = 'create',
  payload,
  uuid: existingUuid,
  baseVersion = null,
  offlineSyncEnabled,
  onlineSave,
  forceOffline = false,
}) {
  const shouldQueue =
    Boolean(offlineSyncEnabled) && (forceOffline || !isOnline() || payload?.force_offline_queue);

  const uuid = existingUuid || payload?.uuid || newUuid();
  const stamped = { ...payload, uuid };
  if (Array.isArray(stamped.lines)) {
    stamped.lines = stamped.lines.map((line) => ({
      ...line,
      uuid: line.uuid || newUuid(),
    }));
  }

  if (!shouldQueue && typeof onlineSave === 'function') {
    const result = await onlineSave({ ...stamped });
    if (offlineSyncEnabled && isOnline()) {
      runSyncCycle(companyId, { reason: 'after-online-save' }).catch(() => {});
    }
    return { offline: false, ...result, uuid };
  }

  if (!offlineSyncEnabled) {
    throw new Error('Offline sync is not enabled for this company.');
  }

  const db = getOfflineDb(companyId);
  const storeName = entityStore(entity);
  const provisional = provisionalInvoiceLabel(uuid);
  const local = {
    uuid,
    server_id: null,
    number: provisional,
    status: 'draft',
    lock_version: baseVersion || 0,
    payload: stamped,
    sync_status: 'pending',
    offline_pending: true,
    entity,
    updated_at: Date.now(),
    created_at: Date.now(),
  };

  if (storeName && db[storeName]) {
    const existing = await db[storeName].get(uuid);
    await db[storeName].put({
      ...(existing || {}),
      ...local,
      server_id: existing?.server_id ?? null,
      number: existing?.number || provisional,
      created_at: existing?.created_at || Date.now(),
    });
  }

  await enqueueOutbox(companyId, {
    entity: entity === 'pos' ? 'pos' : entity,
    op: entity === 'pos' ? 'checkout' : op,
    uuid,
    base_version: op === 'update' ? baseVersion : null,
    payload: stamped,
  });

  if (isOnline()) {
    runSyncCycle(companyId, { reason: 'after-offline-save' }).catch(() => {});
  }

  return {
    offline: true,
    uuid,
    data: {
      id: null,
      uuid,
      status: 'draft',
      offline_pending: true,
      [`${numberField(entity)}`]: provisional,
    },
  };
}

/**
 * List local offline drafts for a document type (survives refresh — IndexedDB).
 * Used when list APIs fail offline so pending work stays visible.
 *
 * @param {string|number} companyId
 * @param {'bill'|'invoice'|'quotation'|'purchase_order'|'expense'} entity
 */
export async function listOfflineDocuments(companyId, entity) {
  if (!companyId) return [];
  const db = getOfflineDb(companyId);
  const storeName = entityStore(entity);
  if (!storeName || !db[storeName]) return [];

  const rows = await db[storeName].toArray();
  return rows
    .filter((row) => row?.sync_status === 'pending' || row?.offline_pending || !row?.server_id)
    .map((row) => mapLocalDocToListRow(entity, row))
    .sort((a, b) => (b._local_updated_at || 0) - (a._local_updated_at || 0));
}

function mapLocalDocToListRow(entity, row) {
  const payload = row.payload || {};
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  const total = lines.reduce((sum, line) => {
    const qty = Number(line.quantity ?? 0);
    const price = Number(line.unit_price ?? 0);
    return sum + qty * price;
  }, 0);
  const number = row.number || payload[numberField(entity)] || provisionalInvoiceLabel(row.uuid);
  const base = {
    id: row.server_id || `offline:${row.uuid}`,
    uuid: row.uuid,
    status: row.status || payload.status || 'draft',
    offline_pending: true,
    sync_status: row.sync_status || 'pending',
    currency: payload.currency || 'USD',
    total,
    balance_due: total,
    flags: {
      can_post: false,
      can_edit: false,
      can_record_payment: false,
      can_delete: false,
      can_cancel: false,
    },
    _local_updated_at: row.updated_at || row.created_at || 0,
  };

  if (entity === 'bill') {
    return {
      ...base,
      bill_number: number,
      bill_date: payload.bill_date || null,
      due_date: payload.due_date || null,
      vendor_id: payload.vendor_id || null,
      vendor: {
        id: payload.vendor_id || null,
        name: payload.vendor_name || 'Vendor (offline draft)',
        email: payload.vendor_email || null,
      },
    };
  }

  if (entity === 'invoice') {
    return {
      ...base,
      invoice_number: number,
      invoice_date: payload.invoice_date || null,
      due_date: payload.due_date || null,
      customer_id: payload.customer_id || null,
      customer: {
        id: payload.customer_id || null,
        name: payload.customer_name || 'Customer (offline draft)',
        email: payload.customer_email || null,
      },
    };
  }

  if (entity === 'quotation') {
    return {
      ...base,
      quote_number: number,
      quote_date: payload.quote_date || null,
      expiry_date: payload.expiry_date || null,
      customer_id: payload.customer_id || null,
      customer: {
        id: payload.customer_id || null,
        name: payload.customer_name || 'Customer (offline draft)',
        email: payload.customer_email || null,
      },
    };
  }

  if (entity === 'purchase_order') {
    return {
      ...base,
      po_number: number,
      order_date: payload.order_date || null,
      expected_delivery: payload.expected_delivery || null,
      vendor_id: payload.vendor_id || null,
      vendor: {
        id: payload.vendor_id || null,
        name: payload.vendor_name || 'Vendor (offline draft)',
        email: payload.vendor_email || null,
      },
    };
  }

  if (entity === 'expense') {
    const amount = Number(payload.amount ?? total ?? 0);
    return {
      ...base,
      reference: number,
      expense_date: payload.expense_date || null,
      amount,
      total: amount,
      description: payload.description || '',
      vendor_id: payload.vendor_id || null,
      vendor: {
        id: payload.vendor_id || null,
        name: payload.vendor_name || (payload.vendor_id ? 'Vendor (offline draft)' : '—'),
      },
    };
  }

  if (entity === 'credit_note') {
    const amount = Number(payload.amount ?? total ?? 0);
    return {
      ...base,
      credit_note_number: number,
      credit_note_date: payload.credit_note_date || null,
      total: amount,
      customer_id: payload.customer_id || null,
      customer: {
        id: payload.customer_id || null,
        name: payload.customer_name || 'Customer (offline draft)',
        email: payload.customer_email || null,
      },
    };
  }

  if (entity === 'debit_note') {
    const amount = Number(payload.amount ?? total ?? 0);
    return {
      ...base,
      credit_number: number,
      credit_date: payload.credit_date || null,
      total: amount,
      vendor_id: payload.vendor_id || null,
      vendor: {
        id: payload.vendor_id || null,
        name: payload.vendor_name || 'Vendor (offline draft)',
        email: payload.vendor_email || null,
      },
    };
  }

  return { ...base, number, payload };
}

function entityStore(entity) {
  switch (entity) {
    case 'quotation':
      return 'quotations';
    case 'bill':
      return 'bills';
    case 'purchase_order':
      return 'purchase_orders';
    case 'expense':
      return 'expenses';
    case 'credit_note':
      return 'credit_notes';
    case 'debit_note':
      return 'debit_notes';
    case 'customer':
      return 'customers';
    case 'invoice':
    case 'pos':
      return 'invoices';
    default:
      return null;
  }
}

function numberField(entity) {
  switch (entity) {
    case 'quotation':
      return 'quote_number';
    case 'bill':
      return 'bill_number';
    case 'purchase_order':
      return 'po_number';
    case 'expense':
      return 'reference';
    case 'credit_note':
      return 'credit_note_number';
    case 'debit_note':
      return 'credit_number';
    default:
      return 'invoice_number';
  }
}
