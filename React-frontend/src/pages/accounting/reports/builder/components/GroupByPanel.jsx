import { Checkbox } from '@/components/ui/checkbox';

/** Multiple grouping levels — order in the list is the grouping hierarchy. */
export function GroupByPanel({ groupableFields, groupBy, onChange }) {
  const toggle = (key) => {
    onChange(groupBy.includes(key) ? groupBy.filter((k) => k !== key) : [...groupBy, key]);
  };

  if (groupableFields.length === 0) {
    return <p className="text-xs text-slate-400">No groupable fields for this dataset.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {groupableFields.map((field) => (
        <label key={field.key} className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox checked={groupBy.includes(field.key)} onCheckedChange={() => toggle(field.key)} />
          {field.label}
          {groupBy.includes(field.key) ? (
            <span className="ml-auto text-[10px] tabular-nums text-slate-400">
              #{groupBy.indexOf(field.key) + 1}
            </span>
          ) : null}
        </label>
      ))}
    </div>
  );
}
