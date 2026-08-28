import { create } from 'zustand';
import { encodeAfterAnchor, maybeAnchorYAfterTable, reanchorFlowElements } from '../lib/geometry';

/**
 * Invoice Form Designer state — operation-based undo, multi-select,
 * and batch moves (one undo step for group drag).
 */

const MAX_HISTORY = 200;

function newElementId() {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `el_${rand}`;
}

function sameIds(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function applyOperation(elements, op) {
  switch (op.type) {
    case 'add_element': {
      const next = elements.slice();
      const at = op.index ?? next.length;
      next.splice(at, 0, op.element);
      return next;
    }
    case 'delete_element':
      return elements.filter((e) => e.id !== op.element.id);
    case 'delete_elements': {
      const ids = new Set(op.elements.map((e) => e.id));
      return elements.filter((e) => !ids.has(e.id));
    }
    case 'move_element':
      return elements.map((e) => (e.id === op.elementId ? { ...e, x: op.to.x, y: op.to.y } : e));
    case 'batch_move':
      return elements.map((e) => {
        const m = op.moves.find((mv) => mv.elementId === e.id);
        return m ? { ...e, x: m.to.x, y: m.to.y } : e;
      });
    case 'resize_element':
      return elements.map((e) => (e.id === op.elementId ? { ...e, ...op.to } : e));
    case 'change_property':
      return elements.map((e) => (e.id === op.elementId ? { ...e, [op.property]: op.after } : e));
    case 'batch_change_property': {
      const byId = new Map(op.changes.map((c) => [c.elementId, c]));
      return elements.map((e) => {
        const c = byId.get(e.id);
        return c ? { ...e, [c.property]: c.after } : e;
      });
    }
    case 'set_element':
      return elements.map((e) => (e.id === op.elementId ? op.after : e));
    case 'reorder_element': {
      const idx = elements.findIndex((e) => e.id === op.elementId);
      if (idx === -1) return elements;
      const next = elements.slice();
      const [item] = next.splice(idx, 1);
      next.splice(op.toIndex, 0, item);
      return next.map((e, i) => ({ ...e, z: i }));
    }
    default:
      return elements;
  }
}

function invertOperation(op) {
  switch (op.type) {
    case 'add_element':
      return { type: 'delete_element', element: op.element };
    case 'delete_element':
      return { type: 'add_element', element: op.element, index: op.index };
    case 'delete_elements':
      return { type: 'add_elements', elements: op.elements, indices: op.indices };
    case 'add_elements': {
      // Restore by re-inserting in reverse isn't needed for undo of delete_elements
      // because invert of delete_elements is add_elements handled below in undo specially.
      return { type: 'delete_elements', elements: op.elements, indices: op.indices };
    }
    case 'move_element':
      return { type: 'move_element', elementId: op.elementId, from: op.to, to: op.from };
    case 'batch_move':
      return {
        type: 'batch_move',
        moves: op.moves.map((m) => ({ elementId: m.elementId, from: m.to, to: m.from })),
      };
    case 'resize_element':
      return { type: 'resize_element', elementId: op.elementId, from: op.to, to: op.from };
    case 'change_property':
      return { type: 'change_property', elementId: op.elementId, property: op.property, before: op.after, after: op.before };
    case 'batch_change_property':
      return {
        type: 'batch_change_property',
        changes: op.changes.map((c) => ({
          elementId: c.elementId,
          property: c.property,
          before: c.after,
          after: c.before,
        })),
      };
    case 'set_element':
      return { type: 'set_element', elementId: op.elementId, before: op.after, after: op.before };
    case 'reorder_element':
      return { type: 'reorder_element', elementId: op.elementId, toIndex: op.fromIndex, fromIndex: op.toIndex, elements: [] };
    default:
      return op;
  }
}

function applyOperationFull(elements, op) {
  if (op.type === 'add_elements') {
    const next = elements.slice();
    const items = [...op.elements]
      .map((el, i) => ({ el, index: op.indices?.[i] ?? next.length }))
      .sort((a, b) => a.index - b.index);
    for (const { el, index } of items) {
      next.splice(Math.min(index, next.length), 0, el);
    }
    return next;
  }
  return applyOperation(elements, op);
}

export const useDocumentDesignerStore = create((set, get) => ({
  layoutId: null,
  code: '',
  name: '',
  documentType: 'invoice',
  paper: 'a4',
  orientation: 'portrait',
  page: { width_mm: 210, height_mm: 297, margins_mm: { top: 12, right: 12, bottom: 12, left: 12 } },
  elements: [],
  /** Multi-select — last id is the primary (selectedId). */
  selectedIds: [],
  selectedId: null,
  interactionGeom: {},
  clipboard: null,
  past: [],
  future: [],
  dirty: false,
  isSystem: false,

  loadTemplate({ layoutId = null, code = '', name = '', documentType = 'invoice', paper = 'a4', orientation = 'portrait', page, elements, isSystem = false }) {
    set({
      layoutId,
      code,
      name,
      documentType,
      paper,
      orientation,
      page: page ?? { width_mm: 210, height_mm: 297, margins_mm: { top: 12, right: 12, bottom: 12, left: 12 } },
      elements: elements ?? [],
      selectedIds: [],
      selectedId: null,
      interactionGeom: {},
      clipboard: null,
      past: [],
      future: [],
      dirty: false,
      isSystem,
    });
  },

  _setSelection(ids) {
    const next = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (sameIds(get().selectedIds, next)) return;
    set({
      selectedIds: next,
      selectedId: next.length ? next[next.length - 1] : null,
    });
  },

  setName(name) {
    set({ name, dirty: true });
  },

  setPage(patch) {
    set((s) => ({ page: { ...s.page, ...patch }, dirty: true }));
  },

  setSelectedIds(ids) {
    get()._setSelection(ids);
  },

  /** Single-select (replaces selection). Pass null to clear. */
  setSelectedId(id) {
    get()._setSelection(id ? [id] : []);
  },

  /** Shift/Cmd click — toggle membership; primary becomes this id when adding. */
  toggleSelectedId(id) {
    if (!id) return;
    const cur = get().selectedIds;
    if (cur.includes(id)) {
      get()._setSelection(cur.filter((x) => x !== id));
    } else {
      get()._setSelection([...cur, id]);
    }
  },

  setInteractionGeom(geomById) {
    const next = {};
    if (geomById && typeof geomById.forEach === 'function') {
      geomById.forEach((g, id) => {
        next[id] = g;
      });
    } else if (geomById && typeof geomById === 'object') {
      Object.assign(next, geomById);
    }
    set({ interactionGeom: next });
  },

  pushOperation(op) {
    set((s) => ({
      elements: applyOperationFull(s.elements, op),
      past: [...s.past, op].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    }));
  },

  addElement(partialElement) {
    let partial = { ...partialElement };
    const table = get().elements.find((e) => e.type === 'items_table');
    // New totals (and anything dropped with a sentinel) should flow under the items table.
    if (table && (partial.type === 'totals_block' || partial.y === 'after:items')) {
      partial = { ...partial, y: encodeAfterAnchor(table.id, 0) };
    }
    const element = { z: get().elements.length, opacity: 1, locked: false, hidden: false, ...partial, id: partial.id || newElementId() };
    get().pushOperation({ type: 'add_element', element });
    get()._setSelection([element.id]);
    return element.id;
  },

  deleteElement(id) {
    const index = get().elements.findIndex((e) => e.id === id);
    if (index === -1) return;
    const element = get().elements[index];
    get().pushOperation({ type: 'delete_element', element, index });
    get()._setSelection(get().selectedIds.filter((x) => x !== id));
  },

  deleteSelected() {
    const ids = get().selectedIds;
    if (ids.length === 0) return;
    if (ids.length === 1) {
      get().deleteElement(ids[0]);
      return;
    }
    const elements = [];
    const indices = [];
    get().elements.forEach((e, i) => {
      if (ids.includes(e.id)) {
        elements.push(e);
        indices.push(i);
      }
    });
    if (elements.length === 0) return;
    get().pushOperation({ type: 'delete_elements', elements, indices });
    get()._setSelection([]);
  },

  duplicateElement(id) {
    const source = get().elements.find((e) => e.id === id);
    if (!source) return;
    const geom = get().interactionGeom[id];
    const x = geom ? geom.x + 5 : (Number(source.x) || 0) + 5;
    const y = geom ? geom.y + 5 : (Number(source.y) || 0) + 5;
    const element = { ...source, id: newElementId(), x, y };
    get().pushOperation({ type: 'add_element', element });
    get()._setSelection([element.id]);
  },

  duplicateSelected() {
    const ids = get().selectedIds;
    if (ids.length === 0) return;
    if (ids.length === 1) {
      get().duplicateElement(ids[0]);
      return;
    }
    const created = [];
    for (const id of ids) {
      const source = get().elements.find((e) => e.id === id);
      if (!source) continue;
      const geom = get().interactionGeom[id];
      const x = geom ? geom.x + 5 : (Number(source.x) || 0) + 5;
      const y = geom ? geom.y + 5 : (Number(source.y) || 0) + 5;
      const element = { ...source, id: newElementId(), x, y };
      get().pushOperation({ type: 'add_element', element });
      created.push(element.id);
    }
    if (created.length) get()._setSelection(created);
  },

  updateElementDraft(id, patch) {
    set((s) => ({ elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  },

  /** Rewrite absolute Y → after:<itemsTable>[+gap] when the box sits under the table. */
  _flowY(elementId, y) {
    const el = get().elements.find((e) => e.id === elementId);
    if (!el || el.type === 'items_table') return y;
    const yNum = Number(y);
    // Only flow-anchor when we have a real drop Y (never while geom is unknown).
    if (!Number.isFinite(yNum) || yNum < 12) return y;
    return maybeAnchorYAfterTable(yNum, get().elements, get().interactionGeom);
  },

  commitMove(id, from, to) {
    const next = { ...to, y: get()._flowY(id, to.y) };
    const sameX = Number(from.x) === Number(next.x);
    const sameY = String(from.y) === String(next.y) || (Number(from.y) === Number(next.y) && !Number.isNaN(Number(from.y)));
    if (sameX && sameY) return;
    get().pushOperation({ type: 'move_element', elementId: id, from, to: next });
  },

  /** One undo step for moving many elements together. */
  commitBatchMove(moves) {
    const remapped = moves.map((m) => ({
      ...m,
      to: { ...m.to, y: get()._flowY(m.elementId, m.to.y) },
    }));
    const changed = remapped.filter((m) => {
      const sameX = Number(m.from.x) === Number(m.to.x);
      const sameY = String(m.from.y) === String(m.to.y) || Number(m.from.y) === Number(m.to.y);
      return !(sameX && sameY);
    });
    if (changed.length === 0) return;
    if (changed.length === 1) {
      get().commitMove(changed[0].elementId, changed[0].from, changed[0].to);
      return;
    }
    get().pushOperation({ type: 'batch_move', moves: changed });
  },

  commitResize(id, from, to) {
    const next = { ...to, y: get()._flowY(id, to.y) };
    if (
      Number(from.x) === Number(next.x) &&
      String(from.y) === String(next.y) &&
      Number(from.w) === Number(next.w) &&
      Number(from.h) === Number(next.h)
    ) {
      return;
    }
    get().pushOperation({ type: 'resize_element', elementId: id, from, to: next });
  },

  commitPropertyChange(id, property, before, after) {
    if (before === after) return;
    get().pushOperation({ type: 'change_property', elementId: id, property, before, after });
  },

  /** Update a property without an undo step (e.g. live column-width drag). */
  setPropertyLive(id, property, value) {
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, [property]: value } : e)),
      dirty: true,
    }));
  },

  /** Record one undo step for a live edit that already mutated elements. */
  recordPropertyChange(id, property, before, after) {
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    set((s) => ({
      past: [...s.past, { type: 'change_property', elementId: id, property, before, after }].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    }));
  },

  /** Replace a whole element (used for inline text edit / field→text conversion). */
  commitSetElement(id, before, after) {
    if (!before || !after || before.id !== after.id) return;
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    get().pushOperation({ type: 'set_element', elementId: id, before, after });
  },

  toggleLock(id) {
    const el = get().elements.find((e) => e.id === id);
    if (!el) return;
    get().commitPropertyChange(id, 'locked', !!el.locked, !el.locked);
  },

  toggleHidden(id) {
    const el = get().elements.find((e) => e.id === id);
    if (!el) return;
    get().commitPropertyChange(id, 'hidden', !!el.hidden, !el.hidden);
  },

  reorderElement(id, toIndex) {
    const fromIndex = get().elements.findIndex((e) => e.id === id);
    if (fromIndex === -1 || fromIndex === toIndex) return;
    get().pushOperation({ type: 'reorder_element', elementId: id, fromIndex, toIndex });
  },

  bringToFront(id) {
    get().reorderElement(id, get().elements.length - 1);
  },

  sendToBack(id) {
    get().reorderElement(id, 0);
  },

  nudgeSelected(dx, dy) {
    const ids = get().selectedIds;
    const geom = get().interactionGeom;
    const moves = [];
    for (const id of ids) {
      const el = get().elements.find((e) => e.id === id);
      if (!el || el.locked) continue;
      const g = geom[id];
      const from = { x: g ? g.x : Number(el.x) || 0, y: g ? g.y : Number(el.y) || 0 };
      moves.push({ elementId: id, from, to: { x: from.x + dx, y: from.y + dy } });
    }
    get().commitBatchMove(moves);
  },

  /** @deprecated use nudgeSelected */
  nudge(id, dx, dy) {
    get().setSelectedIds([id]);
    get().nudgeSelected(dx, dy);
  },

  copySelected() {
    const ids = get().selectedIds;
    if (!ids.length) return;
    const items = ids
      .map((id) => get().elements.find((e) => e.id === id))
      .filter(Boolean)
      .map((el) => {
        const g = get().interactionGeom[el.id];
        return g ? { ...el, x: g.x, y: g.y, w: g.w, h: g.h } : { ...el };
      });
    set({ clipboard: items.length === 1 ? items[0] : items });
  },

  copyElement(id) {
    get().setSelectedIds([id]);
    get().copySelected();
  },

  pasteClipboard() {
    const clip = get().clipboard;
    if (!clip) return;
    const items = Array.isArray(clip) ? clip : [clip];
    const created = [];
    for (const src of items) {
      const element = {
        ...src,
        id: newElementId(),
        x: (Number(src.x) || 0) + 5,
        y: (Number(src.y) || 0) + 5,
      };
      get().pushOperation({ type: 'add_element', element });
      created.push(element.id);
    }
    if (created.length) get()._setSelection(created);
  },

  /**
   * Align selected elements. Uses interactionGeom for current absolute boxes.
   * mode: left|center|right|top|middle|bottom
   */
  alignSelected(mode) {
    const ids = get().selectedIds;
    if (ids.length < 2) return;
    const geom = get().interactionGeom;
    const boxes = ids
      .map((id) => {
        const g = geom[id];
        const el = get().elements.find((e) => e.id === id);
        if (!g || !el || el.locked) return null;
        return { id, ...g };
      })
      .filter(Boolean);
    if (boxes.length < 2) return;

    const minX = Math.min(...boxes.map((b) => b.x));
    const maxR = Math.max(...boxes.map((b) => b.x + b.w));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxB = Math.max(...boxes.map((b) => b.y + b.h));
    const midX = (minX + maxR) / 2;
    const midY = (minY + maxB) / 2;

    const moves = boxes.map((b) => {
      let x = b.x;
      let y = b.y;
      if (mode === 'left') x = minX;
      if (mode === 'right') x = maxR - b.w;
      if (mode === 'center') x = midX - b.w / 2;
      if (mode === 'top') y = minY;
      if (mode === 'bottom') y = maxB - b.h;
      if (mode === 'middle') y = midY - b.h / 2;
      return {
        elementId: b.id,
        from: { x: b.x, y: b.y },
        to: { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 },
      };
    });
    get().commitBatchMove(moves);
  },

  /**
   * Apply one style property to every unlocked selected element of allowed types
   * (one undo step). Used by multi-select typography / alignment controls.
   */
  applyPropertyToSelected(property, value, { types = null } = {}) {
    const ids = get().selectedIds;
    if (!ids.length) return;
    const changes = [];
    for (const id of ids) {
      const el = get().elements.find((e) => e.id === id);
      if (!el || el.locked) continue;
      if (types && !types.includes(el.type)) continue;
      if (Object.is(el[property], value)) continue;
      changes.push({ elementId: id, property, before: el[property], after: value });
    }
    if (!changes.length) return;
    if (changes.length === 1) {
      const c = changes[0];
      get().pushOperation({
        type: 'change_property',
        elementId: c.elementId,
        property: c.property,
        before: c.before,
        after: c.after,
      });
      return;
    }
    get().pushOperation({ type: 'batch_change_property', changes });
  },

  undo() {
    const { past } = get();
    if (past.length === 0) return;
    const op = past[past.length - 1];
    const inverse = invertOperation(op);
    const nextIds = op.elementId
      ? [op.elementId]
      : op.element?.id
        ? [op.element.id]
        : op.moves
          ? op.moves.map((m) => m.elementId)
          : op.changes
            ? op.changes.map((c) => c.elementId)
            : get().selectedIds;
    set((s) => ({
      elements: applyOperationFull(s.elements, inverse),
      past: s.past.slice(0, -1),
      future: [op, ...s.future],
      selectedIds: nextIds,
      selectedId: nextIds.length ? nextIds[nextIds.length - 1] : null,
      dirty: true,
    }));
  },

  redo() {
    const { future } = get();
    if (future.length === 0) return;
    const op = future[0];
    const nextIds = op.elementId
      ? [op.elementId]
      : op.element?.id
        ? [op.element.id]
        : op.moves
          ? op.moves.map((m) => m.elementId)
          : op.changes
            ? op.changes.map((c) => c.elementId)
            : get().selectedIds;
    set((s) => ({
      elements: applyOperationFull(s.elements, op),
      past: [...s.past, op],
      future: s.future.slice(1),
      selectedIds: nextIds,
      selectedId: nextIds.length ? nextIds[nextIds.length - 1] : null,
      dirty: true,
    }));
  },

  markSaved(layoutId) {
    set({ dirty: false, layoutId: layoutId ?? get().layoutId });
  },

  toConfig() {
    const s = get();
    return {
      schema_version: 2,
      page: s.page,
      // Re-pin totals / under-table blocks so saved layouts follow growing line counts.
      elements: reanchorFlowElements(s.elements, s.interactionGeom),
    };
  },
}));
