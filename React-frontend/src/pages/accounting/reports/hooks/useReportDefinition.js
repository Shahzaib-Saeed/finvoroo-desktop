import { useEffect, useState } from 'react';
import { reportCenterApi } from '../api/report-center.api';
import { reportBuilderApi } from '../builder/api/report-builder.api';

/** Find a saved definition inside the hub index payload (fallback only). */
export function findDefinitionInHub(hub, id) {
  if (!hub || !id) return null;

  const fromFavorites = (hub.favorites ?? [])
    .map((f) => f.report_definition)
    .filter(Boolean);
  const fromRecent = (hub.recent ?? [])
    .map((r) => r.report_definition)
    .filter(Boolean);

  const pool = [
    ...(hub.my_reports || []),
    ...(hub.custom_reports || []),
    ...(hub.shared_reports || []),
    ...fromFavorites,
    ...fromRecent,
  ];

  return pool.find((r) => r && String(r.id) === String(id)) || null;
}

/**
 * Load a saved report definition by id. Uses direct GET first so the viewer
 * works even when the hub lists are stale or the report is only in recent.
 */
export function useReportDefinition(definitionId) {
  const [definition, setDefinition] = useState(null);
  const [hub, setHub] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!definitionId) {
      setDefinition(null);
      setLoading(false);
      setError('Report not found.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDefinition(null);

    (async () => {
      try {
        const [defResult, dsResult, hubResult] = await Promise.allSettled([
          reportCenterApi.showDefinition(definitionId),
          reportBuilderApi.datasets(),
          reportCenterApi.index(),
        ]);

        if (cancelled) return;

        if (dsResult.status === 'fulfilled') {
          const raw = dsResult.value?.data?.data ?? [];
          setDatasets(Array.isArray(raw) ? raw : Object.values(raw || {}));
        } else {
          setDatasets([]);
        }

        const hubData =
          hubResult.status === 'fulfilled' ? hubResult.value?.data?.data : null;
        setHub(hubData ?? null);

        let def = null;
        if (defResult.status === 'fulfilled') {
          def = defResult.value?.data?.data ?? null;
        }
        if (!def && hubData) {
          def = findDefinitionInHub(hubData, definitionId);
        }

        if (!def) {
          const message =
            defResult.status === 'rejected'
              ? defResult.reason?.response?.data?.message ||
                'Report not found.'
              : 'Report not found.';
          setError(message);
          setDefinition(null);
        } else {
          setDefinition(def);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load this report.');
          setDefinition(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [definitionId]);

  return { definition, hub, datasets, loading, error };
}
