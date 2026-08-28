import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '../api/settings.api';
import { APPROVAL_GROUPS, getSettingsApiErrorMessage } from '../constants';
import { SettingsCard } from './SettingsCard';
import { SettingsFormSection, useSettingsFormDirty } from './settings-ui';
import { SettingsStickyActionBar } from './SettingsStickyActionBar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCan } from '@/hooks/use-can';

export function ApprovalWorkflowTab({
  approvalModules,
  approvalModuleLabels,
  onSaved,
  title,
  description,
  icon = 'shield',
}) {
  const { id: workspaceId } = useParams();
  const canManage = useCan('approvals.manage');
  const baseline = useMemo(() => approvalModules || {}, [approvalModules]);
  const [modules, setModules] = useState(baseline);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = useSettingsFormDirty(baseline, modules);

  useEffect(() => {
    setModules(approvalModules || {});
  }, [approvalModules]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const ungrouped = useMemo(() => {
    const grouped = new Set(Object.values(APPROVAL_GROUPS).flat());
    return Object.entries(approvalModuleLabels || {}).filter(([key]) => !grouped.has(key));
  }, [approvalModuleLabels]);

  const toggle = (key, checked) => {
    setModules((m) => ({ ...m, [key]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await settingsApi.updateApprovalModules({ modules });
      const updated = res.data?.data?.approval_modules || modules;
      toast.success(res.data?.message || 'Approval settings updated.');
      onSaved?.(updated);
      setJustSaved(true);
    } catch (err) {
      toast.error(getSettingsApiErrorMessage(err, 'Failed to update approval settings.'));
    } finally {
      setSaving(false);
    }
  };

  const renderGroup = (title, keys) => {
    const present = keys.filter((k) => approvalModuleLabels?.[k]);
    if (!present.length) return null;
    return (
      <SettingsFormSection key={title} title={title} contentClassName="h-full">
        <div className="space-y-3">
          {present.map((key) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <Label htmlFor={`approval-${key}`} className="text-sm font-normal cursor-pointer">
                {approvalModuleLabels[key]}
              </Label>
              <Switch
                id={`approval-${key}`}
                checked={!!modules[key]}
                onCheckedChange={(v) => toggle(key, v)}
              />
            </div>
          ))}
        </div>
      </SettingsFormSection>
    );
  };

  return (
    <SettingsCard
      title={title || 'Approval workflow'}
      description={description}
      icon={icon}
      useStickyFooter
      contentClassName="pb-0"
      headerExtra={
        canManage ? (
          <Button asChild type="button" variant="outline" size="sm" className="h-8 gap-1.5">
            <Link to={`/workspace/${workspaceId}/accounting/workflows`}>
              <Workflow className="size-3.5" />
              Workflow designer
            </Link>
          </Button>
        ) : null
      }
    >
      <form id="settings-approval-form" onSubmit={handleSubmit} className="pb-1 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Object.entries(APPROVAL_GROUPS).map(([groupTitle, keys]) => renderGroup(groupTitle, keys))}
          {ungrouped.length > 0 ? (
            <SettingsFormSection title="Other">
              <div className="space-y-3">
                {ungrouped.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <Label htmlFor={`approval-${key}`} className="text-sm font-normal cursor-pointer">
                      {label}
                    </Label>
                    <Switch
                      id={`approval-${key}`}
                      checked={!!modules[key]}
                      onCheckedChange={(v) => toggle(key, v)}
                    />
                  </div>
                ))}
              </div>
            </SettingsFormSection>
          ) : null}
        </div>

        <SettingsStickyActionBar
          dirty={dirty}
          saving={saving}
          justSaved={justSaved}
          formId="settings-approval-form"
          onReset={() => setModules(baseline)}
          onCancel={() => setModules(baseline)}
          saveLabel="Save changes"
        />
      </form>
    </SettingsCard>
  );
}
