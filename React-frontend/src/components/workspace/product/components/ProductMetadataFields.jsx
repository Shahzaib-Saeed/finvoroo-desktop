import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function parseOptions(def) {
  if (Array.isArray(def.options)) return def.options;
  if (Array.isArray(def.select_options)) return def.select_options;
  return [];
}

export function ProductMetadataFields({ definitions, values, onChange, errors = {} }) {
  if (!definitions?.length) return null;

  return (
    <div className="grid grid-cols-12 gap-3">
      {definitions.map((def) => {
        const id = String(def.id);
        const value = values[id] ?? '';
        const error = errors[`product_metadata_custom_fields.${id}`] || errors[id];
        const colClass = def.type === 'textarea' ? 'col-span-12' : 'col-span-12 sm:col-span-6';

        return (
          <div key={id} className={`space-y-1 ${colClass}`}>
            <Label className="text-sm">
              {def.label}
              {def.is_required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {def.type === 'textarea' ? (
              <Textarea rows={2} value={value} onChange={(e) => onChange(id, e.target.value)} />
            ) : def.type === 'number' ? (
              <Input
                type="number"
                step="any"
                value={value}
                onChange={(e) => onChange(id, e.target.value)}
              />
            ) : def.type === 'date' ? (
              <Input
                type="date"
                value={value ? String(value).slice(0, 10) : ''}
                onChange={(e) => onChange(id, e.target.value)}
              />
            ) : def.type === 'dropdown' || def.type === 'radio' ? (
              <Select
                value={value || '_none'}
                onValueChange={(v) => onChange(id, v === '_none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {parseOptions(def).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={value} onChange={(e) => onChange(id, e.target.value)} />
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}
