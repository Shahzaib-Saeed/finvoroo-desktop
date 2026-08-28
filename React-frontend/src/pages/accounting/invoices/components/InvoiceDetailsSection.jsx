import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { InvoiceNumberField } from './InvoiceNumberField';
import { UnifiedTemplateField } from './UnifiedTemplateField';
import { TemplateCustomFieldsColumnGrid } from './TemplateCustomFieldsColumnGrid';
import { resolveFormCustomFieldsForDocument } from '../invoice-template-constants';
import { invoiceFieldLabelClass } from './invoice-form-design';
import { createInvoiceEnterKeyDownHandler } from './invoice-form-keyboard';
import { cn } from '@/lib/utils';

const onEnterNextField = createInvoiceEnterKeyDownHandler();

const STATUS_STYLES = {
  draft: 'border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  sent: 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  partial: 'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40',
  overdue: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/40',
  cancelled: 'border-muted bg-muted text-muted-foreground',
};

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
      <Label className={invoiceFieldLabelClass}>
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
        triggerProps={{
          'data-enter-nav': '1',
          onKeyDown: onEnterNextField,
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function InvoiceDetailsSection({
  form,
  errors,
  postedLocked,
  isEdit,
  invoiceStatus = 'draft',
  currentInvoiceNumber,
  selectedTemplate,
  invoiceNumberPreview,
  loadingInvoiceNumber,
  checkingInvoiceSequence,
  onFieldChange,
  onToggleInvoiceNumberManual,
  onInvoiceSequenceChange,
  setTemplateCustom,
  setInvoiceMetadataField,
  addTemplateSelectOption,
}) {
  const headerFields = selectedTemplate?.header_fields || [];
  const formLayout = selectedTemplate?.form_layout || [];
  const { templateFields } = resolveFormCustomFieldsForDocument(headerFields, formLayout);
  const statusKey = String(invoiceStatus || 'draft').toLowerCase();
  const numberingMethod = form.invoice_number_manual ? 'Manual sequence' : 'Auto-assigned';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <Badge
          variant="outline"
          className={cn('h-6 px-2.5 text-[11px] font-semibold capitalize', STATUS_STYLES[statusKey] || STATUS_STYLES.draft)}
        >
          {statusKey.replace(/_/g, ' ')}
        </Badge>
        <Badge variant="outline" className="h-6 px-2.5 text-[11px] font-medium text-muted-foreground">
          {numberingMethod}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!postedLocked ? (
          <InvoiceNumberField
            compact
            preview={invoiceNumberPreview}
            loading={loadingInvoiceNumber}
            checking={checkingInvoiceSequence}
            manual={form.invoice_number_manual}
            sequence={form.invoice_sequence}
            error={errors.invoice_sequence}
            isEdit={isEdit}
            currentInvoiceNumber={currentInvoiceNumber}
            onToggleManual={onToggleInvoiceNumberManual}
            onSequenceChange={onInvoiceSequenceChange}
          />
        ) : null}

        <DetailDateField
          label="Invoice date"
          required
          value={form.invoice_date}
          onChange={(v) => onFieldChange('invoice_date', v)}
          disabled={postedLocked}
          error={errors.invoice_date}
          placeholder="Invoice date"
        />
        <DetailDateField
          label="Due date"
          required
          value={form.due_date}
          onChange={(v) => onFieldChange('due_date', v)}
          error={errors.due_date}
          placeholder="Due date"
        />

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
                setMetadataField={setInvoiceMetadataField}
                metadataKey="invoice_metadata_custom_fields"
                addTemplateSelectOption={addTemplateSelectOption}
                isEdit={isEdit}
              />
            )}
          />
        ) : null}
      </div>
    </div>
  );
}
