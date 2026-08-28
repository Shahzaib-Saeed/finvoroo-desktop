import { Link } from 'react-router-dom';
import {
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const secondaryButtonClass =
  'h-8 rounded-sm border-border bg-background px-2.5 text-xs font-medium shadow-none hover:bg-muted/50';

const exportButtonClass =
  'h-8 gap-1.5 rounded-sm bg-emerald-600 px-3 text-xs font-semibold text-white shadow-none hover:bg-emerald-700 disabled:opacity-50';

/**
 * Canonical report action hierarchy used by standard and custom reports.
 * Export is the only primary action; lower-frequency actions belong in `more`.
 */
export function ReportActionBar({
  leading,
  onExport,
  exportLabel = 'Export',
  exportDisabled = false,
  onPdf,
  pdfDisabled = false,
  onPrint,
  printDisabled = false,
  editTo,
  more,
  className,
}) {
  return (
    <div
      className={cn(
        'no-print flex flex-wrap items-center justify-end gap-1.5',
        className,
      )}
    >
      {leading}

      {onExport ? (
        <Button
          size="sm"
          onClick={onExport}
          disabled={exportDisabled}
          className={exportButtonClass}
        >
          <FileSpreadsheet className="size-3.5" />
          {exportLabel}
        </Button>
      ) : null}

      {onPdf ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onPdf}
          disabled={pdfDisabled}
          className={cn(secondaryButtonClass, 'gap-1.5')}
        >
          <FileDown className="size-3.5 text-muted-foreground" />
          PDF
        </Button>
      ) : null}

      {onPrint ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onPrint}
          disabled={printDisabled}
          className={cn(secondaryButtonClass, 'gap-1.5')}
        >
          <Printer className="size-3.5 text-muted-foreground" />
          Print
        </Button>
      ) : null}

      {editTo ? (
        <Button
          variant="outline"
          size="sm"
          className={cn(secondaryButtonClass, 'gap-1.5')}
          asChild
        >
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
              className={cn(secondaryButtonClass, 'w-8 px-0')}
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
