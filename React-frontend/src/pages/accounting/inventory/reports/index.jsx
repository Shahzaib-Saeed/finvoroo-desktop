import { Link, useParams } from 'react-router';
import {
  BarChart3,
  ChevronRight,
  LayoutGrid,
  LineChart,
  PackageSearch,
  TrendingDown,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const reports = [
  {
    title: 'Category sales & purchases',
    description: 'Purchase, sale, net profit, and margin by product category for the period.',
    href: 'category-trading',
    to: (workspaceId) => `/workspace/${workspaceId}/accounting/reports/category-trading`,
    icon: LayoutGrid,
    iconClass: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    tag: 'Trading',
  },
  {
    title: 'Stock summary',
    description: 'On-hand quantities, average cost, and extended value by product and warehouse.',
    href: 'stock-summary',
    icon: PackageSearch,
    iconClass: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
    tag: 'Levels',
  },
  {
    title: 'Valuation',
    description: 'Total inventory value at cost with breakdown by warehouse and category.',
    href: 'valuation',
    icon: BarChart3,
    iconClass: 'bg-primary/10 text-primary',
    tag: 'Financial',
  },
  {
    title: 'Inventory activity',
    description: 'Purchases and sales with invoice/bill numbers, customer or vendor, and quantities.',
    href: 'movements',
    icon: LineChart,
    iconClass: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
    tag: 'Activity',
  },
  {
    title: 'Low stock',
    description: 'Products at or below reorder level — prioritize replenishment and purchasing.',
    href: 'low-stock',
    icon: TrendingDown,
    iconClass: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    tag: 'Alerts',
  },
];

function ReportLinkCard({ title, description, href, icon: Icon, iconClass, tag }) {
  return (
    <Link to={href} className="block no-underline text-inherit group">
      <Card
        className={cn(
          'h-full transition-all duration-200',
          'hover:border-primary/35 hover:shadow-sm hover:bg-accent/20',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl',
                iconClass,
              )}
            >
              <Icon className="size-5" />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {title}
                </h3>
                {tag ? (
                  <Badge variant="outline" className="rounded-full text-xs px-2 py-0 font-normal">
                    {tag}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>

            <ChevronRight
              className={cn(
                'size-5 shrink-0 mt-0.5 text-muted-foreground/40',
                'transition-all group-hover:text-primary group-hover:translate-x-0.5',
              )}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function InventoryReportsHubPage() {
  const { id: workspaceId } = useParams();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/reports`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory reports"
        subtitle="Analyze stock levels, valuation, and movement history across your warehouses."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={invBase}>Back to inventory</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <ReportLinkCard
            key={report.href}
            {...report}
            href={report.to ? report.to(workspaceId) : `${base}/${report.href}`}
          />
        ))}
      </div>
    </div>
  );
}
