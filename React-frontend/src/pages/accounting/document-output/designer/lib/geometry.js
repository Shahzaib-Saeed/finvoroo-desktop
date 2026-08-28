/**
 * Schema coords may be absolute numbers OR anchor strings the PHP renderer
 * understands (`after:<id>`, `after:<id>+2.5`, `bottom:<mm>`). The designer
 * must resolve those to millimeters for hit-testing / drag.
 */

export function isAnchorCoord(value) {
  return typeof value === 'string' && (value.startsWith('after:') || value.startsWith('bottom:'));
}

export function isNumericCoord(value) {
  return typeof value === 'number'
    ? Number.isFinite(value)
    : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
}

export function asNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !isAnchorCoord(value)) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Parse `after:el_items` or `after:el_items+2.5` / `after:el_items-1`. */
export function parseAfterAnchor(value) {
  if (typeof value !== 'string' || !value.startsWith('after:')) return null;
  const spec = value.slice(6);
  const m = spec.match(/^(.+?)([+-]\d+(?:\.\d+)?)$/);
  if (m) return { targetId: m[1], gap: Number(m[2]) || 0 };
  return { targetId: spec, gap: 0 };
}

export function encodeAfterAnchor(targetId, gapMm = 0) {
  // Never persist large negative gaps — they pin blocks to y≈0 and look "stuck".
  const gap = Math.round(Math.max(0, Number(gapMm) || 0) * 100) / 100;
  if (gap < 0.05) return `after:${targetId}`;
  return `after:${targetId}+${gap}`;
}

function geomOf(geomById, id) {
  if (!geomById) return null;
  return geomById instanceof Map ? geomById.get(id) : geomById[id];
}

function elementHeight(el, resolvedEl) {
  // Items table height must follow live preview row count — schema `h` is often
  // a stub (header-only) and must not win over the resolved block height.
  if (el?.type === 'items_table') {
    const resolvedH = asNumber(resolvedEl?.h, 0);
    if (resolvedH > 0) return resolvedH;
  }
  if (asNumber(el.h, 0) > 0) return asNumber(el.h, 0);
  return asNumber(resolvedEl?.h, el.type === 'items_table' ? 40 : 8);
}

/**
 * If `yMm` sits at/below the items table bottom, return an `after:<tableId>[+gap]`
 * string so print/preview keeps following growing line counts.
 */
export function maybeAnchorYAfterTable(yMm, elements, geomById, options = {}) {
  const thresholdMm = options.thresholdMm ?? 1.5;
  const table = (elements || []).find((e) => e.type === 'items_table');
  if (!table) return Math.round(asNumber(yMm, 0) * 100) / 100;

  const g = geomOf(geomById, table.id);
  if (!g) return Math.round(asNumber(yMm, 0) * 100) / 100;

  const tableBottom = asNumber(g.y, 0) + asNumber(g.h, 0);
  // Refuse to anchor if we don't have a believable table box (avoids y→0 stuck).
  if (!(tableBottom > 8) || !(asNumber(g.h, 0) > 4)) {
    return Math.round(asNumber(yMm, 0) * 100) / 100;
  }

  const y = asNumber(yMm, 0);
  if (y < tableBottom - thresholdMm) {
    return Math.round(y * 100) / 100;
  }
  return encodeAfterAnchor(table.id, y - tableBottom);
}

/**
 * Resolve one axis value to mm, mirroring CanvasHtmlRenderer::finalizeY.
 * @param {'x'|'y'} axis
 */
