import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Keyboard,
  RotateCcw,
  ScanBarcode,
  Search,
  Settings2,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
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

export function PosTopBar({
  workspaceId,
  search,
  onSearchChange,
  searchRef,
  barcodeRef,
  onBarcodeSubmit,
  customer,
  onOpenCustomer,
  warehouses,
  warehouseId,
  onWarehouseChange,
  salespeople,
  salesperson,
  onSalespersonChange,
  shift,
  terminal,
  canChangeWarehouse,
  onOpenShortcuts,
  onOpenSettings,
  onOpenShift,
  onOpenReturns,
  online,
  managerActive,
}) {
  return (
    <header className="shrink-0 border-b border-foreground/10 bg-background/95 backdrop-blur">
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-foreground px-3 py-1.5 text-xs font-medium text-background">
          <WifiOff className="size-3.5" />
          Offline — cart & holds available · checkout requires connection
        </div>
      )}
      <div className="flex h-14 items-center gap-2 px-3 lg:gap-3 lg:px-5">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 rounded-xl"
          title="Exit POS"
        >
          <Link to={`/workspace/${workspaceId}/accounting/invoices`}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <form
            className="relative min-w-[9rem] max-w-[16rem] flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const v = barcodeRef.current?.value?.trim();
              if (v) {
                onBarcodeSubmit(v);
                if (barcodeRef.current) barcodeRef.current.value = '';
              }
            }}
          >
            <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={barcodeRef}
              name="barcode"
              autoFocus
              autoComplete="off"
              placeholder="Scan barcode"
              className="h-11 rounded-xl border-foreground/20 bg-muted/50 pl-10 text-sm shadow-none ring-foreground/10 focus-visible:ring-2"
            />
          </form>
          <div className="relative min-w-0 flex-[1.2]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              data-pos-typing
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search products…"
              className="h-11 rounded-xl border-foreground/15 bg-muted/40 pl-10 text-sm shadow-none"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onOpenCustomer}
          className={cn(
            'h-11 min-w-[8rem] max-w-[14rem] justify-start gap-2 rounded-xl border-foreground/15 px-3',
          )}
        >
          <UserRound className="size-4 shrink-0" />
          <span className="truncate text-sm font-medium">{customer?.name || 'Customer'}</span>
        </Button>

        <Select
          value={warehouseId || 'none'}
          onValueChange={(v) => onWarehouseChange(v === 'none' ? '' : v)}
          disabled={!canChangeWarehouse}
        >
          <SelectTrigger className="hidden h-11 w-[9rem] rounded-xl border-foreground/15 lg:flex">
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Warehouse</SelectItem>
            {(warehouses || []).map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={salesperson || 'none'}
          onValueChange={(v) => onSalespersonChange(v === 'none' ? '' : v)}
        >
          <SelectTrigger className="hidden h-11 w-[9rem] rounded-xl border-foreground/15 xl:flex">
            <SelectValue placeholder="Salesperson" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Salesperson</SelectItem>
            {(salespeople || []).map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          className="hidden h-11 rounded-xl border-foreground/15 lg:inline-flex"
          onClick={onOpenShift}
        >
          {shift?.id ? `Shift open` : 'Open shift'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 rounded-xl"
          onClick={onOpenReturns}
          title="Returns"
        >
          <RotateCcw className="size-5" />
        </Button>

        <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground 2xl:flex">
          <span className="inline-flex items-center gap-1 rounded-lg border border-foreground/10 bg-muted/50 px-2 py-1.5">
            {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {terminal?.name || 'Terminal'}
          </span>
          {managerActive && (
            <span className="rounded-lg border border-foreground/20 bg-foreground px-2 py-1.5 text-background">
              Manager
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 rounded-xl"
          onClick={onOpenShortcuts}
        >
          <Keyboard className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 rounded-xl"
          onClick={onOpenSettings}
        >
          <Settings2 className="size-5" />
        </Button>
      </div>
    </header>
  );
}
