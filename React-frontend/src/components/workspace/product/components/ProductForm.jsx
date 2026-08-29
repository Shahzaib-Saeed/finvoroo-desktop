import { useMemo, useState } from 'react';
import {
  Box,
  ChevronDown,
  Factory,
  FlaskConical,
  ImagePlus,
  Layers,
  Loader2,
  Package,
  Save,
  Sprout,
  Wrench,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CreateAccountDialog } from '@/components/workspace/create-account-dialog';
import { productTracksStock, PRODUCT_NAME_MAX_LENGTH, PRODUCT_TYPE_HINTS, PRODUCT_TYPE_SHORT } from '../constants';
import { ProductMetadataFields } from './ProductMetadataFields';
import { ProductUnitsSection } from './ProductUnitsSection';
import { ProductBasicsStep } from './ProductBasicsStep';
import { ProductTypePickerDialog } from './ProductTypePickerDialog';
import { ProductVariantsSection } from './ProductVariantsSection';
import { ProductVariantsSummary } from './ProductVariantsSummary';
import { PharmacyProductSection } from './PharmacyProductSection';
import { MedicineFormEssentials } from './MedicineFormEssentials';
import { PharmacyMedicineAdvanced } from './PharmacyMedicineAdvanced';
import { QuickBrandDialog, QuickCategoryDialog, QuickUnitDialog } from './QuickCreateDialogs';
import { useAuthStore } from '@/store/authStore';
import { resolveIndustryFeatures } from '@/industries/resolve';
import { PHARMACY_COPY } from '@/industries/pharmacy/copy';

const NEW_ITEM_CLASS = 'text-primary font-medium';

const TYPE_ICONS = {
  finished_good: FlaskConical,
  manufactured: Wrench,
  raw_material: Sprout,
  inventory: Layers,
  non_inventory: Package,
  service: Factory,
};

