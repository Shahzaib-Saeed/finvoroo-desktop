import { useCallback, useEffect, useRef, useState } from 'react';

const EMPTY_SORTING = [];
const EMPTY_PINNING = { left: [], right: [] };

function readStoredPreferences(storageKey) {
  if (!storageKey) return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function mergeColumnOrder(savedOrder, defaultOrder) {
  if (!Array.isArray(savedOrder) || savedOrder.length === 0) {
    return [...defaultOrder];
  }

  const known = new Set(defaultOrder);
  const merged = savedOrder.filter((id) => known.has(id));

  for (const id of defaultOrder) {
    if (!merged.includes(id)) merged.push(id);
  }

  return merged;
}

function mergeColumnVisibility(savedVisibility, defaultOrder) {
  if (!savedVisibility || typeof savedVisibility !== 'object') {
    return {};
  }

  const known = new Set(defaultOrder);
  const merged = {};

  for (const [id, visible] of Object.entries(savedVisibility)) {
    if (known.has(id)) merged[id] = Boolean(visible);
  }

  return merged;
}

function mergeSorting(savedSorting, defaultSorting, defaultOrder) {
  const known = new Set(defaultOrder);
  const fallback = Array.isArray(defaultSorting) ? defaultSorting : EMPTY_SORTING;

  if (!Array.isArray(savedSorting) || savedSorting.length === 0) {
    return fallback.map((item) => ({ ...item }));
  }

  const merged = savedSorting
    .filter((item) => item?.id && known.has(item.id))
    .map((item) => ({
      id: item.id,
      desc: Boolean(item.desc),
    }));

  return merged.length > 0
    ? merged
    : fallback.map((item) => ({ ...item }));
}

function mergeColumnPinning(savedPinning, defaultPinning, defaultOrder) {
  const known = new Set(defaultOrder);
  const fallback = {
    left: Array.isArray(defaultPinning?.left) ? defaultPinning.left : EMPTY_PINNING.left,
    right: Array.isArray(defaultPinning?.right) ? defaultPinning.right : EMPTY_PINNING.right,
  };

  if (!savedPinning || typeof savedPinning !== 'object') {
    return {
      left: fallback.left.filter((id) => known.has(id)),
      right: fallback.right.filter((id) => known.has(id)),
    };
  }

  return {
    left: Array.isArray(savedPinning.left)
      ? savedPinning.left.filter((id) => known.has(id))
      : [],
    right: Array.isArray(savedPinning.right)
      ? savedPinning.right.filter((id) => known.has(id))
      : [],
  };
}

function sortingEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((item, i) => item.id === b[i]?.id && Boolean(item.desc) === Boolean(b[i]?.desc));
}

function pinningEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const leftA = a.left ?? EMPTY_PINNING.left;
  const leftB = b.left ?? EMPTY_PINNING.left;
  const rightA = a.right ?? EMPTY_PINNING.right;
  const rightB = b.right ?? EMPTY_PINNING.right;
  if (leftA.length !== leftB.length || rightA.length !== rightB.length) return false;
  return leftA.every((id, i) => id === leftB[i]) && rightA.every((id, i) => id === rightB[i]);
}

function visibilityEqual(a, b) {
  if (a === b) return true;
  const keysA = Object.keys(a || {});
  const keysB = Object.keys(b || {});
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Boolean(a[key]) === Boolean(b[key]));
}

function orderEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

function writeStoredPreferences(
  storageKey,
  { order, visibility, sorting, pinning },
) {
  if (!storageKey) return;

  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        v: 2,
        order,
        visibility,
        sorting,
        pinning,
      }),
    );
  } catch {
    // Ignore quota / private mode errors.
  }
}

/**
 * Persist DataGrid column order, visibility, sort, and pin state per workspace.
 */
export function useDataGridColumnPreferences(
  storageKey,
  defaultColumnOrder,
  {
    defaultSorting = EMPTY_SORTING,
    defaultColumnPinning = EMPTY_PINNING,
  } = {},
) {
  const skipPersistRef = useRef(true);
  const defaultsRef = useRef({
    defaultColumnOrder,
    defaultSorting,
    defaultColumnPinning,
  });
  defaultsRef.current = {
    defaultColumnOrder,
    defaultSorting,
    defaultColumnPinning,
  };

  const [columnOrder, setColumnOrderState] = useState(() =>
    mergeColumnOrder(
      readStoredPreferences(storageKey)?.order,
      defaultColumnOrder,
    ),
  );
  const [columnVisibility, setColumnVisibilityState] = useState(() =>
    mergeColumnVisibility(
      readStoredPreferences(storageKey)?.visibility,
      defaultColumnOrder,
    ),
  );
  const [sorting, setSortingState] = useState(() =>
    mergeSorting(
      readStoredPreferences(storageKey)?.sorting,
      defaultSorting,
      defaultColumnOrder,
    ),
  );
  const [columnPinning, setColumnPinningState] = useState(() =>
    mergeColumnPinning(
      readStoredPreferences(storageKey)?.pinning,
      defaultColumnPinning,
      defaultColumnOrder,
    ),
  );

  useEffect(() => {
    const { defaultColumnOrder: order, defaultSorting: sort, defaultColumnPinning: pin } =
      defaultsRef.current;
    const saved = readStoredPreferences(storageKey);
    setColumnOrderState((prev) => {
      const next = mergeColumnOrder(saved?.order, order);
      return orderEqual(prev, next) ? prev : next;
    });
    setColumnVisibilityState((prev) => {
      const next = mergeColumnVisibility(saved?.visibility, order);
      return visibilityEqual(prev, next) ? prev : next;
    });
    setSortingState((prev) => {
      const next = mergeSorting(saved?.sorting, sort, order);
      return sortingEqual(prev, next) ? prev : next;
    });
    setColumnPinningState((prev) => {
      const next = mergeColumnPinning(saved?.pinning, pin, order);
      return pinningEqual(prev, next) ? prev : next;
    });
    skipPersistRef.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }

    writeStoredPreferences(storageKey, {
      order: columnOrder,
      visibility: columnVisibility,
      sorting,
      pinning: columnPinning,
    });
  }, [storageKey, columnOrder, columnVisibility, sorting, columnPinning]);

  const setColumnOrder = useCallback((updater) => {
    setColumnOrderState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return orderEqual(prev, next) ? prev : next;
    });
  }, []);

  const setColumnVisibility = useCallback((updater) => {
    setColumnVisibilityState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return visibilityEqual(prev, next) ? prev : next;
    });
  }, []);

  const setSorting = useCallback((updater) => {
    setSortingState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return sortingEqual(prev, next) ? prev : next;
    });
  }, []);

  const setColumnPinning = useCallback((updater) => {
    setColumnPinningState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return pinningEqual(prev, next) ? prev : next;
    });
  }, []);

  return {
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    sorting,
    setSorting,
    columnPinning,
    setColumnPinning,
  };
}
