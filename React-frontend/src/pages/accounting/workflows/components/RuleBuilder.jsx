import { Plus, Trash2 } from 'lucide-react';
import { HelpTip } from './HelpTip';
import { RULE_FIELDS, RULE_OPS } from '../constants';
import { ruleToEnglish } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function RuleBuilder({ rules, onChange }) {
  const list = rules?.length ? rules : [{ field: 'always', op: 'eq', value: true }];

  const update = (index, patch) => {
    const next = list.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  };

  const setAlways = () => onChange([{ field: 'always', op: 'eq', value: true }]);

  const addRule = () => {
    const base = list.filter((r) => r.field !== 'always');
    onChange([...base, { field: 'amount', op: 'gte', value: 10000 }]);
  };

  const remove = (index) => {
    const next = list.filter((_, i) => i !== index);
    onChange(next.length ? next : [{ field: 'always', op: 'eq', value: true }]);
  };

  const isAlways = list.length === 1 && list[0].field === 'always';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Label className="text-base font-semibold">When should this workflow run?</Label>
            <HelpTip>
              Choose when documents use this workflow. “Always” means every document of this type.
              Amount rules are great for high-value approvals.
            </HelpTip>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Write conditions in plain language — no formulas required.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={setAlways}
          className={`rounded-xl border p-4 text-left transition-all ${
            isAlways ? 'border-foreground bg-muted/40 shadow-sm' : 'hover:bg-muted/30'
          }`}
        >
          <div className="font-semibold text-sm">Always</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Run for every document in this module
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            if (isAlways) onChange([{ field: 'amount', op: 'gte', value: 100000 }]);
          }}
          className={`rounded-xl border p-4 text-left transition-all ${
            !isAlways ? 'border-foreground bg-muted/40 shadow-sm' : 'hover:bg-muted/30'
          }`}
        >
          <div className="font-semibold text-sm">Only when conditions match</div>
          <div className="mt-1 text-xs text-muted-foreground">
            e.g. amount ≥ 100,000 or currency = USD
          </div>
        </button>
      </div>

      {!isAlways && (
        <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">IF</div>
          {list.map((rule, index) => {
            const fieldMeta = RULE_FIELDS.find((f) => f.value === rule.field);
            return (
              <div key={index} className="rounded-xl border bg-background p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-4 space-y-1.5">
                    <Label className="text-xs">Field</Label>
                    <Select
                      value={rule.field}
                      onValueChange={(v) =>
                        update(index, {
                          field: v,
                          op: v === 'always' ? 'eq' : rule.op || 'gte',
                          value: v === 'always' ? true : rule.value ?? '',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_FIELDS.filter((f) => f.value !== 'always').map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <Label className="text-xs">Operator</Label>
                    <Select value={rule.op || 'gte'} onValueChange={(v) => update(index, { op: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_OPS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-4 space-y-1.5">
                    <Label className="text-xs">Value</Label>
                    <Input
                      type={fieldMeta?.type === 'number' ? 'number' : 'text'}
                      value={rule.value ?? ''}
                      placeholder={fieldMeta?.placeholder || 'Enter value'}
                      onChange={(e) =>
                        update(index, {
                          value: fieldMeta?.type === 'number' ? e.target.value : e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                  {ruleToEnglish(rule)}
                </div>
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={addRule}>
            <Plus className="size-4 mr-1" />
            Add condition
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-dashed px-4 py-3 text-sm">
        <span className="font-medium">THEN</span>
        <span className="text-muted-foreground"> use this workflow</span>
      </div>
    </div>
  );
}
