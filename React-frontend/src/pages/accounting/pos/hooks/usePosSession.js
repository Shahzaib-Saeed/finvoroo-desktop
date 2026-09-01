import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { releaseModalPointerLockSoon } from '@/lib/modal-lock';
import { customersApi } from '@/pages/accounting/customers/api/customers.api';
import { posApi } from '../api/pos.api';
import {
  FAVORITES_KEY,
  RECENT_KEY,
  loadIdSet,
  lookupCachedBarcode,
  pushRecent,
  rememberBarcode,
  saveIdSet,
} from '../constants';
import {
  computeCartTotals,
  createCartLine,
  formatMoney,
  money,
  toCheckoutLines,
} from '../lib/cart-math';
import { PosHardwareBridge } from '../lib/hardware-bridge';
import { printPosReceipt } from '@/lib/print-pos-receipt';
import { getReceiptPaper } from '@/lib/print-agent';
import { PosOfflineStore } from '../lib/offline-store';
import {
  eventMatchesShortcut,
  loadPosSettings,
  loadShortcuts,
  savePosSettings,
} from '../lib/shortcuts';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function errMsg(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  const fromErrors = data?.errors
    ? Object.values(data.errors)
        .flat()
        .find((m) => typeof m === 'string' && m.trim())
    : null;
  return fromErrors || data?.message || err?.message || fallback;
}

