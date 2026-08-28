import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WorkspaceComingSoonPage({ title }) {
  const { id: companyId } = useParams();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5 px-4">
      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
        <Construction className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">{title || 'Coming Soon'}</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
          This module is under active development and will be available soon.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to={`/workspace/${companyId}`}>
          <ArrowLeft className="size-4 mr-1.5" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
