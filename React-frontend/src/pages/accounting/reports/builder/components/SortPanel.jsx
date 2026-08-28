import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Multi-column sort — order in the list is precedence order. */
export function SortPanel({ sortableFields, sort, onChange }) {
  const addSort = () => {
    const field = sortableFields.find((f) => !sort.some((s) => s.field === f.key));
    if (!field) return;
    onChange([...sort, { field: field.key, direction: 'asc' }]);
  };

  const updateSort = (index, patch) => {
    const next = [...sort];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeSort = (index) => onChange(sort.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-1.5">
      {sort.map((s, index) => (
        <div key={`${s.field}-${index}`} className="flex items-center gap-1.5">
          <Select value={s.field} onValueChange={(field) => updateSort(index, { field })}>
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortableFields.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => updateSort(index, { direction: s.direction === 'asc' ? 'desc' : 'asc' })}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100"
            title={s.direction === 'asc' ? 'Ascending' : 'Descending'}
          >
            {s.direction === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
          </button>
          <button type="button" onClick={() => removeSort(index)} className="text-slate-300 hover:text-red-500">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="h-7 w-fit gap-1 text-xs text-slate-500" onClick={addSort}>
        <Plus className="size-3" />
        Add sort
      </Button>
    </div>
  );
}