function isTypingTarget(el) {
  if (!el) return false;
  if (el.closest?.('[data-pos-typing]')) return true;
  if (el.closest?.('[data-pos-no-scan]')) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function usePosSession() {
  const [bootLoading, setBootLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [bootstrap, setBootstrap] = useState(null);
  const [products, setProducts] = useState([]);
  const [catalogMeta, setCatalogMeta] = useState({ page: 1, last: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [railFilter, setRailFilter] = useState('all');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [customer, setCustomer] = useState(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [salesperson, setSalesperson] = useState('');
  const [lines, setLines] = useState([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState([{ method: 'cash', amount: '', reference: '' }]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [holds, setHolds] = useState([]);
  const [activeHoldId, setActiveHoldId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [favorites, setFavorites] = useState(() => loadIdSet(FAVORITES_KEY));
  const [recent, setRecent] = useState(() => loadIdSet(RECENT_KEY));
  const [allowCredit, setAllowCredit] = useState(false);
  const [gridFocus, setGridFocus] = useState(-1);
  const [cartFocus, setCartFocus] = useState(-1);
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [managerUnlock, setManagerUnlock] = useState(null);
  const [shortcuts, setShortcuts] = useState(() => loadShortcuts());
  const [posSettings, setPosSettings] = useState(() => loadPosSettings());
  const [shiftHistory, setShiftHistory] = useState([]);
  const [xReport, setXReport] = useState(null);

  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef(null);
  const searchRef = useRef(null);
  const barcodeRef = useRef(null);
  const cartPanelRef = useRef(null);
  const tenderRef = useRef(null);
  const checkoutLock = useRef(false);
  const focusBarcodeTimer = useRef(null);
  const cartHydrated = useRef(false);

  const taxRatesById = useMemo(() => {
    const map = {};
    for (const t of bootstrap?.tax_rates || []) map[String(t.id)] = t;
    return map;
  }, [bootstrap]);

  const currency = bootstrap?.company?.currency || 'USD';
  const permissions = bootstrap?.permissions || {};
  const shift = bootstrap?.shift || null;
  const maxDiscountPercent = bootstrap?.settings?.max_discount_percent ?? 20;

  const totals = useMemo(
    () => computeCartTotals(lines, invoiceDiscount, taxRatesById),
    [lines, invoiceDiscount, taxRatesById],
  );
  const paidAmount = useMemo(
    () => money(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)),
    [payments],
  );
  const remaining = money(Math.max(0, totals.total - paidAmount));
  const changeDue = money(Math.max(0, paidAmount - totals.total));
  const managerActive =
    managerUnlock &&
    (!managerUnlock.expires_at || new Date(managerUnlock.expires_at).getTime() > Date.now());

  const focusBarcode = useCallback((force = false) => {
    clearTimeout(focusBarcodeTimer.current);
    focusBarcodeTimer.current = setTimeout(() => {
      const el = barcodeRef.current;
      if (!el) return;
      if (!force && isTypingTarget(document.activeElement) && document.activeElement !== el) {
        return;
      }
      el.focus({ preventScroll: true });
      el.select?.();
    }, 30);
  }, []);

  const loadBootstrap = useCallback(async () => {
    setBootLoading(true);
    try {
      const data = unwrap(await posApi.bootstrap());
      setBootstrap(data);
      setCustomer(data?.walk_in_customer || null);
      const defaultWh =
        data?.terminal?.warehouse_id ||
        data?.warehouses?.find((w) => w.is_default)?.id ||
        data?.warehouses?.[0]?.id ||
        '';
      setWarehouseId(defaultWh ? String(defaultWh) : '');
      setSalesperson(data?.shift?.cashier || '');
      if (!data?.shift?.id) setShiftOpen(true);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to load POS'));
      const cache = await PosOfflineStore.loadCatalogCache();
      if (cache?.products?.length) setProducts(cache.products);
    } finally {
      setBootLoading(false);
      focusBarcode(true);
    }
  }, [focusBarcode]);

  const loadCatalog = useCallback(
    async ({ page = 1, append = false } = {}) => {
      if (!online && page > 1) return;
      setCatalogLoading(true);
      try {
        const params = {
          page,
          per_page: 72,
          search: debouncedSearch || undefined,
          category_id: categoryId || undefined,
          brand_id: brandId || undefined,
          low_stock: railFilter === 'low_stock' ? 1 : undefined,
        };
        if (railFilter === 'favorites') {
          if (!favorites.size) {
            setProducts([]);
            setCatalogMeta({ page: 1, last: 1, total: 0 });
            setCatalogLoading(false);
            return;
          }
          params.ids = [...favorites].join(',');
        }
        if (railFilter === 'recent') {
          if (recent.size) {
            params.ids = [...recent].join(',');
          } else {
            const serverRecent = unwrap(await posApi.recentProducts({ limit: 40 })) || [];
            setProducts(Array.isArray(serverRecent) ? serverRecent : []);
            setCatalogMeta({ page: 1, last: 1, total: serverRecent.length || 0 });
            setCatalogLoading(false);
            return;
          }
        }
        const res = await posApi.catalog(params);
        let rows = unwrap(res) || [];
        if (!Array.isArray(rows)) rows = [];
        if (railFilter === 'recent') {
          const order = [...recent];
          rows = [...rows].sort(
            (a, b) => order.indexOf(String(a.id)) - order.indexOf(String(b.id)),
          );
        }
        setProducts((prev) => (append ? [...prev, ...rows] : rows));
        setCatalogMeta({
          page: res?.data?.meta?.current_page || page,
          last: res?.data?.meta?.last_page || 1,
          total: res?.data?.meta?.total || rows.length,
        });
        if (page === 1 && !debouncedSearch) {
          PosOfflineStore.saveCatalogCache(rows);
        }
      } catch (e) {
        if (!append) {
          const cache = await PosOfflineStore.loadCatalogCache();
          if (cache?.products?.length) {
            setProducts(cache.products);
            toast.message('Showing cached catalog (offline)');
          } else {
            toast.error(errMsg(e, 'Failed to load products'));
          }
        } else {
          toast.error(errMsg(e, 'Failed to load products'));
        }
      } finally {
        setCatalogLoading(false);
      }
    },
    [debouncedSearch, categoryId, brandId, railFilter, favorites, recent, online],
  );

  const refreshHolds = useCallback(async () => {
    try {
      const data = unwrap(await posApi.holds.list()) || [];
      const local = await PosOfflineStore.listLocalHolds();
      setHolds([
        ...(Array.isArray(data) ? data : []),
        ...local.map((h) => ({ ...h, id: h.id || h.client_uuid, local: true })),
      ]);
    } catch {
      const local = await PosOfflineStore.listLocalHolds();
      setHolds(local.map((h) => ({ ...h, id: h.client_uuid, local: true })));
    }
  }, []);

  const syncLocalHolds = useCallback(async () => {
    const local = await PosOfflineStore.listLocalHolds();
    for (const hold of local) {
      try {
        await posApi.holds.create({
          client_uuid: hold.client_uuid,
          label: hold.label,
          customer_id: hold.customer_id,
          warehouse_id: hold.warehouse_id,
          salesperson: hold.salesperson,
          currency: hold.currency,
          invoice_discount: hold.invoice_discount,
          notes: hold.notes,
          cart_payload: hold.cart_payload,
          subtotal: hold.subtotal,
          tax_total: hold.tax_total,
          total: hold.total,
        });
        await PosOfflineStore.removeLocalHold(hold.client_uuid);
      } catch {
        /* keep local until next reconnect */
      }
    }
    refreshHolds();
  }, [refreshHolds]);

  useEffect(() => {
    loadBootstrap();
    refreshHolds();
  }, [loadBootstrap, refreshHolds]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 160);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!bootLoading) loadCatalog({ page: 1 });
  }, [bootLoading, loadCatalog]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      toast.success('Back online');
      syncLocalHolds();
      loadBootstrap();
    };
    const onOffline = () => {
      setOnline(false);
      toast.message('You are offline — cart & holds work; checkout saves a draft invoice to sync later');
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
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(beat);
    };
  }, [syncLocalHolds, loadBootstrap]);

  // Restore cart from IndexedDB
  useEffect(() => {
    if (cartHydrated.current) return;
    cartHydrated.current = true;
    (async () => {
      const saved = await PosOfflineStore.loadCart();
      if (!saved?.lines?.length) return;
      setLines(saved.lines);
      if (saved.notes) setNotes(saved.notes);
      if (saved.invoiceDiscount != null) setInvoiceDiscount(saved.invoiceDiscount);
      if (saved.customer) setCustomer(saved.customer);
      if (saved.warehouseId) setWarehouseId(String(saved.warehouseId));
    })();
  }, []);

  // Persist cart
  useEffect(() => {
    if (bootLoading) return;
    PosOfflineStore.saveCart({
      lines,
      notes,
      invoiceDiscount,
      customer,
      warehouseId,
      salesperson,
    });
    PosHardwareBridge.showCustomerDisplay({
      lines: lines.map((l) => ({ name: l.name, qty: l.quantity, price: l.unit_price })),
      total: totals.total,
      currency,
    });
  }, [lines, notes, invoiceDiscount, customer, warehouseId, salesperson, totals.total, currency, bootLoading]);

  const addProduct = useCallback(
    (product, qty = 1) => {
      if (!product?.id) return;
      setLines((prev) => {
        const idx = prev.findIndex((l) => String(l.product_id) === String(product.id));
        if (idx >= 0) {
          const next = [...prev];
          const newQty = (Number(next[idx].quantity) || 0) + qty;
          if (
            next[idx].track_inventory &&
            next[idx].stock > 0 &&
            newQty > next[idx].stock
          ) {
            toast.message(`Stock warning: only ${next[idx].stock} available`);
          }
          next[idx] = { ...next[idx], quantity: newQty };
          setCartFocus(idx);
          return next;
        }
        const line = createCartLine(product, qty);
        setCartFocus(prev.length);
        return [...prev, line];
      });
      pushRecent(product.id);
      setRecent(loadIdSet(RECENT_KEY));
      if (product.barcode) rememberBarcode(product.barcode, product);
      if (product.sku) rememberBarcode(product.sku, product);
      focusBarcode(true);
    },
    [focusBarcode],
  );

  const scanBarcode = useCallback(
    async (code) => {
      const value = String(code || '').trim();
      if (!value) return;
      const cached = lookupCachedBarcode(value);
      if (cached?.id && !online) {
        addProduct(cached, 1);
        toast.success(`Added ${cached.name} (cached)`);
        focusBarcode(true);
        return;
      }
      try {
        const product = unwrap(await posApi.barcode(value));
        if (product) {
          addProduct(product, 1);
          rememberBarcode(value, product);
          const warnings = Array.isArray(product.pharmacy_warnings)
            ? product.pharmacy_warnings
            : [];
          if (warnings.length) {
            warnings.forEach((w) => toast.warning(w));
          } else {
            toast.success(`Added ${product.name}`);
          }
          focusBarcode(true);
          return;
        }
      } catch {
        /* fall through */
      }
      if (cached?.id) {
        addProduct(cached, 1);
        toast.success(`Added ${cached.name}`);
        focusBarcode(true);
        return;
      }
      try {
        const res = await posApi.catalog({ search: value, per_page: 8 });
        const rows = unwrap(res) || [];
        const exact = rows.find(
          (p) =>
            String(p.barcode || '').toLowerCase() === value.toLowerCase() ||
            String(p.sku || '').toLowerCase() === value.toLowerCase(),
        );
        if (exact) {
          addProduct(exact, 1);
          toast.success(`Added ${exact.name}`);
        } else if (rows.length === 1) {
          addProduct(rows[0], 1);
          toast.success(`Added ${rows[0].name}`);
        } else if (rows.length > 1) {
          setSearch(value);
          setGridFocus(0);
          toast.message(`${rows.length} matches — use arrows + Enter`);
        } else {
          toast.error(`No product for “${value}”`);
        }
      } catch (e) {
        toast.error(errMsg(e, 'Barcode lookup failed'));
      }
      focusBarcode(true);
    },
    [addProduct, focusBarcode, online],
  );

  const updateLine = useCallback((key, patch) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const removeLine = useCallback(
    (key) => {
      if (!permissions.can_void && !managerActive) {
        setManagerOpen(true);
        toast.error('Removing a line requires void permission or manager unlock');
        return;
      }
      setLines((prev) => prev.filter((l) => l.key !== key));
      focusBarcode(true);
    },
    [permissions.can_void, managerActive, focusBarcode],
  );

  const clearCart = useCallback(() => {
    setLines([]);
    setInvoiceDiscount(0);
    setNotes('');
    setPayments([{ method: 'cash', amount: '', reference: '' }]);
    setActiveHoldId(null);
    setAllowCredit(false);
    setPaymentOpen(false);
    setCartFocus(-1);
    if (bootstrap?.walk_in_customer) setCustomer(bootstrap.walk_in_customer);
    PosOfflineStore.clearCart();
    focusBarcode(true);
  }, [bootstrap, focusBarcode]);

  const toggleFavorite = useCallback((productId) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      const id = String(productId);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveIdSet(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const searchCustomers = useCallback(async (q) => {
    const res = await customersApi.list({ search: q, per_page: 20 });
    const data = unwrap(res);
    return Array.isArray(data) ? data : data?.data || [];
  }, []);

  const createQuickCustomer = useCallback(async (payload) => {
    const customerRow = unwrap(await posApi.quickCustomer(payload));
    setCustomer(customerRow);
    setCustomerOpen(false);
    toast.success('Customer created');
    focusBarcode(true);
    return customerRow;
  }, [focusBarcode]);

  const holdSale = useCallback(
    async (label = '') => {
      if (!lines.length) {
        toast.error('Cart is empty');
        return;
      }
      const client_uuid =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `local-${Date.now()}`;
      const payload = {
        client_uuid,
        label: label || undefined,
        customer_id: customer?.id || null,
        warehouse_id: warehouseId || null,
        salesperson: salesperson || null,
        currency,
        invoice_discount: invoiceDiscount,
        notes: notes || null,
        cart_payload: { lines, notes, invoice_discount: invoiceDiscount },
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total: totals.total,
      };
      if (!online) {
        await PosOfflineStore.upsertLocalHold({
          ...payload,
          hold_number: `LOCAL-${Date.now().toString().slice(-6)}`,
          held_at: new Date().toISOString(),
        });
        toast.success('Held locally (will sync when online)');
        clearCart();
        refreshHolds();
        setHoldOpen(false);
        return;
      }
      try {
        const data = unwrap(await posApi.holds.create(payload));
        toast.success(`Held ${data?.hold_number || 'sale'}`);
        clearCart();
        refreshHolds();
        setHoldOpen(false);
      } catch (e) {
        toast.error(errMsg(e, 'Could not hold sale'));
      }
    },
    [
      lines,
      customer,
      warehouseId,
      salesperson,
      currency,
      invoiceDiscount,
      notes,
      totals,
      clearCart,
      refreshHolds,
      online,
    ],
  );

  const resumeHold = useCallback(
    async (holdId, holdRow) => {
      try {
        if (holdRow?.local || holdRow?.client_uuid) {
          const cart = holdRow.cart_payload || {};
          setLines(Array.isArray(cart.lines) ? cart.lines : []);
          setNotes(cart.notes || holdRow.notes || '');
          setInvoiceDiscount(Number(cart.invoice_discount ?? holdRow.invoice_discount) || 0);
          setHoldOpen(false);
          toast.success('Resumed local hold');
          focusBarcode(true);
          return;
        }
        const data = unwrap(await posApi.holds.show(holdId));
        const cart = data?.cart_payload || {};
        setLines(Array.isArray(cart.lines) ? cart.lines : []);
        setNotes(cart.notes || data?.notes || '');
        setInvoiceDiscount(Number(cart.invoice_discount ?? data?.invoice_discount) || 0);
        setActiveHoldId(data?.id || holdId);
        if (data?.customer) setCustomer(data.customer);
        if (data?.warehouse_id) setWarehouseId(String(data.warehouse_id));
        if (data?.salesperson) setSalesperson(data.salesperson);
        setHoldOpen(false);
        toast.success(`Resumed ${data?.hold_number || 'hold'}`);
        focusBarcode(true);
      } catch (e) {
        toast.error(errMsg(e, 'Could not resume hold'));
      }
    },
    [focusBarcode],
  );

  const discardHold = useCallback(
    async (holdId, holdRow) => {
      try {
        if (holdRow?.local || holdRow?.client_uuid) {
          await PosOfflineStore.removeLocalHold(holdRow.client_uuid || holdId);
        } else {
          await posApi.holds.destroy(holdId);
        }
        refreshHolds();
        toast.success('Hold discarded');
      } catch (e) {
        toast.error(errMsg(e, 'Could not discard hold'));
      }
    },
    [refreshHolds],
  );

  const openPayment = useCallback(() => {
    if (!lines.length) {
      toast.error('Add products first');
      return;
    }
    // Offline: allow opening checkout — completeSale queues a draft invoice (no payment/GL).
    if (!online) {
      if (!customer?.id) {
        toast.error('Select a customer for offline draft checkout');
        return;
      }
      setPayments([{ method: 'cash', amount: String(totals.total || ''), reference: '' }]);
      setPaymentOpen(true);
      toast.message('Offline checkout saves a draft invoice — pay & post after sync');
      return;
    }
    if (!shift?.id) {
      toast.error('Open a shift first');
      setShiftOpen(true);
      return;
    }
    setPayments([{ method: 'cash', amount: String(totals.total || ''), reference: '' }]);
    setPaymentOpen(true);
  }, [lines.length, totals.total, online, shift, customer?.id]);

  const completeSale = useCallback(async () => {
    if (checkoutLock.current || checkingOut) return;
    if (!lines.length) {
      toast.error('Cart is empty');
      return;
    }
    if (!customer?.id) {
      toast.error('Select a customer');
      return;
    }
    if (!permissions.can_sell) {
      toast.error('You do not have permission to complete sales');
      return;
    }

    // Phase 3: offline POS → draft invoice outbox (no stock/GL/payment offline).
    if (!online) {
      const companyId =
        typeof window !== 'undefined'
          ? window.location.pathname.match(/^\/workspace\/(\d+)/)?.[1]
          : null;
      try {
        const { getMeta } = await import('@/offline/db');
        const { saveDocumentDraft } = await import('@/offline/documents-repository');
        const enabled = companyId
          ? Boolean(await getMeta(companyId, 'offline_sync_enabled', false))
          : false;
        if (!enabled) {
          toast.error('Checkout requires a connection');
          return;
        }
        checkoutLock.current = true;
        setCheckingOut(true);
        const checkoutLines = toCheckoutLines(lines);
        await saveDocumentDraft({
          companyId,
          entity: 'pos',
          op: 'checkout',
          offlineSyncEnabled: true,
          forceOffline: true,
          payload: {
            customer_id: customer.id,
            salesperson: salesperson || undefined,
            notes: notes || undefined,
            invoice_discount: invoiceDiscount || 0,
            invoice_date: new Date().toISOString().slice(0, 10),
            due_date: new Date().toISOString().slice(0, 10),
            warehouse_id: warehouseId ? Number(warehouseId) : undefined,
            lines: checkoutLines,
            skip_approval: true,
            document_source: 'pos_offline',
          },
        });
        await PosOfflineStore.clearCart();
        setLines([]);
        setPayments([]);
        setPaymentOpen(false);
        setActiveHoldId(null);
        toast.success('Sale saved offline as draft — sync to assign invoice number, then post/pay online');
      } catch (err) {
        toast.error(err?.message || 'Could not queue offline sale');
      } finally {
        checkoutLock.current = false;
        setCheckingOut(false);
      }
      return;
    }

    if (!shift?.id) {
      toast.error('Open a shift first');
      setShiftOpen(true);
      return;
    }
    if (!allowCredit && remaining > 0.009) {
      toast.error('Payment incomplete');
      setPaymentOpen(true);
      return;
    }

    const needsManager = lines.some((l) => {
      const disc = Number(l.discount) || 0;
      if (l.discount_type === 'percent' && disc > maxDiscountPercent) return true;
      const cost = Number(l.cost_price) || 0;
      const price = Number(l.unit_price) || 0;
      return cost > 0 && price < cost;
    });
    if (needsManager && !managerActive && !permissions.can_manager_unlock) {
      setManagerOpen(true);
      toast.message('Manager approval required for price/discount');
      return;
    }

    checkoutLock.current = true;
    setCheckingOut(true);
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `pos-${Date.now()}-${Math.random()}`;

    try {
      const checkoutLines = toCheckoutLines(lines);
      // Authoritative due amount from the same InvoiceWriteService math as posting.
      try {
        const quote = unwrap(
          await posApi.quote({
            lines: checkoutLines,
            invoice_discount: invoiceDiscount || 0,
          }),
        );
        if (quote?.total != null) {
          const serverDue = money(quote.total);
          const tendered = money(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
          if (!allowCredit && tendered + 0.009 < serverDue) {
            toast.error(`Payment incomplete. Due ${formatMoney(serverDue, currency)}`);
            setPaymentOpen(true);
            return;
          }
        }
      } catch {
        // Fall through — server re-validates on checkout.
      }

      const tender = payments
        .map((p) => ({
          method: p.method || 'cash',
          amount: Number(p.amount) || 0,
          reference: p.reference || null,
        }))
        .filter((p) => p.amount > 0);

      const unlockToken = managerUnlock?.unlock_token || managerUnlock?.token || null;

      // Idempotency-Key is opt-in: production CORS must allow it (see config/cors.php).
      // If sent while disallowed, the browser aborts with axios "Network Error".
      const useIdempotency = import.meta.env.VITE_POS_IDEMPOTENCY === '1';
      const data = unwrap(
        await posApi.checkout(
          {
            customer_id: customer.id,
            salesperson: salesperson || undefined,
            notes: notes || undefined,
            invoice_discount: invoiceDiscount || 0,
            allow_credit: allowCredit,
            hold_id: activeHoldId || undefined,
            shift_id: shift.id,
            warehouse_id: warehouseId ? Number(warehouseId) : undefined,
            manager_unlock_token: unlockToken || undefined,
            lines: checkoutLines,
            payments: tender,
          },
          useIdempotency ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
        ),
      );

      setReceipt(data);
      setPaymentOpen(false);
      clearCart();
      refreshHolds();
      if (posSettings.autoPrint) {
        const invoiceId = data?.invoice?.id || data?.receipt?.invoice_id || null;
        setTimeout(() => {
          printPosReceipt({
            elementId: 'pos-receipt-print',
            paper: getReceiptPaper(),
            invoiceId,
            openDrawer: false,
          });
        }, 200);
      }
      if (permissions.can_open_drawer) {
        PosHardwareBridge.openCashDrawer();
      }
      toast.success(
        data?.receipt?.invoice_number
          ? `Sale ${data.receipt.invoice_number} complete`
          : 'Sale complete',
      );
      setManagerUnlock(null);
    } catch (e) {
      toast.error(errMsg(e, 'Checkout failed'));
    } finally {
      checkoutLock.current = false;
      setCheckingOut(false);
      focusBarcode(true);
    }
  }, [
    checkingOut,
    online,
    shift,
    lines,
    customer,
    allowCredit,
    remaining,
    permissions,
    payments,
    salesperson,
    notes,
    invoiceDiscount,
    activeHoldId,
    warehouseId,
    managerActive,
    maxDiscountPercent,
    clearCart,
    refreshHolds,
    posSettings.autoPrint,
    focusBarcode,
  ]);

  const openShift = useCallback(
    async ({ opening_cash = 0, opening_notes = '' } = {}) => {
      try {
        const data = unwrap(
          await posApi.openShift({
            terminal_id: bootstrap?.terminal?.id,
            opening_cash,
            opening_notes,
          }),
        );
        setBootstrap((b) => (b ? { ...b, shift: data } : b));
        setShiftOpen(false);
        releaseModalPointerLockSoon();
        toast.success('Shift opened');
        focusBarcode(true);
      } catch (e) {
        toast.error(errMsg(e, 'Could not open shift'));
      }
    },
    [bootstrap?.terminal?.id, focusBarcode],
  );

  const closeShift = useCallback(
    async ({ closing_cash = 0, closing_notes = '' } = {}) => {
      if (!shift?.id) return null;
      try {
        const data = unwrap(
          await posApi.closeShift(shift.id, { closing_cash, closing_notes }),
        );
        setBootstrap((b) => (b ? { ...b, shift: null } : b));
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

  const unlockManager = useCallback(async ({ email, password }) => {
    const data = unwrap(await posApi.managerUnlock({ email, password }));
    setManagerUnlock(data);
    setManagerOpen(false);
    toast.success(`Unlocked by ${data.manager_name}`);
    return data;
  }, []);

  const updateSettings = useCallback((patch) => {
    setPosSettings((prev) => {
      const next = { ...prev, ...patch };
      savePosSettings(next);
      return next;
    });
  }, []);

  // Hotkeys
  useEffect(() => {
    const onKeyDown = (e) => {
      const dialogOpen =
        paymentOpen || customerOpen || holdOpen || returnOpen || shiftOpen || managerOpen || settingsOpen || receipt;

      if (eventMatchesShortcut(e, shortcuts.close) || e.key === 'Escape') {
        if (paymentOpen) setPaymentOpen(false);
        else if (customerOpen) setCustomerOpen(false);
        else if (holdOpen) setHoldOpen(false);
        else if (returnOpen) setReturnOpen(false);
        else if (managerOpen) setManagerOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
        else if (receipt) setReceipt(null);
        else if (gridFocus >= 0) setGridFocus(-1);
        else focusBarcode(true);
        return;
      }

      if (eventMatchesShortcut(e, shortcuts.customer)) {
        e.preventDefault();
        setCustomerOpen(true);
        return;
      }
      if (
        eventMatchesShortcut(e, shortcuts.search) ||
        (e.key === 'f' && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (eventMatchesShortcut(e, shortcuts.hold)) {
        e.preventDefault();
        if (lines.length > 0) holdSale();
        else setHoldOpen(true);
        return;
      }
      if (eventMatchesShortcut(e, shortcuts.payment)) {
        e.preventDefault();
        openPayment();
        return;
      }
      if (eventMatchesShortcut(e, shortcuts.complete)) {
        e.preventDefault();
        if (paymentOpen) completeSale();
        else openPayment();
        return;
      }
      if (eventMatchesShortcut(e, shortcuts.returns)) {
        e.preventDefault();
        setReturnOpen(true);
        return;
      }
      if (eventMatchesShortcut(e, shortcuts.cart)) {
        e.preventDefault();
        setCartFocus((i) => (lines.length ? Math.max(0, i) : -1));
        cartPanelRef.current?.focus?.();
        return;
      }
      if (eventMatchesShortcut(e, shortcuts.tender)) {
        e.preventDefault();
        if (!paymentOpen) openPayment();
        setTimeout(() => tenderRef.current?.focus?.(), 50);
        return;
      }

      if (dialogOpen) {
        if (paymentOpen && e.key === 'Enter' && remaining <= 0.009) {
          e.preventDefault();
          completeSale();
        }
        return;
      }

      // Grid navigation
      if (!isTypingTarget(e.target) || e.target === barcodeRef.current) {
        const cols = window.innerWidth >= 1400 ? 5 : window.innerWidth >= 1100 ? 4 : window.innerWidth >= 800 ? 3 : 2;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          if (products.length) {
            e.preventDefault();
            setGridFocus((i) => {
              let next = i < 0 ? 0 : i;
              if (e.key === 'ArrowRight') next = Math.min(products.length - 1, next + 1);
              if (e.key === 'ArrowLeft') next = Math.max(0, next - 1);
              if (e.key === 'ArrowDown') next = Math.min(products.length - 1, next + cols);
              if (e.key === 'ArrowUp') next = Math.max(0, next - cols);
              return next;
            });
            return;
          }
        }
        if (e.key === 'Enter' && gridFocus >= 0 && products[gridFocus]) {
          e.preventDefault();
          addProduct(products[gridFocus], 1);
          return;
        }
      }

      // Cart qty keys when a line is focused
      if (cartFocus >= 0 && lines[cartFocus] && !isTypingTarget(e.target)) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          const line = lines[cartFocus];
          updateLine(line.key, { quantity: (Number(line.quantity) || 0) + 1 });
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          const line = lines[cartFocus];
          updateLine(line.key, { quantity: Math.max(1, (Number(line.quantity) || 1) - 1) });
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          removeLine(lines[cartFocus].key);
          setCartFocus((i) => Math.max(0, i - 1));
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCartFocus((i) => Math.min(lines.length - 1, i + 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCartFocus((i) => Math.max(0, i - 1));
          return;
        }
      }

      if (isTypingTarget(e.target) && e.target !== barcodeRef.current) return;

      if (e.key === 'Enter') {
        const fromBarcode = barcodeRef.current?.value?.trim();
        if (fromBarcode) {
          e.preventDefault();
          barcodeRef.current.value = '';
          scanBarcode(fromBarcode);
          return;
        }
        if (barcodeBuffer.current) {
          e.preventDefault();
          const code = barcodeBuffer.current;
          barcodeBuffer.current = '';
          scanBarcode(code);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (document.activeElement === barcodeRef.current) return;
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 80);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shortcuts,
    paymentOpen,
    customerOpen,
    holdOpen,
    returnOpen,
    shiftOpen,
    managerOpen,
    settingsOpen,
    receipt,
    lines,
    holdSale,
    openPayment,
    completeSale,
    remaining,
    products,
    gridFocus,
    cartFocus,
    addProduct,
    updateLine,
    removeLine,
    scanBarcode,
    focusBarcode,
  ]);

  // Refocus barcode after dialogs close
  useEffect(() => {
    if (
      !paymentOpen &&
      !customerOpen &&
      !holdOpen &&
      !returnOpen &&
      !managerOpen &&
      !settingsOpen &&
      !receipt
    ) {
      focusBarcode(true);
    }
  }, [
    paymentOpen,
    customerOpen,
    holdOpen,
    returnOpen,
    managerOpen,
    settingsOpen,
    receipt,
    focusBarcode,
  ]);

  return {
    bootLoading,
    catalogLoading,
    checkingOut,
    bootstrap,
    products,
    catalogMeta,
    search,
    setSearch,
    railFilter,
    setRailFilter,
    categoryId,
    setCategoryId,
    brandId,
    setBrandId,
    customer,
    setCustomer,
    warehouseId,
    setWarehouseId,
    salesperson,
    setSalesperson,
    lines,
    invoiceDiscount,
    setInvoiceDiscount,
    notes,
    setNotes,
    payments,
    setPayments,
    paymentOpen,
    setPaymentOpen,
    customerOpen,
    setCustomerOpen,
    holdOpen,
    setHoldOpen,
    returnOpen,
    setReturnOpen,
    shiftOpen,
    setShiftOpen,
    managerOpen,
    setManagerOpen,
    settingsOpen,
    setSettingsOpen,
    mobileCartOpen,
    setMobileCartOpen,
    holds,
    receipt,
    setReceipt,
    favorites,
    recent,
    allowCredit,
    setAllowCredit,
    currency,
    permissions,
    totals,
    paidAmount,
    remaining,
    changeDue,
    taxRatesById,
    searchRef,
    barcodeRef,
    cartPanelRef,
    tenderRef,
    gridFocus,
    setGridFocus,
    cartFocus,
    setCartFocus,
    online,
    shift,
    managerUnlock,
    managerActive,
    shortcuts,
    setShortcuts,
    posSettings,
    updateSettings,
    xReport,
    shiftHistory,
    focusBarcode,
    addProduct,
    scanBarcode,
    updateLine,
    removeLine,
    clearCart,
    toggleFavorite,
    searchCustomers,
    createQuickCustomer,
    holdSale,
    resumeHold,
    discardHold,
    openPayment,
    completeSale,
    loadCatalog,
    loadBootstrap,
    openShift,
    closeShift,
    loadXReport,
    loadShiftHistory,
    unlockManager,
    maxDiscountPercent,
  };
}
