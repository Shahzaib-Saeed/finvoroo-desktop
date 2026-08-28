import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { cn } from '@/lib/utils';

export function InvoiceTemplateSelector({
  templates = [],
  value,
  onValueChange,
  disabled = false,
  showManageLink = true,
  showHint = false,
  className = '',
}) {
  const { id: workspaceId } = useParams();

  const templateOptions = useMemo(
    () =>
      templates.map((t) => ({
        value: String(t.id),
        label: `${t.name}${t.is_default ? ' (default)' : ''}`,
      })),
    [templates],
  );

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-sm text-muted-foreground whitespace-nowrap mb-0">Template</Label>
        <SearchableCombobox
          value={value}
          onValueChange={onValueChange}
          options={templateOptions}
          placeholder="Select template"
          searchPlaceholder="Search templates…"
          disabled={disabled}
          className="w-[220px]"
          triggerClassName="h-9"
        />
        {showManageLink ? (
          <>
            <Button variant="link" size="sm" className="h-9 px-1 text-muted-foreground" asChild>
              <Link
                to={`/workspace/${workspaceId}/accounting/invoice-templates`}
                target="_blank"
                rel="noopener"
              >
                <ExternalLink className="size-3.5 mr-1" />
                Manage templates
              </Link>
            </Button>
            <Button variant="link" size="sm" className="h-9 px-1 text-muted-foreground" asChild>
              <Link
                to={`/workspace/${workspaceId}/accounting/document-output/designer`}
                target="_blank"
                rel="noopener"
              >
                <ExternalLink className="size-3.5 mr-1" />
                Print designer
              </Link>
            </Button>
          </>
        ) : null}
      </div>
      {showHint ? (
        <p className="text-xs text-muted-foreground max-w-sm">
          Custom fields follow the selected template.
        </p>
      ) : null}
    </div>
  );
}
