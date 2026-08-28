import * as React from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Plus,
  X,
  Upload,
  ImageIcon,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from '@/components/ui/color-picker';
import { toast } from 'sonner';
import { documentOutputApi, unwrapDoc } from '@/pages/accounting/document-output/api/document-output.api';
import { settingsApi } from '@/pages/accounting/settings/api/settings.api';
import { useDocumentDesignerStore } from '../store/useDocumentDesignerStore';
import { encodeAfterAnchor, parseAfterAnchor } from '../lib/geometry';
import { FONT_FAMILY_GROUPS, isTypographyElement, TYPOGRAPHY_ELEMENT_TYPES } from '../lib/fonts';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/jpg,image/gif,image/webp,image/svg+xml';
const LOGO_SIZE_PRESETS = [
  { label: 'S', w: 25, h: 12 },
  { label: 'M', w: 40, h: 20 },
  { label: 'L', w: 50, h: 25 },
  { label: 'Wide', w: 60, h: 18 },
];
const CONDITION_OPS = [
  { value: 'not_empty', label: 'is not empty' },
  { value: 'empty', label: 'is empty' },
  { value: 'truthy', label: 'is truthy' },
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
];

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a8a8a]">{children}</p>;
}

function commonValue(items, getter, fallback = undefined) {
  if (!items.length) return fallback;
  const first = getter(items[0]);
  for (let i = 1; i < items.length; i += 1) {
    if (getter(items[i]) !== first) return undefined;
  }
  return first;
}

