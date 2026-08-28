import { Link, useParams } from 'react-router';
import { Briefcase, CalendarRange, ExternalLink, Loader2, Save, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { useCustomerDialog } from '@/components/workspace/customer/customer-dialog-provider';
import { useVendorDialog } from '@/components/workspace/vendor/vendor-dialog-provider';
import { MetadataCustomFields } from '@/components/accounting/MetadataCustomFields';
import { JobOrderListOptionField } from './JobOrderListOptionField';
import { JobOrderAttachments } from './JobOrderAttachments';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import {
  CREATE_JOB_TYPES,
  CREATE_MAINTENANCE_JOB_TYPE,
  formatJobSequencePreview,
  getCreateJobTypeMeta,
  jobNumberPrefixLabel,
  JOB_TYPES,
} from '../constants';

const NEW_CUSTOMER = '__job_order_customer_new__';
const NEW_VENDOR = '__job_order_vendor_new__';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function JobOrderForm({
  form,
  setField,
  errors,
  employees,
  fixedAssets,
  customers,
  vendors = [],
  onCustomerCreated,
  onVendorCreated,
  customFieldDefinitions = [],
  statusOptions = [],
  priorityOptions = [],
  attachments = [],
  pendingFiles = [],
  attachmentBusyId,
  addPendingFiles,
  removePendingFile,
  deleteAttachment,
  downloadAttachment,
  setMetadataField,
  addMetadataSelectOption,
  addListOption,
  loading,
  loadingOptions,
  loadingSource,
  saving,
  isEdit,
  onSubmit,
  onCancel,
}) {
  const { id: workspaceId } = useParams();
  const customFieldsSettingsUrl = `/workspace/${workspaceId}/accounting/settings?tab=custom-fields`;
  const customerDialog = useCustomerDialog();
  const vendorDialog = useVendorDialog();
  if (loading || loadingOptions || loadingSource) {
    return (
      <div className="flex items-center justify-center bg-white py-16 text-slate-500">
        <Loader2 className="size-6 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  const isLinkedSalesJob = isEdit && ['sales', 'production'].includes(form.job_type);
  const isMaintenance = form.job_type === CREATE_MAINTENANCE_JOB_TYPE;
  const jobTypeOptions = isEdit ? JOB_TYPES : CREATE_JOB_TYPES;
  const showJobType = isEdit && !isLinkedSalesJob;
  const showFixedAsset = isMaintenance;
  const showCustomer = !isMaintenance;
  const createTypeMeta = !isEdit ? getCreateJobTypeMeta(form.job_type) : null;
  const CreateTypeIcon = isMaintenance ? Wrench : Briefcase;

  return (
    <form onSubmit={onSubmit} className="flex min-h-full flex-col space-y-6 bg-white">
      <div className="grid flex-1 grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-7">
      {!isEdit && createTypeMeta ? (
        <div
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600"
            >
              <CreateTypeIcon className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-slate-950">{createTypeMeta.label}</p>
              <p className="text-xs leading-relaxed text-slate-500">
                {createTypeMeta.description}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Job details</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {isMaintenance
              ? 'Describe the maintenance work and select the asset being serviced.'
              : 'Core information for this job. Link invoices, bills, and costs from the job page to track profit.'}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>
              Job name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="e.g. Kitchen remodel — Smith residence"
              className={errors.title ? 'border-destructive' : ''}
            />
            <FieldError message={errors.title} />
          </div>

          <div className="space-y-2">
            <Label>Job number</Label>
            <div className="flex items-stretch gap-2 max-w-xs">
              <div className="flex h-10 shrink-0 items-center rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-500">
                {jobNumberPrefixLabel(
                  form.start_date || form.due_date || undefined,
                )}
              </div>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.job_sequence}
                onChange={(e) => setField('job_sequence', e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 12"
                aria-label="Job number"
                className={`font-mono tabular-nums ${errors.job_sequence ? 'border-destructive' : ''}`}
              />
            </div>
            <p className={`text-xs ${errors.job_sequence ? 'text-destructive' : 'text-slate-500'}`}>
              {form.job_sequence
                ? `Preview: ${formatJobSequencePreview(form.job_sequence, form.start_date || form.due_date || undefined)}`
                : isEdit
                  ? 'Change to renumber this job. Must be unique.'
                  : 'Leave blank to auto-assign the next number.'}
            </p>
            <FieldError message={errors.job_sequence} />
          </div>

          {showJobType ? (
            <div className="space-y-2">
              <Label>Job type</Label>
              <Select value={form.job_type} onValueChange={(v) => setField('job_type', v)}>
                <SelectTrigger className={errors.job_type ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {jobTypeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.job_type} />
            </div>
          ) : isLinkedSalesJob ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Job type</Label>
              <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm capitalize text-slate-500">
                {JOB_TYPES.find((t) => t.value === form.job_type)?.label || form.job_type} (linked
                from sales order — view only)
              </p>
            </div>
          ) : null}

          <JobOrderListOptionField
            label="Status"
            value={form.status || 'scheduled'}
            onValueChange={(v) => setField('status', v)}
            options={statusOptions}
            error={errors.status}
            placeholder="Select status"
            onAddOption={(label) => addListOption('status', label)}
          />

          <JobOrderListOptionField
            label="Priority"
            value={form.priority || 'normal'}
            onValueChange={(v) => setField('priority', v)}
            options={priorityOptions}
            error={errors.priority}
            placeholder="Select priority"
            onAddOption={(label) => addListOption('priority', label)}
          />

          {showCustomer && (
            <div className="space-y-2">
              <Label>Customer</Label>
              <SearchableCombobox
                value={form.customer_id || ''}
                onValueChange={(v) => {
                  if (v === NEW_CUSTOMER) return;
                  setField('customer_id', v && v !== '_none' ? v : '');
                }}
                options={customers.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
                placeholder="Select customer"
                searchPlaceholder="Search customers…"
                allowNone
                noneLabel="None"
                triggerClassName="h-10"
                actionItems={[
                  {
                    value: NEW_CUSTOMER,
                    label: '+ Create customer…',
                    className: 'text-primary font-medium',
                    onSelect: () => {
                      customerDialog.openCreate({
                        onSuccess: (created) => onCustomerCreated?.(created),
                      });
                    },
                  },
                ]}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Vendor</Label>
            <SearchableCombobox
              value={form.vendor_id || ''}
              onValueChange={(v) => {
                if (v === NEW_VENDOR) return;
                setField('vendor_id', v && v !== '_none' ? v : '');
              }}
              options={vendors.map((v) => ({
                value: String(v.id),
                label: v.name,
              }))}
              placeholder="Select vendor"
              searchPlaceholder="Search vendors…"
              allowNone
              noneLabel="None"
              triggerClassName="h-10"
              actionItems={[
                {
                  value: NEW_VENDOR,
                  label: '+ Create vendor…',
                  className: 'text-primary font-medium',
                  onSelect: () => {
                    vendorDialog.openCreate({
                      onSuccess: (created) => onVendorCreated?.(created),
                    });
                  },
                },
              ]}
            />
          </div>

          {showFixedAsset && (
            <div className="space-y-2 sm:col-span-2">
              <Label>
                Fixed asset <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.fixed_asset_id || ''}
                onValueChange={(v) => setField('fixed_asset_id', v)}
              >
                <SelectTrigger className={errors.fixed_asset_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {fixedAssets.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.asset_name}
                      {a.asset_code ? ` (${a.asset_code})` : ''}
                      {a.location ? ` — ${a.location}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.fixed_asset_id} />
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label>Assigned to</Label>
            <Select
              value={form.assigned_to || ''}
              onValueChange={(v) => setField('assigned_to', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={4}
              placeholder="Scope, site access, budget notes…"
            />
          </div>

          {isEdit ? (
            <>
              <div className="space-y-2 border-t border-slate-200 pt-4 sm:col-span-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Budget estimates (optional)
                </h4>
                <p className="text-xs text-slate-500">
                  Compare planned revenue and cost against actuals on the job page.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Estimated revenue</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimated_revenue}
                  onChange={(e) => setField('estimated_revenue', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated cost</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimated_cost}
                  onChange={(e) => setField('estimated_cost', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <CalendarRange className="size-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Schedule</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Plan when work starts, when it should finish, and the target deadline.
            </p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>Start date</Label>
            <DatePicker
              value={form.start_date}
              onChange={(v) => setField('start_date', v || '')}
              placeholder="When work begins"
            />
            <FieldError message={errors.start_date} />
          </div>
          <div className="space-y-2">
            <Label>Target end date</Label>
            <DatePicker
              value={form.due_date}
              onChange={(v) => setField('due_date', v || '')}
              placeholder="Planned completion"
            />
            <FieldError message={errors.due_date} />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <DatePicker
              value={form.end_date}
              onChange={(v) => setField('end_date', v || '')}
              placeholder="Actual completion"
            />
            <FieldError message={errors.end_date} />
          </div>
        </div>
      </section>
        </div>

        <aside className="min-w-0 lg:col-span-5">
          <div className="space-y-6">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Custom fields</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Company-specific data for this job. Define fields once, then fill them on every
                  new job.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" asChild className="w-full sm:w-auto self-start">
                <Link to={customFieldsSettingsUrl}>
                  <ExternalLink className="size-4 mr-1" />
                  Manage in settings
                </Link>
              </Button>
            </div>
            {customFieldDefinitions.length > 0 ? (
              <MetadataCustomFields
                definitions={customFieldDefinitions}
                values={form.job_metadata_custom_fields || {}}
                onChange={setMetadataField}
                onAddSelectOption={addMetadataSelectOption}
                errors={errors}
                errorsPrefix="job_metadata_custom_fields"
                className="grid-cols-1"
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                <p className="text-sm text-slate-500">
                  No custom fields yet for your company.
                </p>
                <Button type="button" variant="link" size="sm" className="mt-1" asChild>
                  <Link to={customFieldsSettingsUrl}>Add your first custom field in settings</Link>
                </Button>
              </div>
            )}
            </section>
            <JobOrderAttachments
              attachments={attachments}
              pendingFiles={pendingFiles}
              busyId={attachmentBusyId}
              onAddFiles={addPendingFiles}
              onRemovePending={removePendingFile}
              onDelete={deleteAttachment}
              onDownload={downloadAttachment}
            />
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-8px_20px_-18px_rgba(15,23,42,0.35)] sm:-mx-8 sm:px-8">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
          {isEdit ? 'Save changes' : 'Create job'}
        </Button>
      </div>
    </form>
  );
}
