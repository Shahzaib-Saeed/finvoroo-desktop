import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WorkspaceNotAuthorizedPage() {
  const { id: companyId } = useParams();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5 px-4">
      <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <ShieldAlert className="size-8 text-destructive" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Not authorized</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
          Your role doesn't have access to this page. Ask an admin to grant the required permission if you believe this is a mistake.
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
