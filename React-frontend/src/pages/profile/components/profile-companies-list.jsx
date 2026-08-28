import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { isCompanyActive } from '@/pages/companies/components/companies-ui';

export function ProfileCompaniesList({ companies, loading }) {
  if (loading) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My companies</CardTitle>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <p className="text-sm text-secondary-foreground py-2">No companies yet.</p>
        ) : (
          <div className="grid gap-5">
            {companies.slice(0, 4).map((company) => (
              <div key={company.id} className="flex align-start gap-3.5">
                <div className="flex items-center justify-center w-[1.875rem] h-[1.875rem] bg-accent/60 rounded-lg border border-input shrink-0">
                  <Building2 className="text-base text-secondary-foreground" size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold leading-none mb-1 truncate">
                    {company.name}
                  </span>
                  <span className="text-sm font-medium text-mono capitalize">
                    {company.type || 'Business entity'}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {company.currency ? (
                      <span className="text-xs text-secondary-foreground">{company.currency}</span>
                    ) : null}
                    <Badge
                      size="sm"
                      variant={isCompanyActive(company) ? 'success' : 'secondary'}
                      appearance={isCompanyActive(company) ? 'light' : undefined}
                    >
                      {isCompanyActive(company) ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Button mode="link" underlined="dashed" asChild>
          <Link to="/companies">View all companies</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
