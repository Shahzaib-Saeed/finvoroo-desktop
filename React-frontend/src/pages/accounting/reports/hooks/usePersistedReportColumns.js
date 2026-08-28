import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import api from "@/lib/api";
import {
  placeCustomFieldAfterAnchor,
  placeCustomFieldBeforeAnchor,
} from "../constants/report-columns";

const PREFS_VERSION = 3;

function isCustomFieldColumnId(id) {
  return String(id || "").startsWith("cf:");
}

function storageKey(workspaceId, reportKey) {
  return `erp:${reportKey}-columns:${workspaceId || "default"}`;
}

function emptyPrefs() {
  return {
    knownColumnIds: [],
    visibility: {},
    columnOrder: [],
    updatedAt: 0,
  };
}

function normalizePrefsShape(raw) {
  if (!raw || typeof raw !== "object") return emptyPrefs();

  const versionOk = raw.v === PREFS_VERSION || raw.v == null;
  const visibility =
    versionOk && raw.visibility && typeof raw.visibility === "object"
      ? { ...raw.visibility }
      : {};

  return {
    knownColumnIds: Array.isArray(raw.knownColumnIds)
      ? [...raw.knownColumnIds]
      : Array.isArray(raw.known_column_ids)
        ? [...raw.known_column_ids]
        : [],
    visibility,
    columnOrder: Array.isArray(raw.columnOrder)
      ? [...raw.columnOrder]
      : Array.isArray(raw.column_order)
        ? [...raw.column_order]
        : [],
    updatedAt: Number(raw.updatedAt || raw.updated_at || 0) || 0,
  };
}

function readStored(workspaceId, reportKey) {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId, reportKey));
    if (!raw) return emptyPrefs();
    return normalizePrefsShape(JSON.parse(raw));
  } catch {
    return emptyPrefs();
  }
}

function writeStored(workspaceId, reportKey, data) {
  try {
    localStorage.setItem(
      storageKey(workspaceId, reportKey),
      JSON.stringify({
        v: PREFS_VERSION,
        knownColumnIds: data.knownColumnIds || [],
        visibility: data.visibility || {},
        columnOrder: data.columnOrder || [],
        updatedAt: data.updatedAt || Date.now(),
      }),
    );
  } catch {
    // ignore
  }
}

function prefsHaveUserIntent(prefs) {
  if (!prefs) return false;
  if ((prefs.updatedAt || 0) > 0) return true;
  return Object.entries(prefs.visibility || {}).some(
    ([id, visible]) => isCustomFieldColumnId(id) && visible === true,
  );
}

async function fetchRemotePrefs(reportKey) {
  const res = await api.get("/workspace/ui-preferences/report-columns", {
    params: { key: reportKey },
  });
  const raw = res.data?.data?.prefs;
  if (!raw) return null;
  return normalizePrefsShape(raw);
}

async function pushRemotePrefs(reportKey, prefs) {
  const res = await api.put("/workspace/ui-preferences/report-columns", {
    key: reportKey,
    v: PREFS_VERSION,
    visibility: prefs.visibility || {},
    column_order: prefs.columnOrder || [],
    known_column_ids: prefs.knownColumnIds || [],
    updated_at: prefs.updatedAt || Date.now(),
  });
  const saved = res.data?.data?.prefs;
  return saved ? normalizePrefsShape(saved) : prefs;
}

export function applyColumnOrder(columns, columnOrder) {
  if (!columnOrder?.length) return columns;

  const byId = new Map(columns.map((col) => [col.id, col]));
  const ordered = [];

  for (const id of columnOrder) {
    if (byId.has(id)) {
      ordered.push(byId.get(id));
      byId.delete(id);
    }
  }

  for (const col of columns) {
    if (byId.has(col.id)) ordered.push(col);
  }

  return ordered;
}

function orderArraysEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

