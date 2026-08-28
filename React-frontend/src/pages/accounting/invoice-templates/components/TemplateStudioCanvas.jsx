import {
  fieldsForPlacement,
  PLACEMENT,
  SYSTEM_SLOT,
  collectInvoiceDetailsCustomFields,
} from "../../invoices/invoice-template-constants";
import {
  FormSectionHeader,
  formInnerPanelClass,
  formSectionBodyClass,
  formSectionCardClass,
  invoiceFieldLabelClass,
} from "../../invoices/components/invoice-form-design";
import { cn } from "@/lib/utils";

function SimField({ label, required = false, type = "text", sample }) {
  return (
    <div className="w-full min-w-0 space-y-1.5">
      <label className={invoiceFieldLabelClass}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {type === "textarea" ? (
        <div className="flex min-h-[72px] w-full items-start rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          {sample || "—"}
        </div>
      ) : (
        <div className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {sample || "—"}
        </div>
      )}
    </div>
  );
}

function PlacementFields({ fields, placement }) {
  const list = fieldsForPlacement(fields, placement);
  if (!list.length) return null;
  return (
    <div className="space-y-3">
      {list.map((f) => (
        <SimField
          key={f.field_key || f.id}
          label={f.label}
          type={f.field_type === "textarea" ? "textarea" : "text"}
          sample={f.field_type === "select" ? "Select…" : "Sample"}
        />
      ))}
    </div>
  );
}

const SAMPLE_LINE = {
  product: "Freight service",
  description: "Port to port — dry cargo",
  quantity: "1",
  unit: "Lot",
  rate: "1,250.00",
  amount: "1,250.00",
};

function sampleForCol(key) {
  const map = {
    product: SAMPLE_LINE.product,
    description: SAMPLE_LINE.description,
    quantity: SAMPLE_LINE.quantity,
    qty: SAMPLE_LINE.quantity,
    unit: SAMPLE_LINE.unit,
    uom: SAMPLE_LINE.unit,
    rate: SAMPLE_LINE.rate,
    unit_price: SAMPLE_LINE.rate,
    amount: SAMPLE_LINE.amount,
    gross_total: SAMPLE_LINE.amount,
    net_total: SAMPLE_LINE.amount,
    final_total: SAMPLE_LINE.amount,
    discount_percent: "—",
    discount_fixed: "—",
    tax: "—",
    sale_tax: "—",
  };
  return map[key] || "—";
}

/**
 * Read-only mock of the create-invoice form layout so template edits
 * preview with the same section cards / density as the real form.
 */
export function TemplateStudioCanvas({
  name,
  isDefault,
  footerContent,
  fields,
  layoutSlots,
  lineColumns,
}) {
  const visibleCols = (lineColumns || []).filter((c) => c.visible !== false);
  const customFields = collectInvoiceDetailsCustomFields(fields, layoutSlots);
  const showPaymentTerms = (layoutSlots || []).some(
    (s) => s.kind === "system" && s.key === SYSTEM_SLOT.PAYMENT_TERMS,
  );

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Template
        </span>
        <div className="flex h-9 min-w-[180px] max-w-full items-center rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground">
          <span className="truncate">
            {name}
            {isDefault ? " (default)" : ""}
          </span>
        </div>
      </div>

      <PlacementFields
        fields={fields}
        placement={PLACEMENT.FORM_BELOW_TEMPLATE}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className={cn(formSectionCardClass, "lg:col-span-5")}>
          <FormSectionHeader title="Customer" />
          <div className={formSectionBodyClass}>
            <div className="space-y-3">
              <SimField
                label="Customer"
                required
                sample="Sample Customer Ltd."
              />
              <div className="rounded-lg border border-foreground/[0.09] bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Due balance 0.00 · Credit limit —
              </div>
              <PlacementFields
                fields={fields}
                placement={PLACEMENT.BILL_TO_UNDER_CUSTOMER}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SimField
                  label="Billing address"
                  type="textarea"
                  sample="Karachi, PK"
                />
                <SimField
                  label="Shipping address"
                  type="textarea"
                  sample="Same as billing"
                />
              </div>
              <PlacementFields
                fields={fields}
                placement={PLACEMENT.BILL_TO_UNDER_ADDRESS}
              />
            </div>
          </div>
        </div>

        <div className={cn(formSectionCardClass, "lg:col-span-7")}>
          <FormSectionHeader title="Invoice details" />
          <div className={formSectionBodyClass}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <span className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 text-[11px] font-semibold capitalize text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  Draft
                </span>
                <span className="inline-flex h-6 items-center rounded-full border border-border px-2.5 text-[11px] font-medium text-muted-foreground">
                  Auto-assigned
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SimField label="Invoice #" sample="INV-1001" />
                <SimField label="Invoice date" required sample="14 Aug 2026" />
                <SimField label="Due date" required sample="13 Sep 2026" />
                {customFields.map((f) => (
                  <SimField
                    key={f.field_key}
                    label={f.label}
                    type={f.field_type === "textarea" ? "textarea" : "text"}
                    sample={f.field_type === "select" ? "Select…" : "Sample"}
                  />
                ))}
              </div>
              {/* 
              {showPaymentTerms ? (
                <div className="max-w-[220px]">
                  <SimField label="Payment terms" sample="Net 30" />
                </div>
              ) : null} */}
            </div>
          </div>
        </div>
      </div>

      <div className={cn(formSectionCardClass, "w-full min-w-0")}>
        <div className="flex flex-col gap-2 border-b border-foreground/[0.09] bg-gradient-to-b from-muted/60 to-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Line items
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Columns follow this template&rsquo;s line settings.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {visibleCols.length} columns
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-foreground/[0.09] bg-muted/80">
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-muted-foreground"
                  >
                    {col.label || col.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-foreground/[0.06] hover:bg-muted/15">
                {visibleCols.map((col) => (
                  <td
                    key={col.key}
                    className="whitespace-nowrap px-3 py-2.5 text-foreground/80"
                  >
                    {sampleForCol(col.key)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {(footerContent || "").trim() ? (
        <div className={cn(formInnerPanelClass)}>
          <FormSectionHeader title="Payment & banking details" />
          <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {footerContent}
          </div>
        </div>
      ) : null}
    </div>
  );
}
