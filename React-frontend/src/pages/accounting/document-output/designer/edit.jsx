import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { documentOutputApi, unwrapDoc } from '@/pages/accounting/document-output/api/document-output.api';
import { invoicesApi } from '@/pages/accounting/invoices/api/invoices.api';
import { useDocumentDesignerStore } from './store/useDocumentDesignerStore';
import { Toolbar } from './components/Toolbar';
import { ElementPalette } from './components/ElementPalette';
import { FieldPalette } from './components/FieldPalette';
import { CanvasPage } from './components/CanvasPage';
import { PropertiesPanel } from './components/PropertiesPanel';
import { PreviewInvoiceDialog } from './components/PreviewInvoiceDialog';

const BLANK_PAGE_BY_TYPE = {
  invoice: { width_mm: 210, height_mm: 297, height_mode: 'fixed', margins_mm: { top: 12, right: 12, bottom: 12, left: 12 } },
  pos_receipt: { width_mm: 80, height_mm: 297, height_mode: 'auto', margins_mm: { top: 4, right: 3, bottom: 4, left: 3 } },
};
const DEFAULT_PAPER_BY_TYPE = { invoice: 'a4', pos_receipt: 'thermal_80' };
const DEFAULT_NAME_BY_TYPE = { invoice: 'Untitled Invoice Template', pos_receipt: 'Untitled Receipt Template' };

