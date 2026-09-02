import { resolveCompanyLogoUrl, apiOrigin } from '@/lib/helpers';
import { authCookies } from '@/auth/auth-cookies';
import api from '@/lib/api';

const dataUrlCache = new Map();

const COMPANY_LOGO_API = '/workspace/accounting/settings/company-logo';

function absolutizeUrl(src) {
  const raw = String(src || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  try {
    const base = apiOrigin() || window.location.origin;
    return new URL(raw.startsWith('/') ? raw : `/${raw}`, base).href;
  } catch {
    return raw;
  }
}

function companyLogoCacheKey(company) {
  const id = company?.id ?? company?.company_id ?? 'default';
  return `company-logo:${id}`;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch company logo through the authenticated API (works in browser + desktop + Print Agent).
 * Falls back to public storage URL when the API route is unavailable.
 */
export async function fetchCompanyLogoDataUrl(company) {
  if (!company) return '';

  const cacheKey = companyLogoCacheKey(company);
  const cached = dataUrlCache.get(cacheKey);
  if (cached?.startsWith('data:')) return cached;

  const logoUrl = resolveCompanyLogoUrl(company);
  if (logoUrl?.startsWith('data:') || logoUrl?.startsWith('blob:')) {
    dataUrlCache.set(cacheKey, logoUrl);
    return logoUrl;
  }

  try {
    const res = await api.get(COMPANY_LOGO_API, {
      responseType: 'blob',
      skipCacheBust: true,
    });
    const blob = res?.data;
    if (blob instanceof Blob && blob.size > 0) {
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl.startsWith('data:')) {
        dataUrlCache.set(cacheKey, dataUrl);
        if (logoUrl) dataUrlCache.set(absolutizeUrl(logoUrl), dataUrl);
        return dataUrl;
      }
    }
  } catch {
    /* API logo unavailable — try direct URL below */
  }

  if (logoUrl) {
    const fallback = await urlToReceiptDataUrl(logoUrl);
    if (fallback.startsWith('data:')) {
      dataUrlCache.set(cacheKey, fallback);
    }
    return fallback;
  }

  return '';
}

function receiptFetchHeaders(url) {
  const headers = {};
  const token = authCookies.getToken();
  if (!token) return headers;

  const apiBase = apiOrigin();
  if (apiBase && url.startsWith(apiBase)) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchReceiptImageBlob(url) {
  const absolute = absolutizeUrl(url);
  if (!absolute) throw new Error('empty url');

  const sameOrigin =
    typeof window !== 'undefined' && absolute.startsWith(window.location.origin);
  const res = await fetch(absolute, {
    credentials: sameOrigin ? 'same-origin' : 'omit',
    mode: 'cors',
    headers: receiptFetchHeaders(absolute),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

/** Fetch remote receipt images once and reuse as data URLs (no WebView2 network wait). */
export async function urlToReceiptDataUrl(src) {
  const url = absolutizeUrl(src);
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (dataUrlCache.has(url)) return dataUrlCache.get(url);

  try {
    const blob = await fetchReceiptImageBlob(url);
    const dataUrl = await blobToDataUrl(blob);
    if (dataUrl.startsWith('data:')) dataUrlCache.set(url, dataUrl);
    return dataUrl.startsWith('data:') ? dataUrl : url;
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

/** Preload company logo while cashier is on pay dialog / POS boot / checkout. */
export async function warmReceiptLogoCache(company) {
  return fetchCompanyLogoDataUrl(company);
}

/** Replace img src in a full thermal HTML document with inlined data URLs. */
export async function inlineReceiptImagesInDocument(htmlDocument, company = null) {
  if (!htmlDocument || typeof DOMParser === 'undefined') return htmlDocument;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlDocument, 'text/html');
  const imgs = Array.from(doc.querySelectorAll('img[src]'));
  if (imgs.length === 0) return htmlDocument;

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;

      let inlined = await urlToReceiptDataUrl(src);
      if (!inlined?.startsWith('data:') && company) {
        const cls = img.getAttribute('class') || '';
        if (cls.includes('thermal-logo') || cls.includes('thermal-branding-logo')) {
          inlined = await fetchCompanyLogoDataUrl(company);
        }
      }
      if (inlined?.startsWith('data:')) img.setAttribute('src', inlined);
    }),
  );

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

/** Ensure company logo is embedded as data URL before Print Agent raster (WebView2 cannot fetch logos). */
export async function prepareThermalPropsForPrint(thermalProps) {
  if (!thermalProps?.company || thermalProps.showLogo === false) return thermalProps;

  const dataUrl = await fetchCompanyLogoDataUrl(thermalProps.company);
  if (!dataUrl?.startsWith('data:')) return thermalProps;

  return {
    ...thermalProps,
    company: {
      ...thermalProps.company,
      logo_url: dataUrl,
      logo: dataUrl,
    },
  };
}
