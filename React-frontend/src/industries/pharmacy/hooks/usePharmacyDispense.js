import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { posApi } from '@/pages/accounting/pos/api/pos.api';
import { lookupCachedBarcode, rememberBarcode } from '@/pages/accounting/pos/constants';
import { customersApi } from '@/pages/accounting/customers/api/customers.api';
import {
  computePharmacyTotals,
  createPharmacyCartLine,
  formatMoney,
  isPriceOverridden,
  money,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  toCheckoutLines,
} from '../lib/pharmacy-cart';
import {
  refreshMedicineStockByIds,
  resolveMedicineCode,
} from '../lib/medicine-catalog-cache';
import {
  isProductInPharmacyCatalog,
  reloadPharmacyCatalog,
  searchPharmacyCatalog,
  syncPharmacyCatalog,
} from '../lib/pharmacy-catalog-store';
import { getReceiptPaper } from '@/lib/print-agent';
import { printPosReceipt, maybeHintBrowserPrintSetup, warmReceiptLogoCache } from '@/lib/print-pos-receipt';
import { thermalReceiptFromPos } from '@/pages/accounting/document-output/components/ThermalReceiptBody';
import { getCachedReceiptImageUrl } from '@/lib/thermal-receipt-images';
import { resolveCompanyLogoUrl } from '@/lib/helpers';
import { isOnline, subscribeConnectivity } from '@/offline/connectivity';
import { getMeta } from '@/offline/db';
import { saveDocumentDraft } from '@/offline/documents-repository';
import { runSyncCycle } from '@/offline/sync-manager';
import { PosOfflineStore } from '@/pages/accounting/pos/lib/offline-store';
import { isWalkInCustomer } from '../lib/pharmacy-open-return';
import { formatPharmacyPosMoney, roundWholeRupee } from '../lib/cash-tender-suggestions';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function errMsg(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}

function isStaleProductIdError(err) {
  const msg = String(err?.response?.data?.message || '').toLowerCase();
  const errors = err?.response?.data?.errors || {};
  return (
    msg.includes('product_id') && msg.includes('invalid')
  ) || Object.keys(errors).some((k) => k.includes('product_id'));
}

function buildCheckoutThermalProps(data, bootstrap, currency) {
  const company = {
    ...(bootstrap?.company || {}),
    ...(data?.invoice?.company || {}),
  };
  const logoRaw =
    company.logo_url ||
    company.logo ||
    bootstrap?.company?.logo_url ||
    bootstrap?.company?.logo ||
    null;
  const logoInlined = logoRaw ? getCachedReceiptImageUrl(resolveCompanyLogoUrl(company) || logoRaw) : null;

  return thermalReceiptFromPos(data, {
    company: {
      ...company,
      logo_url: logoInlined || company.logo_url,
      logo: logoInlined || company.logo,
    },
    currency,
    widthMm: 80,
    showLogo: bootstrap?.settings?.receipt_show_logo !== false,
    showBrandingBack: !!bootstrap?.settings?.receipt_branding_back,
    posFeeLabel: bootstrap?.settings?.pos_fee_label || 'POS Fee',
    wholeRupees: true,
  });
}

function isTypingTarget(el) {
  if (!el) return false;
  if (el.closest?.('[data-pharmacy-typing]')) return true;
  if (el.closest?.('[data-pos-no-scan]')) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!el.isContentEditable;
}