export default function DocumentDesignerEditPage() {
  const { id: workspaceId, layoutId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = layoutId === 'new';
  const documentType = searchParams.get('type') === 'pos_receipt' ? 'pos_receipt' : 'invoice';
  const backHref = `/workspace/${workspaceId}/accounting/document-output/designer${documentType === 'pos_receipt' ? '?type=pos_receipt' : ''}`;

  const loadTemplate = useDocumentDesignerStore((s) => s.loadTemplate);
  const layoutIdInStore = useDocumentDesignerStore((s) => s.layoutId);
  const code = useDocumentDesignerStore((s) => s.code);
  const name = useDocumentDesignerStore((s) => s.name);
  const page = useDocumentDesignerStore((s) => s.page);
  const elements = useDocumentDesignerStore((s) => s.elements);
  const markSaved = useDocumentDesignerStore((s) => s.markSaved);
  const setSelectedId = useDocumentDesignerStore((s) => s.setSelectedId);
  const selectedId = useDocumentDesignerStore((s) => s.selectedId);
  const selectedIds = useDocumentDesignerStore((s) => s.selectedIds);
  const deleteSelected = useDocumentDesignerStore((s) => s.deleteSelected);
  const duplicateSelected = useDocumentDesignerStore((s) => s.duplicateSelected);
  const copySelected = useDocumentDesignerStore((s) => s.copySelected);
  const pasteClipboard = useDocumentDesignerStore((s) => s.pasteClipboard);
  const nudgeSelected = useDocumentDesignerStore((s) => s.nudgeSelected);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [invoices, setInvoices] = React.useState([]);
  const [sampleInvoiceId, setSampleInvoiceId] = React.useState(null);
  const [defaultLayoutId, setDefaultLayoutId] = React.useState(null);
  const [settingDefault, setSettingDefault] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (isNew) {
          loadTemplate({
            layoutId: null,
            code: `custom_${Date.now()}`,
            name: DEFAULT_NAME_BY_TYPE[documentType],
            documentType,
            paper: DEFAULT_PAPER_BY_TYPE[documentType],
            orientation: 'portrait',
            page: BLANK_PAGE_BY_TYPE[documentType],
            elements: [],
            isSystem: false,
          });
        } else {
          const res = await documentOutputApi.layouts({ document_type: documentType });
          const rows = unwrapDoc(res) || [];
          const row = rows.find((r) => String(r.id) === String(layoutId));
          if (!row) {
            toast.error('Template not found.');
            navigate(backHref);
            return;
          }
          if (Number(row.schema_version) !== 2) {
            toast.error('This is a legacy layout and cannot be opened in the visual designer. Duplicate it to start a new visual template.');
            navigate(backHref);
            return;
          }
          if (!cancelled) {
            loadTemplate({
              layoutId: row.id,
              code: row.code,
              name: row.name,
              documentType: row.document_type,
              paper: row.paper,
              orientation: row.orientation,
              page: row.config?.page || BLANK_PAGE_BY_TYPE[documentType],
              elements: row.config?.elements || [],
              isSystem: !!row.is_system,
            });
          }
        }
      } catch (e) {
        toast.error(e?.response?.data?.message || 'Failed to load template');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [layoutId, isNew, documentType]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    invoicesApi
      .list({ per_page: 25, sort: '-invoice_date' })
      .then((res) => {
        const data = res?.data?.data;
        const rows = Array.isArray(data) ? data : (data?.data ?? []);
        setInvoices(rows);
        if (rows[0]?.id) setSampleInvoiceId(rows[0].id);
      })
      .catch(() => {});
    documentOutputApi
      .preferences()
      .then((res) => setDefaultLayoutId(unwrapDoc(res)?.defaults?.[documentType]?.id ?? null))
      .catch(() => {});
  }, [documentType]);

  const handleSetDefault = async () => {
    if (!layoutIdInStore) return;
    setSettingDefault(true);
    try {
      await documentOutputApi.updatePreferences({
        document_type: documentType,
        default_layout_id: layoutIdInStore,
      });
      setDefaultLayoutId(layoutIdInStore);
      toast.success(`Set as the default ${documentType === 'pos_receipt' ? 'receipt' : 'invoice'} layout`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to set default');
    } finally {
      setSettingDefault(false);
    }
  };

  React.useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const ids = useDocumentDesignerStore.getState().elements.map((el) => el.id);
        useDocumentDesignerStore.getState().setSelectedIds(ids);
        return;
      }
      if (!selectedIds.length) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'v') pasteClipboard();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        copySelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        pasteClipboard();
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        nudgeSelected(dx, dy);
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIds, deleteSelected, duplicateSelected, copySelected, pasteClipboard, nudgeSelected, setSelectedId]);

  const paperCode = () => {
    if (documentType === 'pos_receipt') {
      return page.width_mm === 58 ? 'thermal_58' : 'thermal_80';
    }

    return page.width_mm === 148 ? 'a5' : 'a4';
  };

  const save = async () => {
    setSaving(true);
    try {
      const config = { schema_version: 2, page, elements };
      if (layoutIdInStore) {
        await documentOutputApi.updateLayout(layoutIdInStore, { name, config });
        markSaved(layoutIdInStore);
        toast.success('Template saved');
      } else {
        const res = await documentOutputApi.createLayout({
          document_type: documentType,
          code,
          name,
          paper: paperCode(),
          orientation: 'portrait',
          schema_version: 2,
          config,
        });
        const created = unwrapDoc(res);
        markSaved(created.id);
        toast.success('Template created');
        navigate(`/workspace/${workspaceId}/accounting/document-output/designer/${created.id}/edit?type=${documentType}`, { replace: true });
      }
    } catch (e) {
      const message = e?.response?.data?.message || 'Save failed';
      const errors = e?.response?.data?.errors;
      toast.error(errors?.config ? String(errors.config) : message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading designer…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#f0f0f0] text-[#1a1a1a]">
      <Toolbar
        documentType={documentType}
        onBack={() => navigate(backHref)}
        onSave={save}
        onPreview={() => setPreviewOpen(true)}
        saving={saving}
        isDefault={Boolean(layoutIdInStore) && Number(defaultLayoutId) === Number(layoutIdInStore)}
        settingDefault={settingDefault}
        onSetDefault={handleSetDefault}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-[17.5rem] shrink-0 overflow-y-auto border-r border-[#e0e0e0] bg-[#fafafa]">
          <Tabs defaultValue="elements" className="w-full">
            <div className="border-b border-[#e8e8e8] px-2.5 pt-2.5 pb-2">
              <TabsList className="grid h-8 w-full grid-cols-2 rounded-md bg-[#ebebeb] p-0.5">
                <TabsTrigger
                  value="elements"
                  className="rounded-[5px] text-[12px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Elements
                </TabsTrigger>
                <TabsTrigger
                  value="fields"
                  className="rounded-[5px] text-[12px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Fields
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="elements" className="mt-0">
              <ElementPalette />
            </TabsContent>
            <TabsContent value="fields" className="mt-0">
              <FieldPalette />
            </TabsContent>
          </Tabs>
        </aside>

        <CanvasPage
          documentType={documentType}
          sampleInvoiceId={sampleInvoiceId}
          invoices={invoices}
          onSampleInvoiceChange={setSampleInvoiceId}
        />

        <aside className="w-[26rem] shrink-0 overflow-y-auto border-l border-[#e0e0e0] bg-[#fafafa]">
          {/* Remount inspector when selection changes so local field drafts never leak across elements. */}
          <PropertiesPanel key={selectedIds.join(',') || 'none'} />
        </aside>
      </div>

      <PreviewInvoiceDialog open={previewOpen} onOpenChange={setPreviewOpen} documentType={documentType} />
    </div>
  );
}
