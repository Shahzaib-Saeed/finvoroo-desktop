import { Fragment } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReportEntityDetailsProvider } from './ReportEntityDetailsProvider';
import { ReportFavoriteToggle } from './ReportFavoriteToggle';

function ReportBreadcrumbNav({ items, compact = false }) {
  if (!items?.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'no-print flex flex-wrap items-center gap-1 text-slate-500',
        compact ? 'mb-1 text-[11px]' : 'mb-2 text-xs',
      )}
    >
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <span aria-hidden>/</span> : null}
          {item.to ? (
            <Link to={item.to} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-primary">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

export function ReportPageShell({
  workspaceId,
  title,
  subtitle,
  actions,
  children,
  className,
  contentClassName,
  breadcrumbs,
  backTo,
  backLabel = 'Back',
  compact = false,
  hideTitle = false,
  standardReportKey,
  showFavorite = true,
}) {
  const reportsHub = workspaceId ? `/workspace/${workspaceId}/accounting/reports` : null;
  const pathname = globalThis.location?.pathname || '';
  const isCustomViewer = /\/accounting\/reports\/view\//.test(pathname);
  const inferredReportKey =
    standardReportKey ||
    pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', '_');
  const resolvedBreadcrumbs =
    breadcrumbs?.length
      ? breadcrumbs
      : reportsHub
        ? [{ label: 'Reports', to: reportsHub }, { label: title }]
        : [];

  const headerActions = (
    <>
      {showFavorite && workspaceId && !isCustomViewer && inferredReportKey ? (
        <ReportFavoriteToggle
          standardReportKey={inferredReportKey}
          className="size-8 rounded-sm border border-border bg-background hover:bg-muted/50"
        />
      ) : null}
      {backTo ? (
        <Button variant="outline" size="sm" asChild>
          <Link to={backTo}>
            <ArrowLeft className="mr-1 size-4" />
            {backLabel}
          </Link>
        </Button>
      ) : null}
      {actions}
    </>
  );

  const shell = (
    <div className={cn(compact || hideTitle ? 'space-y-2' : 'space-y-3', className)}>
      {hideTitle ? (
        (backTo ||
          actions ||
          (showFavorite && workspaceId && !isCustomViewer && inferredReportKey)) && (
          <div className="no-print flex flex-wrap items-center justify-end gap-1.5">
            {headerActions}
          </div>
        )
      ) : (
        <>
          {resolvedBreadcrumbs.length ? (
            <ReportBreadcrumbNav items={resolvedBreadcrumbs} compact={compact} />
          ) : null}

          <PageHeader
            title={title}
            subtitle={subtitle}
            actions={
              backTo ||
              actions ||
              (showFavorite && workspaceId && !isCustomViewer && inferredReportKey)
                ? headerActions
                : null
            }
            className={cn(
              'no-print mb-3 border-b border-slate-200 pb-3',
              '[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight',
              '[&_p]:mt-1 [&_p]:max-w-3xl [&_p]:text-xs [&_p]:text-slate-500',
              compact && 'mb-2 pb-2 [&_h1]:text-lg',
            )}
          />
        </>
      )}

      <div
        className={cn(
          compact || hideTitle ? 'space-y-2' : 'space-y-3',
          'report-print-root',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );

  if (!workspaceId) return shell;

  return (
    <ReportEntityDetailsProvider workspaceId={workspaceId}>{shell}</ReportEntityDetailsProvider>
  );
}
