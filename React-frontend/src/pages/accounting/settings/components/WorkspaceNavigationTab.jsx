import { useEffect, useMemo, useState } from 'react';
import { LayoutTemplate, PanelLeft, RefreshCw, Store } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '../api/settings.api';
import { getSettingsApiErrorMessage } from '../constants';
import { SettingsCard } from './SettingsCard';
import { SettingsFormSection, useSettingsFormDirty } from './settings-ui';
import { SettingsStickyActionBar } from './SettingsStickyActionBar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const OPTIONS = [
  {
    value: 'sidebar',
    title: 'Classic sidebar',
    description:
      'Vertical menu on the left — best for deep ERP navigation and familiar accounting workflows.',
    icon: PanelLeft,
    iconClass: 'bg-primary/10 text-primary',
  },
  {
    value: 'top_nav',
    title: 'Top navigation',
    description:
      'Full-width content with a slim bar under the header and quick links. Use the gear “Workspace” menu for the full module list.',
    icon: LayoutTemplate,
    iconClass: 'bg-emerald-500/10 text-emerald-600',
  },
];

export function WorkspaceNavigationTab({
  workspaceNavigation,
  showPosMenu: showPosMenuProp,
  onSaved,
  title,
  description,
  icon = 'layout',
}) {
  const baseline = useMemo(
    () => ({
      navigation: workspaceNavigation || 'sidebar',
      showPosMenu: !!showPosMenuProp,
    }),
    [workspaceNavigation, showPosMenuProp],
  );
  const [value, setValue] = useState(baseline.navigation);
  const [showPosMenu, setShowPosMenu] = useState(baseline.showPosMenu);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const current = useMemo(
    () => ({ navigation: value, showPosMenu }),
    [value, showPosMenu],
  );
  const dirty = useSettingsFormDirty(baseline, current);

  useEffect(() => {
    setValue(baseline.navigation);
    setShowPosMenu(baseline.showPosMenu);
  }, [baseline]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const handleReset = () => {
    setValue(baseline.navigation);
    setShowPosMenu(baseline.showPosMenu);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const [navRes, posRes] = await Promise.all([
        settingsApi.updateWorkspaceNavigation({ workspace_navigation: value }),
        settingsApi.updatePosMenu({ show_pos_menu: showPosMenu }),
      ]);
      const nextNav = navRes.data?.data?.workspace_navigation || value;
      const nextPos = !!posRes.data?.data?.show_pos_menu;
      toast.success(navRes.data?.message || 'Navigation settings updated.');
      onSaved?.({
        workspace_navigation: nextNav,
        show_pos_menu: nextPos,
      });
      setJustSaved(true);
    } catch (err) {
      toast.error(getSettingsApiErrorMessage(err, 'Failed to update navigation settings.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title={title || 'Navigation layout'}
      description={description}
      icon={icon}
      useStickyFooter
      contentClassName="pb-0"
    >
      <form id="settings-nav-form" onSubmit={handleSubmit} className="space-y-4 pb-1">
        <SettingsFormSection
          icon={LayoutTemplate}
          title="Layout style"
          description="Choose how modules are organized in this workspace."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = value === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    'block cursor-pointer rounded-lg border-2 p-4 transition-colors',
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                  )}
                >
                  <input
                    type="radio"
                    name="workspace_navigation"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setValue(opt.value)}
                    className="sr-only"
                  />
                  <span className="flex items-start gap-3">
                    <span
                      className={cn(
                        'inline-flex rounded-lg p-2.5 shrink-0',
                        opt.iconClass,
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="font-semibold text-foreground block">{opt.title}</span>
                      <span className="text-sm text-muted-foreground block mt-1">{opt.description}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex gap-2 rounded-lg border border-border/80 bg-muted/15 p-3 text-sm text-muted-foreground mt-4">
            <RefreshCw className="size-4 shrink-0 text-primary mt-0.5" />
            <p>After changing layout style, refresh the page to apply it everywhere.</p>
          </div>
        </SettingsFormSection>

        <SettingsFormSection
          icon={Store}
          title="Point of Sale"
          description="Control whether POS appears in the Sales menu."
        >
          <div className="rounded-lg border border-border/80 bg-muted/15 p-4 flex items-start gap-3">
            <Switch
              id="showPosMenu"
              checked={showPosMenu}
              onCheckedChange={setShowPosMenu}
            />
            <div>
              <Label htmlFor="showPosMenu" className="font-medium cursor-pointer text-sm">
                Show Point of Sale link in navigation
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                When off, POS stays available by direct URL for users with permission, but is hidden
                from the sidebar and workspace menu.
              </p>
            </div>
          </div>
        </SettingsFormSection>

      </form>
        <SettingsStickyActionBar
        placement="bottom"
          dirty={dirty}
          saving={saving}
          justSaved={justSaved}
          formId="settings-nav-form"
          onReset={handleReset}
          onCancel={handleReset}
          saveLabel="Save changes"
        />
    </SettingsCard>
  );
}
