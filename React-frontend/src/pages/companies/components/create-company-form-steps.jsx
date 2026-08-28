import { addYears, format, isValid, parse, subDays } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  COMPANY_TYPES,
  CURRENCIES,
  DEFAULT_COMPANY_TYPE,
  DEFAULT_INDUSTRY_KEY,
  INDUSTRY_OPTIONS,
} from '../constants';
import { FormField, FormSection } from './create-company-ui';

const fieldClass = 'h-10 rounded-lg border-slate-200 bg-white text-sm shadow-none';

export function fiscalYearEndFromStart(startYmd) {
  if (!startYmd) return '';
  const parsed = parse(startYmd, 'yyyy-MM-dd', new Date());
  if (!isValid(parsed)) return '';
  return format(subDays(addYears(parsed, 1), 1), 'yyyy-MM-dd');
}

export function calendarYearRange(year = new Date().getFullYear()) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function CreateCompanyStepBasics({ register, errors, watchValues, setValue }) {
  return (
    <FormSection
      title="Identity"
      description="Legal name and how this entity will appear across the workspace."
    >
      <FormField label="Company name" required error={errors.name?.message}>
        <Input
          {...register('name')}
          placeholder="Acme Corporation Ltd."
          className={fieldClass}
          autoFocus
        />
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Company type" error={errors.type?.message}>
          <Select
            value={watchValues.type || DEFAULT_COMPANY_TYPE}
            onValueChange={(v) => setValue('type', v, { shouldDirty: true })}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Base currency"
          hint="Used for books, reports, and default documents. Choose carefully."
          error={errors.currency?.message}
        >
          <Select
            value={watchValues.currency || 'USD'}
            onValueChange={(v) => setValue('currency', v, { shouldDirty: true })}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField
        label="Industry"
        required
        hint="Sets workspace menus, modules, and default chart of accounts."
        error={errors.industry_key?.message}
      >
        <Select
          value={watchValues.industry_key || DEFAULT_INDUSTRY_KEY}
          onValueChange={(v) =>
            setValue('industry_key', v, { shouldDirty: true, shouldValidate: true })
          }
        >
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Select industry" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRY_OPTIONS.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </FormSection>
  );
}

export function CreateCompanyStepContact({ register, errors }) {
  return (
    <FormSection
      title="Contact & address"
      description="Optional. Used on invoices, statements, and official documents."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Email" error={errors.email?.message}>
          <Input
            type="email"
            {...register('email')}
            placeholder="billing@company.com"
            className={fieldClass}
          />
        </FormField>
        <FormField label="Phone" error={errors.phone?.message}>
          <Input {...register('phone')} placeholder="+1 555 000 0000" className={fieldClass} />
        </FormField>
      </div>

      <FormField label="Address line 1" error={errors.address_line1?.message}>
        <Input {...register('address_line1')} placeholder="Street address" className={fieldClass} />
      </FormField>
      <FormField label="Address line 2" error={errors.address_line2?.message}>
        <Input
          {...register('address_line2')}
          placeholder="Suite, floor, unit"
          className={fieldClass}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <FormField label="City" error={errors.city?.message}>
          <Input {...register('city')} placeholder="City" className={fieldClass} />
        </FormField>
        <FormField label="State / region" error={errors.state?.message}>
          <Input {...register('state')} placeholder="State" className={fieldClass} />
        </FormField>
        <FormField label="Postal code" error={errors.postal_code?.message}>
          <Input {...register('postal_code')} placeholder="Postal code" className={fieldClass} />
        </FormField>
        <FormField label="Country" error={errors.country?.message}>
          <Input {...register('country')} placeholder="Country" className={fieldClass} />
        </FormField>
      </div>
    </FormSection>
  );
}

export function CreateCompanyStepDetails({ register, errors, watchValues, setValue }) {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  function applyFiscalRange(start, end) {
    setValue('fiscal_year_start', start, { shouldDirty: true });
    setValue('fiscal_year_end', end, { shouldDirty: true });
  }

  function handleStartChange(v) {
    setValue('fiscal_year_start', v, { shouldDirty: true });
    if (v) {
      setValue('fiscal_year_end', fiscalYearEndFromStart(v), { shouldDirty: true });
    }
  }

  const presets = [
    { label: `Jan–Dec ${currentYear}`, ...calendarYearRange(currentYear) },
    { label: `Jan–Dec ${lastYear}`, ...calendarYearRange(lastYear) },
  ];

  return (
    <FormSection
      title="Legal & fiscal"
      description="Tax identifiers and reporting period. You can change these later in settings."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Tax ID / VAT number" error={errors.tax_id?.message}>
          <Input
            {...register('tax_id')}
            placeholder="Tax registration number"
            className={fieldClass}
          />
        </FormField>
        <FormField label="Registration number" error={errors.registration_number?.message}>
          <Input
            {...register('registration_number')}
            placeholder="Official company registration"
            className={fieldClass}
          />
        </FormField>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-slate-700">Fiscal year</p>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyFiscalRange(preset.start, preset.end)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Start date"
            hint="Past dates are allowed — e.g. 01/01/2026."
          >
            <DatePicker
              value={watchValues.fiscal_year_start || ''}
              onChange={handleStartChange}
              placeholder="Select start date"
              yearsBefore={15}
              yearsAfter={5}
              className="w-full"
              triggerProps={{ className: `${fieldClass} w-full justify-start font-normal` }}
            />
          </FormField>
          <FormField label="End date" hint="Filled automatically from the start date.">
            <DatePicker
              value={watchValues.fiscal_year_end || ''}
              onChange={(v) => setValue('fiscal_year_end', v, { shouldDirty: true })}
              placeholder="Select end date"
              yearsBefore={15}
              yearsAfter={6}
              className="w-full"
              triggerProps={{ className: `${fieldClass} w-full justify-start font-normal` }}
            />
          </FormField>
        </div>
      </div>

      <FormField
        label="Internal notes"
        hint="Visible only to account administrators."
        error={errors.notes?.message}
      >
        <Textarea
          {...register('notes')}
          rows={4}
          placeholder="Optional notes about this entity…"
          className="min-h-[96px] resize-none rounded-lg border-slate-200 text-sm shadow-none"
        />
      </FormField>
    </FormSection>
  );
}
