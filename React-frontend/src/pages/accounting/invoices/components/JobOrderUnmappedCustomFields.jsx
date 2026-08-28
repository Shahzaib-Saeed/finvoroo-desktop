import { Briefcase } from 'lucide-react';

/**
 * Job custom fields copied from the source job — printed on the invoice automatically.
 */
export function JobOrderUnmappedCustomFields({ fields = [] }) {
  if (!fields?.length) return null;

  return (
    <div className="rounded-lg border border-sky-200/80 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20 px-3 py-3 space-y-2">
      <p className="text-xs font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
        <Briefcase className="size-3.5 shrink-0" />
        Job details (will print on invoice)
      </p>
      <p className="text-[11px] text-sky-800/90 dark:text-sky-300/90 leading-snug">
        These fields come from the job order and appear on the customer invoice above the line items.
      </p>
      <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {fields.map((row) => (
          <div key={`${row.field_key || row.label}`} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="font-medium mt-0.5 break-words whitespace-pre-line">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