function FontFamilySelect({ value, onChange, placeholder = 'Mixed fonts' }) {
  const resolved = value || undefined;
  return (
    <Select value={resolved} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {FONT_FAMILY_GROUPS.map((group) => (
          <React.Fragment key={group.label}>
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </div>
            {group.fonts.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </SelectItem>
            ))}
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  );
}

function TypographyControls({
  fontFamily,
  fontSize,
  fontWeight,
  italic,
  underline,
  align,
  color,
  background,
  letterSpacing,
  lineHeight,
  onChange,
  showExtras = true,
}) {
  return (
    <div className="space-y-3">
      <Field label="Font family">
        <FontFamilySelect value={fontFamily} onChange={(v) => onChange('fontFamily', v)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Size (pt)" value={fontSize ?? 10} onCommit={(v) => onChange('fontSize', v)} />
        <Field label="Style">
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant={fontWeight === 'bold' ? 'primary' : 'outline'}
              className="size-9"
              title="Bold"
              onClick={() => onChange('fontWeight', fontWeight === 'bold' ? 'normal' : 'bold')}
            >
              <Bold className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={italic ? 'primary' : 'outline'}
              className="size-9"
              title="Italic"
              onClick={() => onChange('italic', !italic)}
            >
              <Italic className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={underline ? 'primary' : 'outline'}
              className="size-9"
              title="Underline"
              onClick={() => onChange('underline', !underline)}
            >
              <Underline className="size-4" />
            </Button>
          </div>
        </Field>
      </div>
      <Field label="Text align">
        <div className="flex gap-1">
          {[
            ['left', AlignLeft],
            ['center', AlignCenter],
            ['right', AlignRight],
          ].map(([v, Icon]) => (
            <Button
              key={v}
              type="button"
              size="icon"
              variant={align === v ? 'primary' : 'outline'}
              className="size-9"
              onClick={() => onChange('align', v)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
      </Field>
      {showExtras ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Letter spacing (mm)"
              value={letterSpacing ?? 0}
              step={0.1}
              onCommit={(v) => onChange('letterSpacing', v)}
            />
            <NumberField
              label="Line height"
              value={lineHeight ?? 1.2}
              step={0.05}
              onCommit={(v) => onChange('lineHeight', v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Text color">
              <ColorPicker value={color} onChange={(v) => onChange('color', v)} />
            </Field>
            <Field label="Background">
              <ColorPicker value={background} onChange={(v) => onChange('background', v)} allowNone />
            </Field>
          </div>
        </>
      ) : null}
    </div>
  );
}

function toNumericInputValue(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    // Anchor strings like "after:el_items" / "bottom:12" must never hit <input type="number">.
    if (value.startsWith('after:') || value.startsWith('bottom:')) return fallback;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function NumberField({ label, value, onCommit, step = 1, suffix, hint }) {
  const isEmpty = value === undefined || value === null || value === '';
  const safe = isEmpty ? '' : toNumericInputValue(value, 0);
  const [local, setLocal] = React.useState(safe);
  React.useEffect(() => {
    setLocal(value === undefined || value === null || value === '' ? '' : toNumericInputValue(value, 0));
  }, [value]);
  return (
    <Field label={label}>
      <div className="relative">
        <Input
          variant="sm"
          type="number"
          step={step}
          value={local}
          placeholder={isEmpty ? 'Mixed' : undefined}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            if (local === '' || local === '-') return;
            onCommit(Number(local) || 0);
          }}
        />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </Field>
  );
}

function TextField({ label, value, onCommit, placeholder }) {
  const [local, setLocal] = React.useState(value ?? '');
  React.useEffect(() => setLocal(value ?? ''), [value]);
  return (
    <Field label={label}>
      <Input variant="sm" value={local} placeholder={placeholder} onChange={(e) => setLocal(e.target.value)} onBlur={() => onCommit(local)} />
    </Field>
  );
}

const TYPE_LABELS = {
  text: 'Text',
  field: 'Field',
  image: 'Image',
  items_table: 'Items Table',
  totals_block: 'Totals Block',
  line: 'Line',
  rect: 'Rectangle',
};

function elementLabel(el) {
  if (!el) return '';
  if (el.type === 'field' && el.binding) return el.binding;
  if (el.type === 'text' && el.content) {
    const plain = String(el.content).replace(/<[^>]+>/g, '').trim();
    return plain.length > 28 ? `${plain.slice(0, 28)}…` : plain || 'Text';
  }
  if (el.type === 'image' && (el.src || el.binding)) return el.src ? 'Uploaded image' : el.binding;
  return TYPE_LABELS[el.type] || el.type;
}

function ImageElementFields({ el }) {
  const commitPropertyChange = useDocumentDesignerStore((s) => s.commitPropertyChange);
  const commitSetElement = useDocumentDesignerStore((s) => s.commitSetElement);
  const inputRef = React.useRef(null);
  const [uploading, setUploading] = React.useState(false);
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const asCompanyLogo = !el.binding || el.binding === 'company.logo_url';

  React.useEffect(() => {
    setPreviewFailed(false);
  }, [el.src]);

  const set = (property, value) => commitPropertyChange(el.id, property, el[property], value);

  const applyUpload = (url) => {
    commitSetElement(el.id, el, {
      ...el,
      src: url,
      binding: el.binding || 'company.logo_url',
      objectFit: el.objectFit || 'contain',
    });
  };

  const onPick = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      if (asCompanyLogo) {
        const res = await settingsApi.uploadLogo(file);
        const data = unwrapDoc(res) || res?.data?.data || res?.data;
        const url = data?.logo_url;
        if (!url) throw new Error('No logo URL returned');
        applyUpload(url);
        toast.success('Logo saved — it will print on invoices after you save this template');
      } else {
        const res = await documentOutputApi.uploadAsset(file);
        const data = unwrapDoc(res) || res?.data?.data || res?.data;
        const url = data?.url;
        if (!url) throw new Error('No image URL returned');
        applyUpload(url);
        toast.success('Image uploaded');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const applySize = (w, h) => {
    commitSetElement(el.id, el, { ...el, w, h });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border bg-muted/20">
        <div className="flex h-28 items-center justify-center p-2">
          {el.src && !previewFailed ? (
            <img
              src={el.src}
              alt="Logo preview"
              className="max-h-full max-w-full object-contain"
              style={{ objectFit: el.objectFit || 'contain' }}
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImageIcon className="size-7 opacity-50" />
              <span className="text-[10px]">{el.src ? 'Could not load image' : 'No image yet'}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t bg-background p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            {uploading ? 'Uploading…' : el.src ? 'Replace image' : 'Upload logo'}
          </Button>
          {el.src ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              disabled={uploading}
              onClick={() => set('src', '')}
            >
              Clear upload
            </Button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        {asCompanyLogo
          ? 'Upload saves as the company logo in the database and prints via company.logo_url. Adjust size below or drag the handles on the canvas.'
          : 'Upload stores this image for the template. Save the template so print uses it.'}
      </p>

      <Field label="Fit">
        <Select value={el.objectFit || 'contain'} onValueChange={(v) => set('objectFit', v)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Contain (keep aspect)</SelectItem>
            <SelectItem value="cover">Cover (fill box)</SelectItem>
            <SelectItem value="fill">Stretch</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Size presets">
        <div className="flex flex-wrap gap-1">
          {LOGO_SIZE_PRESETS.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => applySize(p.w, p.h)}
            >
              {p.label} ({p.w}×{p.h})
            </Button>
          ))}
        </div>
      </Field>

      <TextField
        label="Binding token (optional fallback)"
        value={el.binding}
        placeholder="company.logo_url"
        onCommit={(v) => set('binding', v)}
      />
    </div>
  );
}

function MultiSelectPanel({ selectedIds, elements, interactionGeom }) {
  const alignSelected = useDocumentDesignerStore((s) => s.alignSelected);
  const applyPropertyToSelected = useDocumentDesignerStore((s) => s.applyPropertyToSelected);
  const deleteSelected = useDocumentDesignerStore((s) => s.deleteSelected);
  const duplicateSelected = useDocumentDesignerStore((s) => s.duplicateSelected);
  const setSelectedId = useDocumentDesignerStore((s) => s.setSelectedId);
  const toggleSelectedId = useDocumentDesignerStore((s) => s.toggleSelectedId);

  const boxes = selectedIds
    .map((id) => {
      const el = elements.find((e) => e.id === id);
      const g = interactionGeom?.[id];
      return el && g ? { el, g } : null;
    })
    .filter(Boolean);

  const typographyEls = boxes.map((b) => b.el).filter(isTypographyElement);
  const canStyle = typographyEls.length > 0;

  const shared = {
    fontFamily: commonValue(typographyEls, (el) => el.fontFamily || 'DejaVu Sans'),
    fontSize: commonValue(typographyEls, (el) => el.fontSize ?? 10),
    fontWeight: commonValue(typographyEls, (el) => el.fontWeight || 'normal'),
    italic: commonValue(typographyEls, (el) => !!el.italic),
    underline: commonValue(typographyEls, (el) => !!el.underline),
    align: commonValue(typographyEls, (el) => el.align || 'left'),
    color: commonValue(typographyEls, (el) => el.color),
    background: commonValue(typographyEls, (el) => el.background),
    letterSpacing: commonValue(typographyEls, (el) => el.letterSpacing ?? 0),
    lineHeight: commonValue(typographyEls, (el) => el.lineHeight ?? 1.2),
  };

  const setStyle = (property, value) => {
    applyPropertyToSelected(property, value, { types: TYPOGRAPHY_ELEMENT_TYPES });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[#e8e8e8] bg-white/70 px-3 py-2.5">
        <div>
          <p className="text-[13px] font-semibold tracking-tight text-[#1a1a1a]">{selectedIds.length} selected</p>
          <p className="mt-0.5 text-[11px] text-[#8a8a8a]">Align together · style text · Shift-click to adjust</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" variant="ghost" className="size-8" title="Duplicate" onClick={() => duplicateSelected()}>
            <Copy className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-8 text-destructive" title="Delete" onClick={() => deleteSelected()}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-3">
        <SectionTitle>Align boxes</SectionTitle>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ['left', AlignHorizontalJustifyStart, 'Align left'],
            ['center', AlignHorizontalJustifyCenter, 'Align center'],
            ['right', AlignHorizontalJustifyEnd, 'Align right'],
            ['top', AlignVerticalJustifyStart, 'Align top'],
            ['middle', AlignVerticalJustifyCenter, 'Align middle'],
            ['bottom', AlignVerticalJustifyEnd, 'Align bottom'],
          ].map(([mode, Icon, title]) => (
            <Button key={mode} type="button" size="icon" variant="outline" className="size-9" title={title} onClick={() => alignSelected(mode)}>
              <Icon className="size-4" />
            </Button>
          ))}
        </div>

        {canStyle ? (
          <>
            <Separator />
            <SectionTitle>Typography ({typographyEls.length})</SectionTitle>
            <p className="text-xs text-muted-foreground">
              Applies to Text, Field, and Totals in this selection. Mixed values show blank until you pick one.
            </p>
            <TypographyControls
              fontFamily={shared.fontFamily}
              fontSize={shared.fontSize}
              fontWeight={shared.fontWeight}
              italic={shared.italic === true}
              underline={shared.underline === true}
              align={shared.align}
              color={shared.color}
              background={shared.background}
              letterSpacing={shared.letterSpacing}
              lineHeight={shared.lineHeight}
              onChange={setStyle}
            />
          </>
        ) : (
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Select Text, Field, or Totals together to change font style for all of them at once.
          </p>
        )}

        <Separator />
        <SectionTitle>In selection</SectionTitle>
        <div className="max-h-56 space-y-0.5 overflow-y-auto rounded border p-1">
          {boxes.map(({ el, g }) => (
            <button
              key={el.id}
              type="button"
              onClick={(e) => (e.shiftKey || e.metaKey || e.ctrlKey ? toggleSelectedId(el.id) : setSelectedId(el.id))}
              className="flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="truncate font-medium">{TYPE_LABELS[el.type] || el.type}</span>
              <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                {Math.round(g.w * 10) / 10}×{Math.round(g.h * 10) / 10}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const elements = useDocumentDesignerStore((s) => s.elements);
  const selectedId = useDocumentDesignerStore((s) => s.selectedId);
  const selectedIds = useDocumentDesignerStore((s) => s.selectedIds);
  const interactionGeom = useDocumentDesignerStore((s) => s.interactionGeom);
  const setSelectedId = useDocumentDesignerStore((s) => s.setSelectedId);
  const toggleSelectedId = useDocumentDesignerStore((s) => s.toggleSelectedId);
  const commitPropertyChange = useDocumentDesignerStore((s) => s.commitPropertyChange);
  const deleteElement = useDocumentDesignerStore((s) => s.deleteElement);
  const duplicateElement = useDocumentDesignerStore((s) => s.duplicateElement);
  const toggleLock = useDocumentDesignerStore((s) => s.toggleLock);
  const toggleHidden = useDocumentDesignerStore((s) => s.toggleHidden);
  const bringToFront = useDocumentDesignerStore((s) => s.bringToFront);
  const sendToBack = useDocumentDesignerStore((s) => s.sendToBack);

  if (selectedIds.length > 1) {
    return <MultiSelectPanel selectedIds={selectedIds} elements={elements} interactionGeom={interactionGeom} />;
  }

  const el = elements.find((e) => e.id === selectedId);
  const abs = el ? interactionGeom?.[el.id] : null;
  const itemsTable = elements.find((e) => e.type === 'items_table');

  if (!el) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-[#e8e8e8] bg-white/70 px-3 py-2.5">
          <p className="text-[13px] font-semibold tracking-tight text-[#1a1a1a]">Layers</p>
          <p className="mt-0.5 text-[11px] text-[#8a8a8a]">Click · Shift-click for multi · drag empty to marquee.</p>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {elements.length === 0 ? (
            <p className="p-2 text-[12px] text-[#8a8a8a]">No elements yet. Add one from the left palette.</p>
          ) : (
            [...elements]
              .sort((a, b) => (b.z ?? 0) - (a.z ?? 0))
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => (e.shiftKey || e.metaKey || e.ctrlKey ? toggleSelectedId(item.id) : setSelectedId(item.id))}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left hover:bg-[#efefef]"
                >
                  <span className="truncate text-[12px] font-medium text-[#333]">{TYPE_LABELS[item.type] || item.type}</span>
                  <span className="ml-2 truncate text-[11px] text-[#9a9a9a]">{elementLabel(item)}</span>
                </button>
              ))
          )}
        </div>
      </div>
    );
  }

  const set = (property, value) => commitPropertyChange(el.id, property, el[property], value);
  const setFormat = (patch) => set('format', { ...(el.format || {}), ...patch });
  const setBorder = (patch) => set('border', { ...(el.border || { width_mm: 0, color: '#000000', style: 'solid' }), ...patch });

  const hasTypography = isTypographyElement(el);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[#e8e8e8] bg-white/70 px-3 py-2.5">
        <div className="min-w-0">
          <span className="text-[13px] font-semibold tracking-tight text-[#1a1a1a]">{TYPE_LABELS[el.type] || el.type}</span>
          <p className="truncate text-[11px] text-[#8a8a8a]">{elementLabel(el)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" variant="ghost" className="size-7" title="Bring to front" onClick={() => bringToFront(el.id)}>
            <ChevronUp className="size-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-7" title="Send to back" onClick={() => sendToBack(el.id)}>
            <ChevronDown className="size-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-7" title={el.locked ? 'Unlock' : 'Lock'} onClick={() => toggleLock(el.id)}>
            {el.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-7" title={el.hidden ? 'Show' : 'Hide'} onClick={() => toggleHidden(el.id)}>
            {el.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-7" title="Duplicate" onClick={() => duplicateElement(el.id)}>
            <Copy className="size-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-7 text-destructive" title="Delete" onClick={() => deleteElement(el.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-3">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="X (mm)"
            value={typeof el.x === 'string' && el.x.includes(':') ? abs?.x : el.x}
            step={0.5}
            onCommit={(v) => set('x', v)}
            hint={typeof el.x === 'string' && el.x.includes(':') ? `Was anchored (${el.x}) — editing sets absolute mm` : undefined}
          />
          <NumberField
            label="Y (mm)"
            value={typeof el.y === 'string' && el.y.includes(':') ? abs?.y : el.y}
            step={0.5}
            onCommit={(v) => set('y', v)}
            hint={
              typeof el.y === 'string' && el.y.startsWith('after:')
                ? `Follows items table (${el.y}) — moves down as rows grow`
                : typeof el.y === 'string' && el.y.includes(':')
                  ? `Anchored (${el.y}) — editing sets absolute mm`
                  : undefined
            }
          />
          <NumberField label="Width (mm)" value={el.w} step={0.5} onCommit={(v) => set('w', v)} />
          {el.type !== 'items_table' && (
            <NumberField
              label="Height (mm)"
              value={Number(el.h) > 0 ? el.h : abs?.h}
              step={0.5}
              onCommit={(v) => set('h', v)}
            />
          )}
          <NumberField label="Opacity" value={el.opacity ?? 1} step={0.05} onCommit={(v) => set('opacity', Math.min(1, Math.max(0, v)))} />
        </div>

        {itemsTable && el.type !== 'items_table' && (
          <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
            <div className="min-w-0">
              <p className="text-[11px] font-medium">Follow items table</p>
              <p className="text-[10px] text-muted-foreground">
                Keep this block under the last line item (1 row or 20).
              </p>
            </div>
            <Switch
              checked={parseAfterAnchor(el.y)?.targetId === itemsTable.id}
              onCheckedChange={(on) => {
                if (on) {
                  const tableBottom =
                    (interactionGeom?.[itemsTable.id]?.y ?? 0) + (interactionGeom?.[itemsTable.id]?.h ?? 0);
                  const yNow = abs?.y ?? tableBottom;
                  const gap = Math.max(0, yNow - tableBottom);
                  set('y', encodeAfterAnchor(itemsTable.id, gap));
                } else {
                  set('y', abs?.y ?? 200);
                }
              }}
            />
          </div>
        )}

        {el.type === 'text' && (
          <Field label="Content (supports {{tokens}})">
            <TextareaCommit value={el.content} onCommit={(v) => set('content', v)} />
            <p className="mt-1 text-[10px] text-muted-foreground">Tip: double-click the text on the canvas to type in place.</p>
          </Field>
        )}

        {el.type === 'field' && (
          <>
            <TextField label="Binding token" value={el.binding} placeholder="invoice.number" onCommit={(v) => set('binding', v)} />
            <TextField label="Label" value={el.label} placeholder="Invoice No:" onCommit={(v) => set('label', v)} />
            <Field label="Label layout">
              <Select
                value={el.label_layout === 'columns' ? 'columns' : 'inline'}
                onValueChange={(v) => set('label_layout', v)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Inline (Label value)</SelectItem>
                  <SelectItem value="columns">Aligned columns (Label : value)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {el.label_layout === 'columns' && (
              <NumberField
                label="Label width (mm)"
                value={el.label_width_mm ?? 32}
                step={0.5}
                onCommit={(v) => set('label_width_mm', v)}
                hint="Use the same width on stacked custom fields so labels and values line up."
              />
            )}
            <p className="text-[10px] text-muted-foreground">
              Tip: double-click on the canvas to type custom text (converts this field to static text).
            </p>
          </>
        )}

        {el.type === 'image' && <ImageElementFields el={el} />}

        {(el.type === 'field' || el.type === 'text') && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Format">
                <Select value={el.format?.type || 'text'} onValueChange={(v) => setFormat({ type: v })}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['text', 'number', 'money', 'date', 'boolean'].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <TextField label="Fallback" value={el.format?.fallback ?? '—'} onCommit={(v) => setFormat({ fallback: v })} />
            </div>
            {(el.format?.type || 'text') === 'money' && (
              <label className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[11px]">
                <span>
                  <span className="font-medium">Show currency</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">Off = amount only (271,662.50)</span>
                </span>
                <Switch
                  checked={el.format?.show_currency !== false}
                  onCheckedChange={(v) => setFormat({ show_currency: v })}
                />
              </label>
            )}
          </>
        )}

        {hasTypography && (
          <>
            <Separator />
            <SectionTitle>Typography</SectionTitle>
            <TypographyControls
              fontFamily={el.fontFamily || 'DejaVu Sans'}
              fontSize={el.fontSize ?? 10}
              fontWeight={el.fontWeight || 'normal'}
              italic={!!el.italic}
              underline={!!el.underline}
              align={el.align || 'left'}
              color={el.color}
              background={el.background}
              letterSpacing={el.letterSpacing ?? 0}
              lineHeight={el.lineHeight ?? 1.2}
              onChange={set}
            />
          </>
        )}

        <Separator />
        <SectionTitle>Box</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Padding (mm)" value={typeof el.padding === 'number' ? el.padding : 0} step={0.5} onCommit={(v) => set('padding', v)} />
          <NumberField label="Border radius (mm)" value={el.borderRadius ?? 0} step={0.5} onCommit={(v) => set('borderRadius', v)} />
          <NumberField label="Border width (mm)" value={el.border?.width_mm ?? 0} step={0.1} onCommit={(v) => setBorder({ width_mm: v })} />
          <Field label="Border color">
            <ColorPicker value={el.border?.color || '#000000'} onChange={(v) => setBorder({ color: v })} />
          </Field>
        </div>
        <Field label="Overflow">
          <Select value={el.overflow || 'clip'} onValueChange={(v) => set('overflow', v)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['clip', 'ellipsis', 'wrap'].map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {el.type === 'items_table' && <ItemsTableFields el={el} set={set} />}
        {el.type === 'totals_block' && <TotalsBlockFields el={el} set={set} />}

        <Separator />
        <SectionTitle>Visibility condition</SectionTitle>
        <ConditionEditor value={el.visible_if} onChange={(v) => set('visible_if', v)} />

        <Separator />
        <SectionTitle>Layers</SectionTitle>
        <div className="max-h-52 space-y-0.5 overflow-y-auto rounded border p-1">
          {[...elements]
            .sort((a, b) => (b.z ?? 0) - (a.z ?? 0))
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={(e) => (e.shiftKey || e.metaKey || e.ctrlKey ? toggleSelectedId(item.id) : setSelectedId(item.id))}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm ${
                  item.id === el.id ? 'bg-blue-50 font-semibold text-blue-700' : 'hover:bg-accent'
                }`}
              >
                <span className="truncate font-medium">{TYPE_LABELS[item.type] || item.type}</span>
                <span className="ml-2 truncate text-xs text-muted-foreground">{elementLabel(item)}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

function TextareaCommit({ value, onCommit }) {
  const [local, setLocal] = React.useState(value ?? '');
  React.useEffect(() => setLocal(value ?? ''), [value]);
  return <Textarea rows={3} className="text-xs" value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => onCommit(local)} />;
}

function ConditionEditor({ value, onChange }) {
  const enabled = !!value;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs">Only show when…</span>
        <Switch checked={enabled} onCheckedChange={(v) => onChange(v ? { field: 'invoice.notes', op: 'not_empty' } : null)} />
      </div>
      {enabled && (
        <div className="grid grid-cols-2 gap-2">
          <Input variant="sm" value={value.field} placeholder="invoice.notes" onChange={(e) => onChange({ ...value, field: e.target.value })} />
          <Select value={value.op} onValueChange={(op) => onChange({ ...value, op })}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {['eq', 'neq', 'gt', 'lt'].includes(value.op) && (
            <Input
              variant="sm"
              className="col-span-2"
              value={value.value ?? ''}
              placeholder="Comparison value"
              onChange={(e) => onChange({ ...value, value: e.target.value })}
            />
          )}
        </div>
      )}
    </div>
  );
}

const FORMAT_BY_TYPE = {
  money: { type: 'money' },
  number: { type: 'number' },
  date: { type: 'date', pattern: 'short' },
  boolean: { type: 'boolean' },
  text: { type: 'text' },
};

function formatForLineField(field) {
  if (!field) return { type: 'text' };
  if (field.token === 'line.index') return { type: 'number', decimals: 0 };
  return FORMAT_BY_TYPE[field.type] || { type: 'text' };
}

/** Keep adjacent column widths summing the same when one side grows. */
function redistributeWidths(columns, leftIndex, leftPct) {
  if (leftIndex < 0 || leftIndex >= columns.length - 1) return columns;
  const rightIndex = leftIndex + 1;
  const left = columns[leftIndex];
  const right = columns[rightIndex];
  const pair = Math.max(2, (Number(left.width_pct) || 10) + (Number(right.width_pct) || 10));
  const nextLeft = Math.min(pair - 1, Math.max(1, Math.round(leftPct * 10) / 10));
  const nextRight = Math.round((pair - nextLeft) * 10) / 10;
  return columns.map((c, i) => {
    if (i === leftIndex) return { ...c, width_pct: nextLeft };
    if (i === rightIndex) return { ...c, width_pct: nextRight };
    return c;
  });
}

function ColumnWidthBar({ columns, elementId }) {
  const setPropertyLive = useDocumentDesignerStore((s) => s.setPropertyLive);
  const recordPropertyChange = useDocumentDesignerStore((s) => s.recordPropertyChange);
  const total = columns.reduce((s, c) => s + (Number(c.width_pct) || 0), 0) || 100;
  const dragRef = React.useRef(null);

  const onPointerDown = (boundaryIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    const track = e.currentTarget.parentElement;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const snapshot = columns.map((c) => ({ ...c }));
    dragRef.current = {
      boundaryIndex,
      rectLeft: rect.left,
      rectWidth: rect.width,
      snapshot,
    };
    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const x = Math.min(d.rectLeft + d.rectWidth, Math.max(d.rectLeft, ev.clientX));
      const pctAlong = ((x - d.rectLeft) / d.rectWidth) * total;
      let cum = 0;
      for (let i = 0; i < d.boundaryIndex; i += 1) cum += Number(d.snapshot[i].width_pct) || 0;
      const next = redistributeWidths(d.snapshot, d.boundaryIndex, pctAlong - cum);
      setPropertyLive(elementId, 'columns', next);
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!d || !elementId) return;
      const after = useDocumentDesignerStore.getState().elements.find((el) => el.id === elementId)?.columns;
      recordPropertyChange(elementId, 'columns', d.snapshot, after || d.snapshot);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  let cumPct = 0;
  const boundaries = columns.slice(0, -1).map((_, i) => {
    cumPct += ((Number(columns[i].width_pct) || 0) / total) * 100;
    return { index: i, left: cumPct };
  });

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Column widths</p>
          <p className="text-xs text-muted-foreground">Drag the blue lines — make Sr narrow, Description wide</p>
        </div>
      </div>
      <div className="relative flex h-11 overflow-hidden rounded-lg border bg-background shadow-sm">
        {columns.map((c, i) => {
          const w = Number(c.width_pct) || 0;
          const flex = total > 0 ? (w / total) * 100 : 100 / columns.length;
          return (
            <div
              key={c.key || i}
              className="flex min-w-0 flex-col items-center justify-center border-r border-border/40 px-1 last:border-r-0"
              style={{ width: `${flex}%` }}
              title={`${c.label || c.key}: ${Math.round(w * 10) / 10}%`}
            >
              <span className="w-full truncate text-center text-xs font-medium">{c.label || c.key || `Col ${i + 1}`}</span>
              <span className="text-[10px] text-muted-foreground">{Math.round(w)}%</span>
            </div>
          );
        })}
        {boundaries.map((b) => (
          <button
            key={`b-${b.index}`}
            type="button"
            aria-label="Drag to resize columns"
            className="absolute top-0 z-10 h-full w-4 -translate-x-1/2 cursor-col-resize"
            style={{ left: `${b.left}%` }}
            onPointerDown={(e) => onPointerDown(b.index, e)}
          >
            <span className="absolute inset-y-1.5 left-1/2 w-1 -translate-x-1/2 rounded-full bg-blue-500 shadow-sm" />
          </button>
        ))}
      </div>
    </div>
  );
}

function normalizeColumnWidth(columns, index, newWidth) {
  const clamped = Math.max(5, Math.min(70, Number(newWidth) || 5));
  const othersSum = columns.reduce((s, c, i) => (i === index ? s : s + (Number(c.width_pct) || 0)), 0);
  const remaining = Math.max(5, 100 - clamped);
  const scale = othersSum > 0 ? remaining / othersSum : 1;
  return columns.map((c, i) => {
    if (i === index) return { ...c, width_pct: Math.round(clamped * 10) / 10 };
    return { ...c, width_pct: Math.max(5, Math.round((Number(c.width_pct) || 0) * scale * 10) / 10) };
  });
}

function useFieldCatalog() {
  const [catalog, setCatalog] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let cancelled = false;
    documentOutputApi
      .fieldCatalog()
      .then((res) => {
        if (!cancelled) setCatalog(unwrapDoc(res) || []);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { catalog, loading };
}

function columnKeyFromToken(token) {
  return String(token || 'col')
    .replace(/^line\./, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 40);
}

function ItemsTableFields({ el, set }) {
  const { catalog, loading } = useFieldCatalog();
  const rh = el.row_height || { mode: 'auto', fixed_mm: 8, min_mm: 6, max_mm: 20, line_height_mm: 4.2 };
  const setRowHeight = (patch) => set('row_height', { ...rh, ...patch });
  const columns = el.columns || [];
  const setColumns = (next) => set('columns', next);
  const setPropertyLive = useDocumentDesignerStore((s) => s.setPropertyLive);
  const recordPropertyChange = useDocumentDesignerStore((s) => s.recordPropertyChange);
  const widthDragRef = React.useRef(null);
  const updateColumn = (i, patch) => setColumns(columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeColumn = (i) => {
    setColumns(columns.filter((_, idx) => idx !== i));
    setExpandedCol((cur) => (cur === i ? null : cur != null && cur > i ? cur - 1 : cur));
  };
  const dragIndexRef = React.useRef(null);
  const [dragOverIndex, setDragOverIndex] = React.useState(null);
  const [expandedCol, setExpandedCol] = React.useState(null);
  const [showAdvancedRows, setShowAdvancedRows] = React.useState(false);

  const moveColumn = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= columns.length || to >= columns.length) return;
    const next = columns.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setColumns(next);
    setExpandedCol((cur) => {
      if (cur == null) return cur;
      if (cur === from) return to;
      if (from < cur && to >= cur) return cur - 1;
      if (from > cur && to <= cur) return cur + 1;
      return cur;
    });
  };

  const lineFields = React.useMemo(() => (catalog || []).filter((f) => f.group === 'Line'), [catalog]);
  const usedBindings = React.useMemo(() => new Set(columns.map((c) => c.binding).filter(Boolean)), [columns]);
  const availableToAdd = React.useMemo(
    () => lineFields.filter((f) => !usedBindings.has(f.token)),
    [lineFields, usedBindings],
  );

  const addFromToken = (token) => {
    const field = lineFields.find((f) => f.token === token);
    if (!field) return;
    const width = Math.max(8, Math.floor(100 / Math.max(1, columns.length + 1)));
    setColumns([
      ...columns,
      {
        key: columnKeyFromToken(token),
        binding: field.token,
        label: field.label,
        width_pct: width,
        align: ['line.quantity', 'line.unit_price', 'line.discount_fixed', 'line.discount_percent', 'line.tax_amount', 'line.sale_tax', 'line.net_total', 'line.line_total', 'line.final_total'].includes(field.token)
          ? 'right'
          : field.token === 'line.index'
            ? 'center'
            : 'left',
        wrap: field.token === 'line.description',
        format: formatForLineField(field),
      },
    ]);
    setExpandedCol(columns.length);
  };

  const bindColumn = (i, token) => {
    const field = lineFields.find((f) => f.token === token);
    updateColumn(i, {
      binding: token,
      key: columnKeyFromToken(token),
      label: columns[i]?.label || field?.label || token,
      format: formatForLineField(field) || columns[i]?.format || { type: 'text' },
      ...(token === 'line.index' ? { align: columns[i]?.align || 'center' } : {}),
    });
  };

  return (
    <div className="space-y-4">
      <Separator />
      <div>
        <p className="text-sm font-semibold">Items table</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Tip: on the sheet, select the table and drag the blue lines between columns. Or use the width bar below.
        </p>
      </div>

      {columns.length > 1 ? <ColumnWidthBar columns={columns} elementId={el.id} /> : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Columns</p>
          <Select
            key={`add-col-${availableToAdd.length}-${columns.length}`}
            disabled={loading || availableToAdd.length === 0}
            onValueChange={addFromToken}
          >
            <SelectTrigger className="h-9 w-[148px] text-sm">
              <SelectValue placeholder={loading ? 'Loading…' : availableToAdd.length ? '+ Add column' : 'All added'} />
            </SelectTrigger>
            <SelectContent>
              {availableToAdd.map((f) => (
                <SelectItem key={f.token} value={f.token}>
                  {f.label}
                  {String(f.token).startsWith('line.custom.') ? ' (custom)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {columns.map((c, i) => {
            const open = expandedCol === i;
            const fieldLabel = lineFields.find((f) => f.token === c.binding)?.label || c.binding || 'Field';
            return (
              <div
                key={`${c.key || c.binding || 'col'}-${i}`}
                className={`overflow-hidden rounded-xl border bg-background shadow-sm transition-colors ${
                  dragOverIndex === i ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border'
                }`}
                draggable
                onDragStart={(e) => {
                  dragIndexRef.current = i;
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(i));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverIndex !== i) setDragOverIndex(i);
                }}
                onDragLeave={() => {
                  if (dragOverIndex === i) setDragOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIndexRef.current ?? Number(e.dataTransfer.getData('text/plain'));
                  setDragOverIndex(null);
                  dragIndexRef.current = null;
                  moveColumn(from, i);
                }}
                onDragEnd={() => {
                  dragIndexRef.current = null;
                  setDragOverIndex(null);
                }}
              >
                <div className="flex items-center gap-1.5 px-2.5 py-2">
                  <button
                    type="button"
                    className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpandedCol(open ? null : i)}
                  >
                    <p className="truncate text-sm font-medium">{c.label || 'Untitled'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fieldLabel} · {Math.round(Number(c.width_pct) || 0)}% wide
                    </p>
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    title={open ? 'Hide details' : 'Edit column'}
                    onClick={() => setExpandedCol(open ? null : i)}
                  >
                    {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    title="Remove column"
                    onClick={() => removeColumn(i)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="border-t px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-10 shrink-0 text-xs text-muted-foreground">Width</span>
                    <input
                      type="range"
                      min={5}
                      max={70}
                      step={1}
                      value={Math.round(Number(c.width_pct) || 20)}
                      className="h-2 flex-1 cursor-pointer accent-blue-600"
                      onPointerDown={() => {
                        widthDragRef.current = columns.map((col) => ({ ...col }));
                      }}
                      onChange={(e) => {
                        const next = normalizeColumnWidth(columns, i, Number(e.target.value));
                        setPropertyLive(el.id, 'columns', next);
                      }}
                      onPointerUp={() => {
                        const before = widthDragRef.current;
                        widthDragRef.current = null;
                        if (!before) return;
                        const after = useDocumentDesignerStore.getState().elements.find((x) => x.id === el.id)?.columns;
                        recordPropertyChange(el.id, 'columns', before, after || before);
                      }}
                    />
                    <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums">
                      {Math.round(Number(c.width_pct) || 0)}%
                    </span>
                  </div>
                </div>

                {open ? (
                  <div className="space-y-3 border-t bg-muted/15 px-3 py-3">
                    <Field label="Header name">
                      <Input
                        variant="sm"
                        className="h-9 text-sm"
                        value={c.label || ''}
                        placeholder="e.g. Sr. # or Description"
                        onChange={(e) => updateColumn(i, { label: e.target.value })}
                      />
                    </Field>
                    <Field label="What data shows">
                      <Select value={c.binding || undefined} onValueChange={(v) => bindColumn(i, v)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Choose field…" />
                        </SelectTrigger>
                        <SelectContent>
                          {lineFields.map((f) => (
                            <SelectItem key={f.token} value={f.token}>
                              {f.label}
                              {String(f.token).startsWith('line.custom.') ? ' (custom)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Align">
                        <Select value={c.align || 'left'} onValueChange={(v) => updateColumn(i, { align: v })}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Number style">
                        {(c.format?.type || 'text') === 'number' ? (
                          <Select
                            value={String(c.format?.decimals ?? (c.binding === 'line.index' ? 0 : 2))}
                            onValueChange={(v) =>
                              updateColumn(i, {
                                format: { ...(c.format || {}), type: 'number', decimals: Number(v) },
                              })
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">1, 2, 3</SelectItem>
                              <SelectItem value="1">1.0</SelectItem>
                              <SelectItem value="2">1.00</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (c.format?.type || 'text') === 'money' ? (
                          <label className="flex h-9 items-center gap-2 text-sm">
                            <Switch
                              checked={c.format?.show_currency !== false}
                              onCheckedChange={(v) =>
                                updateColumn(i, { format: { ...(c.format || {}), type: 'money', show_currency: v } })
                              }
                            />
                            Show currency
                          </label>
                        ) : (
                          <Select
                            value={c.format?.type || 'text'}
                            onValueChange={(v) =>
                              updateColumn(i, {
                                format: {
                                  ...(c.format || {}),
                                  type: v,
                                  ...(v === 'number' && c.binding === 'line.index' ? { decimals: 0 } : {}),
                                },
                              })
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="money">Money</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </Field>
                    </div>
                    <label className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                      <span>Wrap long text</span>
                      <Switch checked={!!c.wrap} onCheckedChange={(v) => updateColumn(i, { wrap: v })} />
                    </label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 text-xs"
                        disabled={i === 0}
                        onClick={() => moveColumn(i, i - 1)}
                      >
                        ← Move left
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 text-xs"
                        disabled={i >= columns.length - 1}
                        onClick={() => moveColumn(i, i + 1)}
                      >
                        Move right →
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/15">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          onClick={() => setShowAdvancedRows((v) => !v)}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="size-4 text-muted-foreground" />
            Row height (optional)
          </span>
          {showAdvancedRows ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        {showAdvancedRows ? (
          <div className="space-y-3 border-t px-3 py-3">
            <Field label="Mode">
              <Select value={rh.mode} onValueChange={(v) => setRowHeight({ mode: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto — grows with text</SelectItem>
                  <SelectItem value="fixed">Fixed height</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {rh.mode === 'fixed' ? (
              <NumberField label="Row height (mm)" value={rh.fixed_mm} step={0.5} onCommit={(v) => setRowHeight({ fixed_mm: v })} />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="Min (mm)" value={rh.min_mm} step={0.5} onCommit={(v) => setRowHeight({ min_mm: v })} />
                <NumberField label="Max (mm)" value={rh.max_mm} step={0.5} onCommit={(v) => setRowHeight({ max_mm: v })} />
                <NumberField label="Line (mm)" value={rh.line_height_mm} step={0.1} onCommit={(v) => setRowHeight({ line_height_mm: v })} />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TotalsBlockFields({ el, set }) {
  const { catalog, loading } = useFieldCatalog();
  const rows = el.rows || [];
  const setRows = (next) => set('rows', next);
  const updateRow = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i));
  const totalFields = React.useMemo(
    () => (catalog || []).filter((f) => f.group === 'Totals' || f.group === 'Document' || f.group === 'Custom Fields'),
    [catalog],
  );
  const addRow = () => setRows([...rows, { label: 'Row', binding: 'totals.subtotal', format: { type: 'money' } }]);

  return (
    <>
      <Separator />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase text-muted-foreground">Rows</span>
        <Button type="button" size="icon" variant="outline" className="size-6" onClick={addRow}>
          <Plus className="size-3" />
        </Button>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="space-y-1.5 rounded border p-2">
          <div className="flex items-center justify-between gap-1">
            <Input variant="sm" className="h-6 text-[11px]" value={r.label || ''} placeholder="Label" onChange={(e) => updateRow(i, { label: e.target.value })} />
            <Button type="button" size="icon" variant="ghost" className="size-6" onClick={() => removeRow(i)}>
              <X className="size-3" />
            </Button>
          </div>
          <Select
            disabled={loading}
            value={r.binding || undefined}
            onValueChange={(v) => {
              const field = totalFields.find((f) => f.token === v);
              updateRow(i, {
                binding: v,
                label: r.label || field?.label || v,
                format: FORMAT_BY_TYPE[field?.type] || r.format || { type: 'money' },
              });
            }}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue placeholder="Choose field…" />
            </SelectTrigger>
            <SelectContent>
              {totalFields.map((f) => (
                <SelectItem key={f.token} value={f.token}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between gap-2">
            <Select
              value={r.format?.type || 'money'}
              onValueChange={(v) => updateRow(i, { format: { ...(r.format || {}), type: v } })}
            >
              <SelectTrigger className="h-6 w-[110px] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['money', 'number', 'text'].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(r.format?.type || 'money') === 'money' ? (
              <label className="flex items-center gap-1 text-[10px]">
                <Switch
                  checked={r.format?.show_currency !== false}
                  onCheckedChange={(v) => updateRow(i, { format: { ...(r.format || {}), type: 'money', show_currency: v } })}
                />
                Show currency
              </label>
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
}
