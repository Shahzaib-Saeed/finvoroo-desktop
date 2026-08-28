import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  OPERATOR_LABELS,
  RELATIVE_DATE_OPTIONS,
  operatorNeedsArrayValue,
  operatorNeedsValue,
  operatorsForType,
} from '../filter-operators';
import { nextFilterNodeId, normalizeFilterTree } from '../filter-tree';

const nextId = () => nextFilterNodeId();

function emptyCondition(field) {
  return { id: nextId(), type: 'condition', field: field?.key || '', operator: 'equals', value: '' };
}

function emptyGroup(operator = 'and') {
  return { id: nextId(), type: 'group', operator, children: [emptyCondition()] };
}

/** Top-level entry point — filters is either null or a root group node. */
export function FilterBuilder({ filterableFields, tree, onChange, variant = 'default' }) {
  const normalizedTree = normalizeFilterTree(tree);
  const isWizard = variant === 'wizard';

  if (!normalizedTree) {
    return (
      <button
        type="button"
        onClick={() => onChange(emptyGroup())}
        className={cn(
          'flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
          isWizard
            ? 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/40'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
        )}
      >
        <span
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-lg',
            isWizard ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500',
          )}
        >
          <Plus className="size-4" />
        </span>
        <span className="text-sm font-medium text-slate-700">Add your first filter</span>
        {isWizard ? (
          <span className="text-xs text-slate-500">Or continue without filters — totally optional</span>
        ) : null}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FilterGroupNode
        node={normalizedTree}
        fields={filterableFields}
        onChange={onChange}
        onRemove={() => onChange(null)}
        isRoot
        variant={variant}
      />
    </div>
  );
}

function FilterGroupNode({ node, fields, onChange, onRemove, isRoot = false, variant = 'default' }) {
  const children = Array.isArray(node.children) ? node.children : [];
  const isWizard = variant === 'wizard';

  const updateChild = (index, updater) => {
    const nextChildren = [...children];
    nextChildren[index] = typeof updater === 'function' ? updater(nextChildren[index]) : updater;
    onChange({ ...node, children: nextChildren });
  };

  const removeChild = (index) => {
    const nextChildren = children.filter((_, i) => i !== index);
    onChange({ ...node, children: nextChildren });
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-3 sm:p-4',
        isWizard ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50/60 p-2.5',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
          {['and', 'or'].map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => onChange({ ...node, operator: op })}
              className={cn(
                'px-3 py-1.5 uppercase transition-colors',
                node.operator === op
                  ? isWizard
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50',
              )}
            >
              {op}
            </button>
          ))}
        </div>
        {!isRoot ? (
          <button type="button" onClick={onRemove} className="text-slate-300 hover:text-red-500">
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5">
        {children.map((child, index) =>
          child.type === 'group' ? (
            <FilterGroupNode
              key={child.id}
              node={child}
              fields={fields}
              onChange={(next) => updateChild(index, next)}
              onRemove={() => removeChild(index)}
              variant={variant}
            />
          ) : (
            <FilterConditionRow
              key={child.id}
              node={child}
              fields={fields}
              onChange={(next) => updateChild(index, next)}
              onRemove={() => removeChild(index)}
              variant={variant}
            />
          ),
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-8 gap-1 text-xs', isWizard && 'border-slate-200')}
          onClick={() => onChange({ ...node, children: [...children, emptyCondition(fields[0])] })}
        >
          <Plus className="size-3" />
          Condition
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-8 gap-1 text-xs', isWizard && 'border-slate-200')}
          onClick={() => onChange({ ...node, children: [...children, emptyGroup('and')] })}
        >
          <Plus className="size-3" />
          Group
        </Button>
        {isRoot ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-red-500 hover:text-red-600"
            onClick={onRemove}
          >
            <Trash2 className="size-3" />
            Clear all
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FilterConditionRow({ node, fields, onChange, onRemove, variant = 'default' }) {
  const isWizard = variant === 'wizard';
  const field = fields.find((f) => f.key === node.field) || fields[0];
  const operators = field ? operatorsForType(field.type) : [];

  const handleFieldChange = (key) => {
    const nextField = fields.find((f) => f.key === key);
    const validOps = nextField ? operatorsForType(nextField.type) : [];
    onChange({ ...node, field: key, operator: validOps[0] || 'equals', value: '', values: undefined });
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border p-2.5',
        isWizard ? 'border-slate-100 bg-slate-50/80' : 'bg-white p-1.5',
      )}
    >
      <Select value={node.field} onValueChange={handleFieldChange}>
        <SelectTrigger className={cn('text-xs', isWizard ? 'h-9 w-40 bg-white' : 'h-7 w-36')}>
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={node.operator} onValueChange={(op) => onChange({ ...node, operator: op, value: '', values: undefined })}>
        <SelectTrigger className={cn('text-xs', isWizard ? 'h-9 w-44 bg-white' : 'h-7 w-40')}>
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ConditionValueInput node={node} field={field} onChange={onChange} variant={variant} />

      <button type="button" onClick={onRemove} className="ml-auto text-slate-300 hover:text-red-500">
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function ConditionValueInput({ node, field, onChange, variant = 'default' }) {
  const isWizard = variant === 'wizard';
  const inputClass = cn('text-xs', isWizard ? 'h-9 bg-white' : 'h-7');
  const selectClass = cn('text-xs', isWizard ? 'h-9 bg-white' : 'h-7');
  if (!operatorNeedsValue(node.operator)) {
    return null;
  }

  if (node.operator === 'relative_date') {
    return (
      <>
        <Select value={node.value || ''} onValueChange={(v) => onChange({ ...node, value: v })}>
          <SelectTrigger className={cn(selectClass, 'w-36')}>
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent>
            {RELATIVE_DATE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {node.value === 'custom_range' ? (
          <>
            <Input
              type="date"
              className={cn(inputClass, 'w-32')}
              value={node.from || ''}
              onChange={(e) => onChange({ ...node, from: e.target.value })}
            />
            <Input
              type="date"
              className={cn(inputClass, 'w-32')}
              value={node.to || ''}
              onChange={(e) => onChange({ ...node, to: e.target.value })}
            />
          </>
        ) : null}
      </>
    );
  }

  if (operatorNeedsArrayValue(node.operator)) {
    const values = node.values || ['', ''];
    if (node.operator === 'between') {
      return (
        <>
          <Input
            className={cn(inputClass, 'w-24')}
            value={values[0] ?? ''}
            onChange={(e) => onChange({ ...node, values: [e.target.value, values[1] ?? ''] })}
            placeholder="From"
          />
          <Input
            className={cn(inputClass, 'w-24')}
            value={values[1] ?? ''}
            onChange={(e) => onChange({ ...node, values: [values[0] ?? '', e.target.value] })}
            placeholder="To"
          />
        </>
      );
    }

    return (
      <Input
        className={cn(inputClass, 'w-44')}
        value={(node.values || []).join(', ')}
        onChange={(e) => onChange({ ...node, values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
        placeholder="Comma-separated values"
      />
    );
  }

  return (
    <Input
      type={field?.type === 'number' || field?.type === 'money' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
      className={cn(inputClass, 'w-32')}
      value={node.value ?? ''}
      onChange={(e) => onChange({ ...node, value: e.target.value })}
      placeholder="Value"
    />
  );
}
