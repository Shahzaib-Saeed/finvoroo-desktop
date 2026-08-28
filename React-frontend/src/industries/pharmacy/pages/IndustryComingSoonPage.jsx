import { Link, useParams } from 'react-router-dom';
import { Pill } from 'lucide-react';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function IndustryComingSoonPage({
  title = 'Coming soon',
  description = 'This Pharmacy module is scaffolded and will be built next.',
}) {
  const { id: companyId } = useParams();

  return (
    <Container className="py-10">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Pill className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to={`/workspace/${companyId}`}>Back to dashboard</Link>
          </Button>
          <Button asChild>
            <Link to={`/workspace/${companyId}/accounting/products`}>Open products</Link>
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
