import { useEffect, useMemo, useState } from 'react';
import { Building2, Globe2, ImageIcon, Mail, MapPin, MonitorSmartphone } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '../api/settings.api';
import {
  buildProfileFormData,
  CURRENCIES,
  getSettingsApiErrorMessage,
  mapCompanyToProfileForm,
} from '../constants';
import {
  SettingsField,
  SettingsFieldGrid,
  SettingsFormSection,
  SettingsFormShell,
  SETTINGS_COMBO_CLASS,
  SETTINGS_INPUT_CLASS,
  useSettingsFormDirty,
} from './settings-ui';
import { SettingsLogoUpload } from './SettingsLogoUpload';
import { SettingsStickyActionBar } from './SettingsStickyActionBar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { getTimezoneOptions, timezoneLabel } from '@/lib/timezone-options';

const TIMEZONE_OPTIONS = getTimezoneOptions();
const FORM_ID = 'settings-profile-form';

export function ProfileTab({ company, logoUrl, onSaved, onPosMenuSaved }) {
  const baseline = useMemo(() => mapCompanyToProfileForm(company), [company]);
  const [form, setForm] = useState(() => mapCompanyToProfileForm(company));
  const [preview, setPreview] = useState(logoUrl || '');
  const [logoFile, setLogoFile] = useState(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // POS visibility used to live on the Navigation tab. It saves on toggle
  // rather than joining this form's Save, because it is a single switch with an
  // immediate, visible effect on the sidebar — batching it behind a form save
  // would make the menu change for no apparent reason later.
  const [showPosMenu, setShowPosMenu] = useState(!!company?.show_pos_menu);
  const [posSaving, setPosSaving] = useState(false);

  useEffect(() => {
    setShowPosMenu(!!company?.show_pos_menu);
  }, [company?.show_pos_menu]);

  const handlePosMenuChange = async (next) => {
    const previous = showPosMenu;
    setShowPosMenu(next);
    setPosSaving(true);
    try {
      const res = await settingsApi.updatePosMenu({ show_pos_menu: next });
      const saved = !!res.data?.data?.show_pos_menu;
      setShowPosMenu(saved);
      onPosMenuSaved?.(saved);
      toast.success(saved ? 'POS added to the Sales menu.' : 'POS hidden from the Sales menu.');
    } catch (err) {
      setShowPosMenu(previous);
      toast.error(err?.response?.data?.message || 'Could not update the POS menu setting.');
    } finally {
      setPosSaving(false);
    }
  };

  useEffect(() => {
    setForm(mapCompanyToProfileForm(company));
    setPreview(logoUrl || '');
    setLogoFile(null);
    setLogoRemoved(false);
  }, [company, logoUrl]);

  const dirty = useSettingsFormDirty(baseline, form, !!logoFile || logoRemoved);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const currencyOptions = useMemo(
    () =>
      CURRENCIES.map((c) => ({
        value: c.code,
        label: c.label,
        keywords: [c.code],
      })),
    [],
  );

  const timezoneOptions = useMemo(
    () =>
      TIMEZONE_OPTIONS.map((tz) => ({
        value: tz,
        label: timezoneLabel(tz),
        keywords: [tz.replace(/_/g, ' ')],
      })),
    [],
  );

  const handleLogoChange = (file) => {
    setLogoFile(file);
    setLogoRemoved(false);
    setPreview(URL.createObjectURL(file));
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoRemoved(true);
    setPreview('');
  };

  const handleReset = () => {
    setForm(baseline);
    setPreview(logoUrl || '');
    setLogoFile(null);
    setLogoRemoved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await settingsApi.updateProfile(buildProfileFormData(form, logoFile));
      const data = res.data?.data || {};
      toast.success(res.data?.message || 'Company profile updated.');
      onSaved?.(data.company, data.logo_url);
      setLogoFile(null);
      setLogoRemoved(false);
      setJustSaved(true);
    } catch (err) {
      toast.error(getSettingsApiErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsFormShell
      formId={FORM_ID}
      onSubmit={handleSubmit}
    >

      <SettingsFormSection icon={ImageIcon} title="Branding">
        <SettingsLogoUpload
          preview={preview}
          onChange={handleLogoChange}
          onRemove={handleLogoRemove}
          disabled={saving}
        />
      </SettingsFormSection>

      <SettingsFormSection icon={Building2} title="Company & tax">
        <SettingsFieldGrid cols={4}>
          <SettingsField label="Company name" required className="sm:col-span-2 lg:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="Industry">
            <Input
              value={form.industry_label || form.industry_key || 'Universal'}
              readOnly
              disabled
              className={`${SETTINGS_INPUT_CLASS} bg-muted/40`}
            />
          </SettingsField>
          <SettingsField label="Tax ID / VAT">
            <Input
              value={form.tax_id}
              onChange={(e) => setField('tax_id', e.target.value)}
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="Registration number" className="sm:col-span-2">
            <Input
              value={form.registration_number}
              onChange={(e) => setField('registration_number', e.target.value)}
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
        </SettingsFieldGrid>
      </SettingsFormSection>

      <SettingsFormSection icon={Mail} title="Contact">
        <SettingsFieldGrid cols={4}>
          <SettingsField label="Email" className="sm:col-span-2">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
        </SettingsFieldGrid>
      </SettingsFormSection>

      <SettingsFormSection icon={Globe2} title="Regional settings">
        <SettingsFieldGrid cols={4}>
          <SettingsField label="Base currency">
            <SearchableCombobox
              value={form.currency}
              onValueChange={(v) => setField('currency', v)}
              options={currencyOptions}
              placeholder="Select currency"
              searchPlaceholder="Search…"
              triggerClassName={SETTINGS_COMBO_CLASS}
            />
          </SettingsField>
          <SettingsField label="Timezone">
            <SearchableCombobox
              value={form.timezone || 'UTC'}
              onValueChange={(v) => setField('timezone', v)}
              options={timezoneOptions}
              placeholder="Select timezone"
              searchPlaceholder="Search…"
              triggerClassName={SETTINGS_COMBO_CLASS}
            />
          </SettingsField>
          <SettingsField label="Fiscal year start">
            <DatePicker value={form.fiscal_year_start} onChange={(v) => setField('fiscal_year_start', v)} />
          </SettingsField>
          <SettingsField label="Fiscal year end">
            <DatePicker value={form.fiscal_year_end} onChange={(v) => setField('fiscal_year_end', v)} />
          </SettingsField>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2.5 rounded-md border border-border/60 px-3 py-2">
            <Switch
              id="multiCurrency"
              checked={form.multi_currency_enabled}
              onCheckedChange={(v) => setField('multi_currency_enabled', v)}
            />
            <Label htmlFor="multiCurrency" className="text-xs font-medium cursor-pointer leading-tight">
              Multi-currency mode
              <span className="block text-[11px] font-normal text-muted-foreground">
                Record documents in other currencies with exchange rates.
              </span>
            </Label>
          </div>
        </SettingsFieldGrid>
      </SettingsFormSection>

      <SettingsFormSection icon={MapPin} title="Address">
        <SettingsFieldGrid cols={4}>
          <SettingsField label="Address line 1" className="sm:col-span-2 lg:col-span-2">
            <Input
              value={form.address_line1}
              onChange={(e) => setField('address_line1', e.target.value)}
              placeholder="Street address"
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="Address line 2" className="sm:col-span-2 lg:col-span-2">
            <Input
              value={form.address_line2}
              onChange={(e) => setField('address_line2', e.target.value)}
              placeholder="Suite, unit, etc."
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="City">
            <Input
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="State / region">
            <Input
              value={form.state}
              onChange={(e) => setField('state', e.target.value)}
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="Postal code">
            <Input
              value={form.postal_code}
              onChange={(e) => setField('postal_code', e.target.value)}
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="Country">
            <Input
              value={form.country}
              onChange={(e) => setField('country', e.target.value)}
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
        </SettingsFieldGrid>
      </SettingsFormSection>

      <SettingsFormSection icon={MonitorSmartphone} title="Workspace">
        <label className="flex cursor-pointer items-start justify-between gap-6 rounded-lg border border-border/70 px-4 py-3.5 transition-colors hover:bg-muted/40">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Point of Sale in the Sales menu
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Shows the POS counter screen in the sidebar under Sales. Turning it off hides the
              menu item only — it does not disable POS or affect existing sales.
            </span>
          </span>
          <Switch
            checked={showPosMenu}
            onCheckedChange={handlePosMenuChange}
            disabled={posSaving}
            aria-label="Show Point of Sale in the Sales menu"
            className="mt-0.5 shrink-0"
          />
        </label>
      </SettingsFormSection>
      <SettingsStickyActionBar
        placement="bottom"
        dirty={dirty}
        saving={saving}
        justSaved={justSaved}
        formId={FORM_ID}
        onReset={handleReset}
        onCancel={handleReset}
        saveLabel="Save changes"
      />
    </SettingsFormShell>
  );
}
