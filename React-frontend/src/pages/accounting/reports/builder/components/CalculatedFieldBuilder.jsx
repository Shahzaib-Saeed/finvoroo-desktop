import { useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Calculated fields are composed by clicking field chips / operator
 * buttons into a formula text box — never free-typed SQL. Whatever ends
 * up in the box is still just a string parsed server-side by the same
 * whitelist-only FormulaParser (ROUND/ABS + arithmetic + declared
 * numeric fields only); this UI is a convenience layer, not the safety
 * boundary — that boundary is enforced by the backend regardless of how
 * the string was assembled.
 */
export function CalculatedFieldBuilder({ numericFields, calculatedFields, onChange }) {
  const inputRefs = useRef({});

  const addField = () => {
    onChange([...calculatedFields, { key: `calc_${calculatedFields.length + 1}`, label: 'New Field', formula: '', format: 'money' }]);
  };

  const updateAt = (index, patch) => {
    const next = [...calculatedFields];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeAt = (index) => onChange(calculatedFields.filter((_, i) => i !== index));

  const insertToken = (index, token) => {
    const el = inputRefs.current[index];
    const current = calculatedFields[index].formula || '';
    if (el && typeof el.selectionStart === 'number') {
      const pos = el.selectionStart;
      const next = current.slice(0, pos) + token + current.slice(pos);
      updateAt(index, { formula: next });
      requestAnimationFrame(() => el.focus());
    } else {
      updateAt(index, { formula: current + token });
    }
  };

  const availableRefs = (index) => [
    ...numericFields.map((f) => ({ token: f.key, label: f.label })),
    ...calculatedFields.slice(0, index).map((c) => ({ token: c.key, label: c.label })),
  ];

  return (
    <div className="flex flex-col gap-3">
      {calculatedFields.map((calc, index) => (
        <div key={index} className="rounded-lg border border-slate-200 bg-white p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Input
              className="h-7 flex-1 text-xs"
              value={calc.label}
              onChange={(e) => updateAt(index, { label: e.target.value, key: slugify(e.target.value) })}
              placeholder="Field name (e.g. Profit)"
            />
            <button type="button" onClick={() => removeAt(index)} className="text-slate-300 hover:text-red-500">
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <Input
            ref={(el) => (inputRefs.current[index] = el)}
            className="h-7 font-mono text-xs"
            value={calc.formula}
            onChange={(e) => updateAt(index, { formula: e.target.value })}
            placeholder="e.g. revenue - cost"
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {availableRefs(index).map((ref) => (
              <button
                key={ref.token}
                type="button"
                onClick={() => insertToken(index, ref.token)}
                className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 hover:bg-slate-100"
              >
                {ref.label}
              </button>
            ))}
            {['+', '-', '*', '/', '(', ')', 'ROUND(', 'ABS('].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => insertToken(index, op)}
                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500 hover:bg-slate-100"
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 w-fit gap-1 text-xs" onClick={addField}>
        <Plus className="size-3" />
        Add calculated field
      </Button>
    </div>
  );
}

function slugify(label) {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'calc_field'
  );
}