function SheetSection({ title, children, className }) {
  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Collapsed-by-default advanced block for the product sheet. */
function AccordionBlock({
  id,
  title,
  summary,
  open,
  onToggle,
  children,
}) {
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/20 -mx-1 px-1 rounded-md"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-slate-800">{title}</span>
          {summary && !open ? (
            <span className="mt-0.5 block text-xs text-slate-500 truncate">{summary}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? <div className="pb-4 pt-0.5 space-y-3">{children}</div> : null}
    </div>
  );
}

function FormSection({ title, description, children, className, flush = false }) {
  return (
    <section className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      <div className="border-b bg-muted/20 px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      <div className={cn(flush ? '' : 'p-4 space-y-3')}>{children}</div>
    </section>
  );
}

function ProductTypeSelect({ value, onChange, typeOptions = {}, disabled = false }) {
  const entries = Object.keys(typeOptions).length
    ? Object.entries(typeOptions)
    : Object.entries({
        inventory: 'Inventory Product',
        non_inventory: 'Non-Inventory Product',
        service: 'Service',
      });

  const Icon = TYPE_ICONS[value] || Box;
  const short = PRODUCT_TYPE_SHORT[value] || value?.replace(/_/g, ' ');
  const hint = PRODUCT_TYPE_HINTS[value] || '';

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-auto min-h-[2.75rem] py-2 px-3">
        <div className="flex w-full items-center gap-3 text-left">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium capitalize">{short}</span>
            {hint ? (
              <span className="block text-xs text-muted-foreground leading-snug">{hint}</span>
            ) : null}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent align="start" className="max-h-[min(320px,70vh)]">
        {entries.map(([key, label]) => {
          const ItemIcon = TYPE_ICONS[key] || Box;
          const itemShort = PRODUCT_TYPE_SHORT[key] || label;
          const itemHint = PRODUCT_TYPE_HINTS[key] || '';
          return (
            <SelectItem key={key} value={key} className="py-2.5">
              <span className="flex items-start gap-2.5">
                <ItemIcon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">{itemShort}</span>
                  {itemHint ? (
                    <span className="block text-xs text-muted-foreground">{itemHint}</span>
                  ) : null}
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function ProductImageUpload({ imagePreview, setImageFile, clearImage, inputId = 'product-image-upload' }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex min-h-[220px] items-center justify-center rounded-lg border border-dashed bg-muted/10 p-4">
        {imagePreview ? (
          <>
            <img
              src={imagePreview}
              alt="Product"
              className="max-h-[240px] w-full rounded-md object-contain"
            />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 size-8 shadow-sm"
              onClick={clearImage}
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            <ImagePlus className="mx-auto mb-2 size-12 opacity-35" />
            <p className="text-sm font-medium text-foreground/80">Product photo</p>
            <p className="mt-1 text-xs">Optional catalog image</p>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor={inputId} className="sr-only">
          Upload image
        </Label>
        <Button type="button" variant="outline" size="sm" className="w-full" asChild>
          <label htmlFor={inputId} className="cursor-pointer">
            {imagePreview ? 'Replace image' : 'Upload image'}
          </label>
        </Button>
        <Input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setImageFile?.(file);
            e.target.value = '';
          }}
        />
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          JPEG, PNG, WebP or GIF · Max 4 MB
        </p>
      </div>
    </div>
  );
}

function Field({ label, required, error, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function LookupSelect({
  value,
  onChange,
  placeholder,
  showNone = true,
  noneValue = '_none',
  noneLabel = 'None',
  options = [],
  optionValue = (o) => String(o.id ?? o.value),
  optionLabel = (o) => o.name ?? o.label,
  newValue,
  newLabel,
  onNew,
  selectKey,
  fallbackLabel,
}) {
  const normalized = value ? String(value) : '';
  const current = normalized || (showNone ? noneValue : '');

  const mergedOptions = useMemo(() => {
    const base = [...options];
    if (
      normalized &&
      normalized !== noneValue &&
      normalized !== newValue &&
      !base.some((o) => optionValue(o) === normalized)
    ) {
      base.push({
        id: normalized,
        value: normalized,
        name: fallbackLabel || normalized,
        label: fallbackLabel || normalized,
      });
    }
    return base;
  }, [options, normalized, noneValue, newValue, optionValue, fallbackLabel]);

  return (
    <Select
      key={selectKey ? `${selectKey}-${current}` : undefined}
      value={current || undefined}
      onValueChange={(v) => {
        if (v === newValue) {
          onNew?.();
          return;
        }
        if (showNone && v === noneValue) {
          onChange('');
          return;
        }
        onChange(v);
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showNone && noneLabel != null && <SelectItem value={noneValue}>{noneLabel}</SelectItem>}
        {newLabel && (
          <SelectItem value={newValue} className={NEW_ITEM_CLASS}>
            {newLabel}
          </SelectItem>
        )}
        {mergedOptions.map((o) => {
          const optVal = optionValue(o);
          return (
            <SelectItem key={optVal} value={optVal}>
              {optionLabel(o)}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function AccountSelect({ accounts, value, onChange, onNewAccount, selectKey, fallbackLabel }) {
  const normalized = value ? String(value) : '';
  const current = normalized || '_none';

  const mergedAccounts = useMemo(() => {
    const base = [...(accounts || [])];
    if (normalized && !base.some((a) => String(a.id) === normalized)) {
      base.push({
        id: normalized,
        code: '',
        name: fallbackLabel || `Account #${normalized}`,
      });
    }
    return base;
  }, [accounts, normalized, fallbackLabel]);

  return (
    <Select
      key={selectKey ? `${selectKey}-${current}` : undefined}
      value={current}
      onValueChange={(v) => {
        if (v === '__new_account__') {
          onNewAccount?.();
          return;
        }
        onChange(v === '_none' ? '' : v);
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Company default" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">Company default</SelectItem>
        <SelectItem value="__new_account__" className={NEW_ITEM_CLASS}>
          + New account…
        </SelectItem>
        {mergedAccounts.map((a) => (
          <SelectItem key={a.id} value={String(a.id)}>
            {a.code ? `${a.code} — ${a.name}` : a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProductForm({
  variant = 'page',
  open = true,
  onOpenChange,
  form,
  errors,
  saving,
  loadingLookups,
  loadingProduct = false,
  lookups,
  isEdit,
  imagePreview,
  setField,
  setMetadataField,
  setUnitConversions,
  setImageFile,
  clearImage,
  onSubmit,
  onCancel,
  refreshCategory,
  refreshBrand,
  refreshUnit,
  refreshAccountList,
  refreshTax,
  selectRevision = 0,
  handleBaseUnitChange,
  pickedType = null,
}) {
  const [quickCat, setQuickCat] = useState(false);
  const [lastCreatedLabels, setLastCreatedLabels] = useState({});
  const [quickBrand, setQuickBrand] = useState(false);
  const [quickUnit, setQuickUnit] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pendingAccountField, setPendingAccountField] = useState(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [variantsPanelOpen, setVariantsPanelOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    units: false,
    inventory: false,
    accounting: false,
    physical: false,
    notes: false,
    custom: false,
    pharmacy: false,
    medicineAdvanced: false,
  });

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeCompany = useAuthStore((s) => s.activeCompany);
  const industryFeatures = resolveIndustryFeatures(activeCompany);
  const showPharmacy =
    !!industryFeatures.pharmacy_shell ||
    !!industryFeatures.barcode ||
    !!industryFeatures.pharmacy_clinical;

  const tracks = productTracksStock(form.type);
  const isSheet = variant === 'sheet' || variant === 'dialog';
  const TypeIcon = TYPE_ICONS[form.type] || Box;
  const typeLabel = PRODUCT_TYPE_SHORT[form.type] || form.type?.replace(/_/g, ' ');
  const showTypeChip = isSheet && !isEdit && Boolean(pickedType);
  const baseUnitKey = form.unit || 'pcs';
  const baseUnitLabel = useMemo(() => {
    const match = (lookups.unit_options || []).find((u) => u.value === baseUnitKey);
    const raw = match?.label || lastCreatedLabels.unit || baseUnitKey;
    // Never show "Name (1 Name = 1 Pieces)" or raw "u:91" in the UI.
    if (/^u:\d+$/i.test(String(raw))) return lastCreatedLabels.unit || 'Unit';
    const cut = String(raw).indexOf(' (');
    return cut > 0 ? String(raw).slice(0, cut).trim() : String(raw);
  }, [lookups.unit_options, baseUnitKey, lastCreatedLabels.unit]);

  const openNewAccount = (fieldKey) => {
    setPendingAccountField(fieldKey);
    setAccountDialogOpen(true);
  };

  const categorySelect = (
    <LookupSelect
      value={form.category_id}
      onChange={(v) => setField('category_id', v)}
      placeholder="None"
      options={lookups.categories || []}
      newValue="__new_category__"
      newLabel="+ New category…"
      onNew={() => setQuickCat(true)}
      selectKey={`cat-${selectRevision}`}
      fallbackLabel={lastCreatedLabels.category}
    />
  );

  const brandSelect = (
    <LookupSelect
      value={form.brand_id}
      onChange={(v) => setField('brand_id', v)}
      placeholder="None"
      options={lookups.brands || []}
      newValue="__new_brand__"
      newLabel="+ New brand…"
      onNew={() => setQuickBrand(true)}
      selectKey={`brand-${selectRevision}`}
      fallbackLabel={lastCreatedLabels.brand}
    />
  );

  const unitsBlock = typeof setUnitConversions === 'function' ? (
    <ProductUnitsSection
      baseUnit={baseUnitKey}
      baseUnitLabel={baseUnitLabel}
      unitOptions={lookups.unit_options || []}
      rows={form.product_unit_conversions || []}
      onBaseUnitChange={handleBaseUnitChange || ((v) => setField('unit', v))}
      onRowsChange={setUnitConversions}
      onBaseUnitCreated={async (created) => {
        const label = created?.label || created?.name;
        if (label) setLastCreatedLabels((l) => ({ ...l, unit: label }));
        await refreshUnit?.(created);
      }}
      disabled={saving}
      selectKey={`unit-${selectRevision}`}
      fallbackBaseLabel={lastCreatedLabels.unit}
    />
  ) : (
    <Field label="Base unit" required>
      <LookupSelect
        showNone={false}
        value={baseUnitKey}
        onChange={handleBaseUnitChange || ((v) => setField('unit', v))}
        options={lookups.unit_options || []}
        optionValue={(o) => o.value}
        optionLabel={(o) => o.label}
        newValue="__new_unit__"
        newLabel="+ Create new unit"
        onNew={() => setQuickUnit(true)}
        selectKey={`unit-${selectRevision}`}
        fallbackLabel={lastCreatedLabels.unit}
      />
    </Field>
  );

  const formBody =
    loadingLookups || loadingProduct ? (
      isSheet ? (
        <SheetBody className="flex flex-1 items-center justify-center min-h-[40vh]">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </SheetBody>
      ) : (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )
    ) : (
      <form
        id={isSheet ? 'product-sheet-form' : undefined}
        onSubmit={onSubmit}
        className={cn(
          isSheet ? 'flex flex-col flex-1 min-h-0' : 'space-y-5 pb-2',
          isSheet &&
            '[&_input:not([type=file])]:h-9 [&_[data-slot=select-trigger]]:h-9',
        )}
      >
        {isSheet ? (
          <SheetBody className="min-h-0 flex-1 overflow-y-auto bg-background px-6 py-0">
            {/* Essentials — first viewport */}
            <div className="py-4 space-y-4">
              {showPharmacy ? (
                <MedicineFormEssentials
                  form={form}
                  errors={errors}
                  setField={setField}
                  saving={saving}
                  isEdit={isEdit}
                  taxRates={lookups.tax_rates || []}
                  barcodeAutoFocus={!isEdit}
                  onTaxCreated={refreshTax}
                  imagePreview={imagePreview}
                  setImageFile={setImageFile}
                  clearImage={clearImage}
                />
              ) : (
                <SheetSection title="Basics">
                  <ProductBasicsStep
                    variant="sheet"
                    form={form}
                    errors={errors}
                    isEdit={isEdit}
                    tracks={tracks}
                    saving={saving}
                    imagePreview={imagePreview}
                    setImageFile={setImageFile}
                    clearImage={clearImage}
                    inputId="product-sheet-image-upload"
                    setField={setField}
                    categorySelect={categorySelect}
                    brandSelect={brandSelect}
                    typeField={
                      isEdit ? (
                        <Field label="Product type" required error={errors.type}>
                          <ProductTypeSelect
                            value={form.type}
                            onChange={(v) => setField('type', v)}
                            typeOptions={lookups.type_options}
                            disabled={saving}
                          />
                        </Field>
                      ) : null
                    }
                    afterIdentity={
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-0.5">
                        <Field label="Sell price" required error={errors.unit_price}>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.unit_price}
                            onChange={(e) => setField('unit_price', e.target.value)}
                          />
                        </Field>
                        <Field label="Cost">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.purchase_price}
                            onChange={(e) => setField('purchase_price', e.target.value)}
                          />
                        </Field>
                        <Field label="Tax" className="sm:col-span-2 lg:col-span-1">
                          <Select
                            value={form.tax_rate_id || '_none'}
                            onValueChange={(v) => setField('tax_rate_id', v === '_none' ? '' : v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">No tax</SelectItem>
                              {lookups.tax_rates?.map((t) => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    }
                  />
                </SheetSection>
              )}

              {!showPharmacy && tracks ? (
                <ProductVariantsSummary
                  enabled={!!form.has_variants}
                  onEnabledChange={(v) => {
                    setField('has_variants', v);
                    if (!v) {
                      setField('variant_matrix_attributes', []);
                      setField('variants', []);
                      setVariantsPanelOpen(false);
                    } else {
                      setVariantsPanelOpen(true);
                    }
                  }}
                  form={form}
                  disabled={saving}
                  onManage={() => setVariantsPanelOpen(true)}
                />
              ) : null}
            </div>

            {/* Advanced — collapsed by default */}
            <div className="border-t border-border/70 pb-6">
              <p className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                {showPharmacy ? 'Advanced' : 'More details'}
              </p>

              {showPharmacy ? (
                <AccordionBlock
                  id="medicineAdvanced"
                  title="More details"
                  summary="Brand, manufacturer, Rx, barcodes"
                  open={openSections.medicineAdvanced}
                  onToggle={toggleSection}
                >
                  <PharmacyMedicineAdvanced
                    form={form}
                    setField={setField}
                    disabled={saving}
                    brandSelect={brandSelect}
                  />
                </AccordionBlock>
              ) : null}

              <AccordionBlock
                id="units"
                title="Units of measure"
                summary={`${baseUnitLabel}${
                  (form.product_unit_conversions || []).filter((r) => r.unit_key).length
                    ? ` · ${(form.product_unit_conversions || []).filter((r) => r.unit_key).length} pack size(s)`
                    : ''
                }`}
                open={openSections.units}
                onToggle={toggleSection}
              >
                {unitsBlock}
              </AccordionBlock>

              {tracks && !showPharmacy ? (
                <AccordionBlock
                  id="inventory"
                  title="Inventory"
                  summary={
                    form.reorder_level !== '' && form.reorder_level != null
                      ? `Reorder ${form.reorder_level}`
                      : 'Warehouse, reorder, costing'
                  }
                  open={openSections.inventory}
                  onToggle={toggleSection}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Field label="Reorder level">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={form.reorder_level}
                        onChange={(e) => setField('reorder_level', e.target.value)}
                      />
                    </Field>
                    <Field label="Default warehouse">
                      <Select
                        value={form.default_warehouse_id || '_none'}
                        onValueChange={(v) =>
                          setField('default_warehouse_id', v === '_none' ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Main warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Company main warehouse</SelectItem>
                          {lookups.warehouses?.map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Costing method" className="sm:col-span-2">
                      <Select
                        value={form.costing_method || '_default'}
                        onValueChange={(v) =>
                          setField('costing_method', v === '_default' ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_default">
                            Use company default ({lookups.company_inventory_model})
                          </SelectItem>
                          <SelectItem value="fifo">FIFO</SelectItem>
                          <SelectItem value="lifo">LIFO</SelectItem>
                          <SelectItem value="average">Weighted average</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </AccordionBlock>
              ) : null}

              <AccordionBlock
                id="accounting"
                title="Accounting"
                summary="GL income, expense, and inventory accounts"
                open={openSections.accounting}
                onToggle={toggleSection}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Field label="Income / revenue">
                    <AccountSelect
                      accounts={lookups.revenue_accounts}
                      value={form.income_account_id}
                      onChange={(v) => setField('income_account_id', v)}
                      onNewAccount={() => openNewAccount('income_account_id')}
                      selectKey={`income-${selectRevision}`}
                      fallbackLabel={lastCreatedLabels.income_account_id}
                    />
                  </Field>
                  {tracks ? (
                    <Field label="COGS">
                      <AccountSelect
                        accounts={lookups.expense_accounts}
                        value={form.cogs_account_id}
                        onChange={(v) => setField('cogs_account_id', v)}
                        onNewAccount={() => openNewAccount('cogs_account_id')}
                        selectKey={`cogs-${selectRevision}`}
                        fallbackLabel={lastCreatedLabels.cogs_account_id}
                      />
                    </Field>
                  ) : (
                    <Field label="Purchase expense">
                      <AccountSelect
                        accounts={lookups.expense_accounts}
                        value={form.expense_account_id}
                        onChange={(v) => setField('expense_account_id', v)}
                        onNewAccount={() => openNewAccount('expense_account_id')}
                        selectKey={`expense-${selectRevision}`}
                        fallbackLabel={lastCreatedLabels.expense_account_id}
                      />
                    </Field>
                  )}
                  {tracks ? (
                    <Field label="Inventory asset" className="sm:col-span-2">
                      <AccountSelect
                        accounts={lookups.asset_accounts}
                        value={form.inventory_asset_account_id}
                        onChange={(v) => setField('inventory_asset_account_id', v)}
                        onNewAccount={() => openNewAccount('inventory_asset_account_id')}
                        selectKey={`asset-${selectRevision}`}
                        fallbackLabel={lastCreatedLabels.inventory_asset_account_id}
                      />
                    </Field>
                  ) : null}
                </div>
              </AccordionBlock>

              {tracks ? (
                <AccordionBlock
                  id="physical"
                  title="Physical details"
                  summary={
                    [form.manufacturer, form.mpn, form.weight_kg ? `${form.weight_kg} kg` : null]
                      .filter(Boolean)
                      .join(' · ') || 'Manufacturer, MPN, weight'
                  }
                  open={openSections.physical}
                  onToggle={toggleSection}
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Manufacturer">
                      <Input
                        value={form.manufacturer}
                        onChange={(e) => setField('manufacturer', e.target.value)}
                      />
                    </Field>
                    <Field label="MPN">
                      <Input value={form.mpn} onChange={(e) => setField('mpn', e.target.value)} />
                    </Field>
                    <Field label="Weight (kg)">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={form.weight_kg}
                        onChange={(e) => setField('weight_kg', e.target.value)}
                      />
                    </Field>
                    <Field label="Dimensions">
                      <Input
                        value={form.dimensions}
                        onChange={(e) => setField('dimensions', e.target.value)}
                      />
                    </Field>
                  </div>
                </AccordionBlock>
              ) : null}

              <AccordionBlock
                id="notes"
                title="Notes"
                summary={
                  form.description || form.internal_notes
                    ? 'Description added'
                    : 'Description and internal notes'
                }
                open={openSections.notes}
                onToggle={toggleSection}
              >
                <div className="grid grid-cols-1 gap-2.5">
                  <Field label="Description">
                    <Textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                    />
                  </Field>
                  <Field label="Internal notes">
                    <Textarea
                      rows={2}
                      value={form.internal_notes}
                      onChange={(e) => setField('internal_notes', e.target.value)}
                    />
                  </Field>
                </div>
              </AccordionBlock>

              {lookups.custom_field_definitions?.length > 0 ? (
                <AccordionBlock
                  id="custom"
                  title="Custom fields"
                  summary={`${lookups.custom_field_definitions.length} field(s)`}
                  open={openSections.custom}
                  onToggle={toggleSection}
                >
                  <ProductMetadataFields
                    definitions={lookups.custom_field_definitions}
                    values={form.product_metadata_custom_fields}
                    onChange={setMetadataField}
                    errors={errors}
                  />
                </AccordionBlock>
              ) : null}
            </div>
          </SheetBody>
        ) : (
          <div className="space-y-4">
            <div
              className={cn(
                'grid gap-5',
                tracks && 'xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]',
              )}
            >
              <div className="space-y-4 min-w-0">
                <FormSection title="Identity">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Name" required error={errors.name} className="sm:col-span-2">
                      <Input
                        value={form.name}
                        maxLength={isEdit ? undefined : PRODUCT_NAME_MAX_LENGTH}
                        onChange={(e) => setField('name', e.target.value)}
                        placeholder="Product name"
                      />
                      <p className="text-xs text-muted-foreground text-right tabular-nums">
                        {form.name.length}
                        {!isEdit && `/${PRODUCT_NAME_MAX_LENGTH}`}
                      </p>
                    </Field>
                    <Field label="SKU" error={errors.sku}>
                      <Input value={form.sku} onChange={(e) => setField('sku', e.target.value)} placeholder="AUTO" />
                    </Field>
                    <Field label="Barcode" error={errors.barcode}>
                      <Input value={form.barcode} onChange={(e) => setField('barcode', e.target.value)} />
                    </Field>
                    <Field label="Product type" required error={errors.type} className="sm:col-span-2">
                      <ProductTypeSelect
                        value={form.type}
                        onChange={(v) => setField('type', v)}
                        typeOptions={lookups.type_options}
                        disabled={saving}
                      />
                    </Field>
                    <div className="flex items-center gap-2 sm:col-span-2 rounded-md border bg-muted/20 px-3 py-2.5">
                      <Switch checked={form.is_active} onCheckedChange={(v) => setField('is_active', v)} />
                      <Label className="text-sm font-medium">Active product</Label>
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Classification">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Category">{categorySelect}</Field>
                    <Field label="Brand">{brandSelect}</Field>
                  </div>
                </FormSection>
              </div>

              {tracks ? (
                <FormSection title="Image" className="h-fit lg:sticky lg:top-0">
                  <ProductImageUpload
                    imagePreview={imagePreview}
                    setImageFile={setImageFile}
                    clearImage={clearImage}
                    inputId="product-image-upload"
                  />
                </FormSection>
              ) : null}
            </div>

            <div className="space-y-4">
              <FormSection
                title="Units of measure"
                description="How you stock this product and optional pack sizes for sales."
                flush
              >
                {unitsBlock}
              </FormSection>

              {tracks ? (
                <FormSection title="Physical details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Manufacturer">
                      <Input value={form.manufacturer} onChange={(e) => setField('manufacturer', e.target.value)} />
                    </Field>
                    <Field label="MPN">
                      <Input value={form.mpn} onChange={(e) => setField('mpn', e.target.value)} />
                    </Field>
                    <Field label="Weight (kg)">
                      <Input type="number" min={0} step="any" value={form.weight_kg} onChange={(e) => setField('weight_kg', e.target.value)} />
                    </Field>
                    <Field label="Dimensions">
                      <Input value={form.dimensions} onChange={(e) => setField('dimensions', e.target.value)} />
                    </Field>
                  </div>
                </FormSection>
              ) : null}

              <FormSection title="Pricing & tax">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Selling price" required error={errors.unit_price}>
                    <Input type="number" min={0} step="0.01" value={form.unit_price} onChange={(e) => setField('unit_price', e.target.value)} />
                  </Field>
                  <Field label="Purchase / cost">
                    <Input type="number" min={0} step="0.01" value={form.purchase_price} onChange={(e) => setField('purchase_price', e.target.value)} />
                  </Field>
                  <Field label="Tax rate">
                    <Select value={form.tax_rate_id || '_none'} onValueChange={(v) => setField('tax_rate_id', v === '_none' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="No tax" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">No tax</SelectItem>
                        {lookups.tax_rates?.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name} ({t.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {showPharmacy ? (
                    <>
                      <Field label="MRP">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.mrp ?? ''}
                          onChange={(e) => setField('mrp', e.target.value)}
                        />
                      </Field>
                      <Field label="Wholesale">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.wholesale_price ?? ''}
                          onChange={(e) => setField('wholesale_price', e.target.value)}
                        />
                      </Field>
                    </>
                  ) : null}
                </div>
              </FormSection>

              {showPharmacy ? (
                <FormSection
                  title="Pharmacy"
                  description="Clinical attributes, multi-barcode, and stock policy for medicines."
                >
                  <PharmacyProductSection form={form} setField={setField} errors={errors} disabled={saving} />
                </FormSection>
              ) : null}

              {tracks ? (
                <FormSection title="Inventory">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Reorder level">
                      <Input type="number" min={0} step="any" value={form.reorder_level} onChange={(e) => setField('reorder_level', e.target.value)} />
                    </Field>
                    <Field label="Default warehouse">
                      <Select
                        value={form.default_warehouse_id || '_none'}
                        onValueChange={(v) => setField('default_warehouse_id', v === '_none' ? '' : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Main warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Company main warehouse</SelectItem>
                          {lookups.warehouses?.map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Costing method" className="sm:col-span-2">
                      <Select value={form.costing_method || '_default'} onValueChange={(v) => setField('costing_method', v === '_default' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_default">Use company default ({lookups.company_inventory_model})</SelectItem>
                          <SelectItem value="fifo">FIFO</SelectItem>
                          <SelectItem value="lifo">LIFO</SelectItem>
                          <SelectItem value="average">Weighted average</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </FormSection>
              ) : null}

              <FormSection title="Accounting (GL)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Income / revenue">
                    <AccountSelect
                      accounts={lookups.revenue_accounts}
                      value={form.income_account_id}
                      onChange={(v) => setField('income_account_id', v)}
                      onNewAccount={() => openNewAccount('income_account_id')}
                      selectKey={`income-${selectRevision}`}
                      fallbackLabel={lastCreatedLabels.income_account_id}
                    />
                  </Field>
                  {tracks ? (
                    <Field label="COGS">
                      <AccountSelect
                        accounts={lookups.expense_accounts}
                        value={form.cogs_account_id}
                        onChange={(v) => setField('cogs_account_id', v)}
                        onNewAccount={() => openNewAccount('cogs_account_id')}
                        selectKey={`cogs-${selectRevision}`}
                        fallbackLabel={lastCreatedLabels.cogs_account_id}
                      />
                    </Field>
                  ) : (
                    <Field label="Purchase expense">
                      <AccountSelect
                        accounts={lookups.expense_accounts}
                        value={form.expense_account_id}
                        onChange={(v) => setField('expense_account_id', v)}
                        onNewAccount={() => openNewAccount('expense_account_id')}
                        selectKey={`expense-${selectRevision}`}
                        fallbackLabel={lastCreatedLabels.expense_account_id}
                      />
                    </Field>
                  )}
                  {tracks ? (
                    <Field label="Inventory asset" className="sm:col-span-2">
                      <AccountSelect
                        accounts={lookups.asset_accounts}
                        value={form.inventory_asset_account_id}
                        onChange={(v) => setField('inventory_asset_account_id', v)}
                        onNewAccount={() => openNewAccount('inventory_asset_account_id')}
                        selectKey={`asset-${selectRevision}`}
                        fallbackLabel={lastCreatedLabels.inventory_asset_account_id}
                      />
                    </Field>
                  ) : null}
                </div>
              </FormSection>

              <FormSection title="Notes">
                <div className="grid grid-cols-1 gap-3">
                  <Field label="Description">
                    <Textarea rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} />
                  </Field>
                  <Field label="Internal notes">
                    <Textarea rows={2} value={form.internal_notes} onChange={(e) => setField('internal_notes', e.target.value)} />
                  </Field>
                </div>
              </FormSection>

              {lookups.custom_field_definitions?.length > 0 ? (
                <FormSection title="Custom fields">
                  <ProductMetadataFields
                    definitions={lookups.custom_field_definitions}
                    values={form.product_metadata_custom_fields}
                    onChange={setMetadataField}
                    errors={errors}
                  />
                </FormSection>
              ) : null}
            </div>
          </div>
        )}

        {isSheet ? (
          <SheetFooter className="shrink-0 border-t bg-background px-6 py-3.5 flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant={showPharmacy ? 'primary' : 'mono'} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4 mr-1" />
                  {showPharmacy
                    ? isEdit
                      ? 'Save medicine'
                      : 'Create medicine'
                    : isEdit
                      ? 'Save product'
                      : 'Create product'}
                </>
              )}
            </Button>
          </SheetFooter>
        ) : (
          <div className="flex justify-end gap-2 border-t pt-3 mt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4 mr-1" />
                  {showPharmacy
                    ? isEdit
                      ? 'Save medicine'
                      : 'Create medicine'
                    : isEdit
                      ? 'Save product'
                      : 'Create product'}
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    );

  const quickDialogs = (
    <>
      <QuickCategoryDialog
        open={quickCat}
        onOpenChange={setQuickCat}
        onCreated={async (created) => {
          if (created?.name) setLastCreatedLabels((l) => ({ ...l, category: created.name }));
          await refreshCategory?.(created);
        }}
      />
      <QuickBrandDialog
        open={quickBrand}
        onOpenChange={setQuickBrand}
        onCreated={async (created) => {
          if (created?.name) setLastCreatedLabels((l) => ({ ...l, brand: created.name }));
          await refreshBrand?.(created);
        }}
      />
      <QuickUnitDialog
        open={quickUnit}
        onOpenChange={setQuickUnit}
        defaultBaseUnit={baseUnitKey}
        unitOptions={lookups.unit_options || []}
        onCreated={async (created) => {
          const label = created?.label || created?.name;
          if (label) setLastCreatedLabels((l) => ({ ...l, unit: label }));
          await refreshUnit?.(created);
        }}
      />
      <CreateAccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        onCreated={async (acc) => {
          const label = acc?.name
            ? `${acc.account_number ?? acc.code ?? ''} — ${acc.name}`.replace(/^ — /, '')
            : null;
          if (label && pendingAccountField) {
            setLastCreatedLabels((l) => ({ ...l, [pendingAccountField]: label }));
          }
          await refreshAccountList?.(acc, pendingAccountField);
        }}
      />
      <ProductTypePickerDialog
        open={typePickerOpen}
        onOpenChange={setTypePickerOpen}
        typeOptions={lookups.type_options}
        onSelect={(type) => {
          setField('type', type);
          setTypePickerOpen(false);
        }}
      />
    </>
  );

  if (isSheet) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="right"
            overlay
            overlayClassName="bg-black/20 backdrop-blur-none [backdrop-filter:none]"
            className={[
              'flex flex-col gap-0 overflow-hidden p-0',
              'w-full sm:max-w-none',
              'lg:w-[min(820px,calc(100vw-2rem))]',
              'inset-y-0 end-0 h-full max-h-none rounded-none border-l shadow-lg',
              'data-[state=open]:duration-200 data-[state=closed]:duration-200',
              '[&_[data-slot=sheet-close]]:top-4 [&_[data-slot=sheet-close]]:end-5',
            ].join(' ')}
          >
            <SheetHeader className="shrink-0 space-y-0 border-b px-6 py-4 text-start">
              <SheetTitle className="flex items-center gap-3 pe-8">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30 text-slate-600">
                  <TypeIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold tracking-tight text-slate-900">
                      {showPharmacy
                        ? isEdit
                          ? `Edit ${PHARMACY_COPY.product || 'medicine'}`
                          : `New ${PHARMACY_COPY.product || 'medicine'}`
                        : isEdit
                          ? 'Edit product'
                          : 'New product'}
                    </span>
                    {!showPharmacy && typeLabel ? (
                      <Badge
                        variant="outline"
                        className="rounded-md capitalize text-[10px] font-normal"
                      >
                        {typeLabel}
                      </Badge>
                    ) : null}
                    {!showPharmacy && showTypeChip ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto px-0 text-xs text-muted-foreground"
                        disabled={saving}
                        onClick={() => setTypePickerOpen(true)}
                      >
                        Change type
                      </Button>
                    ) : null}
                  </span>
                  <SheetDescription className="mt-0.5 text-xs text-slate-500">
                    {showPharmacy
                      ? 'Batch and expiry are entered when you receive stock.'
                      : 'Essentials first — open more details only when you need them.'}
                  </SheetDescription>
                </span>
              </SheetTitle>
            </SheetHeader>
            {formBody}
          </SheetContent>
        </Sheet>

        {/* Focused variants manager — keeps the create sheet calm */}
        <Sheet open={variantsPanelOpen} onOpenChange={setVariantsPanelOpen}>
          <SheetContent
            side="right"
            overlay
            overlayClassName="bg-black/25 backdrop-blur-none [backdrop-filter:none]"
            className={[
              'flex flex-col gap-0 overflow-hidden p-0',
              'w-full sm:max-w-none',
              'lg:w-[min(920px,calc(100vw-2.5rem))]',
              'inset-y-0 end-0 h-full max-h-none rounded-none border-l shadow-xl',
              'data-[state=open]:duration-200 data-[state=closed]:duration-200',
              '[&_[data-slot=sheet-close]]:top-4 [&_[data-slot=sheet-close]]:end-5',
            ].join(' ')}
          >
            <SheetHeader className="shrink-0 border-b px-6 py-4 text-start space-y-0">
              <SheetTitle className="text-base font-semibold tracking-tight pe-8">
                Variant manager
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                {form.name?.trim()
                  ? `${form.name.trim()} — attributes, SKUs, pricing, and lifecycle`
                  : 'Attributes, SKUs, pricing, and lifecycle'}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <ProductVariantsSection
                panelMode
                enabled={!!form.has_variants}
                onEnabledChange={(v) => {
                  setField('has_variants', v);
                  if (!v) {
                    setField('variant_matrix_attributes', []);
                    setField('variants', []);
                  }
                }}
                form={form}
                setField={setField}
                disabled={saving}
                taxRates={lookups.tax_rates || []}
              />
            </SheetBody>
            <SheetFooter className="shrink-0 border-t bg-background px-6 py-3.5 flex-row justify-end gap-2">
              <Button
                type="button"
                variant="mono"
                onClick={() => setVariantsPanelOpen(false)}
              >
                Done
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {quickDialogs}
      </>
    );
  }

  return (
    <>
      {formBody}
      {quickDialogs}
    </>
  );
}
