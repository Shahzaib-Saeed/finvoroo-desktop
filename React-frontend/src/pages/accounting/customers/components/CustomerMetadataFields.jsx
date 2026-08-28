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
  if (typeof def.options_json === 'string') {
    try {
      const parsed = JSON.parse(def.options_json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function CustomerMetadataFields({ definitions, values, onChange, errors = {} }) {
  if (!definitions?.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No custom fields defined for customers yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      {definitions.map((def) => {
        const id = String(def.id);
        const value = values[id] ?? '';
        const error = errors[`metadata_custom_fields.${id}`] || errors[id];
        const colClass = def.type === 'textarea' ? 'col-span-12' : 'col-span-12 sm:col-span-6';
        const options = parseOptions(def);

        return (
          <div key={id} className={`space-y-1 ${colClass}`}>
            <Label className="text-sm">
              {def.label}
              {def.is_required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {def.type === 'textarea' ? (
              <Textarea
                rows={2}
                value={value}
                onChange={(e) => onChange(id, e.target.value)}
              />
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
                modal={false}
                value={value || '_none'}
                onValueChange={(v) => onChange(id, v === '_none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {options.map((opt) => (
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
