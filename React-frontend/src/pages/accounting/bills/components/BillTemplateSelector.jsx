import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';

export function BillTemplateSelector({
  templates = [],
  value,
  formTemplateId,
  onChange,
  readOnly,
  workspaceId,
  className = '',
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <Label className="text-sm text-muted-foreground whitespace-nowrap mb-0">
        Layout template
      </Label>
      <SearchableCombobox
        value={value ?? formTemplateId}
        onValueChange={(v) => onChange?.(v)}
        options={(templates || []).map((t) => ({
          value: String(t.id),
          label: `${t.name}${t.is_default ? ' (default)' : ''}`,
        }))}
        placeholder="Template"
        searchPlaceholder="Search templates…"
        disabled={readOnly}
        className="w-[220px]"
        triggerClassName="h-9"
      />
      <Button variant="link" size="sm" className="h-9 px-2" asChild>
        <Link
          to={`/workspace/${workspaceId}/accounting/invoice-templates`}
          target="_blank"
          rel="noopener"
        >
          <ExternalLink className="size-3.5 mr-1" />
          Templates
        </Link>
      </Button>
    </div>
  );
}