function mergeColumnOrder(existingOrder, columnIds) {
  const order = existingOrder?.length ? [...existingOrder] : [...columnIds];
  let changed = !existingOrder?.length;

  for (const id of columnIds) {
    if (!order.includes(id)) {
      const canonicalIdx = columnIds.indexOf(id);
      let insertAt = order.length;

      for (let i = canonicalIdx + 1; i < columnIds.length; i++) {
        const pos = order.indexOf(columnIds[i]);
        if (pos >= 0) {
          insertAt = pos;
          break;
        }
      }

      if (insertAt === order.length) {
        for (let i = canonicalIdx - 1; i >= 0; i--) {
          const pos = order.indexOf(columnIds[i]);
          if (pos >= 0) {
            insertAt = pos + 1;
            break;
          }
        }
      }

      order.splice(insertAt, 0, id);
      changed = true;
    }
  }

  // Keep unknown ids (e.g. custom fields before meta loaded). Never drop them.
  const known = new Set(columnIds);
  const extras = order.filter((id) => !known.has(id));
  const core = order.filter((id) => known.has(id));
  // Re-append extras after core so CF ids survive until catalog is complete.
  const next = extras.length ? [...core, ...extras] : core;
  if (!orderArraysEqual(next, existingOrder || [])) changed = true;
  return changed ? next : existingOrder;
}

function applyDefaultsForNewColumns(
  prefs,
  columns,
  {
    normalizeColumnOrder,
    defaultHiddenSet,
    initialVisibleSet,
    excludeSet,
  },
) {
  const filtered = columns.filter((col) => !excludeSet.has(col.id));
  if (!filtered.length) return { prefs, changed: false };

  const knownSet = new Set(prefs.knownColumnIds || []);
  const nextVisibility = { ...(prefs.visibility || {}) };
  let changed = false;

  for (const col of filtered) {
    if (!knownSet.has(col.id)) {
      knownSet.add(col.id);
      changed = true;
    }
    if (nextVisibility[col.id] === undefined) {
      if (initialVisibleSet.has(col.id)) {
        nextVisibility[col.id] = true;
      } else {
        nextVisibility[col.id] =
          col.can_hide === false
            ? true
            : !isCustomFieldColumnId(col.id) && !defaultHiddenSet.has(col.id);
      }
      changed = true;
    }
  }

  const columnIds = filtered.map((col) => col.id);
  let nextColumnOrder = mergeColumnOrder(prefs.columnOrder, columnIds) || [
    ...columnIds,
  ];
  if (normalizeColumnOrder) {
    const normalized = normalizeColumnOrder(nextColumnOrder);
    if (!orderArraysEqual(normalized, nextColumnOrder)) {
      nextColumnOrder = normalized;
      changed = true;
    }
  }
  if (!orderArraysEqual(nextColumnOrder, prefs.columnOrder || [])) {
    changed = true;
  }

  if (!changed) return { prefs, changed: false };

  return {
    changed: true,
    prefs: {
      ...prefs,
      knownColumnIds: [...knownSet],
      visibility: nextVisibility,
      columnOrder: nextColumnOrder,
    },
  };
}

function pickAuthoritativePrefs(local, remote) {
  if (prefsHaveUserIntent(remote) && prefsHaveUserIntent(local)) {
    const localTs = Number(local.updatedAt || 0);
    const remoteTs = Number(remote.updatedAt || 0);
    if (remoteTs !== localTs) {
      return remoteTs > localTs ? remote : local;
    }
    // Same timestamp — prefer whichever enabled more custom fields.
    const remoteCf = Object.values(remote.visibility || {}).filter(
      (v, i, a) => v === true,
    ).length;
    const localCf = Object.values(local.visibility || {}).filter((v) => v === true)
      .length;
    return remoteCf >= localCf ? remote : local;
  }
  if (prefsHaveUserIntent(remote)) return remote;
  if (prefsHaveUserIntent(local)) return local;
  return remote || local || emptyPrefs();
}

/**
 * Persist report column visibility/order in DB (acc_company_users.ui_preferences)
 * with a localStorage cache. Critical: never prune custom-field prefs while the
 * column catalog is still loading (standard columns only) — that wiped CF
 * selections on every General Ledger refresh.
 */
