import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { CalendarDays, TrendingUp, Users, Package, DollarSign, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/layouts/layout-1/components/toolbar';

export function DashboardPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState({
    from: new Date(2025, 0, 20),
    to: addDays(new Date(2025, 0, 20), 20),
  });
  const [tempDateRange, setTempDateRange] = useState(date);

  const handleDateRangeApply = () => {
    setDate(tempDateRange);
    setIsOpen(false);
  };

  const handleDateRangeReset = () => {
    setTempDateRange(undefined);
  };

  const defaultStartDate = new Date();

  // Sample ERP stats data
  const stats = [
    { title: 'Total Revenue', value: '$45,231.89', change: '+20.1%', icon: DollarSign },
    { title: 'Orders', value: '+2,350', change: '+180.1%', icon: ShoppingCart },
    { title: 'Products', value: '+12,234', change: '+19%', icon: Package },
    { title: 'Active Users', value: '+573', change: '+201', icon: Users },
  ];

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>ERP Dashboard</ToolbarPageTitle>
          <ToolbarDescription>
            Central Hub for Business Management & Analytics
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button id="date" variant="outline">
                <CalendarDays size={16} className="me-0.5" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'dd/MM/yyyy')} -{' '}
                      {format(date.to, 'dd/MM/yyyy')}
                    </>
                  ) : (
                    format(date.from, 'dd/MM/yyyy')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDateRange?.from || defaultStartDate}
                selected={tempDateRange}
                onSelect={setTempDateRange}
                numberOfMonths={2}
              />
              <div className="flex items-center justify-end gap-1.5 border-t border-border p-3">
                <Button variant="outline" onClick={handleDateRangeReset}>
                  Reset
                </Button>
                <Button onClick={handleDateRangeApply}>Apply</Button>
              </div>
            </PopoverContent>
          </Popover>
        </ToolbarActions>
      </Toolbar>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500 flex items-center gap-1 inline-flex">
                  <TrendingUp className="h-3 w-3" />
                  {stat.change}
                </span>{' '}
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart Area */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue statistics for the current year</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] rounded-lg" />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Data Table Placeholder */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Manage and track your recent orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
