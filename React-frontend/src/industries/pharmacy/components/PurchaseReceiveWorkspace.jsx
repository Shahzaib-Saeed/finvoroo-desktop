import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Loader2,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { differenceInCalendarDays, format, parseISO, isValid } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { ItemNameSearchCell } from '../components/ItemNameSearchCell';
import { ExpiryMaskInput } from '../components/ExpiryMaskInput';
import { PharmacyKbd } from '../components/PharmacyKbd';
import {
  expiryDisplayMask,
  isValidExpiryInput,
  normalizeExpiry,
  isoToExpiryMask,
} from '../lib/expiry-mask';
import { prefetchMedicineCatalog } from '../lib/medicine-catalog-cache';
import { onPharmacyCatalogChange, reloadPharmacyCatalog } from '../lib/pharmacy-catalog-store';
import {
  computeReceiveLineAmounts,
  enrichReceiveLinesFromCatalog,
  repairOcrReceiveLines,
  resolveCatalogSalePrice,
} from '../lib/purchase-extraction-adapter';
import { resolveProductImage } from '../lib/upload-medicine-image';
import { billsApi } from '@/pages/accounting/bills/api/bills.api';
import { billPaymentsApi } from '@/pages/accounting/bill-payments/api/bill-payments.api';
import { vendorsApi } from '@/pages/accounting/vendors/api/vendors.api';
import { warehousesApi } from '@/pages/accounting/inventory/api/warehouses.api';
import { productsApi } from '@/components/workspace/product/api/products.api';
import { posApi } from '@/pages/accounting/pos/api/pos.api';
import { useProductDialog } from '@/components/workspace/product/product-dialog-provider';
import { useVendorDialog } from '@/components/workspace/vendor/vendor-dialog-provider';
import { NO_NUMBER_SPINNER } from '@/pages/accounting/invoices/constants';
import { cn } from '@/lib/utils';
import { pharmacyApi } from '../api/pharmacy.api';
import {
  applyPurchaseLineDefaults,
  lineHasEffectiveBatch,
  lineHasEffectiveExpiry,
  resolvePurchaseLineBatch,
  resolvePurchaseLineExpiryIso,
} from '../lib/pharmacy-purchase-defaults';
import {
  clearReceiveDraft,
  clearScanDraft,
  formatDraftSavedAt,
  loadReceiveDraft,
  receiveDraftHasContent,
  saveReceiveDraft,
} from '../lib/pharmacy-purchase-draft';
import {
  PurchaseReceiveMainActions,
  PurchaseReceiveMoreMenu,
} from '../components/PurchaseReceiveToolbar';
import { PurchasePayDialog } from '../components/PurchasePayDialog';
import { scrollPurchaseRowIntoView } from '../components/purchase-grid-ui';
import { receiveLineNeedsVerify, countVerifyReceiveLines } from '../lib/invoice-match-quality';

const NEW_SUPPLIER = '__receive_supplier_new__';

const GRID = '#e2e8f0';
const ROW_H = 'h-11 min-h-11';
const PURCHASE_CELL_INPUT = cn(
  ROW_H,
  'w-full border-0 rounded-none shadow-none bg-white px-2.5 text-[13px] tabular-nums leading-snug text-slate-900 outline-none focus:bg-emerald-50/90 focus:ring-2 focus:ring-inset focus:ring-emerald-500/35 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
);
const PURCHASE_CELL_NUMBER = cn(PURCHASE_CELL_INPUT, NO_NUMBER_SPINNER);
const READONLY_CELL = cn(
  ROW_H,
  'flex items-center bg-slate-100 px-2.5 text-[13px] tabular-nums leading-snug text-slate-700',
);

function GrnTh({ children, align = 'left', className, ...rest }) {
  return (
    <th
      {...rest}
      className={cn(
        'border-b border-r p-0 last:border-r-0',
        className,
      )}
      style={{ borderColor: 'rgba(255,255,255,0.15)', background: '#047857' }}
    >
      <div
        className={cn(
          'flex min-h-[2.75rem] items-center px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/95',
          align === 'right' && 'justify-end text-right',
          align === 'center' && 'justify-center text-center',
          align === 'left' && 'justify-start text-left',
        )}
      >
        {children}
      </div>
    </th>
  );
}

