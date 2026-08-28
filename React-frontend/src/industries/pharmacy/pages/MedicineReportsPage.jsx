import { Link, useParams } from 'react-router-dom';
import { FileBarChart2 } from 'lucide-react';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const REPORTS = [
  {
    title: 'Near expiry / expired',
    description: 'Batch balances by expiry window',
    path: '/pharmacy/batch-expiry',
  },
  {
    title: 'Stock on hand (batch)',
    description: 'Medicine × batch × warehouse',
    path: '/pharmacy/batch-expiry',
  },
  {
    title: 'Purchase register',
    description: 'Posted supplier invoices',
    path: '/accounting/bills',
  },
  {
    title: 'Dispense / shifts',
    description: 'Counter sales — open shift on Counter sale',
    path: '/pharmacy/pos',
  },
  {
    title: 'Accounting reports',
    description: 'Valuation, tax, P&L (shared engine)',
    path: '/accounting/reports',
  },
];

export function MedicineReportsPage() {
  const { id: companyId } = useParams();
  const p = (path) => `/workspace/${companyId}${path}`;

  return (
    <Container className="py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <FileBarChart2 className="size-5 text-primary" />
          Pharmacy reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Operational reports pharmacists need daily. Full GL stays under Accounting.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {REPORTS.map((r) => (
          <Card key={r.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{r.title}</CardTitle>
              <CardDescription className="text-xs">{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <Link to={p(r.path)}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
