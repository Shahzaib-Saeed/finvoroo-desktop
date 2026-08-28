/**
 * Client-side FEFO (first-expiry-first-out) batch ordering and allocation —
 * mirrors Laravel-api-backend's BatchInventoryService::allocateFefo() ordering
 * exactly (batches with an expiry date first, ascending expiry, then
 * ascending received date, then ascending id; batches with no expiry date
 * sort last), so the batch a cashier sees picked as "Auto FEFO" is the same
 * one the server would pick.
 *
 * Finvoroo Desktop Phase 6b: used to decide WHICH batch an offline sale's
 * outbox payload should reference (`selected_batch_id`) so the line looks
 * right immediately and is a good-faith pick — the server still re-validates
 * and performs the authoritative deduction once at sync time
 * (BatchInventoryService::allocateFefo runs there exactly as it does for an
 * online sale). This never deducts stock locally.
 *
 * Batch objects use whichever key shape the caller already has —
 * `batch_id`/`id`, `quantity_on_hand`/`qty`/`quantity`, `received_at`.
 */

function batchId(b) {
  return b?.batch_id ?? b?.id ?? null;
}

function batchQty(b) {
  return Number(b?.quantity_on_hand ?? b?.qty ?? b?.quantity ?? 0);
}

function batchExpiry(b) {
  const v = b?.expiry_date;
  return v ? String(v).slice(0, 10) : null;
}

function batchReceivedAt(b) {
  const v = b?.received_at;
  return v ? String(v) : '';
}

/**
 * Sort batches FEFO-first. Pure — returns a new array, never mutates input.
 */
export function sortBatchesFefo(batches) {
  const list = Array.isArray(batches) ? batches.slice() : [];
  return list.sort((a, b) => {
    const expA = batchExpiry(a);
    const expB = batchExpiry(b);
    // Batches with no expiry date sort after every dated batch.
    if (expA === null && expB !== null) return 1;
    if (expA !== null && expB === null) return -1;
    if (expA !== expB) return expA < expB ? -1 : 1;

    const recA = batchReceivedAt(a);
    const recB = batchReceivedAt(b);
    if (recA !== recB) return recA < recB ? -1 : 1;

    const idA = Number(batchId(a)) || 0;
    const idB = Number(batchId(b)) || 0;
    return idA - idB;
  });
}

/**
 * Walk FEFO-sorted batches allocating `quantity`, mirroring
 * BatchInventoryService::allocateFefo's remaining-quantity loop. By default
 * (allowExpired=false) skips batches whose expiry_date has already passed —
 * pass allowExpired=true only where the server would too (an explicit
 * override), never as a silent default.
 *
 * @returns {{ batch_id, expiry_date, quantity }[]} allocations, oldest-batch-first
 */
export function allocateFefo(batches, quantity, { allowExpired = false } = {}) {
  let remaining = Number(quantity) || 0;
  if (remaining <= 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const sorted = sortBatchesFefo(batches).filter((b) => batchQty(b) > 0);

  const allocations = [];
  for (const b of sorted) {
    if (remaining <= 0) break;
    const expiry = batchExpiry(b);
    const expired = expiry !== null && expiry < today;
    if (expired && !allowExpired) continue;

    const take = Math.min(remaining, batchQty(b));
    if (take <= 0) continue;
    allocations.push({ batch_id: batchId(b), expiry_date: expiry, quantity: take });
    remaining -= take;
  }

  return allocations;
}

/**
 * Convenience: the single batch an "Auto FEFO" pick should show/select for a
 * line — the first allocation's batch, or null if none available/eligible.
 */
export function pickFefoBatch(batches, quantity = 1) {
  const [first] = allocateFefo(batches, quantity);
  if (!first) return null;
  return (Array.isArray(batches) ? batches : []).find((b) => batchId(b) === first.batch_id) || null;
}
