/**
 * Development-only search instrumentation.
 *
 * Records how long the local search takes and how long the browser needs to get
 * the results on screen, so the "does it feel instant" question is answered with
 * numbers instead of impressions.
 *
 * In the POS, open the console and run:
 *   __finvorooSearchPerf.report()
 *   __finvorooSearchPerf.reset()
 *
 * Compiled out of production builds: every entry point checks `enabled` first,
 * and bundlers drop the branch when `import.meta.env.DEV` is false.
 */
const enabled = Boolean(import.meta.env?.DEV);

const SAMPLE_CAP = 200;

const state = {
  search: [],
  paint: [],
  lastKeyAt: 0,
  pendingKey: false,
};

function push(bucket, value) {
  bucket.push(value);
  if (bucket.length > SAMPLE_CAP) bucket.shift();
}

function quantile(values, q) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const at = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[at];
}

/** Call the moment a key lands, before any state update. */
export function markKeystroke() {
  if (!enabled) return;
  state.lastKeyAt = performance.now();
  state.pendingKey = true;
}

/** Time one local search. Returns whatever `run` returns. */
export function measureSearch(run) {
  if (!enabled) return run();
  const started = performance.now();
  const result = run();
  push(state.search, performance.now() - started);
  return result;
}

/**
 * Call from an effect after results render. Uses a double frame so the number
 * covers layout and paint, not just React's commit.
 */
export function markResultsRendered() {
  if (!enabled || !state.pendingKey) return;
  state.pendingKey = false;
  const startedAt = state.lastKeyAt;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      push(state.paint, performance.now() - startedAt);
    });
  });
}

function summary() {
  return {
    samples: state.search.length,
    search: {
      p50: +quantile(state.search, 0.5).toFixed(3),
      p95: +quantile(state.search, 0.95).toFixed(3),
      target: '< 10 ms',
    },
    keypressToPaint: {
      p50: +quantile(state.paint, 0.5).toFixed(3),
      p95: +quantile(state.paint, 0.95).toFixed(3),
      target: '< 50 ms',
    },
  };
}

export function reportSearchPerf() {
  if (!enabled) return null;
  const result = summary();
  console.table({
    'local search (ms)': result.search,
    'keypress to paint (ms)': result.keypressToPaint,
  });
  return result;
}

export function resetSearchPerf() {
  state.search = [];
  state.paint = [];
}

if (enabled && typeof window !== 'undefined') {
  window.__finvorooSearchPerf = {
    report: reportSearchPerf,
    reset: resetSearchPerf,
    summary,
  };
}
