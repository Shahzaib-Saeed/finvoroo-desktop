import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Loader2, PenSquare, Printer, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SettingsCard } from './SettingsCard';
import { SettingsFormSection } from './settings-ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCan } from '@/hooks/use-can';
import {
  documentOutputApi,
  unwrapDoc,
} from '@/pages/accounting/document-output/api/document-output.api';
import { PrintAgentSetupPanel } from '@/industries/pharmacy/components/PrintAgentSetupPanel';
import { DesktopAppDownloadPanel } from './DesktopAppDownloadPanel';
import { PharmacyPrintExtras } from './PharmacySettingsTabs';

const DOC_TYPES = [
  { id: 'invoice', label: 'Sales Invoice' },
  { id: 'pos_receipt', label: 'POS Receipt' },
];

export function PrintPreferencesTab({
  title,
  description,
  icon = 'layout',
  isPharmacy = false,
  pharmacySettings,
  pharmacyLoading,
  pharmacySaving,
  onSavePharmacy,
}) {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams();
  const canManage = useCan(['document_layouts.manage', 'document_layouts.edit', 'accounting_settings.edit']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [layoutsByType, setLayoutsByType] = useState({});
  const [selected, setSelected] = useState({});
  const [adapters, setAdapters] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, pos, prefs] = await Promise.all([
        documentOutputApi.layouts({ document_type: 'invoice' }),
        documentOutputApi.layouts({ document_type: 'pos_receipt' }),
        documentOutputApi.preferences(),
      ]);
      const invLayouts = unwrapDoc(inv) || [];
      const posLayouts = unwrapDoc(pos) || [];
      setLayoutsByType({
        invoice: Array.isArray(invLayouts) ? invLayouts : [],
        pos_receipt: Array.isArray(posLayouts) ? posLayouts : [],
      });
      const p = unwrapDoc(prefs);
      const nextSel = {};
      const nextAd = {};
      for (const t of DOC_TYPES) {
        nextSel[t.id] =
          String(p?.defaults?.[t.id]?.id || p?.preferences?.find((x) => x.document_type === t.id)?.default_layout_id || '');
        nextAd[t.id] =
          p?.preferences?.find((x) => x.document_type === t.id)?.default_adapter ||
          (t.id === 'pos_receipt' ? 'escpos' : 'browser');
      }
      setSelected(nextSel);
      setAdapters(nextAd);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load print preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (documentType) => {
    if (!canManage) {
      toast.error('You do not have permission to manage print layouts');
      return;
    }
    setSaving(true);
    try {
      await documentOutputApi.updatePreferences({
        document_type: documentType,
        default_layout_id: selected[documentType] ? Number(selected[documentType]) : null,
        default_adapter: adapters[documentType] || null,
      });
      toast.success('Print preference saved');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SettingsCard title={title || 'Print preferences'} description={description} icon={icon}>
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading print layouts…
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      title={title || 'Print preferences'}
      description={
        description ||
        'Choose the default layout for each document. The Print button uses this default; users can still pick another layout temporarily.'
      }
      icon={icon}
    >
      {DOC_TYPES.map((t) => (
        <SettingsFormSection key={t.id} icon={Printer} title={t.label} description="Default layout and output adapter.">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Layout</p>
              <Select
                value={selected[t.id] || undefined}
                onValueChange={(v) => setSelected((s) => ({ ...s, [t.id]: v }))}
                disabled={!canManage}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  {(layoutsByType[t.id] || []).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Default adapter</p>
              <Select
                value={adapters[t.id] || 'browser'}
                onValueChange={(v) => setAdapters((s) => ({ ...s, [t.id]: v }))}
                disabled={!canManage}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">Browser print</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="escpos">ESC/POS thermal</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 h-9"
              disabled={!canManage}
              onClick={() =>
                navigate(
                  `/workspace/${workspaceId}/accounting/document-output/designer${t.id === 'pos_receipt' ? '?type=pos_receipt' : ''}`,
                )
              }
            >
              <PenSquare className="size-3.5" />
              Design
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 h-9"
              disabled={!canManage || saving}
              onClick={() => save(t.id)}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save
            </Button>
          </div>
        </SettingsFormSection>
      ))}

      <SettingsFormSection
        title="Print Agent"
        description="Install once on this PC, pair, and choose the receipt printer."
      >
        <PrintAgentSetupPanel disabled={!canManage || saving} embedded />
      </SettingsFormSection>

      <SettingsFormSection
        title="Finvoroo Desktop"
        description="Native Windows app for this PC. Works through brief disconnects and syncs when online."
      >
        <DesktopAppDownloadPanel embedded />
      </SettingsFormSection>

      {isPharmacy ? (
        <PharmacyPrintExtras
          settings={pharmacySettings}
          loading={pharmacyLoading}
          saving={pharmacySaving}
          save={onSavePharmacy}
        />
      ) : null}
    </SettingsCard>
  );
}
