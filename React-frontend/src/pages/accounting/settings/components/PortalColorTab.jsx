import { useEffect, useMemo, useState } from 'react';
import { Palette } from 'lucide-react';
import { toast } from 'sonner';
import { applyPortalColor, PORTAL_COLORS, readPortalColor } from '../constants';
import { SettingsCard } from './SettingsCard';
import { SettingsField, SettingsFormSection, useSettingsFormDirty } from './settings-ui';
import { SettingsStickyActionBar } from './SettingsStickyActionBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FORM_ID = 'settings-portal-color-form';

export function PortalColorTab({ title, description, icon = 'palette' }) {
  const baseline = useMemo(() => readPortalColor(), []);
  const [color, setColor] = useState(baseline);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = useSettingsFormDirty({ color: baseline }, { color });

  useEffect(() => {
    setColor(readPortalColor());
  }, []);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const onColorPreview = (value) => {
    setColor(value);
    applyPortalColor(value);
  };

  const handleReset = () => {
    setColor(baseline);
    applyPortalColor(baseline);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    applyPortalColor(color);
    toast.success('Portal accent color saved.');
    setJustSaved(true);
    setSaving(false);
  };

  return (
    <SettingsCard
      title={title || 'Portal appearance'}
      description={description}
      icon={icon}
      useStickyFooter
      contentClassName="pb-0"
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="pb-1">
        <SettingsFormSection
          icon={Palette}
          title="Accent color"
          description="Applied to buttons and highlights across this workspace."
        >
          <SettingsField label="Portal color" className="max-w-md">
            <Select value={color} onValueChange={onColorPreview}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PORTAL_COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
        </SettingsFormSection>

        <SettingsStickyActionBar
          dirty={dirty}
          saving={saving}
          justSaved={justSaved}
          formId={FORM_ID}
          onReset={handleReset}
          onCancel={handleReset}
          saveLabel="Save changes"
        />
      </form>
    </SettingsCard>
  );
}
