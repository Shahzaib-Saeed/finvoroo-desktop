import { useCallback, useRef, useState } from 'react';
import { DEFAULT_REPORT_DATE_RANGE_KEY } from '../filter-operators';

export function emptyDefinition(datasetKey = null) {
  return {
    dataset_key: datasetKey,
    date_range: { relative_key: DEFAULT_REPORT_DATE_RANGE_KEY },
    columns: [],
    filters: null,
    sort: [],
    group_by: [],
    aggregations: [],
    calculated_fields: [],
    formatting: {},
    render_settings: { name: '', description: '', category_id: null, tags: [], visibility: 'private' },
  };
}

const MAX_HISTORY = 50;

/**
 * Holds the report builder's working definition plus a client-side
 * undo/redo history stack — the toolbar's Undo/Redo buttons operate on
 * this, not on the server (nothing is persisted until Save).
 */
export function useReportBuilderState(initial) {
  const [definition, setDefinitionRaw] = useState(initial || emptyDefinition());
  const historyRef = useRef([initial || emptyDefinition()]);
  const indexRef = useRef(0);
  const [, forceRender] = useState(0);

  const commit = useCallback((next) => {
    const history = historyRef.current.slice(0, indexRef.current + 1);
    history.push(next);
    if (history.length > MAX_HISTORY) history.shift();
    historyRef.current = history;
    indexRef.current = history.length - 1;
    setDefinitionRaw(next);
    forceRender((n) => n + 1);
  }, []);

  const update = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(historyRef.current[indexRef.current]) : updater;
      commit(next);
    },
    [commit],
  );

  const undo = useCallback(() => {
    if (indexRef.current === 0) return;
    indexRef.current -= 1;
    setDefinitionRaw(historyRef.current[indexRef.current]);
    forceRender((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    setDefinitionRaw(historyRef.current[indexRef.current]);
    forceRender((n) => n + 1);
  }, []);

  const reset = useCallback(
    (next) => {
      const value = next || emptyDefinition(definition.dataset_key);
      historyRef.current = [value];
      indexRef.current = 0;
      setDefinitionRaw(value);
      forceRender((n) => n + 1);
    },
    [definition.dataset_key],
  );

  return {
    definition,
    update,
    undo,
    redo,
    reset,
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < historyRef.current.length - 1,
  };
}
