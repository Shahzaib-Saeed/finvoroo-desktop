import { resolveCompanyLogoUrl } from '@/lib/helpers';

const dataUrlCache = new Map();

function absolutizeUrl(src) {
  const raw = String(src || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  try {
    return new URL(raw, window.location.origin).href;
  } catch {
    return raw;
  }
}

/** Fetch remote receipt images once and reuse as data URLs (no WebView2 network wait). */
export async function urlToReceiptDataUrl(src) {
  const url = absolutizeUrl(src);
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (dataUrlCache.has(url)) return dataUrlCache.get(url);

  try {
    const res = await fetch(url, { credentials: 'include', mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('read failed'));
      reader.readAsDataURL(blob);
    });
    if (dataUrl) dataUrlCache.set(url, dataUrl);
    return dataUrl || url;
  } catch {
    return url;
  }
}

/** Return cached data URL when available (sync — for receipt HTML build). */
export function getCachedReceiptImageUrl(src) {
  const url = absolutizeUrl(src);
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  return dataUrlCache.get(url) || url;
}

/** Preload company logo while cashier is on pay dialog / POS boot. */
export async function warmReceiptLogoCache(company) {
  const url = resolveCompanyLogoUrl(company);
  if (!url || url.startsWith('data:')) return url;
  return urlToReceiptDataUrl(url);
}

/** Replace img src in a full thermal HTML document with inlined data URLs. */
export async function inlineReceiptImagesInDocument(htmlDocument) {
  if (!htmlDocument || typeof DOMParser === 'undefined') return htmlDocument;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlDocument, 'text/html');
  const imgs = Array.from(doc.querySelectorAll('img[src]'));
  if (imgs.length === 0) return htmlDocument;

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || '';
      const inlined = await urlToReceiptDataUrl(src);
      if (inlined) img.setAttribute('src', inlined);
    }),
  );

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}
