import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { pharmacyApi } from '@/industries/pharmacy/api/pharmacy.api';
import { getPosBridgeUrl, setPosBridgeUrl } from '@/lib/print-pos-receipt';
import { SettingsCard } from './SettingsCard';
import { SettingsFormSection, SettingsToggleRow, SETTINGS_INPUT_CLASS } from './settings-ui';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

const SALES_TOGGLES = [
  {
    key: 'fefo_strict',
    label: 'Strict FEFO',
    hint: 'Always pick the earliest-expiring batch. Staff cannot override it on a sale.',
  },
  {
    key: 'block_expired_sales',
    label: 'Block expired stock',
    hint: 'Stop checkout if the selected batch is already expired.',
  },
  {
    key: 'warn_below_cost',
    label: 'Warn below cost',
    hint: 'Flag the sale when the unit price is under pack cost.',
  },
  {
    key: 'warn_above_mrp',
    label: 'Warn above MRP',
    hint: 'Flag the sale when the unit price exceeds MRP.',
  },
  {
    key: 'require_rx_note_for_rx',
    label: 'Require Rx note',
    hint: 'Ask for a prescription note on Rx items. Stored on the invoice.',
  },
  {
    key: 'block_controlled_without_permission',
    label: 'Lock controlled drugs',
    hint: 'Block controlled items unless the user is allowed to dispense them.',
  },
  {
    key: 'require_pos_employee_pin',
    label: 'Require employee PIN',
    hint: 'Ask for a PIN before completing a sale. Turn off to post as the logged-in user.',
  },
];

function PharmacySettingsLoading({ title, description }) {
  return (
    <SettingsCard title={title} description={description}>
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading pharmacy settings…
      </div>
    </SettingsCard>
  );
}

export function usePharmacyWorkspaceSettings(enabled = true) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(!!enabled);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = unwrap(await pharmacyApi.settings());
      setSettings(data?.settings || data || {});
    } catch {
      toast.error('Could not load pharmacy settings');
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch) => {
    setSaving(true);
    try {
      const data = unwrap(await pharmacyApi.updateSettings(patch));
      setSettings(data?.settings || data);
      toast.success('Saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return { settings, loading, saving, save, load };
}

export function PharmacyTab({ title, description, settings, loading, saving, save }) {
  if (loading || !settings) {
    return <PharmacySettingsLoading title={title} description={description} />;
  }

  return (
    <SettingsCard title={title || 'Pharmacy'} description={description}>
      <SettingsFormSection
        title="Sales & compliance"
        description="Applied at the counter when a batch is chosen and a sale is completed."
      >
        <div className="divide-y divide-border/60">
          {SALES_TOGGLES.map(({ key, label, hint }) => (
            <SettingsToggleRow
              key={key}
              id={`pharmacy-${key}`}
              label={label}
              hint={hint}
              checked={!!settings[key]}
              disabled={saving}
              onCheckedChange={(v) => save({ [key]: v })}
            />
          ))}
          <SettingsToggleRow
            id="pharmacy-warn-near-expiry"
            label="Near-expiry warning"
            hint="Show a warning this many days before a batch expires."
            control={
              <Input
                id="pharmacy-warn-near-expiry"
                type="number"
                min={1}
                max={365}
                className={`${SETTINGS_INPUT_CLASS} w-[88px] text-right tabular-nums`}
                defaultValue={settings.warn_near_expiry_days ?? 90}
                disabled={saving}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (n > 0 && n !== settings.warn_near_expiry_days) {
                    save({ warn_near_expiry_days: n });
                  }
                }}
              />
            }
          />
        </div>
      </SettingsFormSection>

      <SettingsFormSection
        title="Purchase defaults"
        description="Used only when a supplier invoice omits batch or expiry. Scanned values always win."
      >
        <div className="divide-y divide-border/60">
          <SettingsToggleRow
            id="pharmacy-use-default-batch"
            label="Fill missing batch"
            hint="Use the default batch number when the invoice has none."
            checked={settings.use_default_batch_when_missing !== false}
            disabled={saving}
            onCheckedChange={(v) => save({ use_default_batch_when_missing: v })}
          />
          <SettingsToggleRow
            id="pharmacy-default-batch"
            label="Default batch number"
            hint="Applied to empty batch fields on receive."
            control={
              <Input
                id="pharmacy-default-batch"
                className={`${SETTINGS_INPUT_CLASS} w-[140px]`}
                placeholder="NA"
                defaultValue={settings.default_batch_when_missing ?? ''}
                disabled={saving}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (settings.default_batch_when_missing ?? '')) {
                    save({ default_batch_when_missing: v });
                  }
                }}
              />
            }
          />
          <SettingsToggleRow
            id="pharmacy-use-default-expiry"
            label="Fill missing expiry"
            hint="Use the default expiry when the invoice has none."
            checked={settings.use_default_expiry_when_missing !== false}
            disabled={saving}
            onCheckedChange={(v) => save({ use_default_expiry_when_missing: v })}
          />
          <SettingsToggleRow
            id="pharmacy-default-expiry"
            label="Default expiry"
            hint="Month / year format, for example 12/28."
            control={
              <Input
                id="pharmacy-default-expiry"
                className={`${SETTINGS_INPUT_CLASS} w-[88px] tabular-nums`}
                placeholder="12/28"
                defaultValue={settings.default_expiry_when_missing ?? ''}
                disabled={saving}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (settings.default_expiry_when_missing ?? '')) {
                    save({ default_expiry_when_missing: v });
                  }
                }}
              />
            }
          />
        </div>
      </SettingsFormSection>
    </SettingsCard>
  );
}

