import { getOfflineDb } from './db';
import { newClientMutationId } from './uuid';

export const OUTBOX_STATUS = {
  Pending: 'Pending',
  Syncing: 'Syncing',
  Synced: 'Synced',
  Failed: 'Failed',
};

const outboxListeners = new Set();

/**
 * Fires whenever an outbox row is added or changes status, for any consumer
 * that derives a read-only view from outbox contents (e.g. the pharmacy
 * catalog's offline stock overlay) without coupling this generic offline
 * layer to any specific feature.
 */
export function subscribeOutboxChange(listener) {
  outboxListeners.add(listener);
  return () => outboxListeners.delete(listener);
}

function notifyOutboxChange(companyId) {
  outboxListeners.forEach((fn) => {
    try {
      fn(companyId);
    } catch {
      /* a bad subscriber must not break outbox writes */
    }
  });
}

/**
 * @param {string|number} companyId
 * @param {{ entity: string, op: string, uuid: string, base_version?: number|null, payload: object, client_mutation_id?: string }} item
 */
export async function enqueueOutbox(companyId, item) {
  const db = getOfflineDb(companyId);

  // Coalesce pending/failed mutations for the same entity uuid + op so offline
  // re-saves update the payload instead of stacking creates (server create is
  // uuid-idempotent and would ignore later line edits).
  if (item.uuid && item.entity && item.op) {
    const existingPending = await db.outbox
      .where('status')
      .anyOf([OUTBOX_STATUS.Pending, OUTBOX_STATUS.Failed])
      .filter(
        (row) =>
          row.entity === item.entity &&
          row.op === item.op &&
          row.uuid === item.uuid,
      )
      .first();
    if (existingPending) {
      const updated = {
        ...existingPending,
        base_version: item.base_version ?? existingPending.base_version,
        payload: item.payload || {},
        status: OUTBOX_STATUS.Pending,
        last_error: null,
        updated_at: Date.now(),
      };
      await db.outbox.put(updated);
      notifyOutboxChange(companyId);
      return updated;
    }
  }

  const clientMutationId = item.client_mutation_id || newClientMutationId();
  const row = {
    client_mutation_id: clientMutationId,
    entity: item.entity,
    op: item.op,
    uuid: item.uuid,
    base_version: item.base_version ?? null,
    payload: item.payload || {},
    status: OUTBOX_STATUS.Pending,
    attempts: 0,
    last_error: null,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  await db.outbox.put(row);
  notifyOutboxChange(companyId);
  return row;
}

export async function listPendingOutbox(companyId, limit = 50) {
  const db = getOfflineDb(companyId);
  const rows = await db.outbox
    .where('status')
    .anyOf([OUTBOX_STATUS.Pending, OUTBOX_STATUS.Failed])
    .sortBy('created_at');
  return rows.slice(0, limit);
}

export async function countPendingOutbox(companyId) {
  const db = getOfflineDb(companyId);
  return db.outbox
    .where('status')
    .anyOf([OUTBOX_STATUS.Pending, OUTBOX_STATUS.Failed, OUTBOX_STATUS.Syncing])
    .count();
}

export async function markOutboxStatus(companyId, clientMutationId, status, extra = {}) {
  const db = getOfflineDb(companyId);
  const existing = await db.outbox.get(clientMutationId);
  if (!existing) return;
  await db.outbox.put({
    ...existing,
    ...extra,
    status,
    updated_at: Date.now(),
  });
  notifyOutboxChange(companyId);
}

export async function markOutboxSynced(companyId, clientMutationId, serverResult = {}) {
  await markOutboxStatus(companyId, clientMutationId, OUTBOX_STATUS.Synced, {
    server_result: serverResult,
    last_error: null,
  });
}

export async function markOutboxFailed(companyId, clientMutationId, message) {
  const db = getOfflineDb(companyId);
  const existing = await db.outbox.get(clientMutationId);
  if (!existing) return;
  await db.outbox.put({
    ...existing,
    status: OUTBOX_STATUS.Failed,
    attempts: (existing.attempts || 0) + 1,
    last_error: message || 'Sync failed',
    updated_at: Date.now(),
  });
  notifyOutboxChange(companyId);
}
