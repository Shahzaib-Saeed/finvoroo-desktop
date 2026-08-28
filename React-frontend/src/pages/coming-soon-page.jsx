import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Construction } from 'lucide-react';

export function ComingSoonPage({ title = 'Page' }) {
  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading title={title} description="This page is under construction" />
        </Toolbar>
      </Container>
      <Container>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Construction className="size-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            This section is coming soon. It will be fully integrated with the
            Laravel backend.
          </p>
        </div>
      </Container>
    </Fragment>
  );
}
