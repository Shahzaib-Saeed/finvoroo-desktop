import { useMemo } from 'react';
import ApexChart from 'react-apexcharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function fmtShort(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

export function AccountPortfolioChart({ companies, loading }) {
  const chartData = useMemo(() => {
    const rows = (companies ?? [])
      .map((c) => ({
        name: c.name?.length > 14 ? `${c.name.slice(0, 14)}…` : c.name,
        collected: Number(c.stats?.collected ?? 0),
        ar: Number(c.stats?.ar_outstanding ?? 0),
      }))
      .sort((a, b) => b.collected - a.collected)
      .slice(0, 8);

    return {
      categories: rows.map((r) => r.name),
      collected: rows.map((r) => r.collected),
      ar: rows.map((r) => r.ar),
    };
  }, [companies]);

  if (loading) {
    return <Skeleton className="h-full min-h-[320px] rounded-xl" />;
  }

  const options = {
    series: [
      { name: 'Collected', data: chartData.collected },
      { name: 'Receivables', data: chartData.ar },
    ],
    chart: {
      height: 280,
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
      },
    },
    dataLabels: { enabled: false },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      markers: { size: 4, shape: 'circle' },
    },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: chartData.categories.length ? chartData.categories : ['No data'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: 'var(--color-secondary-foreground)', fontSize: '11px' },
      },
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--color-secondary-foreground)', fontSize: '12px' },
        formatter: (v) => fmtShort(v),
      },
    },
    fill: { opacity: 1 },
    colors: ['#10b981', '#ef4444'],
    grid: {
      borderColor: 'var(--color-border)',
      strokeDashArray: 5,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      y: {
        formatter: (v) =>
          new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v),
      },
    },
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Portfolio performance</CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-1">
        {chartData.categories.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            Add companies to see portfolio metrics.
          </div>
        ) : (
          <ApexChart options={options} series={options.series} type="bar" height={280} />
        )}
      </CardContent>
    </Card>
  );
}
