import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Loader2,
  Save,
  Building2,
  MapPin,
  Wallet,
  FileText,
  Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import { vendorsApi } from '../api/vendors.api';
import {
  EMPTY_VENDOR_FORM,
  mapVendorToForm,
  buildVendorPayload,
  resolveVendorCurrency,
} from '../constants';
import { VendorCustomerToggle } from './VendorCustomerToggle';
import { DocumentAttachmentsSection } from '@/components/accounting/DocumentAttachmentsSection';
import { uploadPendingAttachments } from '@/components/accounting/document-attachments.lib';
import { enrichLookupsWithInvoiceTemplates } from '@/lib/invoice-template-options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateAccountDialog } from '@/components/workspace/create-account-dialog';
import { cn } from '@/lib/utils';

const NEW_ITEM_CLASS = 'text-primary font-medium';

function SheetSelect(props) {
  return <Select modal={false} {...props} />;
}

function AccountSelect({
  accounts,
  value,
  onChange,
  onNewAccount,
  placeholder,
  selectKey,
  fallbackLabel,
  canCreate,
}) {
  const normalized = value ? String(value) : '';
  const current = normalized || undefined;

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
    <SheetSelect
      key={selectKey ? `${selectKey}-${current}` : undefined}
      value={current}
      onValueChange={(v) => {
        if (v === '__new_account__') {
          onNewAccount?.();
          return;
        }
        onChange(v);
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {canCreate && (
          <SelectItem value="__new_account__" className={NEW_ITEM_CLASS}>
            + New account…
          </SelectItem>
        )}
        {mergedAccounts.map((a) => (
          <SelectItem key={a.id} value={String(a.id)}>
            {a.code ? `${a.code} — ${a.name}` : a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </SheetSelect>
  );
}

const FORM_SHEET_CLASS = [
  'gap-0 p-0 flex flex-col',
  'w-full sm:max-w-none',
  'lg:w-[min(960px,calc(100vw-2.5rem))]',
  'inset-y-2.5 end-2.5 start-auto h-auto rounded-lg border',
  '[&_[data-slot=sheet-close]]:top-4 [&_[data-slot=sheet-close]]:end-4',
].join(' ');

export function VendorForm({
  variant = 'sheet',
  open = true,
  onOpenChange,
  vendor,
  onSuccess,
  onCancel,
  vendorId,
  loading = false,
}) {
  const isEdit = !!(vendorId || vendor?.id);
  const [form, setForm] = useState(EMPTY_VENDOR_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [lookups, setLookups] = useState(null);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pendingAccountField, setPendingAccountField] = useState(null);
  const [accountLabels, setAccountLabels] = useState({});
  const [selectRevision, setSelectRevision] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const vendorRef = useRef(vendor);
  vendorRef.current = vendor;

  const invoiceTemplates = lookups?.invoice_templates || [];

  const invoiceTemplateSelectValue = useMemo(() => {
    const raw = form.invoice_template_id ? String(form.invoice_template_id) : '';
    if (!raw) return '_default';
    return raw;
  }, [form.invoice_template_id]);

  const invoiceTemplateInList = useMemo(() => {
    if (!form.invoice_template_id) return true;
    return invoiceTemplates.some(
      (t) => String(t.id) === String(form.invoice_template_id),
    );
  }, [form.invoice_template_id, invoiceTemplates]);

  const isOverlay = variant === 'dialog' || variant === 'sheet';
  const isActive = isOverlay ? open : true;
  const fieldsReady = !isEdit || !loading;
  const baseCurrency = lookups?.base_currency || 'USD';
  const currencyOptions = lookups?.currencies?.length
    ? lookups.currencies
    : [baseCurrency];

  useEffect(() => {
    if (!isActive) return;
    if (isEdit && loading) return;

    const current = vendorRef.current;
    if (current) {
      setForm(mapVendorToForm(current, { baseCurrency }));
    } else if (!isEdit) {
      setForm({
        ...EMPTY_VENDOR_FORM,
        currency: resolveVendorCurrency('', baseCurrency),
      });
    }
    setErrors({});
    setAccountLabels({});
    if (!isEdit) {
      setPendingAttachments([]);
    }
  }, [isActive, isEdit, loading, vendor, baseCurrency]);

  useEffect(() => {
    if (!isActive) return;
    setLoadingLookups(true);
    vendorsApi
      .formOptions()
      .then(async (res) => {
        const enriched = await enrichLookupsWithInvoiceTemplates(res.data?.data || null);
        setLookups(enriched);
      })
      .catch(() => {
        toast.error('Failed to load vendor form options');
        setLookups(null);
      })
      .finally(() => setLoadingLookups(false));
  }, [isActive]);

  useEffect(() => {
    if (!isActive || (isEdit && loading)) return;
    const id = vendorId || vendor?.id;
    if (!id) {
      setAttachments([]);
      return;
    }
    let cancelled = false;
    vendorsApi
      .listAttachments(id)
      .then((res) => {
        if (!cancelled) setAttachments(res.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setAttachments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isActive, isEdit, loading, vendorId, vendor?.id]);

  const handleAttachmentsChange = useCallback((next) => {
    setAttachments(next);
  }, []);

  const handlePendingAttachmentsChange = useCallback((next) => {
    setPendingAttachments(next);
  }, []);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _, ...rest } = e;
      return rest;
    });
  };

  const patchAccounts = (fieldKey, acc) => {
    if (!acc?.id) return;
    const id = String(acc.id);
    const label = acc.name
      ? `${acc.account_number ?? acc.code ?? ''} — ${acc.name}`.replace(/^ — /, '')
      : `Account #${id}`;

    flushSync(() => {
      setLookups((prev) => {
        if (!prev) return prev;
        const listKey =
          fieldKey === 'payable_account_id' ? 'payable_accounts' : 'expense_accounts';
        const list = [...(prev[listKey] || [])];
        if (!list.some((a) => String(a.id) === id)) {
          list.push({
            id: Number(acc.id),
            code: acc.account_number ?? acc.code ?? '',
            name: acc.name ?? '',
          });
        }
        return { ...prev, [listKey]: list };
      });
      setAccountLabels((l) => ({ ...l, [fieldKey]: label }));
      setField(fieldKey, id);
      setSelectRevision((r) => r + 1);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: 'Vendor name is required' });
      toast.error('Vendor name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = buildVendorPayload(form, { isEdit, baseCurrency });
      const id = vendorId || vendor?.id;

      let res;
      if (isEdit && id) {
        res = await vendorsApi.update(id, payload);
      } else {
        res = await vendorsApi.create(payload);
      }

      const savedVendor = res?.data?.data;
      const savedId = savedVendor?.id || id;
      if (pendingAttachments.length > 0 && savedId) {
        try {
          await uploadPendingAttachments(vendorsApi, savedId, pendingAttachments);
          setPendingAttachments([]);
        } catch {
          toast.error('Vendor saved, but some attachments failed to upload');
        }
      }

      toast.success(
        res?.data?.message || `Vendor ${isEdit ? 'updated' : 'created'} successfully`
      );
      if (savedVendor) {
        setForm(mapVendorToForm(savedVendor, { baseCurrency }));
      }
      onSuccess?.(savedVendor);
      if (isOverlay) onOpenChange?.(false);
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors && typeof apiErrors === 'object') {
        const flat = {};
        Object.entries(apiErrors).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(flat);
      }
      toast.error(
        err?.response?.data?.message ||
          `Failed to ${isEdit ? 'update' : 'create'} vendor`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else onOpenChange?.(false);
  };

  const canCreateCoa = lookups?.can_show_coa_quick_dialogs ?? false;
  const showCurrencyAndActive = isEdit;

  const footerButtons = (
    <>
      <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" disabled={saving || loadingLookups || !fieldsReady}>
        {saving ? (
          <>
            <Loader2 className="size-4 mr-1 animate-spin" />
            {isEdit ? 'Saving...' : 'Creating...'}
          </>
        ) : (
          <>
            <Save className="size-4 mr-1" />
            {isEdit ? 'Save Changes' : 'Create Vendor'}
          </>
        )}
      </Button>
    </>
  );

  const formBody = loadingLookups || !fieldsReady ? (
    <div className="flex justify-center py-16">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  ) : (
    <>
      <div
        className={cn(
          'flex-1 overflow-y-auto space-y-6',
          isOverlay
            ? 'px-5 py-5 max-h-[calc(100dvh-9rem)]'
            : 'max-h-[calc(100vh-14rem)] pr-1',
        )}
      >
        <Section
          icon={Building2}
          title="Vendor profile"
          description="Basic vendor details — only the name is required."
        >
          <div className="grid grid-cols-12 gap-3">
            <Field
              label="Vendor code"
              hint="Leave blank for the next code (e.g. VUI-0001, VUI-0002)."
              className="col-span-12 sm:col-span-4"
              error={errors.vendor_code}
            >
              <Input
                value={form.vendor_code}
                onChange={(e) => setField('vendor_code', e.target.value)}
                placeholder="VUI-0001 (auto)"
              />
            </Field>
            <Field
              label="Name"
              required
              className="col-span-12 sm:col-span-5"
              error={errors.name}
            >
              <Input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Vendor name"
                autoFocus
              />
            </Field>
            {showCurrencyAndActive && (
              <Field
                label="Currency"
                className="col-span-12 sm:col-span-3"
                error={errors.currency}
              >
                <Select
                  value={form.currency || baseCurrency}
                  onValueChange={(v) => setField('currency', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((cur) => (
                      <SelectItem key={cur} value={cur}>
                        {cur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          <VendorCustomerToggle
            checked={form.also_use_as_customer}
            onChange={(v) => setField('also_use_as_customer', v)}
          />

          <div className="grid grid-cols-12 gap-3">
            <Field label="Email" className="col-span-12 sm:col-span-4" error={errors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="example@example.com"
              />
            </Field>
            <Field label="Phone" className="col-span-12 sm:col-span-4" error={errors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="+1 (123) 456-7890"
              />
            </Field>
            <Field label="Tax ID" className="col-span-12 sm:col-span-4" error={errors.tax_id}>
              <Input
                value={form.tax_id}
                onChange={(e) => setField('tax_id', e.target.value)}
                placeholder="1234567890"
              />
            </Field>
          </div>

          {!showCurrencyAndActive && (
            <div className="grid grid-cols-12 gap-3">
              <Field
                label="Terms type"
                className="col-span-12 sm:col-span-5"
                error={errors.payment_terms_type}
              >
                <Select
                  value={form.payment_terms_type}
                  onValueChange={(v) => setField('payment_terms_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net_days">Net days</SelectItem>
                    <SelectItem value="prepaid">Prepaid</SelectItem>
                    <SelectItem value="cod">C.O.D.</SelectItem>
                    <SelectItem value="end_of_next_month">
                      Due at end of next month
                    </SelectItem>
                    <SelectItem value="fixed_day_next_month">
                      Due on fixed day next month
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.payment_terms_type === 'net_days' && (
                <Field
                  label="Net days"
                  className="col-span-12 sm:col-span-3"
                  error={errors.payment_terms_days}
                >
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={form.payment_terms_days}
                    onChange={(e) => setField('payment_terms_days', e.target.value)}
                  />
                </Field>
              )}
              {form.payment_terms_type === 'fixed_day_next_month' && (
                <Field
                  label="Fixed due day (1–31)"
                  className="col-span-12 sm:col-span-4"
                  error={errors.payment_terms_fixed_day}
                >
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.payment_terms_fixed_day}
                    onChange={(e) =>
                      setField('payment_terms_fixed_day', e.target.value)
                    }
                  />
                </Field>
              )}
            </div>
          )}
        </Section>

        <Section
          icon={Wallet}
          title="Accounting (bills)"
          description="Defaults for accounts payable and bill line expenses."
        >
          <div className="grid grid-cols-12 gap-3">
            <Field
              label="Accounts payable"
              hint="Defaults to company A/P when empty."
              className="col-span-12 sm:col-span-6"
              error={errors.payable_account_id}
            >
              <AccountSelect
                accounts={lookups?.payable_accounts}
                value={form.payable_account_id}
                onChange={(v) => setField('payable_account_id', v)}
                onNewAccount={() => {
                  setPendingAccountField('payable_account_id');
                  setAccountDialogOpen(true);
                }}
                placeholder="Select A/P account"
                selectKey={`payable-${selectRevision}`}
                fallbackLabel={accountLabels.payable_account_id}
                canCreate={canCreateCoa}
              />
            </Field>
            <Field
              label="Default expense"
              className="col-span-12 sm:col-span-6"
              error={errors.default_expense_account_id}
            >
              <AccountSelect
                accounts={lookups?.expense_accounts}
                value={form.default_expense_account_id}
                onChange={(v) => setField('default_expense_account_id', v)}
                onNewAccount={() => {
                  setPendingAccountField('default_expense_account_id');
                  setAccountDialogOpen(true);
                }}
                placeholder="Select expense account"
                selectKey={`expense-${selectRevision}`}
                fallbackLabel={accountLabels.default_expense_account_id}
                canCreate={canCreateCoa}
              />
            </Field>
            <Field
              label="Opening Balance"
              hint="A/P balance at go-live"
              className="col-span-12 sm:col-span-4"
              error={errors.opening_balance}
            >
              <Input
                type="number"
                step="0.01"
                value={form.opening_balance}
                onChange={(e) => setField('opening_balance', e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field
              label="Opening Balance Date"
              className="col-span-12 sm:col-span-4"
              error={errors.balance_date}
            >
              <Input
                type="date"
                value={form.balance_date}
                onChange={(e) => setField('balance_date', e.target.value)}
              />
            </Field>
            <Field
              label="Invoice / Bill Template"
              hint="Applied automatically when this vendor is selected on a bill. Leave blank to use the company default."
              className="col-span-12"
              error={errors.invoice_template_id}
            >
              <SheetSelect
                value={invoiceTemplateSelectValue}
                onValueChange={(v) =>
                  setField('invoice_template_id', v === '_default' ? '' : v)
                }
                disabled={loadingLookups}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Company default template" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="_default">Company default</SelectItem>
                  {form.invoice_template_id && !invoiceTemplateInList ? (
                    <SelectItem value={String(form.invoice_template_id)}>
                      Template #{form.invoice_template_id}
                    </SelectItem>
                  ) : null}
                  {invoiceTemplates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                      {t.is_default ? ' (default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SheetSelect>
            </Field>
          </div>
        </Section>

        {showCurrencyAndActive && (
          <Section icon={FileText} title="Payment terms">
            <div className="grid grid-cols-12 gap-3">
              <Field
                label="Terms type"
                className="col-span-12 sm:col-span-5"
                error={errors.payment_terms_type}
              >
                <Select
                  value={form.payment_terms_type}
                  onValueChange={(v) => setField('payment_terms_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net_days">Net days</SelectItem>
                    <SelectItem value="prepaid">Prepaid</SelectItem>
                    <SelectItem value="cod">C.O.D.</SelectItem>
                    <SelectItem value="end_of_next_month">
                      Due at end of next month
                    </SelectItem>
                    <SelectItem value="fixed_day_next_month">
                      Due on fixed day next month
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.payment_terms_type === 'net_days' && (
                <Field
                  label="Net days"
                  className="col-span-12 sm:col-span-3"
                  error={errors.payment_terms_days}
                >
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={form.payment_terms_days}
                    onChange={(e) => setField('payment_terms_days', e.target.value)}
                  />
                </Field>
              )}
              {form.payment_terms_type === 'fixed_day_next_month' && (
                <Field
                  label="Fixed due day (1–31)"
                  className="col-span-12 sm:col-span-4"
                  error={errors.payment_terms_fixed_day}
                >
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.payment_terms_fixed_day}
                    onChange={(e) =>
                      setField('payment_terms_fixed_day', e.target.value)
                    }
                  />
                </Field>
              )}
            </div>
          </Section>
        )}

        <Section
          icon={MapPin}
          title="Address"
          description="Keep line breaks for bills and purchase orders."
        >
          <Field
            label="Address"
            hint="Use Enter for each line; it will print exactly as you type."
            error={errors.address_line1}
          >
            <Textarea
              rows={4}
              value={form.address_line1}
              onChange={(e) => setField('address_line1', e.target.value)}
              placeholder="Street, city, postal code, country"
            />
          </Field>
        </Section>

        {(!isEdit || (vendor?.id && !loading)) && (
          <Section
            icon={Paperclip}
            title="Attachments"
            description="Upload contracts, agreements, or any supporting documents for this vendor."
            optional
          >
            <DocumentAttachmentsSection
              documentType="vendor"
              documentId={vendorId || vendor?.id || null}
              attachments={attachments}
              pendingFiles={pendingAttachments}
              onPendingFilesChange={handlePendingAttachmentsChange}
              onAttachmentsChange={handleAttachmentsChange}
              disabled={saving}
              compact
            />
          </Section>
        )}

        <Section icon={FileText} title="Notes" optional>
          <Field label="Internal notes" error={errors.notes}>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Internal notes (optional)"
            />
          </Field>
          {showCurrencyAndActive && (
            <div className="flex items-center justify-between rounded-md border bg-card p-3 mt-3">
              <div>
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive vendors are hidden from the vendor list.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setField('is_active', v)}
              />
            </div>
          )}
        </Section>
      </div>

      <div
        className={cn(
          'flex justify-end gap-2 border-t bg-muted/30 shrink-0',
          isOverlay ? 'px-5 py-3.5' : 'pt-4',
        )}
      >
        {footerButtons}
      </div>
    </>
  );

  const accountDialog = (
    <CreateAccountDialog
      open={accountDialogOpen}
      onOpenChange={setAccountDialogOpen}
      onCreated={(acc) => {
        if (pendingAccountField) patchAccounts(pendingAccountField, acc);
        setPendingAccountField(null);
      }}
    />
  );

  if (variant === 'page') {
    return (
      <>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formBody}
        </form>
        {accountDialog}
      </>
    );
  }

  if (variant === 'sheet') {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className={FORM_SHEET_CLASS}>
            <SheetHeader className="border-b py-3.5 px-5 shrink-0">
              <div className="flex items-start justify-between gap-3 pe-8">
                <div>
                  <SheetTitle className="font-medium">
                    {isEdit ? 'Edit Vendor' : 'New Vendor'}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground font-normal pt-0.5">
                    {isEdit
                      ? 'Update vendor profile, accounting defaults, and payment terms.'
                      : 'Add vendor details, then accounting defaults and address.'}
                  </p>
                </div>
                {loading ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0 mt-1" />
                ) : null}
              </div>
            </SheetHeader>
            <SheetBody className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
              <form
                onSubmit={handleSubmit}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                {formBody}
              </form>
            </SheetBody>
          </SheetContent>
        </Sheet>
        {accountDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Building2 className="size-5" />
              </div>
              <div>
                <DialogTitle>
                  {isEdit ? 'Edit Vendor' : 'Create Vendor'}
                </DialogTitle>
                <DialogDescription>
                  Vendor profile, accounting defaults, address, and payment terms.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-hidden"
          >
            {formBody}
          </form>
        </DialogContent>
      </Dialog>
      {accountDialog}
    </>
  );
}


function Section({ icon: Icon, title, description, optional, children }) {
  return (
    <section>
      <header className="flex items-start gap-3 mb-4">
        {Icon && (
          <div className="size-8 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0">
            <Icon className="size-4" />
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            {title}
            {optional && (
              <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                Optional
              </span>
            )}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, required, error, hint, children, className = '' }) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
