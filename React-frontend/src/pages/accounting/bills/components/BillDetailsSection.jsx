import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { InvoiceNumberField } from "../../invoices/components/InvoiceNumberField";
import { UnifiedTemplateField } from "../../invoices/components/UnifiedTemplateField";
import { TemplateCustomFieldsColumnGrid } from "../../invoices/components/TemplateCustomFieldsColumnGrid";
import { resolveFormCustomFieldsForDocument } from "../../invoices/invoice-template-constants";
import { resolvePreviewBillNumber } from "../constants";
import { useCustomerDialog } from "@/components/workspace/customer/customer-dialog-provider";

const NEW_CUSTOMER = "__bill_drop_ship_customer_new__";

function DetailDateField({
  label,
  required,
  value,
  onChange,
  disabled,
  error,
  placeholder,
}) {
  return (
    <div className="space-y-1.5 w-full min-w-0">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <DatePicker
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        allowClear={false}
        className="w-full"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function BillDetailsSection({
  form,
  errors,
  customers = [],
  selectedTemplate,
  setTemplateCustom,
  setMetadataField,
  addTemplateSelectOption,
  onFieldChange,
  onCustomerCreated,
  readOnly,
  billDateLocked,
  isEdit = false,
  currentBillNumber = "",
  billNumberPreview,
  loadingBillNumber,
  checkingBillSequence,
  onToggleBillNumberManual,
  onBillSequenceChange,
}) {
  const customerDialog = useCustomerDialog();
  const headerFields = selectedTemplate?.header_fields || [];
  const formLayout = selectedTemplate?.form_layout || [];
  const { templateFields } = resolveFormCustomFieldsForDocument(
    headerFields,
    formLayout,
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {!readOnly ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <InvoiceNumberField
              label="Bill number"
              autoAssignHint="Assigned automatically on save"
              currentEditHint="Current bill number"
              sequenceErrorId="bill-sequence-error"
              sequenceAriaLabel="Bill sequence number"
              preview={billNumberPreview}
              loading={loadingBillNumber}
              checking={checkingBillSequence}
              manual={form.bill_number_manual}
              sequence={form.bill_sequence}
              error={errors.bill_sequence}
              isEdit={isEdit}
              currentNumber={currentBillNumber}
              resolvePreviewNumber={resolvePreviewBillNumber}
              onToggleManual={onToggleBillNumberManual}
              onSequenceChange={onBillSequenceChange}
            />
          </div>
        ) : null}

        <DetailDateField
          label="Bill date"
          required
          value={form.bill_date}
          onChange={(v) => onFieldChange("bill_date", v)}
          disabled={readOnly || billDateLocked}
          error={errors.bill_date}
          placeholder="Bill date"
        />
        <DetailDateField
          label="Due date"
          required
          value={form.due_date}
          onChange={(v) => onFieldChange("due_date", v)}
          disabled={readOnly}
          error={errors.due_date}
          placeholder="Due date"
        />

        <div className="sm:col-span-2 lg:col-span-3 rounded-md border bg-muted/20 p-3 space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="bill-drop-ship"
              checked={Boolean(form.is_drop_ship)}
              onCheckedChange={(checked) => {
                const enabled = checked === true;
                onFieldChange("is_drop_ship", enabled);
                if (!enabled) {
                  onFieldChange("drop_ship_customer_id", "");
                }
              }}
              disabled={readOnly}
              className="mt-0.5"
            />
            <div className="min-w-0 space-y-0.5">
              <Label
                htmlFor="bill-drop-ship"
                className="text-sm font-medium cursor-pointer"
              >
                Drop ship
              </Label>
              <p className="text-xs text-muted-foreground">
                Vendor ships stock directly to your customer — saved as a
                reference on this bill.
              </p>
            </div>
          </div>

          {form.is_drop_ship ? (
            <div className="space-y-1.5 max-w-md">
              <Label className="text-sm">
                Ship to customer <span className="text-destructive">*</span>
              </Label>
              <SearchableCombobox
                value={form.drop_ship_customer_id || undefined}
                onValueChange={(v) => {
                  if (v === NEW_CUSTOMER) return;
                  onFieldChange("drop_ship_customer_id", v);
                }}
                options={customers.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                  keywords: [c.email].filter(Boolean),
                }))}
                placeholder="Select customer"
                searchPlaceholder="Search customers…"
                disabled={readOnly}
                triggerClassName="h-10"
                actionItems={
                  readOnly
                    ? []
                    : [
                        {
                          value: NEW_CUSTOMER,
                          label: "+ Create customer…",
                          className: "text-primary font-medium",
                          onSelect: () => {
                            customerDialog.openCreate({
                              onSuccess: (customer) => {
                                if (!customer?.id) return;
                                onCustomerCreated?.(customer);
                                onFieldChange(
                                  "drop_ship_customer_id",
                                  String(customer.id),
                                );
                              },
                            });
                          },
                        },
                      ]
                }
              />
              {errors.drop_ship_customer_id ? (
                <p className="text-xs text-destructive">
                  {errors.drop_ship_customer_id}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {templateFields.length > 0 ? (
          <TemplateCustomFieldsColumnGrid
            className="col-span-1 sm:col-span-2 lg:col-span-3"
            fields={templateFields}
            renderField={(f) => (
              <UnifiedTemplateField
                field={f}
                form={form}
                errors={errors}
                setTemplateCustom={setTemplateCustom}
                setMetadataField={setMetadataField}
                metadataKey="bill_metadata_custom_fields"
                addTemplateSelectOption={addTemplateSelectOption}
              />
            )}
          />
        ) : null}
      </div>
    </div>
  );
}
