import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DEFAULT_REPORT_DATE_RANGE_KEY,
  REPORT_DEFAULT_DATE_RANGE_OPTIONS,
} from '../filter-operators';

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private — only me' },
  { value: 'company', label: 'Company — everyone with report access' },
  { value: 'role', label: 'Role — share with specific roles/users' },
];

export function ReportSettingsPanel({
  settings,
  categories,
  onChange,
  dateRange,
  onDateRangeChange,
}) {
  const update = (patch) => onChange({ ...settings, ...patch });
  const dateRangeKey = dateRange?.relative_key || DEFAULT_REPORT_DATE_RANGE_KEY;

  const addTag = (e) => {
    if (e.key !== 'Enter' || !e.target.value.trim()) return;
    e.preventDefault();
    const tag = e.target.value.trim();
    if (!settings.tags.includes(tag)) {
      update({ tags: [...settings.tags, tag] });
    }
    e.target.value = '';
  };

  const removeTag = (tag) => update({ tags: settings.tags.filter((t) => t !== tag) });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label className="text-xs">Name</Label>
        <Input className="mt-1 h-8 text-sm" value={settings.name} onChange={(e) => update({ name: e.target.value })} placeholder="Report name" />
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea className="mt-1 text-sm" rows={2} value={settings.description} onChange={(e) => update({ description: e.target.value })} placeholder="Optional description" />
      </div>
      <div>
        <Label className="text-xs">Default date filter</Label>
        <Select
          value={dateRangeKey}
          onValueChange={(v) => onDateRangeChange?.({ relative_key: v })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue placeholder="Choose default period" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_DEFAULT_DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Used when opening this report. You can still change dates on the viewer.
        </p>
      </div>
      <div>
        <Label className="text-xs">Category</Label>
        <Select value={settings.category_id ? String(settings.category_id) : ''} onValueChange={(v) => update({ category_id: v ? Number(v) : null })}>
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue placeholder="Uncategorized" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Tags</Label>
        <div className="mt-1 flex flex-wrap gap-1 rounded-md border border-slate-200 p-1.5">
          {settings.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            className="min-w-[6rem] flex-1 border-0 bg-transparent text-xs outline-none"
            placeholder="Add tag, press Enter"
            onKeyDown={addTag}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Visibility</Label>
        <Select value={settings.visibility} onValueChange={(v) => update({ visibility: v })}>
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
