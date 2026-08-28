import { Link } from 'react-router';
import {
  ChevronDown,
  Copy,
  FileText,
  ShoppingCart,
  ClipboardList,
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
import {
  DOCUMENT_CONVERSION_TARGETS,
  documentConversionCreatePath,
} from '@/components/accounting/invoice-conversion';

const TARGET_ICONS = {
  quotation: FileText,
  sales_order: ClipboardList,
  invoice: Copy,
  bill: FileText,
  purchase_order: ShoppingCart,
};

export function DocumentCreateRelatedDropdown({
  workspaceId,
  sourceType = 'invoice',
  sourceId,
  targets = [],
}) {
  if (!targets.length) return null;

  const allowed = new Set(targets.map((t) => (typeof t === 'string' ? t : t.target)));
  const options = DOCUMENT_CONVERSION_TARGETS.filter((item) => allowed.has(item.target));

  if (!options.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="size-4 mr-1" />
          Copy document to
          <ChevronDown className="size-4 ml-1 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Copy document to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((item) => {
          const Icon = TARGET_ICONS[item.target] || Copy;
          const to = documentConversionCreatePath(workspaceId, sourceType, sourceId, item.target);
          const label =
            item.target === 'invoice' && sourceType !== 'invoice'
              ? 'Invoice'
              : item.label;
          if (!to) return null;
          return (
            <DropdownMenuItem key={item.target} asChild>
              <Link to={to}>
                <Icon className="size-4 mr-2" />
                {label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