export function PharmacyPrintExtras({ settings, loading, saving, save }) {
  const [bridgeUrl, setBridgeUrl] = useState(() => getPosBridgeUrl());

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading receipt options…
      </div>
    );
  }

  return (
    <>
      <SettingsFormSection
        title="Receipt appearance"
        description="What prints on the thermal slip after a sale."
      >
        <div className="divide-y divide-border/60">
          <SettingsToggleRow
            id="pharmacy-receipt-logo"
            label="Company logo"
            hint="Print the store logo at the top of the receipt."
            checked={settings.receipt_show_logo !== false}
            disabled={saving}
            onCheckedChange={(v) => save({ receipt_show_logo: v })}
          />
          <SettingsToggleRow
            id="pharmacy-receipt-branding"
            label="Branding footer"
            hint="Add store details at the bottom of the slip."
            checked={!!settings.receipt_branding_back}
            disabled={saving}
            onCheckedChange={(v) => save({ receipt_branding_back: v })}
          />
        </div>
      </SettingsFormSection>

      <SettingsFormSection
        title="POS service fee"
        description="Optional flat fee added to every sale and shown on the receipt."
      >
        <div className="divide-y divide-border/60">
          <SettingsToggleRow
            id="pharmacy-pos-fee"
            label="Charge a POS fee"
            hint="Adds the amount below to the customer total."
            checked={!!settings.pos_fee_enabled}
            disabled={saving}
            onCheckedChange={(v) => save({ pos_fee_enabled: v })}
          />
          <SettingsToggleRow
            id="pharmacy-pos-fee-amount"
            label="Fee amount"
            hint="Printed as its own line on the receipt."
            control={
              <Input
                id="pharmacy-pos-fee-amount"
                type="number"
                min={0}
                step="0.01"
                className={`${SETTINGS_INPUT_CLASS} w-24 tabular-nums`}
                defaultValue={settings.pos_fee_amount ?? 1}
                disabled={saving || !settings.pos_fee_enabled}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  const next = Number.isFinite(v) ? Math.max(0, v) : 0;
                  if (next !== Number(settings.pos_fee_amount ?? 1)) {
                    save({ pos_fee_amount: next });
                  }
                }}
              />
            }
          />
        </div>
      </SettingsFormSection>

      <SettingsFormSection
        title="Advanced"
        description="Only needed if this PC uses a custom local print program."
      >
        <div className="max-w-md space-y-1.5">
          <Label htmlFor="pharmacy-bridge-url" className="text-xs font-medium text-muted-foreground">
            Hardware bridge URL
          </Label>
          <Input
            id="pharmacy-bridge-url"
            className={SETTINGS_INPUT_CLASS}
            placeholder="http://127.0.0.1:9100/print"
            value={bridgeUrl}
            onChange={(e) => setBridgeUrl(e.target.value)}
            onBlur={() => {
              setPosBridgeUrl(bridgeUrl);
              toast.success('Print bridge saved on this device');
            }}
          />
        </div>
      </SettingsFormSection>
    </>
  );
}
