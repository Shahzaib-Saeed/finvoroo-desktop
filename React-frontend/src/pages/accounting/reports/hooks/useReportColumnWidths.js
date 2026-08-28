import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reportPreferencesApi } from "../api/report-preferences.api";
import {
  applySavedReportColumnWidths,
  clampReportColumnWidth,
  defaultReportColumnWidths,
  normalizeReportPreferenceKey,
  sumReportColumnWidths,
} from "../lib/report-column-layout";

const SAVE_DEBOUNCE_MS = 450;

/**
 * Load / resize / persist report column widths for the authenticated user.
 * Local updates are immediate; the API is written only after resize ends.
 */
export function useReportColumnWidths(reportKey, columns = []) {
  const key = normalizeReportPreferenceKey(reportKey);
  const columnIds = useMemo(
    () => columns.map((col) => col?.id).filter(Boolean).join("|"),
    [columns],
  );

  const [widths, setWidths] = useState(() =>
    defaultReportColumnWidths(key, columns),
  );
  const savedRef = useRef([]);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;

    reportPreferencesApi
      .get(key)
      .then((data) => {
        if (cancelled) return;
        savedRef.current = Array.isArray(data?.columns) ? data.columns : [];
        setWidths(applySavedReportColumnWidths(key, columns, savedRef.current));
      })
      .catch(() => {
        if (cancelled) return;
        savedRef.current = [];
        setWidths(defaultReportColumnWidths(key, columns));
      });

    return () => {
      cancelled = true;
    };
    // Load once per report. Column list is applied in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    setWidths((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const col of columns) {
        if (!col?.id || next[col.id] != null) continue;
        const saved = savedRef.current.find((row) => row.column_key === col.id);
        next[col.id] = clampReportColumnWidth(key, col.id, saved?.width);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [columnIds, columns, key]);

  const flushPending = useCallback(async () => {
    const pending = pendingRef.current;
    pendingRef.current = {};
    const entries = Object.entries(pending);
    if (!entries.length) return;
    try {
      const data = await reportPreferencesApi.saveColumns(
        key,
        entries.map(([column_key, width]) => ({ column_key, width })),
      );
      if (Array.isArray(data?.columns)) {
        savedRef.current = data.columns;
      } else {
        savedRef.current = [
          ...savedRef.current.filter((row) => pending[row.column_key] == null),
          ...entries.map(([column_key, width]) => ({ column_key, width })),
        ];
      }
    } catch {
      /* keep local widths */
    }
  }, [key]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      flushPending();
    }, SAVE_DEBOUNCE_MS);
  }, [flushPending]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const resizeColumn = useCallback(
    (columnKey, nextWidth, { persist = false } = {}) => {
      const clamped = clampReportColumnWidth(key, columnKey, nextWidth);
      setWidths((prev) => {
        if (prev[columnKey] === clamped) return prev;
        return { ...prev, [columnKey]: clamped };
      });
      if (persist) {
        pendingRef.current[columnKey] = clamped;
        scheduleFlush();
      }
    },
    [key, scheduleFlush],
  );

  const resetColumnWidths = useCallback(async () => {
    pendingRef.current = {};
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    savedRef.current = [];
    setWidths(defaultReportColumnWidths(key, columns));
    try {
      await reportPreferencesApi.resetColumns(key);
    } catch {
      /* local reset already applied */
    }
  }, [columns, key]);

  const tableMinWidth = useMemo(
    () => sumReportColumnWidths(columns, widths),
    [columns, widths],
  );

  return {
    columnWidths: widths,
    resizeColumn,
    resetColumnWidths,
    tableMinWidth,
  };
}
