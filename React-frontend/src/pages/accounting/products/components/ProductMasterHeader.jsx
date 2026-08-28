import { Link, useNavigate } from 'react-router';
import {
  ArrowLeftRight,
  ChevronDown,
  Edit3,
  FileText,
  MoreHorizontal,
  Package,
  PackagePlus,
  Printer,
  ReceiptText,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PRODUCT_TYPES } from '@/components/workspace/product/constants';

export function ProductMasterHeader({ product, flags, workspaceId, onDelete }) {
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting`;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4 min-w-0">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="size-14 rounded-lg object-cover" />
          ) : (
            <Package className="size-6" />
          )}
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground truncate">{product.name}</h1>
            <Badge variant="outline">{PRODUCT_TYPES[product.type] || product.type}</Badge>
            <Badge
              variant="outline"
              className={
                product.is_active
                  ? 'rounded-full bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'rounded-full bg-muted text-muted-foreground'
              }
            >
              {product.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {product.sku ? <span className="font-mono uppercase">SKU {product.sku}</span> : null}
            {product.barcode ? <span className="font-mono">{product.barcode}</span> : null}
            {product.category?.name ? <span>{product.category.name}</span> : null}
            {product.unit_label || product.unit ? <span>{product.unit_label || product.unit}</span> : null}
            {product.costing_method ? <span className="capitalize">{product.costing_method} costing</span> : null}
            {product.default_warehouse?.name ? (
              <Link to={`${base}/inventory/warehouses/${product.default_warehouse.id}/stock`} className="hover:underline">
                Default: {product.default_warehouse.name}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {flags?.can_edit ? (
          <Button asChild size="sm" variant="outline">
            <Link to={`${base}/products/${product.id}/edit`}>
              <Edit3 className="size-4 mr-1" /> Edit
            </Link>
          </Button>
        ) : null}
        {product.track_inventory && flags?.can_adjust_stock ? (
          <Button asChild size="sm" variant="outline">
            <Link to={`${base}/inventory/adjustments/create`}>
              <PackagePlus className="size-4 mr-1" /> Adjust stock
            </Link>
          </Button>
        ) : null}
        {product.track_inventory && flags?.can_transfer_stock ? (
          <Button asChild size="sm" variant="outline">
            <Link to={`${base}/inventory/stock-transfers/create`}>
              <ArrowLeftRight className="size-4 mr-1" /> Transfer stock
            </Link>
          </Button>
        ) : null}
        {flags?.can_create_bill ? (
          <Button asChild size="sm" variant="outline">
            <Link to={`${base}/bills/create`}>
              <ReceiptText className="size-4 mr-1" /> Purchase bill
            </Link>
          </Button>
        ) : null}
        {flags?.can_create_invoice ? (
          <Button asChild size="sm" variant="mono">
            <Link to={`${base}/invoices/create`}>
              <FileText className="size-4 mr-1" /> Sales invoice
            </Link>
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              More <ChevronDown className="size-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.print()}>
              <Printer className="size-4 mr-2" /> Print
            </DropdownMenuItem>
            {flags?.can_delete ? (
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4 mr-2" /> Delete product
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