export function usePharmacyDispense() {
  const { id: companyId } = useParams();
  const [bootLoading, setBootLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [lines, setLines] = useState([]);
  const [entryRowVisible, setEntryRowVisible] = useState(true);
  const [cartFocus, setCartFocus] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentExpanded, setPaymentExpanded] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = useState('');
  const [invoiceDiscountPercent, setInvoiceDiscountPercent] = useState('');
  const [invoiceDiscountType, setInvoiceDiscountType] = useState('fixed');
  const [shiftOpen, setShiftOpen] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('0');
  const [xReport, setXReport] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [holds, setHolds] = useState([]);
  const [holdPanelOpen, setHoldPanelOpen] = useState(false);
  const [activeHoldId, setActiveHoldId] = useState(null);
  const [pickSheetOpen, setPickSheetOpen] = useState(false);
  const [pickSheetRows, setPickSheetRows] = useState([]);
  const [pickSearchTerm, setPickSearchTerm] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [rxNote, setRxNote] = useState('');
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payDialogPrint, setPayDialogPrint] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerUnlock, setManagerUnlock] = useState(null);
  const scanRef = useRef(null);
  const tenderRef = useRef(null);
  const invoiceDiscRef = useRef(null);
  const checkoutLock = useRef(false);
  const walkInRef = useRef(null);
  const linesRef = useRef(lines);
  const cartHydrated = useRef(false);
  const customerPinnedRef = useRef(false);
  const focusScanRef = useRef(() => {});
  const [online, setOnline] = useState(() => isOnline());
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState(false);

  const taxRatesById = useMemo(() => {
    const map = {};
    for (const t of bootstrap?.tax_rates || []) map[String(t.id)] = t;
    return map;
  }, [bootstrap]);

  const currency = bootstrap?.company?.currency || 'USD';
  const shift = bootstrap?.shift || null;
  const managerActive =
    managerUnlock &&
    (!managerUnlock.expires_at || new Date(managerUnlock.expires_at).getTime() > Date.now());
  const warehouseId = bootstrap?.terminal?.warehouse_id ?? null;
  const permissions = useMemo(
    () => ({
      can_sell: true,
      can_edit_price: true,
      can_discount: true,
      can_hold: true,
      can_credit_sale: true,
      ...(bootstrap?.permissions || {}),
    }),
    [bootstrap],
  );

  const unitLabel =
    bootstrap?.company?.default_unit_label ||
    lines[0]?.unit_label ||
    'pcs';

  const totalsBeforeInvoiceDisc = useMemo(
    () => computePharmacyTotals(lines, 0, taxRatesById),
    [lines, taxRatesById],
  );

  const invoiceDiscountNum = useMemo(() => {
    const subtotal = totalsBeforeInvoiceDisc.subtotal;
    if (invoiceDiscountType === 'percent') {
      const pct = Math.min(Math.max(Number(invoiceDiscountPercent) || 0, 0), 100);
      return money(Math.min(subtotal, (subtotal * pct) / 100));
    }
    return money(Math.min(subtotal, Math.max(Number(invoiceDiscountAmount) || 0, 0)));
  }, [
    invoiceDiscountAmount,
    invoiceDiscountPercent,
    invoiceDiscountType,
    totalsBeforeInvoiceDisc.subtotal,
  ]);

  const posFeeSettings = useMemo(() => {
    const enabled = bootstrap?.settings?.pos_fee_enabled === true;
    const amount = money(Number(bootstrap?.settings?.pos_fee_amount) || 0);
    const label = String(bootstrap?.settings?.pos_fee_label || 'POS Fee').trim() || 'POS Fee';
    return {
      enabled,
      amount: enabled && amount > 0 ? amount : 0,
      label,
    };
  }, [bootstrap?.settings]);

  const totals = useMemo(() => {
    const base = computePharmacyTotals(lines, invoiceDiscountNum, taxRatesById);
    const posFee = lines.length > 0 ? posFeeSettings.amount : 0;
    return {
      ...base,
      posFee,
      posFeeLabel: posFeeSettings.label,
      total: money(base.total + posFee),
    };
  }, [lines, invoiceDiscountNum, taxRatesById, posFeeSettings]);

  const changeDue = useMemo(() => {
    const tender = money(cashAmount);
    return money(Math.max(0, tender - totals.total));
  }, [cashAmount, totals.total]);

  const needsRxNote = useMemo(
    () => lines.some((l) => l.prescription_required),
    [lines],
  );

  /** Last navigable row index — entry row only counts when visible. */
  const maxCartRowIndex = useMemo(
    () => (entryRowVisible ? lines.length : Math.max(0, lines.length - 1)),
    [entryRowVisible, lines.length],
  );

  useEffect(() => {
    if (lines.length === 0) setEntryRowVisible(true);
  }, [lines.length]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    const refreshCartStock = () => {
      if (!isOnline()) return;
      void syncPharmacyCatalog({ warehouseId, force: true });
      const ids = linesRef.current.map((l) => l.product_id).filter(Boolean);
      if (ids.length) void refreshMedicineStockByIds(ids, warehouseId);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCartStock();
    };
    window.addEventListener('focus', refreshCartStock);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refreshCartStock);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [warehouseId]);

  const showEntryRow = useCallback(({ openSheet = false } = {}) => {
    const rowIndex = lines.length;
    setEntryRowVisible(true);
    setCartFocus(rowIndex);

    window.dispatchEvent(
      new CustomEvent('pharmacy:commit-item-rows', { detail: { exceptRowIndex: rowIndex } }),
    );

    if (!openSheet) return;

    const focusAndOpen = (attempt = 0) => {
      requestAnimationFrame(() => {
        const cell = document.querySelector(`[data-dispense-item-search="${rowIndex}"]`);
        const input = cell?.querySelector('input');
        if (!input) {
          if (attempt < 12) focusAndOpen(attempt + 1);
          return;
        }
        input.focus({ preventScroll: true });
        input.select?.();
        window.dispatchEvent(
          new CustomEvent('pharmacy:open-medicine-sheet', { detail: { rowIndex } }),
        );
      });
    };
    focusAndOpen();
  }, [lines.length]);

  const focusScan = useCallback(() => {
    requestAnimationFrame(() => {
      const cell =
        document.querySelector(`[data-dispense-item-search="${lines.length}"]`) ||
        document.querySelector('[data-dispense-item-search]');
      const input = cell?.querySelector?.('input') || scanRef.current;
      input?.focus?.({ preventScroll: true });
      input?.select?.();
    });
  }, [lines.length]);

  focusScanRef.current = focusScan;

  const applyCustomerSelection = useCallback((row, { pin = true } = {}) => {
    if (pin) customerPinnedRef.current = true;
    setCustomer(row);
  }, []);

  const focusQty = useCallback((index) => {
    window.dispatchEvent(
      new CustomEvent('pharmacy:close-medicine-sheet', { detail: { restoreFocus: false } }),
    );
    setCartFocus(index);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-dispense-qty="${index}"]`);
        el?.focus?.({ preventScroll: true });
        el?.select?.();
      });
    });
  }, []);

  const cancelEntryRow = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('pharmacy:close-medicine-sheet', { detail: { restoreFocus: false } }),
    );
    if (lines.length === 0) {
      setEntryRowVisible(true);
      setCartFocus(0);
      focusScan();
      return;
    }
    setEntryRowVisible(false);
    const prev = lines.length - 1;
    setCartFocus(prev);
    focusQty(prev);
  }, [focusQty, focusScan, lines.length]);

  useEffect(() => {
    const onCancelEntry = () => cancelEntryRow();
    window.addEventListener('pharmacy:cancel-entry-row', onCancelEntry);
    return () => window.removeEventListener('pharmacy:cancel-entry-row', onCancelEntry);
  }, [cancelEntryRow]);

  const focusTender = useCallback(() => {
    requestAnimationFrame(() => tenderRef.current?.focus?.());
  }, []);

  const reloadBootstrap = useCallback(async () => {
    try {
      const data = unwrap(await posApi.bootstrap());
      setBootstrap(data);
      void PosOfflineStore.savePharmacyBootstrap(data);
      return data;
    } catch (e) {
      const cached = await PosOfflineStore.loadPharmacyBootstrap();
      if (cached) {
        setBootstrap(cached);
        return cached;
      }
      throw e;
    }
  }, []);

  const refreshHolds = useCallback(async () => {
    try {
      const data = unwrap(await posApi.holds.list()) || [];
      setHolds(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setHolds([]);
    }
  }, []);

  const loadCustomerInvoices = useCallback(async (customerId) => {
    if (!customerId || customerId === walkInRef.current?.id) {
      setCustomerInvoices([]);
      return;
    }
    setInvoicesLoading(true);
    try {
      const res = await customersApi.listInvoices(customerId, { per_page: 20 });
      const data = res?.data?.data ?? res?.data;
      setCustomerInvoices(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setCustomerInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customer?.id) loadCustomerInvoices(customer.id);
  }, [customer?.id, loadCustomerInvoices]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const enabled = Boolean(await getMeta(companyId, 'offline_sync_enabled', false));
      if (!cancelled) setOfflineSyncEnabled(enabled);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    const unsub = subscribeConnectivity(setOnline);
    const onOnline = () => {
      setOnline(true);
      toast.success('Back online');
      void reloadBootstrap();
      void refreshHolds();
      if (companyId) void runSyncCycle(companyId, { reason: 'pharmacy-pos-online' });
    };
    const onOffline = async () => {
      setOnline(false);
      const enabled = companyId
        ? Boolean(await getMeta(companyId, 'offline_sync_enabled', false))
        : false;
      if (enabled) {
        toast.message('Offline — complete sales as usual; they sync when connection returns');
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const beat = setInterval(async () => {
      if (!navigator.onLine) {
        setOnline(false);
        return;
      }
      try {
        await posApi.bootstrap();
        setOnline(true);
      } catch {
        setOnline(false);
      }
    }, 45000);
    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(beat);
    };
  }, [companyId, reloadBootstrap, refreshHolds]);

  useEffect(() => {
    if (cartHydrated.current) return;
    cartHydrated.current = true;
    (async () => {
      const saved = await PosOfflineStore.loadPharmacyCart();
      if (!saved?.lines?.length) return;
      setLines(saved.lines);
      if (saved.customer) {
        setCustomer((prev) => {
          if (customerPinnedRef.current) return prev;
          if (prev?.id && !isWalkInCustomer(prev, walkInRef.current)) return prev;
          return saved.customer;
        });
      }
      if (saved.invoiceDiscountType) setInvoiceDiscountType(saved.invoiceDiscountType);
      if (saved.invoiceDiscountAmount != null) {
        setInvoiceDiscountAmount(String(saved.invoiceDiscountAmount));
      }
      if (saved.invoiceDiscountPercent != null) {
        setInvoiceDiscountPercent(String(saved.invoiceDiscountPercent));
      }
      if (saved.rxNote != null) setRxNote(String(saved.rxNote));
      if (saved.cashAmount != null) setCashAmount(String(saved.cashAmount));
      if (saved.lines.length) {
        setEntryRowVisible(false);
        setCartFocus(0);
      }
    })();
  }, []);

  useEffect(() => {
    if (bootLoading) return;
    PosOfflineStore.savePharmacyCart({
      lines,
      customer,
      invoiceDiscountAmount,
      invoiceDiscountPercent,
      invoiceDiscountType,
      rxNote,
      cashAmount,
    });
  }, [
    bootLoading,
    lines,
    customer,
    invoiceDiscountAmount,
    invoiceDiscountPercent,
    invoiceDiscountType,
    rxNote,
    cashAmount,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const syncEnabled = companyId
          ? Boolean(await getMeta(companyId, 'offline_sync_enabled', false))
          : false;
        if (!cancelled) setOfflineSyncEnabled(syncEnabled);

        let data = null;
        try {
          [data] = await Promise.all([reloadBootstrap(), refreshHolds()]);
        } catch (e) {
          if (syncEnabled && !isOnline()) {
            data = await PosOfflineStore.loadPharmacyBootstrap();
            if (data && !cancelled) {
              setBootstrap(data);
              toast.message('Working offline — sales queue until connection returns');
            } else {
              throw e;
            }
          } else {
            throw e;
          }
        }
        if (cancelled) return;
        let walkIn = data?.walk_in_customer || null;
        if (!walkIn?.id && isOnline()) walkIn = unwrap(await posApi.walkIn());
        walkInRef.current = walkIn;
        if (!cancelled) {
          setCustomer((prev) => {
            if (customerPinnedRef.current && prev?.id) return prev;
            if (prev?.id && !isWalkInCustomer(prev, walkIn)) return prev;
            return walkIn;
          });
        }
        const needsShift = !data?.shift?.id && !(syncEnabled && !isOnline());
        if (needsShift) setShiftOpen(true);
      } catch (e) {
        toast.error(errMsg(e, 'Could not start dispensing'));
      } finally {
        if (!cancelled) setBootLoading(false);
        focusScanRef.current();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, reloadBootstrap, refreshHolds]);

  useEffect(() => {
    if (bootstrap?.company) void warmReceiptLogoCache(bootstrap.company);
  }, [bootstrap?.company]);

  useEffect(() => {
    if (payDialogOpen && bootstrap?.company) void warmReceiptLogoCache(bootstrap.company);
  }, [payDialogOpen, bootstrap?.company]);

  const getAvailableStock = useCallback(
    (productId, grossStock, forRowIndex = -1) => {
      const gross = Math.max(0, Number(grossStock) || 0);
      let reserved = 0;
      for (let i = 0; i < lines.length; i++) {
        if (String(lines[i].product_id) !== String(productId)) continue;
        if (i === forRowIndex) continue;
        reserved += Number(lines[i].quantity) || 0;
      }
      return Math.max(0, gross - reserved);
    },
    [lines],
  );

  const validateStockForAdd = useCallback(
    (product, qty, forRowIndex = -1) => {
      if (product?.track_inventory === false || product?.type === 'service') return true;
      const gross =
        Number(
          product?.current_stock ??
            product?.quantity_on_hand ??
            product?.stock ??
            product?.stock_qty ??
            0,
        ) || 0;
      let needQty = Number(qty) || 0;
      if (forRowIndex >= 0 && forRowIndex < lines.length) {
        const sameRow = String(lines[forRowIndex].product_id) === String(product.id);
        needQty = sameRow
          ? (Number(lines[forRowIndex].quantity) || 0) + needQty
          : needQty;
      }
      const available = getAvailableStock(product.id, gross, forRowIndex);
      if (available < needQty) {
        toast.error(
          available <= 0
            ? `${product.name || 'Product'} is out of stock (0 available)`
            : `Only ${available} available for ${product.name || 'product'}`,
        );
        return false;
      }
      return true;
    },
    [getAvailableStock, lines],
  );

  const addProduct = useCallback(
    (product, qty = 1) => {
      if (!product?.id) return;
      const idx = lines.findIndex((l) => String(l.product_id) === String(product.id));
      if (!validateStockForAdd(product, qty, idx >= 0 ? idx : -1)) return;
      let targetIdx = -1;
      setLines((prev) => {
        const idx = prev.findIndex((l) => String(l.product_id) === String(product.id));
        if (idx >= 0) {
          targetIdx = idx;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: (Number(next[idx].quantity) || 0) + qty,
          };
          return next;
        }
        targetIdx = prev.length;
        return [...prev, createPharmacyCartLine(product, qty)];
      });
      (product.pharmacy_warnings || []).forEach((w) =>
        toast.warning(w, { duration: 2000 }),
      );
      setEntryRowVisible(false);
      focusQty(targetIdx);
      if (product.barcode) rememberBarcode(product.barcode, product);
      if (product.sku) rememberBarcode(product.sku, product);
    },
    [focusQty, lines, validateStockForAdd],
  );

  /** Set product on an existing row, or append when index is the next empty slot. */
  const setLineProduct = useCallback(
    (index, product, qty = 1) => {
      if (!product?.id) return;
      const dupIdx = lines.findIndex((l) => String(l.product_id) === String(product.id));
      const forRow =
        index >= 0 && index < lines.length
          ? index
          : dupIdx >= 0
            ? dupIdx
            : -1;
      if (!validateStockForAdd(product, qty, forRow)) return;
      let targetIdx = index;
      setLines((prev) => {
        if (index >= 0 && index < prev.length) {
          const next = [...prev];
          next[index] = createPharmacyCartLine(product, qty);
          return next;
        }
        const dupIdx = prev.findIndex(
          (l) => String(l.product_id) === String(product.id),
        );
        if (dupIdx >= 0) {
          targetIdx = dupIdx;
          const next = [...prev];
          next[dupIdx] = {
            ...next[dupIdx],
            quantity: (Number(next[dupIdx].quantity) || 0) + qty,
          };
          return next;
        }
        targetIdx = prev.length;
        return [...prev, createPharmacyCartLine(product, qty)];
      });
      (product.pharmacy_warnings || []).forEach((w) =>
        toast.warning(w, { duration: 2000 }),
      );
      if (index >= lines.length) setEntryRowVisible(false);
      focusQty(targetIdx);
    },
    [focusQty, lines.length, lines, validateStockForAdd],
  );

  const openPickSheet = useCallback((rows, term = '') => {
    setPickSheetRows(rows);
    setPickSearchTerm(term);
    setPickSheetOpen(true);
  }, []);

  const pickProduct = useCallback(
    (product) => {
      setPickSheetOpen(false);
      setPickSheetRows([]);
      setPickSearchTerm('');
      addProduct(product, 1);
    },
    [addProduct],
  );

  const scanOrSearch = useCallback(
    async (raw) => {
      const value = String(raw || '').trim();
      if (!value) return;
      const stockParams = warehouseId ? { warehouse_id: warehouseId } : {};

      // Scanner gun path: the local index resolves an exact barcode or SKU in
      // O(1), so the product is in the cart before a request could even leave.
      const local = resolveMedicineCode(value);
      if (local?.id) {
        rememberBarcode(value, local);
        addProduct(local, 1);
        return;
      }

      const cached = lookupCachedBarcode(value);
      if (cached?.id) {
        addProduct(cached, 1);
        return;
      }

      // Not a known code. Try the local name index before going to the server.
      const localHits = searchPharmacyCatalog(value, 24);
      if (localHits.length === 1) {
        addProduct(localHits[0], 1);
        return;
      }
      if (localHits.length > 1) {
        openPickSheet(localHits, value);
        return;
      }

      if (!isOnline()) {
        toast.error(`No local match for “${value}” — connect once to refresh the catalog`);
        return;
      }

      try {
        const product = unwrap(await posApi.barcode(value, stockParams));
        if (product?.id) {
          rememberBarcode(value, product);
          addProduct(product, 1);
          return;
        }
      } catch {
        /* fallback */
      }
      try {
        const res = await posApi.catalog({ search: value, per_page: 24, ...stockParams });
        const rows = unwrap(res) || [];
        const list = Array.isArray(rows) ? rows : rows?.data || [];
        if (list.length === 1) {
          rememberBarcode(value, list[0]);
          addProduct(list[0], 1);
        } else if (list.length > 1) openPickSheet(list, value);
        else toast.error(`No medicine for “${value}”`);
      } catch (e) {
        if (!isOnline()) {
          toast.error(`No local match for “${value}” — connect once to refresh the catalog`);
        } else {
          toast.error(errMsg(e, 'Lookup failed'));
        }
      }
    },
    [addProduct, openPickSheet, warehouseId],
  );

  const updateLine = useCallback((index, patch) => {
    setLines((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const nextPatch = { ...patch };
        if ('unit_price' in nextPatch) {
          nextPatch.unit_price = sanitizeDecimalInput(nextPatch.unit_price, { maxDecimals: 2 });
        }
        if ('quantity' in nextPatch) {
          nextPatch.quantity = sanitizeIntegerInput(nextPatch.quantity);
        }
        const next = { ...row, ...nextPatch };
        if ('unit_price' in patch) next.price_overridden = isPriceOverridden(next);
        return next;
      }),
    );
  }, []);

  const updateLineDiscountPercent = useCallback((index, value) => {
    setLines((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, discount: sanitizeDecimalInput(value, { maxDecimals: 2 }), discount_type: 'percent' }
          : row,
      ),
    );
  }, []);

  const updateLineDiscountAmount = useCallback((index, value) => {
    setLines((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, discount: value, discount_type: 'fixed' } : row,
      ),
    );
  }, []);

  const resolveRowIndex = useCallback(
    (preferredIdx, activeElement = document.activeElement) => {
      const active = activeElement;
      const fromQty = active?.getAttribute?.('data-dispense-qty');
      const fromPrice = active?.getAttribute?.('data-dispense-price');
      const fromDisc = active?.getAttribute?.('data-dispense-disc');
      const fromItem = active
        ?.closest?.('[data-dispense-item-search]')
        ?.getAttribute?.('data-dispense-item-search');
      const fromRow = active
        ?.closest?.('[data-dispense-row]')
        ?.getAttribute?.('data-dispense-row');
      const parsed = Number(fromQty ?? fromPrice ?? fromDisc ?? fromItem ?? fromRow);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= maxCartRowIndex) return parsed;

      if (cartFocus >= 0 && cartFocus <= maxCartRowIndex) return cartFocus;

      if (Number.isFinite(preferredIdx) && preferredIdx >= 0 && preferredIdx <= maxCartRowIndex) {
        return preferredIdx;
      }

      return lines.length > 0 ? lines.length - 1 : 0;
    },
    [cartFocus, lines.length, maxCartRowIndex],
  );

  const focusCartRowField = useCallback((rowIndex, field = 'item') => {
    requestAnimationFrame(() => {
      if (field === 'qty') {
        document.querySelector(`[data-dispense-qty="${rowIndex}"]`)?.focus?.({ preventScroll: true });
        return;
      }
      if (field === 'price') {
        document.querySelector(`[data-dispense-price="${rowIndex}"]`)?.focus?.({ preventScroll: true });
        return;
      }
      if (field === 'disc') {
        document.querySelector(`[data-dispense-disc="${rowIndex}"]`)?.focus?.({ preventScroll: true });
        return;
      }
      const cell = document.querySelector(`[data-dispense-item-search="${rowIndex}"]`);
      const input = cell?.querySelector?.('input');
      const button = cell?.querySelector?.('button');
      const target = input || button;
      target?.focus?.({ preventScroll: true });
      input?.select?.();
    });
  }, []);

  const deleteRowAt = useCallback(
    (preferredIdx, activeElement = document.activeElement) => {
      const idx = resolveRowIndex(preferredIdx, activeElement);
      if (idx < 0) return;

      if (idx >= lines.length) {
        if (lines.length === 0) {
          window.dispatchEvent(
            new CustomEvent('pharmacy:clear-item-row', {
              detail: { rowIndex: idx, restoreFocus: false },
            }),
          );
          return;
        }
        window.dispatchEvent(
          new CustomEvent('pharmacy:clear-item-row', {
            detail: { rowIndex: idx, restoreFocus: false },
          }),
        );
        setEntryRowVisible(false);
        const prev = lines.length - 1;
        setCartFocus(prev);
        focusCartRowField(prev, 'item');
        return;
      }

      if (lines.length <= 1) {
        setLines([]);
        setCartFocus(0);
        setEntryRowVisible(true);
        focusScan();
        return;
      }

      setLines((prev) => prev.filter((_, i) => i !== idx));
      const nextFocus = Math.min(idx, lines.length - 2);
      setCartFocus(nextFocus);
      focusCartRowField(nextFocus, 'item');
    },
    [focusCartRowField, focusScan, lines.length, resolveRowIndex],
  );

  const removeLine = deleteRowAt;

  const clearCart = useCallback(() => {
    setLines([]);
    setCartFocus(0);
    setEntryRowVisible(true);
    setCashAmount('');
    setInvoiceDiscountAmount('');
    setInvoiceDiscountPercent('');
    setInvoiceDiscountType('fixed');
    setPaymentExpanded(false);
    setActiveHoldId(null);
    setRxNote('');
    void PosOfflineStore.clearPharmacyCart();
    focusScan();
  }, [focusScan]);

  const openPaymentRail = useCallback(() => {
    if (!lines.length) {
      toast.error('Cart is empty');
      return;
    }
    const offlineCheckout = !online && offlineSyncEnabled;
    if (!shift?.id && !offlineCheckout) {
      toast.error('Open a shift first');
      setShiftOpen(true);
      return;
    }
    if (offlineCheckout) {
      toast.message('Offline checkout saves a draft — payment posts after sync');
    }
    setCashAmount(String(totals.total.toFixed(2)));
    setPaymentExpanded(true);
    focusTender();
  }, [lines.length, offlineSyncEnabled, online, shift?.id, totals.total, focusTender]);

  const openShift = useCallback(
    async ({ opening_cash, opening_notes } = {}) => {
      try {
        const data = unwrap(
          await posApi.openShift({
            terminal_id: bootstrap?.terminal?.id,
            opening_cash: opening_cash ?? (Number(openingFloat) || 0),
            opening_notes: opening_notes ?? '',
          }),
        );
        setBootstrap((b) => (b ? { ...b, shift: data } : b));
        setShiftOpen(false);
        toast.success('Shift opened');
        focusScan();
      } catch (e) {
        const msg = errMsg(e, 'Could not open shift');
        if (/already open/i.test(msg)) {
          const data = await reloadBootstrap();
          if (data?.shift?.id) {
            setShiftOpen(false);
            toast.info('Shift is already open on this register');
            focusScan();
            return;
          }
        }
        toast.error(msg);
      }
    },
    [bootstrap?.terminal?.id, openingFloat, reloadBootstrap, focusScan],
  );

  const closeShift = useCallback(
    async ({ closing_cash = 0, closing_notes = '' } = {}) => {
      if (!shift?.id) return null;
      try {
        const data = unwrap(
          await posApi.closeShift(shift.id, { closing_cash, closing_notes }),
        );
        setBootstrap((b) => (b ? { ...b, shift: null } : b));
        setXReport(null);
        setShiftOpen(true);
        toast.success('Shift closed');
        return data;
      } catch (e) {
        toast.error(errMsg(e, 'Could not close shift'));
        return null;
      }
    },
    [shift?.id],
  );

  const loadXReport = useCallback(async () => {
    if (!shift?.id) return;
    try {
      const data = unwrap(await posApi.xReport(shift.id));
      setXReport(data);
    } catch (e) {
      toast.error(errMsg(e, 'Could not load X report'));
    }
  }, [shift?.id]);

  const loadShiftHistory = useCallback(async () => {
    try {
      const data = unwrap(await posApi.shiftHistory()) || [];
      setShiftHistory(Array.isArray(data) ? data : []);
    } catch {
      setShiftHistory([]);
    }
  }, []);

  const saveSale = useCallback(async () => {
    if (!lines.length) {
      toast.error('Nothing to save');
      return;
    }
    try {
      await posApi.holds.create({
        customer_id: customer?.id || null,
        currency,
        invoice_discount: invoiceDiscountNum,
        cart_payload: {
          lines,
          invoice_discount: invoiceDiscountNum,
          invoice_discount_type: invoiceDiscountType,
          invoice_discount_amount: invoiceDiscountAmount,
          invoice_discount_percent: invoiceDiscountPercent,
        },
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total: totals.total,
      });
      toast.success('Sale saved — recall anytime');
      clearCart();
      refreshHolds();
    } catch (e) {
      toast.error(errMsg(e, 'Could not save'));
    }
  }, [
    lines,
    customer,
    currency,
    invoiceDiscountNum,
    invoiceDiscountType,
    invoiceDiscountAmount,
    invoiceDiscountPercent,
    totals,
    clearCart,
    refreshHolds,
  ]);

  const resumeHold = useCallback(
    async (holdId) => {
      try {
        const data = unwrap(await posApi.holds.show(holdId));
        const cart = data?.cart_payload || {};
        setLines(Array.isArray(cart.lines) ? cart.lines : []);
        setEntryRowVisible(false);
        const discType = cart.invoice_discount_type || 'fixed';
        setInvoiceDiscountType(discType);
        if (cart.invoice_discount_amount != null || cart.invoice_discount_percent != null) {
          setInvoiceDiscountAmount(String(cart.invoice_discount_amount ?? ''));
          setInvoiceDiscountPercent(String(cart.invoice_discount_percent ?? ''));
        } else {
          const legacy = String(cart.invoice_discount_raw ?? cart.invoice_discount ?? '');
          if (discType === 'percent') {
            setInvoiceDiscountPercent(legacy);
            setInvoiceDiscountAmount('');
          } else {
            setInvoiceDiscountAmount(legacy);
            setInvoiceDiscountPercent('');
          }
        }
        if (data?.customer) applyCustomerSelection(data.customer);
        setActiveHoldId(data?.id || holdId);
        setHoldPanelOpen(false);
        toast.success(`Loaded ${data?.hold_number || 'saved sale'}`);
        if (cart.lines?.length) focusQty(0);
      } catch (e) {
        toast.error(errMsg(e, 'Could not recall'));
      }
    },
    [applyCustomerSelection, focusQty],
  );

  const discardHold = useCallback(
    async (holdId) => {
      try {
        await posApi.holds.destroy(holdId);
        refreshHolds();
        toast.success('Saved sale removed');
      } catch (e) {
        toast.error(errMsg(e, 'Could not remove'));
      }
    },
    [refreshHolds],
  );

  const postCheckout = useCallback(
    async ({ allowCredit = false, payments = null, printReceipt: shouldPrint = false } = {}) => {
      if (checkoutLock.current || checkingOut) return false;
      if (!customer?.id) {
        toast.error('Select a customer');
        setCustomerOpen(true);
        return false;
      }
      if (allowCredit && !permissions.can_credit_sale) {
        toast.error('Credit sales not permitted');
        return false;
      }
      if (allowCredit && !online) {
        toast.error('Unpaid / credit sales require a connection');
        return false;
      }
      if (needsRxNote && !String(rxNote || '').trim()) {
        toast.error('Prescription note is required for Rx medicines in this cart');
        return false;
      }

      const offlineCheckout = !online && offlineSyncEnabled;

      if (!offlineCheckout) {
        if (!shift?.id) {
          setShiftOpen(true);
          return false;
        }

        const staleLines = lines.filter(
          (l) => l.product_id && !isProductInPharmacyCatalog(l.product_id),
        );
        if (staleLines.length) {
          const names = staleLines.map((l) => l.name || 'Item').slice(0, 2).join(', ');
          toast.error(
            `Catalog out of date for ${names}. Refreshing medicine list — re-add those lines and try again.`,
            { duration: 6000 },
          );
          void reloadPharmacyCatalog({ warehouseId });
          return false;
        }
      }

      checkoutLock.current = true;
      setCheckingOut(true);
      try {
        if (offlineCheckout) {
          if (!companyId) {
            toast.error('Workspace not found');
            return false;
          }
          await saveDocumentDraft({
            companyId,
            entity: 'pos',
            op: 'checkout',
            offlineSyncEnabled: true,
            forceOffline: true,
            payload: {
              customer_id: customer.id,
              invoice_discount: invoiceDiscountNum,
              invoice_date: new Date().toISOString().slice(0, 10),
              due_date: new Date().toISOString().slice(0, 10),
              warehouse_id: warehouseId ? Number(warehouseId) : undefined,
              lines: toCheckoutLines(lines),
              rx_note: needsRxNote ? String(rxNote).trim() : undefined,
              skip_approval: true,
              document_source: 'pos_offline',
            },
          });
          setPaymentExpanded(false);
          setPayDialogOpen(false);
          clearCart();
          focusScan();
          toast.success('Sale saved offline — sync when online to post invoice and payment');
          return { offline: true };
        }

        const resolvedPayments =
          payments ??
          (allowCredit
            ? []
            : [{ method: 'cash', amount: money(cashAmount), reference: null }]);

        const payload = {
          customer_id: customer.id,
          shift_id: shift.id,
          allow_credit: allowCredit,
          invoice_discount: invoiceDiscountNum,
          hold_id: activeHoldId || undefined,
          lines: toCheckoutLines(lines),
          rx_note: needsRxNote ? String(rxNote).trim() : undefined,
          payments: resolvedPayments,
          warehouse_id: warehouseId || undefined,
        };

        if (!allowCredit) {
          const tender = resolvedPayments.reduce((sum, p) => sum + money(p.amount), 0);
          const due = money(totals.total);
          if (tender + 0.009 < due) {
            toast.error(`Payment incomplete — due ${formatMoney(due, currency)}`);
            focusTender();
            return false;
          }
        }

        const data = unwrap(await posApi.checkout(payload));
        const soldProductIds = lines.map((l) => l.product_id).filter(Boolean);
        const printAfterPost = shouldPrint
          ? buildCheckoutThermalProps(data, bootstrap, currency)
          : null;

        setPaymentExpanded(false);
        setPayDialogOpen(false);
        clearCart();
        checkoutLock.current = false;
        setCheckingOut(false);
        focusScan();

        toast.success(
          data?.receipt?.invoice_number
            ? allowCredit
              ? `Unpaid ${data.receipt.invoice_number} · added to ${customer?.name || 'customer'} balance`
              : `Invoice ${data.receipt.invoice_number} posted`
            : allowCredit
              ? 'Unpaid sale posted to customer balance'
              : 'Sale posted',
        );
        if (allowCredit && customer?.id) {
          const added = money(totals.total);
          setCustomer((prev) => {
            if (!prev?.id || String(prev.id) !== String(customer.id)) return prev;
            const prevDue = Number(prev.balance_due ?? prev.outstanding_balance ?? 0);
            const nextDue = money(prevDue + added);
            return { ...prev, balance_due: nextDue, outstanding_balance: nextDue };
          });
          void loadCustomerInvoices(customer.id);
        }
        void refreshMedicineStockByIds(soldProductIds, warehouseId);

        if (printAfterPost) {
          void printPosReceipt({
            thermalProps: printAfterPost,
            paper: getReceiptPaper(),
            openDrawer: true,
          }).then((result) => {
            if (result?.reason === 'print_in_progress') return;
            if (result?.silent) {
              toast.success('Receipt sent to printer');
            } else if (result?.ok !== false) {
              maybeHintBrowserPrintSetup();
            }
          });
        }

        return data;
      } catch (e) {
        if (isStaleProductIdError(e)) {
          toast.error(
            'This medicine is no longer in the server catalog (stale till cache). Refreshing list — clear the cart, re-add the item, and try again.',
            { duration: 7000 },
          );
          void reloadPharmacyCatalog({ warehouseId });
        } else {
          toast.error(errMsg(e, allowCredit ? 'Credit sale failed' : 'Checkout failed'));
        }
        focusScan();
        return false;
      } finally {
        checkoutLock.current = false;
        setCheckingOut(false);
      }
    },
    [
      activeHoldId,
      cashAmount,
      bootstrap,
      checkingOut,
      clearCart,
      companyId,
      currency,
      customer,
      focusScan,
      focusTender,
      invoiceDiscountNum,
      lines,
      loadCustomerInvoices,
      needsRxNote,
      offlineSyncEnabled,
      online,
      permissions.can_credit_sale,
      rxNote,
      shift,
      totals.total,
      warehouseId,
    ],
  );

  const checkout = useCallback(() => postCheckout({ allowCredit: false }), [postCheckout]);

  const checkoutCredit = useCallback(
    () => {
      if (customer?.is_walk_in || customer?.id === walkInRef.current?.id) {
        toast.error('Select a customer for credit sale');
        setCustomerOpen(true);
        return;
      }
      postCheckout({ allowCredit: true, payments: [] });
    },
    [postCheckout, customer],
  );

  const completeSale = useCallback(() => {
    if (paymentExpanded) checkout();
    else openPaymentRail();
  }, [checkout, openPaymentRail, paymentExpanded]);

  const validateCheckout = useCallback(() => {
    if (!lines.length) {
      toast.error('Cart is empty');
      return false;
    }
    if (!customer?.id) {
      toast.error('Select a customer');
      setCustomerOpen(true);
      return false;
    }
    const offlineCheckout = !online && offlineSyncEnabled;
    if (!shift?.id && !offlineCheckout) {
      toast.error('Open a shift first');
      setShiftOpen(true);
      return false;
    }
    if (needsRxNote && !String(rxNote || '').trim()) {
      toast.error('Prescription note is required for Rx medicines in this cart');
      return false;
    }
    if (offlineCheckout) {
      toast.message('Offline checkout saves a draft — invoice posts after sync');
    }
    return true;
  }, [customer?.id, lines.length, needsRxNote, offlineSyncEnabled, online, rxNote, shift?.id]);

  /** Open cash tender dialog — discount, tender, then post. */
  const openPayDialog = useCallback(
    ({ print = false } = {}) => {
      if (!validateCheckout()) return;
      setPayDialogPrint(print);
      setPayDialogOpen(true);
    },
    [validateCheckout],
  );

  /** Ctrl+P / Complete & print — open pay dialog (print after post). */
  const completeAndPrint = useCallback(() => {
    openPayDialog({ print: true });
  }, [openPayDialog]);

  const confirmPayDialog = useCallback(
    async (tenderAmount) => {
      const tender = roundWholeRupee(tenderAmount);
      const due = roundWholeRupee(totals.total);
      if (tender < due) {
        toast.error(
          `Paid amount must be at least ${formatPharmacyPosMoney((n) => formatMoney(n, currency), due)}`,
        );
        return false;
      }
      setPayDialogOpen(false);
      setCashAmount(String(tender));
      return postCheckout({
        allowCredit: false,
        printReceipt: payDialogPrint,
        payments: [{ method: 'cash', amount: tender, reference: null }],
      });
    },
    [currency, payDialogPrint, postCheckout, totals.total],
  );

  const confirmUnpaidPayDialog = useCallback(async () => {
    if (customer?.is_walk_in || customer?.id === walkInRef.current?.id) {
      toast.error('Select a named customer to put this sale on unpaid balance');
      setCustomerOpen(true);
      return false;
    }
    if (!permissions.can_credit_sale) {
      toast.error('Unpaid / credit sales are not permitted on this till');
      return false;
    }
    setPayDialogOpen(false);
    return postCheckout({
      allowCredit: true,
      payments: [],
      printReceipt: payDialogPrint,
    });
  }, [customer, payDialogPrint, permissions.can_credit_sale, postCheckout]);

  const openMedicineSheetForRow = useCallback((rowIndex) => {
    setCartFocus(rowIndex);
    const tryOpen = (attempt = 0) => {
      requestAnimationFrame(() => {
        const cell = document.querySelector(`[data-dispense-item-search="${rowIndex}"]`);
        const input = cell?.querySelector('input');
        const button = cell?.querySelector('button[type="button"]');
        if (!cell && attempt < 12) {
          tryOpen(attempt + 1);
          return;
        }
        (input || button)?.focus({ preventScroll: true });
        window.dispatchEvent(
          new CustomEvent('pharmacy:open-medicine-sheet', { detail: { rowIndex } }),
        );
      });
    };
    tryOpen();
  }, []);

  const openMedicineList = useCallback(
    (preferredIdx, activeElement = document.activeElement) => {
      const rowIndex = resolveRowIndex(preferredIdx, activeElement);
      if (rowIndex >= lines.length) {
        showEntryRow({ openSheet: true });
        return;
      }
      openMedicineSheetForRow(rowIndex);
    },
    [lines.length, openMedicineSheetForRow, resolveRowIndex, showEntryRow],
  );

  const searchCustomers = useCallback(async (q) => {
    const res = await customersApi.list({ search: q || undefined, per_page: 20 });
    const data = res?.data?.data ?? res?.data;
    return Array.isArray(data) ? data : data?.data || [];
  }, []);

  const createQuickCustomer = useCallback(
    async (form) => {
      const row = unwrap(await posApi.quickCustomer(form));
      if (row?.id) {
        applyCustomerSelection(row);
        setCustomerOpen(false);
        toast.success(`Customer “${row.name}” selected`);
        loadCustomerInvoices(row.id);
      }
      return row;
    },
    [applyCustomerSelection, loadCustomerInvoices],
  );

  const selectCustomer = useCallback(
    (row) => {
      applyCustomerSelection(row);
      setCustomerOpen(false);
      loadCustomerInvoices(row?.id);
      focusScanRef.current();
    },
    [applyCustomerSelection, loadCustomerInvoices],
  );

  const unlockManager = useCallback(async ({ email, password }) => {
    const data = unwrap(await posApi.managerUnlock({ email, password }));
    setManagerUnlock(data);
    setManagerOpen(false);
    toast.success(`Unlocked by ${data.manager_name}`);
    return data;
  }, []);

  const keysRef = useRef({});
  keysRef.current = {
    cartFocus,
    checkout,
    checkoutCredit,
    clearCart,
    completeSale,
    customerOpen,
    focusScan,
    holdPanelOpen,
    paymentExpanded,
    pickSheetOpen,
    payDialogOpen,
    returnOpen,
    managerOpen,
    openPayDialog,
    completeAndPrint,
    openMedicineList,
    refreshHolds,
    deleteRowAt,
    saveSale,
    maxCartRowIndex,
  };

  useEffect(() => {
    const onKey = (e) => {
      const {
        cartFocus,
        checkout,
        checkoutCredit,
        clearCart,
        completeSale,
        customerOpen,
        focusScan,
        holdPanelOpen,
        paymentExpanded,
        pickSheetOpen,
        payDialogOpen,
        returnOpen,
        managerOpen,
        openPayDialog,
        completeAndPrint,
        openMedicineList,
        refreshHolds,
        deleteRowAt,
        saveSale,
        maxCartRowIndex,
      } = keysRef.current;
      if (e.key === 'F7') {
        e.preventDefault();
        e.stopPropagation();
        if (managerOpen || payDialogOpen || pickSheetOpen) return;
        setReturnOpen((open) => !open);
        return;
      }

      if (returnOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          if (document.querySelector('[data-pharmacy-pick-sheet][data-state="open"]')) {
            window.dispatchEvent(
              new CustomEvent('pharmacy:close-medicine-sheet', {
                detail: { restoreFocus: true },
              }),
            );
            return;
          }
          setReturnOpen(false);
          return;
        }
        return;
      }

      if (managerOpen) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = String(e.key || '').toLowerCase();
      const code = e.code || '';

      if (mod && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        openPayDialog({ print: false });
        return;
      }
      if (mod && (key === 'p' || code === 'KeyP')) {
        e.preventDefault();
        e.stopPropagation();
        if (payDialogOpen) return;
        completeAndPrint();
        return;
      }
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (payDialogOpen) return;
        completeAndPrint();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        // Leave Ctrl+C for copy. Unpaid is F8 inside the pay dialog.
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        e.stopPropagation();
        deleteRowAt(undefined, e.target);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        focusScan();
        return;
      }

      if (e.key === 'Escape') {
        if (payDialogOpen) {
          setPayDialogOpen(false);
          return;
        }
        if (document.querySelector('[data-pharmacy-pick-sheet][data-state="open"]')) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('pharmacy:close-medicine-sheet', {
              detail: { restoreFocus: !isTypingTarget(e.target) },
            }),
          );
          return;
        }
      }

      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        e.key.toLowerCase() === 'c'
      ) {
        e.preventDefault();
        setCustomerOpen(true);
        return;
      }

      if (e.key === 'F4') {
        e.preventDefault();
        openMedicineList(undefined, e.target);
        return;
      }

      if (isTypingTarget(e.target)) return;

      if (pickSheetOpen || customerOpen || payDialogOpen || returnOpen || managerOpen) return;

      if (e.key === 'F1') {
        e.preventDefault();
        saveSale();
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        refreshHolds();
        setHoldPanelOpen(true);
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        focusScan();
        return;
      }
      if (
        e.key === '4' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        openMedicineList(undefined, e.target);
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        openPayDialog({ print: false });
        return;
      }
      if (e.key === 'F10') {
        e.preventDefault();
        clearCart();
        return;
      }
      if (e.key === 'Escape') {
        if (paymentExpanded) {
          setPaymentExpanded(false);
          focusScan();
        } else if (holdPanelOpen) setHoldPanelOpen(false);
        else if (customerOpen) setCustomerOpen(false);
        return;
      }

      if (e.key === '+' || e.key === '=') {
        if (cartFocus >= 0) {
          e.preventDefault();
          setLines((prev) =>
            prev.map((l, i) =>
              i === cartFocus ? { ...l, quantity: (Number(l.quantity) || 0) + 1 } : l,
            ),
          );
        }
      }
      if (e.key === '-' || e.key === '_') {
        if (cartFocus >= 0) {
          e.preventDefault();
          setLines((prev) =>
            prev.map((l, i) =>
              i === cartFocus
                ? { ...l, quantity: Math.max(1, (Number(l.quantity) || 1) - 1) }
                : l,
            ),
          );
        }
      }
      if (e.key === 'Delete' && cartFocus >= 0) {
        e.preventDefault();
        deleteRowAt(undefined, e.target);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCartFocus((i) => Math.min((i < 0 ? -1 : i) + 1, maxCartRowIndex));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCartFocus((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return {
    companyId,
    bootLoading,
    bootstrap,
    online,
    offlineSyncEnabled,
    canCheckoutOffline: !online && offlineSyncEnabled,
    customer,
    setCustomer,
    customerInvoices,
    invoicesLoading,
    shift,
    lines,
    cartFocus,
    setCartFocus,
    entryRowVisible,
    showEntryRow,
    maxCartRowIndex,
    totals,
    currency,
    unitLabel,
    taxRatesById,
    permissions,
    scanRef,
    tenderRef,
    invoiceDiscRef,
    focusScan,
    addProduct,
    getAvailableStock,
    warehouseId,
    setLineProduct,
    scanOrSearch,
    pickSheetOpen,
    setPickSheetOpen,
    pickSheetRows,
    pickSearchTerm,
    openPickSheet,
    pickProduct,
    updateLine,
    updateLineDiscountPercent,
    updateLineDiscountAmount,
    deleteRowAt,
    removeLine,
    clearCart,
    paymentExpanded,
    openPaymentRail,
    cashAmount,
    setCashAmount,
    changeDue,
    checkout,
    checkoutCredit,
    completeSale,
    saveSale,
    checkingOut,
    shiftOpen,
    setShiftOpen,
    openingFloat,
    setOpeningFloat,
    openShift,
    closeShift,
    loadXReport,
    loadShiftHistory,
    xReport,
    shiftHistory,
    invoiceDiscountAmount,
    setInvoiceDiscountAmount,
    invoiceDiscountPercent,
    setInvoiceDiscountPercent,
    invoiceDiscountType,
    setInvoiceDiscountType,
    holds,
    holdPanelOpen,
    setHoldPanelOpen,
    resumeHold,
    discardHold,
    refreshHolds,
    customerOpen,
    setCustomerOpen,
    searchCustomers,
    createQuickCustomer,
    selectCustomer,
    needsRxNote,
    rxNote,
    setRxNote,
    openPayDialog,
    completeAndPrint,
    confirmPayDialog,
    confirmUnpaidPayDialog,
    payDialogOpen,
    setPayDialogOpen,
    payDialogPrint,
    openMedicineList,
    walkIn: walkInRef.current,
    formatMoney: (v) => formatPharmacyPosMoney((n) => formatMoney(n, currency), v),
    returnOpen,
    setReturnOpen,
    managerOpen,
    setManagerOpen,
    managerActive,
    unlockManager,
  };
}
