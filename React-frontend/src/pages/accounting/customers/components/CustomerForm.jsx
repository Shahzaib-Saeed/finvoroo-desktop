import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Loader2,
  Save,
  UserPlus,
  Plus,
  X,
  ChevronDown,
  User,
  MapPin,
  Wallet,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { customersApi } from "../api/customers.api";
import {
  EMPTY_CUSTOMER_FORM,
  EMPTY_SHIPPING_ADDRESS,
  mapCustomerToForm,
  buildCustomerPayload,
} from "../constants";
import { CustomerMetadataFields } from "./CustomerMetadataFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CreateAccountDialog } from "@/components/workspace/create-account-dialog";
import { useCustomerFormLookups } from "@/components/workspace/customer/hooks/useCustomerFormLookups";
import { CustomerVendorSupplierToggle } from "./CustomerVendorSupplierToggle";
import { DocumentAttachmentsSection } from "@/components/accounting/DocumentAttachmentsSection";
import { uploadPendingAttachments } from "@/components/accounting/document-attachments.lib";

const NEW_ITEM_CLASS = "text-primary font-medium";

/** Radix Select inside Sheet must use modal={false} or it infinite-loops on refs. */
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
  loading = false,
}) {
  const normalized = value ? String(value) : "";
  const current = normalized || undefined;

  const mergedAccounts = useMemo(() => {
    const base = [...(accounts || [])];
    if (normalized && !base.some((a) => String(a.id) === normalized)) {
      base.push({
        id: normalized,
        code: "",
        name: fallbackLabel || `Account #${normalized}`,
      });
    }
    return base;
  }, [accounts, normalized, fallbackLabel]);

  if (loading) {
    return (
      <Input disabled placeholder="Loading accounts…" />
    );
  }

  return (
    <SheetSelect
      key={selectKey ? `${selectKey}-${current}` : undefined}
      value={current}
      onValueChange={(v) => {
        if (v === "__new_account__") {
          onNewAccount?.();
          return;
        }
        onChange(v);
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
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
  "gap-0 p-0 flex flex-col overflow-hidden",
  "w-full sm:max-w-none",
  "lg:w-[min(960px,calc(100vw-2.5rem))]",
  "inset-y-2.5 end-2.5 start-auto h-auto max-h-[calc(100dvh-1.25rem)] rounded-lg border",
  "data-[state=open]:duration-200 data-[state=closed]:duration-200",
  "[&_[data-slot=sheet-close]]:top-4 [&_[data-slot=sheet-close]]:end-4",
].join(" ");

export function CustomerForm({
  variant = "sheet",
  open = true,
  onOpenChange,
  customer,
  onSuccess,
  onCancel,
  customerId,
  loading = false,
}) {
  const isEdit = !!(customerId || customer?.id);
  const [form, setForm] = useState(EMPTY_CUSTOMER_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pendingAccountField, setPendingAccountField] = useState(null);
  const [accountLabels, setAccountLabels] = useState({});
  const [selectRevision, setSelectRevision] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const customerRef = useRef(customer);
  customerRef.current = customer;
  const { lookups, loadingLookups, patchLookups } = useCustomerFormLookups();
  const customFieldDefs = lookups.custom_field_definitions || [];
  const invoiceTemplates = lookups.invoice_templates || [];

  const invoiceTemplateSelectValue = useMemo(() => {
    const raw = form.invoice_template_id
      ? String(form.invoice_template_id)
      : "";
    if (!raw) return "_default";
    return raw;
  }, [form.invoice_template_id]);

  const invoiceTemplateInList = useMemo(() => {
    if (!form.invoice_template_id) return true;
    return invoiceTemplates.some(
      (t) => String(t.id) === String(form.invoice_template_id),
    );
  }, [form.invoice_template_id, invoiceTemplates]);

  const isOverlay = variant === "dialog" || variant === "sheet";
  const isActive = isOverlay ? open : true;
  const fieldsReady = !isEdit || !loading;

  useEffect(() => {
    if (!isActive) return;

    const current = customerRef.current;
    if (current) {
      setForm(mapCustomerToForm(current));
    } else if (!isEdit) {
      setForm({ ...EMPTY_CUSTOMER_FORM });
    }
    setErrors({});
    setAccountLabels({});
    setPendingAttachments([]);
  }, [isActive, isEdit, customer?.id]);

  useEffect(() => {
    if (!isActive || (isEdit && loading)) return;
    const id = customerId || customer?.id;
    if (!id) {
      setAttachments([]);
      return;
    }
    let cancelled = false;
    customersApi
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
  }, [isActive, isEdit, loading, customerId, customer?.id]);

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
      ? `${acc.account_number ?? acc.code ?? ""} — ${acc.name}`.replace(/^ — /, "")
      : `Account #${id}`;

    flushSync(() => {
      patchLookups((prev) => {
        const listKey =
          fieldKey === "receivable_account_id"
            ? "receivable_accounts"
            : "revenue_accounts";
        const list = [...(prev[listKey] || [])];
        if (!list.some((a) => String(a.id) === id)) {
          list.push({
            id: Number(acc.id),
            code: acc.account_number ?? acc.code ?? "",
            name: acc.name ?? "",
          });
        }
        return { ...prev, [listKey]: list };
      });
      setAccountLabels((l) => ({ ...l, [fieldKey]: label }));
      setField(fieldKey, id);
      setSelectRevision((r) => r + 1);
    });
  };

  const addShipRow = () => {
    setForm((f) => ({
      ...f,
      shipping_addresses: [
        ...f.shipping_addresses,
        { ...EMPTY_SHIPPING_ADDRESS },
      ],
    }));
  };

  const removeShipRow = (idx) => {
    setForm((f) => ({
      ...f,
      shipping_addresses: f.shipping_addresses.filter((_, i) => i !== idx),
    }));
  };

  const updateShipRow = (idx, key, value) => {
    setForm((f) => ({
      ...f,
      shipping_addresses: f.shipping_addresses.map((s, i) =>
        i === idx ? { ...s, [key]: value } : s,
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: "Customer name is required" });
      toast.error("Customer name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = buildCustomerPayload(form);
      const id = customerId || customer?.id;

      let res;
      if (isEdit && id) {
        res = await customersApi.update(id, payload);
      } else {
        res = await customersApi.create(payload);
      }

      const savedCustomer = res?.data?.data;
      const savedId = savedCustomer?.id || id;
      if (pendingAttachments.length > 0 && savedId) {
        try {
          await uploadPendingAttachments(
            customersApi,
            savedId,
            pendingAttachments,
          );
          setPendingAttachments([]);
        } catch {
          toast.error("Customer saved, but some attachments failed to upload");
        }
      }

      toast.success(
        res?.data?.message ||
          `Customer ${isEdit ? "updated" : "created"} successfully`,
      );
      onSuccess?.(savedCustomer);
      if (isOverlay) onOpenChange?.(false);
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors && typeof apiErrors === "object") {
        const flat = {};
        Object.entries(apiErrors).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(flat);
      }
      toast.error(
        err?.response?.data?.message ||
          `Failed to ${isEdit ? "update" : "create"} customer`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else onOpenChange?.(false);
  };

  const setMetadataField = (fieldId, value) => {
    setForm((f) => ({
      ...f,
      metadata_custom_fields: { ...f.metadata_custom_fields, [fieldId]: value },
    }));
    setErrors((e) => {
      const key = `metadata_custom_fields.${fieldId}`;
      if (!e[key] && !e[fieldId]) return e;
      const next = { ...e };
      delete next[key];
      delete next[fieldId];
      return next;
    });
  };

  const canCreateCoa = lookups?.can_show_coa_quick_dialogs ?? false;
  const accountsLoading = loadingLookups && !lookups.revenue_accounts?.length;

  const footerButtons = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        disabled={saving}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={saving || !fieldsReady}>
        {saving ? (
          <>
            <Loader2 className="size-4 mr-1 animate-spin" />
            {isEdit ? "Saving..." : "Creating..."}
          </>
        ) : (
          <>
            <Save className="size-4 mr-1" />
            {isEdit ? "Save Changes" : "Create Customer"}
          </>
        )}
      </Button>
    </>
  );

  const formBody = (
    <>
      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-6",
          isOverlay
            ? "px-5 py-5 [transform:translateZ(0)]"
            : "max-h-[calc(100vh-14rem)] pr-1",
        )}
      >
        {!fieldsReady ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
        {/* ========== Section: Customer & Contact ========== */}
        <Section
          icon={User}
          title="Customer & contact"
          description="Basic identification — only the name is required."
        >
          <div className="grid grid-cols-12 gap-3">
            <Field
              label="Customer Code"
              hint="Leave blank for auto (e.g. CUI-0001)"
              className="col-span-12 sm:col-span-4"
              error={errors.customer_code}
            >
              <Input
                value={form.customer_code}
                onChange={(e) => setField("customer_code", e.target.value)}
                placeholder="AUTO"
              />
            </Field>
            <Field
              label="Customer Name"
              required
              className="col-span-12 sm:col-span-5"
              error={errors.name}
            >
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Customer name"
                autoFocus
              />
            </Field>
            <Field
              label="Status"
              className="col-span-12 sm:col-span-3"
              error={errors.status}
            >
              <SheetSelect
                value={form.status}
                onValueChange={(v) => setField("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </SheetSelect>
            </Field>
          </div>

          <CustomerVendorSupplierToggle
            checked={form.also_use_as_vendor}
            onChange={(v) => setField("also_use_as_vendor", v)}
          />

          <Divider />

          <div className="grid grid-cols-12 gap-3">
            <Field
              label="Title"
              className="col-span-6 sm:col-span-2"
              error={errors.contact_title}
            >
              <SheetSelect
                value={form.contact_title || "_none"}
                onValueChange={(v) =>
                  setField("contact_title", v === "_none" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Mrs">Mrs</SelectItem>
                  <SelectItem value="Ms">Ms</SelectItem>
                  <SelectItem value="Dr">Dr</SelectItem>
                </SelectContent>
              </SheetSelect>
            </Field>
            <Field
              label="First Name"
              className="col-span-6 sm:col-span-3"
              error={errors.contact_first_name}
            >
              <Input
                value={form.contact_first_name}
                onChange={(e) => setField("contact_first_name", e.target.value)}
                placeholder="John"
              />
            </Field>
            <Field
              label="Last Name"
              className="col-span-6 sm:col-span-3"
              error={errors.contact_last_name}
            >
              <Input
                value={form.contact_last_name}
                onChange={(e) => setField("contact_last_name", e.target.value)}
                placeholder="Doe"
              />
            </Field>
            <Field
              label="Email"
              className="col-span-12 sm:col-span-4"
              error={errors.email}
            >
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="email@example.com"
              />
            </Field>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <Field
              label="Primary Phone"
              className="col-span-12 sm:col-span-4"
              error={errors.phone}
            >
              <Input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="0900-1234567"
              />
            </Field>
            <Field
              label="Mobile"
              className="col-span-12 sm:col-span-4"
              error={errors.mobile}
            >
              <Input
                value={form.mobile}
                onChange={(e) => setField("mobile", e.target.value)}
                placeholder="+1 (123) 456-7890"
              />
            </Field>
            <Field
              label="Website"
              className="col-span-12 sm:col-span-4"
              error={errors.website}
            >
              <Input
                value={form.website}
                onChange={(e) => setField("website", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>

          <MoreToggle label="More contact details">
            <div className="grid grid-cols-12 gap-3">
              <Field
                label="Secondary Contact"
                className="col-span-12 sm:col-span-6"
                error={errors.second_contact_person}
              >
                <Input
                  value={form.second_contact_person}
                  onChange={(e) =>
                    setField("second_contact_person", e.target.value)
                  }
                  placeholder="Secondary contact person"
                />
              </Field>
              <Field
                label="Job Title"
                className="col-span-12 sm:col-span-6"
                error={errors.job_title}
              >
                <Input
                  value={form.job_title}
                  onChange={(e) => setField("job_title", e.target.value)}
                  placeholder="e.g. Accounts Manager"
                />
              </Field>
              <Field
                label="Gender"
                className="col-span-12 sm:col-span-6"
                error={errors.gender}
              >
                <SheetSelect
                  value={form.gender || "_none"}
                  onValueChange={(v) =>
                    setField("gender", v === "_none" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </SheetSelect>
              </Field>
              <Field
                label="Fax"
                className="col-span-12 sm:col-span-6"
                error={errors.fax}
              >
                <Input
                  value={form.fax}
                  onChange={(e) => setField("fax", e.target.value)}
                  placeholder="Fax"
                />
              </Field>
            </div>
          </MoreToggle>
        </Section>

        {/* ========== Section: Addresses ========== */}
        <Section
          icon={MapPin}
          title="Addresses"
          description="Billing — keep line breaks for invoices and documents."
        >
          <Field
            label="Billing Address"
            hint="Use Enter for each line; it will print exactly as you type."
            error={errors.bill_address1}
          >
            <Textarea
              rows={4}
              value={form.bill_address1}
              onChange={(e) => setField("bill_address1", e.target.value)}
              placeholder="Street, city, postal code, country"
            />
          </Field>

          <MoreToggle label="Additional billing details">
            <div className="grid grid-cols-12 gap-3">
              <Field
                label="Billing Name"
                hint="Leave blank to use customer name"
                className="col-span-12 sm:col-span-4"
                error={errors.bill_name}
              >
                <Input
                  value={form.bill_name}
                  onChange={(e) => setField("bill_name", e.target.value)}
                />
              </Field>
              <Field
                label="Bill-to Contact"
                className="col-span-12 sm:col-span-4"
                error={errors.bill_contact_person}
              >
                <Input
                  value={form.bill_contact_person}
                  onChange={(e) =>
                    setField("bill_contact_person", e.target.value)
                  }
                  placeholder="Accounts payable contact"
                />
              </Field>
              <Field
                label="Bill-to Email"
                className="col-span-12 sm:col-span-4"
                error={errors.bill_email}
              >
                <Input
                  type="email"
                  value={form.bill_email}
                  onChange={(e) => setField("bill_email", e.target.value)}
                  placeholder="billing@customer.com"
                />
              </Field>
              <Field
                label="Bill-to Phone"
                className="col-span-12 sm:col-span-6"
                error={errors.bill_phone}
              >
                <Input
                  value={form.bill_phone}
                  onChange={(e) => setField("bill_phone", e.target.value)}
                />
              </Field>
              <Field
                label="Customer Account #"
                hint="Reference used by customer"
                className="col-span-12 sm:col-span-6"
                error={errors.customer_account_number}
              >
                <Input
                  value={form.customer_account_number}
                  onChange={(e) =>
                    setField("customer_account_number", e.target.value)
                  }
                />
              </Field>
            </div>
          </MoreToggle>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-start gap-3">
              <Switch
                id="ship-same"
                checked={form.shipping_same_as_billing}
                onCheckedChange={(v) => setField("shipping_same_as_billing", v)}
              />
              <div className="flex-1">
                <Label
                  htmlFor="ship-same"
                  className="font-medium cursor-pointer"
                >
                  Shipping address is same as billing
                </Label>
                <p className="text-xs text-muted-foreground">
                  Turn off when the ship-to address is different.
                </p>
              </div>
            </div>

            {!form.shipping_same_as_billing && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Ship-to addresses</p>
                    <p className="text-xs text-muted-foreground">
                      When shipping differs from billing.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addShipRow}
                  >
                    <Plus className="size-3.5 mr-1" /> Add address
                  </Button>
                </div>

                {form.shipping_addresses.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-3 text-center">
                    No shipping addresses. Click "Add address" to create one.
                  </p>
                )}

                {form.shipping_addresses.map((ship, idx) => (
                  <div
                    key={idx}
                    className="relative grid grid-cols-12 gap-2 rounded-md border bg-card p-3"
                  >
                    <button
                      type="button"
                      onClick={() => removeShipRow(idx)}
                      className="absolute top-1 right-1 text-destructive hover:bg-destructive/10 rounded p-1"
                      title="Remove"
                    >
                      <X className="size-3.5" />
                    </button>
                    <Input
                      placeholder="Name"
                      className="col-span-6 sm:col-span-3"
                      value={ship.ship_name || ""}
                      onChange={(e) =>
                        updateShipRow(idx, "ship_name", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Address"
                      className="col-span-6 sm:col-span-4"
                      value={ship.ship_address1 || ""}
                      onChange={(e) =>
                        updateShipRow(idx, "ship_address1", e.target.value)
                      }
                    />
                    <Input
                      placeholder="City"
                      className="col-span-4 sm:col-span-2"
                      value={ship.ship_city || ""}
                      onChange={(e) =>
                        updateShipRow(idx, "ship_city", e.target.value)
                      }
                    />
                    <Input
                      placeholder="State"
                      className="col-span-4 sm:col-span-1"
                      value={ship.ship_state || ""}
                      onChange={(e) =>
                        updateShipRow(idx, "ship_state", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Zip"
                      className="col-span-4 sm:col-span-1"
                      value={ship.ship_postal_code || ""}
                      onChange={(e) =>
                        updateShipRow(idx, "ship_postal_code", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Country"
                      className="col-span-12 sm:col-span-1"
                      value={ship.ship_country || ""}
                      onChange={(e) =>
                        updateShipRow(idx, "ship_country", e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ========== Section: Financial (Optional) ========== */}
        <Section
          icon={Wallet}
          title="Financial"
          description="Nothing here is required. Defaults apply if you leave these blank."
          optional
        >
          <SubHeading>Sales &amp; tax</SubHeading>
          <div className="grid grid-cols-12 gap-3">
            <Field
              label="NTN"
              className="col-span-12 sm:col-span-4"
              error={errors.ntn}
            >
              <Input
                value={form.ntn}
                onChange={(e) => setField("ntn", e.target.value)}
                placeholder="NTN"
              />
            </Field>
            <Field
              label="STRN"
              className="col-span-12 sm:col-span-4"
              error={errors.strn}
            >
              <Input
                value={form.strn}
                onChange={(e) => setField("strn", e.target.value)}
                placeholder="STRN"
              />
            </Field>
            <Field
              label="CNIC"
              className="col-span-12 sm:col-span-4"
              error={errors.cnic}
            >
              <Input
                value={form.cnic}
                onChange={(e) => setField("cnic", e.target.value)}
                placeholder="CNIC"
              />
            </Field>
            <Field
              label="Revenue Account"
              hint="Default income account for this customer's sales"
              className="col-span-12 sm:col-span-5"
              error={errors.revenue_account_id}
            >
              <AccountSelect
                accounts={lookups?.revenue_accounts}
                value={form.revenue_account_id}
                onChange={(v) => setField("revenue_account_id", v)}
                onNewAccount={() => {
                  setPendingAccountField("revenue_account_id");
                  setAccountDialogOpen(true);
                }}
                placeholder="Select revenue account"
                selectKey={`revenue-${selectRevision}`}
                fallbackLabel={accountLabels.revenue_account_id}
                canCreate={canCreateCoa}
                loading={accountsLoading}
              />
            </Field>
            <Field
              label="Invoice / Bill Template"
              hint="Applied automatically when this customer is selected on an invoice or bill. Leave blank to use the company default."
              className="col-span-12 sm:col-span-7"
              error={errors.invoice_template_id}
            >
              <SheetSelect
                value={invoiceTemplateSelectValue}
                onValueChange={(v) =>
                  setField("invoice_template_id", v === "_default" ? "" : v)
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
                      {t.is_default ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SheetSelect>
            </Field>
            <Field
              label="Default Invoice Currency"
              hint="Used when picking this customer for invoices"
              className="col-span-12 sm:col-span-5"
              error={errors.currency}
            >
              <Input
                value={form.currency}
                onChange={(e) =>
                  setField("currency", e.target.value.toUpperCase())
                }
                placeholder="Company default"
                maxLength={3}
              />
            </Field>
            <Field
              label="Payment Terms"
              className="col-span-12 sm:col-span-4"
              error={errors.payment_terms_type}
            >
              <SheetSelect
                value={form.payment_terms_type}
                onValueChange={(v) => setField("payment_terms_type", v)}
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
              </SheetSelect>
            </Field>
            {form.payment_terms_type === "net_days" && (
              <Field
                label="Net Days"
                className="col-span-12 sm:col-span-4"
                error={errors.payment_terms_days}
              >
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={form.payment_terms_days}
                  onChange={(e) =>
                    setField("payment_terms_days", e.target.value)
                  }
                  placeholder="e.g. 30"
                />
              </Field>
            )}
            {form.payment_terms_type === "fixed_day_next_month" && (
              <Field
                label="Fixed Due Day"
                className="col-span-12 sm:col-span-4"
                error={errors.payment_terms_fixed_day}
              >
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.payment_terms_fixed_day}
                  onChange={(e) =>
                    setField("payment_terms_fixed_day", e.target.value)
                  }
                  placeholder="1-31"
                />
              </Field>
            )}
          </div>

          <MoreToggle label="Regional tax details">
            <div className="grid grid-cols-12 gap-3">
              <Field
                label="Tax ID"
                className="col-span-12 sm:col-span-6"
                error={errors.tax_id}
              >
                <Input
                  value={form.tax_id}
                  onChange={(e) => setField("tax_id", e.target.value)}
                />
              </Field>
              <Field
                label="Tax Code"
                className="col-span-12 sm:col-span-6"
                error={errors.tax_code}
              >
                <Input
                  value={form.tax_code}
                  onChange={(e) => setField("tax_code", e.target.value)}
                />
              </Field>
            </div>
          </MoreToggle>

          <MoreToggle label="Advanced accounting override">
            <Field
              label="Accounts Receivable (override)"
              hint="Leave empty to use the company default A/R account"
              error={errors.receivable_account_id}
            >
              <AccountSelect
                accounts={lookups?.receivable_accounts}
                value={form.receivable_account_id}
                onChange={(v) => setField("receivable_account_id", v)}
                onNewAccount={() => {
                  setPendingAccountField("receivable_account_id");
                  setAccountDialogOpen(true);
                }}
                placeholder="Use company default A/R"
                selectKey={`receivable-${selectRevision}`}
                fallbackLabel={accountLabels.receivable_account_id}
                canCreate={canCreateCoa}
                loading={accountsLoading}
              />
            </Field>
          </MoreToggle>

          <SubHeading className="mt-5">Payment &amp; credit</SubHeading>
          <div className="grid grid-cols-12 gap-3">
            <Field
              label="Credit Limit"
              className="col-span-12 sm:col-span-4"
              error={errors.credit_limit}
            >
              <Input
                type="number"
                step="0.01"
                min={0}
                value={form.credit_limit}
                onChange={(e) => setField("credit_limit", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field
              label="Credit Status"
              className="col-span-12 sm:col-span-4"
              error={errors.credit_status}
            >
              <SheetSelect
                value={form.credit_status}
                onValueChange={(v) => setField("credit_status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="on_hold">On hold</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </SheetSelect>
            </Field>
            <Field
              label="Opening Balance Date"
              className="col-span-12 sm:col-span-4"
              error={errors.balance_date}
            >
              <Input
                type="date"
                value={form.balance_date}
                onChange={(e) => setField("balance_date", e.target.value)}
              />
            </Field>
            <Field
              label="Opening Balance"
              hint="A/R balance at go-live"
              className="col-span-12 sm:col-span-4"
              error={errors.opening_balance}
            >
              <Input
                type="number"
                step="0.01"
                value={form.opening_balance}
                onChange={(e) => setField("opening_balance", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field
              label="Preferred Payment Method"
              className="col-span-12 sm:col-span-8"
              error={errors.preferred_payment_method}
            >
              <SheetSelect
                value={form.preferred_payment_method || "_none"}
                onValueChange={(v) =>
                  setField("preferred_payment_method", v === "_none" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_wallet">Mobile wallet</SelectItem>
                </SelectContent>
              </SheetSelect>
            </Field>
          </div>

          <MoreToggle label="Pricing policy">
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-12 sm:col-span-4 flex items-center gap-2 h-10">
                <Checkbox
                  id="use_discount"
                  checked={form.use_discount}
                  onCheckedChange={(v) => setField("use_discount", !!v)}
                />
                <Label
                  htmlFor="use_discount"
                  className="text-sm cursor-pointer"
                >
                  Use discount by default
                </Label>
              </div>
              <Field
                label="Discount Type"
                className="col-span-12 sm:col-span-4"
                error={errors.discount_type}
              >
                <SheetSelect
                  value={form.discount_type}
                  onValueChange={(v) => setField("discount_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </SheetSelect>
              </Field>
              {form.discount_type === "percentage" ? (
                <Field
                  label="Default Discount %"
                  className="col-span-12 sm:col-span-4"
                  error={errors.discount_percent}
                >
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.discount_percent}
                    onChange={(e) =>
                      setField("discount_percent", e.target.value)
                    }
                    placeholder="0"
                  />
                </Field>
              ) : (
                <Field
                  label="Default Discount Amount"
                  className="col-span-12 sm:col-span-4"
                  error={errors.discount_amount}
                >
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.discount_amount}
                    onChange={(e) =>
                      setField("discount_amount", e.target.value)
                    }
                    placeholder="0"
                  />
                </Field>
              )}
              <Field
                label="Billing Cycle"
                className="col-span-12 sm:col-span-4"
                error={errors.billing_cycle}
              >
                <SheetSelect
                  value={form.billing_cycle}
                  onValueChange={(v) => setField("billing_cycle", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Monthly</SelectItem>
                    <SelectItem value="12">Yearly</SelectItem>
                  </SelectContent>
                </SheetSelect>
              </Field>
            </div>
          </MoreToggle>

          <MoreToggle label="Notifications & internal notes">
            <div className="space-y-3">
              <ToggleRow
                label="Send Statements"
                description="Send account statements to this customer"
                value={form.send_statements}
                onChange={(v) => setField("send_statements", v)}
              />
              <ToggleRow
                label="Email Invoices"
                description="Automatically email invoices upon creation"
                value={form.send_invoice_email}
                onChange={(v) => setField("send_invoice_email", v)}
              />
              <Field label="Internal Notes" error={errors.internal_notes}>
                <Textarea
                  rows={3}
                  value={form.internal_notes}
                  onChange={(e) => setField("internal_notes", e.target.value)}
                  placeholder="Private notes about this customer..."
                />
              </Field>
            </div>
          </MoreToggle>
        </Section>

        {/* ========== Section: Attachments ========== */}
        {(!isEdit || (customer?.id && !loading)) && (
          <Section
            icon={Paperclip}
            title="Attachments"
            description="Upload contracts, agreements, or any supporting documents for this customer."
            optional
          >
            <DocumentAttachmentsSection
              documentType="customer"
              documentId={customerId || customer?.id || null}
              attachments={attachments}
              pendingFiles={pendingAttachments}
              onPendingFilesChange={handlePendingAttachmentsChange}
              onAttachmentsChange={handleAttachmentsChange}
              disabled={saving}
              compact
            />
          </Section>
        )}

        {customFieldDefs.length > 0 && (
          <Section
            title="Custom fields"
            description="Additional fields configured for customers."
            optional
          >
            <CustomerMetadataFields
              definitions={customFieldDefs}
              values={form.metadata_custom_fields || {}}
              onChange={setMetadataField}
              errors={errors}
            />
          </Section>
        )}
          </>
        )}
      </div>

      <div
        className={cn(
          "flex justify-end gap-2 border-t bg-muted/30 shrink-0",
          isOverlay ? "px-5 py-3.5" : "pt-4",
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

  if (variant === "page") {
    return (
      <>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formBody}
        </form>
        {accountDialog}
      </>
    );
  }

  if (variant === "sheet") {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
          <SheetContent
            className={FORM_SHEET_CLASS}
            overlayClassName="bg-black/15 [backdrop-filter:none]"
          >
            <SheetHeader className="border-b py-3.5 px-5 shrink-0">
              <div className="flex items-start justify-between gap-3 pe-8">
                <div>
                  <SheetTitle className="font-medium">
                    {isEdit ? "Edit Customer" : "New Customer"}
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    {isEdit
                      ? "Edit customer contact, billing, and financial settings."
                      : "Create a new customer with contact and billing details."}
                  </SheetDescription>
                  <p className="text-sm text-muted-foreground font-normal pt-0.5">
                    {isEdit
                      ? "Update contact, billing, and optional financial settings."
                      : "Add customer & contact details, then addresses and billing."}
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
                {isEdit ? (
                  <Save className="size-5" />
                ) : (
                  <UserPlus className="size-5" />
                )}
              </div>
              <div>
                <DialogTitle>
                  {isEdit ? "Edit Customer" : "Create Customer"}
                </DialogTitle>
                <DialogDescription>
                  Add customer &amp; contact, then addresses. Optional financial
                  settings are below.
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

/* ----- Helpers ----- */

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
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubHeading({ children, className }) {
  return (
    <p
      className={cn(
        "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 pb-1 border-b",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t my-1" />;
}

function Field({ label, required, error, hint, children, className = "" }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function MoreToggle({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
      >
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
        {open ? `Hide ${label.toLowerCase()}` : `+ ${label} (optional)`}
      </button>
      {open ? (
        <div className="mt-3 rounded-lg border bg-muted/30 p-4">{children}</div>
      ) : null}
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card p-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