export function resolveAxis(value, axis, ctx) {
  const { page, bottomsById = {}, tableId = null, tableBottomY = null, resolvedEl } = ctx;

  if (isNumericCoord(value)) return asNumber(value, 0);

  if (typeof value === 'string' && value.startsWith('after:') && axis === 'y') {
    const parsed = parseAfterAnchor(value);
    if (parsed) {
      let base = null;
      // Prefer dedicated table bottom (order-independent), same as PHP finalizeY.
      if (tableId && parsed.targetId === tableId && tableBottomY != null) {
        // Clamp negative gaps — they were the "stuck at header" failure mode.
        return tableBottomY + Math.max(0, parsed.gap);
      }
      if (bottomsById[parsed.targetId] != null) {
        base = bottomsById[parsed.targetId];
      } else if (resolvedEl && isNumericCoord(resolvedEl.y)) {
        // Fall back to last good preview Y (do NOT invent 0).
        return asNumber(resolvedEl.y, 0);
      }
      if (base != null) return base + parsed.gap;
    }
    if (resolvedEl && isNumericCoord(resolvedEl.y)) return asNumber(resolvedEl.y, 0);
    // Unresolved after: — keep prior absolute if schema had one stored beside it (none).
    return null;
  }

  if (typeof value === 'string' && value.startsWith('bottom:') && axis === 'y') {
    const mm = asNumber(value.slice(7), 0);
    const pageH = asNumber(page?.height_mm, 297);
    const marginBottom = asNumber(page?.margins_mm?.bottom, 12);
    return pageH - marginBottom - mm;
  }

  if (resolvedEl && isNumericCoord(resolvedEl[axis])) {
    return asNumber(resolvedEl[axis], 0);
  }

  return 0;
}

/**
 * Build absolute geometry. Items table is resolved first so `after:<tableId>`
 * works even when the totals element appears earlier in the array / z-order.
 */
export function resolveElementsGeometry(elements, page, resolvedById = new Map()) {
  const list = elements || [];
  const bottomsById = {};
  const geomById = new Map();

  const table = list.find((e) => e.type === 'items_table');
  let tableId = table?.id ?? null;
  let tableBottomY = null;

  if (table) {
    const resolvedEl = resolvedById.get(table.id) || null;
    const h = elementHeight(table, resolvedEl);
    const x = isNumericCoord(table.x) ? asNumber(table.x, 0) : asNumber(resolvedEl?.x, 0);
    const y = isNumericCoord(table.y) ? asNumber(table.y, 0) : asNumber(resolvedEl?.y, 0);
    const w = asNumber(table.w, asNumber(resolvedEl?.w, 40));
    geomById.set(table.id, { x, y, w, h });
    bottomsById[table.id] = y + h;
    tableBottomY = y + h;
  }

  for (const el of list) {
    if (table && el.id === table.id) continue;

    const resolvedEl = resolvedById.get(el.id) || null;
    const h = elementHeight(el, resolvedEl);
    const x = resolveAxis(el.x, 'x', {
      page,
      bottomsById,
      tableId,
      tableBottomY,
      resolvedEl,
    });
    let y = resolveAxis(el.y, 'y', {
      page,
      bottomsById,
      tableId,
      tableBottomY,
      resolvedEl,
    });
    // Failed after: resolution → prefer preview Y, never force 0 over a known box.
    if (y == null) {
      y =
        resolvedEl && isNumericCoord(resolvedEl.y)
          ? asNumber(resolvedEl.y, 0)
          : tableBottomY != null && parseAfterAnchor(el.y)
            ? tableBottomY + (parseAfterAnchor(el.y).gap || 0)
            : 0;
    }
    const w = asNumber(el.w, asNumber(resolvedEl?.w, 40));

    geomById.set(el.id, { x: x ?? 0, y, w, h });
    bottomsById[el.id] = y + h;
  }

  return geomById;
}

/**
 * On save only: pin totals that visually sit under the items table.
 * Does not rewrite anchors from a broken y≈0 geometry.
 */
