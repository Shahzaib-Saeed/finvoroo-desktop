import { useEffect, useRef, useState } from 'react';

const AUTOSAVE_DELAY_MS = 2500;

/**
 * Debounced autosave — only fires once a report has already been saved
 * at least once (has a `definitionId`). A brand new, never-saved report
 * is never silently persisted; the user's first Save is always explicit.
 */
export function useAutoSave(definitionId, payload, saveFn) {
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);
  const skipNextRef = useRef(true);

  useEffect(() => {
    // Skip the very first render (initial hydration shouldn't trigger a save).
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    if (!definitionId) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await saveFn(payload);
        setLastSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitionId, JSON.stringify(payload)]);

  const markSavedNow = () => setLastSavedAt(new Date());

  return { lastSavedAt, saving, markSavedNow };
}
