import { useEffect, useMemo, useState } from 'react';
import { CloudOff, Info, Receipt, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '../api/settings.api';
import { getSettingsApiErrorMessage } from '../constants';
import { SettingsCard } from './SettingsCard';
import { SettingsFormSection, useSettingsFormDirty } from './settings-ui';
import { SettingsStickyActionBar } from './SettingsStickyActionBar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { setMeta } from '@/offline/db';
import { useParams } from 'react-router-dom';

const FORM_ID = 'settings-autopost-form';

const BILLING_MODE_OPTIONS = [
  {
    value: 'invoice_anytime',
    title: 'Invoice anytime',
    description: 'Allow invoicing before, during, or after delivery.',
  },
  {
    value: 'invoice_up_to_delivered',
    title: 'Invoice up to delivered qty',
    description: 'Block invoicing above delivered and not-yet-invoiced quantity.',
  },
  {
    value: 'invoice_on_delivery_only',
    title: 'Delivery-linked invoicing only',
    description: 'Require invoice lines linked to delivered sales-order lines.',
  },
];

export function AutoPostTab({
  autoPost,
  offlineSyncEnabled: offlineSyncProp,
  showFullChartOfAccounts,
  invoiceBillingMode,
  onSaved,
  title,
  description,
  icon = 'zap',
}) {
  const { id: companyId } = useParams();
  const baseline = useMemo(
    () => ({
      autoPost: !!autoPost,
      offlineSync: !!offlineSyncProp,
      fullCoa: !!showFullChartOfAccounts,
      billingMode: invoiceBillingMode || 'invoice_anytime',
    }),
    [autoPost, offlineSyncProp, showFullChartOfAccounts, invoiceBillingMode],
  );

  const [autoPostEnabled, setAutoPostEnabled] = useState(baseline.autoPost);
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState(baseline.offlineSync);
  const [fullCoaEnabled, setFullCoaEnabled] = useState(baseline.fullCoa);
  const [billingMode, setBillingMode] = useState(baseline.billingMode);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const current = useMemo(
    () => ({
      autoPost: autoPostEnabled,
      offlineSync: offlineSyncEnabled,
      fullCoa: fullCoaEnabled,
      billingMode,
    }),
    [autoPostEnabled, offlineSyncEnabled, fullCoaEnabled, billingMode],
  );

  const dirty = useSettingsFormDirty(baseline, current);

  useEffect(() => {
    setAutoPostEnabled(baseline.autoPost);
    setOfflineSyncEnabled(baseline.offlineSync);
    setFullCoaEnabled(baseline.fullCoa);
    setBillingMode(baseline.billingMode);
  }, [baseline]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const handleReset = () => {
    setAutoPostEnabled(baseline.autoPost);
    setOfflineSyncEnabled(baseline.offlineSync);
    setFullCoaEnabled(baseline.fullCoa);
    setBillingMode(baseline.billingMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const [autoPostRes, offlineRes, coaRes, billingRes] = await Promise.all([
        settingsApi.updateAutoPost({ auto_post_to_accounting: autoPostEnabled }),
        settingsApi.updateOfflineSync({ offline_sync_enabled: offlineSyncEnabled }),
        settingsApi.updateFullChartOfAccounts({ show_full_chart_of_accounts: fullCoaEnabled }),
        settingsApi.updateInvoiceBillingMode({ invoice_billing_mode: billingMode }),
      ]);
      const offlineOn = !!offlineRes.data?.data?.offline_sync_enabled;
      if (companyId) {
        await setMeta(companyId, 'offline_sync_enabled', offlineOn);
      }
      toast.success(autoPostRes.data?.message || 'Posting preferences updated.');
      onSaved?.({
        auto_post_to_accounting: !!autoPostRes.data?.data?.auto_post_to_accounting,
        offline_sync_enabled: offlineOn,
        show_full_chart_of_accounts: !!coaRes.data?.data?.show_full_chart_of_accounts,
        invoice_billing_mode: billingRes.data?.data?.invoice_billing_mode || billingMode,
      });
      setJustSaved(true);
    } catch (err) {
      toast.error(getSettingsApiErrorMessage(err, 'Failed to update posting preferences.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title={title || 'Posting & billing'}
      description={description}
      icon={icon}
      useStickyFooter
      contentClassName="pb-0"
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4 pb-1">
        <SettingsFormSection
          icon={CloudOff}
          title="Offline sync"
          description="Allow this company to draft documents offline and sync when back online."
        >
          <div className="flex gap-2 rounded-lg border border-info/25 bg-info/5 p-3 text-sm text-info mb-4">
            <Info className="size-4 shrink-0 mt-0.5" />
            <p>
              Draft invoices, quotations, bills, POs, expenses, and POS sales can be queued offline.
              Posting, payments, and stock changes still require a connection.
            </p>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/15 p-4 flex items-start gap-3">
            <Switch
              id="offlineSync"
              checked={offlineSyncEnabled}
              onCheckedChange={setOfflineSyncEnabled}
            />
            <div>
              <Label htmlFor="offlineSync" className="font-medium cursor-pointer text-sm">
                Enable offline sync for this company
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Turn off to block sync APIs and hide offline save behavior.
              </p>
            </div>
          </div>
        </SettingsFormSection>

        <SettingsFormSection
          icon={Zap}
          title="Automatic posting"
          description="Control when invoices and bills create journal entries."
        >
          <div className="flex gap-2 rounded-lg border border-info/25 bg-info/5 p-3 text-sm text-info mb-4">
            <Info className="size-4 shrink-0 mt-0.5" />
            <p>
              When auto-post is on, manual &ldquo;Post to accounting&rdquo; is hidden for invoices and bills.
              Other modules keep their existing approval and posting behavior.
            </p>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/15 p-4 flex items-start gap-3">
            <Switch id="autoPost" checked={autoPostEnabled} onCheckedChange={setAutoPostEnabled} />
            <div>
              <Label htmlFor="autoPost" className="font-medium cursor-pointer text-sm">
                Automatically post invoices and bills to accounting
              </Label>
            </div>
          </div>
        </SettingsFormSection>

        <SettingsFormSection
          title="Chart of accounts pickers"
          description="Which accounts appear in payment and deposit forms."
        >
          <div className="flex gap-2 rounded-lg border border-border/80 bg-muted/15 p-3 text-sm text-muted-foreground mb-4">
            <Info className="size-4 shrink-0 mt-0.5" />
            <p>
              When enabled, receipts, deposits, and bill payments show the full chart grouped by type.
              When disabled, only related accounts are shown.
            </p>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/15 p-4 flex items-start gap-3">
            <Switch id="fullCoaPicker" checked={fullCoaEnabled} onCheckedChange={setFullCoaEnabled} />
            <div>
              <Label htmlFor="fullCoaPicker" className="font-medium cursor-pointer text-sm">
                Show full chart of accounts in payment and deposit pickers
              </Label>
            </div>
          </div>
        </SettingsFormSection>

        <SettingsFormSection
          icon={Receipt}
          title="Sales order billing"
          description="How strictly invoice quantities follow delivery progress."
        >
          <div className="grid grid-cols-1 gap-2">
            {BILLING_MODE_OPTIONS.map((option) => {
              const selected = billingMode === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    'block cursor-pointer rounded-lg border p-3 transition-colors',
                    selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/80 hover:border-primary/30',
                  )}
                >
                  <input
                    type="radio"
                    name="invoice_billing_mode"
                    value={option.value}
                    checked={selected}
                    onChange={() => setBillingMode(option.value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
                </label>
              );
            })}
          </div>
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
