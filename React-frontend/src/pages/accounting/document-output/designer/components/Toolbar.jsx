import * as React from "react";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Eye,
  Star,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDocumentDesignerStore } from "../store/useDocumentDesignerStore";

const PAPER_OPTIONS = {
  invoice: [
    { value: "a4", label: "A4", page: { width_mm: 210, height_mm: 297, height_mode: "fixed" } },
    { value: "a5", label: "A5", page: { width_mm: 148, height_mm: 210, height_mode: "fixed" } },
  ],
  pos_receipt: [
    { value: "thermal_80", label: "80mm", page: { width_mm: 80, height_mode: "auto" } },
    { value: "thermal_58", label: "58mm", page: { width_mm: 58, height_mode: "auto" } },
  ],
};

function paperValue(documentType, page) {
  if (documentType === "pos_receipt") {
    return page?.width_mm === 58 ? "thermal_58" : "thermal_80";
  }
  return page?.width_mm === 148 ? "a5" : "a4";
}

export function Toolbar({
  documentType = "invoice",
  onBack,
  onSave,
  onPreview,
  saving,
  isDefault,
  settingDefault,
  onSetDefault,
}) {
  const name = useDocumentDesignerStore((s) => s.name);
  const setName = useDocumentDesignerStore((s) => s.setName);
  const page = useDocumentDesignerStore((s) => s.page);
  const setPage = useDocumentDesignerStore((s) => s.setPage);
  const undo = useDocumentDesignerStore((s) => s.undo);
  const redo = useDocumentDesignerStore((s) => s.redo);
  const canUndo = useDocumentDesignerStore((s) => s.past.length > 0);
  const canRedo = useDocumentDesignerStore((s) => s.future.length > 0);
  const dirty = useDocumentDesignerStore((s) => s.dirty);
  const isSystem = useDocumentDesignerStore((s) => s.isSystem);
  const layoutId = useDocumentDesignerStore((s) => s.layoutId);

  React.useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const papers = PAPER_OPTIONS[documentType] || PAPER_OPTIONS.invoice;

  return (
    <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-[#e0e0e0] bg-white px-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-[#555] hover:bg-[#f3f3f3] hover:text-[#111]"
        onClick={onBack}
        title="Back"
      >
        <ArrowLeft className="size-4" />
      </Button>

      <Input
        variant="sm"
        className="h-8 w-56 border-[#e5e5e5] bg-[#fafafa] font-medium shadow-none focus-visible:bg-white"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name"
        disabled={isSystem}
      />

      {dirty ? (
        <span className="text-[11px] font-medium text-amber-600">Unsaved</span>
      ) : (
        <span className="text-[11px] text-[#9a9a9a]">Saved</span>
      )}

      <Separator orientation="vertical" className="mx-0.5 h-5 bg-[#e5e5e5]" />

      <Select
        value={paperValue(documentType, page)}
        onValueChange={(value) => {
          const opt = papers.find((p) => p.value === value);
          if (opt) setPage(opt.page);
        }}
      >
        <SelectTrigger className="h-8 w-24 border-[#e5e5e5] bg-[#fafafa] text-xs shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {papers.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="flex items-center gap-0.5 rounded-md border border-[#e8e8e8] bg-[#fafafa] p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-[#555] hover:bg-white hover:text-[#111]"
            disabled={!canUndo}
            onClick={undo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-[#555] hover:bg-white hover:text-[#111]"
            disabled={!canRedo}
            onClick={redo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="size-3.5" />
          </Button>
        </div>

        <Separator orientation="vertical" className="mx-1 h-5 bg-[#e5e5e5]" />

        {!isSystem && layoutId ? (
          <Button
            type="button"
            variant={isDefault ? "primary" : "outline"}
            size="sm"
            className={cn(
              "h-8 gap-1.5 border-[#e0e0e0] px-2.5 text-[12px] font-medium shadow-none",
              !isDefault && "bg-white hover:bg-[#f7f7f7]",
            )}
            disabled={settingDefault || isDefault}
            onClick={onSetDefault}
            title={isDefault ? "This is the default layout" : "Make this the default layout"}
          >
            {settingDefault ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Star className={cn("size-3.5", isDefault && "fill-current")} />
            )}
            {isDefault ? "Default" : "Set as default"}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-[#e0e0e0] bg-white px-2.5 text-[12px] font-medium shadow-none hover:bg-[#f7f7f7]"
          onClick={onPreview}
        >
          <Eye className="size-3.5" />
          {documentType === "pos_receipt" ? "Preview Receipt" : "Preview Invoice"}
        </Button>

        <Button
          type="button"
          variant="mono"
          size="sm"
          className="h-8 gap-1.5 bg-[#2c2c2c] px-3 text-[12px] font-medium text-white hover:bg-[#1a1a1a]"
          onClick={onSave}
          disabled={saving || isSystem}
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
