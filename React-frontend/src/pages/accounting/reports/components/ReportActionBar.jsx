import { Link } from 'react-router-dom';
import {
  ChevronDown,
  Edit3,
  FileDown,
  FileSpreadsheet,
  MoreHorizontal,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const buttonClass =
  'h-8 gap-1.5 rounded-md border-border bg-background px-2.5 text-xs font-medium shadow-none hover:bg-muted/60';

/**
 * Report actions — Export / PDF / Print live in one dropdown so the page header stays quiet.
 */
export function ReportActionBar({
  leading,
  onExport,
  exportLabel = 'Export CSV',
  exportDisabled = false,
  onPdf,
  pdfDisabled = false,
  onPrint,
  printDisabled = false,
  editTo,
  more,
  className,
}) {
  const shareItems = [
    onExport
      ? {
          key: 'export',
          label: exportLabel,
          icon: FileSpreadsheet,
          onClick: onExport,
          disabled: exportDisabled,
        }
      : null,
    onPdf
      ? {
          key: 'pdf',
          label: 'Download PDF',
          icon: FileDown,
          onClick: onPdf,
          disabled: pdfDisabled,
        }
      : null,
    onPrint
      ? {
          key: 'print',
          label: 'Print',
          icon: Printer,
          onClick: onPrint,
          disabled: printDisabled,
        }
      : null,
  ].filter(Boolean);

  const allShareDisabled = shareItems.length > 0 && shareItems.every((item) => item.disabled);

  return (
    <div
      className={cn(
        'no-print flex flex-wrap items-center justify-end gap-1.5',
        className,
      )}
    >
      {leading}

      {shareItems.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={allShareDisabled}
              className={buttonClass}
            >
              <FileDown className="size-3.5 text-muted-foreground" />
              Export
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {shareItems.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.key}
                  disabled={item.disabled}
                  onSelect={() => {
                    if (!item.disabled) item.onClick();
                  }}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {editTo ? (
        <Button variant="outline" size="sm" className={buttonClass} asChild>
          <Link to={editTo}>
            <Edit3 className="size-3.5 text-muted-foreground" />
            Edit
          </Link>
        </Button>
      ) : null}

      {more ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(buttonClass, 'w-8 px-0')}
              aria-label="More report actions"
            >
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {more}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