export function reanchorFlowElements(elements, geomById) {
  const list = elements || [];
  const table = list.find((e) => e.type === 'items_table');
  if (!table) return list;

  const tg = geomOf(geomById, table.id);
  if (!tg) return list;

  const tableBottom = asNumber(tg.y, 0) + asNumber(tg.h, 0);
  if (!(tableBottom > 8) || !(asNumber(tg.h, 0) > 4)) return list;

  return list.map((el) => {
    if (!el || el.id === table.id) return el;

    const g = geomOf(geomById, el.id);
    if (!g) return el;

    const yAbs = asNumber(g.y, 0);
    // Ignore boxes stuck at the top — those are broken resolves, not placements.
    if (yAbs < 12) return el;

    const parsed = parseAfterAnchor(el.y);
    if (parsed?.targetId === table.id) {
      // Keep existing after: anchor; only refresh gap when it still looks sane.
      const gap = yAbs - tableBottom;
      if (gap < -2 || gap > 120) return el;
      return { ...el, y: encodeAfterAnchor(table.id, Math.max(0, gap)) };
    }

    const isTotals = el.type === 'totals_block';
    const underTable = yAbs >= tableBottom - 1.5;
    if ((isTotals && underTable) || (isNumericCoord(el.y) && underTable)) {
      return { ...el, y: encodeAfterAnchor(table.id, Math.max(0, yAbs - tableBottom)) };
    }

    return el;
  });
}

/**
 * When the sample invoice grows (more line rows), absolute Y for totals / footer
 * text often ends up *inside* the taller table. Convert those to `after:<table>`
 * anchors so designer + print stay below the items block.
 *
 * @param {array} elements
 * @param {Map|object} geomById
 * @returns {{ next: array, changed: boolean }}
 */
export function pinFlowElementsBelowTable(elements, geomById) {
  const list = elements || [];
  const table = list.find((e) => e.type === 'items_table');
  if (!table) return { next: list, changed: false };

  const tg = geomOf(geomById, table.id);
  if (!tg) return { next: list, changed: false };

  const tableY = asNumber(tg.y, 0);
  const tableH = asNumber(tg.h, 0);
  const tableBottom = tableY + tableH;
  if (!(tableH > 8) || !(tableBottom > 20)) return { next: list, changed: false };

  // Candidates: absolute Y (or a stale after: gap) that lands inside the table body.
  const victims = [];
  list.forEach((el, index) => {
    if (!el || el.id === table.id || el.locked) return;

    const parsed = parseAfterAnchor(el.y);
    // Chains to non-table anchors (after:el_totals) — leave alone.
    if (parsed && parsed.targetId !== table.id) return;

    const g = geomOf(geomById, el.id);
    if (!g) return;
    const yAbs = asNumber(g.y, 0);
    const hAbs = asNumber(g.h, 8);

    // Clearly above the table (header / bill-to) — leave alone.
    if (yAbs + Math.min(hAbs, 6) <= tableY + 0.5) return;

    const overlapsBody = yAbs < tableBottom - 0.5;
    const isTotals = el.type === 'totals_block';

    // Already after:table but still overlapping (stale gap / short-table geom) → fix gap.
    if (parsed?.targetId === table.id) {
      if (overlapsBody || (isTotals && yAbs < tableBottom + 0.5)) {
        victims.push({
          index,
          yAbs,
          h: hAbs,
          preferGap: overlapsBody ? 2 : Math.max(0, yAbs - tableBottom),
        });
      }
      return;
    }

    if (isTotals && yAbs >= tableY - 1) {
      victims.push({
        index,
        yAbs,
        h: hAbs,
        preferGap: overlapsBody ? 2 : Math.max(0, yAbs - tableBottom),
      });
      return;
    }
    if (overlapsBody && yAbs >= tableY + 0.5) {
      victims.push({ index, yAbs, h: hAbs, preferGap: 2 });
    }
  });

  if (!victims.length) return { next: list, changed: false };

  victims.sort((a, b) => a.yAbs - b.yAbs || a.index - b.index);
  let gap = Math.max(2, victims[0].preferGap ?? 2);
  const gapByIndex = new Map();
  for (const v of victims) {
    gapByIndex.set(v.index, Math.round(gap * 100) / 100);
    gap += Math.max(4, v.h) + 2.5;
  }

  let changed = false;
  const next = list.map((el, index) => {
    if (!gapByIndex.has(index)) return el;
    const y = encodeAfterAnchor(table.id, gapByIndex.get(index));
    if (el.y === y) return el;
    changed = true;
    return { ...el, y };
  });

  return { next, changed };
}
