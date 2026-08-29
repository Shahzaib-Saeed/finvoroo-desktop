import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FilePlus2,
  Loader2,
  ScanLine,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { productsApi } from '@/components/workspace/product/api/products.api';
import { cn } from '@/lib/utils';
import { pharmacyApi } from '../api/pharmacy.api';
import { InvoicePageQueue, InvoiceScanButton, revokeInvoicePages } from '../components/InvoicePageQueue';
import { InvoiceImagePreview } from '../components/InvoiceImagePreview';
import { InvoiceOcrJsonDialog } from '../components/InvoiceOcrJsonDialog';
import {
  PurchaseReceiveWorkspace,
  buildScanBootstrapFromExtractionLines,
} from '../components/PurchaseReceiveWorkspace';
import { SavedScansMenu } from '../components/SavedScansMenu';
import {
  emptyExtractionRow,
  apiItemsToExtractionRows,
  extractionRowsToReceiveLines,
} from '../lib/purchase-extraction-adapter';
import { applyClientProductMatches } from '../lib/client-product-match';
import { countVerifyRows } from '../lib/invoice-match-quality';
import { prefetchMedicineCatalog } from '../lib/medicine-catalog-cache';
import { applyPurchaseDefaultsToRows } from '../lib/pharmacy-purchase-defaults';
import { clearScanDraft } from '../lib/pharmacy-purchase-draft';
import { engineFromExtraction, formatOcrEngineName } from '../lib/ocr-engine-label';
import { stampOcrLineOrigins, stampOcrLinesFromPages } from '../lib/ocr-training-dataset';
import {
  SCAN_UX,
  applyOcrHighlights,
  interpretInvoiceScanResult,
  pharmacistScanMessage,
  pickWorstScanUx,
} from '../lib/invoice-scan-ux';
import { PurchaseScanMoreMenu } from '../components/PurchaseScanToolbar';
import {
  PurchaseReceiveMainActions,
  PurchaseReceiveMoreMenu,
} from '../components/PurchaseReceiveToolbar';

/** One Gemini call at a time — parallel pages hit rate limits and look like a failed scan. */
const SCAN_CONCURRENCY = 1;

