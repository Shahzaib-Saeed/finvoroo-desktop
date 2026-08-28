import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { authService } from '@/auth/services/auth-service';

export const DASHBOARD_PIN_SORT = {
  CODE: 'code',
  CUSTOM: 'custom',
};

/** Local cache only — never the source of truth across devices. */
function storageKey(companyId, userId) {
  return `erp.dashboard.pinnedAccounts.${Number(companyId) || 0}.${userId || 'anon'}`;
}

function normalizePayload(raw) {
  if (Array.isArray(raw)) {
    return {
      account_ids: raw.map((id) => Number(id)).filter((id) => id > 0),
      sort_mode: DASHBOARD_PIN_SORT.CODE,
    };
  }

  if (raw && typeof raw === 'object') {
    const account_ids = Array.isArray(raw.account_ids)
      ? raw.account_ids.map((id) => Number(id)).filter((id) => id > 0)
      : [];
    const sort_mode =
      raw.sort_mode === DASHBOARD_PIN_SORT.CUSTOM
        ? DASHBOARD_PIN_SORT.CUSTOM
        : DASHBOARD_PIN_SORT.CODE;

    return { account_ids, sort_mode };
  }

  return { account_ids: [], sort_mode: DASHBOARD_PIN_SORT.CODE };
}

function readLocal(companyId, userId) {
  try {
    const raw = localStorage.getItem(storageKey(companyId, userId));
    if (!raw) return null;
    return normalizePayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocal(companyId, userId, payload) {
  try {
    localStorage.setItem(
      storageKey(companyId, userId),
      JSON.stringify(normalizePayload(payload)),
    );
  } catch {
    // ignore quota / private mode
  }
}

async function fetchRemote() {
  const res = await api.get('/workspace/dashboard/pinned-accounts');
  return normalizePayload({
    account_ids: res.data?.data?.account_ids,
    sort_mode: res.data?.data?.sort_mode,
  });
}

async function pushRemote(payload) {
  const normalized = normalizePayload(payload);
  const res = await api.put('/workspace/dashboard/pinned-accounts', {
    account_ids: normalized.account_ids,
    sort_mode: normalized.sort_mode,
  });
  return normalizePayload({
    account_ids: res.data?.data?.account_ids ?? normalized.account_ids,
    sort_mode: res.data?.data?.sort_mode ?? normalized.sort_mode,
  });
}

/**
 * Loads and persists dashboard pinned account ids + sort mode.
 * Database (API) is the source of truth so pins stay the same on every device.
 * localStorage is only an offline/read cache after a successful API round-trip.
 */
export function useDashboardPinnedAccounts(companyId, _defaultIds = []) {
  const userId = authService.getUser()?.id;
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortMode, setSortMode] = useState(DASHBOARD_PIN_SORT.CODE);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const latestPayload = useRef(null);
  const saveGeneration = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setReady(false);

      let payload = null;
      let remoteOk = false;

      try {
        payload = await fetchRemote();
        remoteOk = true;
      } catch {
        // Offline / API down — fall back to last successful cache only.
        payload = readLocal(companyId, userId);
      }

      if (cancelled) return;

      // One-time migrate: pins that only lived in localStorage (old bug) → DB.
      if (remoteOk && payload.account_ids.length === 0) {
        const localPayload = readLocal(companyId, userId);
        if ((localPayload?.account_ids?.length || 0) > 0) {
          try {
            payload = await pushRemote(localPayload);
          } catch {
            payload = localPayload;
          }
        }
      }

      const next = normalizePayload(
        payload || { account_ids: [], sort_mode: DASHBOARD_PIN_SORT.CODE },
      );
      latestPayload.current = next;
      setSelectedIds(next.account_ids);
      setSortMode(next.sort_mode);
      writeLocal(companyId, userId, next);
      setReady(true);
    }

    if (!companyId) {
      setReady(true);
      return undefined;
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [companyId, userId]);

  const persist = useCallback(
    (payload) => {
      const normalized = normalizePayload(payload);
      latestPayload.current = normalized;
      const generation = ++saveGeneration.current;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          const saved = await pushRemote(normalized);
          if (generation !== saveGeneration.current) return;
          latestPayload.current = saved;
          writeLocal(companyId, userId, saved);
          setSelectedIds(saved.account_ids);
          setSortMode(saved.sort_mode);
        } catch {
          // Keep optimistic UI; do not pretend local-only is cross-device truth.
        } finally {
          if (generation === saveGeneration.current) {
            setSaving(false);
          }
        }
      }, 300);
    },
    [companyId, userId],
  );

  const flushPersist = useCallback(() => {
    clearTimeout(saveTimer.current);
    const payload = latestPayload.current;
    if (!payload || !companyId) return;
    // Best-effort sync on unload; keepalive-friendly fire-and-forget.
    pushRemote(payload)
      .then((saved) => writeLocal(companyId, userId, saved))
      .catch(() => {});
  }, [companyId, userId]);

  useEffect(() => {
    const onHide = () => flushPersist();
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      clearTimeout(saveTimer.current);
    };
  }, [flushPersist]);

  const setPinnedState = useCallback(
    (accountIds, nextSortMode = sortMode) => {
      const normalizedIds = [
        ...new Set(accountIds.map((id) => Number(id)).filter((id) => id > 0)),
      ];
      const mode =
        nextSortMode === DASHBOARD_PIN_SORT.CUSTOM
          ? DASHBOARD_PIN_SORT.CUSTOM
          : DASHBOARD_PIN_SORT.CODE;

      const next = { account_ids: normalizedIds, sort_mode: mode };
      latestPayload.current = next;
      setSelectedIds(normalizedIds);
      setSortMode(mode);
      persist(next);
    },
    [persist, sortMode],
  );

  const setPinnedAccountIds = useCallback(
    (ids) => {
      if (!ids.length) {
        setPinnedState([], DASHBOARD_PIN_SORT.CODE);
        return;
      }
      setPinnedState(ids, sortMode);
    },
    [setPinnedState, sortMode],
  );

  const setPinnedSortMode = useCallback(
    (mode) => {
      setPinnedState(selectedIds, mode);
    },
    [selectedIds, setPinnedState],
  );

  const reorderPinnedAccountIds = useCallback(
    (ids) => {
      setPinnedState(ids, DASHBOARD_PIN_SORT.CUSTOM);
    },
    [setPinnedState],
  );

  return {
    selectedIds,
    sortMode,
    setPinnedAccountIds,
    setPinnedSortMode,
    reorderPinnedAccountIds,
    ready,
    saving,
  };
}
