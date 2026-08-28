import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FUNCTION_LABELS = { sum: 'Sum', avg: 'Average', count: 'Count', count_distinct: 'Distinct Count', min: 'Minimum', max: 'Maximum' };

export function AggregationPanel({ aggregatableFields, aggregations, onChange }) {
  const addAggregation = () => {
    const field = aggregatableFields[0];
    if (!field) return;
    onChange([...aggregations, { field: field.key, function: field.aggregations[0] || 'sum', alias: '' }]);
  };

  const updateAt = (index, patch) => {
    const next = [...aggregations];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeAt = (index) => onChange(aggregations.filter((_, i) => i !== index));

  if (aggregatableFields.length === 0) {
    return <p className="text-xs text-slate-400">No aggregatable fields for this dataset.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {aggregations.map((agg, index) => {
        const field = aggregatableFields.find((f) => f.key === agg.field);
        const availableFns = field ? [...field.aggregations, 'count', 'count_distinct'] : [];
        return (
          <div key={index} className="flex items-center gap-1.5">
            <Select value={agg.function} onValueChange={(fn) => updateAt(index, { function: fn })}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFns.map((fn) => (
                  <SelectItem key={fn} value={fn}>
                    {FUNCTION_LABELS[fn] || fn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agg.field} onValueChange={(key) => updateAt(index, { field: key })}>
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aggregatableFields.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button type="button" onClick={() => removeAt(index)} className="text-slate-300 hover:text-red-500">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        );
      })}
      <Button variant="ghost" size="sm" className="h-7 w-fit gap-1 text-xs text-slate-500" onClick={addAggregation}>
        <Plus className="size-3" />
        Add aggregation
      </Button>
    </div>
  );
}