function newBillGroupId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PurchaseEntryPage() {
  const { id: companyId } = useParams();
  const [invoicePages, setInvoicePages] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const scanAbortRef = useRef(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([emptyExtractionRow()]);
  const [scanned, setScanned] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeExtractionId, setActiveExtractionId] = useState(null);
  // Every scanned page of the invoice on screen, in page order.
  const [invoiceExtractionIds, setInvoiceExtractionIds] = useState([]);
  // Invoice header read by the OCR pass: supplier block, invoice number/date,
  // printed totals. Used to prefill the receive form.
  const [scanDocument, setScanDocument] = useState(null);
  // Which OCR engine produced the rows on screen, shown next to the page strip.
  const [scanEngine, setScanEngine] = useState(null);
  const [loadingHistoryItem, setLoadingHistoryItem] = useState(false);
  const [pharmacySettings, setPharmacySettings] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [preview, setPreview] = useState({ open: false, pages: [], index: 0, blobUrls: [] });
  const [confirm, setConfirm] = useState(null);
  const previewBlobsRef = useRef([]);
  const invoicePagesRef = useRef([]);
  const [scanReview, setScanReview] = useState({ ux: SCAN_UX.CLEAN, message: '' });
  const [ocrDebug, setOcrDebug] = useState(null);
  const [ocrJsonOpen, setOcrJsonOpen] = useState(false);
  const [receiveWorkspaceKey, setReceiveWorkspaceKey] = useState(0);
  const [embeddedToolbar, setEmbeddedToolbar] = useState(null);
  const billGroupRef = useRef(newBillGroupId());

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await pharmacyApi.extractionHistory({ per_page: 30 });
      const data = unwrap(res);
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    // Never auto-open a previous session — leftover drafts stay discarded.
    clearScanDraft(companyId);
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = unwrap(await pharmacyApi.settings());
        if (!cancelled) setPharmacySettings(data?.settings || data || {});
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    prefetchMedicineCatalog();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (document.querySelector('[data-pharmacy-pick-sheet][data-state="open"]')) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('pharmacy:close-medicine-sheet', { detail: { restoreFocus: true } }),
          );
        }
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        const cell = document.activeElement?.closest?.('[data-pharmacy-item-search]');
        const el = cell?.querySelector('[data-grn-item]');
        const rowIndex = el?.getAttribute?.('data-grn-item');
        if (rowIndex != null && rowIndex !== '') {
          window.dispatchEvent(
            new CustomEvent('pharmacy:open-medicine-sheet', {
              detail: { rowIndex: Number(rowIndex) },
            }),
          );
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scanned, scanning, loadingHistoryItem]);

  useEffect(() => {
    let cancelled = false;

    const toOption = (p) => ({
      value: String(p.id),
      label: p.name,
      image_url: p.image_url || p.thumbnail_url || p.primary_image_url || '',
      generic: p.pharmacy?.generic_name || '',
      strength: p.pharmacy?.strength_text || '',
      sku: p.sku || '',
      keywords: [p.sku, p.barcode, p.pharmacy?.generic_name, p.pharmacy?.strength_text]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    });

    (async () => {
      try {
        const all = [];
        let page = 1;
        let lastPage = 1;
        do {
          const res = await productsApi.list({ per_page: 100, page, is_active: 1 });
          if (cancelled) return;
          const root = res?.data?.data ?? res?.data;
          const list = Array.isArray(root) ? root : root?.data || [];
          const meta = res?.data?.meta || {};
          lastPage = Number(meta.last_page || 1);
          all.push(...list.map(toOption));
          page += 1;
        } while (page <= lastPage && page <= 20);
        if (!cancelled) setProductOptions(all);
      } catch {
        /* picker can still remote-search */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    invoicePagesRef.current = invoicePages;
  }, [invoicePages]);

  useEffect(() => {
    return () => revokeInvoicePages(invoicePagesRef.current);
  }, []);

  useEffect(() => {
    return () => {
      previewBlobsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!scanned || !productOptions.length) return;
    setRows((prev) => {
      const next = applyClientProductMatches(prev, productOptions);
      const changed = next.some(
        (row, i) =>
          String(row.matched_product_id || '') !== String(prev[i]?.matched_product_id || ''),
      );
      return changed ? next : prev;
    });
  }, [productOptions, scanned]);

  const unmatchedCount = useMemo(
    () => rows.filter((r) => !r.matched_product_id && String(r.product_description || '').trim()).length,
    [rows],
  );
  const verifyCount = useMemo(() => countVerifyRows(rows), [rows]);

  const scanBootstrap = useMemo(() => {
    if (!scanned || scanning) return null;
    const extractionLines = extractionRowsToReceiveLines(rows, pharmacySettings);
    return {
      ...buildScanBootstrapFromExtractionLines(
        extractionLines,
        pharmacySettings,
        'Imported from invoice scan (review before posting).',
        scanDocument,
      ),
      extractionId: activeExtractionId,
      scanUx: scanReview.ux,
      // Gemini consent panel already shows this copy — don't repeat it in the grid.
      scanReviewMessage: invoicePages.some((p) => p.needsFallback)
        ? ''
        : scanReview.ux !== SCAN_UX.CLEAN
          ? scanReview.message
          : '',
    };
  }, [
    activeExtractionId,
    scanned,
    scanning,
    rows,
    pharmacySettings,
    scanDocument,
    scanReview,
    invoicePages,
  ]);

  const pagesPending = useMemo(
    () => invoicePages.filter((p) => p.status === 'pending' || p.status === 'error').length,
    [invoicePages],
  );

  const mapApiItems = useCallback(
    (items) =>
      applyClientProductMatches(
        applyPurchaseDefaultsToRows(apiItemsToExtractionRows(items), pharmacySettings),
        productOptions,
      ),
    [pharmacySettings, productOptions],
  );

  const closePreview = useCallback(() => {
    previewBlobsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewBlobsRef.current = [];
    setPreview({ open: false, pages: [], index: 0, blobUrls: [] });
  }, []);

  const startNewInvoice = useCallback(
    ({ keepPages = [], silent = false } = {}) => {
      const keepUrls = new Set((keepPages || []).map((p) => p.previewUrl).filter(Boolean));
      invoicePages.forEach((page) => {
        if (page.previewUrl && !keepUrls.has(page.previewUrl)) {
          URL.revokeObjectURL(page.previewUrl);
        }
      });
      setInvoicePages(keepPages);
      setRows([emptyExtractionRow()]);
      setScanned(false);
      setActiveExtractionId(null);
      setInvoiceExtractionIds([]);
      setScanDocument(null);
      setScanEngine(null);
      setScanReview({ ux: SCAN_UX.CLEAN, message: '' });
      billGroupRef.current = newBillGroupId();
      setError('');
      setReceiveWorkspaceKey(0);
      clearScanDraft(companyId);
      closePreview();
      if (!silent && (scanned || invoicePages.length)) {
        toast.message('Started a new invoice');
      }
    },
    [companyId, invoicePages, scanned, closePreview],
  );

  const handleReceivePosted = useCallback(() => {
    loadHistory();
    startNewInvoice({ silent: true });
  }, [loadHistory, startNewInvoice]);

  const openPagePreview = (index) => {
    previewBlobsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const blobUrls = [];
    const pages = invoicePages.map((page, i) => {
      // Always mint a fresh blob from the File so a revoked thumbnail URL still opens.
      let src = '';
      if (page.file instanceof Blob) {
        src = URL.createObjectURL(page.file);
        blobUrls.push(src);
      } else if (page.previewUrl) {
        src = page.previewUrl;
      }
      const scanNote =
        page.status === 'done'
          ? `${page.itemCount || 0} line${page.itemCount === 1 ? '' : 's'} extracted`
          : page.status === 'scanning'
            ? 'Scanning…'
            : page.status === 'pending'
              ? 'Ready to scan'
              : '';
      return {
        id: page.id,
        src,
        title: `Page ${i + 1}`,
        caption: scanNote,
        error: page.status === 'error' ? page.error : '',
      };
    });
    previewBlobsRef.current = blobUrls;
    setPreview({ open: true, index, blobUrls, pages });
  };

  const viewHistoryImage = async (row) => {
    const ids =
      Array.isArray(row?.page_ids) && row.page_ids.length
        ? row.page_ids
        : row?.id
          ? [row.id]
          : [];
    if (!ids.length) return;
    try {
      const loaded = [];
      const blobUrls = [];
      for (let i = 0; i < ids.length; i += 1) {
        try {
          const res = await pharmacyApi.extractionImage(ids[i]);
          const blob = res.data;
          if (
            !(blob instanceof Blob) ||
            (blob.type &&
              !blob.type.startsWith('image/') &&
              blob.type !== 'application/octet-stream')
          ) {
            continue;
          }
          const url = URL.createObjectURL(blob);
          blobUrls.push(url);
          loaded.push({
            id: ids[i],
            src: url,
            title: `Page ${i + 1}`,
            caption: row.original_filename || `Scan #${row.id}`,
          });
        } catch {
          /* skip a missing page photo */
        }
      }
      if (!loaded.length) throw new Error('not-an-image');
      previewBlobsRef.current.forEach((u) => URL.revokeObjectURL(u));
      previewBlobsRef.current = blobUrls;
      setPreview({ open: true, index: 0, blobUrls, pages: loaded });
    } catch {
      toast.error('Could not open that invoice image.');
    }
  };

  const onPagesChange = (next) => {
    setError('');
    // First photos of a new drop, while old lines are still on screen → do not merge.
    if (next.length > 0 && invoicePages.length === 0 && scanned) {
      startNewInvoice({ keepPages: next, silent: true });
      toast.message('Previous lines cleared — scanning as a new invoice');
      return;
    }
    if (!next.length && invoicePages.some((p) => p.status === 'done')) {
      startNewInvoice({ keepPages: [], silent: true });
      return;
    }
    setInvoicePages(next);
  };

  // The grand total is printed once for the whole bill, usually on the last
  // page, so the lines can only be checked against it here — after every page
  // has come back and the rows are merged.
  const reconcileInvoiceTotals = async (pageIds) => {
    if (!pageIds.length) return;
    try {
      const res = await pharmacyApi.reconcileInvoice(pageIds);
      const data = unwrap(res);
      const report = data?.reconciliation;
      if (!report) return;

      if (report.status === 'corrected' && Array.isArray(data.items) && data.items.length) {
        setRows(mapApiItems(data.items));
        setReceiveWorkspaceKey((k) => k + 1);
        toast.success(`Lines re-read — they now match the invoice total ${money(report.printed_total)}`);
        loadHistory();
        return;
      }

      if (report.status === 'unresolved') {
        toast.warning(
          `Lines add up to ${money(report.extracted_total)} but the invoice says ${money(report.printed_total)} — check quantities and rates before saving.`,
        );
      }
    } catch {
      // The review screen still works without this check; never block on it.
    }
  };

  /**
   * Pages are scanned independently and can, in principle, land on different
   * engines — a page that fails validation is corrected while its neighbours
   * are not. The badge reports the primary and whether any page needed a
   * second opinion, which is what matters when a number looks wrong.
   */
  const summarizeScanEngine = (successes) => {
    const engines = (successes || []).map((r) => r.engine).filter((e) => e?.provider);
    if (!engines.length) return null;
    const corrected = engines.find((e) => e.fallbackUsed && e.fallbackProvider);
    return {
      provider: engines[0].provider,
      model: engines[0].model,
      fallbackProvider: corrected?.fallbackProvider || '',
      fallbackReason: corrected?.fallbackReason || '',
      correctedPages: engines.filter((e) => e.fallbackUsed).length,
      pages: engines.length,
    };
  };

  const scanAllPages = async ({ append = false, pageIds = null, allowFallback = false } = {}) => {
    const queue = invoicePages.filter((p) => {
      if (pageIds?.length) return pageIds.includes(p.id);
      return p.status === 'pending' || p.status === 'error';
    });
    if (!queue.length) {
      if (!invoicePages.length) {
        setError('Add at least one invoice page photo first.');
      } else {
        setError('All pages are already scanned. Add more pages or post below.');
      }
      return;
    }

    scanAbortRef.current = false;
    setScanning(true);
    setError('');
    setScanProgress({ current: 0, total: queue.length });

    const results = new Array(queue.length).fill(null);
    const pageErrors = [];
    let completed = 0;
    const pageIndexById = new Map(invoicePages.map((p, i) => [p.id, i + 1]));

    const scanPage = async (page, slot) => {
      setInvoicePages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, status: 'scanning', error: '' } : p)),
      );

      const applyInterpreted = (interpreted, extra = {}) => {
        const items = interpreted.items.length
          ? interpreted.items
          : extra.bestItems || [];
        const ux = items.length
          ? (interpreted.hasUsableRows ? interpreted.ux : SCAN_UX.REVIEW)
          : SCAN_UX.EMPTY;
        const message = items.length
          ? pharmacistScanMessage(ux, items.length)
          : interpreted.pharmacistMessage;

        if (items.length) {
          results[slot] = {
            rows: stampOcrLineOrigins(
              applyOcrHighlights(mapApiItems(items), interpreted.issues).map((row) => ({
                ...row,
                _scanPageId: page.id,
              })),
              interpreted.meta?.extraction_id || extra.extractionId || null,
            ),
            extractionId: interpreted.meta?.extraction_id || extra.extractionId || null,
            document: interpreted.document || extra.document || null,
            engine: {
              provider: interpreted.meta?.provider || extra.provider || '',
              model: interpreted.meta?.model || '',
              fallbackUsed: Boolean(interpreted.fallbackUsed),
              fallbackProvider: interpreted.fallbackProvider || '',
              fallbackReason: interpreted.fallbackReason || '',
            },
            ux,
            advisories: (interpreted.issues || []).filter((issue) => issue?.severity === 'advisory'),
            ocrDebug: interpreted.ocrDebug || extra.ocrDebug || null,
          };

          if (interpreted.ocrDebug) setOcrDebug(interpreted.ocrDebug);

          setInvoicePages((prev) =>
            prev.map((p) =>
              p.id === page.id
                ? {
                    ...p,
                    status: 'done',
                    itemCount: items.length,
                    error: '',
                    pharmacistMessage: message,
                    needsFallback: Boolean(interpreted.needsFallback),
                    fallbackProvider: interpreted.fallbackProvider || p.fallbackProvider || '',
                    reasonCode: interpreted.reasonCode || '',
                    issues: interpreted.issues || [],
                    primaryLines: [],
                    bestItems: items,
                  }
                : p,
            ),
          );
          return;
        }

        pageErrors.push(message);
        setInvoicePages((prev) =>
          prev.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  status: 'error',
                  error: message,
                  pharmacistMessage: message,
                  needsFallback: Boolean(interpreted.needsFallback),
                  fallbackProvider: interpreted.fallbackProvider || p.fallbackProvider || '',
                  reasonCode: interpreted.reasonCode || '',
                  issues: [],
                  primaryLines: [],
                  primaryItemCount: 0,
                }
              : p,
          ),
        );
      };

      try {
        if (!(page.file instanceof Blob)) {
          throw new Error('This page has no photo to scan.');
        }
        const form = new FormData();
        form.append('image', page.file);
        if (allowFallback) form.append('allow_fallback', '1');
        form.append('bill_group', billGroupRef.current);
        const pageIndex = pageIndexById.get(page.id) || slot + 1;
        form.append('page_index', String(pageIndex));
        const res = await pharmacyApi.parseInvoice(form);
        applyInterpreted(interpretInvoiceScanResult({ data: unwrap(res) }), {
          bestItems: page.bestItems,
        });
      } catch (e) {
        applyInterpreted(interpretInvoiceScanResult({ error: e }), {
          bestItems: page.bestItems,
        });
      } finally {
        completed += 1;
        setScanProgress({ current: completed, total: queue.length });
      }
    };

    // Pages are independent OCR calls — a few in flight turns a 5-page bill
    // from five round trips into roughly two.
    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(SCAN_CONCURRENCY, queue.length) },
      async () => {
        while (cursor < queue.length) {
          if (scanAbortRef.current) return;
          const slot = cursor;
          cursor += 1;
          await scanPage(queue[slot], slot);
        }
      },
    );
    await Promise.all(workers);

    const successes = results.filter(Boolean);
    const replacingIds = new Set(pageIds || []);
    const sessionHasScannedPages = scanned || invoicePages.some((p) => p.status === 'done');
    const shouldAppend = Boolean(append) && sessionHasScannedPages;
    const previousRows = shouldAppend
      ? rows.filter((r) => {
          if (!String(r.product_description || '').trim() && !r.matched_product_id) return false;
          if (replacingIds.size && replacingIds.has(r._scanPageId)) return false;
          return true;
        })
      : [];
    const merged = [
      ...previousRows,
      // Keep page order regardless of which request finished first.
      ...successes.flatMap((r) => r.rows),
    ];
    const lastExtractionId = shouldAppend
      ? ([...successes].reverse().find((r) => r.extractionId)?.extractionId ?? activeExtractionId)
      : ([...successes].reverse().find((r) => r.extractionId)?.extractionId ?? null);

    if (successes.length) {
      setRows(merged.length ? merged : [emptyExtractionRow()]);
      setScanned(true);
      // The header comes off whichever page actually printed one — on most
      // multi-page bills that is the first, but not always.
      const scannedDocument =
        successes.find((r) => r.document?.invoice?.invoice_number || r.document?.supplier?.name)
          ?.document
        || successes.find((r) => r.document)?.document
        || null;
      if (scannedDocument) setScanDocument(scannedDocument);
      setActiveExtractionId(lastExtractionId);
      setReceiveWorkspaceKey((k) => k + 1);
      loadHistory();
      const ux = pickWorstScanUx(successes.map((r) => r.ux));
      const message = pharmacistScanMessage(ux, merged.length);
      setScanReview({ ux, message });
      if (ux === SCAN_UX.CLEAN) {
        toast.success(message);
      }
      setScanEngine(summarizeScanEngine(successes));
      const lastDebug = [...successes].reverse().find((r) => r.ocrDebug)?.ocrDebug;
      if (lastDebug) setOcrDebug(lastDebug);

      const nextPageIds = [
        ...(shouldAppend ? invoiceExtractionIds : []),
        ...successes.map((r) => r.extractionId).filter(Boolean),
      ];
      setInvoiceExtractionIds(nextPageIds);
      if (!pageErrors.length && ux === SCAN_UX.CLEAN) {
        // A page that failed to scan would make the invoice look short of its
        // printed total, so only a complete invoice is reconciled.
        await reconcileInvoiceTotals(nextPageIds);
      }
    } else if (!scanAbortRef.current) {
      setScanReview({
        ux: SCAN_UX.EMPTY,
        message: pharmacistScanMessage(SCAN_UX.EMPTY),
      });
    }

    setScanning(false);
    setScanProgress({ current: 0, total: 0 });
  };

  const cancelScan = () => {
    scanAbortRef.current = true;
  };

  const useGeminiForPage = (page) => {
    if (!page?.id || scanning) return;
    scanAllPages({
      append: invoicePages.some((p) => p.id !== page.id && p.status === 'done'),
      pageIds: [page.id],
      allowFallback: true,
    });
  };

  const declineGeminiForPage = (page) => {
    if (!page?.id) return;
    setInvoicePages((prev) =>
      prev.map((p) => (p.id === page.id ? { ...p, needsFallback: false } : p)),
    );
  };

  const openHistoryItem = async (row) => {
    if (!row?.id) return;
    setLoadingHistoryItem(true);
    setError('');
    try {
      const res = await pharmacyApi.getExtraction(row.id);
      const detail = unwrap(res);
      const items = detail?.items || [];
      if (!items.length) {
        toast.error('This scan has no line items.');
        return;
      }
      const pageRecords =
        Array.isArray(detail.pages) && detail.pages.length
          ? detail.pages
          : [
              {
                id: detail.id,
                item_count: items.length,
                has_image: detail.has_image,
                original_filename: detail.original_filename,
              },
            ];
      setRows(
        stampOcrLinesFromPages(
          applyClientProductMatches(
            applyPurchaseDefaultsToRows(apiItemsToExtractionRows(items), pharmacySettings),
            productOptions,
          ),
          pageRecords,
          detail.id,
        ),
      );
      setScanned(true);
      setScanReview({ ux: SCAN_UX.CLEAN, message: '' });
      setActiveExtractionId(detail.id);
      setScanEngine(engineFromExtraction(detail));
      setScanDocument(detail.document || null);
      if (detail.ocr_debug) setOcrDebug(detail.ocr_debug);
      if (detail.bill_group) billGroupRef.current = detail.bill_group;
      const pageIds =
        Array.isArray(detail.page_ids) && detail.page_ids.length ? detail.page_ids : [detail.id];
      setInvoiceExtractionIds(pageIds);
      setReceiveWorkspaceKey((k) => k + 1);
      revokeInvoicePages(invoicePages);

      const restored = await Promise.all(
        pageRecords.map(async (p) => {
          let previewUrl = '';
          if (p.has_image !== false) {
            try {
              const img = await pharmacyApi.extractionImage(p.id);
              if (img?.data instanceof Blob) previewUrl = URL.createObjectURL(img.data);
            } catch {
              /* thumbnail is optional */
            }
          }
          return {
            id: `hist-${p.id}`,
            extractionId: p.id,
            file: null,
            previewUrl,
            status: 'done',
            itemCount: p.item_count || 0,
            error: '',
          };
        }),
      );
      setInvoicePages(restored);
      const pages = detail.page_count || pageRecords.length || 1;
      toast.success(
        pages > 1
          ? `Loaded ${pages}-page bill · ${items.length} lines`
          : `Loaded scan #${detail.id} · ${items.length} lines`,
      );
      if (detail.status === 'draft') {
        pharmacyApi.updateExtraction(detail.id, { status: 'reviewed' }).catch(() => {});
      }
    } catch {
      toast.error('Could not load that scan.');
    } finally {
      setLoadingHistoryItem(false);
    }
  };

  const deleteHistoryItem = (row) => {
    if (!row?.id) return;
    setConfirm({
      type: 'delete-one',
      title: 'Delete this scan?',
      description: `${row.original_filename || `Scan #${row.id}`}${
        row.page_count > 1 ? ` (${row.page_count} pages)` : ''
      } will be removed, including its photo${row.page_count > 1 ? 's' : ''} and extracted lines.`,
      action: 'Delete scan',
      row,
    });
  };

  const clearAllHistory = () => {
    if (!history.length) return;
    setConfirm({
      type: 'clear-all',
      title: 'Delete all saved scans?',
      description: `${history.length} saved scan${history.length === 1 ? '' : 's'} will be removed, including photos and extracted lines. This cannot be undone.`,
      action: 'Delete all',
    });
  };

  const confirmNewInvoice = () => {
    if (scanning) return;
    const hasWork =
      scanned ||
      invoicePages.length > 0 ||
      rows.some((r) => String(r.product_description || '').trim() || r.matched_product_id);
    if (!hasWork) {
      startNewInvoice();
      return;
    }
    setConfirm({
      type: 'new-invoice',
      title: 'Start a new invoice?',
      description: 'Current photos and lines on this screen will be cleared. Saved scans in History are not deleted.',
      action: 'New invoice',
      tone: 'default',
    });
  };

  const runConfirm = async () => {
    const next = confirm;
    setConfirm(null);
    if (!next) return;
    if (next.type === 'new-invoice') {
      startNewInvoice();
      return;
    }
    if (next.type === 'delete-one' && next.row?.id) {
      setDeletingId(next.row.id);
      try {
        await pharmacyApi.deleteExtraction(next.row.id);
        setHistory((prev) => prev.filter((item) => String(item.id) !== String(next.row.id)));
        if (String(activeExtractionId) === String(next.row.id)) {
          startNewInvoice({ silent: true });
        }
        toast.success('Scan deleted');
      } catch {
        toast.error('Could not delete that scan.');
      } finally {
        setDeletingId(null);
      }
      return;
    }
    if (next.type === 'clear-all') {
      setClearingHistory(true);
      try {
        await pharmacyApi.deleteAllExtractions();
        setHistory([]);
        if (activeExtractionId) {
          startNewInvoice({ silent: true });
        }
        toast.success('Saved scans removed');
      } catch {
        toast.error('Could not clear saved scans.');
      } finally {
        setClearingHistory(false);
      }
    }
  };

  const addScanRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      applyPurchaseDefaultsToRows([emptyExtractionRow()], pharmacySettings)[0],
    ]);
  }, [pharmacySettings]);

  const printScan = useCallback(() => {
    window.print();
  }, []);

  const hasWorkingInvoice =
    scanned ||
    invoicePages.length > 0 ||
    rows.some((r) => String(r.product_description || '').trim() || r.matched_product_id);

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-2.5">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <Link to={`/workspace/${companyId}/pharmacy/receive`} aria-label="Back to Receive">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-800 text-white">
            <ScanLine className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[16px] font-bold tracking-tight text-slate-900">
                Scan supplier bill
              </h1>
              <Badge variant="secondary" className="inline-flex h-5 gap-1 px-1.5 text-[10px] font-normal">
                <Sparkles className="size-3" />
                {scanned && scanEngine?.provider
                  ? formatOcrEngineName(scanEngine.provider)
                  : 'AI supported'}
              </Badge>
              {activeExtractionId ? (
                <span className="text-[10px] text-slate-400">#{activeExtractionId}</span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-500">
              {scanned
                ? scanEngine?.provider
                  ? `Verify lines · read by ${formatOcrEngineName(scanEngine.provider)}${
                      scanEngine.fallbackProvider
                      && formatOcrEngineName(scanEngine.fallbackProvider)
                        !== formatOcrEngineName(scanEngine.provider)
                        ? ` · corrected by ${formatOcrEngineName(scanEngine.fallbackProvider)}`
                        : ''
                    }`
                  : 'Verify lines · batches · post stock on this page'
                : 'Scan supplier bill · match catalogue · receive stock'}
            </p>
          </div>
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          {scanned && !scanning ? (
            <>
              {unmatchedCount > 0 ? (
                <StatusPill tone="danger">{unmatchedCount} not linked</StatusPill>
              ) : verifyCount > 0 ? (
                <StatusPill tone="warn">{verifyCount} to verify</StatusPill>
              ) : null}
            </>
          ) : null}
          {hasWorkingInvoice ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-none hover:border-red-200 hover:bg-red-50 hover:text-red-800"
              disabled={scanning || loadingHistoryItem}
              onClick={confirmNewInvoice}
            >
              <FilePlus2 className="size-3.5" />
              New invoice
            </Button>
          ) : null}
          <SavedScansMenu
            rows={history}
            loading={historyLoading || loadingHistoryItem}
            activeId={activeExtractionId}
            deletingId={deletingId}
            clearing={clearingHistory}
            disabled={scanning}
            onOpen={openHistoryItem}
            onViewImage={viewHistoryImage}
            onDelete={deleteHistoryItem}
            onClearAll={clearAllHistory}
          />
          {embeddedToolbar ? (
            <>
              <PurchaseReceiveMainActions
                saving={embeddedToolbar.saving}
                disabled={!embeddedToolbar.canEditBill}
                onDraft={embeddedToolbar.saveDraft}
              />
              <PurchaseReceiveMoreMenu
                companyId={companyId}
                saving={embeddedToolbar.saving}
                disabled={!embeddedToolbar.canEditBill}
                showMatchLegend={embeddedToolbar.fromInvoiceScan}
                onAddLine={embeddedToolbar.addLine}
                onPaste={embeddedToolbar.togglePaste}
                onPrint={embeddedToolbar.print}
              />
            </>
          ) : (
            <PurchaseScanMoreMenu
              disabled={!scanned || scanning}
              ocrJsonDisabled={!ocrDebug}
              onAddRow={addScanRow}
              onPrint={printScan}
              onViewOcrJson={() => setOcrJsonOpen(true)}
            />
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {scanned && invoicePages.length > 0 ? (
          <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-1">
            <InvoicePageQueue
              variant="toolbar"
              pages={invoicePages}
              onPagesChange={onPagesChange}
              onPreviewPage={openPagePreview}
              disabled={scanning}
              onUseFallback={useGeminiForPage}
              onDeclineFallback={declineGeminiForPage}
              scanAction={
                pagesPending ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 bg-emerald-700 px-2.5 text-[11px] font-semibold hover:bg-emerald-800"
                      disabled={scanning}
                      onClick={() =>
                        scanAllPages({ append: invoicePages.some((p) => p.status === 'done') })
                      }
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="size-3 me-1 animate-spin" />
                          {scanProgress.current}/{scanProgress.total}
                        </>
                      ) : (
                        <>
                          <ScanLine className="size-3 me-1" />
                          Scan {pagesPending}
                        </>
                      )}
                    </Button>
                    {scanning ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={cancelScan}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                ) : null
              }
            />
            {error ? (
              <div className="mt-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800">
                {error}
              </div>
            ) : null}
          </div>
        ) : null}

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!scanned || scanning ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="flex h-full items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-xl">
                  {scanning && invoicePages.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                      <Loader2 className="size-8 animate-spin text-emerald-700" />
                      <p className="text-sm font-medium text-slate-800">Scanning invoice…</p>
                    </div>
                  ) : (
                    <InvoicePageQueue
                      pages={invoicePages}
                      onPagesChange={onPagesChange}
                      onPreviewPage={openPagePreview}
                      disabled={scanning}
                      onUseFallback={useGeminiForPage}
                      onDeclineFallback={declineGeminiForPage}
                      scanAction={
                        invoicePages.length > 0 ? (
                          <InvoiceScanButton
                            pending={pagesPending}
                            scanning={scanning}
                            progress={scanProgress}
                            scanned={scanned}
                            disabled={scanning}
                            onScan={() =>
                              scanAllPages({ append: invoicePages.some((p) => p.status === 'done') })
                            }
                            onCancel={cancelScan}
                          />
                        ) : null
                      }
                    />
                  )}
                  {error ? (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : scanBootstrap ? (
            <PurchaseReceiveWorkspace
              key={`scan-receive-${receiveWorkspaceKey}`}
              embedded
              companyId={companyId}
              scanBootstrap={scanBootstrap}
              extractionId={activeExtractionId}
              onPosted={handleReceivePosted}
              onEmbeddedToolbar={setEmbeddedToolbar}
            />
          ) : null}
        </section>
      </div>

      <InvoiceImagePreview
        open={preview.open}
        pages={preview.pages}
        index={preview.index}
        onIndexChange={(next) => setPreview((prev) => ({ ...prev, index: next }))}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      />

      <Dialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[80] bg-slate-900/50"
          className="z-[80] gap-4 p-5 sm:max-w-[400px]"
          data-pharmacy-typing
        >
          <DialogTitle className="text-[16px] font-semibold text-slate-900">
            {confirm?.title}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-slate-600">
            {confirm?.description}
          </DialogDescription>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-9 border-slate-200 bg-white"
              onClick={() => setConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={
                confirm?.tone === 'default'
                  ? 'h-9 bg-emerald-700 hover:bg-emerald-800'
                  : 'h-9 bg-red-600 hover:bg-red-700'
              }
              onClick={runConfirm}
            >
              {confirm?.action || 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <InvoiceOcrJsonDialog
        open={ocrJsonOpen}
        onOpenChange={setOcrJsonOpen}
        debug={ocrDebug}
      />
    </div>
  );
}

function StatusPill({ children, tone = 'neutral' }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        tone === 'danger' && 'border-red-200 bg-red-50 text-red-700',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-800',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        tone === 'neutral' && 'border-slate-200 bg-slate-50 text-slate-600',
      )}
    >
      {children}
    </span>
  );
}
