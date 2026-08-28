import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Receipt, Settings2, ShoppingCart, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pharmacyApi } from '../api/pharmacy.api';
import { PrintAgentSetupPanel } from '../components/PrintAgentSetupPanel';
import { getPosBridgeUrl, setPosBridgeUrl } from '@/lib/print-pos-receipt';
import { cn } from '@/lib/utils';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function SettingRow({ label, hint, children, className }) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 py-2.5 sm:items-center',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingsSection({ title, description, children }) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      {(title || description) && (
        <div className="border-b px-4 py-3 sm:px-5">
          {title ? <h2 className="text-sm font-semibold tracking-tight">{title}</h2> : null}
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}
      <div className="divide-y px-4 sm:px-5">{children}</div>
    </section>
  );
}

const TAB_KEYS = ['sales', 'purchase', 'printing'];

export function PharmacySettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = TAB_KEYS.includes(tabParam) ? tabParam : 'sales';

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bridgeUrl, setBridgeUrl] = useState(() => getPosBridgeUrl());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = unwrap(await pharmacyApi.settings());
      setSettings(data?.settings || data || {});
    } catch {
      toast.error('Could not load pharmacy settings');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const onTabChange = (value) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  if (loading || !settings) {
    return (
      <Container className="flex min-h-[40vh] items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Container>
    );
  }

  const salesToggles = [
    {
      key: 'fefo_strict',
      label: 'Strict FEFO',
      hint: 'Block manual batch override on sales',
    },
    {
      key: 'block_expired_sales',
      label: 'Block expired sales',
    },
    {
      key: 'warn_below_cost',
      label: 'Warn below cost',
    },
    {
      key: 'warn_above_mrp',
      label: 'Warn above MRP',
    },
    {
      key: 'require_rx_note_for_rx',
      label: 'Require Rx note on checkout',
      hint: 'Stored on the invoice',
    },
    {
      key: 'block_controlled_without_permission',
      label: 'Block controlled drugs without permission',
    },
  ];

  return (
    <Container className="max-w-3xl py-5 sm:py-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Pharmacy settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sales rules, purchase defaults, and receipt printing for this company.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
        <TabsList variant="line" className="w-full justify-start gap-6 border-b bg-transparent pb-0">
          <TabsTrigger value="sales" className="gap-1.5 pb-3">
            <ShieldCheck className="size-3.5" />
            Sales & compliance
          </TabsTrigger>
          <TabsTrigger value="purchase" className="gap-1.5 pb-3">
            <ShoppingCart className="size-3.5" />
            Purchasing
          </TabsTrigger>
          <TabsTrigger value="printing" className="gap-1.5 pb-3">
            <Receipt className="size-3.5" />
            Receipts & printing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-0 space-y-4">
          <SettingsSection
            title="Dispensing rules"
            description="Applied at POS checkout and when selecting batches."
          >
            {salesToggles.map(({ key, label, hint }) => (
              <SettingRow key={key} label={label} hint={hint}>
                <Switch
                  checked={!!settings[key]}
                  disabled={saving}
                  onCheckedChange={(v) => save({ [key]: v })}
                />
              </SettingRow>
            ))}
            <SettingRow
              label="Warn near expiry"
              hint="Days before expiry to show a warning"
              className="border-t"
            >
              <Input
                type="number"
                min={1}
                max={365}
                className="h-9 w-[88px] text-right tabular-nums"
                defaultValue={settings.warn_near_expiry_days ?? 90}
                disabled={saving}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (n > 0 && n !== settings.warn_near_expiry_days) {
                    save({ warn_near_expiry_days: n });
                  }
                }}
              />
            </SettingRow>
          </SettingsSection>
        </TabsContent>

        <TabsContent value="purchase" className="mt-0 space-y-4">
          <SettingsSection
            title="Purchase invoice defaults"
            description="Used when a supplier invoice omits batch or expiry. Scanned values always take priority."
          >
            <SettingRow label="Use default batch when missing">
              <Switch
                checked={settings.use_default_batch_when_missing !== false}
                disabled={saving}
                onCheckedChange={(v) => save({ use_default_batch_when_missing: v })}
              />
            </SettingRow>
            <SettingRow label="Default batch number">
              <Input
                className="h-9 w-[140px]"
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
            </SettingRow>
            <SettingRow label="Use default expiry when missing">
              <Switch
                checked={settings.use_default_expiry_when_missing !== false}
                disabled={saving}
                onCheckedChange={(v) => save({ use_default_expiry_when_missing: v })}
              />
            </SettingRow>
            <SettingRow label="Default expiry (MM/YY)">
              <Input
                className="h-9 w-[88px] tabular-nums"
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
            </SettingRow>
          </SettingsSection>
        </TabsContent>

        <TabsContent value="printing" className="mt-0 space-y-4">
          <SettingsSection
            title="Finvoroo Print Agent"
            description="Install once on each till, pair, and choose your receipt printer. Sales print automatically after checkout."
          >
            <div className="py-3">
              <PrintAgentSetupPanel disabled={saving} embedded />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Receipt appearance"
            description="Logo and footer options on thermal receipts."
          >
            <SettingRow label="Show company logo">
              <Switch
                checked={settings.receipt_show_logo !== false}
                disabled={saving}
                onCheckedChange={(v) => save({ receipt_show_logo: v })}
              />
            </SettingRow>
            <SettingRow
              label="Branding footer on back"
              hint="Dashed line and store details at the bottom of the slip"
            >
              <Switch
                checked={!!settings.receipt_branding_back}
                disabled={saving}
                onCheckedChange={(v) => save({ receipt_branding_back: v })}
              />
            </SettingRow>
          </SettingsSection>

          <SettingsSection
            title="POS service fee"
            description="Optional flat fee added to every sale total and printed on the receipt."
          >
            <SettingRow
              label="Charge POS fee"
              hint="Adds the fee to the customer total on checkout"
            >
              <Switch
                checked={!!settings.pos_fee_enabled}
                disabled={saving}
                onCheckedChange={(v) => save({ pos_fee_enabled: v })}
              />
            </SettingRow>
            <SettingRow label="Fee amount (Rs)" hint="Shown as a separate line on the receipt">
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-9 w-24 tabular-nums"
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
            </SettingRow>
          </SettingsSection>

          <details className="group rounded-xl border bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground marker:content-none sm:px-5">
              <Settings2 className="size-3.5 shrink-0" />
              Advanced
              <span className="ml-auto text-xs font-normal group-open:hidden">Optional</span>
            </summary>
            <div className="border-t px-4 py-3 sm:px-5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hardware bridge URL</Label>
                <Input
                  className="h-9"
                  placeholder="http://127.0.0.1:9100/print"
                  value={bridgeUrl}
                  onChange={(e) => setBridgeUrl(e.target.value)}
                  onBlur={() => {
                    setPosBridgeUrl(bridgeUrl);
                    toast.success('Print bridge saved on this device');
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave blank unless you run a custom local print program on this PC.
                </p>
              </div>
            </div>
          </details>
        </TabsContent>
      </Tabs>
    </Container>
  );
}
