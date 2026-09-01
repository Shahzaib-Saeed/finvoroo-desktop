import { useEffect, useMemo, useState } from 'react';
import { Box } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '../api/settings.api';
import { getSettingsApiErrorMessage, INVENTORY_MODELS } from '../constants';
import { SettingsCard } from './SettingsCard';
import { SettingsField, SettingsFormSection, SettingsFormShell, useSettingsFormDirty } from './settings-ui';
import { SettingsStickyActionBar } from './SettingsStickyActionBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FORM_ID = 'settings-inventory-form';

export function InventoryTab({ inventoryModel, onSaved, title, description, icon = 'box' }) {
  const baseline = useMemo(() => inventoryModel || 'fifo', [inventoryModel]);
  const [model, setModel] = useState(baseline);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = useSettingsFormDirty({ model: baseline }, { model });

  useEffect(() => {
    setModel(inventoryModel || 'fifo');
  }, [inventoryModel]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await settingsApi.updateInventoryModel({ inventory_model: model });
      toast.success(res.data?.message || 'Inventory model updated.');
      onSaved?.(model);
      setJustSaved(true);
    } catch (err) {
      toast.error(getSettingsApiErrorMessage(err, 'Failed to update inventory model.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title={title || 'Inventory costing'}
      description={description}
      icon={icon}
      useStickyFooter
      contentClassName="pb-0 flex flex-col flex-1 min-h-0"
    >
      <SettingsFormShell
        formId={FORM_ID}
        onSubmit={handleSubmit}
        footer={
          <SettingsStickyActionBar
            placement="bottom"
            dirty={dirty}
            saving={saving}
            justSaved={justSaved}
            formId={FORM_ID}
            onReset={() => setModel(baseline)}
            onCancel={() => setModel(baseline)}
            saveLabel="Save changes"
          />
        }
      >
        <SettingsFormSection
          icon={Box}
          title="Costing method"
          description="How stock value is calculated when items are sold or adjusted."
        >
          <SettingsField
            label="Inventory model"
            hint="FIFO assumes oldest inventory is sold first. LIFO assumes newest. Average uses weighted average cost."
            className="max-w-xl"
          >
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
        </SettingsFormSection>
      </SettingsFormShell>
    </SettingsCard>
  );
}
