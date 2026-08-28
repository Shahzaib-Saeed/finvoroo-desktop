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
import { PurchaseScanMoreMenu } from '../components/PurchaseScanToolbar';
import {
  PurchaseReceiveMainActions,
  PurchaseReceiveMoreMenu,
} from '../components/PurchaseReceiveToolbar';

/** One Gemini call at a time — parallel pages hit rate limits and look like a failed scan. */
const SCAN_CONCURRENCY = 1;

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
  const [loadingHistoryItem, setLoadingHistoryItem] = useState(false);
  const [pharmacySettings, setPharmacySettings] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [preview, setPreview] = useState({ open: false, pages: [], index: 0, blobUrls: [] });
  const [confirm, setConfirm] = useState(null);
  const previewBlobsRef = useRef([]);
  const invoicePagesRef = useRef([]);
  const [receiveWorkspaceKey, setReceiveWorkspaceKey] = useState(0);
  const [embeddedToolbar, setEmbeddedToolbar] = useState(null);

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
      ),
      extractionId: activeExtractionId,
    };
  }, [activeExtractionId, scanned, scanning, rows, pharmacySettings]);

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
    if (!row?.id) return;
    try {
      const res = await pharmacyApi.extractionImage(row.id);
      const blob = res.data;
      if (!(blob instanceof Blob) || (blob.type && !blob.type.startsWith('image/') && blob.type !== 'application/octet-stream')) {
        throw new Error('not-an-image');
      }
      const url = URL.createObjectURL(blob);
      previewBlobsRef.current.forEach((u) => URL.revokeObjectURL(u));
      previewBlobsRef.current = [url];
      setPreview({
        open: true,
        index: 0,
        blobUrls: [url],
        pages: [
          {
            id: row.id,
            src: url,
            title: row.original_filename || `Scan #${row.id}`,
            caption: `${row.item_count || 0} lines · ${row.status || 'draft'}`,
          },
        ],
      });
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

  const scanAllPages = async ({ append = false } = {}) => {
    const queue = invoicePages.filter((p) => p.status === 'pending' || p.status === 'error');
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

    const scanPage = async (page, slot) => {
      setInvoicePages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, status: 'scanning', error: '' } : p)),
      );

      try {
        const form = new FormData();
        form.append('image', page.file);
        const res = await pharmacyApi.parseInvoice(form);
        const data = unwrap(res);
        const items = data?.items || [];
        if (!items.length) {
          throw new Error('No line items on this page.');
        }

        results[slot] = {
          rows: mapApiItems(items),
          extractionId: data?.meta?.extraction_id || data?.extraction?.id || null,
        };

        setInvoicePages((prev) =>
          prev.map((p) =>
            p.id === page.id
              ? { ...p, status: 'done', itemCount: items.length, error: '' }
              : p,
          ),
        );
      } catch (e) {
        const status = Number(e?.response?.status || 0);
        // The API already returns the real Gemini reason — never mask it.
        const msg =
          e?.response?.data?.message
          || e?.message
          || (status ? `Scan failed (HTTP ${status}).` : 'Could not scan this page.');
        pageErrors.push(msg);
        setInvoicePages((prev) =>
          prev.map((p) => (p.id === page.id ? { ...p, status: 'error', error: msg } : p)),
        );
      } finally {
        completed += 1;
        setScanProgress({ current: completed, total: queue.length });
      }
    };

    // Pages are independent Gemini calls — a few in flight turns a 5-page bill
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
    const sessionHasScannedPages = invoicePages.some((p) => p.status === 'done');
    const shouldAppend = Boolean(append) && sessionHasScannedPages;
    const merged = [
      ...(shouldAppend
        ? rows.filter((r) => String(r.product_description || '').trim() || r.matched_product_id)
        : []),
      // Keep page order regardless of which request finished first.
      ...successes.flatMap((r) => r.rows),
    ];
    const lastExtractionId = shouldAppend
      ? ([...successes].reverse().find((r) => r.extractionId)?.extractionId ?? activeExtractionId)
      : ([...successes].reverse().find((r) => r.extractionId)?.extractionId ?? null);

    if (successes.length) {
      setRows(merged.length ? merged : [emptyExtractionRow()]);
      setScanned(true);
      setActiveExtractionId(lastExtractionId);
      setReceiveWorkspaceKey((k) => k + 1);
      loadHistory();
      toast.success(
        shouldAppend
          ? `Added ${successes.flatMap((r) => r.rows).length} line${successes.flatMap((r) => r.rows).length === 1 ? '' : 's'} from ${successes.length} page${successes.length === 1 ? '' : 's'}`
          : `Extracted ${merged.length} line${merged.length === 1 ? '' : 's'} from ${successes.length} page${successes.length === 1 ? '' : 's'}`,
      );

      const pageIds = [
        ...(shouldAppend ? invoiceExtractionIds : []),
        ...successes.map((r) => r.extractionId).filter(Boolean),
      ];
      setInvoiceExtractionIds(pageIds);
      if (!pageErrors.length) {
        // A page that failed to scan would make the invoice look short of its
        // printed total, so only a complete invoice is reconciled.
        await reconcileInvoiceTotals(pageIds);
      }
    } else if (!scanAbortRef.current) {
      const unique = [...new Set(pageErrors.filter(Boolean))];
      setError(unique.join(' · ') || 'No lines could be read from this page.');
    }

    setScanning(false);
    setScanProgress({ current: 0, total: 0 });
  };

  const cancelScan = () => {
    scanAbortRef.current = true;
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
      setRows(
        applyClientProductMatches(
          applyPurchaseDefaultsToRows(apiItemsToExtractionRows(items), pharmacySettings),
          productOptions,
        ),
      );
      setScanned(true);
      setActiveExtractionId(detail.id);
      setReceiveWorkspaceKey((k) => k + 1);
      revokeInvoicePages(invoicePages);
      setInvoicePages([]);
      toast.success(`Loaded scan #${detail.id} · ${items.length} lines`);
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
      description: `${row.original_filename || `Scan #${row.id}`} will be removed, including its photo and extracted lines.`,
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
              <Badge variant="secondary" className="hidden h-5 gap-1 px-1.5 text-[10px] font-normal sm:inline-flex">
                <Sparkles className="size-3" />
                Gemini
              </Badge>
              {activeExtractionId ? (
                <span className="text-[10px] text-slate-400">#{activeExtractionId}</span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-500">
              {scanned
                ? 'Verify lines · batches · post stock on this page'
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
              onAddRow={addScanRow}
              onPrint={printScan}
            />
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {scanned && invoicePages.length > 0 ? (
          <div className="shrink-0 border-b border-slate-200 bg-slate-50/40 px-4 py-2.5">
            <InvoicePageQueue
              variant="toolbar"
              pages={invoicePages}
              onPagesChange={onPagesChange}
              onPreviewPage={openPagePreview}
              disabled={scanning}
              scanAction={
                pagesPending ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 bg-emerald-700 px-3 text-[12px] font-semibold hover:bg-emerald-800"
                      disabled={scanning}
                      onClick={() =>
                        scanAllPages({ append: invoicePages.some((p) => p.status === 'done') })
                      }
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="size-3.5 me-1 animate-spin" />
                          {scanProgress.current}/{scanProgress.total}
                        </>
                      ) : (
                        <>
                          <ScanLine className="size-3.5 me-1" />
                          Scan {pagesPending}
                        </>
                      )}
                    </Button>
                    {scanning ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-[12px]"
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
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
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
