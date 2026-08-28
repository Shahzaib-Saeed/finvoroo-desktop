import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function StatValue({ value, highlight, conversionHint, isCustomValue }) {
  if (isCustomValue) return value;

  const valueEl = (
    <span
      className={cn(
        "block w-full truncate text-lg font-semibold tabular-nums tracking-tight sm:text-xl",
        highlight && "text-amber-700",
        conversionHint && "cursor-help",
      )}
    >
      {value}
    </span>
  );

  const wrapped = conversionHint ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{valueEl}</TooltipTrigger>
        <TooltipContent className="max-w-[240px]">
          {String(conversionHint)
            .split("\n")
            .map((line) => (
              <p key={line} className="text-xs leading-relaxed">
                {line}
              </p>
            ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{valueEl}</TooltipTrigger>
        <TooltipContent>{value}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return wrapped;
}

export function CustomerDetailsStats({ items = [] }) {
  if (!items.length) return null;

  const colClass =
    items.length >= 4
      ? "grid-cols-2 xl:grid-cols-4"
      : items.length === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-2";

  return (
    <div className={cn("grid gap-3", colClass)}>
      {items.map((item) => (
        <Card
          key={item.label}
          className="shadow-none border border-border/80 bg-card overflow-hidden"
        >
          <CardContent className="flex min-w-0 flex-col gap-1 p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              {item.label}
            </span>
            <StatValue
              value={item.value}
              highlight={item.highlight}
              conversionHint={item.conversionHint}
              isCustomValue={item.isCustomValue}
            />
            {item.hint ? (
              <span className="text-[11px] text-muted-foreground truncate mt-0.5">
                {item.hint}
              </span>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
