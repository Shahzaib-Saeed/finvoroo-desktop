import { SettingsCard } from './SettingsCard';
import { SettingsCustomFieldsPanel } from './SettingsCustomFieldsPanel';

export function CustomFieldsTab({ title, description, icon = 'fields' }) {
  return (
    <SettingsCard title={title || 'Custom fields'} description={description} icon={icon}>
      <SettingsCustomFieldsPanel />
    </SettingsCard>
  );
}
