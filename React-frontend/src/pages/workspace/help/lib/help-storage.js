const RECENT_KEY = 'finvoroo-help-recent';
const ONBOARDING_KEY = 'finvoroo-help-onboarding';
const MAX_RECENT = 8;

export function loadRecentArticles() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function pushRecentArticle(article) {
  if (!article?.id || !article?.title) return loadRecentArticles();
  const prev = loadRecentArticles().filter((a) => a.id !== article.id);
  const next = [{ ...article, viewedAt: Date.now() }, ...prev].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function loadOnboardingProgress() {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markOnboardingComplete(id) {
  const prev = loadOnboardingProgress();
  const next = { ...prev, [id]: true };
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
