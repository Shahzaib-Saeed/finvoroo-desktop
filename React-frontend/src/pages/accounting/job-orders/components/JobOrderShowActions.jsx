import { Link } from 'react-router';
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Edit3,
  FileText,
  LayoutDashboard,
  Plus,
  Printer,
  Receipt,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

function ToolbarDivider() {
  return <div className="hidden sm:block w-px h-6 bg-border shrink-0" aria-hidden />;
}

export function JobOrderShowActions({
  base,
  plByJobReport,
  jobOrderId,
  canEdit,
  canDelete,
  paths,
  onDelete,
  onEdit,
  onNavigate,
  deleting = false,
  showNavigation = true,
  showPlReport = true,
  convertButtonLabel = 'Record on job',
  className,
}) {
  const { invoiceCreate, expenseCreate, billCreate } = paths;

  // When rendered inside a modal, navigating via a plain <Link> unmounts the
  // open dialog + dropdown mid-route-change and can leave Radix's
  // pointer-events lock on <body>, freezing the destination page. The host
  // passes onNavigate to close the dialog first, then navigate.
  const menuLink = (to, icon, label) =>
    onNavigate ? (
      <DropdownMenuItem onSelect={() => onNavigate(to)}>
        {icon}
        {label}
      </DropdownMenuItem>
    ) : (
      <DropdownMenuItem asChild>
        <Link to={to}>
          {icon}
          {label}
        </Link>
      </DropdownMenuItem>
    );

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {showNavigation ? (
        <>
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/dashboard`}>
              <LayoutDashboard className="size-4 mr-1" /> Dashboard
            </Link>
          </Button>

          {showPlReport ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={plByJobReport}>
                <BarChart3 className="size-4 mr-1" /> P&amp;L by job
              </Link>
            </Button>
          ) : null}

          <ToolbarDivider />
        </>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="mono">
            <Plus className="size-4 mr-1" />
            {convertButtonLabel}
            <ChevronDown className="size-4 ml-1 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Record on this job</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {menuLink(invoiceCreate, <FileText className="size-4 mr-2" />, 'Invoice')}
          {menuLink(billCreate, <FileText className="size-4 mr-2" />, 'Bill')}
          {menuLink(expenseCreate, <Receipt className="size-4 mr-2" />, 'Expense')}
        </DropdownMenuContent>
      </DropdownMenu>

      {canEdit ? (
        <>
          <ToolbarDivider />
          {onEdit ? (
            <Button
              variant="outline"
              size="sm"
              className="border-sky-200 bg-sky-50/50 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
              onClick={onEdit}
            >
              <Edit3 className="size-4 mr-1" /> Edit
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-sky-200 bg-sky-50/50 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
            >
              <Link to={`${base}/${jobOrderId}/edit`}>
                <Edit3 className="size-4 mr-1" /> Edit
              </Link>
            </Button>
          )}
        </>
      ) : null}

      <ToolbarDivider />

      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4 mr-1" /> Print
      </Button>

      {onDelete ? (
        <Button
          variant={canDelete ? 'destructive' : 'outline'}
          size="sm"
          onClick={onDelete}
          disabled={deleting}
          className={cn(
            deleting && 'opacity-70',
            !canDelete && 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
          )}
        >
          <Trash2 className="size-4 mr-1" />
          {canDelete ? 'Delete' : 'Delete (linked)'}
        </Button>
      ) : null}
    </div>
  );
}
