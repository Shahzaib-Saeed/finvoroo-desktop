import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

const DEFAULT_INTERVAL_MS = 60_000; // auto-refresh every 60 s

/**
 * Fetches and keeps dashboard data fresh.
 *
 * Features:
 *  - Initial load on mount.
 *  - Auto-polls on `intervalMs` cadence (default 60 s).
 *  - Pauses polling while the browser tab is hidden (Page Visibility API).
 *  - Resumes + immediately refreshes when the tab becomes visible again.
 *  - `refresh()` can be called imperatively (e.g. after saving an invoice).
 *  - `silentRefresh()` refreshes without setting the `loading` flag so the
 *    UI doesn't flicker on background polls.
 */
export function useDashboardData(companyId, { intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  const [dash, setDash] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const cancelledRef = useRef(false);
  const timerRef = useRef(null);

  // ── Core fetchers ─────────────────────────────────────────────────────────

  const fetchDash = useCallback(async () => {
    const res = await api.get('/workspace/dashboard');
    return res.data.data;
  }, []);

  const fetchOverview = useCallback(async () => {
    const res = await api.get('/workspace/dashboard/overview');
    return res.data.data;
  }, []);

  // ── Silent background refresh (no loading spinner) ──────────────────────

  const silentRefresh = useCallback(async () => {
    try {
      const [dashResult, overviewResult] = await Promise.allSettled([
        fetchDash(),
        fetchOverview(),
      ]);
      if (cancelledRef.current) return;
      if (dashResult.status === 'fulfilled') setDash(dashResult.value);
      if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
      setLastUpdated(new Date());
    } catch {
      // Swallow — background refresh failure is non-critical
    }
  }, [fetchDash, fetchOverview]);

  // ── Explicit refresh (shows spinner in header) ───────────────────────────

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const [dashResult, overviewResult] = await Promise.allSettled([
        fetchDash(),
        fetchOverview(),
      ]);
      if (cancelledRef.current) return;
      if (dashResult.status === 'fulfilled') setDash(dashResult.value);
      if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, fetchDash, fetchOverview]);

  // ── Timer helpers ─────────────────────────────────────────────────────────

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      if (!document.hidden) {
        silentRefresh();
      }
    }, intervalMs);
  }, [intervalMs, silentRefresh, stopTimer]);

  // ── Page Visibility: pause when hidden, refresh when visible ─────────────

  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) {
        // Tab became visible — refresh immediately then restart timer
        silentRefresh();
        startTimer();
      } else {
        stopTimer();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [silentRefresh, startTimer, stopTimer]);

  // ── Initial load + timer setup ────────────────────────────────────────────

  useEffect(() => {
    cancelledRef.current = false;

    async function initialLoad() {
      setLoading(true);
      setDash(null);
      setOverview(null);

      const [dashResult, overviewResult] = await Promise.allSettled([
        fetchDash(),
        fetchOverview(),
      ]);

      if (cancelledRef.current) return;

      setDash(dashResult.status === 'fulfilled' ? dashResult.value : null);
      setOverview(overviewResult.status === 'fulfilled' ? overviewResult.value : null);
      setLoading(false);
      setLastUpdated(new Date());
      startTimer();
    }

    initialLoad();

    return () => {
      cancelledRef.current = true;
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  return {
    dash,
    overview,
    loading,
    refreshing,
    lastUpdated,
    refresh,
    silentRefresh,
  };
}