function GrnTd({ children, className, align = 'left', onClick }) {
  return (
    <td
      onClick={onClick}
      style={{ borderColor: GRID }}
      className={cn(
        'border-b border-r p-0 align-middle last:border-r-0',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

function CellText({ children, className, align = 'left', readonly = false }) {
  return (
    <div
      className={cn(
        READONLY_CELL,
        readonly && 'bg-slate-100',
        align === 'right' && 'justify-end',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Calculated / read-only grid value — grey background so users know it is not editable. */
function ReadonlyCell({ children, align = 'right', className, tone }) {
  return (
    <GrnTd align={align}>
      <div
        className={cn(
          READONLY_CELL,
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center',
          tone === 'strong' && 'font-semibold text-slate-800',
          tone === 'good' && 'font-semibold text-emerald-800',
          tone === 'bad' && 'font-semibold text-red-700',
          className,
        )}
      >
        {children}
      </div>
    </GrnTd>
  );
}

function unwrapPayload(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function emptyLine() {
  return {
    product_id: '',
    name: '',
    generic: '',
    strength: '',
    packing: '',
    image_url: null,
    quantity: '1',
    bonus: '0',
    unit_price: '',
    last_cost: '',
    discount: '0',
    discount_type: 'percent',
    gst_percent: '',
    tax_rate_id: '',
    mrp: '',
    sale_price: '',
    batch_number: '',
    expiry_date: '',
    manufactured_date: '',
    tax_amount: '',
    adv_income_tax: '0',
    current_stock: '',
    _needsMatch: false,
  };
}

function billLineToGrnLine(line) {
  return {
    ...emptyLine(),
    product_id: line.product_id ? String(line.product_id) : '',
    name: line.product_name || line.description || '',
    quantity: line.quantity != null && line.quantity !== '' ? String(line.quantity) : '1',
    bonus: '0',
    unit_price: line.unit_price != null && line.unit_price !== '' ? String(line.unit_price) : '',
    discount: String(line.discount_percent ?? line.discount ?? 0),
    discount_type: 'percent',
    tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
    tax_amount: line.sale_tax_amount != null ? String(line.sale_tax_amount) : '',
    mrp: line.line_mrp != null && line.line_mrp !== '' ? String(line.line_mrp) : '',
    sale_price:
      line.retail_unit_price != null && line.retail_unit_price !== ''
        ? String(line.retail_unit_price)
        : '',
    batch_number: line.batch_number || '',
    expiry_date: isoToExpiryMask(line.expiry_date) || expiryDisplayMask(line.expiry_date),
    manufactured_date: line.manufactured_date || '',
  };
}

/** Stacked label + control for the purchase header row. */
function FieldBlock({ label, required, className, children }) {
  return (
    <div className={cn('min-w-0', className)}>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </div>
  );
}

const headerInputClass =
  'h-9 w-full border-slate-200 bg-white text-sm shadow-none focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30';
const headerInputReadonlyClass =
  'h-9 w-full border-slate-200 bg-slate-50 text-sm text-slate-600 shadow-none cursor-default';
const footerInputClass = cn(
  'h-9 min-w-0 flex-1 border-slate-300 bg-white text-right text-xs tabular-nums shadow-none',
  NO_NUMBER_SPINNER,
);

/** Inline label + input for the summary rail. */
function InlineField({ label, className, children }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <span className="shrink-0 text-xs font-medium text-slate-600">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SummaryMoneyRow({ label, value, muted, strong, accent }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span
        className={cn(
          'text-[12px]',
          muted ? 'text-slate-500' : strong ? 'font-medium text-slate-800' : 'text-slate-600',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-[13px] tabular-nums',
          accent && 'text-emerald-700',
          strong ? 'font-semibold text-slate-900' : 'font-medium text-slate-800',
          muted && !strong && 'text-slate-600',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryStat({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 shadow-xs">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums leading-none text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-[10px] text-slate-500">{sub}</p> : null}
    </div>
  );
}

function SummaryAdjustField({ label, className, children }) {
  return (
    <label className={cn('block min-w-0 space-y-1', className)}>
      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const summaryAdjustInputClass = cn(
  'h-8 w-full border-slate-200 bg-slate-50/80 text-right text-xs tabular-nums shadow-none focus-visible:border-emerald-600 focus-visible:bg-white focus-visible:ring-emerald-600/25',
  NO_NUMBER_SPINNER,
);

function isFilledGrnLine(line) {
  return Boolean(
    line?.product_id ||
      line?._needsMatch ||
      (String(line?.name || '').trim() && (line?._fromOcr || line?.product_id)),
  );
}

function focusGrnField(index, field) {
  requestAnimationFrame(() => {
    document.querySelector(`[data-grn-field="${field}-${index}"]`)?.focus?.({ preventScroll: true });
    scrollPurchaseRowIntoView(index);
  });
}

function focusGrnItem(index) {
  requestAnimationFrame(() => {
    const el =
      document.querySelector(`input[data-grn-item="${index}"]`) ||
      document.querySelector(`button[data-grn-item="${index}"]`) ||
      document.querySelector(`[data-grn-item="${index}"]`);
    el?.focus?.({ preventScroll: true });
    scrollPurchaseRowIntoView(index);
  });
}

function detectGrnFocusedField() {
  const active = document.activeElement;
  if (active?.closest?.('[data-pharmacy-item-search]')) return 'item';
  const attr = active?.getAttribute?.('data-grn-field');
  const match = attr?.match(/^(.+)-(\d+)$/);
  return match?.[1] || 'item';
}

function focusGrnFieldByName(index, field) {
  if (field === 'item') {
    focusGrnItem(index);
    return;
  }
  focusGrnField(index, field);
}

function isGrnTypingTarget(el) {
  if (!el) return false;
  if (el.closest?.('[data-pharmacy-typing]')) return true;
  if (el.closest?.('[data-pos-no-scan]')) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!el.isContentEditable;
}

/** Build product-dialog prefill from an unmatched receive / OCR line. */
function receiveLineToProductPrefill(line) {
  const packing = String(line?.packing || '').trim();
  const packNum = /^\d+$/.test(packing) ? packing : '';
  const purchase = line?.unit_price || line?.last_cost || '';
  const mrp = line?.mrp || '';
  const sale = line?.sale_price || mrp || '';
  const metaBits = [
    packing && !packNum ? `Packing: ${packing}` : null,
    line?.item_code ? `Supplier code: ${line.item_code}` : null,
  ].filter(Boolean);

  return {
    name: String(line?.name || '').trim(),
    type: 'inventory',
    sku: line?.item_code ? String(line.item_code).trim() : '',
    barcode: line?.barcode ? String(line.barcode).trim() : '',
    purchase_price: purchase === '' || purchase == null ? '' : String(purchase),
    unit_price: sale === '' || sale == null ? '' : String(sale),
    mrp: mrp === '' || mrp == null ? '' : String(mrp),
    description: metaBits.join('\n'),
    manufacturer: line?.manufacturer || '',
    pharmacy: {
      generic_name: line?.generic || '',
      strength_text: line?.strength || '',
      pack_size: packNum || '',
      units_per_pack: packNum || '',
    },
  };
}

function money(v, digits = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `Rs.${n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function expiryTone(raw) {
  const iso = normalizeExpiry(raw);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { label: raw || '—', tone: 'neutral', iso: '' };
  }
  const d = parseISO(iso);
  if (!isValid(d)) return { label: raw || '—', tone: 'neutral', iso };
  const days = differenceInCalendarDays(d, new Date());
  const label = format(d, 'MMM yyyy');
  if (days < 0) return { label, tone: 'danger', iso };
  if (days <= 90) return { label, tone: 'warn', iso };
  return { label, tone: 'ok', iso };
}

function parsePaste(text) {
  return String(text || '')
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,/).map((c) => c.trim()))
    .filter((r) => r.some(Boolean));
}

function unwrapList(res) {
  const data = res?.data?.data ?? res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function lineAmounts(line, invGstFallback = 0) {
  return computeReceiveLineAmounts(line, invGstFallback);
}

function moneyPlain(v, digits = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function mapExtractionToGrnLines(incoming, pharmacySettings = {}) {
  if (!Array.isArray(incoming) || incoming.length === 0) return null;
  const mapped = incoming.map((row) =>
    applyPurchaseLineDefaults(
      {
        ...emptyLine(),
        ...row,
        product_id: row.product_id ? String(row.product_id) : '',
        quantity:
          row.quantity != null && row.quantity !== ''
            ? String(row.quantity)
            : Number(row.bonus) > 0
              ? '0'
              : '1',
        bonus: row.bonus != null && row.bonus !== '' ? String(row.bonus) : '0',
        discount: row.discount != null && row.discount !== '' ? String(row.discount) : '0',
        discount_type: row.discount_type === 'fixed' ? 'fixed' : 'percent',
        gst_percent:
          row.gst_percent != null && row.gst_percent !== '' ? String(row.gst_percent) : '0',
        tax_amount: row.tax_amount != null ? String(row.tax_amount) : '',
        _needsMatch: !row.product_id,
        _fromOcr: true,
      },
      pharmacySettings,
    ),
  );
  const withEmpty = mapped.length ? [...mapped, emptyLine()] : [emptyLine()];
  return enrichReceiveLinesFromCatalog(repairOcrReceiveLines(withEmpty));
}

function readReceiveBootstrap(locationState) {
  const incoming = locationState?.extractionLines;
  const fromScan =
    Boolean(locationState?.fromInvoiceScan) ||
    (Array.isArray(incoming) && incoming.length > 0);
  const lines = fromScan ? mapExtractionToGrnLines(incoming) : null;
  return {
    fromScan,
    lines: lines || [emptyLine()],
    remarks: fromScan && locationState?.extractionNotes ? String(locationState.extractionNotes) : '',
    lineCount: Array.isArray(incoming) ? incoming.length : 0,
    extractionId: locationState?.extractionId ?? null,
  };
}

export function buildScanBootstrapFromExtractionLines(
  extractionLines,
  pharmacySettings = {},
  remarks = '',
) {
  const fromScan = Array.isArray(extractionLines) && extractionLines.length > 0;
  const lines = fromScan ? mapExtractionToGrnLines(extractionLines, pharmacySettings) : null;
  return {
    fromScan,
    lines: lines || [emptyLine()],
    remarks: remarks || (fromScan ? 'Imported from invoice scan (review before posting).' : ''),
    lineCount: Array.isArray(extractionLines) ? extractionLines.length : 0,
    extractionId: null,
    extractionLines: extractionLines || [],
  };
}

/**
 * Pharmacy Goods Receiving — full GRN workspace (manual receive or embedded in scan flow).
 */
export function PurchaseReceiveWorkspace({
  companyId: companyIdProp,
  editBillId: editBillIdProp,
  scanBootstrap: scanBootstrapProp = null,
  embedded = false,
  extractionId: extractionIdProp = null,
  invoiceSidebar = null,
  onPosted = null,
  onEmbeddedToolbar = null,
}) {
  const params = useParams();
  const companyId = companyIdProp || params.id;
  const editBillId = editBillIdProp ?? params.billId;
  const isEdit = Boolean(editBillId);
  const navigate = useNavigate();
  const location = useLocation();
  const scanBootstrap = useMemo(() => {
    if (scanBootstrapProp) return scanBootstrapProp;
    return readReceiveBootstrap(location.state);
  }, [scanBootstrapProp, location.state]);
  const activeExtractionId = extractionIdProp ?? scanBootstrap.extractionId ?? null;
  const productDialog = useProductDialog();
  const vendorDialog = useVendorDialog();
  const [vendors, setVendors] = useState([]);
  const [canCreateVendor, setCanCreateVendor] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [billDate, setBillDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState(() => scanBootstrap.remarks || '');
  const [docDiscPercent, setDocDiscPercent] = useState('0');
  const [docDiscount, setDocDiscount] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');
  const [purchaseExpense, setPurchaseExpense] = useState('0');
  const [invGstPercent, setInvGstPercent] = useState('0');
  const [advIncomeTax, setAdvIncomeTax] = useState('0');
  const [lines, setLines] = useState(() => repairOcrReceiveLines(scanBootstrap.lines));
  const [saving, setSaving] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [billLoading, setBillLoading] = useState(isEdit);
  const [canEditBill, setCanEditBill] = useState(true);
  const [billMeta, setBillMeta] = useState(null);
  const [showPaste, setShowPaste] = useState(
    () => new URLSearchParams(location.search).get('paste') === '1',
  );
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [fromInvoiceScan, setFromInvoiceScan] = useState(scanBootstrap.fromScan);
  const [pharmacySettings, setPharmacySettings] = useState({});
  const pasteRef = useRef(null);
  const focusAfter = useRef(null);
  const hydratedExtraction = useRef(scanBootstrap.fromScan);
  const scanToastShown = useRef(scanBootstrap.fromScan);
  const extractionSeedRef = useRef(
    scanBootstrapProp?.extractionLines ??
      (Array.isArray(location.state?.extractionLines) ? location.state.extractionLines : null),
  );
  const draftRestoredRef = useRef(false);
  const scanImportDraftSavedRef = useRef(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payAndNext, setPayAndNext] = useState(false);

  useEffect(() => {
    prefetchMedicineCatalog();
    const syncCatalogPrices = () => {
      setLines((prev) => {
        const next = repairOcrReceiveLines(enrichReceiveLinesFromCatalog(prev));
        return next === prev ? prev : next;
      });
    };
    syncCatalogPrices();
    return onPharmacyCatalogChange(() => syncCatalogPrices());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await pharmacyApi.settings();
        const data = res?.data?.data ?? res?.data ?? {};
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
    let cancelled = false;
    setOptionsLoading(true);
    Promise.all([
      vendorsApi.list({ per_page: 500, is_active: 1 }),
      warehousesApi.list({ per_page: 100, is_active: 1 }),
      vendorsApi.formOptions().catch(() => ({ data: { data: {} } })),
    ])
      .then(([vendorRes, warehouseRes, vendorOptionsRes]) => {
        if (cancelled) return;
        const vendorList = unwrapList(vendorRes);
        const warehouseList = unwrapList(warehouseRes);
        const vendorOptions = vendorOptionsRes?.data?.data ?? vendorOptionsRes?.data ?? {};
        setCanCreateVendor(Boolean(vendorOptions.can_create));
        setVendors(
          vendorList.map((v) => ({
            id: v.id,
            name: v.name,
            email: v.email,
            currency: v.currency,
          })),
        );
        const defaultWarehouse =
          warehouseList.find((w) => w.is_default) || warehouseList[0];
        if (defaultWarehouse?.id) setWarehouseId(String(defaultWarehouse.id));
      })
      .catch(() => toast.error('Could not load receive options'))
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editBillId) return;
    let cancelled = false;
    setBillLoading(true);
    billsApi
      .show(editBillId)
      .then((res) => {
        if (cancelled) return;
        const bill = res.data?.data;
        if (!bill) {
          toast.error('Purchase not found');
          navigate(`/workspace/${companyId}/pharmacy/receive`, { replace: true });
          return;
        }
        setBillMeta({
          id: bill.id,
          number: bill.bill_number,
          status: bill.status,
          isPosted: !!bill.is_posted,
        });
        setCanEditBill(bill.flags?.can_edit !== false);
        setVendorId(bill.vendor_id ? String(bill.vendor_id) : '');
        setWarehouseId(bill.warehouse_id ? String(bill.warehouse_id) : '');
        setBillDate(bill.bill_date || format(new Date(), 'yyyy-MM-dd'));
        setReference(bill.reference || '');
        setRemarks(bill.notes || '');
        setDocDiscount(String(bill.discount_amount ?? 0));
        setOtherCharges(String(bill.other_charges ?? 0));
        const mapped = (bill.lines || []).map(billLineToGrnLine);
        setLines(mapped.length ? [...mapped, emptyLine()] : [emptyLine()]);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Could not load purchase');
        if (!cancelled) navigate(`/workspace/${companyId}/pharmacy/receive`, { replace: true });
      })
      .finally(() => {
        if (!cancelled) setBillLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, editBillId, navigate]);

  // Re-apply pharmacy defaults once settings load (scan lines are seeded synchronously).
  useEffect(() => {
    if (!hydratedExtraction.current) return;
    if (!Object.keys(pharmacySettings || {}).length) return;
    const incoming = extractionSeedRef.current;
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    const mapped = mapExtractionToGrnLines(incoming, pharmacySettings);
    if (mapped) setLines(mapped);
  }, [pharmacySettings]);

  useEffect(() => {
    if (embedded || scanBootstrapProp) return;
    if (!scanBootstrap.fromScan || scanToastShown.current) return;
    scanToastShown.current = true;
    const count = scanBootstrap.lineCount;
    if (count > 0) {
      toast.success(`Loaded ${count} scanned line${count === 1 ? '' : 's'} — review before posting`);
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [
    embedded,
    location.pathname,
    navigate,
    scanBootstrap.fromScan,
    scanBootstrap.lineCount,
    scanBootstrapProp,
  ]);

  const buildReceiveDraftPayload = useCallback(
    () => ({
      vendorId,
      warehouseId,
      billDate,
      reference,
      remarks,
      docDiscPercent,
      docDiscount,
      otherCharges,
      purchaseExpense,
      invGstPercent,
      advIncomeTax,
      lines: lines.filter((l) => l.product_id || l._needsMatch || String(l.name || '').trim()),
    }),
    [
      advIncomeTax,
      billDate,
      docDiscPercent,
      docDiscount,
      invGstPercent,
      lines,
      otherCharges,
      purchaseExpense,
      remarks,
      reference,
      vendorId,
      warehouseId,
    ],
  );

  useEffect(() => {
    if (isEdit || billLoading || draftRestoredRef.current) return;
    if (scanBootstrap.fromScan) return;
    const draft = loadReceiveDraft(companyId);
    if (!receiveDraftHasContent(draft)) return;
    draftRestoredRef.current = true;
    if (draft.vendorId) setVendorId(String(draft.vendorId));
    if (draft.warehouseId) setWarehouseId(String(draft.warehouseId));
    if (draft.billDate) setBillDate(String(draft.billDate));
    if (draft.reference != null) setReference(String(draft.reference));
    if (draft.remarks != null) setRemarks(String(draft.remarks));
    if (draft.docDiscPercent != null) setDocDiscPercent(String(draft.docDiscPercent));
    if (draft.docDiscount != null) setDocDiscount(String(draft.docDiscount));
    if (draft.otherCharges != null) setOtherCharges(String(draft.otherCharges));
    if (draft.purchaseExpense != null) setPurchaseExpense(String(draft.purchaseExpense));
    if (draft.invGstPercent != null) setInvGstPercent(String(draft.invGstPercent));
    if (draft.advIncomeTax != null) setAdvIncomeTax(String(draft.advIncomeTax));
    if (Array.isArray(draft.lines) && draft.lines.length) {
      const restored = [...draft.lines.filter((l) => l.product_id || l._needsMatch || String(l.name || '').trim()), emptyLine()];
      setLines(enrichReceiveLinesFromCatalog(repairOcrReceiveLines(restored)));
    }
    setDraftSavedAt(draft.savedAt || null);
    const count = (draft.lines || []).filter(isFilledGrnLine).length;
    toast.message(
      count > 0
        ? `Restored ${count} line${count === 1 ? '' : 's'} from your saved draft on this device`
        : 'Restored your saved purchase draft on this device',
      { duration: 5000 },
    );
  }, [billLoading, companyId, isEdit, scanBootstrap.fromScan]);

  useEffect(() => {
    if (isEdit || billLoading) return;
    const payload = buildReceiveDraftPayload();
    if (!receiveDraftHasContent(payload)) {
      clearReceiveDraft(companyId);
      setDraftSavedAt(null);
      return;
    }
    const timer = setTimeout(() => {
      if (saveReceiveDraft(companyId, null, payload)) {
        setDraftSavedAt(Date.now());
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [billLoading, buildReceiveDraftPayload, companyId, isEdit]);

  useEffect(() => {
    if (isEdit) return;
    const onLeave = () => {
      const payload = buildReceiveDraftPayload();
      if (receiveDraftHasContent(payload)) {
        saveReceiveDraft(companyId, null, payload);
      }
    };
    const onWarn = (e) => {
      const payload = buildReceiveDraftPayload();
      if (!receiveDraftHasContent(payload)) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('beforeunload', onWarn);
    return () => {
      window.removeEventListener('beforeunload', onLeave);
      window.removeEventListener('beforeunload', onWarn);
    };
  }, [buildReceiveDraftPayload, companyId, isEdit]);

  useEffect(() => {
    if (isEdit || !fromInvoiceScan || scanImportDraftSavedRef.current) return;
    const payload = buildReceiveDraftPayload();
    if (!receiveDraftHasContent(payload)) return;
    scanImportDraftSavedRef.current = true;
    saveReceiveDraft(companyId, null, payload);
    setDraftSavedAt(Date.now());
  }, [buildReceiveDraftPayload, companyId, fromInvoiceScan, isEdit, lines]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let lineDiscount = 0;
    let tax = 0;
    let saleTotal = 0;
    let count = 0;
    let strips = 0;
    let unmatched = 0;
    const invGst = Number(invGstPercent) || 0;
    for (const line of lines) {
      if (!line.product_id && !line._needsMatch && !line.name) continue;
      if (!line.product_id && !line._needsMatch) continue;
      const a = lineAmounts(line, invGst);
      if (!line.product_id) unmatched += 1;
      count += 1;
      strips += a.received;
      subtotal += a.gross;
      lineDiscount += a.discount;
      tax += a.tax;
      saleTotal += a.sale * a.qty;
    }
    const afterLine = Math.max(0, subtotal - lineDiscount);
    const pctDisc = ((afterLine * (Number(docDiscPercent) || 0)) / 100);
    const flatDisc = Number(docDiscount) || 0;
    const misc = Number(otherCharges) || 0;
    const purExp = Number(purchaseExpense) || 0;
    const advTax = Number(advIncomeTax) || 0;
    const taxableBase = Math.max(0, afterLine - pctDisc - flatDisc);
    const docIncGst = (taxableBase * (Number(invGstPercent) || 0)) / 100;
    const payable = Math.max(
      0,
      afterLine - pctDisc - flatDisc + tax + docIncGst + misc + purExp + advTax,
    );
    const avgPrice = count > 0 ? payable / Math.max(1, strips) : 0;
    return {
      count,
      strips,
      unmatched,
      subtotal,
      lineDiscount,
      pctDisc,
      headerDiscount: flatDisc,
      tax,
      misc,
      purchaseExpense: purExp,
      advTax,
      docIncGst,
      saleTotal,
      avgPrice,
      payable,
    };
  }, [
    lines,
    docDiscount,
    docDiscPercent,
    otherCharges,
    purchaseExpense,
    invGstPercent,
    advIncomeTax,
  ]);

  const verifyCount = useMemo(() => countVerifyReceiveLines(lines), [lines]);

  const ensureTrailingEmpty = useCallback((list) => {
    const next = (list || []).filter((l) => l.product_id || l._needsMatch || l.name);
    next.push(emptyLine());
    return next;
  }, []);

  const updateLine = (index, patch) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const focusNewItemRow = useCallback(() => {
    setLines((prev) => {
      const next = ensureTrailingEmpty(prev);
      const emptyIdx = next.findIndex((l) => !l.product_id && !l._needsMatch);
      const idx = emptyIdx >= 0 ? emptyIdx : next.length - 1;
      setSelectedIdx(idx);
      focusAfter.current = { type: 'item', index: idx };
      return next;
    });
  }, [ensureTrailingEmpty]);

  const openMedicineSheetForRow = useCallback((rowIndex) => {
    const idx = Math.max(0, Math.min(rowIndex, lines.length - 1));
    setSelectedIdx(idx);
    focusGrnItem(idx);
  }, [lines.length]);

  const navigateGrnItemRow = useCallback(
    (rowIndex, delta) => {
      const maxIndex = Math.max(0, lines.length - 1);
      const next = Math.max(0, Math.min(rowIndex + delta, maxIndex));
      if (next === rowIndex) return;
      setSelectedIdx(next);
      focusGrnItem(next);
    },
    [lines.length],
  );

  const productToLineFields = useCallback((product, existing = null) => {
    const fromScan = Boolean(
      existing?._fromOcr || String(existing?.supplier_invoice_label || '').trim(),
    );
    const keepMeta = Boolean(existing?.product_id || existing?._needsMatch || fromScan);

    const catalogLink = {
      product_id: String(product.id),
      name: product.name,
      image_url: resolveProductImage(product) || existing?.image_url || '',
      current_stock:
        product.current_stock ??
        product.stock_qty ??
        product.qty_on_hand ??
        existing?.current_stock ??
        '',
      _needsMatch: false,
      match_status: 'matched',
      match_confidence: 1,
      match_user_confirmed: true,
    };

    // Invoice scan — link catalog only: update name + retail sale price; keep bill batch/qty/prices.
    if (fromScan && existing) {
      return {
        ...catalogLink,
        _fromOcr: true,
        supplier_invoice_label: existing.supplier_invoice_label || '',
        invoice_line_total: existing.invoice_line_total || '',
        sale_price: resolveCatalogSalePrice(product) || existing.sale_price || '',
      };
    }

    const packing =
      product.pharmacy?.pack_size ||
      product.pack_size ||
      product.unit ||
      product.base_unit ||
      product.default_unit ||
      existing?.packing ||
      'Strip';
    const hasExisting = (key) =>
      existing?.[key] != null && String(existing[key]).trim() !== '';

    return {
      ...catalogLink,
      generic: product.pharmacy?.generic_name || product.generic || '',
      strength: product.pharmacy?.strength_text || product.strength || '',
      packing: String(packing),
      quantity:
        keepMeta && hasExisting('quantity')
          ? String(existing.quantity)
          : Number(existing?.bonus) > 0
            ? '0'
            : '1',
      bonus: keepMeta && existing?.bonus != null ? existing.bonus : '0',
      unit_price:
        keepMeta && hasExisting('unit_price')
          ? String(existing.unit_price)
          : product.purchase_price ?? product.cost_price ?? '',
      last_cost:
        keepMeta && hasExisting('last_cost')
          ? String(existing.last_cost)
          : product.purchase_price ?? product.cost_price ?? '',
      discount: keepMeta && existing?.discount != null ? existing.discount : '0',
      discount_type: existing?.discount_type === 'fixed' ? 'fixed' : 'percent',
      gst_percent:
        keepMeta && hasExisting('gst_percent')
          ? String(existing.gst_percent)
          : product.tax_rate?.rate != null
            ? String(product.tax_rate.rate)
            : '',
      tax_rate_id:
        keepMeta && hasExisting('tax_rate_id')
          ? String(existing.tax_rate_id)
          : product.tax_rate_id
            ? String(product.tax_rate_id)
            : '',
      mrp:
        keepMeta && hasExisting('mrp')
          ? String(existing.mrp)
          : product.mrp ?? product.unit_price ?? '',
      sale_price:
        keepMeta && hasExisting('sale_price')
          ? String(existing.sale_price)
          : product.unit_price ?? product.mrp ?? '',
      batch_number: keepMeta ? existing?.batch_number || '' : '',
      expiry_date: keepMeta ? existing?.expiry_date || '' : '',
      manufactured_date: keepMeta ? existing?.manufactured_date || '' : '',
      tax_amount:
        keepMeta && existing?.tax_amount != null && String(existing.tax_amount).trim() !== ''
          ? String(existing.tax_amount)
          : '',
      adv_income_tax: keepMeta && existing?.adv_income_tax != null ? existing.adv_income_tax : '0',
      _fromOcr: existing?._fromOcr || false,
      supplier_invoice_label: existing?.supplier_invoice_label || '',
    };
  }, []);

  const applyProductToLine = useCallback(
    (index, product, { focusBatch = true } = {}) => {
      setLines((prev) => {
        const existing = prev[index] || emptyLine();
        const fromScan = Boolean(
          existing._fromOcr || String(existing.supplier_invoice_label || '').trim(),
        );
        const row = productToLineFields(product, existing);
        let next = prev.map((l, i) => (i === index ? { ...existing, ...row } : l));
        next = ensureTrailingEmpty(next);
        setSelectedIdx(index);
        if (focusBatch && !fromScan) {
          focusAfter.current = { type: 'field', field: 'batch', index };
        } else {
          focusAfter.current = { type: 'item', index };
        }
        return next;
      });
      toast.success(`${product.name}`, { duration: 1200 });
    },
    [ensureTrailingEmpty, productToLineFields],
  );

  const resolveProductTerm = useCallback(
    async (raw, rowIndex) => {
      const value = String(raw || '').trim();
      if (!value) return;
      try {
        const product = unwrapPayload(await posApi.barcode(value));
        if (product?.id) {
          applyProductToLine(rowIndex, product);
          return;
        }
      } catch {
        /* barcode miss */
      }
      try {
        const res = await posApi.catalog({ search: value, per_page: 24 });
        const list = unwrapList(res);
        if (list.length === 1) applyProductToLine(rowIndex, list[0]);
        else if (list.length === 0) toast.error(`No medicine for “${value}”`);
        // Multiple hits: sheet already shows local/remote results while typing
      } catch {
        toast.error('Medicine lookup failed');
      }
    },
    [applyProductToLine],
  );

  const advanceAfterSale = useCallback(
    (index) => {
      setLines((prev) => {
        const next = ensureTrailingEmpty(prev);
        const following = next.findIndex(
          (l, i) => i > index && !l.product_id && !l._needsMatch,
        );
        const target = following >= 0 ? following : next.length - 1;
        setSelectedIdx(target);
        focusAfter.current = { type: 'item', index: target };
        return next;
      });
    },
    [ensureTrailingEmpty],
  );

  useEffect(() => {
    const job = focusAfter.current;
    if (!job) return;
    focusAfter.current = null;
    if (job.type === 'item') focusGrnItem(job.index);
    else if (job.type === 'field') focusGrnField(job.index, job.field);
  }, [lines]);

  const removeLine = (index) => {
    setLines((prev) => ensureTrailingEmpty(prev.filter((_, i) => i !== index)));
    setSelectedIdx((prev) => (index <= prev ? Math.max(0, prev - 1) : prev));
  };

  const resolveRemoveLineIndex = useCallback(
    (target) => {
      const rowIdx = target?.closest?.('[data-grn-row]')?.getAttribute?.('data-grn-row');
      if (rowIdx != null && rowIdx !== '') return Number(rowIdx);
      const line = lines[selectedIdx];
      if (isFilledGrnLine(line)) return selectedIdx;
      return null;
    },
    [lines, selectedIdx],
  );

  const printReceive = useCallback(() => {
    window.print();
  }, []);

  const autoMatchPasteRows = async (mapped) => {
    const resolved = [];
    for (const row of mapped) {
      if (!row.name) {
        resolved.push(row);
        continue;
      }
      try {
        const res = await productsApi.list({ search: row.name, per_page: 5, is_active: 1 });
        const list = unwrapList(res);
        const exact = list.find(
          (p) =>
            String(p.barcode || '').toLowerCase() === row.name.toLowerCase() ||
            String(p.sku || '').toLowerCase() === row.name.toLowerCase() ||
            String(p.name || '').toLowerCase() === row.name.toLowerCase(),
        );
        const hit = exact || (list.length === 1 ? list[0] : null);
        if (hit) {
          resolved.push({
            ...row,
            product_id: String(hit.id),
            name: hit.name,
            generic: hit.pharmacy?.generic_name || '',
            strength: hit.pharmacy?.strength_text || '',
            packing: hit.pharmacy?.pack_size || hit.unit || row.packing || 'Strip',
            image_url: resolveProductImage(hit),
            tax_rate_id: hit.tax_rate_id ? String(hit.tax_rate_id) : '',
            unit_price: row.unit_price || hit.purchase_price || '',
            last_cost: hit.purchase_price || '',
            mrp: row.mrp || hit.mrp || '',
            sale_price: row.sale_price || hit.unit_price || hit.mrp || '',
            _needsMatch: false,
          });
        } else {
          resolved.push({ ...row, _needsMatch: true });
        }
      } catch {
        resolved.push({ ...row, _needsMatch: true });
      }
    }
    return resolved;
  };

  const applyPaste = async () => {
    const rows = parsePaste(pasteRef.current?.value || '');
    if (!rows.length) {
      toast.message('Paste rows: name/sku, qty, batch, expiry, cost, mrp');
      return;
    }
    const mapped = rows.map((cols) => ({
      ...emptyLine(),
      name: cols[0] || '',
      quantity: cols[1] || '1',
      batch_number: cols[2] || '',
      expiry_date: cols[3]
        ? expiryDisplayMask(normalizeExpiry(cols[3]) || cols[3])
        : '',
      unit_price: cols[4] || '',
      mrp: cols[5] || '',
      sale_price: cols[5] || '',
      _needsMatch: true,
    }));
    toast.message('Matching medicines…');
    const resolved = await autoMatchPasteRows(mapped);
    setLines((prev) => {
      const kept = prev.filter((l) => l.product_id);
      return [...kept, ...resolved, emptyLine()];
    });
    const unmatched = resolved.filter((r) => r._needsMatch).length;
    toast.success(
      unmatched
        ? `${resolved.length} rows — ${unmatched} need matching`
        : `${resolved.length} rows matched`,
    );
    setShowPaste(false);
  };

  const buildPayloadLines = ({ draft = false } = {}) =>
    lines
      .filter((l) => {
        const qty = Number(l.quantity) || 0;
        if (l.product_id && qty > 0) return true;
        if (draft && !l.product_id && String(l.name || '').trim() && qty > 0) return true;
        return false;
      })
      .map((l) => {
        const paidQty = Number(l.quantity) || 0;
        const bonusQty = Number(l.bonus) || 0;
        const rate = Number(l.unit_price) || 0;
        const totalQty = paidQty + bonusQty;
        // Receive paid + bonus into stock; blend unit cost so inventory value = paid qty × rate.
        const blended = totalQty > 0 ? (paidQty * rate) / totalQty : rate;
        const discType = l.discount_type === 'percent' ? 'percent' : 'fixed';
        const payload = {
          product_id: l.product_id ? Number(l.product_id) : null,
          description: l.name || 'Item',
          quantity: String(totalQty),
          unit_price: blended,
          discount: Number(l.discount) || 0,
          discount_type: discType,
          tax_rate_id: l.tax_rate_id ? Number(l.tax_rate_id) : null,
          batch_number: resolvePurchaseLineBatch(l, pharmacySettings) || null,
          expiry_date: resolvePurchaseLineExpiryIso(l, pharmacySettings) || null,
          manufactured_date: l.manufactured_date || null,
        };
        // OCR / manual tax amount when no tax rate selected (existing bill field).
        if (!payload.tax_rate_id && l.tax_amount != null && String(l.tax_amount).trim() !== '') {
          payload.sale_tax_amount = Number(l.tax_amount) || 0;
        }
        const salePrice = Number(l.sale_price);
        if (Number.isFinite(salePrice) && salePrice > 0) {
          payload.retail_unit_price = salePrice;
        }
        const mrp = Number(l.mrp);
        if (Number.isFinite(mrp) && mrp > 0) {
          payload.line_mrp = mrp;
        }
        return payload;
      });

  const persistReceive = async ({
    post = true,
    andNext = false,
    paid = false,
    paidAmount = 0,
  } = {}) => {
    if (!vendorId) {
      toast.error('Select a supplier');
      return;
    }
    const payloadLines = buildPayloadLines({ draft: !post });
    if (!payloadLines.length) {
      toast.error(
        post
          ? 'Add at least one medicine line'
          : 'Add at least one line with quantity before saving draft',
      );
      return;
    }
    if (post) {
      const invalidLine = lines.some(
        (l) =>
          l.product_id &&
          (Number(l.quantity) || 0) > 0 &&
          (!lineHasEffectiveBatch(l, pharmacySettings) ||
            !lineHasEffectiveExpiry(l, pharmacySettings)),
      );
      if (invalidLine) {
        toast.error(
          'Batch and expiry required on every line (or set defaults in Pharmacy settings)',
        );
        return;
      }
      const unlinked = payloadLines.some((l) => !l.product_id);
      if (unlinked) {
        toast.error('Link or create every medicine before posting');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        vendor_id: Number(vendorId),
        bill_date: billDate,
        due_date: billDate,
        reference: reference.trim() || null,
        warehouse_id: warehouseId ? Number(warehouseId) : null,
        discount_amount:
          (Number(docDiscount) || 0) + (Number(totals.pctDisc) || 0),
        other_charges:
          (Number(otherCharges) || 0) +
          (Number(purchaseExpense) || 0) +
          (Number(advIncomeTax) || 0) +
          (Number(totals.docIncGst) || 0),
        notes: remarks.trim() || null,
        lines: payloadLines,
        skip_auto_post: true,
      };

      let billId = editBillId ? Number(editBillId) : null;
      let saved = null;
      if (isEdit && editBillId) {
        const updateRes = await billsApi.update(editBillId, payload);
        saved = updateRes.data?.data;
      } else {
        const createRes = await billsApi.create(payload);
        saved = createRes.data?.data;
        billId = saved?.id;
        if (!billId) throw new Error('No bill id');
      }

      const alreadyPosted = Boolean(saved?.is_posted || saved?.journal_entry_id);
      if (post && billId && !alreadyPosted) {
        await billsApi.post(billId);
      }

      if (post && vendorId) {
        const aliasLines = lines
          .filter(
            (l) =>
              l.product_id &&
              String(l.supplier_invoice_label || '').trim(),
          )
          .map((l) => ({
            invoice_label: String(l.supplier_invoice_label).trim(),
            product_id: Number(l.product_id),
            item_code: String(l.item_code || '').trim() || undefined,
          }));
        if (aliasLines.length) {
          void pharmacyApi
            .rememberSupplierProductAliases({
              vendor_id: Number(vendorId),
              lines: aliasLines,
            })
            .catch(() => {
              /* non-blocking */
            });
        }
      }

      const due = Number(saved?.total ?? totals.payable) || 0;
      const cash = paid ? Math.min(Math.max(Number(paidAmount) || 0, 0), due) : 0;
      if (post && paid && cash > 0.009 && billId) {
        try {
          await billPaymentsApi.create({
            vendor_id: Number(vendorId),
            payment_date: billDate,
            amount: cash,
            payment_method: 'cash',
            reference: reference.trim() || undefined,
            bill_ids: [Number(billId)],
            cash_amounts: [cash],
          });
        } catch (payErr) {
          toast.warning(
            payErr?.response?.data?.message ||
              'Purchase posted. Payment to supplier could not be recorded.',
          );
        }
      }

      const remain = Math.max(0, due - cash);
      toast.success(
        post
          ? paid && cash > 0.009
            ? remain > 0.009
              ? `Posted · paid ${money(cash)} · ${money(remain)} still due to supplier`
              : `Posted & paid ${money(due)} · stock in`
            : `Posted unpaid · ${money(due)} due to supplier · stock in`
          : isEdit
            ? `Draft updated in database · ${payloadLines.length} lines (not posted)`
            : `Draft saved to database · ${payloadLines.length} lines (not posted)`,
      );
      setPayOpen(false);

      if (post) {
        clearReceiveDraft(companyId);
        setDraftSavedAt(null);
        void reloadPharmacyCatalog({ companyId });
      }

      if (post && activeExtractionId) {
        void pharmacyApi
          .updateExtraction(activeExtractionId, { status: 'imported' })
          .catch(() => {
            /* non-blocking */
          });
      }

      if (andNext) {
        if (embedded) {
          onPosted?.({ andNext: true, billId });
          setLines([emptyLine()]);
          setReference('');
          setRemarks('');
          setDocDiscount('0');
          setOtherCharges('0');
          setPurchaseExpense('0');
          setSelectedIdx(0);
          setBillMeta(null);
          focusAfter.current = { type: 'item', index: 0 };
          requestAnimationFrame(() => focusGrnItem(0));
        } else {
          navigate(`/workspace/${companyId}/pharmacy/receive`);
          setLines([emptyLine()]);
          setReference('');
          setRemarks('');
          setDocDiscount('0');
          setOtherCharges('0');
          setPurchaseExpense('0');
          setSelectedIdx(0);
          setBillMeta(null);
          focusAfter.current = { type: 'item', index: 0 };
          requestAnimationFrame(() => focusGrnItem(0));
        }
      } else if (!post) {
        if (billId) {
          setBillMeta((prev) => ({
            ...(prev || {}),
            id: billId,
            status: 'draft',
            isPosted: false,
          }));
          if (!isEdit && !embedded) {
            navigate(`/workspace/${companyId}/pharmacy/receive/${billId}`, { replace: true });
          }
        }
      } else if (embedded) {
        clearScanDraft(companyId);
        onPosted?.({ post: true, billId });
      } else {
        navigate(`/workspace/${companyId}/pharmacy`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Receive failed');
    } finally {
      setSaving(false);
    }
  };

  const openPostConfirm = (andNext = false) => {
    if (saving || !canEditBill) return;
    if (!vendorId) {
      toast.error('Select a supplier');
      return;
    }
    const payloadLines = buildPayloadLines({ draft: false });
    if (!payloadLines.length) {
      toast.error('Add at least one medicine line');
      return;
    }
    const invalidLine = lines.some(
      (l) =>
        l.product_id &&
        (Number(l.quantity) || 0) > 0 &&
        (!lineHasEffectiveBatch(l, pharmacySettings) ||
          !lineHasEffectiveExpiry(l, pharmacySettings)),
    );
    if (invalidLine) {
      toast.error(
        'Batch and expiry required on every line (or set defaults in Pharmacy settings)',
      );
      return;
    }
    if (payloadLines.some((l) => !l.product_id)) {
      toast.error('Link or create every medicine before posting');
      return;
    }
    setPayAndNext(andNext);
    setPayOpen(true);
  };

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const sheetOpen = document.querySelector('[data-pharmacy-pick-sheet][data-state="open"]');
      const payDialogOpen = document.querySelector('[data-purchase-pay-dialog][data-state="open"]');

      if (payDialogOpen) {
        if (e.key === 'F5' || (mod && (key === 'p' || key === 's'))) {
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (sheetOpen) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('pharmacy:close-medicine-sheet', {
              detail: { restoreFocus: !isGrnTypingTarget(e.target) },
            }),
          );
          return;
        }
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (sheetOpen) return;
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const itemSearch = e.target?.closest?.('[data-pharmacy-item-search]');
        const grnField = e.target?.closest?.('[data-grn-field]');
        if (itemSearch || grnField) {
          e.preventDefault();
          e.stopPropagation();
          const row = (itemSearch || grnField).closest('[data-grn-row]');
          const rowIndex =
            row != null ? Number(row.getAttribute('data-grn-row')) : selectedIdx;
          if (Number.isFinite(rowIndex)) {
            navigateGrnItemRow(rowIndex, delta);
          }
          return;
        }
        if (!isGrnTypingTarget(e.target)) {
          e.preventDefault();
          navigateGrnItemRow(selectedIdx, delta);
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        focusNewItemRow();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        openMedicineSheetForRow(selectedIdx);
        return;
      }
      if (
        e.key === '4' &&
        !mod &&
        !e.altKey &&
        !e.shiftKey &&
        !isGrnTypingTarget(e.target)
      ) {
        e.preventDefault();
        openMedicineSheetForRow(selectedIdx);
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        openPostConfirm(true);
        return;
      }
      if (mod && key === 's') {
        e.preventDefault();
        persistReceive({ post: false, andNext: false });
        return;
      }
      if (mod && key === 'p') {
        e.preventDefault();
        openPostConfirm(false);
        return;
      }
      if (mod && key === 'd') {
        const idx = resolveRemoveLineIndex(e.target);
        if (idx == null) return;
        e.preventDefault();
        removeLine(idx);
        return;
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vendorId,
    lines,
    billDate,
    reference,
    warehouseId,
    docDiscount,
    otherCharges,
    purchaseExpense,
    remarks,
    printReceive,
    resolveRemoveLineIndex,
    focusNewItemRow,
    openMedicineSheetForRow,
    selectedIdx,
    navigateGrnItemRow,
  ]);

  const embeddedToolbarActionsRef = useRef(null);
  embeddedToolbarActionsRef.current = {
    saveDraft: () => persistReceive({ post: false }),
    addLine: focusNewItemRow,
    togglePaste: () => setShowPaste((v) => !v),
    print: printReceive,
  };

  useEffect(() => {
    if (!embedded || !onEmbeddedToolbar) return;
    onEmbeddedToolbar({
      saving,
      canEditBill,
      fromInvoiceScan,
      saveDraft: () => embeddedToolbarActionsRef.current?.saveDraft(),
      addLine: () => embeddedToolbarActionsRef.current?.addLine(),
      togglePaste: () => embeddedToolbarActionsRef.current?.togglePaste(),
      print: () => embeddedToolbarActionsRef.current?.print(),
    });
    return () => onEmbeddedToolbar(null);
  }, [embedded, onEmbeddedToolbar, saving, canEditBill, fromInvoiceScan]);

  if (billLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  const unmatchedCount = totals.unmatched || 0;
  const invGst = Number(invGstPercent) || 0;
  const billDateLabel = format(parseISO(billDate), 'dd/MM/yyyy');
  const filledLineCount = totals.count;
  const supplierName = vendors.find((v) => String(v.id) === String(vendorId))?.name || '';
  const defaultBatchLabel = String(pharmacySettings.default_batch_when_missing || '').trim();
  const defaultExpiryLabel = pharmacySettings.default_expiry_when_missing
    ? expiryDisplayMask(pharmacySettings.default_expiry_when_missing)
    : '';
  const hasPurchaseDefaults = Boolean(defaultBatchLabel || defaultExpiryLabel);

  return (
    <div
      className={cn(
        'relative flex w-full flex-col bg-white print:bg-white',
        embedded ? 'min-h-0 flex-1' : 'h-[100dvh]',
      )}
    >
      {embedded ? null : (
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-2.5">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Link to={`/workspace/${companyId}/pharmacy`} aria-label="Back to Operations">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-800 text-white">
              <ShoppingCart className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[16px] font-bold tracking-tight text-slate-900">
                {isEdit ? 'Edit purchase' : 'New purchase'}
              </h1>
              <p className="text-[11px] font-medium text-slate-500">
                {isEdit && billMeta?.number
                  ? `${billMeta.number}${billMeta.isPosted ? ' · Posted' : ' · Draft'}`
                  : 'Supplier invoice · batches · stock'}
              </p>
              {hasPurchaseDefaults ? (
                <p className="mt-0.5 text-[11px] font-medium text-emerald-800">
                  Empty batch/expiry uses defaults:
                  {defaultBatchLabel ? (
                    <span className="ms-1 font-semibold text-slate-800">Batch {defaultBatchLabel}</span>
                  ) : null}
                  {defaultExpiryLabel ? (
                    <span className="ms-1 font-semibold text-slate-800">
                      Expiry {defaultExpiryLabel}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-2">
            {isEdit && billMeta?.isPosted ? (
              <Badge variant="secondary" className="font-normal">
                Posted
              </Badge>
            ) : null}
            {unmatchedCount > 0 ? (
              <Badge variant="outline" className="border-red-200 bg-red-50 font-normal text-red-800">
                {unmatchedCount} not linked
              </Badge>
            ) : verifyCount > 0 ? (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 font-normal text-amber-900">
                {verifyCount} to verify
              </Badge>
            ) : null}
            <PurchaseReceiveMainActions
              saving={saving}
              disabled={!canEditBill}
              onDraft={() => persistReceive({ post: false })}
            />
            <PurchaseReceiveMoreMenu
              companyId={companyId}
              saving={saving}
              disabled={!canEditBill}
              showMatchLegend={fromInvoiceScan}
              onAddLine={focusNewItemRow}
              onPaste={() => setShowPaste((v) => !v)}
              onPrint={printReceive}
            />
          </div>
        </header>
      )}

      {!embedded && fromInvoiceScan ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <p className="text-amber-900">
            Invoice scan imported
            {unmatchedCount > 0 ? (
              <span className="ms-1 font-semibold">· {unmatchedCount} unmatched</span>
            ) : null}
          </p>
          <Button asChild variant="outline" size="sm" className="h-8 bg-white">
            <Link to={`/workspace/${companyId}/pharmacy/purchase-entry`}>Open scan history</Link>
          </Button>
        </div>
      ) : null}

      {!canEditBill ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          This purchase is posted or locked — view only. Cancel the bill from Accounts Payable to make changes.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {invoiceSidebar ? (
          <aside className="hidden w-[min(280px,32%)] shrink-0 lg:flex lg:flex-col">
            {invoiceSidebar}
          </aside>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-slate-200 bg-slate-50/90 px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
              <FieldBlock label="Supplier" required className="xl:col-span-4">
                <SearchableCombobox
                  value={vendorId || undefined}
                  onValueChange={(v) => {
                    if (!canEditBill || v === NEW_SUPPLIER) return;
                    setVendorId(v || '');
                  }}
                  options={vendors.map((v) => ({
                    value: String(v.id),
                    label: v.name,
                    keywords: [v.email, v.currency].filter(Boolean),
                  }))}
                  placeholder={optionsLoading ? 'Loading suppliers…' : 'Select supplier'}
                  searchPlaceholder="Search suppliers…"
                  disabled={optionsLoading || !canEditBill}
                  triggerClassName={cn(headerInputClass, 'font-medium')}
                  className="w-full"
                  contentClassName="min-w-[280px]"
                  actionItems={
                    !canEditBill || !canCreateVendor
                      ? []
                      : [
                          {
                            value: NEW_SUPPLIER,
                            label: '+ Create supplier…',
                            className: 'text-emerald-700 font-medium',
                            onSelect: () => {
                              vendorDialog.openCreate({
                                onSuccess: (vendor) => {
                                  if (!vendor?.id) return;
                                  setVendors((prev) => {
                                    if (prev.some((v) => String(v.id) === String(vendor.id))) {
                                      return prev;
                                    }
                                    return [
                                      ...prev,
                                      {
                                        id: vendor.id,
                                        name: vendor.name,
                                        email: vendor.email,
                                        currency: vendor.currency,
                                      },
                                    ];
                                  });
                                  setVendorId(String(vendor.id));
                                },
                              });
                            },
                          },
                        ]
                  }
                  renderValue={(opt) => (
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <Building2 className="size-3.5 shrink-0 text-slate-400" />
                      {opt?.label || 'Select supplier'}
                    </span>
                  )}
                />
              </FieldBlock>

              <FieldBlock label="Invoice no" className="xl:col-span-2">
                <Input
                  className={headerInputClass}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Supplier invoice #"
                />
              </FieldBlock>

              <FieldBlock label="Remarks" className="xl:col-span-4">
                <Input
                  className={headerInputClass}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional note"
                />
              </FieldBlock>

              <FieldBlock label="Date" className="xl:col-span-2">
                <Input readOnly tabIndex={-1} className={headerInputReadonlyClass} value={billDateLabel} />
              </FieldBlock>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto" data-grn-lines>
            <div
              className={cn(
                'w-full min-w-0 overflow-x-auto border-b border-slate-200 bg-white',
              )}
            >
              <table className="w-full table-fixed border-collapse text-[13px]">
                <colgroup>
                  <col style={{ width: '2rem' }} />
                  <col style={{ width: 'min(22%, 14rem)' }} />
                  <col style={{ width: '4.25rem' }} />
                  <col style={{ width: '4.25rem' }} />
                  <col style={{ width: '3.25rem' }} />
                  <col style={{ width: '3.25rem' }} />
                  <col style={{ width: '4.5rem' }} />
                  <col style={{ width: '3.25rem' }} />
                  <col style={{ width: '4.5rem' }} />
                  <col style={{ width: '5rem' }} />
                  <col style={{ width: '5rem' }} />
                  <col style={{ width: '4.5rem' }} />
                  <col style={{ width: '4rem' }} />
                  <col style={{ width: '4.5rem' }} />
                  <col style={{ width: '4.5rem' }} />
                  <col style={{ width: '2rem' }} />
                </colgroup>
                <thead className="sticky top-0 z-20 shadow-sm">
                  <tr>
                    <GrnTh align="center">#</GrnTh>
                    <GrnTh>Item</GrnTh>
                    <GrnTh align="center">Batch</GrnTh>
                    <GrnTh align="center">Exp</GrnTh>
                    <GrnTh align="center" data-lookup-stop="qty">Qty</GrnTh>
                    <GrnTh align="center">Free</GrnTh>
                    <GrnTh align="right">TP</GrnTh>
                    <GrnTh align="center">Disc</GrnTh>
                    <GrnTh align="right">Disc amt</GrnTh>
                    <GrnTh align="right">Excl</GrnTh>
                    <GrnTh align="right">Incl</GrnTh>
                    <GrnTh align="right">Sale</GrnTh>
                    <GrnTh align="right">Net %</GrnTh>
                    <GrnTh align="right">Net TP</GrnTh>
                    <GrnTh align="right">Tax</GrnTh>
                    <GrnTh align="center" className="w-9 px-0">
                      <span className="sr-only">Remove</span>
                    </GrnTh>
                  </tr>
                </thead>
                <tbody>
                {lines.map((line, index) => {
                  const a = lineAmounts(line, invGst);
                  const exp = expiryTone(line.expiry_date);
                  const filled = Boolean(line.product_id);
                  const isBlank = !filled && !line._needsMatch && !line.name;
                  const editable = filled || line._needsMatch || line._fromOcr;
                  const selected = selectedIdx === index;
                  const billLabel = String(line.supplier_invoice_label || '').trim();
                  const catalogName = filled ? String(line.name || '').trim() : '';
                  const invoiceMatch = Boolean(billLabel || line._fromOcr);
                  const needsVerify = invoiceMatch && receiveLineNeedsVerify(line);
                  const displayName = billLabel || catalogName || line.name || '';
                  const onCellEnter = (e, nextField) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      navigateGrnItemRow(index, e.key === 'ArrowDown' ? 1 : -1);
                      return;
                    }
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    if (nextField === 'next-row') {
                      advanceAfterSale(index);
                      return;
                    }
                    focusGrnField(index, nextField);
                  };

                  return (
                    <tr
                      key={index}
                      data-grn-row={index}
                      onClick={() => {
                        setSelectedIdx(index);
                        if (!isBlank) {
                          requestAnimationFrame(() =>
                            focusGrnFieldByName(index, detectGrnFocusedField()),
                          );
                        }
                      }}
                      className={cn(
                        'group scroll-mt-11 transition-colors',
                        selected ? 'bg-emerald-50/70' : index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white',
                        'hover:bg-emerald-50/40',
                      )}
                    >
                      <GrnTd align="center">
                        <CellText align="center" className="text-slate-500">
                          {index + 1}
                        </CellText>
                      </GrnTd>
                      <GrnTd onClick={(e) => e.stopPropagation()}>
                        <ItemNameSearchCell
                          rowIndex={index}
                          variant="cell"
                          selectedLabel={displayName}
                          selectedProductId={line.product_id || ''}
                          selectedImage={line.image_url || ''}
                          selectedSub={[line.generic, line.strength].filter(Boolean).join(' · ')}
                          billLabel={billLabel}
                          catalogLabel={filled ? catalogName : ''}
                          invoiceMatchMode={invoiceMatch}
                          linked={filled}
                          needsVerify={needsVerify}
                          needsMatch={!filled}
                          highlightUnmatched={invoiceMatch || Boolean(line._needsMatch && !filled)}
                          blockZeroStock={false}
                          keyboardBrowseMode={filled || line._needsMatch || line._fromOcr}
                          autoFocus={isBlank && index === 0 && !fromInvoiceScan}
                          onFocusRow={setSelectedIdx}
                          onNavigateRow={(delta) => navigateGrnItemRow(index, delta)}
                          onSelect={(product, rowIndex) => applyProductToLine(rowIndex, product)}
                          onSubmitRaw={resolveProductTerm}
                          onCreateNew={(rowIndex, ctx) => {
                            const current = lines[rowIndex];
                            const typedName = String(ctx?.typedName || '').trim();
                            productDialog?.openCreate?.({
                              skipTypePicker: true,
                              type: 'inventory',
                              prefill: receiveLineToProductPrefill({
                                ...current,
                                name: typedName || billLabel || current?.name || '',
                              }),
                              onSuccess: (saved) => applyProductToLine(rowIndex, saved),
                            });
                          }}
                          placeholder={
                            billLabel ? billLabel : 'Type item name…'
                          }
                        />
                      </GrnTd>
                      <GrnTd>
                        <Input
                          data-grn-field={`batch-${index}`}
                          data-pharmacy-typing
                          className={cn(PURCHASE_CELL_INPUT, 'placeholder:text-slate-400')}
                          value={line.batch_number}
                          onChange={(e) => updateLine(index, { batch_number: e.target.value })}
                          onKeyDown={(e) => onCellEnter(e, 'expiry')}
                          disabled={!editable}
                          placeholder={
                            defaultBatchLabel && !String(line.batch_number || '').trim()
                              ? defaultBatchLabel
                              : 'Batch'
                          }
                        />
                      </GrnTd>
                      <GrnTd>
                        <ExpiryMaskInput
                          data-grn-field={`expiry-${index}`}
                          className={cn(PURCHASE_CELL_INPUT, 'placeholder:text-slate-400')}
                          value={line.expiry_date}
                          onChange={(masked) => updateLine(index, { expiry_date: masked })}
                          onKeyDown={(e) => onCellEnter(e, 'qty')}
                          disabled={!editable}
                          title={exp.label}
                          placeholder={
                            defaultExpiryLabel && !String(line.expiry_date || '').trim()
                              ? defaultExpiryLabel
                              : 'MM/YY'
                          }
                        />
                      </GrnTd>
                      <GrnTd>
                        <Input
                          data-grn-field={`qty-${index}`}
                          className={PURCHASE_CELL_NUMBER}
                          value={isBlank ? '' : line.quantity}
                          onChange={(e) => updateLine(index, { quantity: e.target.value })}
                          onKeyDown={(e) => onCellEnter(e, 'bonus')}
                          disabled={!editable}
                        />
                      </GrnTd>
                      <GrnTd>
                        <Input
                          data-grn-field={`bonus-${index}`}
                          className={PURCHASE_CELL_NUMBER}
                          value={isBlank ? '' : line.bonus}
                          onChange={(e) => updateLine(index, { bonus: e.target.value })}
                          onKeyDown={(e) => onCellEnter(e, 'rate')}
                          disabled={!editable}
                        />
                      </GrnTd>
                      <GrnTd>
                        <Input
                          data-grn-field={`rate-${index}`}
                          type="number"
                          min={0}
                          step="0.01"
                          className={PURCHASE_CELL_NUMBER}
                          value={isBlank ? '' : line.unit_price}
                          onChange={(e) => updateLine(index, { unit_price: e.target.value })}
                          onKeyDown={(e) => onCellEnter(e, 'disc')}
                          disabled={!editable}
                        />
                      </GrnTd>
                      <GrnTd>
                        <Input
                          data-grn-field={`disc-${index}`}
                          type="number"
                          min={0}
                          step="0.01"
                          className={PURCHASE_CELL_NUMBER}
                          value={isBlank ? '' : line.discount}
                          onChange={(e) =>
                            updateLine(index, { discount: e.target.value, discount_type: 'percent' })
                          }
                          onKeyDown={(e) => onCellEnter(e, 'sale')}
                          disabled={!editable}
                        />
                      </GrnTd>
                      <ReadonlyCell>
                        {!isBlank ? moneyPlain(a.discount) : ''}
                      </ReadonlyCell>
                      <ReadonlyCell>
                        {!isBlank ? moneyPlain(a.totalExc) : ''}
                      </ReadonlyCell>
                      <ReadonlyCell tone="strong">
                        {!isBlank ? moneyPlain(a.totalInc) : ''}
                      </ReadonlyCell>
                      <GrnTd>
                        <Input
                          data-grn-field={`sale-${index}`}
                          type="number"
                          min={0}
                          step="0.01"
                          className={PURCHASE_CELL_NUMBER}
                          value={isBlank ? '' : line.sale_price}
                          onChange={(e) => updateLine(index, { sale_price: e.target.value })}
                          onKeyDown={(e) => onCellEnter(e, 'next-row')}
                          disabled={!editable}
                          title={
                            line.mrp
                              ? `MRP on pack: ${moneyPlain(line.mrp)} (stored on product)`
                              : undefined
                          }
                        />
                      </GrnTd>
                      <ReadonlyCell
                        tone={
                          !isBlank
                            ? a.netMargin >= 0
                              ? 'good'
                              : 'bad'
                            : undefined
                        }
                      >
                        {!isBlank ? a.netMargin.toFixed(1) : ''}
                      </ReadonlyCell>
                      <ReadonlyCell>
                        {!isBlank ? moneyPlain(a.netRate, 2) : ''}
                      </ReadonlyCell>
                      <GrnTd>
                        {line._fromOcr && !isBlank ? (
                          <Input
                            data-grn-field={`tax-${index}`}
                            type="number"
                            min={0}
                            step="0.01"
                            className={cn(PURCHASE_CELL_NUMBER, 'text-[13px]')}
                            value={line.tax_amount}
                            onChange={(e) => updateLine(index, { tax_amount: e.target.value })}
                            onKeyDown={(e) => onCellEnter(e, 'next-row')}
                            disabled={!editable}
                            title="Tax from supplier bill"
                          />
                        ) : (
                          <div className={cn(READONLY_CELL, 'justify-end')}>
                            {!isBlank ? moneyPlain(a.tax) : ''}
                          </div>
                        )}
                      </GrnTd>
                      <GrnTd align="center">
                        {!isBlank ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 text-slate-400 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLine(index);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </GrnTd>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        <aside
          className={cn(
            'flex w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:border-t-0 lg:border-l',
            embedded ? 'lg:w-[300px]' : 'lg:w-[340px]',
          )}
        >
          <div className="shrink-0 border-b border-slate-100 px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-medium text-slate-500">Purchase summary</p>
                <p className="mt-0.5 text-[13px] font-semibold text-slate-900">Payable to supplier</p>
              </div>
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-emerald-100 px-2.5 text-xs font-bold tabular-nums text-emerald-900">
                {filledLineCount}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3">
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat label="Lines" value={filledLineCount} />
              <SummaryStat
                label="Units"
                value={totals.strips || 0}
                sub={totals.unmatched ? `${totals.unmatched} unmatched` : undefined}
              />
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Line totals
              </p>
              <div className="space-y-0.5">
                <SummaryMoneyRow label="Subtotal" value={moneyPlain(totals.subtotal)} />
                {totals.lineDiscount > 0 ? (
                  <SummaryMoneyRow
                    label="Line discount"
                    value={`− ${moneyPlain(totals.lineDiscount)}`}
                    accent
                  />
                ) : null}
                <SummaryMoneyRow label="Sales tax (lines)" value={moneyPlain(totals.tax)} />
                {totals.saleTotal > 0 ? (
                  <SummaryMoneyRow
                    label="Retail value"
                    value={moneyPlain(totals.saleTotal)}
                    muted
                  />
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Document adjustments
              </p>
              <p className="mb-2.5 text-[10px] text-slate-500">
                Optional — advance tax &amp; header discounts (not from invoice scan)
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <SummaryAdjustField label="Inc GST %">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className={summaryAdjustInputClass}
                    value={invGstPercent}
                    onChange={(e) => setInvGstPercent(e.target.value)}
                    disabled={!canEditBill}
                  />
                </SummaryAdjustField>
                <SummaryAdjustField label="Advance tax">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className={summaryAdjustInputClass}
                    value={advIncomeTax}
                    onChange={(e) => setAdvIncomeTax(e.target.value)}
                    disabled={!canEditBill}
                  />
                </SummaryAdjustField>
                <SummaryAdjustField label="Disc %">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className={summaryAdjustInputClass}
                    value={docDiscPercent}
                    onChange={(e) => setDocDiscPercent(e.target.value)}
                    disabled={!canEditBill}
                  />
                </SummaryAdjustField>
                <SummaryAdjustField label="Flat disc">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className={summaryAdjustInputClass}
                    value={docDiscount}
                    onChange={(e) => setDocDiscount(e.target.value)}
                    disabled={!canEditBill}
                  />
                </SummaryAdjustField>
                <SummaryAdjustField label="Misc (+)" className="col-span-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className={summaryAdjustInputClass}
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    disabled={!canEditBill}
                  />
                </SummaryAdjustField>
              </div>
              {(totals.pctDisc > 0 ||
                totals.headerDiscount > 0 ||
                totals.docIncGst > 0 ||
                totals.advTax > 0 ||
                totals.misc > 0) && (
                <div className="mt-3 space-y-0.5 border-t border-slate-100 pt-2">
                  {totals.pctDisc > 0 ? (
                    <SummaryMoneyRow
                      label="Header disc %"
                      value={`− ${moneyPlain(totals.pctDisc)}`}
                      accent
                    />
                  ) : null}
                  {totals.headerDiscount > 0 ? (
                    <SummaryMoneyRow
                      label="Flat discount"
                      value={`− ${moneyPlain(totals.headerDiscount)}`}
                      accent
                    />
                  ) : null}
                  {totals.docIncGst > 0 ? (
                    <SummaryMoneyRow
                      label={`Inc GST (${invGstPercent}%)`}
                      value={moneyPlain(totals.docIncGst)}
                    />
                  ) : null}
                  {totals.advTax > 0 ? (
                    <SummaryMoneyRow label="Advance tax" value={moneyPlain(totals.advTax)} />
                  ) : null}
                  {totals.misc > 0 ? (
                    <SummaryMoneyRow label="Misc charges" value={moneyPlain(totals.misc)} />
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-t border-slate-100 bg-white p-4">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3.5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/70">
                    Grand total
                  </p>
                  {totals.avgPrice > 0 ? (
                    <p className="mt-1 text-[11px] text-emerald-800/60">
                      Avg {moneyPlain(totals.avgPrice)} / unit
                    </p>
                  ) : null}
                </div>
                <p className="text-2xl font-bold tabular-nums leading-none tracking-tight text-emerald-950">
                  {money(totals.payable)}
                </p>
              </div>
            </div>

            <Button
              type="button"
              className="h-11 w-full bg-emerald-700 font-semibold hover:bg-emerald-800"
              disabled={saving || !canEditBill}
              onClick={() => openPostConfirm(true)}
            >
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Post &amp; next
              <PharmacyKbd className="ms-2 border-emerald-500/30 bg-emerald-600/20 text-white">F5</PharmacyKbd>
            </Button>
          </div>
        </aside>
        </div>
      </div>

      {!embedded ? (
      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 py-2 text-[11px] text-slate-500">
        <span>
          {filledLineCount} line{filledLineCount === 1 ? '' : 's'} · Use <PharmacyKbd>⋯</PharmacyKbd> menu for
          paste, import &amp; shortcuts
          {!isEdit && draftSavedAt ? (
            <span className="ms-2 text-emerald-700">
              · Draft saved locally {formatDraftSavedAt(draftSavedAt)}
            </span>
          ) : null}
        </span>
        <span className="tabular-nums font-medium text-slate-700">{money(totals.payable)}</span>
      </footer>
      ) : null}

      <PurchasePayDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        due={totals.payable}
        supplierName={supplierName}
        formatMoney={money}
        saving={saving}
        andNext={payAndNext}
        onConfirm={({ paid, amount, andNext }) => {
          persistReceive({
            post: true,
            andNext,
            paid,
            paidAmount: amount,
          });
        }}
      />

      {showPaste ? (
        <div className="fixed bottom-6 end-4 z-40 w-full max-w-xl sm:end-6">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <p className="text-sm font-semibold">Paste from Excel / CSV</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Columns: name/sku · qty · batch · expiry · cost · mrp
              </p>
              <textarea
                ref={pasteRef}
                data-pharmacy-typing
                className="mt-3 w-full min-h-[120px] rounded-lg border border-input bg-background p-3 text-xs font-mono shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                placeholder={'PANADOL 500\t10\tB102\t12/26\t70\t75'}
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowPaste(false)}>
                  Close
                </Button>
                <Button type="button" size="sm" onClick={applyPaste}>
                  Match &amp; apply
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