export function usePersistedReportColumns(
  workspaceId,
  reportKey,
  availableColumns = [],
  {
    normalizeColumnOrder,
    customFieldInsertAfterId = null,
    customFieldInsertBeforeId = null,
    excludeColumnIds = [],
    defaultHiddenColumnIds = [],
    initialVisibleColumnIds = [],
    /** When false, skip defaults/hydrate until the full column catalog is ready. */
    columnsReady = true,
  } = {},
) {
  const excludeSet = useMemo(
    () => new Set(excludeColumnIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [excludeColumnIds.join("|")],
  );

  const defaultHiddenSet = useMemo(
    () => new Set(defaultHiddenColumnIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultHiddenColumnIds.join("|")],
  );

  const initialVisibleSet = useMemo(
    () => new Set(initialVisibleColumnIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialVisibleColumnIds.join("|")],
  );

  const filteredAvailableColumns = useMemo(
    () => availableColumns.filter((col) => !excludeSet.has(col.id)),
    [availableColumns, excludeSet],
  );

  const availableIdsKey = filteredAvailableColumns.map((col) => col.id).join("|");

  const [prefs, setPrefs] = useState(() => readStored(workspaceId, reportKey));
  const [dbReady, setDbReady] = useState(false);

  const latestPrefs = useRef(prefs);
  const saveTimer = useRef(null);
  const hydrateGen = useRef(0);
  latestPrefs.current = prefs;

  const persistToDb = useCallback(
    async (next, { debounceMs = 0 } = {}) => {
      if (!workspaceId || !reportKey) return;
      const run = async () => {
        try {
          const saved = await pushRemotePrefs(reportKey, next);
          writeStored(workspaceId, reportKey, saved);
          latestPrefs.current = saved;
        } catch {
          // local cache already written by caller
        }
      };
      if (debounceMs > 0) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(run, debounceMs);
      } else {
        clearTimeout(saveTimer.current);
        await run();
      }
    },
    [workspaceId, reportKey],
  );

  const commitPrefs = useCallback(
    (partial, { syncRemote = true, immediate = true } = {}) => {
      const stamped = {
        ...partial,
        updatedAt: Date.now(),
      };
      writeStored(workspaceId, reportKey, stamped);
      latestPrefs.current = stamped;
      if (syncRemote) {
        void persistToDb(stamped, { debounceMs: immediate ? 0 : 300 });
      }
      return stamped;
    },
    [workspaceId, reportKey, persistToDb],
  );

  // Reset when workspace/report changes.
  useEffect(() => {
    const local = readStored(workspaceId, reportKey);
    latestPrefs.current = local;
    setPrefs(local);
    setDbReady(false);
    hydrateGen.current += 1;
  }, [workspaceId, reportKey]);

  // DB is source of truth once the full column catalog is ready.
  useEffect(() => {
    if (!columnsReady || !workspaceId || !reportKey) return undefined;

    const gen = ++hydrateGen.current;
    let cancelled = false;

    async function hydrateFromDb() {
      const local = readStored(workspaceId, reportKey);
      let remote = null;

      try {
        remote = await fetchRemotePrefs(reportKey);
      } catch {
        remote = null;
      }

      if (cancelled || gen !== hydrateGen.current) return;

      const chosen = pickAuthoritativePrefs(local, remote);
      const withDefaults = applyDefaultsForNewColumns(
        chosen,
        filteredAvailableColumns,
        {
          normalizeColumnOrder,
          defaultHiddenSet,
          initialVisibleSet,
          excludeSet,
        },
      ).prefs;

      writeStored(workspaceId, reportKey, withDefaults);
      latestPrefs.current = withDefaults;
      setPrefs(withDefaults);
      setDbReady(true);

      // Push local-only intent up to DB.
      if (
        prefsHaveUserIntent(withDefaults) &&
        (!remote ||
          Number(withDefaults.updatedAt || 0) > Number(remote.updatedAt || 0))
      ) {
        void persistToDb(withDefaults, { debounceMs: 0 });
      }
    }

    hydrateFromDb();
    return () => {
      cancelled = true;
    };
    // Intentionally once per ready workspace/report — not on every column id churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsReady, workspaceId, reportKey]);

  // Apply defaults for newly appeared columns after DB hydrate (or when ready
  // with local-only). Never strip unknown/custom-field keys.
  useEffect(() => {
    if (!columnsReady || !filteredAvailableColumns.length) return;
    if (!dbReady) return;

    setPrefs((prev) => {
      const result = applyDefaultsForNewColumns(prev, filteredAvailableColumns, {
        normalizeColumnOrder,
        defaultHiddenSet,
        initialVisibleSet,
        excludeSet,
      });
      if (!result.changed) return prev;
      // Do not bump updatedAt / push DB for defaults-only merges.
      writeStored(workspaceId, reportKey, result.prefs);
      latestPrefs.current = result.prefs;
      return result.prefs;
    });
  }, [
    columnsReady,
    dbReady,
    availableIdsKey,
    filteredAvailableColumns,
    normalizeColumnOrder,
    defaultHiddenSet,
    initialVisibleSet,
    excludeSet,
    workspaceId,
    reportKey,
  ]);

  useEffect(() => {
    const flush = () => {
      clearTimeout(saveTimer.current);
      const payload = latestPrefs.current;
      if (!payload?.updatedAt || !workspaceId || !reportKey) return;
      pushRemotePrefs(reportKey, payload).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      clearTimeout(saveTimer.current);
    };
  }, [workspaceId, reportKey]);

  const orderedColumns = useMemo(() => {
    const order = normalizeColumnOrder
      ? normalizeColumnOrder(prefs.columnOrder)
      : prefs.columnOrder;
    return applyColumnOrder(filteredAvailableColumns, order);
  }, [filteredAvailableColumns, prefs.columnOrder, normalizeColumnOrder]);

  const visibleColumns = useMemo(() => {
    return orderedColumns.filter((col) => {
      if (col.can_hide === false) return true;
      if (isCustomFieldColumnId(col.id)) {
        return prefs.visibility[col.id] === true;
      }
      return prefs.visibility[col.id] !== false;
    });
  }, [orderedColumns, prefs.visibility]);

  const toggleColumn = useCallback(
    (columnId, visible) => {
      setPrefs((prev) => {
        const col = filteredAvailableColumns.find((c) => c.id === columnId);
        if (col?.can_hide === false) return prev;

        let nextColumnOrder = prev.columnOrder?.length
          ? [...prev.columnOrder]
          : filteredAvailableColumns.map((c) => c.id);

        if (visible && isCustomFieldColumnId(columnId)) {
          if (customFieldInsertAfterId) {
            nextColumnOrder = placeCustomFieldAfterAnchor(
              nextColumnOrder,
              columnId,
              customFieldInsertAfterId,
            );
          } else if (customFieldInsertBeforeId) {
            nextColumnOrder = placeCustomFieldBeforeAnchor(
              nextColumnOrder,
              columnId,
              customFieldInsertBeforeId,
            );
          }
          if (normalizeColumnOrder) {
            nextColumnOrder = normalizeColumnOrder(nextColumnOrder);
          }
        } else if (!nextColumnOrder.includes(columnId)) {
          nextColumnOrder.push(columnId);
        }

        return commitPrefs({
          knownColumnIds: prev.knownColumnIds.includes(columnId)
            ? prev.knownColumnIds
            : [...prev.knownColumnIds, columnId],
          visibility: {
            ...prev.visibility,
            [columnId]: visible,
          },
          columnOrder: nextColumnOrder,
        });
      });
    },
    [
      filteredAvailableColumns,
      customFieldInsertAfterId,
      customFieldInsertBeforeId,
      normalizeColumnOrder,
      commitPrefs,
    ],
  );

  const reorderColumns = useCallback(
    (activeId, overId) => {
      if (!activeId || !overId || activeId === overId) return;

      setPrefs((prev) => {
        const baseOrder = prev.columnOrder?.length
          ? [...prev.columnOrder]
          : filteredAvailableColumns.map((col) => col.id);
        const oldIndex = baseOrder.indexOf(activeId);
        const newIndex = baseOrder.indexOf(overId);
        if (oldIndex < 0 || newIndex < 0) return prev;

        let nextOrder = arrayMove(baseOrder, oldIndex, newIndex);
        if (normalizeColumnOrder) {
          nextOrder = normalizeColumnOrder(nextOrder);
        }
        if (orderArraysEqual(nextOrder, prev.columnOrder)) return prev;

        return commitPrefs({
          ...prev,
          columnOrder: nextOrder,
        });
      });
    },
    [filteredAvailableColumns, normalizeColumnOrder, commitPrefs],
  );

  const isColumnVisible = useCallback(
    (columnId) => {
      if (isCustomFieldColumnId(columnId)) {
        return prefs.visibility[columnId] === true;
      }
      return prefs.visibility[columnId] !== false;
    },
    [prefs.visibility],
  );

  return {
    allColumns: orderedColumns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    isColumnVisible,
  };
}
