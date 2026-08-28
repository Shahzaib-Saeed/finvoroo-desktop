import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ExternalLink, Columns3, FormInput } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { invoiceTemplatesApi } from "./api/invoice-templates.api";
import {
  STUDIO_TABS,
  layoutSlotsFromTemplate,
  lineEditorRowsFromTemplate,
  validateLineColumns,
} from "./constants";
import { TemplateStudioCanvas } from "./components/TemplateStudioCanvas";
import { TemplateCustomFieldsPanel } from "./components/TemplateCustomFieldsPanel";
import { TemplateLineColumnsPanel } from "./components/TemplateLineColumnsPanel";

function apiMessage(err, fallback) {
  const data = err?.response?.data;
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors).flat().find(Boolean);
    if (first) return String(first);
  }
  return data?.message || fallback;
}

export function InvoiceTemplateEditPage() {
  const { id: workspaceId, templateId } = useParams();
  const navigate = useNavigate();
  const listPath = `/workspace/${workspaceId}/accounting/invoice-templates`;

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState(STUDIO_TABS.FIELDS);

  const [name, setName] = useState("");
  const [footerContent, setFooterContent] = useState("");
  const [layoutSlots, setLayoutSlots] = useState([]);
  const [lineColumns, setLineColumns] = useState([]);
  const [previewFieldsOverride, setPreviewFieldsOverride] = useState(null);
  const [savingLines, setSavingLines] = useState(false);

  const applyTemplate = useCallback((tpl) => {
    setTemplate(tpl);
    setName(tpl?.name ?? "");
    setFooterContent(tpl?.footer_content ?? "");
    setLayoutSlots(layoutSlotsFromTemplate(tpl));
    setLineColumns(lineEditorRowsFromTemplate(tpl));
    setPreviewFieldsOverride(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceTemplatesApi.show(templateId);
      applyTemplate(res.data?.data);
    } catch (err) {
      toast.error(apiMessage(err, "Failed to load template."));
      navigate(listPath, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [templateId, applyTemplate, navigate, listPath]);

  useEffect(() => {
    load();
  }, [load]);

  const previewFields = useMemo(
    () => previewFieldsOverride ?? template?.fields ?? [],
    [previewFieldsOverride, template?.fields],
  );

  const saveLineColumns = async () => {
    const err = validateLineColumns(lineColumns);
    if (err) {
      toast.error(err);
      return;
    }
    setSavingLines(true);
    try {
      const res = await invoiceTemplatesApi.updateLineColumns(templateId, {
        columns: lineColumns.map((c) => ({
          key: c.key,
          label: c.label,
          visible: c.visible !== false ? 1 : 0,
        })),
      });
      applyTemplate(res.data?.data);
      toast.success(res.data?.message || "Line items table saved.");
    } catch (err) {
      toast.error(apiMessage(err, "Could not save line columns."));
    } finally {
      setSavingLines(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-64" />
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <Skeleton className="h-[52vh] w-full max-w-[580px] rounded-xl" />
          <Skeleton className="h-[52vh] w-full max-w-[640px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!template) return null;

  const displayName = name || template.name;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={displayName}
        subtitle="Choose fields and columns for this invoice layout."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {template.is_default ? (
              <Badge
                variant="primary"
                appearance="light"
                className="rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wide"
              >
                Default
              </Badge>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              asChild
            >
              <Link to={listPath}>
                <ArrowLeft className="size-3.5" />
                Back
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 hidden md:inline-flex"
              asChild
            >
              <Link
                to={`/workspace/${workspaceId}/accounting/invoices/create`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5" />
                Try invoice
              </Link>
            </Button>
            <Button variant="mono" size="sm" className="h-8 px-4" asChild>
              <Link to={listPath}>Done</Link>
            </Button>
          </div>
        }
      />

      <div className="flex w-full flex-col items-start gap-6 xl:flex-row">
        <section className="w-full max-w-[800px] shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-card shadow-sm dark:border-neutral-700">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-neutral-200 bg-neutral-50/80 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900/40">
              <TabsList className="inline-flex h-9 gap-0.5 rounded-lg border border-neutral-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-950">
                <TabsTrigger
                  value={STUDIO_TABS.FIELDS}
                  className={cn(
                    "h-8 gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground",
                    "data-[state=active]:bg-neutral-900 data-[state=active]:text-white data-[state=active]:shadow-none",
                    "dark:data-[state=active]:bg-white dark:data-[state=active]:text-neutral-900",
                  )}
                >
                  <FormInput className="size-3.5" />
                  Custom fields
                </TabsTrigger>
                <TabsTrigger
                  value={STUDIO_TABS.LINE_ITEMS}
                  className={cn(
                    "h-8 gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground",
                    "data-[state=active]:bg-neutral-900 data-[state=active]:text-white data-[state=active]:shadow-none",
                    "dark:data-[state=active]:bg-white dark:data-[state=active]:text-neutral-900",
                  )}
                >
                  <Columns3 className="size-3.5" />
                  Line items
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-3.5 sm:p-4">
              <TabsContent value={STUDIO_TABS.FIELDS} className="mt-0">
                <TemplateCustomFieldsPanel
                  templateId={templateId}
                  templateFields={template?.fields ?? []}
                  onSaved={(tpl) => applyTemplate(tpl)}
                  onPreviewFieldsChange={setPreviewFieldsOverride}
                />
              </TabsContent>
              <TabsContent value={STUDIO_TABS.LINE_ITEMS} className="mt-0">
                <TemplateLineColumnsPanel
                  columns={lineColumns}
                  onChange={setLineColumns}
                  onSave={saveLineColumns}
                  saving={savingLines}
                />
              </TabsContent>
            </div>
          </Tabs>
        </section>

        <aside className="w-full max-w-[1000px] min-w-0 shrink-0 xl:sticky xl:top-24">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-semibold text-foreground">
                Live preview
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Same layout as create invoice
            </p>
          </div>
          <TemplateStudioCanvas
            name={displayName}
            isDefault={template.is_default}
            footerContent={footerContent}
            fields={previewFields}
            layoutSlots={layoutSlots}
            lineColumns={lineColumns}
          />
        </aside>
      </div>
    </div>
  );
}
